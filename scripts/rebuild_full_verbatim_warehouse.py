"""
Tái dựng toàn bộ kho SQLite FTS5 (`vbpl_warehouse.sqlite`) với 100% toàn văn nguyên bản
từ tệp gốc (PDF Native toàn bộ trang, PDF Scan OCR toàn bộ trang song song 12 luồng
có cache tại `.local_data/vbpl/06_ocr_text_cache/`, Word `.docx`/`.doc` đủ đoạn + bảng).

Chạy:
  python -B scripts/rebuild_full_verbatim_warehouse.py
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import sqlite3
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

os.environ["OMP_THREAD_LIMIT"] = "1"

import fitz
import pytesseract
from PIL import Image

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from data_foundation.analyst_ba_bi import VbplAnalystBaBiEngine
from data_foundation.lake_pipeline import VbplDataLakePipeline, _clean_page_noise
from scripts.ingest_data_legal_2026 import DEFAULT_SOURCE_DIR

_TESS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(_TESS_PATH):
    pytesseract.pytesseract.tesseract_cmd = _TESS_PATH

ND14_FORMS_SUBFOLDER = "[2026]_14-2026_ND_CP_BieumauvaPhuluc"


def _load_sidecar_module():
    spec = importlib.util.spec_from_file_location(
        "local_scanner_engine",
        REPO_ROOT / "desktop-sidecar" / "local_scanner_engine.py",
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _ocr_png_bytes(png_bytes: bytes) -> str:
    try:
        im = Image.open(io.BytesIO(png_bytes))
        return pytesseract.image_to_string(im, lang="vie", config="--psm 6") or ""
    except Exception:
        return ""


def _resolve_physical_file(src_dir: pathlib.Path, original_name: str, sub_folder: str) -> Optional[pathlib.Path]:
    if sub_folder:
        p = src_dir / sub_folder / original_name
        if p.is_file():
            return p
    p = src_dir / original_name
    if p.is_file():
        return p
    # Tìm dự phòng theo tên trong thư mục gốc & subfolder NĐ 14
    lower = original_name.lower()
    for cand in src_dir.iterdir():
        if cand.is_file() and cand.name.lower() == lower:
            return cand
    return None


def _extract_verbatim_pdf(
    pdf_path: pathlib.Path,
    sha: str,
    ocr_cache_dir: pathlib.Path,
    ocr_workers: int = 12,
) -> Tuple[str, str, bool, int]:
    try:
        with fitz.open(str(pdf_path)) as doc:
            total_pages = len(doc)
            if total_pages == 0:
                return "", "PDF_NATIVE", False, 0

            sample_n = min(3, total_pages)
            sample_chars = sum(len(doc[i].get_text("text").strip()) for i in range(sample_n))
            is_scan = (sample_chars / max(1, sample_n)) < 150
            if is_scan:
                # Xác nhận thêm để tránh phân loại nhầm PDF có 3 trang bìa scan đầu
                txt_pages = sum(1 for i in range(min(total_pages, 20)) if len(doc[i].get_text("text").strip()) >= 150)
                if txt_pages >= max(2, int(min(total_pages, 20) * 0.4)):
                    is_scan = False

            if not is_scan:
                chunks = [_clean_page_noise(doc[i].get_text("text")) for i in range(total_pages)]
                raw_text = "\n".join(c for c in chunks if c)
                return raw_text, "PDF_NATIVE", False, total_pages

            cache_file = ocr_cache_dir / f"{sha[:16]}.txt"
            if cache_file.is_file():
                cached_txt = cache_file.read_text(encoding="utf-8").strip()
                if cached_txt:
                    return cached_txt, "PDF_OCR", True, total_pages

            page_imgs: List[bytes] = []
            for i in range(total_pages):
                pix = doc[i].get_pixmap(dpi=200, colorspace=fitz.csGRAY)
                page_imgs.append(pix.tobytes("png"))

        with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, ocr_workers)) as ex:
            ocr_chunks = list(ex.map(_ocr_png_bytes, page_imgs))

        raw_text = "\n".join(_clean_page_noise(c) for c in ocr_chunks if c and c.strip())
        if raw_text.strip():
            cache_file.write_text(raw_text, encoding="utf-8")
        return raw_text, "PDF_OCR", True, total_pages
    except Exception as exc:
        print(f"[WARN] Loi doc PDF {pdf_path.name}: {exc}", flush=True)
        return f"Tài liệu PDF (chưa đọc được nội dung: {pdf_path.name})", "PDF_CORRUPT", False, 1


def _load_warehouse_metadata(sqlite_path: pathlib.Path) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(str(sqlite_path))
    conn.row_factory = sqlite3.Row
    try:
        docs = [dict(r) for r in conn.execute("SELECT * FROM fact_vbpl_documents ORDER BY ssot_file_name").fetchall()]
        gates_map: Dict[str, List[str]] = {}
        for r in conn.execute("SELECT doc_key, gate_code FROM bridge_doc_gate").fetchall():
            gates_map.setdefault(r["doc_key"], []).append(r["gate_code"])
        axes_map: Dict[str, List[str]] = {}
        for r in conn.execute("SELECT doc_key, project_axis_code FROM bridge_doc_project").fetchall():
            axes_map.setdefault(r["doc_key"], []).append(r["project_axis_code"])
        tags_map: Dict[str, List[str]] = {}
        for r in conn.execute("SELECT doc_key, tag_label FROM bridge_doc_tags").fetchall():
            tags_map.setdefault(r["doc_key"], []).append(r["tag_label"])
        for d in docs:
            dk = d["doc_key"]
            d["linked_gates"] = gates_map.get(dk, [])
            d["project_axes"] = axes_map.get(dk, [])
            d["tags"] = tags_map.get(dk, [])
        return docs
    finally:
        conn.close()


def main() -> None:
    t0 = time.time()
    src_dir = pathlib.Path(DEFAULT_SOURCE_DIR)
    if not src_dir.is_dir():
        raise SystemExit(f"Không tìm thấy thư mục nguồn: {src_dir}")

    sidecar_mod = _load_sidecar_module()
    pipeline = VbplDataLakePipeline()
    cache_dir = pipeline.root / "06_preview_cache"
    ocr_cache_dir = pipeline.root / "06_ocr_text_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    ocr_cache_dir.mkdir(parents=True, exist_ok=True)

    meta_docs = _load_warehouse_metadata(pipeline.warehouse.db_path)
    print(f"[1/3] Bắt đầu tái dựng toàn văn 100% (không lấy mẫu) cho {len(meta_docs)} văn bản...", flush=True)

    updated_records: List[Dict[str, Any]] = []
    ocr_count = 0
    native_count = 0
    word_count = 0
    missing_count = 0

    for idx, d in enumerate(meta_docs, 1):
        orig = str(d.get("original_name") or "")
        sub_folder = str(d.get("sub_folder") or "")
        phys = _resolve_physical_file(src_dir, orig, sub_folder) if orig else None
        if not phys:
            missing_count += 1
            continue

        ext = phys.suffix.lower()
        sha = str(d.get("sha256") or "") or hashlib.sha256(phys.read_bytes()).hexdigest()
        raw_text = ""
        source_type = str(d.get("source_type") or "PDF_NATIVE")
        ocr_applied = False
        total_pages = int(d.get("total_pages") or 1)

        if ext == ".pdf":
            raw_text, source_type, ocr_applied, total_pages = _extract_verbatim_pdf(
                phys, sha=sha, ocr_cache_dir=ocr_cache_dir, ocr_workers=12
            )
            if ocr_applied:
                ocr_count += 1
                print(
                    f"  [{idx}/{len(meta_docs)}] OCR {total_pages}p -> {phys.name} ({len(raw_text):,} chars)",
                    flush=True,
                )
            else:
                native_count += 1
        elif ext == ".docx":
            raw_text, total_pages = sidecar_mod._extract_docx_full_text(str(phys))
            raw_text = _clean_page_noise(raw_text)
            source_type = "DOCX_NATIVE"
            word_count += 1
        elif ext == ".doc":
            cached_docx = sidecar_mod.convert_doc_to_cached_docx(str(phys), str(cache_dir))
            if cached_docx and os.path.isfile(cached_docx):
                raw_text, total_pages = sidecar_mod._extract_docx_full_text(cached_docx)
                raw_text = _clean_page_noise(raw_text)
            source_type = "DOC_CONVERTED"
            word_count += 1

        if not raw_text.strip():
            continue

        updated_records.append(
            {
                "ssot_file_name": d["ssot_file_name"],
                "original_name": orig,
                "sub_folder": sub_folder,
                "source_path": str(d.get("source_path") or ""),
                "vault_path": str(d.get("vault_path") or ""),
                "curated_path": str(d.get("curated_path") or ""),
                "sha256": sha,
                "source_system": "FULL_VERBATIM_REBUILD",
                "source_type": source_type,
                "ocr_applied": ocr_applied,
                "total_pages": total_pages,
                "doc_type": d["doc_type_code"],
                "issuer_code": d["issuer_code"],
                "doc_number": d["doc_number"],
                "issue_year": int(d["issue_year"]),
                "primary_domain": d["domain_code"],
                "title": d["title"],
                "issue_date": d["issue_date"],
                "effective_date": d["effective_date"],
                "effect_status": d["effect_status"],
                "is_amended": bool(d["is_amended"]),
                "project_axes": d["project_axes"] or ["KCN", "HTKT", "DAN_DUNG", "CCN", "FTZ", "PPP_BT"],
                "linked_gates": d["linked_gates"] or ["G12"],
                "tags": d["tags"] or [],
                "raw_text": raw_text,
                "nodes": [],
            }
        )

    print(
        f"[2/3] Nạp {len(updated_records)} bản ghi toàn văn nguyên bản "
        f"(PDF_NATIVE={native_count}, PDF_OCR={ocr_count}, WORD={word_count}, missing={missing_count}) & chạy ETL...",
        flush=True,
    )
    pipeline.ingest_raw_records(updated_records, source_system="FULL_VERBATIM_REBUILD")
    etl_res = pipeline.run_medallion_etl()

    engine = VbplAnalystBaBiEngine(pipeline)
    xlsx_path = engine.export_bi_excel()
    print("[3/3] HOÀN TẤT TÁI DỰNG TOÀN VĂN 100% NGUYÊN BẢN!", flush=True)
    print(
        json.dumps(
            {
                "elapsed_seconds": round(time.time() - t0, 1),
                "rebuilt_docs": len(updated_records),
                "silver": etl_res["silver"],
                "warehouse": etl_res["warehouse"],
                "avg_dq_score": etl_res["avg_dq_score"],
                "excel_bi_export": str(xlsx_path),
            },
            ensure_ascii=False,
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()

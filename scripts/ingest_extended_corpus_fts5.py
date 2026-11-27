"""
Nạp toàn văn các tệp bổ sung từ kho chỉ-đọc `Data_Legal_2026` (PDF, DOCX, DOC + 29 Biểu mẫu NĐ 14/2026)
vào Data Foundation 6 tầng (`.local_data/vbpl/` — Bronze/Silver/Gold + SQLite FTS5)
và dựng sẵn `.local_data/vbpl/06_preview_cache/{sha256}.docx` cho 8 tệp `.doc`.

TUYỆT ĐỐI KHÔNG sửa đổi `src/data/dataLegal2026Catalog.ts` (giữ nguyên invariant 7 + 44 = 51)
và TUYỆT ĐỐI KHÔNG ghi/đổi tên gì lên ổ G:\\.

Chạy:
  python -B scripts/ingest_extended_corpus_fts5.py
"""

from __future__ import annotations

import argparse
import concurrent.futures
import importlib.util
import json
import os
import pathlib
import re
import sys
import time
from typing import Any, Dict, List, Set, Tuple

import fitz
import pytesseract
from PIL import Image

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from data_foundation.analyst_ba_bi import VbplAnalystBaBiEngine
from data_foundation.contracts import normalize_nfc, validate_ssot_filename
from data_foundation.lake_pipeline import VbplDataLakePipeline, _clean_page_noise
from scripts.ingest_data_legal_2026 import APPENDIX_SPECS, CURATED_SPECS, DEFAULT_SOURCE_DIR

_TESS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(_TESS_PATH):
    pytesseract.pytesseract.tesseract_cmd = _TESS_PATH

# 2 tệp trong danh mục 51 cũ đã đổi tên nhẹ trên ổ G:\ -> bỏ qua tránh tạo trùng
RENAMED_51_ALIASES = {
    "[2022]_50-2022_TT_BTC_HuongDanBaoHiemBatBuocHoatDongDauTuXd.pdf",
    "[2026]_37-2026_TT_BXD_HDDinhMucDuToanVaCacChiTieuKinhTeKyThuat.pdf",
}

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


def _ocr_pdf_page(page: fitz.Page) -> str:
    try:
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        return pytesseract.image_to_string(img, lang="vie") or ""
    except Exception:
        return ""


def _extract_pdf_text(pdf_path: pathlib.Path, full_ocr: bool = False) -> Tuple[str, str, bool, int]:
    try:
        with fitz.open(str(pdf_path)) as doc:
            total_pages = len(doc)
            if total_pages == 0:
                return "", "PDF_NATIVE", False, 0

            sample_pages = min(3, total_pages)
            sample_chars = sum(len(doc[i].get_text("text").strip()) for i in range(sample_pages))
            is_scan = (sample_chars / max(1, sample_pages)) < 150

            if not is_scan:
                if total_pages <= 120:
                    indices = list(range(total_pages))
                else:
                    indices = list(range(60)) + list(range(total_pages - 10, total_pages))
                chunks = [_clean_page_noise(doc[i].get_text("text")) for i in indices]
                raw_text = "\n".join(c for c in chunks if c)
                return raw_text, "PDF_NATIVE", False, total_pages

            if full_ocr or total_pages <= 10:
                indices = list(range(total_pages))
            else:
                indices = sorted(set(list(range(min(6, total_pages))) + list(range(max(0, total_pages - 3), total_pages))))
            chunks = [_clean_page_noise(_ocr_pdf_page(doc[i])) for i in indices]
            raw_text = "\n".join(c for c in chunks if c)
            return raw_text, "PDF_OCR", True, total_pages
    except Exception as exc:
        print(f"[WARN] Loi doc PDF {pdf_path.name}: {exc}", flush=True)
        return f"Tài liệu PDF (chưa đọc được nội dung: {pdf_path.name})", "PDF_CORRUPT", False, 1


def _process_one_file(
    file_path: pathlib.Path,
    sub_folder: str,
    sidecar_mod: Any,
    cache_dir: pathlib.Path,
    full_ocr: bool = False,
) -> Dict[str, Any]:
    ext = file_path.suffix.lower()
    sha = sidecar_mod.compute_sha256(str(file_path))
    source_type = "PDF_NATIVE"
    ocr_applied = False
    total_pages = 1
    raw_text = ""

    if ext == ".pdf":
        raw_text, source_type, ocr_applied, total_pages = _extract_pdf_text(file_path, full_ocr=full_ocr)
    elif ext == ".docx":
        raw_text, total_pages = sidecar_mod._extract_docx_full_text(str(file_path))
        raw_text = _clean_page_noise(raw_text)
        source_type = "DOCX_NATIVE"
    elif ext == ".doc":
        cached_docx = sidecar_mod.convert_doc_to_cached_docx(str(file_path), str(cache_dir))
        if cached_docx and os.path.isfile(cached_docx):
            raw_text, total_pages = sidecar_mod._extract_docx_full_text(cached_docx)
            raw_text = _clean_page_noise(raw_text)
            source_type = "DOC_CONVERTED"
        else:
            raw_text = f"Tài liệu Word 97-2003: {file_path.name}"
            source_type = "DOC_CONVERTED"

    classified = sidecar_mod.classify_3_axes_and_9_parts(
        file_path.name,
        {
            "text": raw_text,
            "engine_used": source_type,
            "confidence": 0.90 if ocr_applied else 0.99,
            "ai_metadata": {},
        },
        project_code="KCN",
    )

    ssot_name = classified.get("suggested_ssot_name") or file_path.name
    # Đảm bảo giữ nguyên đuôi mở rộng gốc (.pdf / .docx / .doc)
    ssot_stem = os.path.splitext(ssot_name)[0]
    ssot_name = f"{ssot_stem}{ext}"

    tags = [
        "Nguồn: Data_Legal_2026",
        f"{source_type} · {total_pages} trang",
        f"LV: {classified.get('domain') or 'HDXD'}",
    ]
    if sub_folder:
        tags.append("Biểu mẫu NĐ 14/2026")

    raw_title = normalize_nfc(file_path.stem.replace("_", " ").strip())
    if sub_folder:
        raw_title = f"Biểu mẫu NĐ 14/2026 — {raw_title}"

    issue_year = int(classified.get("issue_year") or 2026)
    gate_code = classified.get("gate_code") or "G12"
    proj_axes = ["HTKT", "DAN_DUNG", "KCN", "CCN", "FTZ", "PPP_BT"]
    if classified.get("project_code"):
        proj_axes = [classified["project_code"]] + [a for a in proj_axes if a != classified["project_code"]]

    return {
        "id": f"DL26-EXT-{sha[:10].upper()}",
        "source_system": "DATA_LEGAL_2026_EXTENDED",
        "source_path": str(file_path),
        "sub_folder": sub_folder,
        "original_name": file_path.name,
        "ssot_file_name": ssot_name,
        "sha256": sha,
        "source_type": source_type,
        "ocr_applied": ocr_applied,
        "total_pages": total_pages,
        "doc_type": classified.get("doc_type") or "ND",
        "issuer_code": classified.get("issuer") or "CP",
        "doc_number": classified.get("doc_number") or "01",
        "issue_year": issue_year,
        "primary_domain": classified.get("domain") or "HDXD",
        "title": raw_title,
        "issue_date": f"01/01/{issue_year}",
        "effective_date": "01/07/2026" if issue_year >= 2026 else f"01/01/{issue_year}",
        "effect_status": "Còn hiệu lực năm 2026" if issue_year >= 2021 else "Tra cứu đối chiếu",
        "is_amended": bool(re.search(r"SDBS|SuaDoi|VBHN", file_path.name, re.I)),
        "project_axes": proj_axes,
        "linked_gates": [gate_code],
        "tags": tags,
        "raw_text": raw_text,
        "nodes": [],
    }


def _dedup_ssot_names(records: List[Dict[str, Any]], reserved_names: Set[str]) -> List[Dict[str, Any]]:
    used = {n.lower() for n in reserved_names}
    for rec in records:
        cand = rec["ssot_file_name"]
        if cand.lower() in used:
            stem, ext = os.path.splitext(cand)
            suffix_tag = rec["sha256"][:4].upper()
            cand = f"{stem}-{suffix_tag}{ext}"
            idx = 1
            while cand.lower() in used:
                cand = f"{stem}-{suffix_tag}{idx}{ext}"
                idx += 1
            rec["ssot_file_name"] = cand
        if not validate_ssot_filename(rec["ssot_file_name"]):
            stem, ext = os.path.splitext(rec["ssot_file_name"])
            rec["ssot_file_name"] = re.sub(r"[^0-9A-Za-z._-]", "", f"{stem}{ext}")
        used.add(rec["ssot_file_name"].lower())
    return records


def main() -> None:
    ap = argparse.ArgumentParser(description="Nạp bổ sung PDF/DOCX/DOC + 29 Biểu mẫu NĐ 14/2026 vào SQLite FTS5")
    ap.add_argument("--source", default=DEFAULT_SOURCE_DIR)
    ap.add_argument("--lake-root", default=None)
    ap.add_argument("--include-nd14-forms", action="store_true", default=True)
    ap.add_argument("--skip-nd14-forms", action="store_true", default=False)
    ap.add_argument("--full-ocr", action="store_true", default=False)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    t0 = time.time()
    src_dir = pathlib.Path(args.source)
    if not src_dir.is_dir():
        raise SystemExit(f"Không tìm thấy thư mục nguồn: {src_dir}")

    sidecar_mod = _load_sidecar_module()
    pipeline = VbplDataLakePipeline(root_dir=args.lake_root)
    cache_dir = pipeline.root / "06_preview_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)

    skip_names_lower = {k.lower() for k in CURATED_SPECS} | {k.lower() for k in APPENDIX_SPECS} | {
        k.lower() for k in RENAMED_51_ALIASES
    }
    reserved_ssot = {v["ssot"] for v in CURATED_SPECS.values()} | {v[4] for v in APPENDIX_SPECS.values()}

    targets: List[Tuple[pathlib.Path, str]] = []
    for entry in sorted(src_dir.iterdir()):
        if entry.is_file():
            if entry.name.startswith("~$"):
                continue
            ext = entry.suffix.lower()
            if ext not in (".pdf", ".docx", ".doc"):
                continue
            if entry.name.lower() in skip_names_lower:
                continue
            targets.append((entry, ""))

    include_forms = args.include_nd14_forms and not args.skip_nd14_forms
    nd14_dir = src_dir / ND14_FORMS_SUBFOLDER
    if include_forms and nd14_dir.is_dir():
        for entry in sorted(nd14_dir.iterdir()):
            if entry.is_file() and not entry.name.startswith("~$") and entry.suffix.lower() in (".docx", ".doc", ".pdf"):
                targets.append((entry, ND14_FORMS_SUBFOLDER))

    print(f"[1/3] Phát hiện {len(targets)} tệp bổ sung (PDF/DOCX/DOC + biểu mẫu) cần nạp vào FTS5...")

    # Pre-convert .doc tuần tự qua Word COM (an toàn với _WORD_COM_LOCK) trước khi chạy pool cho PDF/DOCX
    doc_targets = [(p, sf) for (p, sf) in targets if p.suffix.lower() == ".doc"]
    other_targets = [(p, sf) for (p, sf) in targets if p.suffix.lower() != ".doc"]

    records: List[Dict[str, Any]] = []
    for p, sf in doc_targets:
        print(f"  -> Đang xử lý .doc (Word COM cache): {p.name}")
        records.append(_process_one_file(p, sf, sidecar_mod, cache_dir, full_ocr=args.full_ocr))

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as ex:
        futs = [
            ex.submit(_process_one_file, p, sf, sidecar_mod, cache_dir, args.full_ocr)
            for (p, sf) in other_targets
        ]
        for fut in concurrent.futures.as_completed(futs):
            records.append(fut.result())

    records.sort(key=lambda r: (r["sub_folder"], r["original_name"]))
    records = _dedup_ssot_names(records, reserved_ssot)

    print(f"[2/3] Nạp {len(records)} bản ghi vào Data Foundation 6 tầng & chạy Medallion ETL...")
    ingest_res = pipeline.ingest_raw_records(records, source_system="DATA_LEGAL_2026_EXTENDED")
    etl_res = pipeline.run_medallion_etl()

    engine = VbplAnalystBaBiEngine(pipeline)
    overview = engine.get_bi_overview()
    xlsx_path = engine.export_bi_excel()

    print("[3/3] HOÀN TẤT NẠP TOÀN VĂN FTS5 MỞ RỘNG!")
    print(
        json.dumps(
            {
                "elapsed_seconds": round(time.time() - t0, 1),
                "extended_files_ingested": len(records),
                "by_source_type": {
                    st: sum(1 for r in records if r["source_type"] == st)
                    for st in sorted({r["source_type"] for r in records})
                },
                "batch_id": ingest_res["batch_id"],
                "silver": etl_res["silver"],
                "warehouse": etl_res["warehouse"],
                "avg_dq_score": etl_res["avg_dq_score"],
                "excel_bi_export": str(xlsx_path),
                "total_documents_in_warehouse": overview["summary"]["total_documents"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

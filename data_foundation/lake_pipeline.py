r"""
Tầng 2: DATA LAKE — Kiến trúc Medallion (Bronze -> Silver Parquet -> Gold Parquet Marts)
lưu trữ cục bộ trong .local_data/vbpl/ của dự án (khóa trong .gitignore)
và đồng bộ sang Tầng 3 (SQLite Star Schema + FTS5).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import pandas as pd

from .contracts import (
    DEFAULT_DATA_LAKE_ROOT,
    VALID_PROJECT_AXES,
    CleanVbplClause,
    CleanVbplDocument,
    RawVbplRecord,
    VbplRelationRecord,
    compute_text_sha256,
    extract_legal_relations,
    normalize_domain_code,
    normalize_effect_status,
    normalize_nfc,
    score_document_dq,
    utc_now_iso,
    validate_ssot_filename,
)
from .warehouse_sqlite import VbplWarehouseSQLite


_RE_CHUONG = re.compile(r"^(Chương\s+[IVXLCDM\d]+)\s*[:.\-]?\s*(.*)$", re.IGNORECASE)
_RE_MUC = re.compile(r"^(Mục\s+\d+)\s*[:.\-]?\s*(.*)$", re.IGNORECASE)
_RE_DIEU = re.compile(r"^(Điều\s+\d+[a-zA-Z]?)\s*[:.]\s*(.*)$", re.IGNORECASE)
_RE_KHOAN = re.compile(r"^(\d+)\.\s+(.*)$")
_RE_DIEM = re.compile(r"^([a-zđ])\)\s+(.*)$", re.IGNORECASE)


def _clean_page_noise(text: str) -> str:
    cleaned = []
    for raw_line in (text or "").splitlines():
        s = normalize_nfc(raw_line)
        if not s:
            continue
        if re.match(r"^(?:[-–—\u00ad\u2212]\s*)?\d+(?:\s*[-–—\u00ad\u2212])?$", s) or re.match(
            r"^\[?Trang\s+\d+(?:\s*/\s*\d+)?\]?$", s, re.IGNORECASE
        ):
            continue
        cleaned.append(s)
    return "\n".join(cleaned)


def _parse_clauses_from_raw_text(
    doc_key: str,
    ssot_file_name: str,
    raw_text: str,
) -> Tuple[List[CleanVbplClause], int, int, int]:
    """Phân rã chuẩn NĐ 30/2020 khi bản ghi chỉ có raw_text (chưa có nodes)."""
    lines = _clean_page_noise(raw_text).splitlines()
    if not lines:
        return [], 1, 0, 0

    clauses_out: List[CleanVbplClause] = []
    preamble_lines: List[str] = []
    current_chapter = "Căn cứ ban hành · Lời mở đầu"
    current_article_num = ""
    current_article_title = ""
    current_blocks: List[Tuple[str, str, str]] = []  # (type, index, text)
    chapter_cnt = 0
    article_cnt = 0
    clause_cnt = 0

    def flush_article() -> None:
        nonlocal current_article_num, current_article_title, current_blocks
        if not current_article_num:
            return
        full_content = "\n".join(b[2] for b in current_blocks)
        art_clauses = sum(1 for b in current_blocks if b[0] in ("clause", "point"))
        order_idx = len(clauses_out) + 1
        clauses_out.append(
            CleanVbplClause(
                clause_key=f"{doc_key}-N{order_idx:04d}",
                doc_key=doc_key,
                ssot_file_name=ssot_file_name,
                order_index=order_idx,
                node_level="Điều",
                chapter_title=current_chapter,
                article_number=current_article_num,
                title=current_article_title,
                content_text=full_content,
                clause_count=max(art_clauses, 1 if current_blocks else 0),
                word_count=len(full_content.split()),
            )
        )
        current_article_num = ""
        current_article_title = ""
        current_blocks = []

    for line in lines:
        m_ch = _RE_CHUONG.match(line)
        if m_ch:
            flush_article()
            chapter_cnt += 1
            chap_code = m_ch.group(1).strip()
            chap_sub = m_ch.group(2).strip()
            current_chapter = f"{chap_code}: {chap_sub}".strip(": ")
            order_idx = len(clauses_out) + 1
            clauses_out.append(
                CleanVbplClause(
                    clause_key=f"{doc_key}-N{order_idx:04d}",
                    doc_key=doc_key,
                    ssot_file_name=ssot_file_name,
                    order_index=order_idx,
                    node_level="Chương",
                    chapter_title=current_chapter,
                    article_number=chap_code,
                    title=chap_sub or chap_code,
                    content_text="",
                    clause_count=0,
                    word_count=0,
                )
            )
            continue

        m_muc = _RE_MUC.match(line)
        if m_muc:
            flush_article()
            order_idx = len(clauses_out) + 1
            clauses_out.append(
                CleanVbplClause(
                    clause_key=f"{doc_key}-N{order_idx:04d}",
                    doc_key=doc_key,
                    ssot_file_name=ssot_file_name,
                    order_index=order_idx,
                    node_level="Mục",
                    chapter_title=current_chapter,
                    article_number=m_muc.group(1).strip(),
                    title=(m_muc.group(2) or "").strip(),
                    content_text="",
                    clause_count=0,
                    word_count=0,
                )
            )
            continue

        m_d = _RE_DIEU.match(line)
        if m_d:
            flush_article()
            article_cnt += 1
            current_article_num = m_d.group(1).strip()
            current_article_title = (m_d.group(2) or "").strip()
            continue

        if not current_article_num:
            preamble_lines.append(line)
        else:
            m_k = _RE_KHOAN.match(line)
            m_p = _RE_DIEM.match(line)
            if m_k:
                clause_cnt += 1
                current_blocks.append(("clause", m_k.group(1), line))
            elif m_p:
                clause_cnt += 1
                current_blocks.append(("point", m_p.group(1).lower(), line))
            elif current_blocks:
                t, idx_s, prev_txt = current_blocks[-1]
                current_blocks[-1] = (t, idx_s, f"{prev_txt} {line}")
            else:
                current_blocks.append(("paragraph", "0", line))

    flush_article()

    if preamble_lines:
        pre_txt = "\n".join(preamble_lines)
        if article_cnt == 0 and len(pre_txt) > 1800:
            chunks: List[str] = []
            buf: List[str] = []
            buf_len = 0
            for ln in preamble_lines:
                if buf and buf_len + len(ln) > 1500:
                    chunks.append("\n".join(buf))
                    buf = [ln]
                    buf_len = len(ln)
                else:
                    buf.append(ln)
                    buf_len += len(ln) + 1
            if buf:
                chunks.append("\n".join(buf))
            chunk_nodes: List[CleanVbplClause] = []
            for idx_c, chunk_txt in enumerate(chunks):
                chunk_nodes.append(
                    CleanVbplClause(
                        clause_key=f"{doc_key}-P{idx_c:04d}",
                        doc_key=doc_key,
                        ssot_file_name=ssot_file_name,
                        order_index=idx_c,
                        node_level="Mở đầu" if idx_c == 0 else "Mục",
                        chapter_title="Mở đầu" if idx_c == 0 else f"Phần {idx_c + 1}",
                        article_number="Căn cứ" if idx_c == 0 else f"Mục {idx_c + 1}",
                        title="Căn cứ ban hành · Lời mở đầu" if idx_c == 0 else f"Nội dung phần {idx_c + 1}",
                        content_text=chunk_txt,
                        clause_count=len(chunk_txt.splitlines()),
                        word_count=len(chunk_txt.split()),
                    )
                )
            clauses_out = chunk_nodes + clauses_out
        else:
            clauses_out.insert(
                0,
                CleanVbplClause(
                    clause_key=f"{doc_key}-N0000",
                    doc_key=doc_key,
                    ssot_file_name=ssot_file_name,
                    order_index=0,
                    node_level="Mở đầu",
                    chapter_title="Mở đầu",
                    article_number="Căn cứ",
                    title="Căn cứ ban hành · Lời mở đầu",
                    content_text=pre_txt,
                    clause_count=len(preamble_lines),
                    word_count=len(pre_txt.split()),
                ),
            )

    # Bảo đảm order_index & clause_key duy nhất tuyệt đối trên toàn văn bản
    for final_idx, cl_node in enumerate(clauses_out):
        cl_node.order_index = final_idx
        cl_node.clause_key = f"{doc_key}-N{final_idx:04d}"

    return clauses_out, max(1, chapter_cnt), article_cnt, clause_cnt


class VbplDataLakePipeline:
    """Điều phối Medallion Data Lake (Bronze/Silver/Gold Parquet) + SQLite Star Schema."""

    def __init__(self, root_dir: Optional[str] = None):
        self.root = Path(root_dir or DEFAULT_DATA_LAKE_ROOT)
        self.bronze_dir = self.root / "01_bronze"
        self.bronze_payloads_dir = self.bronze_dir / "raw_payloads"
        self.bronze_manifest_path = self.bronze_dir / "ingestion_manifest.jsonl"
        self.silver_dir = self.root / "02_silver"
        self.gold_dir = self.root / "03_gold"
        self.warehouse_dir = self.root / "04_warehouse"
        self.exports_dir = self.root / "05_exports"

        for d in (
            self.bronze_payloads_dir,
            self.silver_dir,
            self.gold_dir,
            self.warehouse_dir,
            self.exports_dir,
        ):
            d.mkdir(parents=True, exist_ok=True)

        self.warehouse = VbplWarehouseSQLite(self.warehouse_dir / "vbpl_warehouse.sqlite")

    # ------------------------------------------------------------------
    # TẦNG 1 -> 2A: INGEST VÀO BRONZE ZONE (IMMUTABLE APPEND-ONLY)
    # ------------------------------------------------------------------
    def ingest_raw_records(
        self,
        records: List[Dict[str, Any]],
        source_system: str = "WEB_APP",
    ) -> Dict[str, Any]:
        batch_id = f"BATCH_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        payload_file = self.bronze_payloads_dir / f"{batch_id}.jsonl"
        ingested_at = utc_now_iso()

        written = 0
        manifest_entries: List[Dict[str, Any]] = []

        with open(payload_file, "w", encoding="utf-8") as pf:
            for idx, item in enumerate(records):
                ssot_name = normalize_nfc(
                    item.get("ssot_file_name")
                    or item.get("ssotFileName")
                    or item.get("suggested_ssot_name")
                    or item.get("original_name")
                    or item.get("title")
                    or f"VBPL-{idx + 1}.pdf"
                )
                raw_text = normalize_nfc(item.get("raw_text") or item.get("extractedText") or "")
                nodes = item.get("nodes") or item.get("legal_nodes") or []
                if not raw_text and nodes:
                    raw_text = "\n".join(
                        f"{n.get('code', '')} {n.get('title', '')}\n{n.get('content', '')}".strip()
                        for n in nodes
                    )

                sha = (item.get("sha256") or "").strip() or compute_text_sha256(
                    f"{ssot_name}|{raw_text[:2000]}"
                )
                rec_id = (
                    str(item.get("record_id") or item.get("id") or "").strip()
                    or f"RAW-{sha[:12].upper()}"
                )

                raw_year = item.get("issue_year") or item.get("year") or 2026
                try:
                    issue_year = int(str(raw_year)[:4])
                except ValueError:
                    issue_year = 2026

                rec = RawVbplRecord(
                    record_id=rec_id,
                    source_system=item.get("source_system") or source_system,
                    source_path=str(item.get("source_path") or item.get("full_path") or ""),
                    sub_folder=str(item.get("sub_folder") or item.get("subFolder") or ""),
                    vault_path=str(item.get("vault_path") or item.get("vaultPath") or ""),
                    curated_path=str(item.get("curated_path") or item.get("curatedPath") or ""),
                    original_name=normalize_nfc(
                        item.get("original_name") or item.get("originalName") or ssot_name
                    ),
                    ssot_file_name=ssot_name,
                    sha256=sha,
                    source_type=str(item.get("source_type") or "WEB_SEED"),
                    ocr_applied=bool(item.get("ocr_applied", False)),
                    total_pages=int(item.get("total_pages") or 1),
                    doc_type=str(item.get("doc_type") or item.get("docType") or "ND").strip(),
                    issuer_code=str(
                        item.get("issuer_code") or item.get("issuer") or "CP"
                    ).strip(),
                    doc_number=str(
                        item.get("doc_number") or item.get("docNumber") or "01"
                    ).strip(),
                    issue_year=issue_year,
                    primary_domain=normalize_domain_code(
                        str(item.get("primary_domain") or item.get("primaryDomain") or "HDXD")
                    ),
                    title=normalize_nfc(item.get("title") or ssot_name),
                    issue_date=str(item.get("issue_date") or item.get("issueDate") or ""),
                    effective_date=str(
                        item.get("effective_date") or item.get("effectiveDate") or ""
                    ),
                    effect_status=str(
                        item.get("effect_status")
                        or item.get("status")
                        or "Còn hiệu lực năm 2026"
                    ),
                    is_amended=bool(item.get("is_amended") or item.get("isAmended", False)),
                    project_axes=[
                        str(x).strip().upper()
                        for x in (item.get("project_axes") or item.get("projectAxes") or [])
                        if str(x).strip()
                    ],
                    linked_gates=[
                        str(x).strip().upper()
                        for x in (item.get("linked_gates") or item.get("linkedGates") or [])
                        if str(x).strip()
                    ],
                    tags=[str(x).strip() for x in (item.get("tags") or []) if str(x).strip()],
                    raw_text=raw_text,
                    nodes=nodes,
                    ingested_at=ingested_at,
                )
                pf.write(rec.model_dump_json() + "\n")
                written += 1
                manifest_entries.append(
                    {
                        "batch_id": batch_id,
                        "record_id": rec.record_id,
                        "ssot_file_name": rec.ssot_file_name,
                        "sha256": rec.sha256,
                        "source_system": rec.source_system,
                        "ingested_at": ingested_at,
                        "payload_file": payload_file.name,
                    }
                )

        with open(self.bronze_manifest_path, "a", encoding="utf-8") as mf:
            for entry in manifest_entries:
                mf.write(json.dumps(entry, ensure_ascii=False) + "\n")

        return {
            "batch_id": batch_id,
            "ingested_records": written,
            "payload_file": str(payload_file),
            "ingested_at": ingested_at,
        }

    def ingest_folder(
        self,
        folder_path: str,
        extract_fn: Callable[[str], Dict[str, Any]],
        classify_fn: Callable[[str, Dict[str, Any]], Dict[str, Any]],
        parse_structure_fn: Callable[[str], Dict[str, Any]],
        project_code: str = "KCN",
    ) -> Dict[str, Any]:
        """Quét toàn bộ tệp PDF/DOCX trong thư mục cục bộ và nạp thẳng vào Bronze Zone."""
        folder = Path(folder_path)
        if not folder.is_dir():
            raise ValueError(f"Thư mục không tồn tại: {folder_path}")

        records: List[Dict[str, Any]] = []
        skipped: List[Dict[str, str]] = []

        for entry in sorted(folder.iterdir()):
            if not entry.is_file():
                continue
            ext = entry.suffix.lower()
            if ext not in (".pdf", ".docx"):
                continue
            try:
                sha = hashlib.sha256(entry.read_bytes()).hexdigest()
                extracted = extract_fn(str(entry))
                raw_text = extracted.get("raw_text") or ""
                structured = parse_structure_fn(raw_text)
                classified = classify_fn(
                    entry.name,
                    {
                        "text": raw_text,
                        "engine_used": extracted.get("source_type", "PDF_NATIVE"),
                        "confidence": 0.90 if extracted.get("ocr_applied") else 0.99,
                        "ai_metadata": {},
                    },
                )
                tags_list = [
                    t.get("label") or t.get("code")
                    for t in (classified.get("suggested_tags") or [])
                    if isinstance(t, dict)
                ]
                records.append(
                    {
                        "source_system": "LOCAL_FOLDER",
                        "source_path": str(entry),
                        "original_name": entry.name,
                        "ssot_file_name": classified.get("suggested_ssot_name") or entry.name,
                        "sha256": sha,
                        "source_type": extracted.get("source_type", "PDF_NATIVE"),
                        "ocr_applied": bool(extracted.get("ocr_applied", False)),
                        "total_pages": int(extracted.get("total_pages") or 1),
                        "doc_type": classified.get("doc_type") or "ND",
                        "issuer_code": classified.get("issuer") or "CP",
                        "doc_number": classified.get("doc_number") or "01",
                        "issue_year": int(classified.get("issue_year") or 2026),
                        "primary_domain": classified.get("domain") or "HDXD",
                        "title": classified.get("summary_pascal") or entry.stem,
                        "issue_date": f"01/01/{classified.get('issue_year') or 2026}",
                        "effective_date": f"01/01/{classified.get('issue_year') or 2026}",
                        "effect_status": "Còn hiệu lực",
                        "project_axes": [classified["project_code"]]
                        if classified.get("project_code")
                        else [project_code],
                        "linked_gates": [classified.get("gate_code") or "G12"],
                        "tags": [t for t in tags_list if t],
                        "raw_text": raw_text,
                        "nodes": structured.get("legal_nodes") or [],
                    }
                )
            except Exception as exc:
                skipped.append({"file": entry.name, "error": str(exc)})

        ingest_res = self.ingest_raw_records(records, source_system="LOCAL_FOLDER")
        return {**ingest_res, "skipped_files": skipped}

    # ------------------------------------------------------------------
    # TẦNG 2B -> 2C -> 3: MEDALLION ETL (BRONZE -> SILVER PARQUET -> GOLD PARQUET -> SQLITE)
    # ------------------------------------------------------------------
    def _load_all_bronze_records(self) -> List[RawVbplRecord]:
        all_recs: List[RawVbplRecord] = []
        for fpath in sorted(self.bronze_payloads_dir.glob("*.jsonl")):
            with open(fpath, "r", encoding="utf-8") as fh:
                for line in fh:
                    s = line.strip()
                    if not s:
                        continue
                    try:
                        all_recs.append(RawVbplRecord.model_validate_json(s))
                    except Exception:
                        continue
        return all_recs

    def run_medallion_etl(self) -> Dict[str, Any]:
        """Chạy trọn quy trình Bronze -> Silver Parquet -> Gold Parquet -> SQLite Star Schema."""
        started_at = utc_now_iso()
        run_id = f"ETL_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        bronze_recs = self._load_all_bronze_records()

        _real_sha_re = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)
        _empty_sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

        def _is_real_sha(val: str) -> bool:
            v = (val or "").strip().lower()
            return bool(_real_sha_re.match(v)) and v != _empty_sha

        def _merge_records(existing: RawVbplRecord, incoming: RawVbplRecord) -> RawVbplRecord:
            """Cập nhật metadata mới nhất nhưng bảo toàn toàn văn (raw_text/nodes) giàu dữ liệu hơn."""
            old_len = len(existing.raw_text or "")
            new_len = len(incoming.raw_text or "")
            keep_old_text = old_len > new_len + 100 or (len(existing.nodes) > len(incoming.nodes) and new_len < 1000)

            merged = incoming.model_copy(deep=True)
            if keep_old_text:
                merged.raw_text = existing.raw_text
                merged.nodes = existing.nodes
                merged.source_type = existing.source_type
                merged.ocr_applied = existing.ocr_applied
                merged.total_pages = existing.total_pages
            if not merged.vault_path and existing.vault_path:
                merged.vault_path = existing.vault_path
            if not merged.curated_path and existing.curated_path:
                merged.curated_path = existing.curated_path
            if not merged.sub_folder and existing.sub_folder:
                merged.sub_folder = existing.sub_folder
            if not merged.source_path and existing.source_path:
                merged.source_path = existing.source_path
            if not _is_real_sha(merged.sha256) and _is_real_sha(existing.sha256):
                merged.sha256 = existing.sha256
            return merged

        # Sắp xếp deterministic theo thời gian nạp tăng dần
        ordered_recs = [
            r for _, r in sorted(
                enumerate(bronze_recs),
                key=lambda pair: (pair[1].ingested_at or "", pair[0]),
            )
        ]

        # Pha 1: Khử trùng ưu tiên theo SHA-256 nhị phân thật (tránh bóng ma khi đổi tên file)
        sha_dedup_map: Dict[str, RawVbplRecord] = {}
        for rec in ordered_recs:
            if _is_real_sha(rec.sha256):
                key = f"SHA:{rec.sha256.strip().lower()}"
            else:
                key = f"NAME:{rec.ssot_file_name.strip().lower() or rec.sha256.lower()}"
            if key in sha_dedup_map:
                sha_dedup_map[key] = _merge_records(sha_dedup_map[key], rec)
            else:
                sha_dedup_map[key] = rec

        # Pha 2: Khử trùng thứ cấp theo ssot_file_name (bảo vệ UNIQUE(ssot_file_name) trong SQLite)
        dedup_map: Dict[str, RawVbplRecord] = {}
        for rec in sha_dedup_map.values():
            name_key = rec.ssot_file_name.strip().lower() or rec.sha256.lower()
            if name_key in dedup_map:
                dedup_map[name_key] = _merge_records(dedup_map[name_key], rec)
            else:
                dedup_map[name_key] = rec

        # Kiểm tra khóa logic (doc_type, issuer_code, doc_number, issue_year) để chấm Uniqueness DQ
        logical_key_counts: Dict[Tuple[str, str, str, int], int] = {}
        for rec in dedup_map.values():
            lk = (
                rec.doc_type.upper(),
                rec.issuer_code.upper(),
                rec.doc_number.upper(),
                int(rec.issue_year),
            )
            logical_key_counts[lk] = logical_key_counts.get(lk, 0) + 1

        clean_docs: List[Dict[str, Any]] = []
        clean_clauses: List[Dict[str, Any]] = []
        clean_relations: List[Dict[str, Any]] = []
        doc_key_migrations: Dict[str, str] = {}

        for rec in dedup_map.values():
            legacy_sha1_key = f"DOC-{hashlib.sha1(rec.ssot_file_name.lower().encode('utf-8')).hexdigest()[:12].upper()}"
            if _is_real_sha(rec.sha256):
                doc_key = f"DOC-{rec.sha256.strip()[:12].upper()}"
                doc_key_migrations[legacy_sha1_key] = doc_key
            else:
                doc_key = legacy_sha1_key
            domain_code = normalize_domain_code(rec.primary_domain)
            effect_status = normalize_effect_status(rec.effect_status)
            naming_valid = validate_ssot_filename(rec.ssot_file_name)

            # Xây danh sách CleanVbplClause từ nodes có sẵn hoặc phân rã từ raw_text
            doc_clauses: List[CleanVbplClause] = []
            if rec.nodes:
                chapter_cnt = 0
                article_cnt = 0
                clause_cnt = 0
                current_chap = "Căn cứ ban hành · Lời mở đầu"
                for idx, n in enumerate(rec.nodes):
                    lvl = str(n.get("level") or "Điều")
                    code = normalize_nfc(str(n.get("code") or ""))
                    title = normalize_nfc(str(n.get("title") or ""))
                    content = normalize_nfc(str(n.get("content") or ""))
                    c_cnt = int(n.get("clauseCount") or n.get("clauses_count") or 0)
                    if lvl == "Chương":
                        chapter_cnt += 1
                        current_chap = f"{code}: {title}".strip(": ")
                    elif lvl == "Điều":
                        article_cnt += 1
                        # Đếm thực tế khoản/điểm nếu có trong content
                        detected_sub = sum(
                            1
                            for ln in content.splitlines()
                            if _RE_KHOAN.match(ln.strip()) or _RE_DIEM.match(ln.strip())
                        )
                        c_cnt = max(c_cnt, detected_sub)
                        clause_cnt += c_cnt
                    doc_clauses.append(
                        CleanVbplClause(
                            clause_key=f"{doc_key}-N{idx:04d}",
                            doc_key=doc_key,
                            ssot_file_name=rec.ssot_file_name,
                            order_index=idx,
                            node_level=lvl,
                            chapter_title=current_chap,
                            article_number=code,
                            title=title,
                            content_text=content,
                            clause_count=c_cnt,
                            word_count=len(content.split()),
                        )
                    )
                chapter_cnt = max(1, chapter_cnt)
            else:
                doc_clauses, chapter_cnt, article_cnt, clause_cnt = _parse_clauses_from_raw_text(
                    doc_key, rec.ssot_file_name, rec.raw_text
                )

            lk = (
                rec.doc_type.upper(),
                rec.issuer_code.upper(),
                rec.doc_number.upper(),
                int(rec.issue_year),
            )
            is_dup_lk = logical_key_counts.get(lk, 0) > 1

            dq_total, dq_comp, dq_val, dq_uniq, dq_time, dq_issues = score_document_dq(
                ssot_file_name=rec.ssot_file_name,
                doc_number=rec.doc_number,
                issuer_code=rec.issuer_code,
                issue_year=rec.issue_year,
                domain_code=domain_code,
                title=rec.title,
                issue_date=rec.issue_date,
                effective_date=rec.effective_date,
                effect_status=effect_status,
                article_count=article_cnt,
                clause_count=clause_cnt,
                linked_gates=rec.linked_gates,
                is_duplicate_logical_key=is_dup_lk,
            )

            clean_doc = CleanVbplDocument(
                doc_key=doc_key,
                ssot_file_name=rec.ssot_file_name,
                original_name=rec.original_name,
                sub_folder=rec.sub_folder,
                source_path=rec.source_path,
                vault_path=rec.vault_path,
                curated_path=rec.curated_path,
                sha256=rec.sha256,
                source_system=rec.source_system,
                source_type=rec.source_type,
                ocr_applied=rec.ocr_applied,
                total_pages=rec.total_pages,
                doc_type_code=rec.doc_type,
                issuer_code=rec.issuer_code,
                doc_number=rec.doc_number,
                issue_year=rec.issue_year,
                domain_code=domain_code,
                title=rec.title,
                issue_date=rec.issue_date,
                effective_date=rec.effective_date,
                effect_status=effect_status,
                is_amended=rec.is_amended or effect_status == "AMENDED",
                chapter_count=chapter_cnt,
                article_count=article_cnt,
                clause_count=clause_cnt,
                has_full_structure=article_cnt > 0 and sum(c.word_count for c in doc_clauses) >= 12,
                naming_valid=naming_valid,
                dq_score=dq_total,
                dq_completeness=dq_comp,
                dq_validity=dq_val,
                dq_uniqueness=dq_uniq,
                dq_timeliness=dq_time,
                dq_issues=dq_issues,
                project_axes=[ax for ax in rec.project_axes if ax in VALID_PROJECT_AXES]
                or list(VALID_PROJECT_AXES),
                linked_gates=rec.linked_gates,
                tags=rec.tags,
                ingested_at=rec.ingested_at,
            )
            clean_docs.append(clean_doc.model_dump())
            for cl in doc_clauses:
                clean_clauses.append(cl.model_dump())

            # Trích xuất quan hệ pháp lý từ toàn văn
            full_text_for_rel = rec.raw_text or "\n".join(c.content_text for c in doc_clauses)
            for rel in extract_legal_relations(doc_key, rec.ssot_file_name, full_text_for_rel):
                clean_relations.append(rel.model_dump())

        # Ghi Tầng 2B: SILVER PARQUET
        docs_df = pd.DataFrame(clean_docs)
        clauses_df = pd.DataFrame(clean_clauses)
        relations_df = pd.DataFrame(clean_relations)

        self._write_parquet_safe(docs_df, self.silver_dir / "vbpl_documents.parquet")
        self._write_parquet_safe(clauses_df, self.silver_dir / "vbpl_clauses.parquet")
        self._write_parquet_safe(relations_df, self.silver_dir / "vbpl_relations.parquet")

        # Xây Tầng 2C: GOLD ANALYTICS MARTS (PARQUET)
        gold_counts = self._build_gold_marts(docs_df, relations_df)

        # Nạp Tầng 3: MODEL DATA (SQLITE STAR SCHEMA + FTS5)
        avg_dq = float(docs_df["dq_score"].mean()) if not docs_df.empty else 0.0
        finished_at = utc_now_iso()
        wh_counts = self.warehouse.load_from_silver_dataframes(
            docs_df=docs_df,
            clauses_df=clauses_df,
            relations_df=relations_df,
            run_meta={
                "run_id": run_id,
                "started_at": started_at,
                "finished_at": finished_at,
                "bronze_records": len(bronze_recs),
                "avg_dq_score": round(avg_dq, 2),
                "status": "SUCCESS",
            },
            doc_key_migrations=doc_key_migrations,
        )

        return {
            "run_id": run_id,
            "status": "SUCCESS",
            "data_lake_root": str(self.root),
            "bronze_records": len(bronze_recs),
            "silver": {
                "documents": len(docs_df),
                "clauses": len(clauses_df),
                "relations": len(relations_df),
            },
            "gold": gold_counts,
            "warehouse": wh_counts,
            "avg_dq_score": round(avg_dq, 2),
            "finished_at": finished_at,
        }

    def _write_parquet_safe(self, df: pd.DataFrame, target_path: Path) -> None:
        if df.empty:
            # Ghi bảng trống hợp lệ để các bước đọc Gold/BI không lỗi thiếu file
            pd.DataFrame({"_empty_placeholder": pd.Series(dtype="int64")}).to_parquet(
                target_path, index=False, engine="pyarrow"
            )
            return
        df_to_save = df.copy()
        # Chuẩn hóa cột list/object thành JSON string ổn định trên mọi version PyArrow
        for col in df_to_save.columns:
            if df_to_save[col].apply(lambda v: isinstance(v, (list, dict))).any():
                df_to_save[col] = df_to_save[col].apply(
                    lambda v: json.dumps(v, ensure_ascii=False)
                    if isinstance(v, (list, dict))
                    else str(v)
                )
        df_to_save.to_parquet(target_path, index=False, engine="pyarrow")

    def _build_gold_marts(
        self,
        docs_df: pd.DataFrame,
        relations_df: pd.DataFrame,
    ) -> Dict[str, int]:
        # 1. Gold Mart: Portfolio Summary
        if not docs_df.empty:
            portfolio_df = (
                docs_df.groupby(
                    ["issue_year", "doc_type_code", "issuer_code", "domain_code", "effect_status"],
                    dropna=False,
                )
                .agg(
                    doc_count=("doc_key", "count"),
                    total_articles=("article_count", "sum"),
                    total_clauses=("clause_count", "sum"),
                    avg_dq_score=("dq_score", "mean"),
                    valid_naming_count=("naming_valid", "sum"),
                )
                .reset_index()
            )
        else:
            portfolio_df = pd.DataFrame()
        self._write_parquet_safe(portfolio_df, self.gold_dir / "mart_vbpl_portfolio.parquet")

        # 2. Gold Mart: Coverage Matrix (Domain x Project Axis x Stage-Gate)
        cov_rows: List[Dict[str, Any]] = []
        if not docs_df.empty:
            for _, row in docs_df.iterrows():
                gates = row.get("linked_gates") or []
                axes = row.get("project_axes") or []
                for g in gates:
                    for ax in axes:
                        cov_rows.append(
                            {
                                "domain_code": row["domain_code"],
                                "project_axis": ax,
                                "gate_code": g,
                                "doc_key": row["doc_key"],
                                "effect_status": row["effect_status"],
                            }
                        )
        if cov_rows:
            cov_raw = pd.DataFrame(cov_rows)
            coverage_df = (
                cov_raw.groupby(["domain_code", "project_axis", "gate_code"])
                .agg(
                    doc_count=("doc_key", "nunique"),
                    active_count=("effect_status", lambda s: int((s == "ACTIVE").sum())),
                )
                .reset_index()
            )
        else:
            coverage_df = pd.DataFrame()
        self._write_parquet_safe(
            coverage_df, self.gold_dir / "mart_vbpl_coverage_matrix.parquet"
        )

        # 3. Gold Mart: Amendment & Risk Radar
        radar_rows: List[Dict[str, Any]] = []
        if not relations_df.empty:
            for _, r in relations_df.iterrows():
                if r["relation_type"] in ("REPEALS", "REPLACES", "AMENDS"):
                    radar_rows.append(
                        {
                            "alert_source": "RELATION_TEXT",
                            "doc_key": r["source_doc_key"],
                            "ssot_file_name": r["source_ssot_name"],
                            "severity": "HIGH"
                            if r["relation_type"] in ("REPEALS", "REPLACES")
                            else "MEDIUM",
                            "alert_type": r["relation_type"],
                            "target_ref": r["target_ref_raw"],
                            "detail": r["evidence_snippet"],
                        }
                    )
        if not docs_df.empty:
            for _, d in docs_df.iterrows():
                if not d["naming_valid"] or d["dq_score"] < 80 or d["effect_status"] == "EXPIRED":
                    radar_rows.append(
                        {
                            "alert_source": "DQ_AUDIT",
                            "doc_key": d["doc_key"],
                            "ssot_file_name": d["ssot_file_name"],
                            "severity": "HIGH"
                            if d["effect_status"] == "EXPIRED" or d["dq_score"] < 70
                            else "MEDIUM",
                            "alert_type": "DQ_DEFICIT",
                            "target_ref": d["doc_number"],
                            "detail": "; ".join(d.get("dq_issues") or []),
                        }
                    )
        radar_df = pd.DataFrame(radar_rows)
        self._write_parquet_safe(
            radar_df, self.gold_dir / "mart_vbpl_amendment_radar.parquet"
        )

        return {
            "mart_vbpl_portfolio": len(portfolio_df),
            "mart_vbpl_coverage_matrix": len(coverage_df),
            "mart_vbpl_amendment_radar": len(radar_df),
        }

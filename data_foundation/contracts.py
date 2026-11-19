"""
Tầng 1: DATA — Hợp đồng dữ liệu (Data Contracts), Chuẩn hóa danh mục,
Trích xuất quan hệ sửa đổi/thay thế/bãi bỏ và Chấm điểm Data Quality (DQ).
"""

from __future__ import annotations

import hashlib
import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA_LAKE_ROOT = os.getenv(
    "LEX_DATA_LAKE_ROOT",
    str(_REPO_ROOT / ".local_data" / "vbpl"),
)

VBPL_DOMAIN_CODES = [
    "HDXD",
    "QLCL",
    "QLHD",
    "QLCP",
    "VLXD",
    "DTH",
    "TQT",
    "PCCC",
    "QHDD",
    "ATLD",
    "DTU",
]

VALID_PROJECT_AXES = ["HTKT", "DAN_DUNG", "KCN", "CCN", "FTZ", "PPP_BT"]

SSOT_FILENAME_RULE_RE = re.compile(
    r"^[0-9A-Za-z]+(?:-[0-9A-Za-z]+)*-\d{4}_[A-Za-z0-9]+-[A-Za-z0-9]+_"
    r"(?:HDXD|QLCL|QLHD|QLCP|VLXD|DTH|TQT|PCCC|QHDD|ATLD|DTU)_"
    r"[A-Za-z0-9]+(?:-[A-Za-z0-9_-]+)?\.[a-z0-9]+$",
    re.IGNORECASE,
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_nfc(text: str) -> str:
    if not text:
        return ""
    s = unicodedata.normalize("NFC", str(text))
    s = re.sub(r"[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]", " ", s)
    s = re.sub(r"[\u200b-\u200d\ufeff]", "", s)
    return s.strip()


def compute_text_sha256(text: str) -> str:
    return hashlib.sha256((text or "").encode("utf-8")).hexdigest()


def normalize_domain_code(raw_domain: str) -> str:
    upper = (raw_domain or "HDXD").strip().upper()
    if upper in VBPL_DOMAIN_CODES:
        return upper
    return "HDXD"


def normalize_effect_status(raw_status: str) -> str:
    s = normalize_nfc(raw_status).lower()
    if any(k in s for k in ("hết hiệu lực", "het hieu luc", "expired", "bãi bỏ", "bai bo")):
        return "EXPIRED"
    if any(k in s for k in ("sắp có hiệu lực", "sap co hieu luc", "upcoming")):
        return "UPCOMING"
    if any(k in s for k in ("sửa đổi", "sua doi", "amended", "một phần", "mot phan")):
        return "AMENDED"
    return "ACTIVE"


def validate_ssot_filename(file_name: str) -> bool:
    return bool(SSOT_FILENAME_RULE_RE.match((file_name or "").strip()))


class RawVbplRecord(BaseModel):
    """Hợp đồng dữ liệu Tầng 1 (Bronze — Raw Immutable Record)."""

    record_id: str
    source_system: str = Field(default="LOCAL_SCANNER")  # LOCAL_SCANNER | WEB_APP | CSV_IMPORT | APP_SEED
    source_path: str = ""
    original_name: str
    ssot_file_name: str = ""
    sha256: str = ""
    source_type: str = "PDF_NATIVE"  # PDF_NATIVE | PDF_OCR | DOCX_NATIVE | WEB_SEED | CSV_ROW
    ocr_applied: bool = False
    total_pages: int = 1
    doc_type: str = "ND"
    issuer_code: str = "CP"
    doc_number: str = "01"
    issue_year: int = 2026
    primary_domain: str = "HDXD"
    title: str = ""
    issue_date: str = ""
    effective_date: str = ""
    effect_status: str = "Còn hiệu lực năm 2026"
    is_amended: bool = False
    project_axes: List[str] = Field(default_factory=list)
    linked_gates: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    raw_text: str = ""
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    ingested_at: str = Field(default_factory=utc_now_iso)


class CleanVbplDocument(BaseModel):
    """Hợp đồng dữ liệu Tầng 2 (Silver — Cleaned & Conformed Document)."""

    doc_key: str
    ssot_file_name: str
    original_name: str
    sha256: str
    source_system: str
    source_type: str
    ocr_applied: bool
    total_pages: int
    doc_type_code: str
    issuer_code: str
    doc_number: str
    issue_year: int
    domain_code: str
    title: str
    issue_date: str
    effective_date: str
    effect_status: str  # ACTIVE | UPCOMING | AMENDED | EXPIRED
    is_amended: bool
    chapter_count: int
    article_count: int
    clause_count: int
    has_full_structure: bool
    naming_valid: bool
    dq_score: int
    dq_completeness: int
    dq_validity: int
    dq_uniqueness: int
    dq_timeliness: int
    dq_issues: List[str] = Field(default_factory=list)
    project_axes: List[str] = Field(default_factory=list)
    linked_gates: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    ingested_at: str
    processed_at: str = Field(default_factory=utc_now_iso)


class CleanVbplClause(BaseModel):
    """Hợp đồng dữ liệu Tầng 2 (Silver — Cleaned Legal Clause / Article Node)."""

    clause_key: str
    doc_key: str
    ssot_file_name: str
    order_index: int
    node_level: str  # Mở đầu | Chương | Mục | Điều | Khoản | Điểm
    chapter_title: str = ""
    article_number: str = ""
    clause_index: str = ""
    point_index: str = ""
    title: str = ""
    content_text: str = ""
    clause_count: int = 0
    word_count: int = 0


class VbplRelationRecord(BaseModel):
    """Quan hệ pháp lý trích xuất tự động giữa các VBPL (Thay thế / Sửa đổi / Bãi bỏ / Căn cứ)."""

    relation_key: str
    source_doc_key: str
    source_ssot_name: str
    relation_type: str  # REPLACES | AMENDS | REPEALS | GUIDES | REFERENCES
    target_ref_raw: str
    target_doc_number: str
    target_year: Optional[int] = None
    evidence_snippet: str = ""


_LEGAL_REF_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    (
        "REPLACES",
        re.compile(
            r"(?:thay\s+thế|thay\s+the)\s+(?:cho\s+)?(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN|TCVN|VBHN)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)",
            re.IGNORECASE,
        ),
    ),
    (
        "REPEALS",
        re.compile(
            r"(?:bãi\s+bỏ|bai\s+bo|hết\s+hiệu\s+lực)\s+(?:một\s+số\s+điều\s+của\s+|toàn\s+bộ\s+)?(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)",
            re.IGNORECASE,
        ),
    ),
    (
        "AMENDS",
        re.compile(
            r"(?:sửa\s+đổi,\s*bổ\s+sung|sửa\s+đổi|bổ\s+sung)\s+(?:một\s+số\s+điều\s+của\s+)?(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)",
            re.IGNORECASE,
        ),
    ),
    (
        "GUIDES",
        re.compile(
            r"(?:quy\s+định\s+chi\s+tiết|hướng\s+dẫn\s+thi\s+hành)\s+(?:một\s+số\s+điều\s+của\s+)?(?:Luật|Nghị\s+định|Thông\s+tư)?\s*(?:Xây\s+dựng|Đấu\s+thầu|Đất\s+đai|Đầu\s+tư)?\s*(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)",
            re.IGNORECASE,
        ),
    ),
    (
        "REFERENCES",
        re.compile(
            r"(?:căn\s+cứ|theo\s+quy\s+định\s+tại)\s+(?:Luật|Nghị\s+định|Thông\s+tư|Quyết\s+định|QCVN)?[^;\n]{0,45}?(?:số\s*)?(\d{1,4}[/:-]\d{4}(?:[/:-][A-Za-z0-9Đđ-]+)?)",
            re.IGNORECASE,
        ),
    ),
]


def extract_legal_relations(
    source_doc_key: str,
    source_ssot_name: str,
    raw_text: str,
) -> List[VbplRelationRecord]:
    """Quét toàn văn trích xuất quan hệ thay thế/sửa đổi/bãi bỏ/hướng dẫn/căn cứ."""
    text = normalize_nfc(raw_text)
    if not text:
        return []

    relations: List[VbplRelationRecord] = []
    seen: set[Tuple[str, str]] = set()

    for rel_type, pattern in _LEGAL_REF_PATTERNS:
        for m in pattern.finditer(text):
            ref_raw = m.group(1).strip()
            dedupe_key = (rel_type, ref_raw.upper())
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            year_m = re.search(r"(19|20)\d{2}", ref_raw)
            target_year = int(year_m.group(0)) if year_m else None
            num_part = re.split(r"[/:-]", ref_raw)[0].strip()

            start = max(0, m.start() - 30)
            end = min(len(text), m.end() + 70)
            snippet = re.sub(r"\s+", " ", text[start:end]).strip()
            rel_hash = hashlib.sha1(
                f"{source_doc_key}|{rel_type}|{ref_raw.upper()}".encode("utf-8")
            ).hexdigest()[:12]

            relations.append(
                VbplRelationRecord(
                    relation_key=f"REL-{rel_hash}",
                    source_doc_key=source_doc_key,
                    source_ssot_name=source_ssot_name,
                    relation_type=rel_type,
                    target_ref_raw=ref_raw,
                    target_doc_number=num_part,
                    target_year=target_year,
                    evidence_snippet=snippet[:220],
                )
            )

    return relations


def score_document_dq(
    *,
    ssot_file_name: str,
    doc_number: str,
    issuer_code: str,
    issue_year: int,
    domain_code: str,
    title: str,
    issue_date: str,
    effective_date: str,
    effect_status: str,
    article_count: int,
    clause_count: int,
    linked_gates: List[str],
    is_duplicate_logical_key: bool = False,
) -> Tuple[int, int, int, int, int, List[str]]:
    """
    Chấm điểm chất lượng dữ liệu (Data Quality) 4 trụ cột (0–100):
    - Completeness (30): số hiệu, cơ quan, tiêu đề, ngày ban hành/hiệu lực, có cây Điều/Khoản.
    - Validity (30): tên chuẩn SSOT VBPL, năm hợp lệ, domain thuộc 11 mã chuẩn.
    - Uniqueness (20): không trùng khóa logic (loại-cơ quan-số-năm).
    - Timeliness & Lineage (20): có trạng thái hiệu lực và ánh xạ tối thiểu 1 Stage-Gate.
    """
    issues: List[str] = []

    # 1. Completeness (30)
    completeness = 30
    if not doc_number or doc_number in ("00", "01"):
        completeness -= 5
        issues.append("Thiếu hoặc dùng số hiệu mặc định (00/01)")
    if not issuer_code:
        completeness -= 5
        issues.append("Thiếu mã cơ quan ban hành")
    if not title or len(title.strip()) < 8:
        completeness -= 5
        issues.append("Trích yếu quá ngắn (< 8 ký tự)")
    if not issue_date or not effective_date:
        completeness -= 5
        issues.append("Thiếu ngày ban hành hoặc ngày hiệu lực")
    if article_count <= 0:
        completeness -= 10
        issues.append("Chưa bóc tách được cấu trúc Điều (file vỏ / scan chưa OCR)")
    elif clause_count <= 0:
        completeness -= 3
        issues.append("Đã có Điều nhưng chưa nhận diện được Khoản/Điểm")
    completeness = max(0, completeness)

    # 2. Validity (30)
    validity = 30
    if not validate_ssot_filename(ssot_file_name):
        validity -= 18
        issues.append(
            "Tên file chưa đúng chuẩn [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu].[ext]"
        )
    if domain_code not in VBPL_DOMAIN_CODES:
        validity -= 7
        issues.append(f"Mã lĩnh vực '{domain_code}' không thuộc 11 mã chuẩn")
    if issue_year < 1990 or issue_year > 2035:
        validity -= 5
        issues.append(f"Năm ban hành bất thường ({issue_year})")
    validity = max(0, validity)

    # 3. Uniqueness (20)
    uniqueness = 20
    if is_duplicate_logical_key:
        uniqueness = 5
        issues.append("Trùng khóa logic văn bản (Số hiệu + Năm + Loại + Cơ quan)")

    # 4. Timeliness & Lineage (20)
    timeliness = 20
    if effect_status == "EXPIRED":
        timeliness -= 8
        issues.append("Văn bản đã hết hiệu lực — cần gắn cờ đối chiếu văn bản thay thế")
    elif effect_status == "AMENDED":
        timeliness -= 3
        issues.append("Văn bản đã bị sửa đổi/bổ sung — cần kiểm tra điều khoản cập nhật")
    if not linked_gates:
        timeliness -= 8
        issues.append("Chưa ánh xạ Stage-Gate (G0–G16)")
    timeliness = max(0, timeliness)

    total = completeness + validity + uniqueness + timeliness
    return total, completeness, validity, uniqueness, timeliness, issues

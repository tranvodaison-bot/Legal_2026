"""
Tầng 3: MODEL DATA — Star Schema Warehouse + SQLite WAL + FTS5 Full-Text Search
và các SQL Views phân tích chuẩn hóa cho phân hệ VBPL (Single-User Local-First).
Tương thích nâng cấp 1-1 lên PostgreSQL/Supabase đa bên sau này.
"""

from __future__ import annotations

from contextlib import contextmanager
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

import pandas as pd

from .contracts import utc_now_iso

DIM_DOC_TYPES_SEED = [
    ("LUAT", "Luật", 1),
    ("NQ", "Nghị quyết", 2),
    ("ND", "Nghị định", 3),
    ("VBHN", "Văn bản hợp nhất", 4),
    ("TT", "Thông tư", 5),
    ("QCVN", "Quy chuẩn kỹ thuật quốc gia", 6),
    ("TCVN", "Tiêu chuẩn quốc gia", 7),
    ("QD", "Quyết định", 8),
    ("CV", "Công văn hướng dẫn", 9),
    ("TTr", "Tờ trình", 10),
    ("HD", "Hợp đồng", 11),
    ("PLHD", "Phụ lục hợp đồng", 12),
    ("BBNT", "Biên bản nghiệm thu", 13),
    ("NKTC", "Nhật ký thi công", 14),
    ("BV", "Bản vẽ thiết kế", 15),
]

DIM_ISSUERS_SEED = [
    ("QH15", "Quốc hội khóa XV", "TRUNG_UONG"),
    ("QH14", "Quốc hội khóa XIV", "TRUNG_UONG"),
    ("QH", "Quốc hội", "TRUNG_UONG"),
    ("CP", "Chính phủ", "TRUNG_UONG"),
    ("TTg", "Thủ tướng Chính phủ", "TRUNG_UONG"),
    ("BXD", "Bộ Xây dựng", "BO_NGANH"),
    ("BTC", "Bộ Tài chính", "BO_NGANH"),
    ("CHQ", "Cục Hải quan (Bộ Tài chính)", "BO_NGANH"),
    ("BKHDT", "Bộ Kế hoạch & Đầu tư", "BO_NGANH"),
    ("BTNMT", "Bộ Tài nguyên & Môi trường", "BO_NGANH"),
    ("BCA", "Bộ Công an (Cục PCCC)", "BO_NGANH"),
    ("BCT", "Bộ Công Thương", "BO_NGANH"),
    ("BKHCN", "Bộ Khoa học & Công nghệ", "BO_NGANH"),
    ("UBND", "UBND Tỉnh / Thành phố", "DIA_PHUONG"),
    ("UBNDHN", "UBND Thành phố Hà Nội", "DIA_PHUONG"),
    ("BQLKKT", "BQL Khu kinh tế / KCN", "DIA_PHUONG"),
    ("BQLDA", "Ban Quản lý Dự án", "DU_AN"),
    ("CDT", "Chủ đầu tư", "DU_AN"),
    ("TVGS", "Tư vấn Giám sát", "DU_AN"),
    ("TVTK", "Tư vấn Thiết kế", "DU_AN"),
    ("NTTC", "Nhà thầu Thi công", "DU_AN"),
]

DIM_DOMAINS_SEED = [
    ("HDXD", "Hoạt động Xây dựng & Quản lý Dự án", "XD"),
    ("QLCL", "Quản lý Chất lượng, Thi công & Bảo trì", "XD"),
    ("QLCP", "Quản lý Chi phí, Định mức & Dự toán", "XD"),
    ("QLHD", "Quản lý Hợp đồng Xây dựng & FIDIC", "XD"),
    ("VLXD", "Vật liệu Xây dựng & LAS-XD", "XD"),
    ("DTH", "Đấu thầu & Lựa chọn Nhà thầu", "XD"),
    ("TQT", "Thanh quyết toán & Kiểm toán vốn đầu tư", "TC"),
    ("PCCC", "Phòng cháy Chữa cháy & Cứu nạn", "XD"),
    ("QHDD", "Quy hoạch, Đất đai & GPMB", "BDS"),
    ("ATLD", "An toàn Lao động & Môi trường", "DN"),
    ("DTU", "Chủ trương Đầu tư KCN / KKT / FTZ / PPP", "BDS"),
]

DIM_STAGE_GATES_SEED = [
    ("G0", "CHUAN_BI", "Chủ trương đầu tư & Pháp lý đất", 0),
    ("G1", "CHUAN_BI", "Quy hoạch 1/2000 & Nhiệm vụ chuẩn bị", 1),
    ("G2", "CHUAN_BI", "Khảo sát & Báo cáo Tiền khả thi", 2),
    ("G3", "CHUAN_BI", "Quy hoạch chi tiết 1/500 & Giao đất", 3),
    ("G4", "CHUAN_BI", "Đền bù GPMB & Giấy chứng nhận QSDĐ", 4),
    ("G5", "CHUAN_BI", "BCNCKT, Thiết kế cơ sở & BIM", 5),
    ("G6", "CHUAN_BI", "Thẩm duyệt PCCC & ĐTM / Giấy phép MT", 6),
    ("G7", "THUC_HIEN", "Thiết kế kỹ thuật / TKBVTC", 7),
    ("G8", "THUC_HIEN", "Giấy phép Xây dựng & Khởi công", 8),
    ("G9", "THUC_HIEN", "Thẩm tra Dự toán & Kế hoạch LCNT", 9),
    ("G10", "THUC_HIEN", "Đấu thầu & Phê duyệt kết quả LCNT", 10),
    ("G11", "THUC_HIEN", "Thương thảo, Ký Hợp đồng & Bảo lãnh", 11),
    ("G12", "THUC_HIEN", "Thi công, LAS-XD & Nghiệm thu công việc", 12),
    ("G13", "THUC_HIEN", "Tạm ứng, Thanh toán IPC & Kiểm soát VO", 13),
    ("G14", "KET_THUC", "Nghiệm thu hoàn thành & PCCC đưa vào SD", 14),
    ("G15", "KET_THUC", "Quyết toán vốn đầu tư & Kiểm toán độc lập", 15),
    ("G16", "KET_THUC", "Vận hành, Bảo hành & Lưu trữ hồ sơ hoàn công", 16),
]

DIM_PROJECT_AXES_SEED = [
    ("KCN", "Khu công nghiệp"),
    ("CCN", "Cụm công nghiệp"),
    ("FTZ", "Khu thương mại tự do & Logistics"),
    ("HTKT", "Hạ tầng kỹ thuật & Giao thông"),
    ("DAN_DUNG", "Công trình dân dụng & Khu đô thị"),
    ("PPP_BT", "Dự án PPP / BOT / BT"),
]


class VbplWarehouseSQLite:
    """Kho dữ liệu Star Schema + FTS5 trên SQLite (WAL mode) cho 1 người sử dụng."""

    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_schema()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                -- ============================================================
                -- 1. DIMENSION TABLES (STAR SCHEMA)
                -- ============================================================
                CREATE TABLE IF NOT EXISTS dim_doc_type (
                    doc_type_code TEXT PRIMARY KEY,
                    doc_type_name TEXT NOT NULL,
                    hierarchy_rank INTEGER NOT NULL DEFAULT 99
                );

                CREATE TABLE IF NOT EXISTS dim_issuer (
                    issuer_code TEXT PRIMARY KEY,
                    issuer_name TEXT NOT NULL,
                    authority_level TEXT NOT NULL DEFAULT 'BO_NGANH'
                );

                CREATE TABLE IF NOT EXISTS dim_domain (
                    domain_code TEXT PRIMARY KEY,
                    domain_name TEXT NOT NULL,
                    industry_code TEXT NOT NULL DEFAULT 'XD'
                );

                CREATE TABLE IF NOT EXISTS dim_stage_gate (
                    gate_code TEXT PRIMARY KEY,
                    phase_code TEXT NOT NULL,
                    gate_name TEXT NOT NULL,
                    gate_order INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS dim_project_axis (
                    project_axis_code TEXT PRIMARY KEY,
                    project_axis_name TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS dim_time (
                    issue_year INTEGER PRIMARY KEY,
                    decade_label TEXT NOT NULL,
                    is_2026_reform_wave INTEGER NOT NULL DEFAULT 0
                );

                -- ============================================================
                -- 2. FACT & BRIDGE TABLES
                -- ============================================================
                CREATE TABLE IF NOT EXISTS fact_vbpl_documents (
                    doc_key TEXT PRIMARY KEY,
                    ssot_file_name TEXT NOT NULL UNIQUE,
                    original_name TEXT NOT NULL,
                    sha256 TEXT NOT NULL,
                    source_system TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    ocr_applied INTEGER NOT NULL DEFAULT 0,
                    total_pages INTEGER NOT NULL DEFAULT 1,
                    doc_type_code TEXT NOT NULL,
                    issuer_code TEXT NOT NULL,
                    doc_number TEXT NOT NULL,
                    issue_year INTEGER NOT NULL,
                    domain_code TEXT NOT NULL,
                    title TEXT NOT NULL,
                    issue_date TEXT,
                    effective_date TEXT,
                    effect_status TEXT NOT NULL DEFAULT 'ACTIVE',
                    is_amended INTEGER NOT NULL DEFAULT 0,
                    chapter_count INTEGER NOT NULL DEFAULT 1,
                    article_count INTEGER NOT NULL DEFAULT 0,
                    clause_count INTEGER NOT NULL DEFAULT 0,
                    has_full_structure INTEGER NOT NULL DEFAULT 0,
                    naming_valid INTEGER NOT NULL DEFAULT 0,
                    dq_score INTEGER NOT NULL DEFAULT 0,
                    dq_completeness INTEGER NOT NULL DEFAULT 0,
                    dq_validity INTEGER NOT NULL DEFAULT 0,
                    dq_uniqueness INTEGER NOT NULL DEFAULT 0,
                    dq_timeliness INTEGER NOT NULL DEFAULT 0,
                    dq_issues_json TEXT NOT NULL DEFAULT '[]',
                    ingested_at TEXT NOT NULL,
                    processed_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS fact_vbpl_clauses (
                    clause_key TEXT PRIMARY KEY,
                    doc_key TEXT NOT NULL REFERENCES fact_vbpl_documents(doc_key) ON DELETE CASCADE,
                    ssot_file_name TEXT NOT NULL,
                    order_index INTEGER NOT NULL,
                    node_level TEXT NOT NULL,
                    chapter_title TEXT,
                    article_number TEXT,
                    clause_index TEXT,
                    point_index TEXT,
                    title TEXT,
                    content_text TEXT NOT NULL,
                    clause_count INTEGER NOT NULL DEFAULT 0,
                    word_count INTEGER NOT NULL DEFAULT 0
                );

                CREATE VIRTUAL TABLE IF NOT EXISTS fts_vbpl_clauses USING fts5(
                    clause_key UNINDEXED,
                    doc_key UNINDEXED,
                    ssot_file_name,
                    article_number,
                    title,
                    content_text,
                    tokenize = 'unicode61'
                );

                CREATE TABLE IF NOT EXISTS bridge_doc_gate (
                    doc_key TEXT NOT NULL REFERENCES fact_vbpl_documents(doc_key) ON DELETE CASCADE,
                    gate_code TEXT NOT NULL,
                    PRIMARY KEY (doc_key, gate_code)
                );

                CREATE TABLE IF NOT EXISTS bridge_doc_project (
                    doc_key TEXT NOT NULL REFERENCES fact_vbpl_documents(doc_key) ON DELETE CASCADE,
                    project_axis_code TEXT NOT NULL,
                    PRIMARY KEY (doc_key, project_axis_code)
                );

                CREATE TABLE IF NOT EXISTS bridge_doc_tags (
                    doc_key TEXT NOT NULL REFERENCES fact_vbpl_documents(doc_key) ON DELETE CASCADE,
                    tag_label TEXT NOT NULL,
                    PRIMARY KEY (doc_key, tag_label)
                );

                CREATE TABLE IF NOT EXISTS fact_vbpl_relations (
                    relation_key TEXT PRIMARY KEY,
                    source_doc_key TEXT NOT NULL REFERENCES fact_vbpl_documents(doc_key) ON DELETE CASCADE,
                    source_ssot_name TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    target_ref_raw TEXT NOT NULL,
                    target_doc_number TEXT NOT NULL,
                    target_year INTEGER,
                    evidence_snippet TEXT
                );

                CREATE TABLE IF NOT EXISTS fact_dq_runs (
                    run_id TEXT PRIMARY KEY,
                    started_at TEXT NOT NULL,
                    finished_at TEXT NOT NULL,
                    bronze_records INTEGER NOT NULL,
                    silver_docs INTEGER NOT NULL,
                    silver_clauses INTEGER NOT NULL,
                    silver_relations INTEGER NOT NULL,
                    avg_dq_score REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'SUCCESS'
                );

                CREATE TABLE IF NOT EXISTS fact_personal_notes (
                    note_id TEXT PRIMARY KEY,
                    doc_key TEXT NOT NULL,
                    clause_key TEXT NOT NULL,
                    note_text TEXT NOT NULL,
                    author TEXT NOT NULL DEFAULT 'Single User (CĐT)',
                    updated_at TEXT NOT NULL
                );

                -- ============================================================
                -- 3. ANALYTICAL SQL VIEWS (TẦNG 4: DATA ANALYST)
                -- ============================================================
                CREATE VIEW IF NOT EXISTS vw_bi_domain_summary AS
                SELECT
                    d.domain_code,
                    COALESCE(dm.domain_name, d.domain_code) AS domain_name,
                    COUNT(*) AS doc_count,
                    SUM(d.article_count) AS total_articles,
                    SUM(d.clause_count) AS total_clauses,
                    ROUND(AVG(d.dq_score), 1) AS avg_dq_score,
                    SUM(CASE WHEN d.naming_valid = 1 THEN 1 ELSE 0 END) AS valid_name_count,
                    SUM(CASE WHEN d.has_full_structure = 1 THEN 1 ELSE 0 END) AS full_structure_count
                FROM fact_vbpl_documents d
                LEFT JOIN dim_domain dm ON dm.domain_code = d.domain_code
                GROUP BY d.domain_code, dm.domain_name
                ORDER BY doc_count DESC;

                CREATE VIEW IF NOT EXISTS vw_bi_doc_type_distribution AS
                SELECT
                    d.doc_type_code,
                    COALESCE(dt.doc_type_name, d.doc_type_code) AS doc_type_name,
                    COALESCE(dt.hierarchy_rank, 99) AS hierarchy_rank,
                    COUNT(*) AS doc_count,
                    ROUND(AVG(d.dq_score), 1) AS avg_dq_score
                FROM fact_vbpl_documents d
                LEFT JOIN dim_doc_type dt ON dt.doc_type_code = d.doc_type_code
                GROUP BY d.doc_type_code, dt.doc_type_name, dt.hierarchy_rank
                ORDER BY hierarchy_rank ASC, doc_count DESC;

                CREATE VIEW IF NOT EXISTS vw_bi_yearly_trend AS
                SELECT
                    d.issue_year,
                    COUNT(*) AS doc_count,
                    SUM(d.article_count) AS total_articles,
                    SUM(CASE WHEN d.effect_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_count,
                    ROUND(AVG(d.dq_score), 1) AS avg_dq_score
                FROM fact_vbpl_documents d
                GROUP BY d.issue_year
                ORDER BY d.issue_year ASC;

                CREATE VIEW IF NOT EXISTS vw_bi_gate_coverage AS
                SELECT
                    g.gate_code,
                    g.phase_code,
                    g.gate_name,
                    g.gate_order,
                    COUNT(DISTINCT bg.doc_key) AS doc_count,
                    SUM(CASE WHEN d.effect_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_doc_count,
                    SUM(CASE WHEN d.has_full_structure = 1 THEN 1 ELSE 0 END) AS structured_doc_count
                FROM dim_stage_gate g
                LEFT JOIN bridge_doc_gate bg ON bg.gate_code = g.gate_code
                LEFT JOIN fact_vbpl_documents d ON d.doc_key = bg.doc_key
                GROUP BY g.gate_code, g.phase_code, g.gate_name, g.gate_order
                ORDER BY g.gate_order ASC;

                CREATE VIEW IF NOT EXISTS vw_bi_dq_issues AS
                SELECT
                    doc_key,
                    ssot_file_name,
                    doc_type_code,
                    issuer_code,
                    domain_code,
                    issue_year,
                    dq_score,
                    dq_completeness,
                    dq_validity,
                    dq_uniqueness,
                    dq_timeliness,
                    dq_issues_json
                FROM fact_vbpl_documents
                WHERE dq_score < 100
                ORDER BY dq_score ASC, issue_year DESC;

                CREATE VIEW IF NOT EXISTS vw_bi_relation_alerts AS
                SELECT
                    r.relation_key,
                    r.source_doc_key,
                    r.source_ssot_name,
                    r.relation_type,
                    r.target_ref_raw,
                    r.target_doc_number,
                    r.target_year,
                    r.evidence_snippet,
                    d.doc_type_code AS source_doc_type,
                    d.domain_code AS source_domain
                FROM fact_vbpl_relations r
                JOIN fact_vbpl_documents d ON d.doc_key = r.source_doc_key
                ORDER BY
                    CASE r.relation_type
                        WHEN 'REPEALS' THEN 1
                        WHEN 'REPLACES' THEN 2
                        WHEN 'AMENDS' THEN 3
                        WHEN 'GUIDES' THEN 4
                        ELSE 5
                    END,
                    r.source_ssot_name;
                """
            )
            self._seed_dimensions(conn)

    def _seed_dimensions(self, conn: sqlite3.Connection) -> None:
        conn.executemany(
            "INSERT OR IGNORE INTO dim_doc_type (doc_type_code, doc_type_name, hierarchy_rank) VALUES (?, ?, ?)",
            DIM_DOC_TYPES_SEED,
        )
        conn.executemany(
            "INSERT OR IGNORE INTO dim_issuer (issuer_code, issuer_name, authority_level) VALUES (?, ?, ?)",
            DIM_ISSUERS_SEED,
        )
        conn.executemany(
            "INSERT OR IGNORE INTO dim_domain (domain_code, domain_name, industry_code) VALUES (?, ?, ?)",
            DIM_DOMAINS_SEED,
        )
        conn.executemany(
            "INSERT OR IGNORE INTO dim_stage_gate (gate_code, phase_code, gate_name, gate_order) VALUES (?, ?, ?, ?)",
            DIM_STAGE_GATES_SEED,
        )
        conn.executemany(
            "INSERT OR IGNORE INTO dim_project_axis (project_axis_code, project_axis_name) VALUES (?, ?)",
            DIM_PROJECT_AXES_SEED,
        )

    def load_from_silver_dataframes(
        self,
        docs_df: pd.DataFrame,
        clauses_df: pd.DataFrame,
        relations_df: pd.DataFrame,
        run_meta: Dict[str, Any],
    ) -> Dict[str, int]:
        """Nạp toàn bộ Silver DataFrames vào Star Schema + FTS5 (Full Refresh Idempotent)."""
        with self._connect() as conn:
            # Xóa dữ liệu Fact/Bridge cũ để nạp đồng bộ 100% từ Silver (giữ nguyên fact_personal_notes & fact_dq_runs)
            conn.execute("DELETE FROM fts_vbpl_clauses;")
            conn.execute("DELETE FROM fact_vbpl_relations;")
            conn.execute("DELETE FROM bridge_doc_tags;")
            conn.execute("DELETE FROM bridge_doc_project;")
            conn.execute("DELETE FROM bridge_doc_gate;")
            conn.execute("DELETE FROM fact_vbpl_clauses;")
            conn.execute("DELETE FROM fact_vbpl_documents;")

            doc_rows = docs_df.to_dict(orient="records") if not docs_df.empty else []
            for row in doc_rows:
                issue_year = int(row.get("issue_year") or 2026)
                decade = f"{(issue_year // 10) * 10}s"
                is_reform = 1 if issue_year >= 2025 else 0
                conn.execute(
                    "INSERT OR IGNORE INTO dim_time (issue_year, decade_label, is_2026_reform_wave) VALUES (?, ?, ?)",
                    (issue_year, decade, is_reform),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO dim_doc_type (doc_type_code, doc_type_name, hierarchy_rank) VALUES (?, ?, 99)",
                    (row["doc_type_code"], row["doc_type_code"]),
                )
                conn.execute(
                    "INSERT OR IGNORE INTO dim_issuer (issuer_code, issuer_name, authority_level) VALUES (?, ?, 'KHAC')",
                    (row["issuer_code"], row["issuer_code"]),
                )

                issues_list = row.get("dq_issues") or []
                if isinstance(issues_list, str):
                    issues_json = issues_list
                else:
                    issues_json = json.dumps(list(issues_list), ensure_ascii=False)

                conn.execute(
                    """
                    INSERT INTO fact_vbpl_documents (
                        doc_key, ssot_file_name, original_name, sha256, source_system, source_type,
                        ocr_applied, total_pages, doc_type_code, issuer_code, doc_number, issue_year,
                        domain_code, title, issue_date, effective_date, effect_status, is_amended,
                        chapter_count, article_count, clause_count, has_full_structure, naming_valid,
                        dq_score, dq_completeness, dq_validity, dq_uniqueness, dq_timeliness,
                        dq_issues_json, ingested_at, processed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        row["doc_key"],
                        row["ssot_file_name"],
                        row["original_name"],
                        row["sha256"],
                        row["source_system"],
                        row["source_type"],
                        1 if row.get("ocr_applied") else 0,
                        int(row.get("total_pages") or 1),
                        row["doc_type_code"],
                        row["issuer_code"],
                        row["doc_number"],
                        issue_year,
                        row["domain_code"],
                        row["title"],
                        row.get("issue_date") or "",
                        row.get("effective_date") or "",
                        row.get("effect_status") or "ACTIVE",
                        1 if row.get("is_amended") else 0,
                        int(row.get("chapter_count") or 1),
                        int(row.get("article_count") or 0),
                        int(row.get("clause_count") or 0),
                        1 if row.get("has_full_structure") else 0,
                        1 if row.get("naming_valid") else 0,
                        int(row.get("dq_score") or 0),
                        int(row.get("dq_completeness") or 0),
                        int(row.get("dq_validity") or 0),
                        int(row.get("dq_uniqueness") or 0),
                        int(row.get("dq_timeliness") or 0),
                        issues_json,
                        row.get("ingested_at") or utc_now_iso(),
                        row.get("processed_at") or utc_now_iso(),
                    ),
                )

                for g in row.get("linked_gates") or []:
                    g_clean = str(g).strip().upper()
                    if g_clean:
                        conn.execute(
                            "INSERT OR IGNORE INTO bridge_doc_gate (doc_key, gate_code) VALUES (?, ?)",
                            (row["doc_key"], g_clean),
                        )
                for p in row.get("project_axes") or []:
                    p_clean = str(p).strip().upper()
                    if p_clean:
                        conn.execute(
                            "INSERT OR IGNORE INTO bridge_doc_project (doc_key, project_axis_code) VALUES (?, ?)",
                            (row["doc_key"], p_clean),
                        )
                for t in row.get("tags") or []:
                    t_clean = str(t).strip()
                    if t_clean:
                        conn.execute(
                            "INSERT OR IGNORE INTO bridge_doc_tags (doc_key, tag_label) VALUES (?, ?)",
                            (row["doc_key"], t_clean),
                        )

            clause_rows = clauses_df.to_dict(orient="records") if not clauses_df.empty else []
            for cl in clause_rows:
                conn.execute(
                    """
                    INSERT INTO fact_vbpl_clauses (
                        clause_key, doc_key, ssot_file_name, order_index, node_level,
                        chapter_title, article_number, clause_index, point_index,
                        title, content_text, clause_count, word_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        cl["clause_key"],
                        cl["doc_key"],
                        cl["ssot_file_name"],
                        int(cl.get("order_index") or 0),
                        cl["node_level"],
                        cl.get("chapter_title") or "",
                        cl.get("article_number") or "",
                        cl.get("clause_index") or "",
                        cl.get("point_index") or "",
                        cl.get("title") or "",
                        cl.get("content_text") or "",
                        int(cl.get("clause_count") or 0),
                        int(cl.get("word_count") or 0),
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO fts_vbpl_clauses (
                        clause_key, doc_key, ssot_file_name, article_number, title, content_text
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        cl["clause_key"],
                        cl["doc_key"],
                        cl["ssot_file_name"],
                        cl.get("article_number") or "",
                        cl.get("title") or "",
                        cl.get("content_text") or "",
                    ),
                )

            rel_rows = relations_df.to_dict(orient="records") if not relations_df.empty else []
            for rel in rel_rows:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO fact_vbpl_relations (
                        relation_key, source_doc_key, source_ssot_name, relation_type,
                        target_ref_raw, target_doc_number, target_year, evidence_snippet
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rel["relation_key"],
                        rel["source_doc_key"],
                        rel["source_ssot_name"],
                        rel["relation_type"],
                        rel["target_ref_raw"],
                        rel["target_doc_number"],
                        int(rel["target_year"]) if pd.notna(rel.get("target_year")) else None,
                        rel.get("evidence_snippet") or "",
                    ),
                )

            conn.execute(
                """
                INSERT OR REPLACE INTO fact_dq_runs (
                    run_id, started_at, finished_at, bronze_records,
                    silver_docs, silver_clauses, silver_relations, avg_dq_score, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_meta["run_id"],
                    run_meta["started_at"],
                    run_meta["finished_at"],
                    int(run_meta.get("bronze_records") or 0),
                    len(doc_rows),
                    len(clause_rows),
                    len(rel_rows),
                    float(run_meta.get("avg_dq_score") or 0.0),
                    run_meta.get("status") or "SUCCESS",
                ),
            )

        return {
            "documents": len(doc_rows),
            "clauses": len(clause_rows),
            "relations": len(rel_rows),
        }

    def query_rows(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

    def search_clauses_fts(self, query: str, limit: int = 30) -> List[Dict[str, Any]]:
        """Tìm kiếm toàn văn FTS5 trên toàn bộ Điều/Khoản/Điểm."""
        q = (query or "").strip()
        if not q:
            return []
        # Làm sạch ký tự đặc biệt FTS5 để tránh syntax error
        tokens = [t for t in q.replace('"', " ").split() if t]
        fts_expr = " ".join(f'"{t}"' for t in tokens)
        with self._connect() as conn:
            cur = conn.execute(
                """
                SELECT
                    f.clause_key,
                    f.doc_key,
                    f.ssot_file_name,
                    f.article_number,
                    f.title,
                    snippet(fts_vbpl_clauses, 5, '【', '】', ' … ', 28) AS snippet,
                    c.node_level,
                    c.chapter_title,
                    d.doc_type_code,
                    d.issuer_code,
                    d.domain_code,
                    d.issue_year,
                    d.effect_status
                FROM fts_vbpl_clauses f
                JOIN fact_vbpl_clauses c ON c.clause_key = f.clause_key
                JOIN fact_vbpl_documents d ON d.doc_key = f.doc_key
                WHERE fts_vbpl_clauses MATCH ?
                ORDER BY bm25(fts_vbpl_clauses)
                LIMIT ?
                """,
                (fts_expr, max(1, min(100, int(limit)))),
            )
            return [dict(r) for r in cur.fetchall()]

    def upsert_personal_note(
        self,
        doc_key: str,
        clause_key: str,
        note_text: str,
        author: str = "Single User (CĐT)",
    ) -> Dict[str, Any]:
        note_id = f"NOTE-{doc_key}-{clause_key}"
        now = utc_now_iso()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO fact_personal_notes (note_id, doc_key, clause_key, note_text, author, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(note_id) DO UPDATE SET
                    note_text = excluded.note_text,
                    author = excluded.author,
                    updated_at = excluded.updated_at
                """,
                (note_id, doc_key, clause_key, note_text.strip(), author, now),
            )
        return {
            "note_id": note_id,
            "doc_key": doc_key,
            "clause_key": clause_key,
            "note_text": note_text.strip(),
            "author": author,
            "updated_at": now,
        }

    def list_personal_notes(self, doc_key: Optional[str] = None) -> List[Dict[str, Any]]:
        if doc_key:
            return self.query_rows(
                "SELECT * FROM fact_personal_notes WHERE doc_key = ? ORDER BY updated_at DESC",
                (doc_key,),
            )
        return self.query_rows(
            "SELECT * FROM fact_personal_notes ORDER BY updated_at DESC"
        )

    def get_table_counts(self) -> Dict[str, int]:
        tables = [
            "dim_doc_type",
            "dim_issuer",
            "dim_domain",
            "dim_stage_gate",
            "dim_project_axis",
            "dim_time",
            "fact_vbpl_documents",
            "fact_vbpl_clauses",
            "bridge_doc_gate",
            "bridge_doc_project",
            "bridge_doc_tags",
            "fact_vbpl_relations",
            "fact_dq_runs",
            "fact_personal_notes",
        ]
        counts: Dict[str, int] = {}
        with self._connect() as conn:
            for t in tables:
                row = conn.execute(f"SELECT COUNT(*) AS cnt FROM {t}").fetchone()
                counts[t] = int(row["cnt"]) if row else 0
        return counts

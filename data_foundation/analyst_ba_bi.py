"""
Tầng 4 (DATA ANALYST), Tầng 5 (BA — Semantic Layer & KPIs) và Tầng 6 (BI — Dashboard Payload & Excel Export)
cho phân hệ Quản lý Văn bản Pháp luật (Single-User Local-First).
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .lake_pipeline import VbplDataLakePipeline


class VbplAnalystBaBiEngine:
    """Động cơ Phân tích dữ liệu (Analyst) -> Quy tắc nghiệp vụ (BA) -> Báo cáo điều hành (BI)."""

    def __init__(self, pipeline: VbplDataLakePipeline):
        self.pipeline = pipeline
        self.wh = pipeline.warehouse

    # ------------------------------------------------------------------
    # TRẠNG THÁI 6 TẦNG DATA FOUNDATION (LAKE + WAREHOUSE HEALTH)
    # ------------------------------------------------------------------
    def get_lake_status(self) -> Dict[str, Any]:
        bronze_files = list(self.pipeline.bronze_payloads_dir.glob("*.jsonl"))
        silver_files = list(self.pipeline.silver_dir.glob("*.parquet"))
        gold_files = list(self.pipeline.gold_dir.glob("*.parquet"))
        wh_file = self.wh.db_path
        counts = self.wh.get_table_counts()
        last_runs = self.wh.query_rows(
            "SELECT * FROM fact_dq_runs ORDER BY finished_at DESC LIMIT 5"
        )

        return {
            "status": "READY",
            "mode": "SINGLE_USER_LOCAL_FIRST",
            "data_lake_root": str(self.pipeline.root),
            "storage_layers": {
                "bronze": {
                    "path": str(self.pipeline.bronze_dir),
                    "batch_files": len(bronze_files),
                    "size_kb": round(
                        sum(f.stat().st_size for f in bronze_files) / 1024.0, 2
                    ),
                },
                "silver": {
                    "path": str(self.pipeline.silver_dir),
                    "parquet_files": [f.name for f in silver_files],
                    "size_kb": round(
                        sum(f.stat().st_size for f in silver_files) / 1024.0, 2
                    ),
                },
                "gold": {
                    "path": str(self.pipeline.gold_dir),
                    "parquet_files": [f.name for f in gold_files],
                    "size_kb": round(
                        sum(f.stat().st_size for f in gold_files) / 1024.0, 2
                    ),
                },
                "warehouse_sqlite": {
                    "path": str(wh_file),
                    "size_kb": round(wh_file.stat().st_size / 1024.0, 2)
                    if wh_file.exists()
                    else 0.0,
                    "table_counts": counts,
                },
            },
            "last_etl_run": last_runs[0] if last_runs else None,
            "recent_etl_runs": last_runs,
        }

    # ------------------------------------------------------------------
    # TẦNG 4: DATA ANALYST — BÁO CÁO DATA QUALITY & GAP ANALYSIS
    # ------------------------------------------------------------------
    def get_dq_report(self) -> Dict[str, Any]:
        docs = self.wh.query_rows("SELECT * FROM fact_vbpl_documents ORDER BY dq_score ASC")
        if not docs:
            return {
                "total_documents": 0,
                "avg_dq_score": 0.0,
                "pillars": {
                    "completeness_30": 0.0,
                    "validity_30": 0.0,
                    "uniqueness_20": 0.0,
                    "timeliness_20": 0.0,
                },
                "issue_frequency": [],
                "documents_with_issues": [],
            }

        total = len(docs)
        avg_score = round(sum(d["dq_score"] for d in docs) / total, 1)
        avg_comp = round(sum(d["dq_completeness"] for d in docs) / total, 1)
        avg_val = round(sum(d["dq_validity"] for d in docs) / total, 1)
        avg_uniq = round(sum(d["dq_uniqueness"] for d in docs) / total, 1)
        avg_time = round(sum(d["dq_timeliness"] for d in docs) / total, 1)

        issue_counter: Dict[str, int] = {}
        flagged_docs: List[Dict[str, Any]] = []
        for d in docs:
            try:
                issues = json.loads(d.get("dq_issues_json") or "[]")
            except Exception:
                issues = []
            for iss in issues:
                issue_counter[iss] = issue_counter.get(iss, 0) + 1
            if issues:
                flagged_docs.append(
                    {
                        "doc_key": d["doc_key"],
                        "ssot_file_name": d["ssot_file_name"],
                        "doc_type_code": d["doc_type_code"],
                        "issuer_code": d["issuer_code"],
                        "domain_code": d["domain_code"],
                        "issue_year": d["issue_year"],
                        "dq_score": d["dq_score"],
                        "issues": issues,
                    }
                )

        issue_freq = [
            {"issue": k, "count": v}
            for k, v in sorted(issue_counter.items(), key=lambda kv: kv[1], reverse=True)
        ]

        return {
            "total_documents": total,
            "avg_dq_score": avg_score,
            "pillars": {
                "completeness_30": avg_comp,
                "validity_30": avg_val,
                "uniqueness_20": avg_uniq,
                "timeliness_20": avg_time,
            },
            "issue_frequency": issue_freq,
            "documents_with_issues": flagged_docs[:50],
        }

    # ------------------------------------------------------------------
    # TẦNG 5 & 6: BA SEMANTIC LAYER + BI OVERVIEW PAYLOAD
    # ------------------------------------------------------------------
    def get_bi_overview(self) -> Dict[str, Any]:
        status_info = self.get_lake_status()
        dq_report = self.get_dq_report()

        docs = self.wh.query_rows("SELECT * FROM fact_vbpl_documents")
        total_docs = len(docs)
        total_articles = sum(int(d.get("article_count") or 0) for d in docs)
        total_clauses = sum(int(d.get("clause_count") or 0) for d in docs)

        naming_valid_cnt = sum(1 for d in docs if int(d.get("naming_valid") or 0) == 1)
        structured_cnt = sum(1 for d in docs if int(d.get("has_full_structure") or 0) == 1)
        active_cnt = sum(1 for d in docs if d.get("effect_status") == "ACTIVE")
        ocr_cnt = sum(1 for d in docs if int(d.get("ocr_applied") or 0) == 1)

        by_domain = self.wh.query_rows("SELECT * FROM vw_bi_domain_summary")
        by_doc_type = self.wh.query_rows("SELECT * FROM vw_bi_doc_type_distribution")
        by_year = self.wh.query_rows("SELECT * FROM vw_bi_yearly_trend")
        gate_coverage = self.wh.query_rows("SELECT * FROM vw_bi_gate_coverage")
        relation_alerts = self.wh.query_rows("SELECT * FROM vw_bi_relation_alerts LIMIT 50")

        by_issuer = self.wh.query_rows(
            """
            SELECT
                d.issuer_code,
                COALESCE(i.issuer_name, d.issuer_code) AS issuer_name,
                COUNT(*) AS doc_count,
                ROUND(AVG(d.dq_score), 1) AS avg_dq_score
            FROM fact_vbpl_documents d
            LEFT JOIN dim_issuer i ON i.issuer_code = d.issuer_code
            GROUP BY d.issuer_code, i.issuer_name
            ORDER BY doc_count DESC
            """
        )

        project_axis_coverage = self.wh.query_rows(
            """
            SELECT
                p.project_axis_code,
                p.project_axis_name,
                COUNT(DISTINCT bp.doc_key) AS doc_count
            FROM dim_project_axis p
            LEFT JOIN bridge_doc_project bp ON bp.project_axis_code = p.project_axis_code
            GROUP BY p.project_axis_code, p.project_axis_name
            ORDER BY doc_count DESC
            """
        )

        # Tầng 5: BA Semantic KPI Dictionary (6 KPI chuẩn pháp lý Chủ đầu tư)
        naming_rate = round((naming_valid_cnt / total_docs) * 100, 1) if total_docs else 0.0
        structure_rate = round((structured_cnt / total_docs) * 100, 1) if total_docs else 0.0
        freshness_rate = round((active_cnt / total_docs) * 100, 1) if total_docs else 0.0

        covered_gates = sum(1 for g in gate_coverage if int(g.get("active_doc_count") or 0) > 0)
        total_gates = max(1, len(gate_coverage))
        gate_readiness = round((covered_gates / total_gates) * 100, 1)

        high_rel_alerts = sum(
            1
            for r in relation_alerts
            if r.get("relation_type") in ("REPEALS", "REPLACES", "AMENDS")
        )
        avg_dq = dq_report["avg_dq_score"]

        def kpi_status(val: float, target: float, warn: float, higher_is_better: bool = True) -> str:
            if higher_is_better:
                if val >= target:
                    return "PASS"
                if val >= warn:
                    return "WARN"
                return "RISK"
            if val <= target:
                return "PASS"
            if val <= warn:
                return "WARN"
            return "RISK"

        ba_kpis = [
            {
                "id": "KPI_SSOT_NAMING",
                "name": "Tỷ lệ Chuẩn hóa tên SSOT",
                "value": naming_rate,
                "unit": "%",
                "target": 95,
                "status": kpi_status(naming_rate, 95, 80),
                "formula": "Số VB đạt [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu] / Tổng VB",
            },
            {
                "id": "KPI_FULL_STRUCTURE",
                "name": "Độ phủ Cấu trúc NĐ 30 (Điều/Khoản)",
                "value": structure_rate,
                "unit": "%",
                "target": 90,
                "status": kpi_status(structure_rate, 90, 70),
                "formula": "Số VB đã bóc tách Điều/Khoản đầy đủ / Tổng VB",
            },
            {
                "id": "KPI_LEGAL_FRESHNESS",
                "name": "Chỉ số Hiệu lực 2026",
                "value": freshness_rate,
                "unit": "%",
                "target": 85,
                "status": kpi_status(freshness_rate, 85, 65),
                "formula": "Số VB đang còn hiệu lực (ACTIVE) / Tổng VB",
            },
            {
                "id": "KPI_GATE_READINESS",
                "name": "Độ phủ Pháp lý Stage-Gate G0–G16",
                "value": gate_readiness,
                "unit": "%",
                "target": 88,
                "status": kpi_status(gate_readiness, 88, 65),
                "formula": f"Số cổng có VB hiệu lực ({covered_gates}/{total_gates} Gate)",
            },
            {
                "id": "KPI_DQ_COMPOSITE",
                "name": "Điểm Sức khỏe Dữ liệu (DQ Score)",
                "value": avg_dq,
                "unit": "/100",
                "target": 85,
                "status": kpi_status(avg_dq, 85, 70),
                "formula": "Completeness(30) + Validity(30) + Uniqueness(20) + Timeliness(20)",
            },
            {
                "id": "KPI_CONFLICT_ALERTS",
                "name": "Cảnh báo Sửa đổi / Thay thế / Bãi bỏ",
                "value": high_rel_alerts,
                "unit": "liên kết",
                "target": 0,
                "status": kpi_status(float(high_rel_alerts), 0, 3, higher_is_better=False),
                "formula": "Số tham chiếu REPLACES / REPEALS / AMENDS cần soát xét",
            },
        ]

        # Sinh BA Actionable Insights tự động
        ba_insights: List[Dict[str, str]] = []
        missing_gates = [g["gate_code"] for g in gate_coverage if int(g.get("active_doc_count") or 0) == 0]
        if missing_gates:
            ba_insights.append(
                {
                    "priority": "P0" if len(missing_gates) >= 4 else "P1",
                    "layer": "BA · Stage-Gate Gap",
                    "title": f"Phát hiện {len(missing_gates)} cổng Stage-Gate chưa có VBPL hiệu lực dẫn chiếu",
                    "action": f"Bổ sung hoặc gắn Smart Tag Stage-Gate cho các cổng: {', '.join(missing_gates[:8])}.",
                }
            )
        bad_names = total_docs - naming_valid_cnt
        if bad_names > 0:
            ba_insights.append(
                {
                    "priority": "P0",
                    "layer": "DATA · SSOT Naming",
                    "title": f"{bad_names}/{total_docs} văn bản chưa đúng công thức tên chuẩn VBPL",
                    "action": "Mở Bước 1 -> Chạy chuẩn hóa hàng loạt về khuôn [SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếu].",
                }
            )
        unstructured = total_docs - structured_cnt
        if unstructured > 0:
            ba_insights.append(
                {
                    "priority": "P1",
                    "layer": "LAKE · Silver Parsing",
                    "title": f"{unstructured} văn bản chưa có full-text Điều/Khoản (file vỏ hoặc PDF scan)",
                    "action": "Nạp file gốc PDF/DOCX qua Local Scanner (:8008) để LegalDocumentParser tự động OCR 250 DPI và tách Điều/Khoản.",
                }
            )
        if high_rel_alerts > 0:
            ba_insights.append(
                {
                    "priority": "P1",
                    "layer": "ANALYST · Legal Lineage",
                    "title": f"Phát hiện {high_rel_alerts} liên kết Thay thế / Sửa đổi / Bãi bỏ trong nội dung văn bản",
                    "action": "Rà soát bảng Radar Hiệu lực bên dưới để tránh trích dẫn điều khoản cũ gây rủi ro xuất toán.",
                }
            )
        if not ba_insights and total_docs > 0:
            ba_insights.append(
                {
                    "priority": "P2",
                    "layer": "BI · Health OK",
                    "title": "Kho dữ liệu VBPL đạt chuẩn SSOT & Data Quality cao",
                    "action": "Sẵn sàng xuất báo cáo Excel BI hoặc mở rộng kiến trúc mẫu này sang phân hệ Hợp đồng / Thanh toán IPC.",
                }
            )

        return {
            "generated_at": datetime.now().isoformat(),
            "architecture_layers": [
                {
                    "step": 1,
                    "code": "DATA",
                    "label": "Data Ingestion & Contracts",
                    "metric": f"{status_info['storage_layers']['bronze']['batch_files']} batch · {total_docs} VB",
                    "status": "ACTIVE" if total_docs > 0 else "IDLE",
                },
                {
                    "step": 2,
                    "code": "DATA_LAKE",
                    "label": "Medallion Lake (Bronze/Silver/Gold Parquet)",
                    "metric": f"{len(status_info['storage_layers']['silver']['parquet_files'])} Silver · {len(status_info['storage_layers']['gold']['parquet_files'])} Gold",
                    "status": "ACTIVE" if status_info["storage_layers"]["gold"]["parquet_files"] else "IDLE",
                },
                {
                    "step": 3,
                    "code": "MODEL_DATA",
                    "label": "Star Schema (SQLite WAL + FTS5)",
                    "metric": f"6 Dim · {total_docs} Fact VB · {status_info['storage_layers']['warehouse_sqlite']['table_counts'].get('fact_vbpl_clauses', 0)} Điều/Khoản",
                    "status": "ACTIVE" if total_docs > 0 else "IDLE",
                },
                {
                    "step": 4,
                    "code": "DATA_ANALYST",
                    "label": "DQ Profiler & SQL Analytical Views",
                    "metric": f"DQ {avg_dq}/100 · 6 SQL Views",
                    "status": "ACTIVE" if total_docs > 0 else "IDLE",
                },
                {
                    "step": 5,
                    "code": "BA",
                    "label": "Semantic KPI Dictionary & Rules",
                    "metric": f"6 KPI · {len(ba_insights)} Khuyến nghị",
                    "status": "ACTIVE",
                },
                {
                    "step": 6,
                    "code": "BI",
                    "label": "Executive Dashboard & Excel Export",
                    "metric": f"{total_articles} Điều · {total_clauses} Khoản/Điểm",
                    "status": "ACTIVE",
                },
            ],
            "summary": {
                "total_documents": total_docs,
                "total_articles": total_articles,
                "total_clauses": total_clauses,
                "ocr_documents": ocr_cnt,
                "personal_notes": status_info["storage_layers"]["warehouse_sqlite"]["table_counts"].get(
                    "fact_personal_notes", 0
                ),
            },
            "lake_status": status_info,
            "ba_kpis": ba_kpis,
            "ba_insights": ba_insights,
            "dq_report": dq_report,
            "charts": {
                "by_domain": by_domain,
                "by_doc_type": by_doc_type,
                "by_issuer": by_issuer,
                "by_year": by_year,
                "gate_coverage": gate_coverage,
                "project_axis_coverage": project_axis_coverage,
            },
            "relation_radar": relation_alerts,
        }

    # ------------------------------------------------------------------
    # TẦNG 6: XUẤT BÁO CÁO EXCEL BI MULTI-SHEET (.XLSX)
    # ------------------------------------------------------------------
    def export_bi_excel(self, output_path: Optional[Path] = None) -> Path:
        overview = self.get_bi_overview()
        if output_path is None:
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = self.pipeline.exports_dir / f"VBPL_DataFoundation_BI_{stamp}.xlsx"

        wb = Workbook()
        header_fill = PatternFill(start_color="163D5C", end_color="163D5C", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        def style_sheet(ws, headers: List[str], rows: List[List[Any]]) -> None:
            ws.append(headers)
            for col_idx in range(1, len(headers) + 1):
                cell = ws.cell(row=1, column=col_idx)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                cell.border = thin_border
            for r_vals in rows:
                ws.append(r_vals)
            for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=len(headers)):
                for c in row:
                    c.border = thin_border
                    c.alignment = Alignment(vertical="top", wrap_text=True)
            for col_idx in range(1, len(headers) + 1):
                col_letter = get_column_letter(col_idx)
                max_len = max(
                    len(str(ws.cell(row=r, column=col_idx).value or ""))
                    for r in range(1, min(ws.max_row + 1, 60))
                )
                ws.column_dimensions[col_letter].width = min(max(max_len + 4, 12), 52)
            ws.freeze_panes = "A2"

        # Sheet 1: Executive BI KPIs
        ws1 = wb.active
        ws1.title = "01_Executive_BI"
        style_sheet(
            ws1,
            ["Mã KPI", "Tên Chỉ số (BA Semantic Layer)", "Giá trị", "Đơn vị", "Mục tiêu", "Trạng thái", "Công thức"],
            [
                [k["id"], k["name"], k["value"], k["unit"], k["target"], k["status"], k["formula"]]
                for k in overview["ba_kpis"]
            ],
        )

        # Sheet 2: Gate Coverage G0-G16
        ws2 = wb.create_sheet("02_Gate_Coverage")
        style_sheet(
            ws2,
            ["Gate", "Giai đoạn", "Tên Cổng kiểm soát", "Tổng VB", "VB Hiệu lực", "VB Full-Text"],
            [
                [
                    g["gate_code"],
                    g["phase_code"],
                    g["gate_name"],
                    g["doc_count"],
                    g["active_doc_count"],
                    g["structured_doc_count"],
                ]
                for g in overview["charts"]["gate_coverage"]
            ],
        )

        # Sheet 3: Data Quality Audit
        ws3 = wb.create_sheet("03_DQ_Audit")
        style_sheet(
            ws3,
            ["Mã VB", "Tên file SSOT", "Loại", "Cơ quan", "Lĩnh vực", "Năm", "Điểm DQ", "Chi tiết lỗi DQ"],
            [
                [
                    d["doc_key"],
                    d["ssot_file_name"],
                    d["doc_type_code"],
                    d["issuer_code"],
                    d["domain_code"],
                    d["issue_year"],
                    d["dq_score"],
                    " | ".join(d["issues"]),
                ]
                for d in overview["dq_report"]["documents_with_issues"]
            ],
        )

        # Sheet 4: Fact VBPL Documents
        ws4 = wb.create_sheet("04_Fact_VBPL")
        all_docs = self.wh.query_rows("SELECT * FROM fact_vbpl_documents ORDER BY issue_year DESC, ssot_file_name")
        style_sheet(
            ws4,
            ["Doc Key", "Tên file chuẩn SSOT", "Loại", "Cơ quan", "Lĩnh vực", "Năm", "Hiệu lực", "Số Chương", "Số Điều", "Số Khoản", "DQ Score", "Tên chuẩn?"],
            [
                [
                    d["doc_key"],
                    d["ssot_file_name"],
                    d["doc_type_code"],
                    d["issuer_code"],
                    d["domain_code"],
                    d["issue_year"],
                    d["effect_status"],
                    d["chapter_count"],
                    d["article_count"],
                    d["clause_count"],
                    d["dq_score"],
                    "YES" if d["naming_valid"] else "NO",
                ]
                for d in all_docs
            ],
        )

        # Sheet 5: Legal Relations Radar
        ws5 = wb.create_sheet("05_Relations_Radar")
        style_sheet(
            ws5,
            ["Mã Quan hệ", "VB Nguồn", "Loại Quan hệ", "Số hiệu VB Đích", "Năm Đích", "Đoạn trích chứng cứ"],
            [
                [
                    r["relation_key"],
                    r["source_ssot_name"],
                    r["relation_type"],
                    r["target_ref_raw"],
                    r["target_year"] or "",
                    r["evidence_snippet"],
                ]
                for r in overview["relation_radar"]
            ],
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        wb.save(str(output_path))
        return output_path

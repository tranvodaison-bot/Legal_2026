"""
Kiểm thử toàn trình 6 tầng nền tảng VBPL Data Foundation (Single-User Local-First):
Data -> Data Lake (Bronze JSONL / Silver Parquet / Gold Parquet) -> Model Data (SQLite Star Schema + FTS5)
-> Data Analyst (DQ Profiler + SQL Views) -> BA (6 KPIs + Insights) -> BI (FastAPI + Excel .xlsx).
"""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

import docx
import fitz
import pandas as pd
from fastapi import FastAPI
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from data_foundation.analyst_ba_bi import VbplAnalystBaBiEngine
from data_foundation.lake_pipeline import VbplDataLakePipeline
from data_foundation.router import create_data_foundation_router


class TestVbplDataFoundation6Layers(unittest.TestCase):
    def test_full_six_layer_pipeline_and_api(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            lake_root = Path(tmp_dir) / "vbpl_lake"
            docs_dir = Path(tmp_dir) / "input_docs"
            docs_dir.mkdir(parents=True, exist_ok=True)

            # 1. Tạo dữ liệu thật (.docx và .pdf) để kiểm tra Ingestion -> Bronze
            docx_path = docs_dir / "135-2025_LUAT-QH15_HDXD_LuatXayDung.docx"
            d = docx.Document()
            d.add_paragraph("QUỐC HỘI")
            d.add_paragraph("Số: 135/2025/QH15")
            d.add_paragraph("Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam;")
            d.add_paragraph("Chương I. NHỮNG QUY ĐỊNH CHUNG")
            d.add_paragraph("Điều 1. Phạm vi điều chỉnh")
            d.add_paragraph("1. Luật này thay thế Luật số 50/2014/QH13 về hoạt động xây dựng.")
            d.add_paragraph("a) Áp dụng cho dự án khu công nghiệp và hạ tầng kỹ thuật;")
            d.save(str(docx_path))

            pdf_path = docs_dir / "Nghi dinh 207-2026-ND-CP quan ly chat luong.pdf"
            pdf = fitz.open()
            page = pdf.new_page()
            page.insert_text(
                (50, 50),
                "\n".join(
                    [
                        "CHÍNH PHỦ",
                        "Số: 207/2026/NĐ-CP",
                        "- 1 -",
                        "NGHỊ ĐỊNH",
                        "Quy định chi tiết Luật số 135/2025/QH15 về quản lý chất lượng",
                        "Chương I. QUY ĐỊNH CHUNG",
                        "Điều 1. Nghiệm thu công trình xây dựng",
                        "1. Bãi bỏ Nghị định số 06/2021/NĐ-CP và quy định rõ thí nghiệm LAS-XD.",
                        "Trang 1/2",
                    ]
                ),
                fontfile=r"C:\Windows\Fonts\arial.ttf",
                fontname="F0",
            )
            pdf.save(str(pdf_path))
            pdf.close()

            # 2. Chạy Tầng 1 + 2 + 3 qua Pipeline
            pipeline = VbplDataLakePipeline(root_dir=str(lake_root))
            ingest_res = pipeline.ingest_raw_records(
                [
                    {
                        "id": "VB-135",
                        "ssot_file_name": "135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf",
                        "original_name": "135-2025_LUAT-QH15_HDXD_LuatXayDung.docx",
                        "doc_type": "LUAT",
                        "issuer_code": "QH15",
                        "doc_number": "135",
                        "issue_year": 2025,
                        "primary_domain": "HDXD",
                        "title": "Luật Xây dựng năm 2025",
                        "issue_date": "10/12/2025",
                        "effective_date": "01/07/2026",
                        "effect_status": "Còn hiệu lực năm 2026",
                        "project_axes": ["KCN", "HTKT", "DAN_DUNG"],
                        "linked_gates": ["G0", "G5", "G8", "G12"],
                        "tags": ["Ngành: XD", "Gate G12"],
                        "raw_text": (
                            "QUỐC HỘI\nSố: 135/2025/QH15\n"
                            "Chương I. QUY ĐỊNH CHUNG\n"
                            "Điều 1. Phạm vi điều chỉnh\n"
                            "1. Luật này thay thế Luật số 50/2014/QH13 về hoạt động xây dựng.\n"
                            "a) Quản lý dự án đầu tư xây dựng và chuyển đổi số BIM."
                        ),
                    },
                    {
                        "id": "VB-207",
                        "ssot_file_name": "207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf",
                        "original_name": "Nghi dinh 207-2026.pdf",
                        "doc_type": "ND",
                        "issuer_code": "CP",
                        "doc_number": "207",
                        "issue_year": 2026,
                        "primary_domain": "QLCL",
                        "title": "Nghị định quy định chi tiết quản lý chất lượng công trình",
                        "issue_date": "18/05/2026",
                        "effective_date": "01/07/2026",
                        "effect_status": "Còn hiệu lực năm 2026",
                        "project_axes": ["KCN", "HTKT"],
                        "linked_gates": ["G12", "G14", "G15"],
                        "tags": ["QLCL", "LAS-XD"],
                        "raw_text": (
                            "CHÍNH PHỦ\nSố: 207/2026/NĐ-CP\n"
                            "Chương I. QUY ĐỊNH CHUNG\n"
                            "Điều 1. Nghiệm thu chất lượng\n"
                            "1. Bãi bỏ Nghị định số 06/2021/NĐ-CP và quy định chi tiết Luật số 135/2025/QH15.\n"
                            "2. Yêu cầu đầy đủ phiếu thí nghiệm LAS-XD trước khi nghiệm thu."
                        ),
                    },
                ],
                source_system="UNIT_TEST",
            )
            self.assertEqual(ingest_res["ingested_records"], 2)

            etl_res = pipeline.run_medallion_etl()
            self.assertEqual(etl_res["status"], "SUCCESS")
            self.assertEqual(etl_res["silver"]["documents"], 2)
            self.assertGreaterEqual(etl_res["silver"]["clauses"], 4)
            self.assertGreaterEqual(etl_res["silver"]["relations"], 2)

            # Xác minh tệp Silver & Gold Parquet đọc được bằng PyArrow/Pandas
            silver_docs_df = pd.read_parquet(lake_root / "02_silver" / "vbpl_documents.parquet")
            gold_portfolio_df = pd.read_parquet(lake_root / "03_gold" / "mart_vbpl_portfolio.parquet")
            gold_cov_df = pd.read_parquet(lake_root / "03_gold" / "mart_vbpl_coverage_matrix.parquet")
            self.assertEqual(len(silver_docs_df), 2)
            self.assertGreaterEqual(len(gold_portfolio_df), 2)
            self.assertGreaterEqual(len(gold_cov_df), 4)

            # 3. Kiểm tra Tầng 3: SQLite Star Schema + FTS5 Search + Personal Notes
            fts_hits = pipeline.warehouse.search_clauses_fts("LAS-XD")
            self.assertEqual(len(fts_hits), 1)
            self.assertIn("207-2026_ND-CP_QLCL", fts_hits[0]["ssot_file_name"])

            saved_note = pipeline.warehouse.upsert_personal_note(
                doc_key=fts_hits[0]["doc_key"],
                clause_key=fts_hits[0]["clause_key"],
                note_text="Bắt buộc đính kèm phiếu LAS-XD tại Gate G12",
            )
            self.assertEqual(saved_note["doc_key"], fts_hits[0]["doc_key"])
            self.assertEqual(len(pipeline.warehouse.list_personal_notes()), 1)

            # 4. Kiểm tra Tầng 4, 5, 6: Analyst DQ + BA KPIs + BI Excel Export + FastAPI Router
            engine = VbplAnalystBaBiEngine(pipeline)
            overview = engine.get_bi_overview()
            self.assertEqual(len(overview["architecture_layers"]), 6)
            self.assertEqual(len(overview["ba_kpis"]), 6)
            self.assertEqual(overview["summary"]["total_documents"], 2)
            self.assertGreaterEqual(overview["dq_report"]["avg_dq_score"], 90.0)
            rel_types = {r["relation_type"] for r in overview["relation_radar"]}
            self.assertIn("REPLACES", rel_types)
            self.assertIn("REPEALS", rel_types)

            xlsx_path = engine.export_bi_excel()
            self.assertTrue(xlsx_path.exists())
            wb = load_workbook(str(xlsx_path))
            self.assertEqual(
                wb.sheetnames,
                [
                    "01_Executive_BI",
                    "02_Gate_Coverage",
                    "03_DQ_Audit",
                    "04_Fact_VBPL",
                    "05_Relations_Radar",
                ],
            )
            wb.close()

            # 5. Kiểm tra FastAPI Router endpoints
            test_app = FastAPI()
            test_app.include_router(create_data_foundation_router(root_dir=str(lake_root)))
            client = TestClient(test_app)

            r_status = client.get("/api/data-foundation/status")
            self.assertEqual(r_status.status_code, 200)
            self.assertEqual(r_status.json()["mode"], "SINGLE_USER_LOCAL_FIRST")

            r_bi = client.get("/api/data-foundation/bi/overview")
            self.assertEqual(r_bi.status_code, 200)
            self.assertEqual(r_bi.json()["summary"]["total_documents"], 2)

            r_search = client.get("/api/data-foundation/analyst/search", params={"q": "BIM"})
            self.assertEqual(r_search.status_code, 200)
            self.assertEqual(r_search.json()["total_hits"], 1)

            r_xlsx = client.get("/api/data-foundation/export/excel")
            self.assertEqual(r_xlsx.status_code, 200)
            self.assertIn("spreadsheetml", r_xlsx.headers.get("content-type", ""))


if __name__ == "__main__":
    unittest.main()

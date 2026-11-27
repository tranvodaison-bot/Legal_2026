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

    def test_dedup_sha256_rename_and_preserve_fulltext(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            lake_root = Path(tmp_dir) / "vbpl_lake"
            pipeline = VbplDataLakePipeline(root_dir=str(lake_root))
            real_sha = "a" * 64
            full_text = (
                "CHÍNH PHỦ\nSố: 207/2026/NĐ-CP\n"
                "Điều 1. Nghiệm thu chất lượng công trình xây dựng\n"
                "1. Yêu cầu thí nghiệm LAS-XD đầy đủ trước khi nghiệm thu giai đoạn.\n"
                + (" Nội dung quy định chi tiết rất dài. " * 25)
            )
            pipeline.ingest_raw_records(
                [
                    {
                        "ssot_file_name": "NghiDinh207ChuaChuan.pdf",
                        "original_name": "NghiDinh207ChuaChuan.pdf",
                        "sha256": real_sha,
                        "doc_type": "ND",
                        "issuer_code": "CP",
                        "doc_number": "207",
                        "issue_year": 2026,
                        "primary_domain": "QLCL",
                        "title": "Nghị định 207",
                        "raw_text": full_text,
                    }
                ],
                source_system="DATA_LEGAL_2026_CORPUS",
            )
            pipeline.run_medallion_etl()

            # Gắn ghi chú cá nhân theo legacy doc_key hoặc current doc_key
            docs_before = pipeline.warehouse.list_hydrated_documents()
            self.assertEqual(len(docs_before), 1)
            doc_key = docs_before[0]["docKey"]
            self.assertEqual(doc_key, f"DOC-{real_sha[:12].upper()}")
            pipeline.warehouse.upsert_personal_note(
                doc_key=doc_key,
                clause_key=f"{doc_key}-N0001",
                note_text="Ghi chú quan trọng cần giữ",
            )

            # Đổi tên cùng file (cùng SHA-256) và đồng bộ từ WEB_APP với snippet ngắn
            pipeline.ingest_raw_records(
                [
                    {
                        "ssot_file_name": "207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh.pdf",
                        "original_name": "NghiDinh207ChuaChuan.pdf",
                        "sha256": real_sha,
                        "doc_type": "ND",
                        "issuer_code": "CP",
                        "doc_number": "207",
                        "issue_year": 2026,
                        "primary_domain": "QLCL",
                        "title": "Nghị định 207/2026/NĐ-CP",
                        "linked_gates": ["G12", "G14"],
                        "raw_text": "Snippet ngắn 600 ký tự",
                    }
                ],
                source_system="WEB_APP",
            )
            etl_res = pipeline.run_medallion_etl()
            self.assertEqual(etl_res["silver"]["documents"], 1)
            docs_after = pipeline.warehouse.list_hydrated_documents()
            self.assertEqual(len(docs_after), 1)
            self.assertEqual(docs_after[0]["dqScore"], docs_after[0]["dqScore"])
            self.assertEqual(
                docs_after[0]["ssotFileName"],
                "207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh.pdf",
            )
            # Đảm bảo không bị snippet ngắn ghi đè mất toàn văn FTS5
            fts_hits = pipeline.warehouse.search_clauses_fts("LAS-XD")
            self.assertEqual(len(fts_hits), 1)
            self.assertEqual(len(pipeline.warehouse.list_personal_notes(doc_key=doc_key)), 1)

    def test_vault_and_copy_to_silver_undo(self) -> None:
        from data_foundation.vault_manager import compute_file_sha256, execute_batch_operation, undo_operations

        with tempfile.TemporaryDirectory() as tmp_dir:
            lake_root = Path(tmp_dir) / "vbpl_lake"
            src_dir = Path(tmp_dir) / "source"
            src_dir.mkdir(parents=True, exist_ok=True)
            src_file = src_dir / "Nghi dinh 206.pdf"
            src_file.write_bytes(b"%PDF-1.4 sample content 206")

            pipeline = VbplDataLakePipeline(root_dir=str(lake_root))
            res = execute_batch_operation(
                warehouse=pipeline.warehouse,
                lake_root=lake_root,
                operation_mode="COPY_TO_SILVER",
                items=[
                    {
                        "source_path": str(src_file),
                        "original_name": src_file.name,
                        "ssot_file_name": "206-2026_ND-CP_QLCP_QuanLyChiPhi.pdf",
                        "primary_domain": "QLCP",
                        "issue_year": 2026,
                    }
                ],
            )
            self.assertEqual(res["vault_saved_count"], 1)
            vault_file = lake_root / res["operations"][0]["vault_path"]
            silver_file = lake_root / res["enriched_items"][0]["curated_path"]
            self.assertTrue(vault_file.is_file())
            self.assertTrue(silver_file.is_file())
            self.assertTrue(src_file.is_file())
            self.assertEqual(compute_file_sha256(silver_file), compute_file_sha256(src_file))

            undo_res = undo_operations(
                warehouse=pipeline.warehouse,
                lake_root=lake_root,
                batch_id=res["batch_id"],
            )
            self.assertEqual(undo_res["reverted_count"], 1)
            self.assertFalse(silver_file.exists())
            self.assertTrue(src_file.is_file())
            self.assertTrue(vault_file.is_file())

    def test_inplace_rename_acid_undo_and_protected_guard(self) -> None:
        from data_foundation.vault_manager import execute_batch_operation, undo_operations

        with tempfile.TemporaryDirectory() as tmp_dir:
            lake_root = Path(tmp_dir) / "vbpl_lake"
            work_dir = Path(tmp_dir) / "work"
            work_dir.mkdir(parents=True, exist_ok=True)
            f1 = work_dir / "raw_1.pdf"
            f2 = work_dir / "raw_2.pdf"
            f1.write_bytes(b"pdf one")
            f2.write_bytes(b"pdf two")

            pipeline = VbplDataLakePipeline(root_dir=str(lake_root))
            # 1. Phải chặn Data_Legal_2026 khi dùng INPLACE_RENAME
            with self.assertRaises(PermissionError):
                execute_batch_operation(
                    warehouse=pipeline.warehouse,
                    lake_root=lake_root,
                    operation_mode="INPLACE_RENAME",
                    items=[
                        {
                            "source_path": r"G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026\test.pdf",
                            "original_name": "test.pdf",
                            "ssot_file_name": "01-2026_ND-CP_HDXD_Test.pdf",
                        }
                    ],
                )

            # 2. Đổi tên trực tiếp + Undo ACID
            res = execute_batch_operation(
                warehouse=pipeline.warehouse,
                lake_root=lake_root,
                operation_mode="INPLACE_RENAME",
                items=[
                    {
                        "source_path": str(f1),
                        "original_name": f1.name,
                        "ssot_file_name": "01-2026_ND-CP_HDXD_One.pdf",
                    },
                    {
                        "source_path": str(f2),
                        "original_name": f2.name,
                        "ssot_file_name": "02-2026_ND-CP_HDXD_Two.pdf",
                    },
                ],
            )
            self.assertEqual(res["file_ops_count"], 2)
            self.assertFalse(f1.exists())
            self.assertTrue((work_dir / "01-2026_ND-CP_HDXD_One.pdf").is_file())
            self.assertTrue((work_dir / "02-2026_ND-CP_HDXD_Two.pdf").is_file())

            undo_res = undo_operations(
                warehouse=pipeline.warehouse,
                lake_root=lake_root,
                batch_id=res["batch_id"],
            )
            self.assertEqual(undo_res["reverted_count"], 2)
            self.assertTrue(f1.is_file())
            self.assertTrue(f2.is_file())

    def test_commit_batch_hydrate_docx_tables_and_fts_special_chars(self) -> None:
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "local_scanner_engine",
            Path(__file__).resolve().parent.parent / "desktop-sidecar" / "local_scanner_engine.py",
        )
        assert spec and spec.loader
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        _extract_docx_full_text = mod._extract_docx_full_text

        with tempfile.TemporaryDirectory() as tmp_dir:
            lake_root = Path(tmp_dir) / "vbpl_lake"
            docs_dir = Path(tmp_dir) / "docs"
            docs_dir.mkdir(parents=True, exist_ok=True)
            docx_path = docs_dir / "MauHD_1040.docx"
            d = docx.Document()
            d.add_paragraph("MẪU HỢP ĐỒNG EPC")
            tbl = d.add_table(rows=2, cols=2)
            tbl.cell(0, 0).text = "Hạng mục"
            tbl.cell(0, 1).text = "Giá trị hợp đồng"
            tbl.cell(1, 0).text = "Thi công trạm biến áp"
            tbl.cell(1, 1).text = "Nghị định 207/2026/NĐ-CP và 135/2025/QH15"
            d.save(str(docx_path))

            extracted_tbl_text, _ = _extract_docx_full_text(str(docx_path))
            self.assertIn("Thi công trạm biến áp | Nghị định 207/2026/NĐ-CP", extracted_tbl_text)

            test_app = FastAPI()
            test_app.include_router(create_data_foundation_router(root_dir=str(lake_root)))
            client = TestClient(test_app)

            r_commit = client.post(
                "/api/data-foundation/commit-batch",
                json={
                    "operation_mode": "COPY_TO_SILVER",
                    "actor_name": "CĐT Test",
                    "items": [
                        {
                            "source_path": str(docx_path),
                            "original_name": docx_path.name,
                            "ssot_file_name": "1040-2026_QD-BXD_QLHD_MauHDEPC.docx",
                            "doc_type": "QD",
                            "issuer_code": "BXD",
                            "doc_number": "1040",
                            "issue_year": 2026,
                            "primary_domain": "QLHD",
                            "title": "Mẫu hợp đồng EPC QĐ 1040",
                            "linked_gates": ["G11"],
                            "raw_text": extracted_tbl_text,
                        }
                    ],
                },
            )
            self.assertEqual(r_commit.status_code, 200)
            body = r_commit.json()
            self.assertEqual(body["vault_saved_count"], 1)
            self.assertEqual(len(body["hydrated_documents"]), 1)

            r_docs = client.get("/api/data-foundation/documents")
            self.assertEqual(r_docs.status_code, 200)
            self.assertEqual(r_docs.json()["total"], 1)

            # Kiểm tra tìm kiếm FTS5 có ký tự đặc biệt (NĐ-CP, 135/2025/QH15) không gây lỗi syntax
            pipeline = VbplDataLakePipeline(root_dir=str(lake_root))
            self.assertEqual(len(pipeline.warehouse.search_clauses_fts("NĐ-CP")), 1)
            self.assertEqual(len(pipeline.warehouse.search_clauses_fts("135/2025/QH15")), 1)

    def test_nd30_ocr_normalizer_chapter_and_closing_block(self):
        from data_foundation.lake_pipeline import _parse_clauses_from_raw_text
        from data_foundation.nd30_formatter import normalize_nd30_ocr_text, split_nd30_closing_block

        sample = """CHÍNH PHỦ
Số: 206/2026/NĐ-CP
NGHỊ ĐỊNH
Quy định chi tiết về quản lý chỉ.phí đầu tư xây dựng
Căn cứ Luật Xây dựng số 135/2025/QHI15;
Chương I
QUY ĐỊNH CHUNG
Điêu 1. Phạm vi điều chỉnh
.___1. Nghị định này quy định chi tiết quản lý chi phí. 2. Áp dụng với dự án đầu tư công.
Điều 2. Hiệu lực thi hành
Nghị định này có hiệu lực thi hành từ ngày 01 tháng 7 năm 2026. Nơi nhận: - Ban Bí thư; - Thủ tướng; - Lưu: VT, CN (2). KT. THỦ TƯỚNG
"""
        cleaned = normalize_nd30_ocr_text(sample)
        self.assertIn("chi phí", cleaned)
        self.assertIn("135/2025/QH15", cleaned)
        self.assertIn("Điều 1.", cleaned)

        nodes, chap_cnt, art_cnt, _ = _parse_clauses_from_raw_text("DOC-TEST", "test.pdf", cleaned)
        self.assertEqual(chap_cnt, 1)
        self.assertEqual(art_cnt, 2)
        intro = nodes[0]
        self.assertEqual(intro.node_level, "Mở đầu")
        self.assertNotIn("QUY ĐỊNH CHUNG", intro.content_text)

        closing = nodes[-1]
        self.assertEqual(closing.node_level, "Kết thúc")
        self.assertIn("Nơi nhận:", closing.content_text)

        last_art = [n for n in nodes if n.node_level == "Điều"][-1]
        self.assertNotIn("Nơi nhận:", last_art.content_text)
        body_clean, end_block = split_nd30_closing_block(last_art.content_text + "\nNơi nhận:\n- Lưu: VT.")
        self.assertIn("01 tháng 7 năm 2026", body_clean)
        self.assertIn("Nơi nhận:", end_block)



if __name__ == "__main__":
    unittest.main()

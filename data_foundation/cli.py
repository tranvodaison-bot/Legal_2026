"""
CLI vận hành nhanh nền tảng VBPL Data Foundation cho 1 người sử dụng.
Ví dụ:
    python -B -m data_foundation.cli status
    python -B -m data_foundation.cli run-etl
    python -B -m data_foundation.cli bi-summary
    python -B -m data_foundation.cli search "nghiệm thu"
    python -B -m data_foundation.cli export-excel
"""

from __future__ import annotations

import argparse
import json

from .analyst_ba_bi import VbplAnalystBaBiEngine
from .lake_pipeline import VbplDataLakePipeline


def main() -> None:
    ap = argparse.ArgumentParser(description="LEX-PMO VBPL Data Foundation CLI (Single-User)")
    ap.add_argument("--root", default=None, help="Đường dẫn gốc Data Lake trên SSD E:\\")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="Xem trạng thái Bronze/Silver/Gold & SQLite Warehouse")
    sub.add_parser("run-etl", help="Chạy Medallion ETL (Bronze -> Silver -> Gold -> SQLite)")
    sub.add_parser("bi-summary", help="In bảng KPI BA & tổng quan BI JSON")
    sub.add_parser("export-excel", help="Xuất workbook Excel BI nhiều sheet (.xlsx)")

    sp_search = sub.add_parser("search", help="Tìm kiếm toàn văn FTS5 trong Điều/Khoản")
    sp_search.add_argument("query", help="Từ khóa tiếng Việt cần tra cứu")
    sp_search.add_argument("--limit", type=int, default=15)

    args = ap.parse_args()
    pipeline = VbplDataLakePipeline(root_dir=args.root)
    engine = VbplAnalystBaBiEngine(pipeline)

    if args.cmd == "status":
        print(json.dumps(engine.get_lake_status(), ensure_ascii=False, indent=2))
    elif args.cmd == "run-etl":
        print(json.dumps(pipeline.run_medallion_etl(), ensure_ascii=False, indent=2))
    elif args.cmd == "bi-summary":
        ov = engine.get_bi_overview()
        print(
            json.dumps(
                {
                    "summary": ov["summary"],
                    "ba_kpis": ov["ba_kpis"],
                    "ba_insights": ov["ba_insights"],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    elif args.cmd == "search":
        hits = pipeline.warehouse.search_clauses_fts(args.query, limit=args.limit)
        print(json.dumps({"query": args.query, "total_hits": len(hits), "hits": hits}, ensure_ascii=False, indent=2))
    elif args.cmd == "export-excel":
        out = engine.export_bi_excel()
        print(json.dumps({"status": "EXPORTED", "file_path": str(out)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

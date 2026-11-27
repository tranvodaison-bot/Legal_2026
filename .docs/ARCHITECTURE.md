# Kiến trúc Hệ thống — LEX-PMO OS (`Legal_2026`)

## 1. Bản đồ 1 Nguồn Gốc Duy Nhất (Build Đa Máy)

- **Code & AI Memory SSOT:** `https://github.com/tranvodaison-bot/Legal_2026.git` (nhánh `main` → Vercel Auto-Deploy).
- **Local Build & Dev Workshop (Máy chính):** `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026` (máy khác chỉ cần `git clone` và chạy `scripts/bootstrap.ps1`).
- **Local Runtime Data Lake (Ngoài Git — Phương án B):** `%LEX_DATA_LAKE_ROOT%` (mặc định `<repo_root>\.local_data\vbpl\`, khóa trong `.gitignore`, tự động chạy trên mọi máy/mọi ổ đĩa).
- **Kho Dữ liệu Pháp lý (Chỉ đọc):** `G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026`.
- **Cloud Backup & Specs (Google Drive `G:\`):** Chỉ lưu tài liệu đặc tả và gói backup nén `.zip` tạo bởi `scripts/backup_data_lake.ps1`.

## 2. Kiến trúc Ứng dụng Web (React 19 + TypeScript + Vite 8 + Vercel API)

- **Design System (`src/index.css`):** Hệ token **Giấy Pháp Lý & Ấn Chương** (`:root` và Dark Mode `body.toi` gắn với `@custom-variant dark`), Topbar 1 hàng 50px (`TopRoleSwitcherHeader.tsx`), `SlideOverRefDrawer.tsx` (ngăn kéo đối chiếu `430px`) và `VbplLibraryModals.tsx` (Thống kê 184 VB & Hướng dẫn).
- **6 Phân hệ Giao diện (`src/components/steps/`):**
  1. `Step1CdeIngestion.tsx` — Nhập dữ liệu CDE, chuẩn hóa tên VBPL `[SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]`, Smart Tags gợi ý (`✓`/`×`/sửa/+ Thêm Tag), dữ liệu mặc định 160 mục từ `rawRealDataLegal2026.json` (`realDataLegal2026Batch.ts`).
  2. `Step2LegalMatrix.tsx` — Tra cứu VBPL 3 cột (184 văn bản sau hợp nhất `buildExtraDataLegal2026Docs()`), cây lĩnh vực `├ └`, mục lục Chương/Điều/Khoản, ghi chú cá nhân, đối soát chéo, phả hệ (`LawGenealogyTreeDiagram.tsx`) & xem PDF nội tuyến (`SecurePdfViewerModal.tsx`).
  3. `Step3StageGate.tsx` — Lộ trình 17 cổng Stage-Gate (`G0–G16`) & RACI theo 6 loại hình dự án (`KCN`, `CCN`, `FTZ`, `HTKT`, `DAN_DUNG`, `PPP_BT`).
  4. `Step4RaciHr.tsx` — Quy trình QA/QC, biểu mẫu auto-fill & phân quyền 4 bên (`CDT`, `PMU`, `TVGS`, `CONTRACTOR`) kèm `DigitalSignoffModal.tsx`.
  5. `Step5CommandCenter.tsx` — Kiểm soát VO, tiến độ thời gian (Chrono Audit), Portfolio Dashboard (`Step5PortfolioDashboard.tsx`), biểu đồ luồng D3 (`ApprovalFlowD3Diagram.tsx`) & 5 AI Agents pháp lý.
  6. `Step6DataFoundationBi.tsx` — Giao diện trực quan 6 tầng Data Foundation & VBPL BI (nối Live `:8008` hoặc Client Fallback Mirror).
- **Serverless / Node HTTP API (`api/` & `server.ts`):**
  - `/api/health`, `/api/verify-role`, `/api/audit-logs`, `/api/gemini/analyze`, `/api/gemini/analyze-legal`, `/api/gemini/compare-clauses`.
  - `/api/documents/stream-pdf` (`api/documents/stream-pdf.ts`): Zero-Trust PDF stream proxy đọc nội tuyến (chặn path traversal, ẩn đường dẫn vật lý `G:\`, trả `application/pdf`).
- **Core Parsers (`src/utils/`):**
  - `legalParser.ts`: chuẩn hóa tên VBPL, `stripRedundantSummaryPrefix`, `cleanLegalPageNoise`, `parseLegalDocumentStructure` (NĐ 30/2020), `smartAnalyzeFile3D`, `buildAutoSuggestedTags`.
  - `vbplDataFoundationEngine.ts`: mirror client-side cho DQ Profiler, 6 KPI BA, Gate Coverage & Relation Radar.
  - `src/data/dataLegal2026Catalog.ts` (7 core overrides + 44 new docs = 51) + `src/data/realDataLegal2026Batch.ts` (160 mục quét từ `Data_Legal_2026`).

## 3. Kiến trúc Local Sidecar (`:8008`) & Nền tảng VBPL Data Foundation (6 Tầng — Single-User)

- **Entrypoint Sidecar:** `desktop-sidecar/local_scanner_engine.py` (FastAPI cổng `127.0.0.1:8008`).
  - `LegalDocumentParser`: đọc `.docx` (`python-docx` + fallback OOXML `zipfile`), đọc `.pdf` (`fitz`/PyMuPDF), đo mật độ chữ 3 trang đầu (`avg_chars < 150` → OCR 250 DPI qua Tesseract `vie` / VietOCR / Gemini Vision), lọc số trang rác chuẩn Unicode NFC và phân rã cấu trúc NĐ 30/2020.
  - Endpoints: `/api/local/health`, `/api/scan-file`, `/api/local/scan-file`, `/api/local/scan-folder`, `/api/local/batch-rename`, `/api/local/undo-last-rename`, `/api/local/stream-pdf` và router `/api/data-foundation/*`.
- **6 Tầng Data Foundation (`data_foundation/`):**
  1. **DATA (`contracts.py`):** Pydantic v2 contracts (`RawVbplRecord`, `CleanVbplDocument`, `CleanVbplClause`, `VbplRelationRecord`), bộ trích xuất quan hệ `REPLACES`/`REPEALS`/`AMENDS`/`GUIDES`/`REFERENCES` và bộ chấm điểm DQ 4 trụ cột (`0–100`).
  2. **DATA LAKE (`lake_pipeline.py`):** Medallion 3 vùng trên SSD: `01_bronze/` (JSONL + SHA-256 manifest) → `02_silver/` (`vbpl_documents.parquet`, `vbpl_clauses.parquet`, `vbpl_relations.parquet`) → `03_gold/` (`mart_vbpl_portfolio.parquet`, `mart_vbpl_coverage_matrix.parquet`, `mart_vbpl_amendment_radar.parquet`).
  3. **MODEL DATA (`warehouse_sqlite.py`):** SQLite WAL (`04_warehouse/vbpl_warehouse.sqlite`) với 6 bảng chiều (`dim_doc_type`, `dim_issuer`, `dim_domain`, `dim_stage_gate`, `dim_project_axis`, `dim_time`), bảng sự kiện & cầu nối (`fact_vbpl_documents`, `fact_vbpl_clauses`, `bridge_doc_*`, `fact_vbpl_relations`, `fact_dq_runs`, `fact_personal_notes`), chỉ mục toàn văn **FTS5** (`fts_vbpl_clauses`) và 6 SQL Views (`vw_bi_*`).
  4. **DATA ANALYST (`analyst_ba_bi.py`):** DQ Profiler (Completeness 30, Validity 30, Uniqueness 20, Timeliness 20) & Gap Analysis.
  5. **BA (`analyst_ba_bi.py`):** Semantic Layer gồm 6 KPI chuẩn Chủ đầu tư & Actionable Insights (`P0`/`P1`/`P2`).
  6. **BI (`router.py`, `cli.py`, `Step6DataFoundationBi.tsx`):** FastAPI JSON payload, CLI 1 người dùng, Dashboard Web và xuất Excel 5 sheet (`openpyxl`).

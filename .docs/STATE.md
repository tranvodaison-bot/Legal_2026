# Trạng thái Hiện tại Dự án (`Legal_2026` — STATE SNAPSHOT)

- **Cập nhật gần nhất:** 2026-11-27
- **Nguồn gốc duy nhất (SSOT):** `https://github.com/tranvodaison-bot/Legal_2026.git` (nhánh `main`)
- **Xưởng Build duy nhất (Máy chính):** `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`
- **Data Lake Local (Single-User · Phương án B):** `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026\.local_data\vbpl` *(khóa trong `.gitignore`, độc lập với mọi máy)*
- **Kho Dữ liệu Pháp lý (Chỉ đọc):** `G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026` (`159 FILE + 1 FOLDER [29 biểu mẫu NĐ 14/2026]`)

## 1. Các hạng mục Đã hoàn thành & Kiểm chứng Xanh
1. **Quy tắc đặt tên VBPL thống nhất 100%** (`2c647a0`): `[SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]` + làm sạch trích yếu (`BH`, tỷ lệ `1/500`, `LuatXayDung`, `[YYYY]_`) + Smart Tags gợi ý tương tác ở Bước 1.
2. **Tích hợp `LegalDocumentParser` NĐ 30/2020** (`2c2a313`): Đọc `.docx`/`.pdf`, phát hiện PDF scan (`avg_chars < 150`), OCR 250 DPI fallback đa tầng, chuẩn hóa Unicode NFC/khử `\xa0`/`\xad`, phân rã `Căn cứ`, `Chương`, `Mục`, `Điều`, `Khoản`, `Điểm`, đồng bộ Sidecar `:8008` và Frontend (`legalParser.ts`).
3. **Nền tảng VBPL Data Foundation 6 Tầng** (`79702ba`): `data_foundation/` (Bronze JSONL → Silver/Gold Parquet → SQLite WAL Star Schema + FTS5 → DQ Profiler → 6 BA KPIs → FastAPI Router + CLI + Excel 5 sheet + Tab 6 `Step6DataFoundationBi.tsx`).
4. **Nạp 51 PDF cốt lõi vào Data Foundation** (`471a25b`): `51` VB · `696` Điều/Khoản · `139` quan hệ pháp lý · `DQ 99.8/100` và hợp nhất `dataLegal2026Catalog.ts` (7 overrides + 44 docs mới).
5. **Zero-Trust PDF Stream Proxy & Đồng bộ 160 mục `Data_Legal_2026`** (`d9ff482`, `c755aaa`): Endpoint `/api/documents/stream-pdf` + `SecurePdfViewerModal.tsx` + `rawRealDataLegal2026.json` + `realDataLegal2026Batch.ts`.
6. **Chuẩn hóa Giao diện 3 Cột `thuvien-vbpl-26`** (`bd5676b`): Design Tokens Giấy Pháp Lý & `body.toi` (`src/index.css`), Topbar 50px, `Step2LegalMatrix.tsx` 3 cột (184 VB), `SlideOverRefDrawer.tsx`, `VbplLibraryModals.tsx` (`16/16` smoke tests PASS).

## 2. Lộ trình Nâng cấp Hợp nhất 4 Wave (2026-11-27)

- **Wave 1 (P0 — Đã hoàn tất 2026-11-27):**
  - Đã đẩy baseline `bd5676b`, dọn root (`HANDOVER_2026_11_27.md`, `SOP_BUILDING_APP_V2_4.md`) & hợp nhất bộ `.docs/` (`STATE`, `AGENT_SYNC_LEDGER`, `ARCHITECTURE`).
  - Đã micro-polish đệm phải & chống tràn tab `Gần đây` Cột 2 (`Step2LegalMatrix.tsx`).
  - Đã đồng bộ hệ biến màu Sáng/Tối (`--giay`, `--panel`, `--chu`, `--line`, `--d3-*`) sang 5 phân hệ PMO (`Step1`, `Step3–6`), biểu đồ D3 (`ApprovalFlowD3Diagram`, `Step5PortfolioDashboard`, `LawGenealogyTreeDiagram`), `DigitalSignoffModal`, `LAW_ROADMAP`/`CROSS_EXAM`, và gỡ `class="dark"` cứng ở `index.html`.
  - Đã vá 4 lỗi xuất script `.ps1` (BOM, `-LiteralPath`, single-quote escape, `Join-Path` thư mục con, mặc định `Copy-Item`) & đồng bộ 4 điểm lệch nhỏ naming rules TS ↔ Python.
- **Wave 2 (Data Foundation ACID & Dedup `sha256` — Đã hoàn tất 2026-11-27):**
  - Đã hoàn tất khử trùng 2 pha ưu tiên `sha256` 64-char, ổn định `doc_key` & chống `WEB_APP_SYNC` ghi đè mất full-text trong `lake_pipeline.py`.
  - Đã xây `vault_manager.py` + bảng `fact_rename_operations` trong SQLite WAL (Binary Vault `01_bronze/raw_files/`, chế độ `COPY_TO_SILVER` vs `INPLACE_RENAME` Undo ACID, chặn `403` lên `Data_Legal_2026`).
  - Đã mở API `/commit-batch`, `/documents` (hydrate), `/rename-operations(/undo)`; nâng cấp trích xuất `.docx` đọc trọn vẹn `doc.tables` & `scan-folder` đệ quy (`5/5` Python tests PASS).
- **Wave 3 (P1 — Đã hoàn tất 2026-11-27):**
  - Proxy Node thuần `/api/documents/preview-docx`, `/list-forms`, `/search-fts`, `/clauses` (`mammoth` + Word COM cache `.doc` + `word-extractor` fallback, `node:sqlite`) & `SecureDocumentViewerModal.tsx` (xem/in A4 cho `.docx`, `.doc`, 29 biểu mẫu NĐ 14/2026, QĐ 1040).
  - Nạp toàn văn `141` tệp bổ sung → **`192` tài liệu · `4.355` điều khoản SQLite FTS5 · `612` quan hệ · `DQ 93.63`** (`0` `.json` rác) nối thẳng vào `Step2` & `Step6`.
  - Nối 2 chiều Bước 1 ↔ SQLite: Auto-Hydrate sau F5, Khung Quét Thư Mục Ổ Cứng (`:8008`) & chọn chế độ lưu (`COPY_TO_SILVER` vs `INPLACE_RENAME`) (`tsc 0`, `19/19` smoke tests PASS, `5/5` Python tests PASS).
- **Wave 4 (P2 — Tra cứu sâu & Code-Splitting `< 500 KB`):**
  - Tự động gắn `.xref` bấm được mở `SlideOverRefDrawer` (chống XSS, O(1) index).
  - Bộ lọc năm hiệu lực `2027..2006` & nút `🗑 Xóa lịch sử` tab `Gần đây`.
  - `React.lazy()` + Vite 8 Rolldown `codeSplitting.groups` tách main chunk từ `~1.49 MB` xuống `< 500 KB` + `tests/bundle-budget.test.ts`.

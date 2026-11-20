# Trạng thái Hiện tại Dự án (`Legal_2026` — STATE SNAPSHOT)

- **Cập nhật gần nhất:** 2026-11-20
- **Nguồn gốc duy nhất (SSOT):** `https://github.com/tranvodaison-bot/Legal_2026.git` (nhánh `main`)
- **Xưởng Build duy nhất (Máy chính):** `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`
- **Data Lake Local (Single-User · Phương án B):** `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026\.local_data\vbpl` *(khóa trong `.gitignore`, độc lập với mọi máy)*

## 1. Các hạng mục Đã hoàn thành & Kiểm chứng Xanh
1. **Quy tắc đặt tên VBPL thống nhất 100%** (`2c647a0`): `[SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]` + làm sạch trích yếu (`BH`, tỷ lệ `1/500`, `LuatXayDung`, `[YYYY]_`) + Smart Tags gợi ý tương tác ở Bước 1, giữ nguyên 100% `Step2LegalMatrix.tsx`.
2. **Tích hợp `LegalDocumentParser` NĐ 30/2020** (`2c2a313`): Đọc `.docx`/`.pdf`, phát hiện PDF scan (`avg_chars < 150`), OCR 250 DPI fallback đa tầng, chuẩn hóa Unicode NFC/khử `\xa0`/`\xad`, phân rã `Căn cứ`, `Chương`, `Mục`, `Điều`, `Khoản`, `Điểm`, nối dòng PDF bị ngắt, đồng bộ trên cả Sidecar `:8008` (`/api/scan-file`, `/api/local/scan-file`) và Frontend (`legalParser.ts`).
3. **Nền tảng VBPL Data Foundation 6 Tầng cho 1 người sử dụng** (`79702ba`): `data_foundation/` (Bronze JSONL → Silver/Gold Parquet → SQLite WAL Star Schema + FTS5 → DQ Profiler → 6 BA KPIs → FastAPI Router + CLI + Excel 5 sheet + Tab 6 `Step6DataFoundationBi.tsx`).
4. **Chuẩn hóa 1 Nguồn Gốc Duy Nhất (SSOT)** (`9229dc9`, `6b75977`): Hợp nhất code + trí nhớ AI trên GitHub, 1 xưởng Build duy nhất `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`, Data Lake gọn trong `.local_data/vbpl/`.
5. **Nạp toàn bộ 51 tệp PDF thực tế từ `Data_Legal_2026`** (`scripts/ingest_data_legal_2026.py`): 35 PDF Native + 16 PDF Scan (OCR Tesseract `vie`), nạp 100% vào Data Foundation 6 tầng (`51` VB · `696` Điều/Khoản · `139` quan hệ pháp lý · `DQ 99.8/100` · xuất Excel BI 5 sheet) và hợp nhất vào `INITIAL_LEGAL_DOCS` qua `src/data/dataLegal2026Catalog.ts` (7 VB cốt lõi nâng chuẩn + 44 VB/Phụ lục mới).

## 2. Hàng đợi Nâng cấp Kế tiếp (Đã kiểm toán kiến trúc — Sẵn sàng triển khai)
Các lỗ hổng đã xác định giữa **Bước 1 ("Đổi tên file/thư mục")** và **Data Foundation 6 tầng**:
- **[P0-1] Nối ống dẫn 2 chiều Bước 1 ↔ Data Foundation:** Gọi `commit-batch` khi bấm `✅ Xác Nhận & Nạp Vào Hệ Thống` ở Bước 1 và tự động **Hydrate** dữ liệu thật từ SQLite (`vbpl_warehouse.sqlite`) khi mở App để không mất dữ liệu sau F5.
- **[P0-2] Kho lưu File Nhị phân Gốc (Binary Vault) & Đổi tên thật có Hoàn tác ACID:**
  - Lưu bản gốc bất biến tại `01_bronze/raw_files/{sha256_16}_{original_name}`.
  - Cho phép chọn 2 chế độ: **An toàn (Copy sang `02_silver/curated_files/{LĩnhVực}/{Năm}/{SSOT_Name}`)** hoặc **Đổi tên trực tiếp tại thư mục nguồn có Undo ACID** qua bảng `fact_rename_operations` trong SQLite (bỏ file `ssot_rename_audit_log.json` rời).
- **[P0-3] Khung Quét thư mục máy trạm ngay tại Bước 1 & Vá script `.ps1`:** Hỗ trợ quét thư mục cục bộ có `full_path` ngay trong Bước 1, sửa lỗi đường dẫn thư mục con + `Move-Item` + escape chuỗi trong script `.ps1`.
- **[P1-1] Khử trùng ưu tiên `sha256` trong `lake_pipeline.py`:** Tránh tạo bản ghi bóng ma khi người dùng đổi tên 1 file đã từng nạp.
- **[P1-2] Tối ưu Bundle Frontend:** Áp dụng `React.lazy()` cho 6 bước trong `src/App.tsx` để cắt bundle JS xuống dưới 500 kB.

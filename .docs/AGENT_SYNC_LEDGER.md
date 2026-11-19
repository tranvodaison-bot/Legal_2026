# AGENT SYNC LEDGER — Sổ Cái Giao Dịch Dự Án (`Legal_2026`)

> Tuân thủ `SOP-BUILDING-APP v2.4` & `SOP-COBUILD-V1.0`. Mọi phiên làm việc trên bất kỳ máy nào ghi nhận mốc commit & bằng chứng kiểm thử vào sổ cái này trước khi kết thúc phiên.

| TX ID | Ngày (UTC+7) | Commit | Agent / Máy | Hạng mục hoàn thành | Bằng chứng kiểm thử |
|---|---|---|---|---|---|
| `TX-01` | 2026-11-19 | `864b59f` | Antigravity Local | Quy tắc `[SoHieu]-[Nam]` + Smart Tags gợi ý tương tác Bước 1 | `tsc 0`, `vite build OK`, `12/12` smoke tests |
| `TX-02` | 2026-11-19 | `2c647a0` | Antigravity Local | Thống nhất 100% quy tắc VBPL `[SoHieu]-[Nam]_[LoaiVB]-[CoQuan]_[LinhVuc]_[TrichYeu]` + tinh gọn Smart Tags + đồng bộ Sidecar | `tsc 0`, `vite build OK`, `12/12` smoke tests, Python 5/5 mẫu chuẩn |
| `TX-03` | 2026-11-19 | `2c2a313` | Antigravity Local | Tích hợp `LegalDocumentParser` (DOCX/PDF + OCR 250 DPI + NĐ 30/2020) trên Sidecar `:8008` & Frontend TS | `tsc 0`, `vite build OK`, `13/13` smoke tests, `FastAPI + fitz + python-docx` PASS |
| `TX-04` | 2026-11-19 | `79702ba` | Antigravity Local | Xây dựng nền tảng VBPL Data Foundation 6 tầng (Single-User Local-First: Bronze/Silver/Gold Parquet + SQLite Star Schema & FTS5 + DQ Analyst + 6 BA KPIs + BI Dashboard Tab 6 + Excel `.xlsx`) | `tsc 0`, `vite build OK`, `14/14` smoke tests, `unittest test_data_foundation.py` OK, Sidecar mount PASS |
| `TX-05` | 2026-11-19 | *(pending push)* | Antigravity Local | Chuẩn hóa 1 nguồn gốc duy nhất (GitHub Code+Memory SSOT, xưởng build duy nhất `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`, `.antigravity/rules.md`, `.docs/*`, `scripts/bootstrap.ps1`, `scripts/backup_data_lake.ps1`) | Chạy `scripts/bootstrap.ps1` trực tiếp tại `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026` |

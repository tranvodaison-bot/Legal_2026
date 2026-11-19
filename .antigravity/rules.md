# LEX-PMO OS (`Legal_2026`) — PROJECT MEMORY & AGENT RULES (SSOT)

> **Single Source of Truth (Code & AI Memory):** `https://github.com/tranvodaison-bot/Legal_2026.git` (nhánh `main` tự động deploy lên Vercel).
> **Bắt buộc đọc đầu mỗi phiên làm việc trên bất kỳ máy nào:** `.docs/STATE.md`, `.docs/ARCHITECTURE.md`, `.docs/AGENT_SYNC_LEDGER.md`, `.docs/LESSONS_LEARNED.md`.

## 1. Quy tắc 1 Nguồn Gốc Duy Nhất (Zero Fragmentation)
- **Code & Trí nhớ dự án:** Chỉ chỉnh sửa trong bản clone local trên SSD (trên máy chính là `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`) và đồng bộ qua GitHub (`git pull` đầu phiên, `git push` sau khi Pass 100% test).
- **CẤM sửa code trên Google Drive (`G:\`)**: Google Drive chỉ lưu tài liệu Spec, `_Archive` và file nén snapshot `.zip` của Data Lake (`08_DATA_BACKUPS/`).
- **Kho dữ liệu chạy thật (Ngoài Git — Phương án B):** Mặc định đặt gọn ngay trong thư mục dự án tại `.local_data\vbpl\` (khóa chặt trong `.gitignore` và `tsconfig.json`; có thể đổi qua biến môi trường `LEX_DATA_LAKE_ROOT`). Trước khi xóa thư mục repo để clone lại, bắt buộc chạy `scripts/backup_data_lake.ps1 -Mode Backup`.
- **Tách biệt dự án anh em:** Không gộp hay ghi đè `E:\4. AI_PROJECT\2_Project\2_LEGAL` (đó là repo độc lập `github.com/tranvodaison-bot/LEGAL`).

## 2. Lằn Ranh Đỏ Nghiệp Vụ của `Legal_2026`
1. **Bảo toàn 100% Bước 2 (`src/components/steps/Step2LegalMatrix.tsx`):** Không chỉnh sửa logic/UI Bước 2 trừ khi Chủ đầu tư yêu cầu trực tiếp. Mọi dữ liệu nạp từ Bước 1 hoặc Data Foundation phải ánh xạ chuẩn vào kiểu `LegalDocument` (`docType`, `primaryDomain`, `secondaryDomains`, `industryGroupId`, `subSectorCode`, `projectAxes`, `linkedGates`, `tags`, `nodes`).
2. **Công thức Đặt tên VBPL Thống nhất 100% (Không ngoại lệ):**
   - `[SốHiệu]-[Năm]_[LoạiVB]-[CơQuan]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]`
   - Thành phần 2 luôn là `[LoạiVB]-[CơQuan]` (`LUAT-QH15`, `ND-CP`, `TT-BTC`, `VBHN-BXD`, `QCVN-BXD`...).
   - Thành phần 3 luôn là 1 trong **11 Mã Lĩnh vực chuẩn**: `HDXD`, `QLCL`, `QLHD`, `QLCP`, `VLXD`, `DTH`, `TQT`, `PCCC`, `QHDD`, `ATLD`, `DTU` (không bao giờ dùng `QCVN`/`TCVN` hoặc mã cơ quan làm lĩnh vực).
   - `[TríchYếuNgắn]` dạng `PascalCase` tối đa 40 ký tự sau khi loại bỏ tiền tố lặp, vẫn giữ nguyên tỷ lệ quy hoạch (`1/500`, `1/2000`) và chữ `Luat` trong tên Luật (`LuatXayDung`).
3. **Đồng bộ Song hành Web (TS) ↔ Local Sidecar (Python `:8008`):** Mọi thay đổi quy tắc đặt tên, `LegalDocumentParser` hay Smart Tags phải đồng bộ đồng thời giữa `src/utils/legalParser.ts` và `desktop-sidecar/local_scanner_engine.py`.
4. **Dữ liệu gốc bất khả xâm phạm (Immutable Primary Source):** Mọi thao tác làm sạch/OCR/đổi tên phải bảo toàn dữ liệu gốc và có đường hoàn tác (`Undo`).

## 3. Definition of Done (Bắt buộc trước mọi Commit/Push)
Chạy trực tiếp tại thư mục repo SSD và xác nhận thoát mã `0`:
1. `npx tsc --noEmit` (0 lỗi TypeScript)
2. `npm run build` (Vite production build thành công)
3. `npx tsx --test tests/api-smoke.test.ts` (100% PASS)
4. `python -B -m unittest discover -s tests -p "test_data_foundation.py" -v` (100% PASS)
5. Cập nhật `.docs/STATE.md` và `.docs/AGENT_SYNC_LEDGER.md` sau mỗi milestone lớn.

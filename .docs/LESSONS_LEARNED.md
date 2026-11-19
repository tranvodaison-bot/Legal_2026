# LESSONS LEARNED — Bài Học Kỹ Thuật Đã Kiểm Chứng (`Legal_2026`)

Danh sách lỗi thực tế đã gặp và đã vá dứt điểm trong quá trình phát triển — **không được lặp lại ở các phiên sau**:

1. **PyMuPDF (`fitz`) phát sinh khoảng trắng không ngắt `\xa0` và gạch nối mềm `\xad`:**
   - Khi trích xuất text từ PDF tiếng Việt, dòng số trang `- 1 -` hay `Trang 1/2` có thể chứa `\xa0` và `\xad`, khiến regex lọc số trang bỏ sót.
   - **Quy chuẩn đã chốt:** Luôn chuẩn hóa Unicode `NFC`, đổi `[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]` → ASCII `' '`, bỏ zero-width `[\u200b-\u200d\ufeff]`, và dùng nhóm `[-–—\u00ad\u2212]` khi lọc số trang ở cả `legalParser.ts` và `local_scanner_engine.py`.

2. **Python `sqlite3` `with sqlite3.connect(...) as conn:` KHÔNG tự đóng file trên Windows:**
   - Trên Windows, `sqlite3.Connection.__exit__` chỉ commit/rollback transaction chứ không gọi `conn.close()`, gây `ResourceWarning: unclosed database` và khóa file `[WinError 32]` khi xóa/backup/dọn tệp.
   - **Quy chuẩn đã chốt:** Luôn mở kết nối qua `@contextmanager` có `try: yield conn; conn.commit() except: conn.rollback(); raise finally: conn.close()` (đã áp dụng tại `data_foundation/warehouse_sqlite.py`).

3. **Regex cắt số hiệu cuối trích yếu làm mất tỷ lệ quy hoạch `1/500`, `1/2000`:**
   - Regex quá rộng `\d+/\d+` ở cuối trích yếu sẽ cắt nhầm `1/500` trong *"phê duyệt điều chỉnh quy hoạch 1/500"*.
   - **Quy chuẩn đã chốt:** `TRAILING_DOC_NUM_SUFFIX_RE` yêu cầu tiền tố `so `, năm 4 chữ số `(?:19|20)\d{2}`, hoặc hậu tố chữ cái, đồng thời loại trừ rõ tỷ lệ `(?!1/(?:50|100|200|250|500|1000|2000|2500|5000|10000)$)`.

4. **Trọng số phân loại lĩnh vực `HDXD` vs `QLCL`:**
   - `HDXD` là lĩnh vực bao trùm (umbrella) nên nếu để từ khóa trùng lặp `'BAN VE'` + `'BAN VE THI CONG'` cùng trọng số với `QLCL` sẽ đè mất `QLCL` trên Biên bản nghiệm thu (`BBNT`).
   - **Quy chuẩn đã chốt:** `PCCC` = 10, `VLXD`/`QLCL` = 9, các lĩnh vực chuyên ngành = 8, `HDXD` = 7 (không lặp `'BAN VE'`).

5. **Không đặt `.git` hoặc chạy `npm install`/`sqlite` trên Google Drive (`G:\`):**
   - Google Drive sync xung đột với `.git/index`, `node_modules`, `*.sqlite-wal`, `__pycache__`.
   - **Quy chuẩn đã chốt:** Mọi mã nguồn làm việc và `node_modules` chỉ chạy trên SSD local (`E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`); đồng bộ đa máy bằng **GitHub** (code + `.docs` + `.antigravity`) và **1 file snapshot `.zip`** của Data Lake (`scripts/backup_data_lake.ps1`).

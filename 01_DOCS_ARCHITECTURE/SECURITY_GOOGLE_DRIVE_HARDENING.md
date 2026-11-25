# 🛡️ HƯỚNG DẪN BẢO MẬT & ĐÓNG BĂNG KHO DỮ LIỆU GOOGLE DRIVE
**Dự án:** `5_LEGAL_2026` — LEX-PMO OS v3.0  
**Áp dụng cho:** Kho tài liệu `Data_Legal_2026` và Trung tâm Lưu trữ `5_LEGAL_2026` trên Google Drive.  
**Mục tiêu:** Chống triệt để việc người ngoài hoặc tài khoản dùng chung can thiệp, sửa, xóa hoặc làm rò rỉ tệp tin gốc.

---

## 1. NGUYÊN TẮC ZERO-TRUST STORAGE (KHO DỮ LIỆU BẤT KHẢ XÂM PHẠM)
1. **Google Drive là Kho Lạnh (Cold Storage SSOT):** Tuyệt đối không gửi link thư mục Google Drive cho nhân viên, nhà thầu hoặc đối tác để đọc tài liệu.
2. **Cổng duy nhất là Phần mềm:** Người dùng 100% truy cập thông qua ứng dụng `5_LEGAL_2026` (đọc toàn văn tại Bước 2 hoặc xem qua Cổng PDF Stream an toàn `/api/documents/stream-pdf`).
3. **Ẩn hoàn toàn đường dẫn thật:** Phần mềm sử dụng Blob Stream (`blob:http://...`), che giấu hoàn toàn URL thật của Google Drive khỏi thanh địa chỉ trình duyệt.

---

## 2. 3 BƯỚC CẤU HÌNH BẢO VỆ TRÊN GOOGLE DRIVE WEB

### BƯỚC 1: THU HỒI QUYỀN CHỈNH SỬA (REMOVE EDITOR ACCESS)
1. Mở [Google Drive](https://drive.google.com).
2. Chuột phải vào thư mục `Data_Legal_2026` (và `5_LEGAL_2026`) ➔ Chọn **Chia sẻ (Share)**.
3. Kiểm tra danh sách những người có quyền truy cập:
   - **Chủ sở hữu (Owner):** Chỉ duy nhất tài khoản Quản trị / Chủ đầu tư của bạn.
   - Các tài khoản khác: Chuyển toàn bộ từ **Người chỉnh sửa (Editor)** sang **Người xem (Viewer)** hoặc **Xóa quyền truy cập (Remove access)**.

---

### BƯỚC 2: KHÓA TẢI XUỐNG, IN VÀ SAO CHÉP (DISABLE DOWNLOAD / PRINT / COPY)
1. Trong cửa sổ **Chia sẻ (Share)** của thư mục, nhấn vào biểu tượng **Bánh răng cài đặt (⚙️)** ở góc trên bên phải.
2. **Bỏ chọn (Uncheck)** 2 mục sau:
   - ❌ *Người chỉnh sửa có thể thay đổi các quyền và chia sẻ*
   - ❌ *Người xem và người nhận xét có thể thấy tùy chọn tải xuống, in và sao chép*
3. Nhấn **Xong (Done)** để lưu cấu hình.
> 👉 **Hiệu lực:** Kể cả khi ai đó có được link Drive, họ cũng **KHÔNG THỂ tải file về, KHÔNG THỂ in, và KHÔNG THỂ xóa hay sửa**.

---

### BƯỚC 3: TẮT CHIA SẺ CÔNG KHAI QUA LIÊN KẾT (RESTRICT LINK ACCESS)
1. Tại mục **Quyền truy cập chung (General access)**.
2. Chuyển từ *"Bất kỳ ai có đường liên kết" (Anyone with the link)* sang **"Hạn chế" (Restricted)**.
3. Chỉ những tài khoản được bạn thêm đích danh bằng email mới được phép xem.

---

## 3. CƠ CHẾ BẢO VỆ KHI PHẦN MỀM CHẠY
- **Kiểm tra Path Traversal:** API từ chối mọi request chứa ký tự `../` hoặc truy cập file ngoài danh mục an toàn.
- **Header bảo mật:** Toàn bộ luồng stream gắn cờ `Content-Disposition: inline` và `X-Content-Type-Options: nosniff`.
- **Khóa thao tác:** Modal xem tài liệu trên phần mềm không cung cấp bất kỳ nút xóa hoặc sửa nào đối với file nguồn.

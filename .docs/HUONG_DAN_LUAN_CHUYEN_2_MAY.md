# 🔄 QUY TRÌNH LUÂN CHUYỂN PHIÊN LÀM VIỆC ĐA MÁY (WORK PC ↔ HOME PC)
**Dự án:** `5_LEGAL_2026` — LEX-PMO OS v3.0 (Hệ thống Quản trị Pháp lý & Dự án Xây dựng)  
**Mục tiêu:** Đảm bảo làm việc liên tục giữa máy cơ quan và máy nhà mà không bị ngắt quãng, không mất dữ liệu, không lỗi xung đột CSDL.

---

## ⚡ TÓM TẮT THAO TÁC NHANH HÀNG NGÀY (CHỈ 1 PHÚT)

### 1. KHI RỜI MÁY (Kết thúc buổi làm việc)
Tại thư mục `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`:
```powershell
# Bước 1: Lưu mã nguồn & đẩy lên GitHub
git add .
git commit -m "sync: luu phien lam viec [ngay_thang]"
git push origin main

# Bước 2: Tự động nén CSDL SQLite & Parquet đẩy lên Google Drive
powershell -ExecutionPolicy Bypass -File scripts/backup_data_lake.ps1 -Mode Backup
```
> *(Khoản 1 phút sau: Bản snapshot mới nhất `vbpl_data_foundation_LATEST.zip` sẽ nằm sẵn trên Google Drive).*

---

### 2. KHI MỞ MÁY TIẾP THEO (Bắt đầu buổi làm việc tại máy khác)
Tại thư mục `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`:
```powershell
# Bước 1: Kéo toàn bộ mã nguồn mới nhất từ GitHub về
git pull origin main

# Bước 2: Khôi phục CSDL mới nhất từ Google Drive về máy cục bộ
powershell -ExecutionPolicy Bypass -File scripts/backup_data_lake.ps1 -Mode Restore
```
> *(Hệ thống tự động giải nén CSDL SQLite, ghi chú và các bảng tính, bạn mở `npm run dev` là tiếp tục làm việc ngay).*

---

## 🛠️ THIẾT LẬP MÁY MỚI LẦN ĐẦU TIÊN (CHỈ LÀM 1 LẦN)
Nếu máy ở nhà chưa từng có dự án, mở PowerShell và chạy đúng 3 dòng lệnh sau:

```powershell
# 1. Tải toàn bộ dự án về ổ E:
git clone https://github.com/tranvodaison-bot/Legal_2026.git "E:\4. AI_PROJECT\2_Project\5_LEGAL_2026"
cd "E:\4. AI_PROJECT\2_Project\5_LEGAL_2026"

# 2. Tự động kiểm tra Node.js, Python, build và thiết lập môi trường
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1

# 3. Kéo dữ liệu snapshot CSDL từ Google Drive về
powershell -ExecutionPolicy Bypass -File scripts/backup_data_lake.ps1 -Mode Restore
```

---

## 🌐 TÙY CHỌN TRA CỨU KHÔNG CẦN BẬT CODE (VERCEL CLOUD)
Khi ở nhà nếu bạn **chỉ cần tra cứu văn bản, xem Ma trận 3 Trục, tiến độ Stage-Gate G0–G16 hay đối chiếu hợp đồng**:
* Truy cập trực tiếp link Web Vercel của dự án trên trình duyệt (Chrome / Edge / Safari).
* Sử dụng được trên máy tính cá nhân, máy tính bảng iPad hay điện thoại di động mà không cần cài đặt bất kỳ công cụ kỹ thuật nào.

---

## ⚠️ NGUYÊN TẮC AN TOÀN BẤT BIẾN (LẰN RANH ĐỎ)
1. **Dữ liệu văn bản gốc:** 147 tệp tại `G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026` được Google Drive tự đồng bộ tự động 100%, không cần copy thủ công.
2. **Tuyệt đối cấm copy `node_modules`, `.venv`, `.parquet`, `.sqlite` thủ công qua Google Drive:** Hãy luôn dùng lệnh `backup_data_lake.ps1` để nén file `.zip` sạch đưa vào thư mục `08_DATA_BACKUPS`, tránh làm nghẽn tiến trình đồng bộ của Google Drive hoặc hỏng file CSDL.
3. **Thư mục làm việc chuẩn:** Luôn chạy ứng dụng tại `E:\4. AI_PROJECT\2_Project\5_LEGAL_2026`.

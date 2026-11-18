# LEX-PMO OS v3.0 — Hệ thống Quản trị Pháp lý 3 Trục, Stage-Gate & Kiểm toán Dự án Đầu tư Xây dựng

**LEX-PMO OS v3.0** (`tranvodaison-bot/Legal_2026`) là nền tảng quản trị pháp lý và điều hành dự án đầu tư xây dựng chuẩn **SSOT (Single Source of Truth)**, tích hợp Ma trận 3 Trục (**Pháp luật × Loại hình Dự án × Chức năng**), quy trình **Stage-Gate G0–G16**, **RBAC/RACI 4 bên** (`CĐT`, `PMU/BQLDA`, `TVGS`, `Nhà thầu`), kiểm soát **QA/QC (`QT-01`–`QT-17`, ITP, CO/CQ QCVN 16, LAS-XD)**, kiểm toán **VO & trình tự thời gian RF-05**, và chuẩn **CDE ISO 19650 (`S0 → S1 → A1 → B1`)**.

---

## 1. Kiến trúc Hybrid 4 Tầng (Hybrid 4-Tier Architecture)

Ứng dụng được thiết kế theo mô hình **Cloud-First + Local SSOT Fallback**, chạy độc lập trên **Vercel** cho trình duyệt/team từ xa và tự động kết nối dịch vụ nội bộ khi vận hành tại máy trạm/mạng nội bộ:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  TẦNG 1: VERCEL WEB APP + SERVERLESS API (api/)                          │
│  • Frontend SPA: React 19 + Vite 8 + Tailwind CSS v4 + D3.js v7           │
│  • Serverless Functions (Node.js Runtime):                                │
│    - GET  /api/health                  (Trạng thái dịch vụ & cấu hình)    │
│    - GET/POST /api/audit-logs          (Audit trail in-memory + RBAC)     │
│    - POST /api/gemini/analyze-legal    (Phân tích 3 Trục + fallback)      │
│    - POST /api/gemini/analyze          (Alias tương thích)                │
│    - POST /api/gemini/compare-clauses  (Đối chiếu 2 điều khoản JSON)      │
│    - GET/POST /api/verify-role         (RBAC Passcode Guard / Demo Mode)  │
│  • Biểu mẫu CSV chuẩn SSOT: /templates/*.csv (UTF-8 BOM)                  │
└───────────────┬───────────────────────────────┬───────────────────────────┘
                │ Fallback khi offline          │ Probe tự động (:8000/:8008)
                ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────────┐
│  TẦNG 2: FASTAPI + PG16 (:8000) │   │  TẦNG 3: VIETOCR SIDECAR (:8008)    │
│  • Endpoint: 127.0.0.1:8000     │   │  • Endpoint: 127.0.0.1:8008         │
│  • PostgreSQL 16 (lex_pmo_os)   │   │  • local_scanner_engine.py          │
│    ltree, pg_trgm, unaccent     │   │  • PyMuPDF → OpenCV khử dấu đỏ      │
│    Trigger RF-05 chống ký lùi   │   │    → VietOCR → Docling → Gemini     │
│  • Google Sheets REG_Master     │   │  • SHA-256 & Batch Rename / Undo    │
└─────────────────────────────────┘   └─────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  TẦNG 4: NOTEBOOKLM DEEP-RAG KNOWLEDGE HUB (21 SỔ GHI CHÚ)               │
│  • 14 Sổ LEGAL (LEGAL-01..LEGAL-14): Luật XD 135/2025, NĐ 206/207/209/    │
│    210/2026, Luật Đấu thầu, QCVN/TCVN, KCN/FTZ/PPP, PCCC, BIM ISO 19650   │
│  • 05 Sổ AI (AI-01..AI-05): Multi-Agent, MCP, Prompt Engineering          │
│  • 02 Sổ Tham khảo (REF-01..REF-02): SOP & Biểu mẫu chuẩn PMO             │
└───────────────────────────────────────────────────────────────────────────┘
```

### Hợp đồng Hybrid Bridge (`src/services/ssotBridgeService.ts`)
- Khi người dùng thao tác trên Vercel hoặc Localhost, frontend tự động probe `VITE_FASTAPI_BASE_URL` (`:8000`) và `VITE_LOCAL_SCANNER_URL` (`:8008`).
- Nếu `:8000` / `:8008` chưa bật, hệ thống tự động fallback mượt mà về Vercel Serverless Functions (`/api/*`) / Express dev server (`server.ts`) và bộ phân tích trình duyệt cục bộ (PDF.js / Mammoth / WebCrypto SHA-256).

---

## 2. Cơ chế Bảo vệ Vai trò (Role Passcode Guard — `/api/verify-role`)

Thanh chuyển đổi vai trò 4 bên (`TopRoleSwitcherHeader.tsx`) hỗ trợ 2 chế độ vận hành tự động theo biến môi trường `ROLE_PASSCODES`:

| Vai trò UI | Mã chuẩn hóa Server | Quyền RACI | Trạng thái Bảo vệ |
|---|---|---|---|
| **Chủ đầu tư (`CDT`)** | `CDT` | `A / R` | Yêu cầu Passcode khi `ROLE_PASSCODES` được cấu hình |
| **Ban QLDA (`BQLDA`)** | `PMU` (`BQLDA`/`ADMIN_PMO`) | `R / C` | Yêu cầu Passcode khi `ROLE_PASSCODES` được cấu hình |
| **Tư vấn Giám sát (`TVGS`)** | `TVGS` (`TVTK`) | `R / C` | Yêu cầu Passcode khi `ROLE_PASSCODES` được cấu hình |
| **Nhà thầu (`NTTC`)** | `CONTRACTOR` | `R / I` | Mở mặc định (Fail-closed khi chưa xác thực vai trò cao hơn) |

- **Protected Mode (`ROLE_PASSCODES` đã cấu hình):**
  - Ứng dụng khởi động ở vai trò mặc định an toàn **Nhà thầu (`NTTC`)**.
  - Các nút `CDT`, `Ban QLDA (PMU)`, `Tư vấn Giám sát` hiển thị biểu tượng `🔒`; khi nhấn sẽ mở hộp thoại nhập Passcode và xác thực qua `POST /api/verify-role` (so khớp bằng SHA-256 + `crypto.timingSafeEqual`).
  - Trạng thái đã mở khóa được lưu tạm trong phiên trình duyệt hiện tại (`sessionStorage`: `lex_pmo_unlocked_roles_v1`, `lex_pmo_active_actor_id_v1`) và có nút `🔒 Khóa` để khóa lại tức thì.
- **Demo Mode Fallback (`ROLE_PASSCODES` chưa đặt hoặc rỗng):**
  - `GET /api/verify-role` trả về `{ ok: true, protected: false, demoMode: true, guardedRoles: [] }`.
  - Hệ thống tự động giữ trải nghiệm Demo mặc định (`EMP-01 / CĐT`), cho phép chuyển đổi tự do 4 vai trò để kiểm thử không bị chặn.

---

## 3. Biểu mẫu CSV Chuẩn SSOT (`public/templates/`)

Tại **Bước 1 (`Step1CdeIngestion.tsx` — BƯỚC 1.1)**, người dùng có thể tải trực tiếp 3 biểu mẫu CSV mã hóa **UTF-8 with BOM (`EF BB BF`)** (hiển thị chuẩn tiếng Việt trên Microsoft Excel Windows & Google Sheets):

1. `public/templates/mau_danh_muc_vbpl_3truc.csv` — Danh mục VBPL theo 3 Trục (20 cột, đồng bộ schema `LegalDocument` & `REG_Master`).
2. `public/templates/mau_stage_gate_du_an.csv` — Ma trận Stage-Gate `G0–G16`, RACI 4 bên & hồ sơ tài chính IPC (23 cột).
3. `public/templates/mau_hop_dong_itp.csv` — Kiểm soát Hợp đồng/VO, ITP, CO/CQ QCVN 16, LAS-XD & ngày kiểm toán trình tự RF-05 (25 cột).

---

## 4. Cấu hình Biến Môi trường (Environment Variables)

### 4.1. Server-side (Vercel Project Settings > Environment Variables hoặc `.env`)

| Biến | Bắt buộc | Mô tả & Định dạng |
|---|---|---|
| `GEMINI_API_KEY` | Khuyến nghị | Khóa API Google Gemini (chỉ đọc trên server tại `api/_lib/gemini.ts`). Nếu chưa đặt, `/api/gemini/analyze-legal` dùng Built-in Deterministic Legal Engine; `/api/gemini/compare-clauses` trả `503`. |
| `ROLE_PASSCODES` | Tùy chọn | Passcode bảo vệ vai trò `CDT`, `PMU`, `TVGS`. Hỗ trợ 2 định dạng:<br>• Chuỗi phân tách: `CDT:pass1,PMU:pass2,TVGS:pass3`<br>• JSON object: `{"CDT":"pass1","PMU":"pass2","TVGS":"pass3"}`<br>Để trống hoặc không khai báo để chạy **Demo Mode**. |
| `PORT` | Tùy chọn | Cổng local dev server Express/Vite (mặc định `3000`). |
| `APP_URL` | Tùy chọn | URL triển khai ứng dụng (nếu dùng tích hợp ngoài). |

### 4.2. Client-side (`VITE_*` — Tùy chọn cho môi trường Hybrid Local)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `VITE_FASTAPI_BASE_URL` | `http://127.0.0.1:8000/api/v1` | URL tới FastAPI + PostgreSQL 16 Backend nội bộ. |
| `VITE_LOCAL_SCANNER_URL` | `http://127.0.0.1:8008/api/local` | URL tới Local PDF Scanner & VietOCR Sidecar nội bộ. |

### 4.3. Biến Backend Nội bộ (`LEX_PMO_OS_v3.0_SSOT_Project`, tham khảo khi chạy Local Stack)
- FastAPI / PostgreSQL (`03_BACKEND_DATABASE/`): `DATABASE_URL`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_SHEET_ID`, `DRIVE_ROOT_FOLDER_ID`.
- VietOCR Sidecar (`04_DESKTOP_TAURI/`): `GEMINI_API_KEY`.
- NotebookLM MCP (`07_AI_SKILLS_PROMPTS/`): `NOTEBOOKLM_COLLECTION_LEGAL`, `NOTEBOOKLM_COLLECTION_AI`, `NOTEBOOKLM_COLLECTION_REF`.

---

## 5. Cài đặt, Kiểm thử & Triển khai Vercel

### Chạy phát triển cục bộ (Local Full-Stack Dev)
```bash
cp .env.example .env
npm install
npm run dev
```
Mở `http://localhost:3000` (Express `server.ts` tự động gắn Vite middleware và điều phối `/api/*` tới đúng các handler trong `api/`).

### Kiểm tra kiểu, Build Production & Chạy Smoke Tests
```bash
npx tsc --noEmit
npm run build
npx tsx --test tests/api-smoke.test.ts
```

### Triển khai lên Vercel
1. Kết nối repository GitHub `tranvodaison-bot/Legal_2026` trên Vercel.
2. Giữ nguyên cấu hình build trong `vercel.json`:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Rewrites:** `"/((?!api/|templates/|assets/).*)" -> "/index.html"` (không chặn `/api/*`, `/templates/*`, `/assets/*`).
3. Thêm `GEMINI_API_KEY` và `ROLE_PASSCODES` trong **Vercel > Settings > Environment Variables**, sau đó Deploy.
4. Kiểm tra nhanh sau deploy:
   - `GET https://<your-domain>.vercel.app/api/health` → `200 OK`
   - `GET https://<your-domain>.vercel.app/api/verify-role` → `200 OK` (`protected: true` nếu đã đặt `ROLE_PASSCODES`)
   - `GET https://<your-domain>.vercel.app/templates/mau_danh_muc_vbpl_3truc.csv` → `200 OK` (tải trực tiếp file CSV, không trả HTML SPA).

# QUY CHUẨN QUẢN TRỊ XƯỞNG BUILD APP & ĐIỀU PHỐI AI AGENTS (`SOP-BUILDING-APP v2.4` & `SOP-COBUILD-V1.0`)

### Áp dụng cho toàn bộ `E:\4. AI_PROJECT`, GitHub Code SSOT, Google Drive SSOT và hệ sinh thái AI Agents (Gemini Nhiệm vụ / Cloud Builder, Google AI Studio, Google Antigravity, Claude Code, OpenAI Codex, Hermes)

> **Nguồn hợp nhất:** Master Framework V2.3 (AI Software Governance, Continuous Learning, Hardness & Anti-Hallucination) + Đặc tả Chuẩn hóa Tên Văn bản & Metadata `REG_Master` (`LEGAL`) + Kiến trúc Điều phối PDCA Dual-SSOT (Google Drive & GitHub) + Giao thức Giao dịch Liên kết Song hành `SOP-COBUILD-V1.0` giữa Gemini và Antigravity qua GitHub.

## 1. VỊ TRÍ & ĐỊNH VỊ KIẾN TRÚC DUAL-SSOT

Hệ sinh thái phát triển phần mềm vận hành theo nguyên tắc **Hai nguồn chân lý (Dual SSOT)** tách bạch giữa Tri thức/Tài liệu và Mã nguồn/Phiên bản:

1. **Google Drive & Phân vùng Local (`E:\`) — Document & Resource SSOT:**

   * **`E:\1_Tai_nguyen\`**: Trung tâm Lưu trữ Tài nguyên, Bản đặc tả (Specs), Blueprints, Schemas, Prototypes, Media Assets, Công cụ Tham khảo (`App_Tools_Reference`) và **Kho Ứng dụng Tham khảo (`_Kho_App`)** — nơi tra cứu kiến trúc, thuật toán, CSDL và UI components cũ.

   * **`E:\2. AI_System\`**: Trung tâm Quản trị AI Models, Runtimes theo từng Agent (Antigravity, Claude, Codex, Hermes, NotebookLM) và AI Caches.

   * **`E:\3. Software\`**: Kho Lưu trữ Phần mềm Cài đặt & Bộ nhớ đệm Google Drive (`Cache Drive`).

   * **`E:\4. AI_PROJECT`**: Phân xưởng Phát triển Phần mềm Tập trung Mới — không gian làm việc local đồng bộ trực tiếp với GitHub Repo.

   * **`E:\5. Automation_AI`**: Phần mềm liên kết Zalo.

2. **GitHub Repository — Code SSOT, Single Transaction Bus & Release Gate:**

   * Lưu trữ toàn bộ mã nguồn sạch, migration scripts, test suites, `.cursorrules`, `.antigravity/rules.md`, `.docs/ARCHITECTURE.md` và Sổ cái điều phối giao dịch `.docs/AGENT_SYNC_LEDGER.md`.

   * Đóng vai trò **Trạm Trung Chuyển Giao Dịch Duy Nhất (Single Transaction Bus)** để **Gemini (`AGENT_GEMINI_CLOUD`)** và **Google Antigravity (`AGENT_ANTIGRAVITY_LOCAL`)** thay phiên hoặc đồng thời BUILD phần mềm, kết hợp cổng kiểm soát chất lượng tự động (Pull Request + GitHub Actions CI) trước khi hợp nhất vào nhánh chính `main`.

## 2. TUYÊN NGÔN BẤT BIẾN & 6 MỆNH LỆNH THỰC THI (MASTER FRAMEWORK V2.3)

> **"AI được phép không biết, không được phép giả vờ biết. AI được phép đề xuất, không được phép biến giả định thành sự thật. AI chỉ được xác nhận một công việc đã hoàn thành khi tồn tại bằng chứng kiểm chứng được."**

1. **Không biết thì nói không biết:** Khi thiếu chứng cứ hoặc dữ liệu nguồn không đầy đủ, bắt buộc phải trình bày rõ giới hạn, yêu cầu người dùng xác minh hoặc trả lời `ABSTAIN`/`ESCALATE`; tuyệt đối không được bịa đặt.

2. **Không đổi giả định thành dữ kiện:** Phân loại rõ ràng 5 nhóm thông tin: *Dữ kiện đã xác minh*, *Suy luận logic*, *Giả định*, *Phương án đề xuất* và *Khuyến nghị*. Cấm tự bịa căn cứ pháp luật, số hiệu điều khoản, số liệu dự toán hoặc kết quả chạy công cụ.

3. **Không tuyên bố hoàn thành khi chưa có bằng chứng:** Các trạng thái `TEST PASS`, `FILE CREATED`, `DEPLOYED`, `BACKUP OK`, `FIXED`, `PR MERGED` bắt buộc phải kèm theo log thực thi thực tế, đường dẫn file tuyệt đối hoặc mã băm SHA-256 / commit hash. Không có bằng chứng đánh dấu ngay `NOT_RUN` / `UNVERIFIED`.

4. **Dữ liệu gốc là bất khả xâm phạm (Immutable Primary Source):** Mọi thao tác làm sạch, OCR, chuyển đổi Markdown, trích xuất JSON, vector embeddings đều là lớp dẫn xuất (Derived Layer). Tuyệt đối cấm xóa, ghi đè hoặc làm biến dạng tệp nguồn gốc khi chưa có quy trình phê duyệt và phương án hoàn tác (Rollback).

5. **Không tự nâng cấp tri thức chưa kiểm chứng:** Chỉ những bài học/quy tắc đã vượt qua bài thử đối kháng (Hardness), có kiểm thử hồi quy và phê duyệt mới được nạp vào bộ nhớ chuẩn (`.cursorrules` / `ARCHITECTURE.md` / Drive SSOT); phản hồi của AI chưa qua kiểm định chỉ là bản nháp (`DRAFT`).

6. **Không tự vượt cơ chế bảo vệ:** Khi phát hiện rủi ro nghiêm trọng hoặc vi phạm lằn ranh đỏ, AI phải dừng lại (`STOP`), chặn thực thi (`BLOCK`) hoặc trình phê duyệt (`ESCALATE`), không được tự ý giảm mức rủi ro để lách qua Quality Gates.

## 3. QUY TRÌNH PDCA & MA TRẬN PHÂN VAI AI AGENTS

Mọi dự án hoặc tính năng mới trong `E:\4. AI_PROJECT` bắt buộc chạy theo vòng lặp khép kín 4 pha **PDCA** dưới đây:

### Pha 1: PLAN — Kiến trúc & Đặc tả (Gemini Nhiệm vụ)

* **Nhiệm vụ:** Đọc cấu trúc GitHub Repo hiện tại (`schema.sql`, `ARCHITECTURE.md`, `.docs/AGENT_SYNC_LEDGER.md`) và tài nguyên `E:\1_Tai_nguyen\`. Chốt bài toán theo 4 bước:

  1. *Mục đích (Purpose):* Giải quyết bài toán cốt tử nào cho Chủ đầu tư / Ban Điều hành?

  2. *Phạm vi (Scope):* Tách bạch MVP và tính năng mở rộng.

  3. *Đặc tả kỹ thuật (Specs):* Stack (ưu tiên Next.js / React + Vite, TypeScript, Tailwind CSS, PostgreSQL), kiến trúc 4 tầng (Đạo - Pháp - Thuật - Khí), Database Schema chuẩn hóa (tích hợp khóa ngoại `Doc_ID`, `FK_Bang_QLHD`, `FK_Thu_Vien_KT821` nếu liên quan pháp lý), phân quyền **RBAC/RLS & Bất kiêm nhiệm (SoD)** chặt chẽ và **Audit Log (`audit_event`)** bất biến.

  4. *Lộ trình (Roadmap):* Chia Milestones có tiêu chí nghiệm thu (Acceptance Criteria).

* **Đầu ra bắt buộc (Gate P1):** Tài liệu PRD + Schema + Sổ cái phân ca `.docs/AGENT_SYNC_LEDGER.md` + Bộ Prompt bàn giao cho AI Studio và Antigravity.

### Pha 2: DO (UI Prototype) — Tạo mẫu trải nghiệm (Google AI Studio)

* **Nhiệm vụ:** Dựng nhanh giao diện trực quan (mock data) để Chủ đầu tư duyệt bố cục và luồng thao tác trước khi nối Backend thật.

* **Chọn Model:**

  * `gemini-4-hydrogen` (`High`): Dựng nhanh layout, component Tailwind, biểu mẫu.

  * `gemini-4-argon`: Dùng khi màn hình có logic tính toán phức tạp (bù giá, lũy kế thanh toán, bảng tổng hợp).

* **Đầu ra bắt buộc (Gate P2):** Mã mẫu giao diện đưa vào thư mục tham chiếu (`docs/prototypes/`) trên nhánh phụ GitHub; **cấm đẩy thẳng vào `main`**.

### Pha 3: DO (Production Co-Build) & CHECK — Thực thi Song hành / Thay phiên & Kiểm toán (Gemini Cloud ⇄ Google Antigravity + GitHub)

* **Quy tắc GitHub bắt buộc (Vibe Coding Safety):**

  * Khóa nhánh `main` (Branch Protection). Mọi thao tác code chạy trên nhánh giao dịch của Gemini (`gem/<loai>-<ten>`) hoặc nhánh giao dịch của Antigravity (`ag/<loai>-<ten>`).

  * **Checkpoint Commit:** Sau mỗi bước nhỏ chạy ổn định, agent thực thi phải tạo commit chuẩn định danh (`[GEMINI][TX-xx] ...` hoặc `[AG:<Model>][TX-xx] ...`) để có điểm rollback tức thì.

* **Ma trận phân bổ Model giữa Gemini Cloud và Antigravity:**

| Chủ thể / Model | Vai trò & Cơ chế | Thinking Level | Nhiệm vụ PDCA & Nhánh GitHub |
| :--- | :--- | :--- | :--- |
| **Gemini (`AGENT_GEMINI_CLOUD`)** | Tổng Công Trình Sư kiêm Cloud Builder trên GitHub Web; thiết kế & kiểm toán độc lập | Cao nhất (Task Mode) | Nhánh `gem/*`: Schema/Migration SQL (`public/sql/`), Core Engines (`src/core/`), Danh mục chuẩn (`src/data/`), `.cursorrules`, CI/CD, `.docs/` & Kiểm toán chéo PR |
| **Orchestrator (Carbon)** | Carbon lập kế hoạch & review bảo mật; Hydrogen viết code & chạy test | Cố định (AI Ultra) | Nhánh `ag/core-*`: DB Persistence, Auth, RBAC/RLS/SoD, Hợp đồng, Thanh quyết toán |
| **Orchestrator (Argon)** | Argon lập kế hoạch & kiểm tra logic; Hydrogen thực thi code | Cố định (AI Pro/Ultra) | Nhánh `ag/feat-*`: CRUD, Wizard nhập liệu 3 bước, Trình đọc A4, WBS, Báo cáo |
| **Gemini 4 Hydrogen** | Thực thi tốc độ cao, ngữ cảnh 1M token | `Low` / `Medium` | Nhánh `ag/ui-*`: Sửa UI, chỉnh Tailwind, tạo Checkpoint Commit |
| **Gemini 4 Hydrogen** | Suy luận sâu cho sửa lỗi & kiểm thử | `High` / `Extra (xhigh)` | Nhánh `ag/test-*` / `ag/hotfix-*`: Viết Unit/Contract Test, chạy `tsc --noEmit`, debug cục bộ |
| **Gemini 4 Carbon / Argon + Gemini Cloud** | Kiểm toán độc lập chuyên sâu (hoặc `/swarm`) | `High` | **Cổng CHECK:** Rà soát chéo RLS, sai số tài chính, `audit_event`, chặn cứng `BLOCKED_P0` trước khi Merge PR |

* **Đầu ra bắt buộc (Gate P3 — GitHub PR Gate):** GitHub Actions CI (`tsc --noEmit`, `eslint`, unit test, migration rollback check) đạt xanh + Kiểm toán chéo giữa Gemini và Antigravity xác nhận không có lỗi bảo mật/dữ liệu mới được Merge vào `main`.

### Pha 4: ACT — Chuẩn hóa Tri thức & Đóng gói (Gemini Nhiệm vụ + GitHub + Drive SSOT)

* **Nhiệm vụ:**

  1. Đánh **Git Tag / Release** (`v1.x.x` / `v2.x.x-production`) trên GitHub sau khi nghiệm thu.

  2. Đúc kết các lỗi thực tế từ Pha 3 thành quy tắc cứng trong `.cursorrules`, `.antigravity/rules.md` và `.docs/ARCHITECTURE.md` của repo.

  3. Đồng bộ tài liệu đặc tả phiên bản mới lên **Google Drive SSOT** và NotebookLM / Gem để làm đầu vào cho vòng lặp PLAN kế tiếp.

## 4. BỘ 4 NGUYÊN TẮC BẮT BUỘC KHI PHÁT TRIỂN PHẦN MỀM MỚI

1. **Đặc tả trước khi Code:** Cấm tuyệt đối mở Antigravity hoặc đẩy code sản xuất khi chưa có Gate P1 (PRD + Schema).

2. **Khai phóng tài nguyên nội bộ & Kho tham khảo:** Luôn tra cứu `E:\1_Tai_nguyen\_Kho_App\`, kích hoạt các skill chuyên ngành (`pdca-build-app-orchestrator`, `ung-dung-dao-phap-thuat-khi`, `hop-dong-thi-cong-chu-dau-tu`, `kiem-toan-thanh-quyet-toan`, `pm-construction-cde-fidic`, `app-builder-enterprise`, `enterprise-governance-master`, `kiem-toan-chi-phi-dtxd`, `boq-master-vn`, `internal-audit-vn`, `boc-tach-pdf`, `nd30-sualoi`), dùng `/find-skills` và kiểm tra giấy phép mã nguồn mở (cấm GPL/AGPL vào bản thương mại khi chưa duyệt).

3. **Thực thi an toàn & Zero Regression:**

   * Bảo vệ CSDL sản xuất; mọi migration phải có script quay lui (Rollback Script).

   * Danh sách lệnh nguy hiểm phải hỏi trước: xóa file/thư mục, `git reset --hard`, `git push --force`, `DROP`/`TRUNCATE` database, đổi quyền hệ thống.

   * Cấm hard-code API Keys/Secrets; bắt buộc dùng `.env` và quét gitleaks trước khi commit.

4. **Definition of Done (DoD):** Chỉ đóng milestone khi Pass 100% test, CI xanh trên GitHub, tài liệu và sổ cái `.docs/AGENT_SYNC_LEDGER.md` cập nhật đầy đủ, không tạo file `.bat` launcher rác hoặc mã trùng lặp.

## 5. CHÍNH SÁCH CHỐNG ẢO GIÁC THỐNG NHẤT (ANTI-HALLUCINATION AH-01 ĐẾN AH-10)

| Mã | Quy tắc | Điều kiện thực thi | Kết quả nếu vi phạm |
| :--- | :--- | :--- | :--- |
| **AH-01** | **Evidence First** | Phân biệt dữ kiện từ nguồn, suy luận, giả thuyết, kiến nghị; yêu cầu chứng cứ cho kết luận thực chứng quan trọng | `INSUFFICIENT_EVIDENCE` |
| **AH-02** | **Claim-Level Grounding** | Mỗi nhận định trọng yếu gắn tối thiểu một `source_anchor` hoặc bằng chứng thực thi | `UNSUPPORTED_CLAIM` |
| **AH-03** | **Source Authority & Validity** | Gắn cơ quan ban hành, loại nguồn, phiên bản, ngày ban hành/hiệu lực; không tự suy đoán từ số hiệu | `SOURCE_UNVERIFIED` |
| **AH-04** | **Citation Integrity** | Anchor trỏ đúng file, hash, trang, dòng, điều khoản; cấm tự sinh trích dẫn không tồn tại | `CITATION_MISMATCH` |
| **AH-05** | **Uncertainty & Abstention** | Nêu rõ điều chưa xác minh; `ABSTAIN` khi thiếu nguồn, `ESCALATE` khi rủi ro cao | `ABSTAIN` / `ESCALATE` |
| **AH-06** | **Contradiction Detection** | Lưu cả hai nguồn xung đột; phân tích sai khác theo thời gian/thẩm quyền; cấm âm thầm chọn một | `CONFLICT_UNRESOLVED` |
| **AH-07** | **Numerical & Legal Verification** | Phép tính dùng công cụ deterministic; căn cứ pháp lý có phiên bản hiệu lực; cấm bịa công thức | `VALIDATION_FAILED` |
| **AH-08** | **Execution Truthfulness** | Chỉ báo `TEST PASS`, `FILE CREATED`, `DEPLOYED`, `PR MERGED` khi có log/hash/artifact thực tế | `NOT_RUN` / `UNVERIFIED` |
| **AH-09** | **Contamination Prevention** | Đầu ra AI chưa kiểm định chỉ là `DRAFT`; cấm tự ghi vào Approved Knowledge hoặc Legal Rules | `PROMOTION_BLOCKED` |
| **AH-10** | **Continuous Evaluation** | Chạy bộ kiểm thử hồi quy 10 tình huống chống ảo giác (`AH-T01` đến `AH-T10`) trước khi phát hành | `RELEASE_BLOCKED` |

## 6. CƠ CHẾ HARDNESS — 6 CHIỀU RỦI RO & BÀI THỬ ĐỐI KHÁNG

Mọi thay đổi có rủi ro phải được đánh giá qua 6 chiều Hardness (chấm điểm 0–5; ưu tiên theo mức max):

* **H1 — Bất định chứng cứ:** Thiếu, sai lệch, OCR mờ, văn bản mâu thuẫn?

* **H2 — Độ phức tạp phụ thuộc:** Thay đổi lan đến bao nhiêu module/bảng CSDL?

* **H3 — Trường hợp biên (Edge Cases):** Đầu vào cực lớn, ký tự Unicode lạ, xoay trang, trùng tên?

* **H4 — Tính đối kháng (Adversarial):** Có prompt injection, chỉ thị độc hại vượt quyền trong tài liệu?

* **H5 — Độ nghiêm trọng hậu quả:** Sai sót có gây mất dữ liệu, phạt vi phạm, xuất toán thuế?

* **H6 — Khả năng đảo ngược (Reversibility):** Thao tác có thể rollback/undo hoàn toàn không?

> **Critical Triggers (Chặn ngay lập tức không cần tính điểm):** Hành vi ghi đè/xóa nguồn; **push thẳng vào nhánh `main`, dùng `git push --force` ghi đè commit của Agent đối ứng hoặc bỏ qua GitHub PR/CI Gate**; đổi schema mất tương thích ngược; đổi quyền truy cập; quyết định tài chính/pháp lý không có căn cứ; backup chưa kiểm thử khôi phục. Trạng thái: `BLOCKED -> Trình Boss phê duyệt`.

## 7. QUY TẮC ĐẶT TÊN VĂN BẢN CHUẨN HÓA & METADATA RAG (`REG_Master v1.0`)

Mọi module xử lý tài liệu, OCR, AppSheet/Drive Vault và RAG trong xưởng build app bắt buộc tuân thủ cấu trúc tên tệp chuẩn hóa trích xuất từ bảng `REG_Master` (`LEGAL`):

```text
[LINH_VUC]_[LOAI_VB]_[SO_HIEU]_[NAM]_[TrichYeuPascalCase][-Phu_Luc].[duoi_tep]
```

* **LINH_VUC:** Mã lĩnh vực chuyên môn viết hoa (`XD`, `DD`, `DTH`, `PCCC`, `TC`, `MT`, `DTU`...).
* **LOAI_VB:** Mã loại văn bản viết hoa (`LUAT`, `ND`, `NQ`, `TT`, `QD`, `VBHN`...).
* **SO_HIEU:** Phần số hiệu chính trích từ số văn bản (bỏ hậu tố cơ quan như `/QH15`, `/NĐ-CP`), giữ nguyên chữ số (`112`, `178`, `31`, `254`, `135`...).
* **NAM:** 4 chữ số năm ban hành thực tế (`2025`, `2024`, `2026`...).
* **TrichYeuPascalCase:** Trích yếu nội dung viết liền **PascalCase không dấu**, cắt gọn tối đa ~40–45 ký tự (ví dụ: `XD_LUAT_135_2025_LuatXayDungNam2025QuyDinhToanDienHoatDon.pdf`, `DTH_ND_214_2025_QuyDinhChiTietMotSoDieuVaBienPhapThiHanh.pdf`).
* **Dấu phân cách:** Dùng dấu gạch dưới (`_`) giữa 5 thành phần chính, chỉ dùng dấu gạch ngang (`-`) cho hậu tố phụ lục (`-PL1`, `-P1`) nếu có.

### Chuẩn Metadata & Khóa ngoại RAG/CSDL bắt buộc (theo 33 cột `A:AG` của `REG_Master`)

Khi thiết kế bảng `legal_document` hoặc pipeline nạp tri thức AI/RAG, bắt buộc ánh xạ đủ các trường kiểm soát sau:
* **Định danh & Phả hệ:** `Doc_ID` (`DOC-001`..`DOC-188`), `Parent_Doc_ID (QA)`, `Loai_Quan_He_Phap_Ly`, `Chi_Tiet_Thay_The_Sua_Doi`.
* **Hiệu lực & Chuyển tiếp:** `Cấp bậc` (`L1 - Luật`, `L2 - Nghị định`...), `Ngày ban hành`, `Ngày hiệu lực`, `Tình trạng hiệu lực`, `Quy_Tac_Chuyen_Tiep_01_07_2026`.
* **Kiểm soát QA & RBAC:** `Kiểm tra đường dẫn (QA)`, `Kiểm tra định danh (QA)` (chứa cờ `BLOCKED_P0`), `Xác minh nguồn pháp lý (QA)`, `Don_Vi_Ap_Dung_RBAC`, `FK_Bang_QLHD`, `FK_Thu_Vien_KT821`, `Ma_GEM_Va_Trang_Thai_AI`.

## 8. BỘ QUY TẮC GIAO DỊCH LIÊN KẾT & PHỐI HỢP BUILD SONG HÀNH QUA GITHUB GIỮA GEMINI VÀ ANTIGRAVITY (`SOP-COBUILD-V1.0`)

### 8.1. Hai Chế Độ Vận Hành Linh Hoạt (Thay Phiên & Đồng Thời)

| Chế độ Phối hợp | Khi nào sử dụng | Cơ chế Phối hợp giữa Gemini & Antigravity | Cách Chống Xung Đột (Zero-Conflict) |
| :--- | :--- | :--- | :--- |
| **Chế độ 1: THAY PHIÊN (`RELAY` / Turn-Based)** | Khi thực hiện một luồng tính năng xuyên suốt hoặc khi Chủ đầu tư giao trọn gói từng chặng cho 1 công cụ. | **Ca 1 (Gemini):** Tạo nhánh `gem/<task>` trên GitHub Web, viết sẵn các file lõi (Migration SQL, Core Engine, API Contract, Rules, CI) và commit.<br>**Ca 2 (Antigravity):** Chạy `git fetch --all --prune && git checkout gem/<task> && git pull --rebase`, ghép nối UI React/Adapter, chạy `npm test` + `vite build` và push hoàn tất (hoặc ngược lại). | Chỉ có **01 Agent** giữ quyền ghi (`WRITE_LOCK`) trên nhánh tính năng tại một thời điểm; chuyển giao quyền qua sổ cái `.docs/AGENT_SYNC_LEDGER.md`. |
| **Chế độ 2: ĐỒNG THỜI (`PARALLEL` / Co-Build)** | Khi cần tăng tốc độ gấp đôi: vừa xây dựng Hạ tầng/Database/Tài liệu pháp lý vừa xây dựng Giao diện/Component cùng lúc. | **Gemini** làm việc trực tiếp trên nhánh `gem/<task>` trên GitHub Web.<br>**Antigravity** làm việc đồng thời trên nhánh `ag/<task>` dưới máy local `E:\`. | Áp dụng **Phân vùng Thư mục Cứng (Strict Directory Partitioning)** tại Mục 8.2 để 2 Agent không bao giờ sửa cùng 1 file tại cùng 1 thời điểm. |

### 8.2. Quy Ước Nhánh, Định Danh Commit & Phân Vùng Tệp Độc Quyền Khi Build Đồng Thời

| Thuộc tính Kiểm soát | Không gian của GEMINI (`AGENT_GEMINI_CLOUD`) | Không gian của ANTIGRAVITY (`AGENT_ANTIGRAVITY_LOCAL`) |
| :--- | :--- | :--- |
| **Tiền tố Nhánh GitHub** | `gem/core-*`, `gem/sql-*`, `gem/gov-*`, `gem/fix-*` | `ag/feat-*`, `ag/ui-*`, `ag/api-*`, `ag/test-*` |
| **Tiền tố Commit Message** | `[GEMINI][TX-xx] <type>(<scope>): <mô tả>` | `[AG:<Model>][TX-xx] <type>(<scope>): <mô tả>` |
| **Vùng Thư mục Ưu tiên khi Chạy Song Song (Exclusive Zones)** | 1. `public/sql/` (Schema & Migration PostgreSQL)<br>2. `src/core/engines/` & `src/core/entities/` (Thuật toán lõi)<br>3. `src/data/` & `data/legal-sheet/` (Danh mục `REG_Master`)<br>4. `.github/workflows/`, `.cursorrules`, `.antigravity/rules.md`<br>5. `.docs/` & `audit/` (Hồ sơ kiến trúc & báo cáo kiểm toán) | 1. `src/ui/` & `src/components/` (Giao diện React/Tailwind)<br>2. `src/modules/` (Các phân hệ nghiệp vụ & Drawer)<br>3. `src/hooks/` & `src/utils/`<br>4. `src/infrastructure/` (Adapter kết nối API/Storage)<br>5. `tests/` (Thực thi và mở rộng Unit/Contract Tests) |
| **Quy tắc cho 4 File Biên Dùng Chung (`server.ts`, `src/App.tsx`, `src/types/legal.ts`, `package.json`)** | Chỉ được sửa khi **Gemini** đang giữ cờ `SHARED_FILE_LOCK = GEMINI` trong sổ cái `.docs/AGENT_SYNC_LEDGER.md`. Khi không giữ khóa, Gemini tách code mới thành module độc lập để Antigravity import. | Chỉ được sửa khi **Antigravity** đang giữ cờ `SHARED_FILE_LOCK = ANTIGRAVITY`. Trước khi sửa phải chạy `git pull --rebase origin main`. |

### 8.3. Giao Thức Bắt Tay 5 Bước Chuẩn (`5-Step Transaction Handshake`)

Mỗi giao dịch (`TX-xx`) giữa Gemini và Antigravity bắt buộc đi qua đúng 5 bước khép kín:

1. **Bước 1 — Đồng bộ Đầu Ca (`1. SYN — Pre-Flight Sync`):**
   * **Với Gemini:** Đọc commit mới nhất và file `.docs/AGENT_SYNC_LEDGER.md` trên GitHub Repo để nắm chính xác những gì Antigravity vừa đẩy lên.
   * **Với Antigravity:** Trước khi đọc hoặc sửa bất kỳ file nào, bắt buộc chạy `git fetch --all --prune && git status` và đọc `.docs/AGENT_SYNC_LEDGER.md`. Nếu có commit mới từ Gemini trên nhánh đang làm việc, phải chạy `git pull --rebase` trước khi sửa code.
2. **Bước 2 — Chiếm Quyền Khóa & Tách Nhánh (`2. LOCK — Branch & Scope Isolation`):**
   * Kiểm tra các file sắp sửa không bị khóa bởi Agent đối ứng trong `.docs/AGENT_SYNC_LEDGER.md`, đăng ký `TX_ID` và chuyển sang nhánh định danh (`gem/*` hoặc `ag/*`).
3. **Bước 3 — Thực Thi Nguyên Tử & Băm Kiểm Chứng (`3. EXEC — Atomic Build`):**
   * Bảo toàn 100% bất biến dữ liệu (188 bản ghi `REG_Master` 33 cột, khóa cứng 6 mã `BLOCKED_P0`: `DOC-046`, `DOC-054`, `DOC-063`, `DOC-076`, `DOC-091`, `DOC-092`, băm SHA-256 chuẩn FIPS 180-4 và ghi `audit_event`).
4. **Bước 4 — Đóng Gói Bàn Giao Ca (`4. HANDOVER — Commit & Ledger Update`):**
   * **Với Antigravity:** Chạy `npm run lint && npm test && npm run build` xanh 100%, commit với tiền tố `[AG:<Model>][TX-xx]` và `git push origin <nhánh>`.
   * **Với Gemini:** Commit trực tiếp trên GitHub Web với tiền tố `[GEMINI][TX-xx]`, kích hoạt GitHub Actions CI.
   * Cập nhật dòng `TX-xx` trong `.docs/AGENT_SYNC_LEDGER.md` sang trạng thái `READY_FOR_HANDOVER` (kèm ghi chú bàn giao rõ ràng cho Agent kế tiếp) hoặc `READY_FOR_AUDIT`.
5. **Bước 5 — Kiểm Toán Chéo & Hợp Nhất Lên Production (`5. VERIFY & MERGE`):**
   * Áp dụng **Bất kiêm nhiệm chéo (Cross-Agent SoD)**: Code của Gemini do GitHub Actions CI / Antigravity kiểm thử biên dịch; Code của Antigravity do Gemini kiểm toán kiến trúc & bảo mật RBAC/RLS. Chỉ khi cả hai đạt `PASS` mới Merge vào `main` để kích hoạt Railway Production Deploy.

### 8.4. Cơ Chế Xử Lý Xung Đột & Cầu Dao Ngắt Mạch (`Circuit Breaker`)

* **Cấm tuyệt đối `git push --force`:** Nếu máy local của Antigravity lệch nhịp với commit của Gemini trên GitHub Web (`non-fast-forward`), Antigravity bắt buộc chạy chuỗi lệnh cứu hộ:
  ```bash
  git stash
  git pull --rebase origin <tên-nhánh>
  git stash pop
  ```
* **Cầu dao ngắt mạch (`Critical Stop Trigger`):** Dừng Merge ngay lập tức nếu tổng số bản ghi `REG_Master` tụt dưới 188 hoặc mất bất kỳ cột nào trong 33 cột `A:AG`, nếu `tests/contract.spec.ts` có bài test báo `FAIL`, hoặc nếu lộ khóa bí mật (`GEMINI_API_KEY`, `DATABASE_URL`) trong mã nguồn tĩnh.

import {
  FunctionalDomainCode,
  LegalDocument,
  ProjectArchetypeCode,
} from '../types/lexPmoTypes';

export type NotebookLmCollectionCode = 'LEGAL' | 'AI' | 'THAM_KHAO';

export interface NotebookLmEntry {
  id: string;
  code: string;
  collection: NotebookLmCollectionCode;
  title: string;
  shortTitle: string;
  description: string;
  defaultUrl: string;
  linkedDomains: FunctionalDomainCode[];
  linkedGates: string[];
  matchedDocIds: string[];
  projectArchetypes?: ProjectArchetypeCode[];
  sampleKeywords: string[];
}

export const DEFAULT_NOTEBOOK_LM_URL = 'https://notebook.google.com/';
export const NOTEBOOK_LM_STORAGE_KEY = 'lex_pmo_notebooklm_urls_v1';

export const NOTEBOOK_LM_COLLECTION_META: Record<
  NotebookLmCollectionCode,
  {
    code: NotebookLmCollectionCode;
    label: string;
    badgeCount: string;
    description: string;
    badgeClass: string;
  }
> = {
  LEGAL: {
    code: 'LEGAL',
    label: 'Bộ sưu tập LEGAL (14 Sổ Pháp lý Chuyên đề)',
    badgeCount: '14 sổ',
    description:
      'Kho tri thức Deep-RAG toàn văn Luật Xây dựng 135/2025, cụm Nghị định 206–210/2026, Luật Đấu thầu 22/2023, QCVN/TCVN và pháp lý chuyên ngành dự án.',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
  },
  AI: {
    code: 'AI',
    label: 'Bộ sưu tập AI (5 Sổ Công nghệ & Tự động hóa)',
    badgeCount: '5 sổ',
    description:
      'Kho tri thức kỹ thuật về Kiến trúc Multi-Agent, MCP Protocol, Vibe Coding Playbook, OCR Tiếng Việt 4 vùng và tự động hóa BIM/Dynamo.',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50',
  },
  THAM_KHAO: {
    code: 'THAM_KHAO',
    label: 'Bộ sưu tập Tham Khảo (Sổ đệm Biểu mẫu & Quy trình)',
    badgeCount: 'Sổ đệm',
    description:
      'Sổ đệm phục vụ bóc tách biểu mẫu nghiệm thu, quy trình nội bộ, hồ sơ mời thầu và tài liệu mới nạp cần kiểm chứng nhanh.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  },
};

export const NOTEBOOK_LM_CATALOG: NotebookLmEntry[] = [
  // ==========================================================================
  // 1. BỘ SƯU TẬP LEGAL (14 SỔ CHUYÊN ĐỀ PHÁP LÝ DỰ ÁN XÂY DỰNG)
  // ==========================================================================
  {
    id: 'NBLM-LEG-01',
    code: 'LEGAL-01',
    collection: 'LEGAL',
    title: 'Sổ 01 — Luật Xây dựng 135/2025/QH15 & Luật sửa đổi 62/2020/QH14',
    shortTitle: 'LEGAL-01: Luật Xây dựng 135/2025',
    description:
      'Toàn văn Luật Xây dựng 135/2025/QH15, bảng đối chiếu điều khoản sửa đổi và điều khoản chuyển tiếp từ Luật Xây dựng 2014/2020.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['HDXD', 'DTU'],
    linkedGates: ['G0', 'G1', 'G5', 'G6', 'G7', 'G8'],
    matchedDocIds: ['DOC-135', 'DOC-LXD-2014'],
    sampleKeywords: ['Điều khoản chuyển tiếp Luật Xây dựng 135/2025', 'Phân loại dự án và thẩm quyền thẩm định BCNCKT'],
  },
  {
    id: 'NBLM-LEG-02',
    code: 'LEGAL-02',
    collection: 'LEGAL',
    title: 'Sổ 02 — Nghị định Quản lý Dự án Đầu tư Xây dựng (209/2026/NĐ-CP & 175/2024/NĐ-CP)',
    shortTitle: 'LEGAL-02: NĐ Quản lý Dự án 209/2026 & 175/2024',
    description:
      'Quy định chi tiết về lập, thẩm định, phê duyệt dự án, thiết kế xây dựng triển khai sau TKCS, giấy phép xây dựng và năng lực hoạt động xây dựng.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['HDXD', 'DTU'],
    linkedGates: ['G5', 'G6', 'G7', 'G8', 'G10'],
    matchedDocIds: ['DOC-209', 'DOC-04', 'DOC-15'],
    sampleKeywords: ['Thẩm định TKBVTC tại cơ quan chuyên môn về xây dựng', 'Điều kiện miễn giấy phép xây dựng theo NĐ 209/2026 và NĐ 175/2024'],
  },
  {
    id: 'NBLM-LEG-03',
    code: 'LEGAL-03',
    collection: 'LEGAL',
    title: 'Sổ 03 — Quản lý Chất lượng, Thi công & Bảo trì Công trình (207/2026/NĐ-CP & 06/2021/NĐ-CP)',
    shortTitle: 'LEGAL-03: Quản lý Chất lượng 207/2026 & 06/2021',
    description:
      'Quy trình nghiệm thu vật liệu, công việc, giai đoạn, hoàn thành công trình đưa vào sử dụng, Nhật ký thi công Phụ lục IIa và kiểm tra của Hội đồng/Cơ quan chuyên môn.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QLCL', 'VLXD'],
    linkedGates: ['G11', 'G12', 'G14', 'G15'],
    matchedDocIds: ['DOC-207', 'DOC-01'],
    sampleKeywords: ['Nhật ký thi công điện tử Phụ lục IIa Điều 15 NĐ 207/2026', 'Trình tự nghiệm thu công việc xây dựng Điều 21 NĐ 06/2021'],
  },
  {
    id: 'NBLM-LEG-04',
    code: 'LEGAL-04',
    collection: 'LEGAL',
    title: 'Sổ 04 — Quản lý Chi phí Đầu tư Xây dựng & Định mức (206/2026/NĐ-CP & 10/2021/NĐ-CP)',
    shortTitle: 'LEGAL-04: Quản lý Chi phí 206/2026 & 10/2021',
    description:
      'Tổng mức đầu tư, dự toán xây dựng, định mức dự toán Thông tư 11–12/2021/TT-BXD, quản lý dự phòng phí và điều chỉnh dự toán.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QLCP'],
    linkedGates: ['G5', 'G7', 'G11', 'G13', 'G14'],
    matchedDocIds: ['DOC-206', 'DOC-03', 'DOC-TT11-BXD'],
    sampleKeywords: ['Cơ cấu tổng mức đầu tư và thẩm quyền điều chỉnh dự toán NĐ 206/2026', 'Sử dụng chi phí dự phòng cho khối lượng phát sinh'],
  },
  {
    id: 'NBLM-LEG-05',
    code: 'LEGAL-05',
    collection: 'LEGAL',
    title: 'Sổ 05 — Hợp đồng Xây dựng, Tạm ứng, Thanh toán & VO (210/2026/NĐ-CP & VBHN 37/2015–50/2021)',
    shortTitle: 'LEGAL-05: Hợp đồng Xây dựng 210/2026 & 37/2015',
    description:
      'Quản lý thực hiện hợp đồng xây dựng, bảo lãnh tạm ứng/thực hiện HĐ, hồ sơ thanh toán IPC và quy trình phê duyệt phát sinh VO.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QLHD', 'TQT'],
    linkedGates: ['G10', 'G11', 'G13', 'G14', 'G15'],
    matchedDocIds: ['DOC-210', 'DOC-02'],
    sampleKeywords: ['Điều chỉnh khối lượng phát sinh ngoài phạm vi hợp đồng trọn gói Điều 37', 'Thu hồi tạm ứng và bảo lãnh thực hiện hợp đồng NĐ 210/2026'],
  },
  {
    id: 'NBLM-LEG-06',
    code: 'LEGAL-06',
    collection: 'LEGAL',
    title: 'Sổ 06 — Luật Đấu thầu 22/2023/QH15 & Nghị định 24/2024/NĐ-CP Lựa chọn Nhà thầu',
    shortTitle: 'LEGAL-06: Đấu thầu 22/2023 & NĐ 24/2024',
    description:
      'Kế hoạch lựa chọn nhà thầu (KHLCNT), E-HSMT, đánh giá E-HSDT, thương thảo và ký kết hợp đồng gói thầu xây lắp/tư vấn/EPC.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['DTH'],
    linkedGates: ['G9', 'G10'],
    matchedDocIds: ['DOC-07', 'DOC-ND24-DTH'],
    sampleKeywords: ['Lập và phê duyệt KHLCNT theo Luật Đấu thầu 22/2023', 'Xử lý tình huống trong đấu thầu Nghị định 24/2024/NĐ-CP'],
  },
  {
    id: 'NBLM-LEG-07',
    code: 'LEGAL-07',
    collection: 'LEGAL',
    title: 'Sổ 07 — Hệ thống Quy chuẩn (QCVN) & Tiêu chuẩn Kỹ thuật Quốc gia (TCVN)',
    shortTitle: 'LEGAL-07: Bộ Quy chuẩn QCVN & TCVN Kỹ thuật',
    description:
      'QCVN 01:2021/BXD (Quy hoạch), QCVN 06:2022/BXD (An toàn cháy), QCVN 16:2023/BXD (Hợp quy VLXD), TCVN 4453:1995 (Bê tông cốt thép), TCVN 9398:2012 (Trắc địa).',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QCVN', 'TCVN', 'VLXD', 'QLCL'],
    linkedGates: ['G2', 'G4', 'G7', 'G12', 'G14'],
    matchedDocIds: ['DOC-QCVN-16', 'DOC-QCVN-06', 'DOC-TCVN-4453', 'DOC-TCVN-9398'],
    sampleKeywords: ['Chứng nhận hợp quy VLXD nhóm 2 theo QCVN 16:2023/BXD', 'Dung sai nghiệm thu kết cấu bê tông cốt thép TCVN 4453:1995'],
  },
  {
    id: 'NBLM-LEG-08',
    code: 'LEGAL-08',
    collection: 'LEGAL',
    title: 'Sổ 08 — Pháp lý Khu Công Nghiệp, Khu Kinh Tế & Cụm Công Nghiệp (NĐ 35/2022 & NĐ 32/2024)',
    shortTitle: 'LEGAL-08: Pháp lý KCN (NĐ 35) & CCN (NĐ 32)',
    description:
      'Quản lý đầu tư hạ tầng KCN/KKT theo cơ chế Một cửa tại chỗ (Ban Quản lý KCN) và thành lập/mở rộng Cụm công nghiệp.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['DTU', 'QHDD'],
    linkedGates: ['G0', 'G1', 'G2', 'G3', 'G5'],
    matchedDocIds: ['DOC-05', 'DOC-32'],
    projectArchetypes: ['KCN', 'CCN'],
    sampleKeywords: ['Thẩm quyền một cửa tại chỗ của Ban Quản lý KCN theo NĐ 35/2022', 'Điều kiện lựa chọn chủ đầu tư hạ tầng kỹ thuật CCN theo NĐ 32/2024'],
  },
  {
    id: 'NBLM-LEG-09',
    code: 'LEGAL-09',
    collection: 'LEGAL',
    title: 'Sổ 09 — Pháp lý Khu Thương Mại Tự Do (FTZ), Kho Ngoại Quan & Hải Quan Số',
    shortTitle: 'LEGAL-09: Khu Thương Mại Tự Do (FTZ) & Hải quan',
    description:
      'Tiêu chuẩn hàng rào cứng cách ly, hệ thống giám sát hải quan tự động 24/7, luồng зеленый logistics và cơ chế đặc thù FTZ.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['DTU', 'QHDD', 'HDXD'],
    linkedGates: ['G0', 'G2', 'G5', 'G12', 'G14'],
    matchedDocIds: ['DOC-HQ-FTZ'],
    projectArchetypes: ['FTZ'],
    sampleKeywords: ['Điều kiện kiểm tra giám sát hải quan đối với Khu Thương mại Tự do FTZ', 'Hạ tầng hàng rào cứng và cổng kiểm soát tự động kho ngoại quan'],
  },
  {
    id: 'NBLM-LEG-10',
    code: 'LEGAL-10',
    collection: 'LEGAL',
    title: 'Sổ 10 — Đầu tư Đối tác Công Tư (Luật PPP, NĐ 35/2021 & Hợp đồng BOT/BT)',
    shortTitle: 'LEGAL-10: Đầu tư PPP & Hợp đồng BOT/BT',
    description:
      'Lập, thẩm định BCNCKT dự án PPP, lựa chọn nhà đầu tư, cơ chế chia sẻ doanh thu và kiểm toán quyết toán vốn đầu tư dự án PPP/BT.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['DTU', 'QLHD', 'TQT'],
    linkedGates: ['G0', 'G1', 'G5', 'G10', 'G15'],
    matchedDocIds: ['DOC-35PPP'],
    projectArchetypes: ['PPP_BT'],
    sampleKeywords: ['Thẩm quyền phê duyệt điều chỉnh chủ trương và hợp đồng dự án PPP', 'Kiểm toán quyết toán giá trị công trình dự án BOT/BT'],
  },
  {
    id: 'NBLM-LEG-11',
    code: 'LEGAL-11',
    collection: 'LEGAL',
    title: 'Sổ 11 — Luật Đất đai 31/2024/QH15, Luật Nhà ở 2023 & Luật Kinh doanh BĐS 2023',
    shortTitle: 'LEGAL-11: Đất đai 2024, Nhà ở & KDBĐS 2023',
    description:
      'Giao đất, cho thuê đất, chuyển mục đích sử dụng đất, định giá đất, điều kiện đưa bất động sản hình thành trong tương lai vào kinh doanh.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QHDD', 'DTU'],
    linkedGates: ['G0', 'G1', 'G2', 'G14'],
    matchedDocIds: ['DOC-DATDAI-2024', 'DOC-KDBDS-2023'],
    projectArchetypes: ['DAN_DUNG', 'KCN'],
    sampleKeywords: ['Điều kiện giao đất cho thuê đất thực hiện dự án theo Luật Đất đai 2024', 'Điều kiện nghiệm thu hạ tầng kỹ thuật trước khi chuyển nhượng/bán nhà ở'],
  },
  {
    id: 'NBLM-LEG-12',
    code: 'LEGAL-12',
    collection: 'LEGAL',
    title: 'Sổ 12 — Phòng cháy Chữa cháy (NĐ 50/2024/NĐ-CP), Môi trường (ĐTM/GPMT) & ATLĐ',
    shortTitle: 'LEGAL-12: PCCC (NĐ 50/2024), ĐTM & ATLĐ',
    description:
      'Thẩm duyệt thiết kế và nghiệm thu PCCC tại PC07/C07, Báo cáo đánh giá tác động môi trường (ĐTM), Giấy phép môi trường và an toàn thi công.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['PCCC', 'ATLD', 'QHDD'],
    linkedGates: ['G3', 'G4', 'G8', 'G12', 'G14'],
    matchedDocIds: ['DOC-PCCC-50'],
    sampleKeywords: ['Danh mục dự án công trình thuộc diện thẩm duyệt thiết kế về PCCC NĐ 50/2024', 'Văn bản chấp thuận kết quả nghiệm thu về PCCC trước khi đưa vào sử dụng'],
  },
  {
    id: 'NBLM-LEG-13',
    code: 'LEGAL-13',
    collection: 'LEGAL',
    title: 'Sổ 13 — Thanh quyết toán Vốn đầu tư (NĐ 99/2021), Hóa đơn điện tử (NĐ 70/2025) & KTNN',
    shortTitle: 'LEGAL-13: Quyết toán Vốn, HĐĐT 70/2025 & KTNN',
    description:
      'Quy trình kiểm soát thanh toán, quyết toán dự án hoàn thành, thời điểm lập hóa đơn điện tử xây dựng lắp đặt và chuẩn mực Kiểm toán Nhà nước.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['TQT', 'QLCP', 'QLHD'],
    linkedGates: ['G13', 'G14', 'G15'],
    matchedDocIds: ['DOC-08', 'DOC-HD-123', 'DOC-TKT-KTNN'],
    sampleKeywords: ['Thời điểm lập hóa đơn điện tử đối với hoạt động xây dựng lắp đặt NĐ 70/2025', 'Hồ sơ trình thẩm tra phê duyệt quyết toán vốn đầu tư dự án hoàn thành'],
  },
  {
    id: 'NBLM-LEG-14',
    code: 'LEGAL-14',
    collection: 'LEGAL',
    title: 'Sổ 14 — Lộ trình Áp dụng BIM Bắt buộc (TT 12/2025), CDE ISO 19650 & Chữ ký số CA',
    shortTitle: 'LEGAL-14: Lộ trình BIM TT 12/2025 & CDE ISO 19650',
    description:
      'Quy định áp dụng Mô hình thông tin công trình (BIM) bắt buộc cho công trình cấp I, cấp II, quy trình môi trường dữ liệu chung CDE và ký số pháp lý.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['HDXD', 'QLCL', 'TCVN'],
    linkedGates: ['G5', 'G7', 'G11', 'G12', 'G15'],
    matchedDocIds: ['DOC-BIM-12'],
    sampleKeywords: ['Lộ trình áp dụng BIM bắt buộc đối với dự án nhóm A, B và công trình cấp I, II', 'Yêu cầu dữ liệu mô hình BIM nộp kèm hồ sơ thẩm định và hoàn công'],
  },

  // ==========================================================================
  // 2. BỘ SƯU TẬP AI (5 SỔ CHUYÊN ĐỀ KIẾN TRÚC & TỰ ĐỘNG HÓA AI)
  // ==========================================================================
  {
    id: 'NBLM-AI-01',
    code: 'AI-01',
    collection: 'AI',
    title: 'Sổ AI 01 — Kiến trúc Hệ thống Multi-Agent & Orchestration Pháp lý Xây dựng',
    shortTitle: 'AI-01: Kiến trúc Multi-Agent Pháp lý',
    description:
      'Thiết kế hệ thống 5 tác nhân AI chuyên biệt (Ingestor, Cross-Exam, Blueprint, Site Copilot, Forensic Auditor) và cơ chế phối hợp 3 Trục.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['HDXD', 'QLCL'],
    linkedGates: ['G0', 'G12', 'G15'],
    matchedDocIds: [],
    sampleKeywords: ['Thiết kế System Prompt cho Multi-Agent đối soát chéo pháp lý xây dựng', 'Cơ chế chống ảo giác (Grounded Citation) khi trích dẫn điều khoản luật'],
  },
  {
    id: 'NBLM-AI-02',
    code: 'AI-02',
    collection: 'AI',
    title: 'Sổ AI 02 — Model Context Protocol (MCP) & Hybrid SSOT Bridge (:8000 / :8008)',
    shortTitle: 'AI-02: MCP Protocol & Hybrid SSOT Bridge',
    description:
      'Chuẩn kết nối MCP Server, đồng bộ giữa React Frontend, FastAPI Backend (:8000) và Local PDF Scanner Sidecar (:8008).',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['HDXD', 'TQT'],
    linkedGates: ['G1', 'G14'],
    matchedDocIds: [],
    sampleKeywords: ['Cấu hình MCP Tool cho phép AI Agent truy vấn trực tiếp CSDL SSOT', 'Kiến trúc Hybrid Fallback giữa Cloud Preview và Local Sidecar'],
  },
  {
    id: 'NBLM-AI-03',
    code: 'AI-03',
    collection: 'AI',
    title: 'Sổ AI 03 — Vibe Coding Playbook & Clean Architecture cho Enterprise PMO',
    shortTitle: 'AI-03: Vibe Coding Playbook & Clean Arch',
    description:
      'Quy chuẩn tách biệt tầng giao diện (Steps/Layout), tầng dịch vụ (Bridge Service), kiểm soát chất lượng TypeScript và bảo mật API.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QLHD', 'QLCP'],
    linkedGates: ['G5', 'G11'],
    matchedDocIds: [],
    sampleKeywords: ['Chuẩn Clean Architecture cho ứng dụng quản trị dự án quy mô lớn', 'Checklist kiểm định bảo mật Input Validation và RBAC RACI'],
  },
  {
    id: 'NBLM-AI-04',
    code: 'AI-04',
    collection: 'AI',
    title: 'Sổ AI 04 — OCR Tiếng Việt 4 Vùng (V1–V4) & Chuẩn hóa Tên File 9 Thành phần',
    shortTitle: 'AI-04: OCR Tiếng Việt V1–V4 & Naming Engine',
    description:
      'Thuật toán nhận diện Quốc hiệu, Cơ quan ban hành, Số hiệu, Ngày ký, Trích yếu và sinh tên file chuẩn SSOT / QLVB kèm kiểm tra SHA-256.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['HDXD', 'QLCL'],
    linkedGates: ['G0', 'G12'],
    matchedDocIds: [],
    sampleKeywords: ['Bóc tách tọa độ 4 vùng OCR V1-V4 trên văn bản hành chính Việt Nam', 'Regex kiểm tra tên file chuẩn 9 thành phần và phát hiện trùng SHA-256'],
  },
  {
    id: 'NBLM-AI-05',
    code: 'AI-05',
    collection: 'AI',
    title: 'Sổ AI 05 — Tự động hóa BIM / Dynamo, CDE ISO 19650 & Kiểm toán Hồ sơ Số',
    shortTitle: 'AI-05: BIM / Dynamo & CDE ISO 19650',
    description:
      'Tích hợp dữ liệu mô hình BIM với cổng kiểm soát Stage-Gate, luồng trạng thái CDE (S0 -> S1 -> A1 -> B1) và kiểm tra xung đột tiến độ - chất lượng.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['TCVN', 'QCVN', 'QLCL'],
    linkedGates: ['G6', 'G7', 'G12', 'G14'],
    matchedDocIds: [],
    sampleKeywords: ['Tự động hóa kiểm tra thông số mô hình BIM theo quy chuẩn QCVN/TCVN', 'Quy trình phê duyệt hồ sơ trên CDE theo tiêu chuẩn ISO 19650'],
  },

  // ==========================================================================
  // 3. BỘ SƯU TẬP THAM KHẢO (SỔ ĐỆM PHÂN TÍCH BIỂU MẪU, QUY TRÌNH & TÀI LIỆU MỚI)
  // ==========================================================================
  {
    id: 'NBLM-REF-01',
    code: 'REF-01',
    collection: 'THAM_KHAO',
    title: 'Sổ Tham Khảo 01 — Sổ đệm Phân tích Biểu mẫu Nghiệm thu, ITP/RFI & Nhật ký Thi công',
    shortTitle: 'REF-01: Sổ đệm Biểu mẫu Nghiệm thu & QA/QC',
    description:
      'Kho đệm đối chiếu các mẫu biên bản nghiệm thu nội bộ, phiếu yêu cầu nghiệm thu RFI, kế hoạch thí nghiệm ITP và hồ sơ chất lượng LAS-XD.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['QLCL', 'VLXD'],
    linkedGates: ['G11', 'G12', 'G14'],
    matchedDocIds: [],
    sampleKeywords: ['Đối chiếu mẫu biên bản nghiệm thu công việc xây dựng với NĐ 06/2021 và NĐ 207/2026', 'Danh mục hồ sơ chất lượng vật liệu đầu vào cần nộp kèm IPC'],
  },
  {
    id: 'NBLM-REF-02',
    code: 'REF-02',
    collection: 'THAM_KHAO',
    title: 'Sổ Tham Khảo 02 — Sổ đệm Thẩm tra Quy trình, Hồ sơ Mời thầu & Tài liệu Pháp lý Mới Nạp',
    shortTitle: 'REF-02: Sổ đệm Thẩm tra Quy trình & Tài liệu Mới',
    description:
      'Không gian làm việc tạm thời trên NotebookLM để tải lên các dự thảo hợp đồng, công văn giải trình hoặc văn bản mới trước khi đưa vào kho SSOT chính thức.',
    defaultUrl: DEFAULT_NOTEBOOK_LM_URL,
    linkedDomains: ['DTH', 'QLHD', 'TQT'],
    linkedGates: ['G9', 'G10', 'G11', 'G15'],
    matchedDocIds: [],
    sampleKeywords: ['Rà soát rủi ro pháp lý trong dự thảo Phụ lục hợp đồng phát sinh VO', 'Kiểm tra tính đầy đủ của bộ hồ sơ thanh quyết toán trước kiểm toán'],
  },
];

/**
 * Đọc bản đồ URL NotebookLM do người dùng cấu hình từ localStorage.
 */
export function loadNotebookLmUrlMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTEBOOK_LM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch {
    // ignore localStorage read errors
  }
  return {};
}

/**
 * Lưu bản đồ URL NotebookLM vào localStorage.
 */
export function saveNotebookLmUrlMap(urlMap: Record<string, string>): void {
  try {
    localStorage.setItem(NOTEBOOK_LM_STORAGE_KEY, JSON.stringify(urlMap));
  } catch {
    // ignore localStorage write errors
  }
}

/**
 * Trả về URL hợp lệ của một sổ NotebookLM (ưu tiên link do người dùng cấu hình, mặc định về https://notebook.google.com/).
 */
export function getResolvedNotebookUrl(
  notebookId: string,
  customUrlMap?: Record<string, string>
): string {
  const map = customUrlMap || loadNotebookLmUrlMap();
  const custom = (map[notebookId] || '').trim();
  if (custom && /^https?:\/\//i.test(custom)) {
    return custom;
  }
  const entry = NOTEBOOK_LM_CATALOG.find(item => item.id === notebookId);
  return entry?.defaultUrl || DEFAULT_NOTEBOOK_LM_URL;
}

/**
 * Tự động ánh xạ Văn bản pháp luật / Lĩnh vực / Stage-Gate hiện tại sang đúng Sổ ghi chú chuyên đề trong 14 sổ LEGAL.
 */
export function resolveLegalNotebookForContext(params: {
  doc?: LegalDocument | null;
  domainCode?: FunctionalDomainCode | string;
  gateCode?: string;
  projectCode?: ProjectArchetypeCode;
}): NotebookLmEntry {
  const legalNotebooks = NOTEBOOK_LM_CATALOG.filter(n => n.collection === 'LEGAL');
  const { doc, domainCode, gateCode, projectCode } = params;

  if (doc) {
    // 1. Khớp trực tiếp theo ID văn bản
    const byDocId = legalNotebooks.find(n => n.matchedDocIds.includes(doc.id));
    if (byDocId) return byDocId;

    // 2. Khớp theo loại văn bản QCVN / TCVN
    if (
      doc.docType === 'QCVN' ||
      doc.docType === 'TCVN' ||
      doc.primaryDomain === 'QCVN' ||
      doc.primaryDomain === 'TCVN'
    ) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-07') || legalNotebooks[0];
    }

    // 3. Khớp theo số hiệu văn bản đặc trưng
    const numUpper = doc.docNumber.toUpperCase();
    if (numUpper.includes('135/2025') || numUpper.includes('62/2020')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-01') || legalNotebooks[0];
    }
    if (numUpper.includes('209/2026') || numUpper.includes('175/2024') || numUpper.includes('15/2021')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-02') || legalNotebooks[0];
    }
    if (numUpper.includes('207/2026') || numUpper.includes('06/2021')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-03') || legalNotebooks[0];
    }
    if (numUpper.includes('206/2026') || numUpper.includes('10/2021')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-04') || legalNotebooks[0];
    }
    if (numUpper.includes('210/2026') || numUpper.includes('37/2015') || numUpper.includes('50/2021')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-05') || legalNotebooks[0];
    }
    if (numUpper.includes('22/2023') || numUpper.includes('24/2024')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-06') || legalNotebooks[0];
    }
    if (numUpper.includes('35/2022') || numUpper.includes('32/2024')) {
      return legalNotebooks.find(n => n.id === 'NBLM-LEG-08') || legalNotebooks[0];
    }

    // 4. Khớp theo Lĩnh vực chính của văn bản
    const byDocDomain = legalNotebooks.find(n => n.linkedDomains.includes(doc.primaryDomain));
    if (byDocDomain) return byDocDomain;
  }

  if (domainCode && domainCode !== 'ALL') {
    const byDomain = legalNotebooks.find(n =>
      n.linkedDomains.includes(domainCode as FunctionalDomainCode)
    );
    if (byDomain) return byDomain;
  }

  if (projectCode) {
    const byProj = legalNotebooks.find(
      n => n.projectArchetypes && n.projectArchetypes.includes(projectCode)
    );
    if (byProj && (!gateCode || byProj.linkedGates.includes(gateCode))) {
      return byProj;
    }
  }

  if (gateCode && gateCode !== 'ALL') {
    const byGate = legalNotebooks.find(n => n.linkedGates.includes(gateCode));
    if (byGate) return byGate;
  }

  return legalNotebooks[0];
}

/**
 * Tạo Prompt truy vấn trích dẫn toàn văn chuẩn Deep-RAG để người dùng copy và dán ngay vào NotebookLM.
 */
export function buildNotebookLmCitationPrompt(params: {
  notebook: NotebookLmEntry;
  doc?: LegalDocument | null;
  node?: { code: string; title: string; content?: string } | null;
  secondDoc?: LegalDocument | null;
  secondNode?: { code: string; title: string; content?: string } | null;
  projectCode: ProjectArchetypeCode;
  projectName: string;
  authority: string;
}): string {
  const { notebook, doc, node, secondDoc, secondNode, projectCode, projectName, authority } = params;

  if (doc && secondDoc && node && secondNode) {
    return `[TRUY VẤN ĐỐI CHIẾU TOÀN VĂN TRÊN NOTEBOOKLM — ${notebook.code}]
• Bối cảnh Dự án áp dụng: [${projectCode}] ${projectName} (Cơ quan thẩm quyền: ${authority})
• Điều khoản A: ${node.code} (${node.title}) thuộc văn bản ${doc.docNumber} (${doc.title})
• Điều khoản B: ${secondNode.code} (${secondNode.title}) thuộc văn bản ${secondDoc.docNumber} (${secondDoc.title})

Yêu cầu NotebookLM trích dẫn nguyên văn (exact quote kèm số trang/khoản/điểm) từ nguồn văn bản gốc và phân tích:
1. Sự khác biệt về mốc thời gian hiệu lực, thời hạn xử lý hồ sơ và quy định chuyển tiếp giữa ${doc.docNumber} (${node.code}) và ${secondDoc.docNumber} (${secondNode.code}).
2. Sự thay đổi về thẩm quyền phê duyệt / nghiệm thu đối với loại hình dự án [${projectCode}] tại ${authority}.
3. Các hồ sơ, biểu mẫu hoặc điều kiện kỹ thuật bắt buộc phải lưu trữ vào Kho SSOT để không bị xuất toán khi kiểm toán.`;
  }

  const docRef = doc ? `${doc.docNumber} — ${doc.title}` : notebook.title;
  const clauseRef = node ? `${node.code} (${node.title})` : 'Các điều khoản trọng tâm';

  return `[TRUY VẤN TRÍCH DẪN TOÀN VĂN NOTEBOOKLM — ${notebook.code}]
• Sổ chuyên đề: ${notebook.title}
• Văn bản tra cứu: ${docRef}
• Điều khoản trọng tâm: ${clauseRef}
• Loại hình Dự án áp dụng: [${projectCode}] ${projectName} (Cơ quan thẩm quyền đầu mối: ${authority})

Yêu cầu NotebookLM đối chiếu toàn văn tài liệu nguồn và trả lời kèm trích dẫn nguyên văn (Citation):
1. Trích dẫn đầy đủ nội dung khoản, điểm và các văn bản hướng dẫn liên quan trực tiếp đến ${clauseRef} của ${doc?.docNumber || 'văn bản này'}.
2. Chỉ rõ nghĩa vụ pháp lý của 4 bên (Chủ đầu tư, Ban QLDA, Tư vấn Giám sát, Nhà thầu) và thẩm quyền của ${authority} đối với dự án [${projectCode}].
3. Liệt kê các điều kiện tiên quyết, biểu mẫu đi kèm và cảnh báo rủi ro chế tài / kiểm toán nếu thực hiện sai quy trình.`;
}

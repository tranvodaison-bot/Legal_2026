import {
  LawRoadmapDocNode,
  LegalCutoffEvaluation,
  LegalCutoffFilterMode,
  LegalDocument,
  ProjectArchetypeCode,
  ProjectLegalMilestones,
} from '../types/lexPmoTypes';

export const CUTOFF_DATE_2026_LAWS = '2026-07-01'; // Hiệu lực Luật XD 135/2025/QH15 & cụm NĐ 206, 207, 209, 210/2026
export const CUTOFF_DATE_ND175 = '2024-12-30'; // Hiệu lực NĐ 175/2024/NĐ-CP thay thế NĐ 15/2021
export const CUTOFF_DATE_ND70_EINVOICE = '2025-06-01'; // Hiệu lực NĐ 70/2025/NĐ-CP (Hóa đơn điện tử)

export const PRESET_LEGACY_2023_2024: ProjectLegalMilestones = {
  presetId: 'LEGACY_2023_2024',
  investmentPolicyDate: '2023-06-15',
  projectDesignApprovalDate: '2024-03-20',
  constructionContractDate: '2024-11-10',
};

export const PRESET_NEW_2026: ProjectLegalMilestones = {
  presetId: 'NEW_2026',
  investmentPolicyDate: '2026-07-15',
  projectDesignApprovalDate: '2026-09-10',
  constructionContractDate: '2026-10-25',
};

export const DEFAULT_PROJECT_MILESTONES_MAP: Record<
  ProjectArchetypeCode,
  ProjectLegalMilestones
> = {
  HTKT: {
    presetId: 'LEGACY_2023_2024',
    investmentPolicyDate: '2023-05-10',
    projectDesignApprovalDate: '2024-02-15',
    constructionContractDate: '2024-10-20',
  },
  DAN_DUNG: {
    presetId: 'LEGACY_2023_2024',
    investmentPolicyDate: '2023-08-22',
    projectDesignApprovalDate: '2024-06-12',
    constructionContractDate: '2024-12-05',
  },
  KCN: {
    presetId: 'LEGACY_2023_2024',
    investmentPolicyDate: '2023-06-15',
    projectDesignApprovalDate: '2024-03-20',
    constructionContractDate: '2024-11-10',
  },
  CCN: {
    presetId: 'NEW_2026',
    investmentPolicyDate: '2026-07-10',
    projectDesignApprovalDate: '2026-08-28',
    constructionContractDate: '2026-10-12',
  },
  FTZ: {
    presetId: 'NEW_2026',
    investmentPolicyDate: '2026-07-15',
    projectDesignApprovalDate: '2026-09-10',
    constructionContractDate: '2026-10-25',
  },
  PPP_BT: {
    presetId: 'LEGACY_2023_2024',
    investmentPolicyDate: '2023-04-18',
    projectDesignApprovalDate: '2024-04-25',
    constructionContractDate: '2024-11-28',
  },
};

export interface ProjectCutoffRegimeInfo {
  regime: 'LEGACY_TRANSITIONAL' | 'HYBRID_TRANSITIONAL' | 'NEW_2026';
  label: string;
  shortTag: string;
  summary: string;
}

const safeDate = (d?: string): string => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '2024-06-01');

export const classifyProjectCutoffRegime = (
  milestones: ProjectLegalMilestones
): ProjectCutoffRegimeInfo => {
  const policy = safeDate(milestones.investmentPolicyDate);
  const design = safeDate(milestones.projectDesignApprovalDate);
  const contract = safeDate(milestones.constructionContractDate);

  const allBefore2026 =
    policy < CUTOFF_DATE_2026_LAWS &&
    design < CUTOFF_DATE_2026_LAWS &&
    contract < CUTOFF_DATE_2026_LAWS;

  const allFrom2026 =
    policy >= CUTOFF_DATE_2026_LAWS &&
    design >= CUTOFF_DATE_2026_LAWS &&
    contract >= CUTOFF_DATE_2026_LAWS;

  if (allBefore2026) {
    return {
      regime: 'LEGACY_TRANSITIONAL',
      label: '🛡️ DIỆN CHUYỂN TIẾP (Dự án trước 01/07/2026)',
      shortTag: 'CHUYỂN TIẾP HĐ/QĐ CŨ',
      summary:
        'Giữ nguyên hiệu lực áp dụng chuyển tiếp đối với NĐ 15/2021, NĐ 06/2021, NĐ 10/2021, NĐ 37/2015 & NĐ 175/2024 theo mốc QĐ/HĐ cũ; đồng thời bắt buộc hồi tố NĐ 70/2025 & TT 12/2025.',
    };
  }

  if (allFrom2026) {
    return {
      regime: 'NEW_2026',
      label: '🆕 KHỞI TẠO MỚI 2026 (Áp dụng Luật XD 135/2025)',
      shortTag: 'LUẬT 135/2025 & NĐ 2026',
      summary:
        'Áp dụng đồng bộ Luật XD 135/2025/QH15 và cụm Nghị định 206, 207, 209, 210, 212, 217/2026/NĐ-CP; loại bỏ các Nghị định cũ đã hết hiệu lực chuyển tiếp.',
    };
  }

  return {
    regime: 'HYBRID_TRANSITIONAL',
    label: '⚖️ GIAO THOA CHUYỂN TIẾP (Chủ trương/TK cũ · HĐ/Thi công mới)',
    shortTag: 'GIAO THOA CHUYỂN TIẾP',
    summary:
      'Giai đoạn Chủ trương/Thiết kế giữ chuyển tiếp theo QĐ phê duyệt cũ; các Hợp đồng ký mới hoặc điều chỉnh từ 01/07/2026 áp dụng Luật XD 135/2025 & cụm NĐ 2026.',
  };
};

export const evaluateLegalCutoffCore = (params: {
  docId?: string;
  docNumber: string;
  isRoadmapUpcoming?: boolean;
  isRoadmapTransitional?: boolean;
  milestones: ProjectLegalMilestones;
  mode: LegalCutoffFilterMode;
}): LegalCutoffEvaluation => {
  const { docId, docNumber, isRoadmapUpcoming, isRoadmapTransitional, milestones, mode } = params;
  const norm = `${docId || ''} ${docNumber}`.toUpperCase();

  // Chế độ mặc định: Chỉ văn bản còn hiệu lực hiện tại
  if (mode === 'CURRENT_VALID_ONLY') {
    if (isRoadmapTransitional) {
      return {
        included: false,
        badgeType: 'EXCLUDED_BY_CUTOFF',
        badgeLabel: 'Hết hiệu lực / Chuyển tiếp',
        reason: 'Bị ẩn ở chế độ Chỉ văn bản còn hiệu lực hiện tại.',
        basisLaw: 'Lọc theo hiệu lực hiện hành',
      };
    }
    if (isRoadmapUpcoming) {
      return {
        included: false,
        badgeType: 'EXCLUDED_BY_CUTOFF',
        badgeLabel: 'Sắp có hiệu lực (01/07/2026)',
        reason: 'Chưa có hiệu lực ở chế độ chỉ lọc văn bản hiện hành.',
        basisLaw: 'Lọc theo hiệu lực hiện hành',
      };
    }
    return {
      included: true,
      badgeType: 'CURRENT_VALID',
      badgeLabel: 'Còn hiệu lực hiện tại',
      reason: 'Văn bản đang còn hiệu lực thi hành tại thời điểm hiện tại.',
      basisLaw: 'Hiệu lực hiện hành',
    };
  }

  // Chế độ: Áp dụng theo Mốc chuyển tiếp Dự án (Legal Cut-off Engine)
  const policy = safeDate(milestones.investmentPolicyDate);
  const design = safeDate(milestones.projectDesignApprovalDate);
  const contract = safeDate(milestones.constructionContractDate);

  // 1. NHÓM BẮT BUỘC ÁP DỤNG MỚI / HỒI TỐ (Không phụ thuộc HĐ/QĐ cũ)
  if (
    docId === 'DOC-HD-123' ||
    norm.includes('70/2025') ||
    norm.includes('123/2020')
  ) {
    return {
      included: true,
      badgeType: 'MANDATORY_NEW_RETROACTIVE',
      badgeLabel: '⚡ Bắt buộc áp dụng mới/hồi tố',
      reason:
        'Hóa đơn điện tử theo NĐ 70/2025/NĐ-CP (hiệu lực từ 01/06/2025) bắt buộc áp dụng hồi tố cho mọi kỳ nghiệm thu/thanh toán phát sinh sau cut-off, kể cả hợp đồng ký từ 2023–2024.',
      basisLaw: 'NĐ 70/2025/NĐ-CP sửa đổi NĐ 123/2020',
    };
  }

  if (
    docId === 'DOC-CDS-111' ||
    norm.includes('12/2025') ||
    norm.includes('258/QĐ-TTG')
  ) {
    return {
      included: true,
      badgeType: 'MANDATORY_NEW_RETROACTIVE',
      badgeLabel: '⚡ Bắt buộc áp dụng mới/hồi tố',
      reason:
        'Lộ trình áp dụng BIM bắt buộc theo QĐ 258/QĐ-TTg & TT 12/2025 áp dụng đối với công trình cấp I, cấp II chuyển tiếp sang bước TKBVTC hoặc lập Hồ sơ hoàn công số từ 2025–2026.',
      basisLaw: 'QĐ 258/QĐ-TTg & TT 12/2025',
    };
  }

  if (
    docId === 'DOC-NT-COCQ' ||
    norm.includes('QCVN 16:2023') ||
    norm.includes('04/2023/TT-BXD') ||
    docId === 'DOC-06' ||
    norm.includes('QCVN 06:2022') ||
    docId === 'DOC-GDDT-20' ||
    norm.includes('20/2023/QH15')
  ) {
    return {
      included: true,
      badgeType: 'MANDATORY_NEW_RETROACTIVE',
      badgeLabel: '⚡ Bắt buộc áp dụng mới/hồi tố',
      reason:
        'Quy chuẩn kỹ thuật quốc gia (PCCC QCVN 06, Hợp quy VLXD QCVN 16:2023) và Luật Giao dịch điện tử 20/2023/QH15 bắt buộc tuân thủ tại thời điểm nghiệm thu hiện trường.',
      basisLaw: 'QCVN bắt buộc & Luật GDĐT 20/2023',
    };
  }

  // 2. LUẬT XÂY DỰNG 50/2014 & 62/2020 vs LUẬT XD 135/2025/QH15
  if (norm.includes('50/2014') || norm.includes('62/2020')) {
    if (policy < CUTOFF_DATE_2026_LAWS || design < CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'TRANSITIONAL_OLD',
        badgeLabel: '🛡️ Áp dụng chuyển tiếp theo HĐ/QĐ cũ',
        reason: `Chủ trương ĐT (${policy}) / TKBVTC (${design}) phê duyệt trước 01/07/2026 → Tiếp tục thực hiện chuyển tiếp theo Luật XD 50/2014 & 62/2020/QH14 để đảm bảo tính hợp pháp khi KTNN kiểm tra.`,
        basisLaw: 'Điều khoản chuyển tiếp Luật XD 135/2025/QH15',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Đã thay thế bởi Luật 135/2025',
      reason: 'Dự án khởi tạo từ 01/07/2026 trở đi không áp dụng Luật XD 50/2014 & 62/2020.',
      basisLaw: 'Luật XD 135/2025/QH15',
    };
  }

  if (docId === 'DOC-135' || norm.includes('135/2025/QH15')) {
    if (
      policy >= CUTOFF_DATE_2026_LAWS &&
      design >= CUTOFF_DATE_2026_LAWS &&
      contract >= CUTOFF_DATE_2026_LAWS
    ) {
      return {
        included: true,
        badgeType: 'DIRECT_NEW_2026',
        badgeLabel: '🆕 Áp dụng trực tiếp (Khởi tạo mới 2026)',
        reason: `Cả 3 mốc (Chủ trương ${policy}, Thiết kế ${design}, Hợp đồng ${contract}) đều từ 01/07/2026 → Áp dụng toàn diện Luật XD 135/2025/QH15.`,
        basisLaw: 'Luật XD 135/2025/QH15 (Hiệu lực 01/07/2026)',
      };
    }
    if (contract >= CUTOFF_DATE_2026_LAWS || design >= CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'DIRECT_NEW_2026',
        badgeLabel: '⚖️ Áp dụng phần việc sau 01/07/2026',
        reason: `Dự án có mốc Thiết kế (${design}) hoặc Hợp đồng (${contract}) từ 01/07/2026 → Áp dụng Luật XD 135/2025 cho các giai đoạn triển khai mới/điều chỉnh.`,
        basisLaw: 'Điều khoản chuyển tiếp Luật XD 135/2025/QH15',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Chưa áp dụng (Dự án chuyển tiếp cũ)',
      reason: `Cả 3 mốc dự án đều trước 01/07/2026 → Áp dụng chuyển tiếp Luật 50/2014 & 62/2020 thay cho Luật 135/2025/QH15.`,
      basisLaw: 'Điều khoản chuyển tiếp Luật XD 135/2025/QH15',
    };
  }

  // 3. QUẢN LÝ DỰ ÁN & THIẾT KẾ: NĐ 15/2021 vs NĐ 175/2024 vs NĐ 209/2026 (+ 212/2026)
  if (docId === 'DOC-15' || norm.includes('15/2021/NĐ-CP')) {
    if (design < CUTOFF_DATE_ND175) {
      return {
        included: true,
        badgeType: 'TRANSITIONAL_OLD',
        badgeLabel: '🛡️ Áp dụng chuyển tiếp theo HĐ/QĐ cũ',
        reason: `Dự án / TKBVTC phê duyệt ngày ${design} (trước 30/12/2024) → Giữ nguyên NĐ 15/2021/NĐ-CP làm căn cứ thẩm định & cấp phép hợp lệ khi Kiểm toán Nhà nước hậu kiểm.`,
        basisLaw: 'Điều khoản chuyển tiếp NĐ 175/2024 & NĐ 209/2026',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Đã thay thế bởi NĐ 175/2024',
      reason: `Mốc Thiết kế (${design}) từ 30/12/2024 trở về sau không áp dụng NĐ 15/2021.`,
      basisLaw: 'NĐ 175/2024/NĐ-CP',
    };
  }

  if (docId === 'DOC-03' || norm.includes('175/2024/NĐ-CP')) {
    if (design < CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'TRANSITIONAL_OLD',
        badgeLabel: '🛡️ Áp dụng chuyển tiếp theo HĐ/QĐ cũ',
        reason:
          design >= CUTOFF_DATE_ND175
            ? `Thiết kế/Điều chỉnh (${design}) thuộc giai đoạn 30/12/2024 – 30/06/2026 → Áp dụng NĐ 175/2024 chuyển tiếp.`
            : `Dự án chuyển tiếp trước 01/07/2026 → Giữ NĐ 175/2024 để xử lý các hồ sơ điều chỉnh dự án/TKBVTC trong giai đoạn 2025–06/2026.`,
        basisLaw: 'Điều khoản chuyển tiếp NĐ 209/2026 & NĐ 175/2024',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Đã thay thế bởi NĐ 209/2026',
      reason: `Thiết kế phê duyệt từ 01/07/2026 (${design}) áp dụng NĐ 209/2026 thay cho NĐ 175/2024.`,
      basisLaw: 'NĐ 209/2026/NĐ-CP',
    };
  }

  if (
    docId === 'DOC-209' ||
    docId === 'DOC-212' ||
    docId === 'DOC-217' ||
    norm.includes('209/2026') ||
    norm.includes('212/2026') ||
    norm.includes('217/2026')
  ) {
    if (design >= CUTOFF_DATE_2026_LAWS || contract >= CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'DIRECT_NEW_2026',
        badgeLabel: '🆕 Áp dụng trực tiếp (Khởi tạo mới 2026)',
        reason: `Mốc TKBVTC (${design}) / Hợp đồng (${contract}) từ 01/07/2026 → Áp dụng NĐ 209/2026, NĐ 212/2026, NĐ 217/2026.`,
        basisLaw: 'Cụm NĐ 209, 212, 217/2026/NĐ-CP',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Không áp dụng cho dự án chuyển tiếp cũ',
      reason: `Dự án phê duyệt & ký HĐ trước 01/07/2026 → Tiếp tục chuyển tiếp theo NĐ 15/2021 / NĐ 175/2024, tránh áp nhầm NĐ 209/2026.`,
      basisLaw: 'Điều khoản chuyển tiếp NĐ 209/2026',
    };
  }

  // 4. QUẢN LÝ CHẤT LƯỢNG & NGHIỆM THU: NĐ 06/2021 vs NĐ 207/2026
  if (docId === 'DOC-01' || norm.includes('06/2021/NĐ-CP')) {
    if (contract < CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'TRANSITIONAL_OLD',
        badgeLabel: '🛡️ Áp dụng chuyển tiếp theo HĐ/QĐ cũ',
        reason: `Hợp đồng thi công ký ngày ${contract} (trước 01/07/2026) → Bắt buộc giữ NĐ 06/2021/NĐ-CP cho toàn bộ quy trình Nhật ký thi công Phụ lục IIa & BBNT, bảo vệ hồ sơ trước Kiểm toán Nhà nước.`,
        basisLaw: 'Điều khoản chuyển tiếp NĐ 207/2026/NĐ-CP',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Đã thay thế bởi NĐ 207/2026',
      reason: `Hợp đồng ký từ 01/07/2026 (${contract}) áp dụng NĐ 207/2026 thay thế NĐ 06/2021.`,
      basisLaw: 'NĐ 207/2026/NĐ-CP',
    };
  }

  if (docId === 'DOC-207' || norm.includes('207/2026')) {
    if (contract >= CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'DIRECT_NEW_2026',
        badgeLabel: '🆕 Áp dụng trực tiếp (Khởi tạo mới 2026)',
        reason: `Hợp đồng xây dựng ký ngày ${contract} (từ 01/07/2026) → Áp dụng NĐ 207/2026 về Quản lý chất lượng, Nhật ký điện tử ký số & Nghiệm thu.`,
        basisLaw: 'NĐ 207/2026/NĐ-CP',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Không áp dụng cho HĐ ký trước 01/07/2026',
      reason: `Hợp đồng ký trước 01/07/2026 (${contract}) được bảo lưu chuyển tiếp theo NĐ 06/2021/NĐ-CP.`,
      basisLaw: 'Điều khoản chuyển tiếp NĐ 207/2026',
    };
  }

  // 5. QUẢN LÝ CHI PHÍ: NĐ 10/2021 vs NĐ 206/2026
  if (docId === 'DOC-04' || norm.includes('10/2021/NĐ-CP')) {
    if (design < CUTOFF_DATE_2026_LAWS || contract < CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'TRANSITIONAL_OLD',
        badgeLabel: '🛡️ Áp dụng chuyển tiếp theo HĐ/QĐ cũ',
        reason: `Dự toán/TMĐT phê duyệt ngày ${design} (trước 01/07/2026) → Giữ chuyển tiếp NĐ 10/2021/NĐ-CP để đối chiếu định mức & đơn giá dự toán khi thanh quyết toán.`,
        basisLaw: 'Điều khoản chuyển tiếp NĐ 206/2026/NĐ-CP',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Đã thay thế bởi NĐ 206/2026',
      reason: `Dự án phê duyệt từ 01/07/2026 áp dụng NĐ 206/2026 thay cho NĐ 10/2021.`,
      basisLaw: 'NĐ 206/2026/NĐ-CP',
    };
  }

  if (docId === 'DOC-206' || norm.includes('206/2026')) {
    if (design >= CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'DIRECT_NEW_2026',
        badgeLabel: '🆕 Áp dụng trực tiếp (Khởi tạo mới 2026)',
        reason: `Dự án/TKBVTC phê duyệt từ 01/07/2026 (${design}) → Áp dụng NĐ 206/2026 về Quản lý chi phí ĐTXD & BIM 5D.`,
        basisLaw: 'NĐ 206/2026/NĐ-CP',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Không áp dụng cho dự án duyệt trước 01/07/2026',
      reason: `Dự toán đã duyệt trước 01/07/2026 (${design}) giữ chuyển tiếp theo NĐ 10/2021/NĐ-CP.`,
      basisLaw: 'Điều khoản chuyển tiếp NĐ 206/2026',
    };
  }

  // 6. HỢP ĐỒNG XÂY DỰNG: VBHN NĐ 37/2015 & 50/2021 vs NĐ 210/2026
  if (docId === 'DOC-02' || norm.includes('37/2015')) {
    if (contract < CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'TRANSITIONAL_OLD',
        badgeLabel: '🛡️ Áp dụng chuyển tiếp theo HĐ/QĐ cũ',
        reason: `Hợp đồng xây dựng ký ngày ${contract} (trước 01/07/2026) → Chuyển tiếp bắt buộc theo NĐ 37/2015 & NĐ 50/2021 cho đến khi thanh lý, quyết toán hợp đồng.`,
        basisLaw: 'Điều khoản chuyển tiếp NĐ 210/2026 & Luật XD 135/2025',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Đã thay thế bởi NĐ 210/2026',
      reason: `Hợp đồng ký từ 01/07/2026 (${contract}) áp dụng NĐ 210/2026 thay cho NĐ 37/2015 & 50/2021.`,
      basisLaw: 'NĐ 210/2026/NĐ-CP',
    };
  }

  if (docId === 'DOC-210' || norm.includes('210/2026')) {
    if (contract >= CUTOFF_DATE_2026_LAWS) {
      return {
        included: true,
        badgeType: 'DIRECT_NEW_2026',
        badgeLabel: '🆕 Áp dụng trực tiếp (Khởi tạo mới 2026)',
        reason: `Hợp đồng ký từ 01/07/2026 (${contract}) → Áp dụng NĐ 210/2026 về Hợp đồng xây dựng, tạm ứng, thanh toán IPC & kiểm soát VO.`,
        basisLaw: 'NĐ 210/2026/NĐ-CP',
      };
    }
    return {
      included: false,
      badgeType: 'EXCLUDED_BY_CUTOFF',
      badgeLabel: 'Không hồi tố HĐ ký trước 01/07/2026',
      reason: `Hợp đồng ký ngày ${contract} (trước 01/07/2026) tiếp tục thực hiện theo VBHN NĐ 37/2015 & 50/2021.`,
      basisLaw: 'Điều khoản chuyển tiếp NĐ 210/2026',
    };
  }

  // Các văn bản pháp luật chuyên ngành còn hiệu lực khác (Đấu thầu, KCN, CCN, FTZ, Quyết toán 99/2021, KTNN 02/2023...)
  return {
    included: true,
    badgeType: 'CURRENT_VALID',
    badgeLabel: 'Còn hiệu lực áp dụng',
    reason: 'Văn bản chuyên ngành đang còn hiệu lực thi hành phù hợp với vòng đời dự án.',
    basisLaw: 'Hiệu lực thi hành hiện hành',
  };
};

export const evaluateLegalDocumentCutoff = (
  doc: LegalDocument,
  milestones: ProjectLegalMilestones,
  mode: LegalCutoffFilterMode
): LegalCutoffEvaluation => {
  const isUpcoming =
    doc.validityPeriod === 'Sắp có hiệu lực' || doc.validityPeriod === 'UPCOMING';
  const isTransitionalOld =
    doc.validityPeriod === 'AMENDED' ||
    doc.status.toLowerCase().includes('chuyển tiếp') ||
    doc.id === 'DOC-15';

  return evaluateLegalCutoffCore({
    docId: doc.id,
    docNumber: doc.docNumber,
    isRoadmapUpcoming: mode === 'CURRENT_VALID_ONLY' ? false : isUpcoming,
    isRoadmapTransitional: isTransitionalOld,
    milestones,
    mode,
  });
};

export const evaluateRoadmapNodeCutoff = (
  node: LawRoadmapDocNode,
  milestones: ProjectLegalMilestones,
  mode: LegalCutoffFilterMode
): LegalCutoffEvaluation => {
  return evaluateLegalCutoffCore({
    docId: node.docId,
    docNumber: node.docNumber,
    isRoadmapUpcoming: node.status === 'SAP_CO_HIEU_LUC',
    isRoadmapTransitional:
      node.status === 'CHUYEN_TIEP' || node.status === 'HET_HIEU_LUC_MOT_PHAN',
    milestones,
    mode,
  });
};

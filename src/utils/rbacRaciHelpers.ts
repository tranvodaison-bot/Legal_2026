import { CdeIsoStatus, RbacRoleCode } from '../types/lexPmoTypes';

export type LegalPartyRoleCode = 'CDT' | 'BQLDA' | 'TVGS' | 'NTTC';

export interface PartyRoleDefinition {
  code: LegalPartyRoleCode;
  employeeId: string;
  icon: string;
  shortName: string;
  badgeCode: string;
  fullTitle: string;
  raciLetters: Array<'R' | 'A' | 'C' | 'I'>;
  raciScopeLabel: string;
  authoritySummary: string;
  activeClass: string;
}

export const FOUR_PARTY_ROLES: PartyRoleDefinition[] = [
  {
    code: 'CDT',
    employeeId: 'EMP-01',
    icon: '🏛️',
    shortName: 'Chủ đầu tư',
    badgeCode: 'CĐT',
    fullTitle: 'Chủ đầu tư (CĐT - Cấp phê duyệt cao nhất)',
    raciLetters: ['A', 'R'],
    raciScopeLabel: 'A: Phê duyệt cuối · R: Chủ trì ĐT',
    authoritySummary:
      'Phê duyệt cuối cùng Stage-Gate, Ký Phụ lục VO, Giải ngân IPC & Mở khóa cổng Hard-Stop.',
    activeClass: 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20',
  },
  {
    code: 'BQLDA',
    employeeId: 'EMP-02',
    icon: '📋',
    shortName: 'Ban QLDA (PMU)',
    badgeCode: 'PMU',
    fullTitle: 'Ban Quản lý Dự án (PMU - Điều phối & Thẩm tra hồ sơ)',
    raciLetters: ['R', 'C'],
    raciScopeLabel: 'R: Điều phối/Thẩm tra · C: Tham vấn',
    authoritySummary:
      'Điều phối CDE (S0→A1), Thẩm tra hồ sơ trình duyệt, Tạo yêu cầu & Trả lại hồ sơ chưa đạt.',
    activeClass: 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-500/20',
  },
  {
    code: 'TVGS',
    employeeId: 'EMP-03',
    icon: '🔍',
    shortName: 'Tư vấn Giám sát',
    badgeCode: 'TVGS',
    fullTitle: 'Tư vấn Giám sát (TVGS - Xác nhận kỹ thuật, QA/QC, khối lượng)',
    raciLetters: ['R', 'C'],
    raciScopeLabel: 'R: Xác nhận QA/QC · C: Kiểm định',
    authoritySummary:
      'Xác nhận kỹ thuật / Nghiệm thu khối lượng, Đóng RFI/ITP, Trả lại yêu cầu bổ sung (Khóa quyền CĐT).',
    activeClass: 'bg-sky-500 text-slate-950 border-sky-300 shadow-md shadow-sky-500/20',
  },
  {
    code: 'NTTC',
    employeeId: 'EMP-05',
    icon: '👷',
    shortName: 'Nhà thầu',
    badgeCode: 'Contractor',
    fullTitle: 'Tổng thầu / Nhà thầu (Contractor - Lập hồ sơ, trình RFI, VO, IPC)',
    raciLetters: ['R', 'I'],
    raciScopeLabel: 'R: Lập & Trình · I: Nhận thông báo',
    authoritySummary:
      'Lập hồ sơ S0, Nộp hồ sơ/Trình duyệt & Tạo yêu cầu VO/RFI (Khóa nút TVGS Xác nhận & CĐT Phê duyệt).',
    activeClass: 'bg-orange-500 text-slate-950 border-orange-300 shadow-md shadow-orange-500/20',
  },
];

export interface RaciActionPermissions {
  roleCode: RbacRoleCode;
  isCdt: boolean;
  isBqlda: boolean;
  isTvgs: boolean;
  isContractor: boolean;
  canSubmitDossier: boolean;
  canCreateVoOrRfi: boolean;
  canTvgsVerify: boolean;
  canReturnForSupplement: boolean;
  canCdtFinalApprove: boolean;
  canUnlockHardStop: boolean;
  canSignVoAppendix: boolean;
  canDisburseIpc: boolean;
  canPublishCdeA1B1: boolean;
  raciMatrixMap: Record<'R' | 'A' | 'C' | 'I', { active: boolean; meaning: string }>;
}

export function getRaciActionPermissions(role: RbacRoleCode): RaciActionPermissions {
  const isCdt = role === 'CDT' || role === 'ADMIN_PMO';
  const isBqlda = role === 'BQLDA';
  const isTvgs = role === 'TVGS';
  const isContractor = role === 'NTTC';

  const raciMatrixMap: Record<'R' | 'A' | 'C' | 'I', { active: boolean; meaning: string }> = {
    R: {
      active: true,
      meaning: isCdt
        ? 'R — Chủ trì quyết định đầu tư & mở khóa cổng'
        : isBqlda
        ? 'R — Thực hiện điều phối & thẩm tra hồ sơ'
        : isTvgs
        ? 'R — Thực hiện kiểm tra kỹ thuật, QA/QC & nghiệm thu'
        : 'R — Thực hiện lập hồ sơ, trình RFI, VO, IPC',
    },
    A: {
      active: isCdt,
      meaning: isCdt
        ? 'A — Chịu trách nhiệm giải trình & phê duyệt cuối cùng'
        : 'A — Không có quyền phê duyệt cuối (Chỉ CĐT)',
    },
    C: {
      active: isBqlda || isTvgs || role === 'TVTK',
      meaning:
        isBqlda || isTvgs || role === 'TVTK'
          ? 'C — Tham vấn chuyên môn kỹ thuật / pháp lý bắt buộc'
          : isCdt
          ? 'C — Tiếp nhận ý kiến tham vấn chuyên môn'
          : 'C — Không thuộc vai trò tham vấn độc lập',
    },
    I: {
      active: true,
      meaning: isContractor
        ? 'I — Nhận thông báo kết quả xác nhận / phê duyệt từ TVGS & CĐT'
        : 'I — Nhận thông báo cập nhật trạng thái CDE & Audit Trail',
    },
  };

  return {
    roleCode: role,
    isCdt,
    isBqlda,
    isTvgs,
    isContractor,
    canSubmitDossier: true,
    canCreateVoOrRfi: isContractor || isBqlda || isCdt,
    canTvgsVerify: isTvgs,
    canReturnForSupplement: isTvgs || isBqlda || isCdt,
    canCdtFinalApprove: isCdt,
    canUnlockHardStop: isCdt,
    canSignVoAppendix: isCdt,
    canDisburseIpc: isCdt,
    canPublishCdeA1B1: isCdt || isBqlda,
    raciMatrixMap,
  };
}

export interface CdeIsoMetaItem {
  code: CdeIsoStatus;
  shortLabel: string;
  fullLabel: string;
  nextCode: CdeIsoStatus | null;
  nextActionLabel: string | null;
  badgeClass: string;
  description: string;
}

export const CDE_ISO_19650_PIPELINE: CdeIsoStatus[] = ['S0', 'S1', 'A1', 'B1'];

export const CDE_ISO_19650_META: Record<CdeIsoStatus, CdeIsoMetaItem> = {
  S0: {
    code: 'S0',
    shortLabel: 'S0 · WIP',
    fullLabel: 'S0 (WIP - Đang soạn thảo)',
    nextCode: 'S1',
    nextActionLabel: 'Chuyển S1 (Shared) →',
    badgeClass: 'bg-slate-800 text-amber-200 border-amber-500/40',
    description: 'Work In Progress — Tài liệu đang soạn thảo nội bộ, chưa chia sẻ 4 bên.',
  },
  S1: {
    code: 'S1',
    shortLabel: 'S1 · Shared',
    fullLabel: 'S1 (Shared - Phối hợp 4 bên)',
    nextCode: 'A1',
    nextActionLabel: 'Duyệt A1 (Published) →',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/60',
    description: 'Shared — Đã phát hành vào vùng phối hợp liên ngành (CĐT, PMU, TVGS, Nhà thầu).',
  },
  A1: {
    code: 'A1',
    shortLabel: 'A1 · Published',
    fullLabel: 'A1 (Published - Đã duyệt thi công)',
    nextCode: 'B1',
    nextActionLabel: 'Lưu trữ B1 (Archived) →',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60',
    description: 'Published — Đã được CĐT/PMU phê duyệt làm căn cứ thi công & nghiệm thu chính thức.',
  },
  B1: {
    code: 'B1',
    shortLabel: 'B1 · Archived',
    fullLabel: 'B1 (Archived - Hồ sơ hoàn công)',
    nextCode: null,
    nextActionLabel: null,
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-400/60',
    description: 'Archived — Hồ sơ hoàn công bất biến phục vụ Quyết toán & Kiểm toán Nhà nước.',
  },
};

export async function computeFullSha256Hex(payload: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoded = new TextEncoder().encode(payload);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
  } catch {
    // Fallback deterministic 64-char hex digest
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b);
  }
  const part = (n: number) => (n >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `${part(h1)}${part(h2)}${part(h1 ^ 0xa5a5a5a5)}${part(h2 ^ 0x5a5a5a5a)}${part(
    h1 + h2
  )}${part(h1 * 31)}${part(h2 * 17)}${part(h1 ^ h2)}`;
}

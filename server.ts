import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Giới hạn kích thước payload JSON chống tấn công quá tải (DoS / Payload Flood)
app.use(express.json({ limit: '256kb' }));

// Security Headers cơ bản
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ============================================================================
// INPUT VALIDATION & SANITIZATION HELPERS (SECURITY HARDENING)
// ============================================================================
export type CanonicalActorRole = 'CDT' | 'PMU' | 'TVGS' | 'CONTRACTOR';

const VALID_CANONICAL_ROLES = new Set<CanonicalActorRole>(['CDT', 'PMU', 'TVGS', 'CONTRACTOR']);

const ALLOWED_PROJECT_CODES = new Set(['HTKT', 'DAN_DUNG', 'KCN', 'CCN', 'FTZ', 'PPP_BT']);

const ALLOWED_AUDIT_MODULES = new Set<ServerAuditLog['module']>([
  'INGEST_3D',
  'VBPL_CROSS',
  'STAGE_GATE',
  'QAQC_EXEC',
  'VO_AUDIT',
  'HRM_RACI',
  'ASSET_LAS',
  'AI_AGENT',
]);

const ALLOWED_RISK_SEVERITIES = new Set<ServerAuditLog['riskSeverity']>([
  'NOMINAL',
  'WARNING',
  'CRITICAL',
]);

/**
 * Làm sạch chuỗi văn bản đầu vào: loại bỏ ký tự điều khiển ẩn / null-byte, cắt độ dài tối đa.
 */
function sanitizeText(input: unknown, maxLength = 500, fallback = ''): string {
  if (typeof input !== 'string') return fallback;
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Chuẩn hóa & kiểm tra hợp lệ mã vai trò pháp nhân 4 bên (`CDT`, `PMU`, `TVGS`, `CONTRACTOR`).
 * Hỗ trợ ánh xạ tương thích từ mã nội bộ (`BQLDA` -> `PMU`, `NTTC` -> `CONTRACTOR`).
 */
function normalizeAndValidateActorRole(rawInput: unknown): CanonicalActorRole | null {
  if (typeof rawInput !== 'string' || !rawInput.trim()) return null;
  const upper = rawInput.trim().toUpperCase();
  const token = upper.split(/[\s(]/)[0];

  if (VALID_CANONICAL_ROLES.has(token as CanonicalActorRole)) {
    return token as CanonicalActorRole;
  }
  if (token === 'BQLDA' || token === 'ADMIN_PMO') return 'PMU';
  if (token === 'NTTC') return 'CONTRACTOR';
  if (token === 'TVTK') return 'TVGS';
  return null;
}

// ============================================================================
// SERVER-SIDE GEMINI CLIENT INITIALIZATION (Telemetry User-Agent Required)
// ============================================================================
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ============================================================================
// IN-MEMORY ENTERPRISE STORE & AUDIT TRAIL (RBAC + Cross-Entity Integrity)
// ============================================================================
export interface ServerAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actor_role?: CanonicalActorRole;
  module: 'INGEST_3D' | 'VBPL_CROSS' | 'STAGE_GATE' | 'QAQC_EXEC' | 'VO_AUDIT' | 'HRM_RACI' | 'ASSET_LAS' | 'AI_AGENT';
  action: string;
  entityRef: string;
  previousState?: string;
  newState: string;
  riskSeverity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  sha256Hash?: string;
  accountabilityNote?: string;
}

const MAX_AUDIT_LOGS = 500;

const serverAuditLogs: ServerAuditLog[] = [
  {
    id: 'AUD-2026-0001',
    timestamp: '2026-11-16T08:00:00Z',
    actorId: 'EMP-01',
    actorName: 'TS. Trần Võ Đại Sơn',
    actorRole: 'Giám đốc Ban QLDA (A - Accountable)',
    actor_role: 'CDT',
    module: 'STAGE_GATE',
    action: 'Phê duyệt Chốt chặn Gate G0 & G1 — Dự án Hạ tầng KCN',
    entityRef: 'GATE-G1 / BDS_QD_UBND_88_2026_DTU',
    previousState: 'IN_REVIEW',
    newState: 'APPROVED',
    riskSeverity: 'NOMINAL',
  },
  {
    id: 'AUD-2026-0002',
    timestamp: '2026-11-16T08:30:00Z',
    actorId: 'EMP-03',
    actorName: 'KS. Nguyễn Hoàng Nam',
    actorRole: 'Trưởng đoàn Tư vấn Giám sát (TVGS - R)',
    actor_role: 'TVGS',
    module: 'QAQC_EXEC',
    action: 'Phát hiện cảnh báo trình tự thời gian nghiệm thu (RF-05)',
    entityRef: 'QT-12 / BBNT-CV-05',
    previousState: 'PENDING_VERIFY',
    newState: 'FLAGGED_CHRONO_ERROR',
    riskSeverity: 'CRITICAL',
  },
];

// RBAC Permission Middleware (Kiểm tra hợp lệ actor_role thuộc 4 chủ thể CDT, PMU, TVGS, CONTRACTOR)
function requireValidActorRole(allowedCanonicalRoles: CanonicalActorRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawHeaderRole = req.headers['x-actor-role'];
    const rawBodyRole = req.body?.actor_role || req.body?.actorRole;
    const candidateRole = rawBodyRole || rawHeaderRole || 'PMU';

    const validatedRole = normalizeAndValidateActorRole(candidateRole);
    if (!validatedRole || !allowedCanonicalRoles.includes(validatedRole)) {
      res.status(403).json({
        error:
          'RBAC Từ chối truy cập: Mã vai trò actor_role không hợp lệ. Chỉ chấp nhận CDT, PMU, TVGS hoặc CONTRACTOR.',
      });
      return;
    }

    (req as Request & { validatedActorRole?: CanonicalActorRole }).validatedActorRole = validatedRole;
    next();
  };
}

// ============================================================================
// API ROUTES
// ============================================================================
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json({ logs: serverAuditLogs.slice(0, 200) });
});

app.post(
  '/api/audit-logs',
  requireValidActorRole(['CDT', 'PMU', 'TVGS', 'CONTRACTOR']),
  (req: Request, res: Response) => {
    const validatedActorRole =
      (req as Request & { validatedActorRole?: CanonicalActorRole }).validatedActorRole || 'PMU';

    const action = sanitizeText(req.body?.action, 400);
    const entityRef = sanitizeText(req.body?.entityRef, 240);
    if (!action || !entityRef) {
      res.status(400).json({
        error: 'Dữ liệu đầu vào không hợp lệ: Thiếu action hoặc entityRef cho Nhật ký Kiểm toán.',
      });
      return;
    }

    const rawModule = sanitizeText(req.body?.module, 40, 'STAGE_GATE') as ServerAuditLog['module'];
    const safeModule: ServerAuditLog['module'] = ALLOWED_AUDIT_MODULES.has(rawModule)
      ? rawModule
      : 'STAGE_GATE';

    const rawSeverity = sanitizeText(
      req.body?.riskSeverity,
      20,
      'NOMINAL'
    ) as ServerAuditLog['riskSeverity'];
    const safeSeverity: ServerAuditLog['riskSeverity'] = ALLOWED_RISK_SEVERITIES.has(rawSeverity)
      ? rawSeverity
      : 'NOMINAL';

    const rawHash = sanitizeText(req.body?.sha256Hash, 128);
    const safeHash = /^[a-fA-F0-9]{8,64}$/.test(rawHash) ? rawHash.toUpperCase() : undefined;

    const newEntry: ServerAuditLog = {
      id: `AUD-2026-${String(serverAuditLogs.length + 1).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      actorId: sanitizeText(req.body?.actorId, 40, 'EMP-01'),
      actorName: sanitizeText(req.body?.actorName, 120, 'Ban QLDA Đại Sơn'),
      actorRole: sanitizeText(req.body?.actorRole, 80, validatedActorRole),
      actor_role: validatedActorRole,
      module: safeModule,
      action,
      entityRef,
      previousState: sanitizeText(req.body?.previousState, 80) || undefined,
      newState: sanitizeText(req.body?.newState, 80, 'COMPLETED'),
      riskSeverity: safeSeverity,
      sha256Hash: safeHash,
      accountabilityNote: sanitizeText(req.body?.accountabilityNote, 600) || undefined,
    };

    serverAuditLogs.unshift(newEntry);
    if (serverAuditLogs.length > MAX_AUDIT_LOGS) {
      serverAuditLogs.length = MAX_AUDIT_LOGS;
    }

    res.status(201).json({ log: newEntry });
  }
);

function buildDeterministicLegalReport(params: {
  agentId: string;
  agentName: string;
  projectCode: string;
  projectName: string;
  authority: string;
  specialNote: string;
  prompt: string;
  chronoErrorsCount: number;
  gateCode?: string;
  stepCode?: string;
  stepTitle?: string;
  riskFlag?: string;
}): string {
  const {
    agentId,
    agentName,
    projectCode,
    projectName,
    authority,
    specialNote,
    prompt,
    chronoErrorsCount,
    gateCode,
    stepCode,
    stepTitle,
    riskFlag,
  } = params;

  const projectSpecificMitigations: Record<string, string[]> = {
    KCN: [
      `Trình thẩm định & xin ý kiến chấp thuận trực tiếp tại ${authority} theo cơ chế "Một cửa tại chỗ" (Nghị định 35/2022/NĐ-CP).`,
      'Đối chiếu đồng bộ quy hoạch phân khu 1/2000 KCN, đấu nối hạ tầng trạm xử lý nước thải tập trung và thẩm duyệt PCCC nhà xưởng/hạ tầng KCN.',
      'Kiểm soát chặt chẽ biên bản nghiệm thu đóng điện, cấp thoát nước và giấy phép môi trường KCN trước khi bàn giao đất cho nhà đầu tư thứ cấp.',
    ],
    HTKT: [
      `Lập hồ sơ trình ${authority} kiểm tra công tác nghiệm thu hoàn thành hạng mục giao thông, thoát nước, hào kỹ thuật (Nghị định 06/2021/NĐ-CP & 175/2024/NĐ-CP).`,
      'Bắt buộc có kết quả thí nghiệm độ chặt nền đường K95/K98, mô đun đàn hồi Eyc tại phòng LAS-XD hợp chuẩn trước khi chuyển bước thi công lớp kết cấu áo đường.',
      'Ký biên bản bàn giao mặt bằng, thỏa thuận đấu nối hạ tầng kỹ thuật và giấy phép thi công trên đường đang khai thác.',
    ],
    DAN_DUNG: [
      `Thực hiện đầy đủ thủ tục thẩm định Báo cáo NCKT, TKBVTC tại ${authority} và nghiệm thu PCCC tại Cục/Phòng PC07 trước khi đưa công trình vào sử dụng.`,
      'Kiểm soát nghiêm ngặt thí nghiệm nén tĩnh cọc, siêu âm cọc khoan nhồi, lấy mẫu bê tông R28 và nghiệm thu kín hệ thống cơ điện (MEP) từng tầng.',
      'Rà soát điều kiện mở bán/bàn giao căn hộ theo Luật Kinh doanh BĐS 2023 và Luật Nhà ở 2023.',
    ],
    CCN: [
      `Phối hợp Sở Công Thương và UBND cấp tỉnh/huyện (${authority}) rà soát Quyết định thành lập/mở rộng Cụm công nghiệp theo Nghị định 32/2024/NĐ-CP.`,
      'Hoàn thiện công trình bảo vệ môi trường, hệ thống thu gom xử lý nước thải tập trung CCN trước khi tiếp nhận dự án sản xuất.',
      'Lập bảng đối chiếu tổng mức đầu tư và dự toán hạ tầng CCN tránh vượt cơ cấu vốn đã phê duyệt.',
    ],
    FTZ: [
      `Thực hiện quy trình thẩm định đặc thù Khu Thương mại Tự do / Logistics tại ${authority} gắn với quy hoạch luồng tuyến hải quan và kho ngoại quan.`,
      'Bổ sung biện pháp kiểm soát an ninh hàng rào cứng FTZ, hệ thống giám sát hải quan tự động và thẩm duyệt PCCC kho bãi tải trọng lớn.',
      'Rà soát hợp đồng EPC/nhà thầu quốc tế đảm bảo tuân thủ FIDIC và quy định quản lý hợp đồng xây dựng Việt Nam.',
    ],
    PPP_BT: [
      `Trình Cơ quan nhà nước có thẩm quyền (${authority}) và Kiểm toán Nhà nước rà soát phương án tài chính, tỷ lệ vốn nhà nước tham gia trong dự án PPP/BT (Luật PPP).`,
      'Kiểm soát chặt chẽ thủ tục lựa chọn nhà đầu tư, đàm phán hợp đồng BOT/BT và cơ chế chia sẻ phần tăng/giảm doanh thu.',
      'Mọi phát sinh khối lượng (VO) phải được thẩm tra độc lập và chấp thuận bằng văn bản của Cơ quan ký kết hợp đồng dự án tránh nguy cơ xuất toán khi quyết toán quỹ đất/vốn đầu tư.',
    ],
  };

  const selectedMitigations =
    projectSpecificMitigations[projectCode] || projectSpecificMitigations.KCN;

  const notebookByProject: Record<string, { code: string; title: string; keywords: string }> = {
    HTKT: {
      code: 'LEGAL-02 & LEGAL-03',
      title: 'Sổ 02: NĐ Quản lý dự án 209/2026 & 175/2024 | Sổ 03: Quản lý chất lượng 207/2026 & 06/2021',
      keywords: 'nghiệm thu hạ tầng kỹ thuật, cao độ san nền, bàn giao vận hành, nhật ký thi công điện tử',
    },
    DAN_DUNG: {
      code: 'LEGAL-11 & LEGAL-12',
      title: 'Sổ 11: Đất đai 2024 & Kinh doanh BĐS 2023 | Sổ 12: PCCC NĐ 50/2024 & Môi trường ĐTM',
      keywords: 'điều kiện mở bán nhà ở hình thành tương lai, bảo lãnh ngân hàng, nghiệm thu PCCC PC07',
    },
    KCN: {
      code: 'LEGAL-08 & LEGAL-02',
      title: 'Sổ 08: Khu công nghiệp & Cụm CN (NĐ 35/2022) | Sổ 02: Quản lý dự án 209/2026 & 175/2024',
      keywords: 'thẩm định một cửa Ban Quản lý KCN, trạm xử lý nước thải tập trung, mật độ xây dựng KCN',
    },
    CCN: {
      code: 'LEGAL-08 & LEGAL-12',
      title: 'Sổ 08: Khu công nghiệp & Cụm CN (NĐ 32/2024) | Sổ 12: PCCC NĐ 50/2024 & Môi trường ĐTM',
      keywords: 'chủ đầu tư hạ tầng kỹ thuật Cụm công nghiệp, thẩm quyền Sở Công Thương, PCCC CCN',
    },
    FTZ: {
      code: 'LEGAL-09 & LEGAL-05',
      title: 'Sổ 09: Khu thương mại tự do FTZ & Hải quan | Sổ 05: Hợp đồng xây dựng 210/2026 & FIDIC',
      keywords: 'hàng rào cứng FTZ, giám sát hải quan tự động, hợp đồng EPC quốc tế, FIDIC',
    },
    PPP_BT: {
      code: 'LEGAL-10 & LEGAL-04',
      title: 'Sổ 10: Đầu tư PPP / BOT / BT (Luật PPP) | Sổ 04: Quản lý chi phí 206/2026 & 10/2021',
      keywords: 'phương án tài chính PPP, kiểm toán nhà nước quyết toán vốn, phát sinh khối lượng VO hợp đồng BT',
    },
  };

  const resolvedNotebook = notebookByProject[projectCode] || notebookByProject.KCN;

  if (gateCode || riskFlag) {
    return `[AI PHÂN TÍCH RỦI RO & BIỆN PHÁP KHẮC PHỤC THEO DỰ ÁN [${projectCode}]]
====================================================================
• Cổng kiểm soát: ${gateCode || 'Stage-Gate'} — Bước ${stepCode || ''}: ${stepTitle || ''}
• Loại hình dự án hiện tại: [${projectCode}] ${projectName}
• Cơ quan thẩm quyền đầu mối: ${authority}
• Cảnh báo rủi ro gốc: "${riskFlag || prompt}"

1. NHẬN DIỆN NGUYÊN NHÂN GỐC RỄ & HỆ QUẢ PHÁP LÝ ĐỐI VỚI DỰ ÁN [${projectCode}]:
   - Điểm nghẽn trọng yếu: ${specialNote}
   - Nếu bỏ qua chốt chặn tại ${gateCode || 'cổng này'}, hồ sơ sẽ bị dừng thẩm định (Hard-Stop), tiềm ẩn rủi ro bị xử phạt VPHC về xây dựng/đầu tư và bị Kiểm toán Nhà nước / Thanh tra xuất toán khi quyết toán tại Gate G14–G15.

2. BIỆN PHÁP KHẮC PHỤC & PHÒNG NGỪA ĐẶC THÙ CHO [${projectCode}] (ACTIONABLE MITIGATIONS):
   ✓ [Biện pháp 1 - Thủ tục & Thẩm quyền]: ${selectedMitigations[0]}
   ✓ [Biện pháp 2 - Kiểm soát Kỹ thuật & Chất lượng]: ${selectedMitigations[1]}
   ✓ [Biện pháp 3 - Hồ sơ & Hợp đồng]: ${selectedMitigations[2]}

3. PHÂN CÔNG TRÁCH NHIỆM RACI & HỒ SƠ ĐẦU RA BẮT BUỘC:
   - Chủ đầu tư (A - Accountable): Ký tờ trình / quyết định phê duyệt chốt chặn ${gateCode || ''} sau khi có báo cáo thẩm tra đạt yêu cầu.
   - Ban QLDA (R - Responsible): Lập checklist rà soát 100% điều kiện tiên quyết, đôn đốc Tư vấn thiết kế / Tư vấn giám sát hoàn thiện hồ sơ khắc phục trong vòng 48h.
   - Tư vấn Giám sát & Nhà thầu (C/R): Bổ sung đầy đủ biên bản nghiệm thu, kết quả thí nghiệm LAS-XD, bản vẽ hoàn công và nhật ký thi công đúng trình tự thời gian (không ký lùi ngày).

4. TỪ KHÓA & SỔ GHI CHÚ NOTEBOOKLM (LEGAL) CẦN TRA CỨU ĐỐI CHIẾU TOÀN VĂN (KHUYẾN NGHỊ CHO BAN QLDA / CHỦ ĐẦU TƯ):
   - Sổ ghi chú chuyên đề: [${resolvedNotebook.code}] ${resolvedNotebook.title}
   - Từ khóa tra cứu Deep-RAG: "${gateCode || 'Stage-Gate'}, ${stepTitle || projectCode}, ${resolvedNotebook.keywords}, điều khoản chuyển tiếp, chế tài xử phạt"`;
  }

  return `[PHÁN QUYẾT PHÁP LÝ & KIỂM TOÁN DỰ ÁN — LEX-PMO OS v3.0]
====================================================================
• Tác nhân thực thi: ${agentName} (${agentId})
• Hệ tọa độ Dự án (Trục Y): [${projectCode}] — ${projectName}
• Cơ quan thẩm quyền đầu mối: ${authority}
• Tình huống phân tích: "${prompt}"

1. ĐỐI SOÁT CHÉO CĂN CỨ PHÁP LÝ 3 TRỤC (TRỤC X × TRỤC Y × TRỤC Z):
   - Nhóm Hoạt động Xây dựng [HDXD]: Áp dụng Điều 15, Điều 39 Nghị định 175/2024/NĐ-CP và Luật Xây dựng 135/2025/QH15.
     + Đặc thù loại hình [${projectCode}]: ${specialNote}
   - Nhóm Quản lý Chi phí [QLCP] & Hợp đồng [QLHD]: Áp dụng Điều 6 (Thứ tự ưu tiên tài liệu HĐ), Điều 19, Điều 37 Nghị định 210/2026/NĐ-CP (hoặc VBHN Nghị định 37/2015 & 50/2021/NĐ-CP theo mốc chuyển tiếp) kết hợp Nghị định 206/2026/NĐ-CP & Luật Đấu thầu 22/2023/QH15.
   - Nhóm Quản lý Chất lượng [QLCL] & Vật liệu [VLXD]: Áp dụng Điều 12 (Chứng chỉ CO/CQ, Hợp chuẩn TCVN, Hợp quy QCVN 16:2023/BXD, thí nghiệm LAS-XD), Điều 15 (Khoản 13 - Nhật ký thi công), Điều 21 Nghị định 207/2026/NĐ-CP & 06/2021/NĐ-CP.

2. LỘ TRÌNH KIỂM SOÁT STAGE-GATE & PHÂN QUYỀN RACI 4 BÊN:
   - [Gate G6 & G9 — Thẩm định Thiết kế & PCCC]: Nếu nội dung điều chỉnh làm thay đổi kết cấu chịu lực chính, mật độ xây dựng hoặc giải pháp PCCC → Bắt buộc trình thẩm định/thẩm duyệt lại tại ${authority} và Cục/Phòng PC07 trước khi thi công.
   - [Gate G11 — Phụ lục Hợp đồng VO]: Ban QLDA (R) và Tư vấn QS thẩm tra dự toán phát sinh (QLCP), kiểm tra số dư dự phòng phí, trình Chủ đầu tư (A) phê duyệt và ký Phụ lục Hợp đồng (QLHD) với Nhà thầu trước khi triển khai.
   - [Gate G12 & G14 — Nghiệm thu & Giải ngân IPC]: Tư vấn Giám sát (R) kiểm tra CO/CQ, kết quả thí nghiệm LAS-XD (VLXD) → Ghi nhận Nhật ký thi công hàng ngày → Ký Biên bản nghiệm thu công việc (QLCL) → Đưa vào Phụ lục 03a.a / Phụ lục 04 giải ngân.

3. CHỐT CHẶN KIỂM TOÁN & TRÌNH TỰ THỜI GIAN HỒ SƠ (FORENSIC AUDIT):
   - Trạng thái kiểm toán ngày tháng hiện tại: ${
     chronoErrorsCount > 0
       ? `ĐANG CÓ ${chronoErrorsCount} CẢNH BÁO ĐỎ (RF-05) — Cần khắc phục ngay trước khi trình ký thanh toán Gate G14.`
       : 'HỢP LỆ 100% (Ngày lấy mẫu ≤ Ngày kết quả LAS-XD ≤ Ngày nghiệm thu VLXD ≤ Ngày nghiệm thu công việc).'
   }
   - Chuẩn hóa tên file lưu trữ vào Kho SSOT (9 thành phần):
     XD_PLHD_CDT_02_2026_QLHD_PhuLucHopDongDieuChinhKhoiLuongPhatSinh.pdf

4. TỪ KHÓA & SỔ GHI CHÚ NOTEBOOKLM (LEGAL) CẦN TRA CỨU ĐỐI CHIẾU TOÀN VĂN (KHUYẾN NGHỊ CHO BAN QLDA / CHỦ ĐẦU TƯ):
   - Sổ ghi chú chuyên đề cần mở: [${resolvedNotebook.code}] ${resolvedNotebook.title} (kèm [LEGAL-01] Luật Xây dựng 135/2025 & [LEGAL-05] Hợp đồng 210/2026).
   - Từ khóa truy vấn Deep-RAG: "${resolvedNotebook.keywords}, điều khoản chuyển tiếp, thẩm quyền phê duyệt ${authority}, hồ sơ thanh quyết toán IPC"`;
}

const handleAnalyzeLegalRequest = async (req: Request, res: Response): Promise<void> => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'Payload yêu cầu không hợp lệ.' });
    return;
  }

  const rawPrompt = typeof req.body.prompt === 'string' ? req.body.prompt : '';
  if (rawPrompt.length > 6000) {
    res.status(413).json({
      error: 'Nội dung truy vấn vượt quá giới hạn an toàn (tối đa 6.000 ký tự).',
    });
    return;
  }

  const prompt = sanitizeText(rawPrompt, 6000);
  if (!prompt) {
    res.status(400).json({
      error: 'Vui lòng nhập nội dung tình huống pháp lý hoặc yêu cầu kiểm toán.',
    });
    return;
  }

  const rawProjectCode = sanitizeText(req.body.projectCode, 20, 'KCN').toUpperCase();
  const projectCode = ALLOWED_PROJECT_CODES.has(rawProjectCode) ? rawProjectCode : 'KCN';

  const agentId = sanitizeText(req.body.agentId, 60, 'AGENT_2_CROSS');
  const agentName = sanitizeText(
    req.body.agentName,
    140,
    'Agent 2 — AI Cross-Exam & Conflict Resolver'
  );
  const projectName = sanitizeText(
    req.body.projectName,
    200,
    'Khu Công Nghiệp (Đầu tư Hạ tầng & Nhà máy KCN)'
  );
  const authority = sanitizeText(
    req.body.authority,
    200,
    'Ban Quản lý KKT & các KCN (Một cửa tại chỗ)'
  );
  const specialNote = sanitizeText(
    req.body.specialNote,
    500,
    'Thẩm định dự án/thiết kế thông qua Ban Quản lý KCN; kiểm soát ĐTM KCN, trạm xử lý nước thải tập trung.'
  );
  const chronoErrorsCount = Math.max(
    0,
    Math.min(100, Number.isFinite(Number(req.body.chronoErrorsCount)) ? Number(req.body.chronoErrorsCount) : 0)
  );
  const gateCode = sanitizeText(req.body.gateCode, 20) || undefined;
  const stepCode = sanitizeText(req.body.stepCode, 30) || undefined;
  const stepTitle = sanitizeText(req.body.stepTitle, 200) || undefined;
  const riskFlag = sanitizeText(req.body.riskFlag, 500) || undefined;

  const ai = getGeminiClient();

  if (ai) {
    try {
      const systemInstruction = `Bạn là Tổng Công Trình Sư Pháp Lý & Quản Lý Dự Án Đầu Tư Xây Dựng (LEX-PMO OS v3.0), đóng vai trò ${agentName} (${agentId}).
Hãy phân tích chuyên sâu, chính xác theo Hệ tọa độ Ma trận 3 Trục và Kho tri thức NotebookLM Deep-RAG (14 sổ LEGAL: LEGAL-01 Luật Xây dựng 135/2025, LEGAL-02 NĐ Quản lý dự án 209/2026 & 175/2024, LEGAL-03 NĐ Quản lý chất lượng 207/2026 & 06/2021, LEGAL-04 NĐ Quản lý chi phí 206/2026 & 10/2021, LEGAL-05 NĐ Hợp đồng xây dựng 210/2026 & 37/2015, LEGAL-06 Luật Đấu thầu 22/2023 & NĐ 24/2024, LEGAL-07 Hệ thống QCVN/TCVN, LEGAL-08 KCN/CCN NĐ 35/2022 & 32/2024, LEGAL-09 FTZ & Hải quan, LEGAL-10 PPP/BOT/BT, LEGAL-11 Đất đai 2024 & BĐS 2023, LEGAL-12 PCCC NĐ 50/2024 & ĐTM, LEGAL-13 Thanh quyết toán & HĐĐT NĐ 70/2025, LEGAL-14 Lộ trình BIM TT 12/2025 & CDE ISO 19650):
- Trục 1 (Pháp luật): Luật Xây dựng 135/2025, Luật Đấu thầu 2023, Luật Nhà ở/KDBĐS 2023, Luật PPP, Nghị định 209/2026 & 175/2024/NĐ-CP, Nghị định 207/2026 & 06/2021/NĐ-CP, Nghị định 206/2026 & 10/2021/NĐ-CP, Nghị định 210/2026 & VBHN 37/2015 & 50/2021/NĐ-CP, Nghị định 35/2022/NĐ-CP (KCN), Nghị định 32/2024/NĐ-CP (CCN).
- Trục 2 (Loại hình dự án đang chọn): [${projectCode}] ${projectName}. Cơ quan thẩm quyền đầu mối: ${authority}. Lưu ý đặc thù: ${specialNote}.
- Trục 3 (Chức năng): QLCL, HDXD, QLHD, QLCP, VLXD, TCVN, QCVN, DTH, TQT, PCCC, QHDD, ATLD, DTU.

Trình bày báo cáo rõ ràng theo 5 phần:
1. Nhận diện nguyên nhân gốc rễ & Đối soát căn cứ pháp lý 3 Trục (nêu rõ điều khoản).
2. Các biện pháp khắc phục & phòng ngừa rủi ro cụ thể dựa trên loại hình dự án [${projectCode}] và cơ quan thẩm quyền ${authority}.
3. Phân công trách nhiệm RACI 4 bên (Chủ đầu tư, Ban QLDA, Tư vấn Giám sát, Tư vấn Thiết kế, Nhà thầu) & Hồ sơ minh chứng bắt buộc.
4. Đề xuất tên file hồ sơ khắc phục chuẩn SSOT 9 thành phần.
5. BẮT BUỘC gợi ý mục "Từ khóa & Sổ ghi chú NotebookLM (LEGAL) cần tra cứu đối chiếu toàn văn" trong phần khuyến nghị cho Ban QLDA / Chủ đầu tư (chỉ rõ mã sổ LEGAL-01..LEGAL-14 và bộ từ khóa truy vấn Deep-RAG).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const replyText = response.text;
      if (replyText && replyText.trim().length > 0) {
        serverAuditLogs.unshift({
          id: `AUD-2026-${String(serverAuditLogs.length + 1).padStart(4, '0')}`,
          timestamp: new Date().toISOString(),
          actorId: 'AI-ENGINE',
          actorName: agentName,
          actorRole: 'AI Legal Agent (Gemini Server-Side)',
          actor_role: 'PMU',
          module: 'AI_AGENT',
          action: `Phân tích rủi ro & gợi ý biện pháp khắc phục cho dự án [${projectCode}]`,
          entityRef: `${gateCode || agentId} / ${projectCode}`,
          newState: 'AI_VERDICT_GENERATED',
          riskSeverity: chronoErrorsCount > 0 ? 'WARNING' : 'NOMINAL',
        });

        res.json({
          source: 'gemini-4-hydrogen',
          report: replyText,
        });
        return;
      }
    } catch {
      console.warn('Server-side Gemini analyze notice: falling back to deterministic legal engine.');
    }
  }

  // Fallback to Deterministic Built-in Legal Engine so the app always works reliably
  const deterministicReport = buildDeterministicLegalReport({
    agentId,
    agentName,
    projectCode,
    projectName,
    authority,
    specialNote,
    prompt,
    chronoErrorsCount,
    gateCode,
    stepCode,
    stepTitle,
    riskFlag,
  });

  serverAuditLogs.unshift({
    id: `AUD-2026-${String(serverAuditLogs.length + 1).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    actorId: 'AI-ENGINE',
    actorName: agentName,
    actorRole: 'Deterministic Legal Engine',
    actor_role: 'PMU',
    module: 'AI_AGENT',
    action: `Xuất phán quyết pháp lý 3 Trục cho dự án [${projectCode}]`,
    entityRef: `${agentId} / ${projectCode}`,
    newState: 'DETERMINISTIC_VERDICT_GENERATED',
    riskSeverity: chronoErrorsCount > 0 ? 'WARNING' : 'NOMINAL',
  });

  res.json({
    source: 'built-in-legal-engine',
    report: deterministicReport,
  });
};

app.post('/api/gemini/analyze-legal', handleAnalyzeLegalRequest);
app.post('/api/gemini/analyze', handleAnalyzeLegalRequest);

// ============================================================================
// SERVER-SIDE GEMINI LEGAL CLAUSE COMPARISON & HIGHLIGHTING (STEP 2)
// ============================================================================
app.post('/api/gemini/compare-clauses', async (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: 'Payload yêu cầu không hợp lệ.' });
    return;
  }

  const { leftClause, rightClause } = req.body;

  if (
    !leftClause ||
    !rightClause ||
    typeof leftClause !== 'object' ||
    typeof rightClause !== 'object' ||
    typeof leftClause.content !== 'string' ||
    typeof rightClause.content !== 'string'
  ) {
    res.status(400).json({
      error: 'Thiếu thông tin 2 điều khoản cần đối chiếu để thực hiện phân tích chênh lệch pháp lý.',
    });
    return;
  }

  if (leftClause.content.length > 12000 || rightClause.content.length > 12000) {
    res.status(413).json({
      error: 'Nội dung điều khoản đối chiếu vượt quá giới hạn cho phép (tối đa 12.000 ký tự/điều khoản).',
    });
    return;
  }

  const rawProjectCode = sanitizeText(req.body.projectCode, 20, 'KCN').toUpperCase();
  const projectCode = ALLOWED_PROJECT_CODES.has(rawProjectCode) ? rawProjectCode : 'KCN';
  const projectName = sanitizeText(req.body.projectName, 200, 'Khu Công Nghiệp');
  const authority = sanitizeText(req.body.authority, 200, 'Ban Quản lý KKT & các KCN');

  const safeLeft = {
    docNumber: sanitizeText(leftClause.docNumber, 80, 'VB-A'),
    docType: sanitizeText(leftClause.docType, 40),
    issueDate: sanitizeText(leftClause.issueDate, 40),
    effectiveDate: sanitizeText(leftClause.effectiveDate, 40),
    status: sanitizeText(leftClause.status, 80),
    nodeCode: sanitizeText(leftClause.nodeCode, 60, 'Điều A'),
    nodeTitle: sanitizeText(leftClause.nodeTitle, 240),
    content: sanitizeText(leftClause.content, 12000),
  };

  const safeRight = {
    docNumber: sanitizeText(rightClause.docNumber, 80, 'VB-B'),
    docType: sanitizeText(rightClause.docType, 40),
    issueDate: sanitizeText(rightClause.issueDate, 40),
    effectiveDate: sanitizeText(rightClause.effectiveDate, 40),
    status: sanitizeText(rightClause.status, 80),
    nodeCode: sanitizeText(rightClause.nodeCode, 60, 'Điều B'),
    nodeTitle: sanitizeText(rightClause.nodeTitle, 240),
    content: sanitizeText(rightClause.content, 12000),
  };

  if (!safeLeft.content || !safeRight.content) {
    res.status(400).json({
      error: 'Nội dung điều khoản đối chiếu không được để trống.',
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'Chưa phát hiện GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra khóa API trong Settings > Secrets để sử dụng tính năng AI Phân tích chênh lệch pháp lý.',
    });
    return;
  }

  try {
    const differenceItemSchema = {
      type: Type.OBJECT,
      properties: {
        aspect: {
          type: Type.STRING,
          description: 'Tên khía cạnh pháp lý đang đối chiếu ngắn gọn bằng tiếng Việt.',
        },
        clauseAValue: {
          type: Type.STRING,
          description: 'Quy định/giá trị tương ứng tại Điều khoản A (hoặc "Không đề cập").',
        },
        clauseBValue: {
          type: Type.STRING,
          description: 'Quy định/giá trị tương ứng tại Điều khoản B (hoặc "Không đề cập").',
        },
        impactNote: {
          type: Type.STRING,
          description: 'Hệ quả pháp lý hoặc lưu ý thực thi đối với Ban QLDA / Kiểm toán.',
        },
      },
      required: ['aspect', 'clauseAValue', 'clauseBValue', 'impactNote'],
    };

    const highlightSpanSchema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Chỉ nhận 1 trong 3 giá trị: TIMELINE, AUTHORITY, TECHNICAL.',
        },
        phrase: {
          type: Type.STRING,
          description:
            'Cụm từ trích xuất NGUYÊN VĂN (exact substring) xuất hiện trong nội dung điều khoản đó để tô sáng trực tiếp.',
        },
        reason: {
          type: Type.STRING,
          description: 'Giải thích ngắn gọn vì sao cụm từ này là điểm chênh lệch giữa A và B.',
        },
      },
      required: ['category', 'phrase', 'reason'],
    };

    const promptText = `Hãy đối chiếu chi tiết 2 điều khoản pháp lý xây dựng sau cho dự án [${projectCode}] (${projectName}) — Cơ quan thẩm quyền đầu mối: ${authority}.

=== ĐIỀU KHOẢN A (CƠ SỞ) ===
- Văn bản: ${safeLeft.docNumber} (${safeLeft.docType}) | Ban hành: ${safeLeft.issueDate} | Hiệu lực: ${safeLeft.effectiveDate}
- Trạng thái: ${safeLeft.status}
- Điều khoản: ${safeLeft.nodeCode} ${safeLeft.nodeTitle}
- Nội dung chi tiết A:
"""
${safeLeft.content}
"""

=== ĐIỀU KHOẢN B (ĐỐI CHIẾU) ===
- Văn bản: ${safeRight.docNumber} (${safeRight.docType}) | Ban hành: ${safeRight.issueDate} | Hiệu lực: ${safeRight.effectiveDate}
- Trạng thái: ${safeRight.status}
- Điều khoản: ${safeRight.nodeCode} ${safeRight.nodeTitle}
- Nội dung chi tiết B:
"""
${safeRight.content}
"""

Yêu cầu phân tích chặt chẽ:
1. Chỉ rõ các chênh lệch về MỐC THỜI GIAN / THỜI HẠN (timelineDifferences: hiệu lực, thời hạn 24 giờ, số ngày nghiệm thu, thời điểm áp dụng chuyển tiếp...).
2. Chỉ rõ các chênh lệch về CẤP THẨM QUYỀN / CHỦ THỂ (authorityDifferences: Chủ đầu tư, Ban QLDA, TVGS, TVTK, Nhà thầu, UBND, Sở Xây dựng, Ban Quản lý KCN/KKT, Bộ chuyên ngành...).
3. Chỉ rõ các chênh lệch về YÊU CẦU KỸ THUẬT / TIÊU CHUẨN / HỒ SƠ (technicalDifferences: BIM, chữ ký số CA, nhật ký điện tử, LAS-XD, QCVN/TCVN, bản vẽ hoàn công, Phụ lục IIa, CO/CQ, nghiệm thu/thanh toán VO...).
4. Trong highlightTargetsA và highlightTargetsB, trích xuất các cụm từ NGẮN (2-10 từ) xuất hiện CHÍNH XÁC NGUYÊN VĂN trong "Nội dung chi tiết A" và "Nội dung chi tiết B" thuộc 3 nhóm category (TIMELINE, AUTHORITY, TECHNICAL) để UI tô sáng trực tiếp lên văn bản.
5. Trong trường recommendedAction (khuyến nghị cho Ban QLDA / Chủ đầu tư), BẮT BUỘC tự động gợi ý thêm mục "Từ khóa & Sổ ghi chú NotebookLM (LEGAL) cần tra cứu đối chiếu toàn văn" (nêu rõ mã sổ thuộc bộ 14 sổ LEGAL như LEGAL-01 Luật Xây dựng 135/2025, LEGAL-02 NĐ 209/2026 & 175/2024, LEGAL-03 NĐ 207/2026 & 06/2021, LEGAL-04 NĐ 206/2026 & 10/2021, LEGAL-05 NĐ 210/2026 & 37/2015, LEGAL-06 Đấu thầu, LEGAL-07 QCVN/TCVN, LEGAL-08 KCN/CCN... kèm từ khóa truy vấn Deep-RAG).`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        systemInstruction:
          'Bạn là Chuyên gia Pháp chế Xây dựng & Kiểm toán Đầu tư Công Việt Nam. Luôn trả về JSON đúng schema tiếng Việt, súc tích, chính xác. Mọi phrase trong highlightTargetsA/B phải xuất hiện nguyên văn trong văn bản tương ứng. Trong recommendedAction, luôn đính kèm gợi ý "Từ khóa & Sổ ghi chú NotebookLM (LEGAL) cần tra cứu đối chiếu toàn văn" cho Ban QLDA / Chủ đầu tư.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaryVerdict: {
              type: Type.STRING,
              description: 'Tóm tắt ngắn gọn (2-3 câu) về chênh lệch pháp lý cốt lõi giữa A và B.',
            },
            timelineDifferences: {
              type: Type.ARRAY,
              items: differenceItemSchema,
            },
            authorityDifferences: {
              type: Type.ARRAY,
              items: differenceItemSchema,
            },
            technicalDifferences: {
              type: Type.ARRAY,
              items: differenceItemSchema,
            },
            recommendedAction: {
              type: Type.STRING,
              description:
                'Khuyến nghị hành động cụ thể cho Ban QLDA / Chủ đầu tư / Nhà thầu, kèm "Từ khóa & Sổ ghi chú NotebookLM (LEGAL) cần tra cứu đối chiếu toàn văn".',
            },
            highlightTargetsA: {
              type: Type.ARRAY,
              items: highlightSpanSchema,
            },
            highlightTargetsB: {
              type: Type.ARRAY,
              items: highlightSpanSchema,
            },
          },
          required: [
            'summaryVerdict',
            'timelineDifferences',
            'authorityDifferences',
            'technicalDifferences',
            'recommendedAction',
            'highlightTargetsA',
            'highlightTargetsB',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({
        error: 'Dịch vụ AI trả về nội dung rỗng. Vui lòng thử phân tích lại.',
      });
      return;
    }

    const parsed = JSON.parse(rawText);
    const normalizeCategory = (val: unknown): 'TIMELINE' | 'AUTHORITY' | 'TECHNICAL' => {
      const upper = String(val || '').toUpperCase();
      if (upper === 'TIMELINE') return 'TIMELINE';
      if (upper === 'AUTHORITY') return 'AUTHORITY';
      return 'TECHNICAL';
    };

    const analysis = {
      summaryVerdict: sanitizeText(parsed.summaryVerdict, 1500),
      timelineDifferences: Array.isArray(parsed.timelineDifferences) ? parsed.timelineDifferences : [],
      authorityDifferences: Array.isArray(parsed.authorityDifferences) ? parsed.authorityDifferences : [],
      technicalDifferences: Array.isArray(parsed.technicalDifferences) ? parsed.technicalDifferences : [],
      recommendedAction: sanitizeText(parsed.recommendedAction, 1500),
      highlightTargetsA: Array.isArray(parsed.highlightTargetsA)
        ? parsed.highlightTargetsA
            .filter((s: { phrase?: string }) => s && typeof s.phrase === 'string' && s.phrase.trim().length >= 2)
            .map((s: { category?: string; phrase: string; reason?: string }) => ({
              category: normalizeCategory(s.category),
              phrase: sanitizeText(s.phrase, 160),
              reason: sanitizeText(s.reason, 300),
            }))
        : [],
      highlightTargetsB: Array.isArray(parsed.highlightTargetsB)
        ? parsed.highlightTargetsB
            .filter((s: { phrase?: string }) => s && typeof s.phrase === 'string' && s.phrase.trim().length >= 2)
            .map((s: { category?: string; phrase: string; reason?: string }) => ({
              category: normalizeCategory(s.category),
              phrase: sanitizeText(s.phrase, 160),
              reason: sanitizeText(s.reason, 300),
            }))
        : [],
    };

    serverAuditLogs.unshift({
      id: `AUD-2026-${String(serverAuditLogs.length + 1).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      actorId: 'AI-ENGINE',
      actorName: 'AI Legal Comparison Copilot',
      actorRole: 'Gemini Server-Side',
      actor_role: 'PMU',
      module: 'VBPL_CROSS',
      action: `AI Phân tích chênh lệch pháp lý: ${safeLeft.docNumber} (${safeLeft.nodeCode}) ↔ ${safeRight.docNumber} (${safeRight.nodeCode})`,
      entityRef: `${projectCode} / ${safeLeft.nodeCode}↔${safeRight.nodeCode}`,
      newState: 'AI_DIFF_ANALYZED',
      riskSeverity: 'NOMINAL',
    });

    res.json({
      source: 'gemini-4-hydrogen',
      analyzedAt: new Date().toLocaleTimeString('vi-VN'),
      analysis,
    });
  } catch {
    console.error('Server-side Gemini compare-clauses error (details suppressed from client).');
    res.status(502).json({
      error:
        'Không thể hoàn tất phân tích chênh lệch pháp lý từ dịch vụ AI lúc này. Vui lòng thử lại sau.',
    });
  }
});

// Middleware xử lý lỗi tập trung (Ẩn hoàn toàn stack trace nội bộ khỏi phản hồi client)
app.use((err: { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({
      error: 'Kích thước dữ liệu gửi lên vượt quá giới hạn an toàn của máy chủ (256KB).',
    });
    return;
  }
  if (err?.type === 'entity.parse.failed' || err?.status === 400) {
    res.status(400).json({
      error: 'Định dạng JSON đầu vào không hợp lệ.',
    });
    return;
  }
  res.status(500).json({
    error: 'Đã xảy ra lỗi nội bộ trên máy chủ. Chi tiết kỹ thuật đã được ẩn để bảo mật.',
  });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LEX-PMO OS v3.0 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

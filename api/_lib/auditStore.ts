import type { AuditModuleCode, AuditRiskSeverity, CanonicalActorRole } from './validation.js';

export interface ServerAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actor_role?: CanonicalActorRole;
  module: AuditModuleCode;
  action: string;
  entityRef: string;
  previousState?: string;
  newState: string;
  riskSeverity: AuditRiskSeverity;
  sha256Hash?: string;
  accountabilityNote?: string;
}

export const MAX_AUDIT_LOGS = 500;

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

let auditSequence = serverAuditLogs.length;

export function getAuditLogs(limit = 200): ServerAuditLog[] {
  return serverAuditLogs.slice(0, limit);
}

export function prependAuditLog(
  entry: Omit<ServerAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): ServerAuditLog {
  const nextId = entry.id || `AUD-2026-${String(++auditSequence).padStart(4, '0')}`;
  const newEntry: ServerAuditLog = {
    ...entry,
    id: nextId,
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  serverAuditLogs.unshift(newEntry);
  if (serverAuditLogs.length > MAX_AUDIT_LOGS) {
    serverAuditLogs.length = MAX_AUDIT_LOGS;
  }

  return newEntry;
}

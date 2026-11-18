import type { IncomingMessage } from 'node:http';
import { getHeaderString } from './http.js';

export type CanonicalActorRole = 'CDT' | 'PMU' | 'TVGS' | 'CONTRACTOR';

export type AuditModuleCode =
  | 'INGEST_3D'
  | 'VBPL_CROSS'
  | 'STAGE_GATE'
  | 'QAQC_EXEC'
  | 'VO_AUDIT'
  | 'HRM_RACI'
  | 'ASSET_LAS'
  | 'AI_AGENT';

export type AuditRiskSeverity = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export const VALID_CANONICAL_ROLES = new Set<CanonicalActorRole>([
  'CDT',
  'PMU',
  'TVGS',
  'CONTRACTOR',
]);

export const ALLOWED_PROJECT_CODES = new Set([
  'HTKT',
  'DAN_DUNG',
  'KCN',
  'CCN',
  'FTZ',
  'PPP_BT',
]);

export const ALLOWED_AUDIT_MODULES = new Set<AuditModuleCode>([
  'INGEST_3D',
  'VBPL_CROSS',
  'STAGE_GATE',
  'QAQC_EXEC',
  'VO_AUDIT',
  'HRM_RACI',
  'ASSET_LAS',
  'AI_AGENT',
]);

export const ALLOWED_RISK_SEVERITIES = new Set<AuditRiskSeverity>([
  'NOMINAL',
  'WARNING',
  'CRITICAL',
]);

/**
 * Làm sạch chuỗi văn bản đầu vào: loại bỏ ký tự điều khiển ẩn / null-byte, cắt độ dài tối đa.
 */
export function sanitizeText(input: unknown, maxLength = 500, fallback = ''): string {
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
 * Hỗ trợ ánh xạ tương thích từ mã nội bộ (`BQLDA`/`ADMIN_PMO` -> `PMU`, `NTTC` -> `CONTRACTOR`, `TVTK` -> `TVGS`).
 */
export function normalizeAndValidateActorRole(rawInput: unknown): CanonicalActorRole | null {
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

export function resolveActorRoleFromRequest(
  req: IncomingMessage,
  body: Record<string, unknown> | null | undefined,
  allowedCanonicalRoles: CanonicalActorRole[] = ['CDT', 'PMU', 'TVGS', 'CONTRACTOR']
): CanonicalActorRole | null {
  const rawHeaderRole = getHeaderString(req, 'x-actor-role');
  const candidateRole = body?.actor_role || rawHeaderRole || body?.actorRole || 'PMU';

  const validatedRole = normalizeAndValidateActorRole(candidateRole);
  if (!validatedRole || !allowedCanonicalRoles.includes(validatedRole)) {
    return null;
  }
  return validatedRole;
}

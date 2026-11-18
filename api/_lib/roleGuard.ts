import { createHash, timingSafeEqual } from 'node:crypto';
import { normalizeAndValidateActorRole } from './validation.js';

export type GuardedRoleCode = 'CDT' | 'PMU' | 'TVGS';

export const GUARDED_ROLE_ORDER: GuardedRoleCode[] = ['CDT', 'PMU', 'TVGS'];

export interface RolePasscodeConfig {
  protected: boolean;
  demoMode: boolean;
  guardedRoles: GuardedRoleCode[];
  passcodes: Partial<Record<GuardedRoleCode, string>>;
  configError?: string;
}

function normalizeGuardRoleKey(rawKey: string): GuardedRoleCode | null {
  const canonical = normalizeAndValidateActorRole(rawKey);
  if (canonical === 'CDT' || canonical === 'PMU' || canonical === 'TVGS') {
    return canonical;
  }
  return null;
}

/**
 * Đọc biến môi trường `ROLE_PASSCODES` theo 2 định dạng chuẩn:
 * 1. Dạng chuỗi phân tách: `CDT:pass1,PMU:pass2,TVGS:pass3` (hỗ trợ `,` / `;` / xuống dòng và `:` hoặc `=`)
 * 2. Dạng JSON object: `{"CDT":"pass1","PMU":"pass2","TVGS":"pass3"}`
 * Nếu biến chưa đặt hoặc rỗng -> tự động fallback về Demo Mode (`protected: false, demoMode: true`).
 */
export function parseRolePasscodes(rawEnv = process.env.ROLE_PASSCODES): RolePasscodeConfig {
  const passcodes: Partial<Record<GuardedRoleCode, string>> = {};
  const trimmed = typeof rawEnv === 'string' ? rawEnv.trim() : '';

  if (!trimmed) {
    return {
      protected: false,
      demoMode: true,
      guardedRoles: [],
      passcodes,
    };
  }

  let parseFailed = false;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        parseFailed = true;
      } else {
        for (const [rawKey, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
          const role = normalizeGuardRoleKey(rawKey);
          if (role && typeof rawValue === 'string' && rawValue.trim().length > 0) {
            passcodes[role] = rawValue.trim();
          } else {
            parseFailed = true;
          }
        }
      }
    } catch {
      parseFailed = true;
    }
  } else {
    const segments = trimmed.split(/[,;\r\n]+/);
    for (const segment of segments) {
      const cleanSegment = segment.trim();
      if (!cleanSegment) continue;
      const match = cleanSegment.match(/^([^:=]+?)\s*[:=]\s*(.+)$/);
      if (!match) {
        parseFailed = true;
        continue;
      }
      const role = normalizeGuardRoleKey(match[1]);
      const value = match[2].trim();
      if (role && value.length > 0) {
        passcodes[role] = value;
      } else {
        parseFailed = true;
      }
    }
  }

  const guardedRoles = GUARDED_ROLE_ORDER.filter(role => Boolean(passcodes[role]));

  if (parseFailed || guardedRoles.length === 0) {
    return {
      protected: true,
      demoMode: false,
      guardedRoles: [...GUARDED_ROLE_ORDER],
      passcodes: {},
      configError: 'ROLE_PASSCODES is misconfigured on server',
    };
  }

  return {
    protected: true,
    demoMode: false,
    guardedRoles,
    passcodes,
  };
}

export function verifyPasscodeTimingSafe(submitted: string, expected: string): boolean {
  const submittedDigest = createHash('sha256').update(submitted, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(submittedDigest, expectedDigest);
}

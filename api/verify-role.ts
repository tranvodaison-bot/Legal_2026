import type { ServerResponse } from 'node:http';
import {
  HttpError,
  type NodeRequestWithOptionalBody,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
  setSecurityHeaders,
} from './_lib/http.js';
import { parseRolePasscodes, verifyPasscodeTimingSafe } from './_lib/roleGuard.js';
import { normalizeAndValidateActorRole } from './_lib/validation.js';

export default async function handler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const config = parseRolePasscodes();

  if (req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      protected: config.protected,
      demoMode: config.demoMode,
      guardedRoles: config.guardedRoles,
      ...(config.configError ? { configError: config.configError } : {}),
    });
    return;
  }

  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['GET', 'POST', 'OPTIONS']);
    return;
  }

  if (config.configError) {
    sendJson(res, 500, {
      ok: false,
      verified: false,
      error: 'ROLE_PASSCODES configuration error on server',
    });
    return;
  }

  let rawBody: unknown;
  try {
    rawBody = await readJsonBody(req);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { ok: false, verified: false, error: err.message });
      return;
    }
    sendJson(res, 400, {
      ok: false,
      verified: false,
      error: 'Định dạng JSON đầu vào không hợp lệ.',
    });
    return;
  }

  const body =
    rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
      ? (rawBody as Record<string, unknown>)
      : null;

  const canonicalRole = normalizeAndValidateActorRole(body?.role);
  if (!canonicalRole) {
    sendJson(res, 400, {
      ok: false,
      verified: false,
      error: 'Vai trò không hợp lệ. Chỉ chấp nhận CDT, PMU (BQLDA), TVGS hoặc CONTRACTOR (NTTC).',
    });
    return;
  }

  if (!config.protected) {
    sendJson(res, 200, {
      ok: true,
      verified: true,
      role: canonicalRole,
      demoMode: true,
      protected: false,
      message: 'Demo Mode đang bật (chưa cấu hình ROLE_PASSCODES).',
    });
    return;
  }

  if (canonicalRole === 'CONTRACTOR' || !config.passcodes[canonicalRole]) {
    sendJson(res, 200, {
      ok: true,
      verified: true,
      role: canonicalRole,
      demoMode: false,
      protected: true,
    });
    return;
  }

  const submittedPasscode = typeof body?.passcode === 'string' ? body.passcode.trim() : '';
  if (!submittedPasscode) {
    sendJson(res, 400, {
      ok: false,
      verified: false,
      role: canonicalRole,
      demoMode: false,
      protected: true,
      error: `Vui lòng nhập mã Passcode cho vai trò ${canonicalRole}.`,
    });
    return;
  }

  const expectedPasscode = config.passcodes[canonicalRole]!;
  if (!verifyPasscodeTimingSafe(submittedPasscode, expectedPasscode)) {
    sendJson(res, 401, {
      ok: false,
      verified: false,
      role: canonicalRole,
      demoMode: false,
      protected: true,
      error: `Mã Passcode không chính xác cho vai trò ${canonicalRole}.`,
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    verified: true,
    role: canonicalRole,
    demoMode: false,
    protected: true,
    message: `Xác thực vai trò ${canonicalRole} thành công.`,
  });
}

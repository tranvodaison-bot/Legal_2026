import type { ServerResponse } from 'node:http';
import { getAuditLogs, prependAuditLog, type ServerAuditLog } from './_lib/auditStore.js';
import {
  HttpError,
  type NodeRequestWithOptionalBody,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from './_lib/http.js';
import {
  ALLOWED_AUDIT_MODULES,
  ALLOWED_RISK_SEVERITIES,
  resolveActorRoleFromRequest,
  sanitizeText,
} from './_lib/validation.js';

export default async function handler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method === 'GET') {
    sendJson(res, 200, { logs: getAuditLogs(200) });
    return;
  }

  if (req.method !== 'POST') {
    sendMethodNotAllowed(res, ['GET', 'POST']);
    return;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    sendJson(res, 400, { error: 'Định dạng JSON đầu vào không hợp lệ.' });
    return;
  }

  const bodyRecord =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;

  const validatedActorRole = resolveActorRoleFromRequest(req, bodyRecord, [
    'CDT',
    'PMU',
    'TVGS',
    'CONTRACTOR',
  ]);
  if (!validatedActorRole) {
    sendJson(res, 403, {
      error:
        'RBAC Từ chối truy cập: Mã vai trò actor_role không hợp lệ. Chỉ chấp nhận CDT, PMU, TVGS hoặc CONTRACTOR.',
    });
    return;
  }

  if (!bodyRecord) {
    sendJson(res, 400, {
      error: 'Dữ liệu đầu vào không hợp lệ: Thiếu action hoặc entityRef cho Nhật ký Kiểm toán.',
    });
    return;
  }

  const action = sanitizeText(bodyRecord.action, 400);
  const entityRef = sanitizeText(bodyRecord.entityRef, 240);
  if (!action || !entityRef) {
    sendJson(res, 400, {
      error: 'Dữ liệu đầu vào không hợp lệ: Thiếu action hoặc entityRef cho Nhật ký Kiểm toán.',
    });
    return;
  }

  const rawModule = sanitizeText(bodyRecord.module, 40, 'STAGE_GATE') as ServerAuditLog['module'];
  const safeModule: ServerAuditLog['module'] = ALLOWED_AUDIT_MODULES.has(rawModule)
    ? rawModule
    : 'STAGE_GATE';

  const rawSeverity = sanitizeText(
    bodyRecord.riskSeverity,
    20,
    'NOMINAL'
  ) as ServerAuditLog['riskSeverity'];
  const safeSeverity: ServerAuditLog['riskSeverity'] = ALLOWED_RISK_SEVERITIES.has(rawSeverity)
    ? rawSeverity
    : 'NOMINAL';

  const rawHash = sanitizeText(bodyRecord.sha256Hash, 128);
  const safeHash = /^[a-fA-F0-9]{8,64}$/.test(rawHash) ? rawHash.toUpperCase() : undefined;

  const newEntry = prependAuditLog({
    actorId: sanitizeText(bodyRecord.actorId, 40, 'EMP-01'),
    actorName: sanitizeText(bodyRecord.actorName, 120, 'Ban QLDA Đại Sơn'),
    actorRole: sanitizeText(bodyRecord.actorRole, 80, validatedActorRole),
    actor_role: validatedActorRole,
    module: safeModule,
    action,
    entityRef,
    previousState: sanitizeText(bodyRecord.previousState, 80) || undefined,
    newState: sanitizeText(bodyRecord.newState, 80, 'COMPLETED'),
    riskSeverity: safeSeverity,
    sha256Hash: safeHash,
    accountabilityNote: sanitizeText(bodyRecord.accountabilityNote, 600) || undefined,
  });

  sendJson(res, 201, { log: newEntry });
}

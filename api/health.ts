import type { ServerResponse } from 'node:http';
import { isGeminiConfigured } from './_lib/gemini.js';
import { type NodeRequestWithOptionalBody, sendJson, sendMethodNotAllowed } from './_lib/http.js';
import { parseRolePasscodes } from './_lib/roleGuard.js';

export default async function handler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const roleConfig = parseRolePasscodes();
  sendJson(res, 200, {
    status: 'ok',
    service: 'lex-pmo-os-v3',
    timestamp: new Date().toISOString(),
    geminiConfigured: isGeminiConfigured(),
    roleGuardMode: roleConfig.configError
      ? 'config-error'
      : roleConfig.protected
      ? 'passcode-required'
      : 'demo-fallback',
  });
}

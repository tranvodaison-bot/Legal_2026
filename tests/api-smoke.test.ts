import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import healthHandler from '../api/health.js';
import auditLogsHandler from '../api/audit-logs.js';
import analyzeHandler from '../api/gemini/analyze.js';
import { createAnalyzeLegalHandler } from '../api/gemini/analyze-legal.js';
import { createCompareClausesHandler } from '../api/gemini/compare-clauses.js';
import verifyRoleHandler from '../api/verify-role.js';
import { MAX_AUDIT_LOGS, getAuditLogs, prependAuditLog } from '../api/_lib/auditStore.js';
import type { GeminiClientLike, GeminiGenerateContentParams } from '../api/_lib/gemini.js';
import { toCanonicalGuardRole } from '../src/services/ssotBridgeService.js';
import {
  buildAutoSuggestedTags,
  buildFileNameByRule,
  cleanDocNumber,
  createSampleBatchItems,
  parseRawTagInput,
  resolveDocTaxonomyFromTags,
  smartAnalyzeFile3D,
  stripRedundantSummaryPrefix,
  syncSuggestionWithSmartTags,
  toPascalCaseVN,
  validateBatchFileName,
} from '../src/utils/legalParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

async function invokeOverHttp(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>,
  options: {
    method: string;
    path?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }
): Promise<{ status: number; headers: http.IncomingHttpHeaders; json: Record<string, unknown> }> {
  const server = http.createServer((req, res) => {
    void handler(req, res).catch(err => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err) }));
    });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}${options.path || '/'}`;
    const hasBody = options.body !== undefined;
    const response = await fetch(url, {
      method: options.method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: hasBody
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    });
    const text = await response.text();
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      json,
    };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

test('GET /api/health reports status without leaking secrets and rejects non-GET with 405', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  const prevPass = process.env.ROLE_PASSCODES;

  try {
    delete process.env.GEMINI_API_KEY;
    delete process.env.ROLE_PASSCODES;

    const resUnset = await invokeOverHttp(healthHandler, { method: 'GET', path: '/api/health' });
    assert.equal(resUnset.status, 200);
    assert.equal(resUnset.json.status, 'ok');
    assert.equal(resUnset.json.service, 'lex-pmo-os-v3');
    assert.equal(resUnset.json.geminiConfigured, false);
    assert.equal(resUnset.json.roleGuardMode, 'demo-fallback');

    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    const resPlaceholder = await invokeOverHttp(healthHandler, { method: 'GET' });
    assert.equal(resPlaceholder.json.geminiConfigured, false);

    process.env.GEMINI_API_KEY = 'secret-test-key-do-not-leak';
    process.env.ROLE_PASSCODES = 'CDT:pass1';
    const resConfigured = await invokeOverHttp(healthHandler, { method: 'GET' });
    assert.equal(resConfigured.status, 200);
    assert.equal(resConfigured.json.geminiConfigured, true);
    assert.equal(resConfigured.json.roleGuardMode, 'passcode-required');
    const serialized = JSON.stringify(resConfigured.json);
    assert.equal(serialized.includes('secret-test-key-do-not-leak'), false);
    assert.equal(serialized.includes('pass1'), false);

    const resMethod = await invokeOverHttp(healthHandler, { method: 'POST' });
    assert.equal(resMethod.status, 405);
  } finally {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
    if (prevPass === undefined) delete process.env.ROLE_PASSCODES;
    else process.env.ROLE_PASSCODES = prevPass;
  }
});

test('/api/audit-logs enforces RBAC actor_role, validation, sanitization, and in-memory persistence', async () => {
  const initialGet = await invokeOverHttp(auditLogsHandler, { method: 'GET' });
  assert.equal(initialGet.status, 200);
  const initialLogs = initialGet.json.logs as Array<{ id: string }>;
  assert.ok(initialLogs.some(l => l.id === 'AUD-2026-0001'));
  assert.ok(initialLogs.some(l => l.id === 'AUD-2026-0002'));

  const invalidRoleRes = await invokeOverHttp(auditLogsHandler, {
    method: 'POST',
    body: {
      actor_role: 'HACKER_ADMIN',
      action: 'Bypass gate',
      entityRef: 'GATE-G1',
    },
  });
  assert.equal(invalidRoleRes.status, 403);

  const missingActionRes = await invokeOverHttp(auditLogsHandler, {
    method: 'POST',
    body: {
      actor_role: 'BQLDA',
      action: '   ',
      entityRef: 'GATE-G2',
    },
  });
  assert.equal(missingActionRes.status, 400);

  const validPostRes = await invokeOverHttp(auditLogsHandler, {
    method: 'POST',
    body: {
      actor_role: 'CDT',
      action: 'Phê duyệt Gate G11\u0000\u0007',
      entityRef: 'GATE-G11',
      module: 'STAGE_GATE',
      riskSeverity: 'NOMINAL',
      sha256Hash: 'abcdef1234567890',
    },
  });
  assert.equal(validPostRes.status, 201);
  const createdLog = validPostRes.json.log as Record<string, unknown>;
  assert.equal(createdLog.actor_role, 'CDT');
  assert.equal(createdLog.action, 'Phê duyệt Gate G11');
  assert.equal(createdLog.sha256Hash, 'ABCDEF1234567890');

  const bqldaPostRes = await invokeOverHttp(auditLogsHandler, {
    method: 'POST',
    body: {
      actor_role: 'BQLDA',
      action: 'Thẩm tra hồ sơ CDE',
      entityRef: 'DOC-001',
    },
  });
  assert.equal(bqldaPostRes.status, 201);
  assert.equal((bqldaPostRes.json.log as Record<string, unknown>).actor_role, 'PMU');

  const afterGet = await invokeOverHttp(auditLogsHandler, { method: 'GET' });
  const afterLogs = afterGet.json.logs as Array<{ action: string }>;
  assert.ok(afterLogs.some(l => l.action === 'Phê duyệt Gate G11'));
});

test('/api/gemini/analyze-legal & /api/gemini/analyze enforce limits, sanitize input, fallback, and use mocked Gemini with LEGAL-01..14 prompt', async () => {
  const prevKey = process.env.GEMINI_API_KEY;

  try {
    delete process.env.GEMINI_API_KEY;

    const tooLong = await invokeOverHttp(analyzeHandler, {
      method: 'POST',
      body: { prompt: 'x'.repeat(6001) },
    });
    assert.equal(tooLong.status, 413);

    const emptyAfterSanitize = await invokeOverHttp(analyzeHandler, {
      method: 'POST',
      body: { prompt: '\u0000\u0007   ' },
    });
    assert.equal(emptyAfterSanitize.status, 400);

    const fallbackRes = await invokeOverHttp(analyzeHandler, {
      method: 'POST',
      body: {
        prompt: 'Kiểm tra\u0000 điều kiện nghiệm thu PCCC KCN\u0007',
        projectCode: 'KCN',
        chronoErrorsCount: 1,
      },
    });
    assert.equal(fallbackRes.status, 200);
    assert.equal(fallbackRes.json.source, 'built-in-legal-engine');
    assert.match(String(fallbackRes.json.report), /NOTEBOOKLM \(LEGAL\)/);
    assert.equal(String(fallbackRes.json.report).includes('\u0000'), false);

    const captured: { call: GeminiGenerateContentParams | null } = { call: null };
    const mockClient: GeminiClientLike = {
      models: {
        async generateContent(params) {
          captured.call = params;
          return { text: 'Báo cáo AI pháp lý 3 Trục chuẩn SSOT.' };
        },
      },
    };

    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    const mockedHandler = createAnalyzeLegalHandler({
      getGeminiClient: () => (process.env.GEMINI_API_KEY ? mockClient : null),
    });

    const aiRes = await invokeOverHttp(mockedHandler, {
      method: 'POST',
      body: {
        prompt: 'Phân tích phát sinh VO\u0000 hợp đồng KCN',
        projectCode: 'KCN',
      },
    });
    assert.equal(aiRes.status, 200);
    assert.equal(aiRes.json.source, 'gemini-4-hydrogen');
    assert.equal(aiRes.json.report, 'Báo cáo AI pháp lý 3 Trục chuẩn SSOT.');
    assert.ok(captured.call);
    assert.equal(captured.call.model, 'gemini-4-hydrogen');
    assert.equal(captured.call.contents, 'Phân tích phát sinh VO hợp đồng KCN');
    const sysInst = String(captured.call.config?.systemInstruction || '');
    assert.match(sysInst, /NotebookLM/);
    assert.match(sysInst, /LEGAL-01/);
    assert.match(sysInst, /LEGAL-14/);
  } finally {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
  }
});

test('/api/gemini/compare-clauses returns 503 without key, 413 on oversize, and structured JSON + VBPL_CROSS audit log with mocked Gemini', async () => {
  const prevKey = process.env.GEMINI_API_KEY;

  try {
    delete process.env.GEMINI_API_KEY;
    const unconfiguredHandler = createCompareClausesHandler();

    const noKeyRes = await invokeOverHttp(unconfiguredHandler, {
      method: 'POST',
      body: {
        projectCode: 'KCN',
        leftClause: { docNumber: '135/2025/QH15', nodeCode: 'Điều 15', content: 'Nội dung A' },
        rightClause: { docNumber: '207/2026/NĐ-CP', nodeCode: 'Điều 21', content: 'Nội dung B' },
      },
    });
    assert.equal(noKeyRes.status, 503);

    const overLimitRes = await invokeOverHttp(unconfiguredHandler, {
      method: 'POST',
      body: {
        leftClause: { content: 'a'.repeat(12001) },
        rightClause: { content: 'b' },
      },
    });
    assert.equal(overLimitRes.status, 413);

    const captured: { call: GeminiGenerateContentParams | null } = { call: null };
    const mockClient: GeminiClientLike = {
      models: {
        async generateContent(params) {
          captured.call = params;
          return {
            text: JSON.stringify({
              summaryVerdict: 'Khác biệt về thời hạn 24 giờ.',
              timelineDifferences: [
                {
                  aspect: 'Thời hạn nghiệm thu',
                  clauseAValue: '24 giờ',
                  clauseBValue: '48 giờ',
                  impactNote: 'TVGS cần bám mốc 24 giờ',
                },
              ],
              authorityDifferences: [],
              technicalDifferences: [],
              recommendedAction:
                'Đối chiếu Từ khóa & Sổ ghi chú NotebookLM (LEGAL): LEGAL-03.',
              highlightTargetsA: [
                { category: 'TIMELINE', phrase: '24 giờ', reason: 'Mốc thời hạn' },
              ],
              highlightTargetsB: [
                { category: 'AUTHORITY', phrase: 'Chủ đầu tư', reason: 'Thẩm quyền' },
              ],
            }),
          };
        },
      },
    };

    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    const mockedCompare = createCompareClausesHandler({
      getGeminiClient: () => mockClient,
    });

    const okRes = await invokeOverHttp(mockedCompare, {
      method: 'POST',
      body: {
        projectCode: 'KCN',
        leftClause: { docNumber: '135/2025/QH15', nodeCode: 'Điều 15', content: 'Thời hạn 24 giờ.' },
        rightClause: { docNumber: '207/2026/NĐ-CP', nodeCode: 'Điều 21', content: 'Chủ đầu tư phê duyệt.' },
      },
    });
    assert.equal(okRes.status, 200);
    assert.equal(okRes.json.source, 'gemini-4-hydrogen');
    assert.ok(captured.call);
    assert.equal(captured.call.model, 'gemini-4-hydrogen');
    assert.match(String(captured.call.config?.systemInstruction || ''), /NotebookLM \(LEGAL\)/);
    const analysis = okRes.json.analysis as Record<string, unknown>;
    assert.equal(analysis.summaryVerdict, 'Khác biệt về thời hạn 24 giờ.');

    const logsRes = await invokeOverHttp(auditLogsHandler, { method: 'GET' });
    const logs = logsRes.json.logs as Array<{ module: string; entityRef: string }>;
    assert.ok(logs.some(l => l.module === 'VBPL_CROSS' && l.entityRef.includes('Điều 15↔Điều 21')));
  } finally {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
  }
});

test('/api/verify-role handles Demo mode fallback and Protected mode (delimited & JSON ROLE_PASSCODES)', async () => {
  const prevPass = process.env.ROLE_PASSCODES;

  try {
    // 1. Demo mode when unset
    delete process.env.ROLE_PASSCODES;
    const demoGet = await invokeOverHttp(verifyRoleHandler, { method: 'GET' });
    assert.equal(demoGet.status, 200);
    assert.equal(demoGet.headers['cache-control'], 'no-store');
    assert.equal(demoGet.json.demoMode, true);
    assert.equal(demoGet.json.protected, false);
    assert.deepEqual(demoGet.json.guardedRoles, []);

    const demoPost = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'CDT', passcode: '' },
    });
    assert.equal(demoPost.status, 200);
    assert.equal(demoPost.json.verified, true);
    assert.equal(demoPost.json.demoMode, true);

    // 2. Protected mode (delimited)
    process.env.ROLE_PASSCODES = 'CDT:alpha123,PMU:beta456,TVGS:gamma789';
    const protGet = await invokeOverHttp(verifyRoleHandler, { method: 'GET' });
    assert.equal(protGet.status, 200);
    assert.equal(protGet.json.protected, true);
    assert.equal(protGet.json.demoMode, false);
    assert.deepEqual(protGet.json.guardedRoles, ['CDT', 'PMU', 'TVGS']);

    const emptyPass = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'CDT', passcode: '   ' },
    });
    assert.equal(emptyPass.status, 400);
    assert.equal(emptyPass.json.verified, false);

    const wrongPass = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'CDT', passcode: 'wrong' },
    });
    assert.equal(wrongPass.status, 401);
    assert.equal(wrongPass.json.verified, false);

    const validCdt = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'CDT', passcode: 'alpha123' },
    });
    assert.equal(validCdt.status, 200);
    assert.equal(validCdt.json.verified, true);
    assert.equal(validCdt.json.role, 'CDT');

    const validBqlda = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'BQLDA', passcode: 'beta456' },
    });
    assert.equal(validBqlda.status, 200);
    assert.equal(validBqlda.json.verified, true);
    assert.equal(validBqlda.json.role, 'PMU');

    const validTvgs = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'TVGS', passcode: 'gamma789' },
    });
    assert.equal(validTvgs.status, 200);
    assert.equal(validTvgs.json.verified, true);
    assert.equal(validTvgs.json.role, 'TVGS');

    const validNttc = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'NTTC', passcode: '' },
    });
    assert.equal(validNttc.status, 200);
    assert.equal(validNttc.json.verified, true);
    assert.equal(validNttc.json.role, 'CONTRACTOR');

    const invalidRole = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'UNKNOWN', passcode: 'x' },
    });
    assert.equal(invalidRole.status, 400);

    // 3. Protected mode (JSON format)
    process.env.ROLE_PASSCODES = JSON.stringify({
      CDT: 'json-cdt-1',
      BQLDA: 'json-pmu-2',
      TVGS: 'json-tvgs-3',
    });
    const jsonValid = await invokeOverHttp(verifyRoleHandler, {
      method: 'POST',
      body: { role: 'PMU', passcode: 'json-pmu-2' },
    });
    assert.equal(jsonValid.status, 200);
    assert.equal(jsonValid.json.verified, true);
    assert.equal(jsonValid.json.role, 'PMU');
  } finally {
    if (prevPass === undefined) delete process.env.ROLE_PASSCODES;
    else process.env.ROLE_PASSCODES = prevPass;
  }
});

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

test('public/templates/*.csv begin with UTF-8 BOM (EF BB BF) and have consistent schema columns', () => {
  const expectations = [
    { file: 'mau_danh_muc_vbpl_3truc.csv', expectedCols: 20, expectedRows: 5 },
    { file: 'mau_stage_gate_du_an.csv', expectedCols: 23, expectedRows: 5 },
    { file: 'mau_hop_dong_itp.csv', expectedCols: 25, expectedRows: 5 },
  ];

  for (const item of expectations) {
    const fullPath = path.join(REPO_ROOT, 'public', 'templates', item.file);
    assert.equal(fs.existsSync(fullPath), true, `Missing template: ${item.file}`);
    const bytes = fs.readFileSync(fullPath);
    assert.ok(bytes.length >= 3, `File too small: ${item.file}`);
    assert.equal(bytes[0], 0xef, `${item.file} byte[0] must be 0xEF`);
    assert.equal(bytes[1], 0xbb, `${item.file} byte[1] must be 0xBB`);
    assert.equal(bytes[2], 0xbf, `${item.file} byte[2] must be 0xBF`);

    const content = bytes.subarray(3).toString('utf8').trimEnd();
    const lines = content.split(/\r?\n/);
    assert.equal(lines.length, item.expectedRows, `${item.file} should have header + 4 rows`);
    for (const [idx, line] of lines.entries()) {
      const cols = parseCsvRow(line);
      assert.equal(
        cols.length,
        item.expectedCols,
        `${item.file} line ${idx + 1} expected ${item.expectedCols} columns, got ${cols.length}`
      );
    }
  }
});

test('/api/verify-role fails closed (500 on POST, configError on GET) for malformed or empty-role ROLE_PASSCODES', async () => {
  const prevPass = process.env.ROLE_PASSCODES;

  try {
    // Whitespace-only still falls back to Demo mode
    process.env.ROLE_PASSCODES = '   ';
    const whitespaceGet = await invokeOverHttp(verifyRoleHandler, { method: 'GET' });
    assert.equal(whitespaceGet.status, 200);
    assert.equal(whitespaceGet.json.demoMode, true);
    assert.equal(whitespaceGet.json.protected, false);
    assert.equal(whitespaceGet.json.configError, undefined);

    const invalidConfigs = [
      '{malformed-json-secret',
      '["CDT","secret"]',
      '{"UNKNOWN":"secret123"}',
      '{"CDT":"   "}',
      'CONTRACTOR:only-secret',
      'unparseable_entry_without_delimiter',
    ];

    for (const badEnv of invalidConfigs) {
      process.env.ROLE_PASSCODES = badEnv;

      const getRes = await invokeOverHttp(verifyRoleHandler, { method: 'GET' });
      assert.equal(getRes.status, 200, `GET failed for ${badEnv}`);
      assert.equal(getRes.json.ok, true);
      assert.equal(getRes.json.protected, true);
      assert.equal(getRes.json.demoMode, false);
      assert.deepEqual(getRes.json.guardedRoles, ['CDT', 'PMU', 'TVGS']);
      assert.equal(getRes.json.configError, 'ROLE_PASSCODES is misconfigured on server');
      assert.equal(JSON.stringify(getRes.json).includes('secret'), false);

      const postCdt = await invokeOverHttp(verifyRoleHandler, {
        method: 'POST',
        body: { role: 'CDT', passcode: 'anything' },
      });
      assert.equal(postCdt.status, 500, `POST CDT should return 500 for ${badEnv}`);
      assert.equal(postCdt.json.ok, false);
      assert.equal(postCdt.json.verified, false);
      assert.equal(postCdt.json.error, 'ROLE_PASSCODES configuration error on server');

      const postContractor = await invokeOverHttp(verifyRoleHandler, {
        method: 'POST',
        body: { role: 'CONTRACTOR', passcode: '' },
      });
      assert.equal(postContractor.status, 500, `POST CONTRACTOR should return 500 for ${badEnv}`);
      assert.equal(postContractor.json.verified, false);

      const healthRes = await invokeOverHttp(healthHandler, { method: 'GET' });
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.json.roleGuardMode, 'config-error');
    }
  } finally {
    if (prevPass === undefined) delete process.env.ROLE_PASSCODES;
    else process.env.ROLE_PASSCODES = prevPass;
  }
});

test('readJsonBody returns HTTP 413 JSON cleanly over raw loopback node:http stream without ECONNRESET on >256KB payload', async () => {
  const server = http.createServer((req, res) => {
    void auditLogsHandler(req, res).catch(err => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err) }));
    });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));

  try {
    const address = server.address() as AddressInfo;
    const oversizedPayload = JSON.stringify({
      actor_role: 'CDT',
      action: 'Oversize stream test',
      entityRef: 'GATE-413',
      accountabilityNote: 'A'.repeat(300 * 1024),
    });

    const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: '/api/audit-logs',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(oversizedPayload, 'utf8'),
          },
        },
        res => {
          const chunks: Buffer[] = [];
          res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on('end', () => {
            resolve({
              status: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        }
      );

      req.on('error', err => {
        reject(err);
      });

      const chunkSize = 32 * 1024;
      for (let offset = 0; offset < oversizedPayload.length; offset += chunkSize) {
        req.write(oversizedPayload.slice(offset, offset + chunkSize));
      }
      req.end();
    });

    assert.equal(result.status, 413);
    const parsed = JSON.parse(result.body) as Record<string, unknown>;
    assert.match(String(parsed.error), /256KB/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('/api/audit-logs actor_role precedence prefers body.actor_role > x-actor-role > body.actorRole > PMU', async () => {
  const headerOverDisplayBody = await invokeOverHttp(auditLogsHandler, {
    method: 'POST',
    headers: { 'x-actor-role': 'CDT' },
    body: {
      actorRole: 'Giám đốc Ban QLDA (A - Accountable)',
      action: 'Header precedence check',
      entityRef: 'GATE-G3',
    },
  });
  assert.equal(headerOverDisplayBody.status, 201);
  assert.equal((headerOverDisplayBody.json.log as Record<string, unknown>).actor_role, 'CDT');

  const explicitBodyOverHeader = await invokeOverHttp(auditLogsHandler, {
    method: 'POST',
    headers: { 'x-actor-role': 'TVGS' },
    body: {
      actor_role: 'CDT',
      actorRole: 'BQLDA',
      action: 'Explicit body precedence check',
      entityRef: 'GATE-G4',
    },
  });
  assert.equal(explicitBodyOverHeader.status, 201);
  assert.equal((explicitBodyOverHeader.json.log as Record<string, unknown>).actor_role, 'CDT');
});

test('/api/gemini/compare-clauses filters non-object items and sanitizes control characters in difference lists', async () => {
  const prevKey = process.env.GEMINI_API_KEY;
  try {
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    const mockClient: GeminiClientLike = {
      models: {
        async generateContent() {
          return {
            text: JSON.stringify({
              summaryVerdict: 'Tóm tắt\u0000 đối chiếu',
              timelineDifferences: [
                'non-object-item',
                null,
                {
                  aspect: 'Mốc\u0007 thời hạn',
                  clauseAValue: '24 giờ\u0000',
                  clauseBValue: '48 giờ\u0008',
                  impactNote: 'Ảnh hưởng\u001F tiến độ',
                },
              ],
              authorityDifferences: [123, { aspect: 'Thẩm quyền\u0000', clauseAValue: 'CĐT', clauseBValue: 'PMU', impactNote: 'OK' }],
              technicalDifferences: [{}, 'invalid'],
              recommendedAction: 'Kiểm tra\u0000 NotebookLM (LEGAL)',
              highlightTargetsA: [],
              highlightTargetsB: [],
            }),
          };
        },
      },
    };

    const handler = createCompareClausesHandler({ getGeminiClient: () => mockClient });
    const res = await invokeOverHttp(handler, {
      method: 'POST',
      body: {
        leftClause: { content: 'Nội dung điều khoản A.' },
        rightClause: { content: 'Nội dung điều khoản B.' },
      },
    });
    assert.equal(res.status, 200);
    const analysis = res.json.analysis as {
      summaryVerdict: string;
      timelineDifferences: Array<Record<string, string>>;
      authorityDifferences: Array<Record<string, string>>;
      technicalDifferences: Array<Record<string, string>>;
    };
    assert.equal(analysis.summaryVerdict, 'Tóm tắt đối chiếu');
    assert.equal(analysis.timelineDifferences.length, 1);
    assert.deepEqual(analysis.timelineDifferences[0], {
      aspect: 'Mốc thời hạn',
      clauseAValue: '24 giờ',
      clauseBValue: '48 giờ',
      impactNote: 'Ảnh hưởng tiến độ',
    });
    assert.equal(analysis.authorityDifferences.length, 1);
    assert.equal(analysis.authorityDifferences[0].aspect, 'Thẩm quyền');
    assert.equal(analysis.technicalDifferences.length, 0);
  } finally {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
  }
});

test('auditStore monotonic auditSequence prevents ID collisions past MAX_AUDIT_LOGS and toCanonicalGuardRole defaults to CONTRACTOR', () => {
  const generatedIds: string[] = [];
  for (let i = 0; i < MAX_AUDIT_LOGS + 10; i++) {
    const entry = prependAuditLog({
      actorId: 'EMP-TEST',
      actorName: 'Tester',
      actorRole: 'PMU',
      actor_role: 'PMU',
      module: 'STAGE_GATE',
      action: `Sequence test ${i}`,
      entityRef: `SEQ-${i}`,
      newState: 'NOMINAL',
      riskSeverity: 'NOMINAL',
    });
    generatedIds.push(entry.id);
  }
  assert.equal(new Set(generatedIds).size, generatedIds.length);
  assert.equal(getAuditLogs(MAX_AUDIT_LOGS + 50).length, MAX_AUDIT_LOGS);

  assert.equal(toCanonicalGuardRole('UNKNOWN_ROLE'), 'CONTRACTOR');
  assert.equal(toCanonicalGuardRole(''), 'CONTRACTOR');
  assert.equal(toCanonicalGuardRole('BQLDA'), 'PMU');
  assert.equal(toCanonicalGuardRole('CDT'), 'CDT');
  assert.equal(toCanonicalGuardRole('TVTK'), 'TVGS');
});

test('SSOT [SoHieu]-[Nam] filename generator, validator, and interactive smart tags work end-to-end', () => {
  assert.equal(
    stripRedundantSummaryPrefix(
      'Nghị định số 207/2026/NĐ-CP quy định chi tiết về quản lý chất lượng thi công và bảo trì công trình'
    ),
    'quan ly chat luong thi cong va bao tri cong trinh'
  );
  assert.equal(
    stripRedundantSummaryPrefix('Thông tư quy định về định mức dự toán xây dựng công trình'),
    'dinh muc du toan xay dung cong trinh'
  );
  assert.equal(
    stripRedundantSummaryPrefix('Quyết định số 15/QĐ-UBND về việc phê duyệt điều chỉnh quy hoạch 1/500'),
    'phe duyet dieu chinh quy hoach 1/500'
  );
  assert.equal(
    stripRedundantSummaryPrefix('207-2026_ND_QLCL_QuanLyChatLuongCongTrinh'),
    'QuanLyChatLuongCongTrinh'
  );

  const longPascal = toPascalCaseVN(
    'Nghị định số 207/2026/NĐ-CP quy định chi tiết về quản lý chất lượng thi công xây dựng và bảo trì công trình hạ tầng khu công nghiệp'
  );
  assert.ok(longPascal.length <= 40, `Expected <= 40 chars, got ${longPascal.length}: ${longPascal}`);
  assert.equal(longPascal, 'QuanLyChatLuongThiCongXayDungVaBaoTriCon');

  assert.equal(cleanDocNumber('207/2026/NĐ-CP', '2026'), '207');
  assert.equal(cleanDocNumber('06:2022/BXD', '2022'), '06');
  assert.equal(cleanDocNumber('NX02-BV012', '2026'), 'NX02BV012');

  // Unified naming rule: [SốHiệu]-[Năm]_[LoạiVB]_[LĩnhVực]_[TríchYếuNgắn][-PhụLục].[ext]
  const ndName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'ND',
    issuer: 'CP',
    rawNumber: '207/2026/NĐ-CP',
    year: '2026',
    primaryDomain: 'QLCL',
    rawSummary: 'Nghị định số 207/2026/NĐ-CP quy định chi tiết về quản lý chất lượng công trình',
    appendixSuffix: 'PLIIa',
    ext: 'pdf',
    projectCode: 'KCN',
  });
  assert.equal(ndName, '207-2026_ND_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf');

  const ttName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'TT',
    issuer: 'BXD',
    rawNumber: '12/2026/TT-BXD',
    year: '2026',
    primaryDomain: 'QLCP',
    rawSummary: 'Thông tư quy định về định mức dự toán xây dựng công trình',
    appendixSuffix: '',
    ext: 'pdf',
    projectCode: 'KCN',
  });
  assert.equal(ttName, '12-2026_TT_QLCP_DinhMucDuToanXayDungCongTrinh.pdf');

  const qcvnName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'QCVN',
    issuer: 'BXD',
    rawNumber: '06:2022/BXD',
    year: '2022',
    primaryDomain: 'PCCC',
    rawSummary: 'Quy chuẩn kỹ thuật quốc gia về an toàn cháy cho nhà và công trình',
    appendixSuffix: '',
    ext: 'pdf',
  });
  assert.equal(qcvnName, '06-2022_QCVN_PCCC_AnToanChayChoNhaVaCongTrinh.pdf');

  const bbntName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'BBNT',
    issuer: 'TVGS',
    rawNumber: '018/2026/BBNT-QLCL',
    year: '2026',
    primaryDomain: 'QLCL',
    rawSummary: 'Biên bản nghiệm thu số 018 nghiệm thu cốt thép dầm sàn tầng 5',
    appendixSuffix: 'KY',
    ext: 'docx',
    projectCode: 'KCN',
    gateCode: 'G12',
  });
  assert.equal(bbntName, '018-2026_BBNT_QLCL_NghiemThuCotThepDamSanTang5-KY.docx');

  const hdName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'HD',
    issuer: 'CDT',
    rawNumber: '45/2026/HĐ-TCXD',
    year: '2026',
    primaryDomain: 'QLHD',
    rawSummary: 'Hợp đồng thi công số 45 hạ tầng kỹ thuật KCN',
    appendixSuffix: 'V01',
    ext: 'pdf',
    projectCode: 'KCN',
    gateCode: 'G11',
  });
  assert.equal(hdName, '45-2026_HD_QLHD_HaTangKyThuatKcn-V01.pdf');

  const bvName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'BV',
    issuer: 'TVTK',
    rawNumber: 'NX02-BV012',
    year: '2026',
    primaryDomain: 'HDXD',
    rawSummary: 'Bản vẽ TKBVTC kết cấu nhà xưởng NX02 Rev01',
    appendixSuffix: '',
    ext: 'pdf',
    projectCode: 'KCN',
    gateCode: 'G12',
  });
  assert.equal(bvName, 'NX02BV012-2026_BV_HDXD_KetCauNhaXuongNx02Rev01.pdf');

  // Filename validation checks
  assert.equal(
    validateBatchFileName(ndName, 'SSOT_9PART', 'ND', 'CP', 'Quan ly chat luong', [ndName], 'FILE').status,
    'OK'
  );
  assert.equal(
    validateBatchFileName(bbntName, 'SSOT_9PART', 'BBNT', 'TVGS', 'Nghiem thu', [bbntName], 'FILE').status,
    'OK'
  );
  assert.equal(
    validateBatchFileName(
      'ND_2026-207_QLCL_QuanLyChatLuong.pdf',
      'SSOT_9PART',
      'ND',
      'CP',
      'Quan ly chat luong',
      [],
      'FILE'
    ).status,
    'THIEU_TRUONG'
  );

  const ttrAnalysis = smartAnalyzeFile3D(
    'To trinh 009_TTr_BQLDA phe duyet phat sinh khoi luong VO-02.docx',
    'BAN QUẢN LÝ DỰ ÁN\nSố: 009/2026/TTr-BQLDA\nTỜ TRÌNH\nVề việc phê duyệt Phụ lục hợp đồng VO-02'
  );
  assert.equal(ttrAnalysis.docType, 'TTr');

  const samples = createSampleBatchItems('KCN', 'SSOT_9PART', 'STAGE_GATE_ISO').filter(
    i => i.itemKind === 'FILE'
  );
  assert.equal(samples.length, 6);
  assert.equal(samples[0].proposedName, '207-2026_ND_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf');
  assert.equal(samples[1].proposedName, '12-2026_TT_QLCP_DinhMucDuToanCongTrinh.pdf');
  assert.equal(samples[2].proposedName, '018-2026_BBNT_QLCL_NghiemThuCotThepDamSanTang5-KY.docx');
  assert.ok(samples[3].proposedName.startsWith('45-2026_HD_QLHD_'));
  assert.ok(samples[4].proposedName.startsWith('NX02BV012-2026_BV_HDXD_'));
  assert.ok(samples[5].proposedName.startsWith('009-2026_TTr_QLHD_'));
  assert.ok(samples.every(s => s.validationStatus === 'OK'));
  assert.ok((samples[0].smartTags || []).some(t => t.status === 'SUGGESTED' && t.category === 'STAGE_GATE'));

  // Smart Tags auto-suggest, parse, sync & Step 2 mapping
  const baseTags = buildAutoSuggestedTags(ttrAnalysis, 'KCN', 'SUGGESTED');
  assert.ok(baseTags.some(t => t.category === 'INDUSTRY' && t.status === 'SUGGESTED'));
  assert.ok(baseTags.some(t => t.category === 'SUB_SECTOR' && t.status === 'SUGGESTED'));
  assert.ok(baseTags.some(t => t.category === 'PROJECT_AXIS' && t.code === 'KCN'));

  const parsedGate = parseRawTagInput('G14');
  assert.equal(parsedGate.category, 'STAGE_GATE');
  assert.equal(parsedGate.code, 'G14');
  const parsedAxis = parseRawTagInput('HTKT');
  assert.equal(parsedAxis.category, 'PROJECT_AXIS');
  const parsedCustom = parseRawTagInput('Gói thầu XL-01');
  assert.equal(parsedCustom.category, 'CUSTOM');
  assert.equal(parsedCustom.label, 'Gói thầu XL-01');

  const editedTags = [
    ...baseTags.map(t => ({ ...t, status: 'CONFIRMED' as const })),
    { id: 'TAG-NEW-1', category: parsedGate.category, code: parsedGate.code, label: parsedGate.label, status: 'CONFIRMED' as const },
    { id: 'TAG-NEW-2', category: parsedCustom.category, code: parsedCustom.code, label: parsedCustom.label, status: 'CONFIRMED' as const },
  ];
  const syncedSug = syncSuggestionWithSmartTags(ttrAnalysis, editedTags);
  assert.ok(syncedSug.linkedGates.includes('G14'));
  const mappedTaxonomy = resolveDocTaxonomyFromTags(syncedSug.primaryDomain, syncedSug.industry, editedTags);
  assert.equal(mappedTaxonomy.industryGroupId, 'IND-XAYDUNG-DAUTHAU');
  assert.ok(mappedTaxonomy.tags.includes('G14'));
  assert.ok(mappedTaxonomy.tags.includes('Gói thầu XL-01'));
});

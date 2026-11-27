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
import streamPdfHandler from '../api/documents/stream-pdf.js';
import previewDocxHandler from '../api/documents/preview-docx.js';
import listFormsHandler from '../api/documents/list-forms.js';
import searchFtsHandler from '../api/documents/search-fts.js';
import clausesHandler from '../api/documents/clauses.js';
import { MAX_AUDIT_LOGS, getAuditLogs, prependAuditLog } from '../api/_lib/auditStore.js';
import type { GeminiClientLike, GeminiGenerateContentParams } from '../api/_lib/gemini.js';
import { toCanonicalGuardRole } from '../src/services/ssotBridgeService.js';
import {
  buildAutoSuggestedTags,
  buildFileNameByRule,
  cleanDocNumber,
  cleanLegalPageNoise,
  createSampleBatchItems,
  parseLegalDocumentStructure,
  parseRawTagInput,
  parseVietnameseLegalText,
  resolveDocTaxonomyFromTags,
  smartAnalyzeFile3D,
  stripRedundantSummaryPrefix,
  syncSuggestionWithSmartTags,
  toPascalCaseVN,
  validateBatchFileName,
} from '../src/utils/legalParser.js';
import {
  computeClientVbplBiOverview,
  searchClientVbplClauses,
} from '../src/utils/vbplDataFoundationEngine.js';
import { INITIAL_LEGAL_DOCS } from '../src/data/lexPmoData.js';
import {
  DATA_LEGAL_2026_CORE_OVERRIDES,
  DATA_LEGAL_2026_NEW_DOCS,
} from '../src/data/dataLegal2026Catalog.js';
import {
  buildDocRefIndex,
  parseLegalXrefs,
  resolveXrefTarget,
} from '../src/utils/legalXrefParser.js';
import {
  buildNd30A4PrintHtml,
  parseNd30Footer,
  parseNd30Header,
} from '../src/utils/nd30Formatter.js';

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
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const json = isJson && text ? (JSON.parse(text) as Record<string, unknown>) : {};
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

test('Unified VBPL [SoHieu]-[Nam]_[LoaiVB]-[CoQuan]_[LinhVuc]_[TrichYeu] generator, cleaner, validator, and smart tags', () => {
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
    stripRedundantSummaryPrefix('135-2025_LUAT-QH15_HDXD_LuatXayDung'),
    'LuatXayDung'
  );
  assert.equal(
    stripRedundantSummaryPrefix('TT 50-2022-TT-BTC BH trong hoat dong xay dung'),
    'Bao hiem trong hoat dong xay dung'
  );
  assert.equal(
    stripRedundantSummaryPrefix('TT 50-2022-TT-BTC BH Bao hiem trong hoat dong xay dung'),
    'Bao hiem trong hoat dong xay dung'
  );
  assert.equal(
    stripRedundantSummaryPrefix('05-2025 VBHN-BXD quan ly du an dau tu xay dung'),
    'quan ly du an dau tu xay dung'
  );
  assert.equal(
    toPascalCaseVN('Luật Xây dựng số 135/2025/QH15'),
    'LuatXayDung'
  );
  assert.equal(
    toPascalCaseVN('135-2025_LUAT-QH15_HDXD_LuatXayDung'),
    'LuatXayDung'
  );

  const longPascal = toPascalCaseVN(
    'Nghị định số 207/2026/NĐ-CP quy định chi tiết về quản lý chất lượng thi công xây dựng và bảo trì công trình hạ tầng khu công nghiệp'
  );
  assert.ok(longPascal.length <= 40, `Expected <= 40 chars, got ${longPascal.length}: ${longPascal}`);
  assert.equal(longPascal, 'QuanLyChatLuongThiCongXayDungVaBaoTriCon');

  assert.equal(cleanDocNumber('135-2025-QH15', '2025'), '135');
  assert.equal(cleanDocNumber('207/2026/NĐ-CP', '2026'), '207');
  assert.equal(cleanDocNumber('05/VBHN-BXD', '2025'), '05');
  assert.equal(cleanDocNumber('06:2023/BXD', '2023'), '06');
  assert.equal(cleanDocNumber('NX02-BV012', '2026'), 'NX02BV012');

  // 5 unified VBPL examples (no exceptions):
  // 1) Luật
  const luatName = buildFileNameByRule({
    group: 'SSOT_9PART',
    industry: 'XD',
    docType: 'LUAT',
    issuer: 'QH15',
    rawNumber: '135/2025/QH15',
    year: '2025',
    primaryDomain: 'HDXD',
    rawSummary: 'Luật Xây dựng số 135/2025/QH15',
    appendixSuffix: '',
    ext: 'pdf',
  });
  assert.equal(luatName, '135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf');

  // 2) Nghị định
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
  });
  assert.equal(ndName, '207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf');

  // 3) Thông tư (bắt đúng cơ quan BTC, làm sạch BH)
  const ttAnalysis = smartAnalyzeFile3D('TT 50-2022-TT-BTC BH trong hoat dong xay dung.pdf', '');
  assert.equal(ttAnalysis.docType, 'TT');
  assert.equal(ttAnalysis.issuer, 'BTC');
  assert.equal(ttAnalysis.primaryDomain, 'HDXD');
  const ttName = buildFileNameByRule({
    group: 'SSOT_9PART',
    ...ttAnalysis,
  });
  assert.equal(ttName, '50-2022_TT-BTC_HDXD_BaoHiemTrongHoatDongXayDung.pdf');

  // 4) Văn bản hợp nhất
  const vbhnAnalysis = smartAnalyzeFile3D('05-2025 VBHN-BXD quan ly du an dau tu xay dung.pdf', '');
  assert.equal(vbhnAnalysis.docType, 'VBHN');
  assert.equal(vbhnAnalysis.issuer, 'BXD');
  assert.equal(vbhnAnalysis.primaryDomain, 'HDXD');
  const vbhnName = buildFileNameByRule({
    group: 'SSOT_9PART',
    ...vbhnAnalysis,
  });
  assert.equal(vbhnName, '05-2025_VBHN-BXD_HDXD_QuanLyDuAnDauTuXayDung.pdf');

  // 5) Quy chuẩn (Lĩnh vực PCCC không bị QCVN hoặc BXD chiếm chỗ)
  const qcvnAnalysis = smartAnalyzeFile3D(
    'QCVN 06-2023-BXD An toan chay cho nha va cong trinh.pdf',
    ''
  );
  assert.equal(qcvnAnalysis.docType, 'QCVN');
  assert.equal(qcvnAnalysis.issuer, 'BXD');
  assert.equal(qcvnAnalysis.primaryDomain, 'PCCC');
  const qcvnName = buildFileNameByRule({
    group: 'SSOT_9PART',
    ...qcvnAnalysis,
  });
  assert.equal(qcvnName, '06-2023_QCVN-BXD_PCCC_AnToanChayChoNhaVaCongTrinh.pdf');

  // Validation checks (rejects missing -Issuer or swapped Domain)
  assert.equal(
    validateBatchFileName(luatName, 'SSOT_9PART', 'LUAT', 'QH15', 'Luat Xay dung', [luatName], 'FILE').status,
    'OK'
  );
  assert.equal(
    validateBatchFileName(qcvnName, 'SSOT_9PART', 'QCVN', 'BXD', 'An toan chay', [qcvnName], 'FILE').status,
    'OK'
  );
  assert.equal(
    validateBatchFileName(
      '207-2026_ND_QLCL_QuanLyChatLuongCongTrinh.pdf',
      'SSOT_9PART',
      'ND',
      'CP',
      'Quan ly chat luong',
      [],
      'FILE'
    ).status,
    'THIEU_TRUONG'
  );
  assert.equal(
    validateBatchFileName(
      '06-2023_QCVN_BXD_AnToanChay.pdf',
      'SSOT_9PART',
      'QCVN',
      'BXD',
      'An toan chay',
      [],
      'FILE'
    ).status,
    'THIEU_TRUONG'
  );

  // Sample batch verification
  const samples = createSampleBatchItems('KCN', 'SSOT_9PART', 'STAGE_GATE_ISO').filter(
    i => i.itemKind === 'FILE'
  );
  assert.equal(samples.length, 6);
  assert.equal(samples[0].proposedName, '135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf');
  assert.equal(samples[1].proposedName, '207-2026_ND-CP_QLCL_QuanLyChatLuongCongTrinh-PLIIa.pdf');
  assert.equal(samples[2].proposedName, '50-2022_TT-BTC_HDXD_BaoHiemTrongHoatDongXayDung.pdf');
  assert.equal(samples[3].proposedName, '05-2025_VBHN-BXD_HDXD_QuanLyDuAnDauTuXayDung.pdf');
  assert.equal(samples[4].proposedName, '06-2023_QCVN-BXD_PCCC_AnToanChayChoNhaVaCongTrinh.pdf');
  assert.equal(samples[5].proposedName, '018-2026_BBNT-TVGS_QLCL_NghiemThuCotThepDamSanTang5-KY.docx');
  assert.ok(samples.every(s => s.validationStatus === 'OK'));

  // Smart Tags should be concise and not spam all 6 project types on general VBPLs
  const luatTags = samples[0].smartTags || [];
  assert.equal(luatTags.filter(t => t.category === 'PROJECT_AXIS').length, 0);
  assert.ok(luatTags.some(t => t.status === 'SUGGESTED' && t.category === 'INDUSTRY'));

  const ttrAnalysis = smartAnalyzeFile3D(
    'To trinh 009_TTr_BQLDA phe duyet phat sinh khoi luong ha tang KCN VO-02.docx',
    'BAN QUẢN LÝ DỰ ÁN\nSố: 009/2026/TTr-BQLDA\nTỜ TRÌNH\nVề việc phê duyệt Phụ lục hợp đồng KCN VO-02'
  );
  assert.equal(ttrAnalysis.docType, 'TTr');
  const baseTags = buildAutoSuggestedTags(ttrAnalysis, 'KCN', 'SUGGESTED');
  assert.ok(baseTags.some(t => t.category === 'PROJECT_AXIS' && t.code === 'KCN'));
  assert.ok(baseTags.filter(t => t.category === 'PROJECT_AXIS').length <= 2);

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

test('LegalDocumentParser noise filter, ND 30/2020 structure tree, and wrapped PDF line joining', () => {
  const rawSample = [
    'QUỐC HỘI',
    'Số: 135/2025/QH15',
    '1',
    'Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam;',
    'Chương I: QUY ĐỊNH CHUNG',
    '- 2 -',
    'Điều 1. Phạm vi điều chỉnh',
    '1. Luật này quy định về hoạt động đầu tư xây dựng',
    'trên lãnh thổ Việt Nam.',
    'a) Lập quy hoạch và chuẩn bị dự án;',
    'đ) Nghiệm thu, bàn giao đưa công trình vào sử dụng.',
    '[Trang 3/89]',
    'Trang 4/89',
    'Điều 15a. Quản lý chất lượng thi công',
    'Nội dung quy định chung không đánh số khoản',
    'nối sang dòng kế tiếp.',
  ].join('\n');

  const cleaned = cleanLegalPageNoise(rawSample);
  assert.ok(!cleaned.includes('- 2 -'));
  assert.ok(!cleaned.includes('[Trang 3/89]'));
  assert.ok(!cleaned.includes('Trang 4/89'));
  assert.ok(!cleaned.split('\n').includes('1'));

  const structured = parseLegalDocumentStructure(rawSample);
  assert.equal(structured.stats.chapters, 1);
  assert.equal(structured.stats.articles, 2);
  assert.equal(structured.stats.clauses, 3);

  assert.equal(structured.toc[0].id, 'preamble');
  assert.equal(structured.toc[0].article_number, 'Căn cứ');
  assert.ok(structured.toc[0].content_blocks[0].text.includes('Căn cứ Hiến pháp'));

  assert.equal(structured.toc[1].id, 'dieu_1');
  assert.equal(structured.toc[1].article_number, 'Điều 1');
  assert.equal(structured.toc[1].title, 'Phạm vi điều chỉnh');
  assert.equal(structured.toc[1].clauses_count, 3);
  assert.equal(
    structured.toc[1].content_blocks[0].text,
    '1. Luật này quy định về hoạt động đầu tư xây dựng trên lãnh thổ Việt Nam.'
  );
  assert.equal(structured.toc[1].content_blocks[2].type, 'point');
  assert.equal(structured.toc[1].content_blocks[2].index, 'đ');

  assert.equal(structured.toc[2].article_number, 'Điều 15a');
  assert.equal(
    structured.toc[2].content_blocks[0].text,
    'Nội dung quy định chung không đánh số khoản nối sang dòng kế tiếp.'
  );

  const nodes = parseVietnameseLegalText(rawSample);
  assert.equal(nodes[0].level, 'Mở đầu');
  assert.equal(nodes[1].level, 'Chương');
  assert.equal(nodes[2].level, 'Điều');
  assert.equal(nodes[2].clauseCount, 3);
});

test('VBPL Data Foundation client analytics mirror computes 6 layers, 6 BA KPIs, DQ score, and relation radar', () => {
  const sampleDocs = [
    {
      id: 'DOC-TEST-1',
      ssotFileName: '135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf',
      docNumber: '135/2025/QH15',
      docType: 'LUAT',
      issuer: 'QH15',
      year: '2025',
      issueDate: '10/12/2025',
      effectiveDate: '01/07/2026',
      industryGroupId: 'IND-XAYDUNG-DAUTHAU',
      subSectorCode: 'XD_QUANLYDA',
      subSectorLabel: 'Quản lý dự án',
      primaryDomain: 'HDXD' as const,
      title: 'Luật Xây dựng năm 2025',
      status: 'Còn hiệu lực năm 2026',
      isAmended: false,
      chapterCount: 1,
      articleCount: 2,
      clauseTotalCount: 3,
      projectAxes: ['KCN' as const, 'HTKT' as const],
      secondaryDomains: ['HDXD' as const],
      linkedGates: ['G0', 'G5', 'G12'],
      linkedQAQC: ['QT-01'],
      lineage: 'Thay thế Luật số 50/2014/QH13',
      nodes: [
        {
          id: 'N1',
          level: 'Điều' as const,
          code: 'Điều 1',
          title: 'Phạm vi điều chỉnh',
          clauseCount: 2,
          content: '1. Luật này thay thế Luật số 50/2014/QH13 về hoạt động đầu tư xây dựng và áp dụng BIM.',
        },
      ],
    },
    {
      id: 'DOC-TEST-2',
      ssotFileName: 'bad_legacy_name.pdf',
      docNumber: '01',
      docType: 'ND',
      issuer: 'CP',
      year: '2026',
      issueDate: '',
      effectiveDate: '',
      industryGroupId: 'IND-XAYDUNG-DAUTHAU',
      subSectorCode: 'XD_QLCL',
      subSectorLabel: 'Quản lý chất lượng',
      primaryDomain: 'QLCL' as const,
      title: 'Nghị định quản lý chất lượng',
      status: 'Hết hiệu lực',
      isAmended: false,
      projectAxes: ['KCN' as const],
      secondaryDomains: ['QLCL' as const],
      linkedGates: [],
      linkedQAQC: [],
      lineage: '',
      nodes: [],
    },
  ];

  const bi = computeClientVbplBiOverview(sampleDocs, 2);
  assert.equal(bi.architecture_layers.length, 6);
  assert.equal(bi.ba_kpis.length, 6);
  assert.equal(bi.summary.total_documents, 2);
  assert.equal(bi.summary.personal_notes, 2);
  assert.equal(bi.ba_kpis.find(k => k.id === 'KPI_SSOT_NAMING')?.value, 50);
  assert.equal(bi.charts.gate_coverage.length, 17);
  assert.ok(bi.relation_radar.some(r => r.relation_type === 'REPLACES' && r.target_ref_raw === '50/2014/QH13'));
  assert.ok(bi.dq_report.documents_with_issues.some(d => d.doc_key === 'DOC-TEST-2' && d.dq_score < 60));

  const hits = searchClientVbplClauses(sampleDocs, 'BIM');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].doc_key, 'DOC-TEST-1');
});

test('Data_Legal_2026 corpus (51 real PDFs) integrates into INITIAL_LEGAL_DOCS with valid SSOT names and unique IDs', () => {
  assert.equal(Object.keys(DATA_LEGAL_2026_CORE_OVERRIDES).length, 7);
  assert.equal(DATA_LEGAL_2026_NEW_DOCS.length, 44);
  assert.equal(
    Object.keys(DATA_LEGAL_2026_CORE_OVERRIDES).length + DATA_LEGAL_2026_NEW_DOCS.length,
    51
  );

  const ids = INITIAL_LEGAL_DOCS.map(d => d.id);
  assert.equal(new Set(ids).size, ids.length, 'INITIAL_LEGAL_DOCS IDs must be unique');

  // Verify upgraded core docs and key new docs from Data_Legal_2026
  const doc135 = INITIAL_LEGAL_DOCS.find(d => d.id === 'DOC-135');
  assert.equal(doc135?.ssotFileName, '135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf');

  const tt36 = INITIAL_LEGAL_DOCS.find(d => d.docNumber === '36/2026/TT-BXD');
  assert.ok(tt36, 'TT 36/2026/TT-BXD should be present');
  assert.equal(tt36?.ssotFileName, '36-2026_TT-BXD_QLCP_PhuongPhapXacDinhVaQuanLyChiPhiDTXD.pdf');

  const qd1040Pl7 = INITIAL_LEGAL_DOCS.find(
    d => d.ssotFileName === '1040-2026_QD-BXD_QLHD_MauHopDongEPC-PL7.pdf'
  );
  assert.ok(qd1040Pl7, 'QD 1040 PL7 EPC template should be present');

  const cv9947 = INITIAL_LEGAL_DOCS.find(d => d.docNumber === '9947/BXD-VPB');
  assert.ok(cv9947, 'CV 9947/BXD-VPB should be present');

  const nd412 = INITIAL_LEGAL_DOCS.find(d => d.docNumber === '412/2026/NĐ-CP');
  assert.ok(nd412, 'ND 412/2026/ND-CP should be present');

  // Verify all 44 newly ingested real docs pass unified SSOT naming validation
  for (const d of DATA_LEGAL_2026_NEW_DOCS) {
    const v = validateBatchFileName(
      d.ssotFileName,
      'SSOT_9PART',
      d.docType,
      d.issuer,
      d.title,
      [],
      'FILE'
    );
    assert.equal(v.status, 'OK', `Invalid SSOT filename on ${d.ssotFileName}: ${v.message}`);
  }
});

test('GET /api/documents/stream-pdf enforces security and streams PDF', async () => {
  // 1. Rejects missing param
  const resMissing = await invokeOverHttp(streamPdfHandler as any, {
    method: 'GET',
    path: '/api/documents/stream-pdf',
  });
  assert.equal(resMissing.status, 400);

  // 2. Rejects path traversal attempt
  const resTraversal = await invokeOverHttp(streamPdfHandler as any, {
    method: 'GET',
    path: '/api/documents/stream-pdf?file=../../../../Windows/win.ini',
  });
  assert.equal(resTraversal.status, 400);

  // 3. Rejects non-pdf
  const resNonPdf = await invokeOverHttp(streamPdfHandler as any, {
    method: 'GET',
    path: '/api/documents/stream-pdf?file=test.exe',
  });
  assert.equal(resNonPdf.status, 400);

  // 4. Returns 404 for unknown file
  const res404 = await invokeOverHttp(streamPdfHandler as any, {
    method: 'GET',
    path: '/api/documents/stream-pdf?file=unknown_doc_999999.pdf',
  });
  assert.equal(res404.status, 404);

  // 5. Streams real PDF from Data_Legal_2026 if available
  const resReal = await invokeOverHttp(streamPdfHandler as any, {
    method: 'GET',
    path: '/api/documents/stream-pdf?file=%5B2026%5D_206-2026_ND_CP_QLCP.pdf',
  });
  if (resReal.status === 200) {
    assert.equal(resReal.headers['content-type'], 'application/pdf');
    assert.ok(String(resReal.headers['content-disposition']).includes('inline'));
  }
});

test('GET /api/documents/preview-docx enforces Zero-Trust rules & renders A4 HTML', async () => {
  const resPost = await invokeOverHttp(previewDocxHandler as any, {
    method: 'POST',
    path: '/api/documents/preview-docx?file=test.docx',
  });
  assert.equal(resPost.status, 405);

  const resTrav = await invokeOverHttp(previewDocxHandler as any, {
    method: 'GET',
    path: '/api/documents/preview-docx?file=..%2F..%2Fsecret.docx',
  });
  assert.equal(resTrav.status, 400);

  const resExt = await invokeOverHttp(previewDocxHandler as any, {
    method: 'GET',
    path: '/api/documents/preview-docx?file=payload.exe',
  });
  assert.equal(resExt.status, 400);

  const res404 = await invokeOverHttp(previewDocxHandler as any, {
    method: 'GET',
    path: '/api/documents/preview-docx?file=nonexistent_99999.docx',
  });
  assert.equal(res404.status, 404);

  const resRealDocx = await invokeOverHttp(previewDocxHandler as any, {
    method: 'GET',
    path: '/api/documents/preview-docx?file=%5B2026%5D_17-2026_ND_CP_QDCT-Xaydung.docx',
  });
  if (resRealDocx.status === 200) {
    const body = resRealDocx.json as Record<string, unknown>;
    assert.equal(body.ok, true);
    assert.equal(body.ext, '.docx');
    const html = String(body.html || '');
    assert.ok(!/<script/i.test(html), 'Preview HTML must not contain script tags');
    assert.ok(!/G:\\My Drive/i.test(html), 'Preview HTML must not leak host filesystem paths');
  }

  const resNd14Form = await invokeOverHttp(previewDocxHandler as any, {
    method: 'GET',
    path: '/api/documents/preview-docx?folder=%5B2026%5D_14-2026_ND_CP_BieumauvaPhuluc&file=01_M%E1%BA%ABu%20s%E1%BB%91%2001.%20T%E1%BB%9D%20tr%C3%ACnh%20th%E1%BA%A9m%20%C4%91%E1%BB%8Bnh%20B%C3%A1o%20c%C3%A1o%20NCKT%20%C4%90TXD%20v%C3%A0%20TKCS%20(%C4%91%E1%BB%81%20xu%E1%BA%A5t%20Ch%E1%BB%A7%20tr%C6%B0%C6%A1ng%20%C4%91%E1%BA%A7u%20t%C6%B0).docx',
  });
  if (resNd14Form.status === 200) {
    assert.equal((resNd14Form.json as Record<string, unknown>).ok, true);
  }
});

test('GET /api/documents/list-forms validates folder & lists 29 ND 14/2026 forms', async () => {
  const resTrav = await invokeOverHttp(listFormsHandler as any, {
    method: 'GET',
    path: '/api/documents/list-forms?folder=..%2Fsecret',
  });
  assert.equal(resTrav.status, 400);

  const resForms = await invokeOverHttp(listFormsHandler as any, {
    method: 'GET',
    path: '/api/documents/list-forms?folder=%5B2026%5D_14-2026_ND_CP_BieumauvaPhuluc',
  });
  if (resForms.status === 200) {
    const body = resForms.json as { ok: boolean; total: number; files: Array<{ fileName: string }> };
    assert.equal(body.ok, true);
    assert.equal(body.total, 29);
    assert.ok(body.files.every(f => !String(f.fileName).includes('G:\\')));
  }
});

test('GET /api/documents/search-fts and /api/documents/clauses validate inputs', async () => {
  const resMissingQ = await invokeOverHttp(searchFtsHandler as any, {
    method: 'GET',
    path: '/api/documents/search-fts',
  });
  assert.equal(resMissingQ.status, 400);

  const resMissingDocKey = await invokeOverHttp(clausesHandler as any, {
    method: 'GET',
    path: '/api/documents/clauses',
  });
  assert.equal(resMissingDocKey.status, 400);

  // If local SQLite warehouse is populated, verify multi-key lookup & full verbatim clauses
  const resLuatXdByNum = await invokeOverHttp(clausesHandler as any, {
    method: 'GET',
    path: '/api/documents/clauses?docNumber=135%2F2025%2FQH15',
  });
  if ((resLuatXdByNum.json as Record<string, unknown>).found === true) {
    const body = resLuatXdByNum.json as {
      ok: boolean;
      found: boolean;
      clauses: Array<{ code: string; content: string }>;
      meta?: { totalChars: number; isVerbatimComplete?: boolean };
    };
    assert.equal(body.ok, true);
    assert.ok(body.clauses.length > 50, `Expected >50 full verbatim clauses for 135/2025/QH15, got ${body.clauses.length}`);
    assert.equal(body.meta?.isVerbatimComplete, true);
    assert.ok((body.meta?.totalChars || 0) > 50000);
  }

  const resLuatXdBySsot = await invokeOverHttp(clausesHandler as any, {
    method: 'GET',
    path: '/api/documents/clauses?file=135-2025_LUAT-QH15_HDXD_LuatXayDung.pdf',
  });
  if ((resLuatXdBySsot.json as Record<string, unknown>).found === true) {
    assert.ok(((resLuatXdBySsot.json as { clauses: unknown[] }).clauses || []).length > 50);
  }
});

test('legalXrefParser extracts citations, resolves valid targets via O(1) index, and prevents dead links', () => {
  const index = buildDocRefIndex(INITIAL_LEGAL_DOCS);
  const currentDoc = INITIAL_LEGAL_DOCS.find(d => d.docNumber === '135/2025/QH15') || INITIAL_LEGAL_DOCS[0];
  assert.ok(currentDoc);

  const sample =
    'Căn cứ Luật Xây dựng, Điều 1 của Luật này, Nghị định số 206/2026/NĐ-CP và văn bản giả định 9999/2099/NĐ-CP.';
  const segs = parseLegalXrefs(sample);
  const xrefs = segs.filter(s => s.kind === 'xref');
  assert.ok(xrefs.length >= 3, `Expected >= 3 xref segments, got ${xrefs.length}`);

  const resolvedNd206 = xrefs
    .filter(x => x.docNumHint === '206/2026/NĐ-CP')
    .map(x => resolveXrefTarget(x, currentDoc, index))
    .find(Boolean);
  assert.ok(resolvedNd206, 'Should resolve 206/2026/NĐ-CP in index');
  assert.equal(resolvedNd206!.doc.docNumber, '206/2026/NĐ-CP');

  const resolvedDead = xrefs
    .filter(x => x.docNumHint === '9999/2099/NĐ-CP')
    .map(x => resolveXrefTarget(x, currentDoc, index))
    .find(Boolean);
  assert.equal(resolvedDead, undefined, 'Nonexistent doc number must resolve to null (no dead links)');

  const resolvedSelfArt = xrefs
    .filter(x => x.isSelfDocRef && x.articleHint === '1')
    .map(x => resolveXrefTarget(x, currentDoc, index))
    .find(Boolean);
  if (currentDoc.nodes.some(n => /^Điều\s+1\b/i.test(n.code.trim()))) {
    assert.ok(resolvedSelfArt, 'Should resolve internal Điều 1 inside current document');
    assert.equal(resolvedSelfArt!.doc.id, currentDoc.id);
  }
});

test('nd30Formatter parses ND 30/2020 header, footer and generates XSS-safe A4 print HTML', () => {
  const sampleDoc = {
    ...INITIAL_LEGAL_DOCS[0],
    docNumber: '206/2026/NĐ-CP',
    docType: 'ND',
    issuer: 'CP',
    title: 'Quy định chi tiết về quản lý chi phí đầu tư xây dựng',
    issueDate: '15/06/2026',
    nodes: [
      {
        id: 'N0',
        level: 'Mở đầu' as const,
        code: 'Căn cứ',
        title: 'Căn cứ ban hành · Lời mở đầu',
        clauseCount: 4,
        content: [
          'CHÍNH PHỦ',
          'Số: 206/2026/NĐ-CP',
          'Hà Nội, ngày 15 tháng 6 năm 2026',
          'NGHỊ ĐỊNH',
          'Quy định chi tiết về quản lý chi phí đầu tư xây dựng',
          'Căn cứ Luật Xây dựng số 135/2025/QH15;',
          'Chính phủ ban hành Nghị định quy định chi tiết về quản lý chi phí đầu tư xây dựng <script>alert(1)</script>.',
        ].join('\n'),
      },
      {
        id: 'C1',
        level: 'Chương' as const,
        code: 'Chương I',
        title: 'QUY ĐỊNH CHUNG',
        clauseCount: 0,
        content: '',
      },
      {
        id: 'D1',
        level: 'Điều' as const,
        code: 'Điều 1',
        title: 'Phạm vi điều chỉnh',
        clauseCount: 1,
        content: '1. Nghị định này quy định chi tiết quản lý chi phí.',
      },
      {
        id: 'END',
        level: 'Kết thúc' as const,
        code: 'Ký ban hành',
        title: 'Nơi nhận & Thẩm quyền ký ban hành',
        clauseCount: 3,
        content: 'Nơi nhận:\n- Ban Bí thư Trung ương Đảng;\n- Lưu: VT, CN (2).\nTM. CHÍNH PHỦ\nPhạm Gia Túc',
      },
    ],
  };

  const hdr = parseNd30Header(sampleDoc, sampleDoc.nodes[0]);
  assert.equal(hdr.issuerUpper, 'CHÍNH PHỦ');
  assert.equal(hdr.nationUpper, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
  assert.equal(hdr.motto, 'Độc lập - Tự do - Hạnh phúc');
  assert.equal(hdr.docTypeUpper, 'NGHỊ ĐỊNH');
  assert.equal(hdr.legalBases.length, 1);

  const ftr = parseNd30Footer(sampleDoc.nodes[3], sampleDoc.issuer);
  assert.ok(ftr);
  assert.equal(ftr!.recipients.length, 2);
  assert.equal(ftr!.signerName, 'Phạm Gia Túc');

  const html = buildNd30A4PrintHtml(sampleDoc);
  assert.ok(html.includes('@page { size: A4; margin: 20mm 15mm 20mm 30mm; }'));
  assert.ok(html.includes('Times New Roman'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});

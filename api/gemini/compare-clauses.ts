import type { ServerResponse } from 'node:http';
import { prependAuditLog } from '../_lib/auditStore.js';
import {
  buildComparePrompt,
  COMPARE_RESPONSE_SCHEMA,
  COMPARE_SYSTEM_INSTRUCTION,
  GEMINI_LEGAL_MODEL,
  type GeminiClientLike,
  getGeminiClient,
  ThinkingLevel,
} from '../_lib/gemini.js';
import {
  HttpError,
  type NodeRequestWithOptionalBody,
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from '../_lib/http.js';
import { ALLOWED_PROJECT_CODES, sanitizeText } from '../_lib/validation.js';

export interface CompareClausesDeps {
  getGeminiClient?: () => GeminiClientLike | null;
}

export function createCompareClausesHandler(deps?: CompareClausesDeps) {
  const resolveGeminiClient = deps?.getGeminiClient ?? getGeminiClient;

  return async function compareClausesHandler(
    req: NodeRequestWithOptionalBody,
    res: ServerResponse
  ): Promise<void> {
    if (req.method !== 'POST') {
      sendMethodNotAllowed(res, ['POST']);
      return;
    }

    let rawBody: unknown;
    try {
      rawBody = await readJsonBody(req);
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message });
        return;
      }
      sendJson(res, 400, { error: 'Payload yêu cầu không hợp lệ.' });
      return;
    }

    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      sendJson(res, 400, { error: 'Payload yêu cầu không hợp lệ.' });
      return;
    }

    const body = rawBody as Record<string, unknown>;
    const leftClause = body.leftClause as Record<string, unknown> | undefined;
    const rightClause = body.rightClause as Record<string, unknown> | undefined;

    if (
      !leftClause ||
      !rightClause ||
      typeof leftClause !== 'object' ||
      typeof rightClause !== 'object' ||
      typeof leftClause.content !== 'string' ||
      typeof rightClause.content !== 'string'
    ) {
      sendJson(res, 400, {
        error: 'Thiếu thông tin 2 điều khoản cần đối chiếu để thực hiện phân tích chênh lệch pháp lý.',
      });
      return;
    }

    if (leftClause.content.length > 12000 || rightClause.content.length > 12000) {
      sendJson(res, 413, {
        error: 'Nội dung điều khoản đối chiếu vượt quá giới hạn cho phép (tối đa 12.000 ký tự/điều khoản).',
      });
      return;
    }

    const rawProjectCode = sanitizeText(body.projectCode, 20, 'KCN').toUpperCase();
    const projectCode = ALLOWED_PROJECT_CODES.has(rawProjectCode) ? rawProjectCode : 'KCN';
    const projectName = sanitizeText(body.projectName, 200, 'Khu Công Nghiệp');
    const authority = sanitizeText(body.authority, 200, 'Ban Quản lý KKT & các KCN');

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
      sendJson(res, 400, {
        error: 'Nội dung điều khoản đối chiếu không được để trống.',
      });
      return;
    }

    const ai = resolveGeminiClient();
    if (!ai) {
      sendJson(res, 503, {
        error:
          'Chưa phát hiện GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra khóa API trong Settings > Secrets để sử dụng tính năng AI Phân tích chênh lệch pháp lý.',
      });
      return;
    }

    try {
      const promptText = buildComparePrompt({
        projectCode,
        projectName,
        authority,
        safeLeft,
        safeRight,
      });

      const response = await ai.models.generateContent({
        model: GEMINI_LEGAL_MODEL,
        contents: promptText,
        config: {
          systemInstruction: COMPARE_SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: COMPARE_RESPONSE_SCHEMA,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        sendJson(res, 502, {
          error: 'Dịch vụ AI trả về nội dung rỗng. Vui lòng thử phân tích lại.',
        });
        return;
      }

      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const normalizeCategory = (val: unknown): 'TIMELINE' | 'AUTHORITY' | 'TECHNICAL' => {
        const upper = String(val || '').toUpperCase();
        if (upper === 'TIMELINE') return 'TIMELINE';
        if (upper === 'AUTHORITY') return 'AUTHORITY';
        return 'TECHNICAL';
      };

      const sanitizeDifferenceList = (items: unknown) =>
        Array.isArray(items)
          ? items
              .filter(
                (item): item is Record<string, unknown> =>
                  Boolean(item && typeof item === 'object' && !Array.isArray(item))
              )
              .map(item => ({
                aspect: sanitizeText(item.aspect, 200),
                clauseAValue: sanitizeText(item.clauseAValue, 600),
                clauseBValue: sanitizeText(item.clauseBValue, 600),
                impactNote: sanitizeText(item.impactNote, 800),
              }))
              .filter(
                item => item.aspect || item.clauseAValue || item.clauseBValue || item.impactNote
              )
          : [];

      const analysis = {
        summaryVerdict: sanitizeText(parsed.summaryVerdict, 1500),
        timelineDifferences: sanitizeDifferenceList(parsed.timelineDifferences),
        authorityDifferences: sanitizeDifferenceList(parsed.authorityDifferences),
        technicalDifferences: sanitizeDifferenceList(parsed.technicalDifferences),
        recommendedAction: sanitizeText(parsed.recommendedAction, 1500),
        highlightTargetsA: Array.isArray(parsed.highlightTargetsA)
          ? parsed.highlightTargetsA
              .filter(
                (s: unknown): s is { category?: string; phrase: string; reason?: string } =>
                  Boolean(s && typeof s === 'object' && typeof (s as { phrase?: unknown }).phrase === 'string' && (s as { phrase: string }).phrase.trim().length >= 2)
              )
              .map(s => ({
                category: normalizeCategory(s.category),
                phrase: sanitizeText(s.phrase, 160),
                reason: sanitizeText(s.reason, 300),
              }))
          : [],
        highlightTargetsB: Array.isArray(parsed.highlightTargetsB)
          ? parsed.highlightTargetsB
              .filter(
                (s: unknown): s is { category?: string; phrase: string; reason?: string } =>
                  Boolean(s && typeof s === 'object' && typeof (s as { phrase?: unknown }).phrase === 'string' && (s as { phrase: string }).phrase.trim().length >= 2)
              )
              .map(s => ({
                category: normalizeCategory(s.category),
                phrase: sanitizeText(s.phrase, 160),
                reason: sanitizeText(s.reason, 300),
              }))
          : [],
      };

      prependAuditLog({
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

      sendJson(res, 200, {
        source: GEMINI_LEGAL_MODEL,
        analyzedAt: new Date().toLocaleTimeString('vi-VN'),
        analysis,
      });
    } catch {
      console.error('Server-side Gemini compare-clauses error (details suppressed from client).');
      sendJson(res, 502, {
        error:
          'Không thể hoàn tất phân tích chênh lệch pháp lý từ dịch vụ AI lúc này. Vui lòng thử lại sau.',
      });
    }
  };
}

export default createCompareClausesHandler();

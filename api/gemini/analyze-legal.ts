import type { ServerResponse } from 'node:http';
import { prependAuditLog } from '../_lib/auditStore.js';
import {
  buildAnalyzeSystemInstruction,
  buildDeterministicLegalReport,
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

export interface AnalyzeLegalDeps {
  getGeminiClient?: () => GeminiClientLike | null;
}

export function createAnalyzeLegalHandler(deps?: AnalyzeLegalDeps) {
  const resolveGeminiClient = deps?.getGeminiClient ?? getGeminiClient;

  return async function analyzeLegalHandler(
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
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (rawPrompt.length > 6000) {
      sendJson(res, 413, {
        error: 'Nội dung truy vấn vượt quá giới hạn an toàn (tối đa 6.000 ký tự).',
      });
      return;
    }

    const prompt = sanitizeText(rawPrompt, 6000);
    if (!prompt) {
      sendJson(res, 400, {
        error: 'Vui lòng nhập nội dung tình huống pháp lý hoặc yêu cầu kiểm toán.',
      });
      return;
    }

    const rawProjectCode = sanitizeText(body.projectCode, 20, 'KCN').toUpperCase();
    const projectCode = ALLOWED_PROJECT_CODES.has(rawProjectCode) ? rawProjectCode : 'KCN';

    const agentId = sanitizeText(body.agentId, 60, 'AGENT_2_CROSS');
    const agentName = sanitizeText(
      body.agentName,
      140,
      'Agent 2 — AI Cross-Exam & Conflict Resolver'
    );
    const projectName = sanitizeText(
      body.projectName,
      200,
      'Khu Công Nghiệp (Đầu tư Hạ tầng & Nhà máy KCN)'
    );
    const authority = sanitizeText(
      body.authority,
      200,
      'Ban Quản lý KKT & các KCN (Một cửa tại chỗ)'
    );
    const specialNote = sanitizeText(
      body.specialNote,
      500,
      'Thẩm định dự án/thiết kế thông qua Ban Quản lý KCN; kiểm soát ĐTM KCN, trạm xử lý nước thải tập trung.'
    );
    const chronoErrorsCount = Math.max(
      0,
      Math.min(100, Number.isFinite(Number(body.chronoErrorsCount)) ? Number(body.chronoErrorsCount) : 0)
    );
    const gateCode = sanitizeText(body.gateCode, 20) || undefined;
    const stepCode = sanitizeText(body.stepCode, 30) || undefined;
    const stepTitle = sanitizeText(body.stepTitle, 200) || undefined;
    const riskFlag = sanitizeText(body.riskFlag, 500) || undefined;

    const ai = resolveGeminiClient();

    if (ai) {
      try {
        const systemInstruction = buildAnalyzeSystemInstruction({
          agentId,
          agentName,
          projectCode,
          projectName,
          authority,
          specialNote,
        });

        const response = await ai.models.generateContent({
          model: GEMINI_LEGAL_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const replyText = response.text;
        if (replyText && replyText.trim().length > 0) {
          prependAuditLog({
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

          sendJson(res, 200, {
            source: GEMINI_LEGAL_MODEL,
            report: replyText,
          });
          return;
        }
      } catch {
        console.warn('Server-side Gemini analyze notice: falling back to deterministic legal engine.');
      }
    }

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

    prependAuditLog({
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

    sendJson(res, 200, {
      source: 'built-in-legal-engine',
      report: deterministicReport,
    });
  };
}

export default createAnalyzeLegalHandler();

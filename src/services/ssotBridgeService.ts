import { AuditLogEntry, LegalDiffCategory, ProjectArchetypeCode } from '../types/lexPmoTypes';

export interface HybridServiceHealth {
  fastApiOnline: boolean;
  localScannerOnline: boolean;
  expressFallbackOnline: boolean;
  fastApiBaseUrl: string;
  localScannerBaseUrl: string;
  checkedAt: string;
}

const FASTAPI_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_FASTAPI_BASE_URL ||
  'http://127.0.0.1:8000/api/v1';

const LOCAL_SCANNER_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LOCAL_SCANNER_URL ||
  'http://127.0.0.1:8008/api/local';

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 1500
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kiểm tra trạng thái kết nối tới FastAPI Backend (:8000) và Local PDF Scanner Sidecar (:8008).
 * Tự động fallback mượt mà về Express server (:3000) / dữ liệu cục bộ nếu dịch vụ nền chưa bật.
 */
export async function probeHybridServices(): Promise<HybridServiceHealth> {
  let fastApiOnline = false;
  let localScannerOnline = false;

  try {
    const res = await fetchWithTimeout(`${FASTAPI_BASE_URL}/health`, { method: 'GET' }, 1000);
    fastApiOnline = res.ok;
  } catch {
    fastApiOnline = false;
  }

  try {
    const res = await fetchWithTimeout(`${LOCAL_SCANNER_BASE_URL}/health`, { method: 'GET' }, 1000);
    localScannerOnline = res.ok;
  } catch {
    localScannerOnline = false;
  }

  return {
    fastApiOnline,
    localScannerOnline,
    expressFallbackOnline: true,
    fastApiBaseUrl: FASTAPI_BASE_URL,
    localScannerBaseUrl: LOCAL_SCANNER_BASE_URL,
    checkedAt: new Date().toLocaleTimeString('vi-VN'),
  };
}

function toCanonicalFourPartyRole(rawRole: string): 'CDT' | 'PMU' | 'TVGS' | 'CONTRACTOR' {
  const upper = (rawRole || '').toUpperCase();
  if (upper.includes('CDT')) return 'CDT';
  if (upper.includes('PMU') || upper.includes('BQLDA') || upper.includes('ADMIN_PMO')) return 'PMU';
  if (upper.includes('TVGS') || upper.includes('TVTK')) return 'TVGS';
  if (upper.includes('CONTRACTOR') || upper.includes('NTTC')) return 'CONTRACTOR';
  return 'PMU';
}

/**
 * Đồng bộ bản ghi AuditLog lên FastAPI (:8000) trước, nếu chưa bật thì tự động fallback về Express (/api/audit-logs).
 */
export async function syncAuditLogEntry(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
  actorRole: string
): Promise<{ log?: AuditLogEntry; source: 'fastapi-8000' | 'express-local' | 'client-memory' }> {
  const canonicalRole = toCanonicalFourPartyRole(actorRole || entry.actorRole);
  const payload = {
    ...entry,
    actor_role: canonicalRole,
  };

  try {
    const fastRes = await fetchWithTimeout(
      `${FASTAPI_BASE_URL}/audit-logs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-actor-role': canonicalRole,
        },
        body: JSON.stringify(payload),
      },
      1200
    );
    if (fastRes.ok) {
      const data = await fastRes.json();
      return { log: data.log, source: 'fastapi-8000' };
    }
  } catch {
    // FastAPI (:8000) not running -> seamless fallback to local Express server
  }

  try {
    const expressRes = await fetch('/api/audit-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-actor-role': canonicalRole,
      },
      body: JSON.stringify(payload),
    });
    if (expressRes.ok) {
      const data = await expressRes.json();
      return { log: data.log, source: 'express-local' };
    }
  } catch {
    // Express route unreachable -> keep in client state
  }

  return { source: 'client-memory' };
}

/**
 * Gọi Local PDF Scanner Sidecar (:8008) để trích xuất OCR 4 vùng & SHA-256 trực tiếp dưới máy trạm;
 * tự động trả về null nếu Sidecar (:8008) chưa bật để dùng bộ phân tích браузер cục bộ.
 */
export async function scanPdfViaLocalSidecar(fileMeta: {
  fileName: string;
  sizeBytes: number;
  relativePath?: string;
}): Promise<{
  sha256?: string;
  extractedText?: string;
  ocrConfidence?: number;
  source: 'sidecar-8008';
} | null> {
  try {
    const res = await fetchWithTimeout(
      `${LOCAL_SCANNER_BASE_URL}/scan-file`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileMeta),
      },
      1200
    );
    if (res.ok) {
      const data = await res.json();
      return {
        sha256: data.sha256,
        extractedText: data.extractedText,
        ocrConfidence: data.ocrConfidence,
        source: 'sidecar-8008',
      };
    }
  } catch {
    // Local scanner sidecar (:8008) offline -> fallback to browser analyzer
  }
  return null;
}

export interface HybridAiAnalyzeRequest {
  agentId: string;
  agentName: string;
  projectCode: ProjectArchetypeCode;
  projectName: string;
  authority: string;
  specialNote: string;
  prompt: string;
  chronoErrorsCount: number;
  gateCode?: string;
  stepCode?: string;
  stepTitle?: string;
  riskFlag?: string;
}

/**
 * Gọi AI Phân tích rủi ro/pháp lý: ưu tiên kết nối FastAPI (:8000) nếu khả dụng,
 * tự động fallback mượt mà về Express `/api/gemini/analyze-legal`.
 */
export async function analyzeLegalWithHybridAi(
  payload: HybridAiAnalyzeRequest
): Promise<{ report: string; source: string }> {
  try {
    const fastRes = await fetchWithTimeout(
      `${FASTAPI_BASE_URL}/ai/analyze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      1400
    );
    if (fastRes.ok) {
      const data = await fastRes.json();
      if (data?.report) {
        return {
          report: data.report,
          source: data.source || 'fastapi-8000',
        };
      }
    }
  } catch {
    // Fallback to Express server.ts
  }

  const res = await fetch('/api/gemini/analyze-legal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data?.report) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return {
    report: data.report,
    source: data.source || 'gemini-4-hydrogen',
  };
}

export interface HybridClauseComparePayload {
  projectCode: ProjectArchetypeCode;
  projectName: string;
  authority: string;
  leftClause: {
    docId: string;
    docNumber: string;
    docType: string;
    issueDate: string;
    effectiveDate: string;
    status: string;
    nodeCode: string;
    nodeTitle: string;
    content: string;
  };
  rightClause: {
    docId: string;
    docNumber: string;
    docType: string;
    issueDate: string;
    effectiveDate: string;
    status: string;
    nodeCode: string;
    nodeTitle: string;
    content: string;
  };
}

/**
 * Gọi AI Đối chiếu chênh lệch 2 điều khoản (Bước 2 Cột 3):
 * ưu tiên FastAPI (:8000) nếu đang chạy, tự động fallback về `/api/gemini/compare-clauses`.
 */
export async function compareClausesWithHybridAi(payload: HybridClauseComparePayload): Promise<{
  source: string;
  analyzedAt: string;
  analysis: {
    summaryVerdict: string;
    timelineDifferences: Array<{
      aspect: string;
      clauseAValue: string;
      clauseBValue: string;
      impactNote: string;
    }>;
    authorityDifferences: Array<{
      aspect: string;
      clauseAValue: string;
      clauseBValue: string;
      impactNote: string;
    }>;
    technicalDifferences: Array<{
      aspect: string;
      clauseAValue: string;
      clauseBValue: string;
      impactNote: string;
    }>;
    recommendedAction: string;
    highlightTargetsA: Array<{
      category: LegalDiffCategory;
      phrase: string;
      reason: string;
    }>;
    highlightTargetsB: Array<{
      category: LegalDiffCategory;
      phrase: string;
      reason: string;
    }>;
  };
}> {
  try {
    const fastRes = await fetchWithTimeout(
      `${FASTAPI_BASE_URL}/ai/compare-clauses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      1400
    );
    if (fastRes.ok) {
      const fastData = await fastRes.json();
      if (fastData?.analysis) {
        return fastData;
      }
    }
  } catch {
    // Fallback to local Express Gemini endpoint
  }

  const response = await fetch('/api/gemini/compare-clauses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data?.analysis) {
    throw new Error(
      data?.error ||
        `Lỗi máy chủ (${response.status}) khi phân tích chênh lệch pháp lý bằng Gemini.`
    );
  }
  return data;
}

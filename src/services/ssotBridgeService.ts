import {
  AuditLogEntry,
  LegalDiffCategory,
  LegalNode,
  LegalTocSection,
  ProjectArchetypeCode,
} from '../types/lexPmoTypes';

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

export type CanonicalGuardRole = 'CDT' | 'PMU' | 'TVGS' | 'CONTRACTOR';

export interface RoleGuardStatus {
  protected: boolean;
  demoMode: boolean;
  guardedRoles: Array<'CDT' | 'PMU' | 'TVGS'>;
  configError?: string;
}

export interface VerifyRoleResponse {
  ok: boolean;
  verified: boolean;
  role?: CanonicalGuardRole;
  demoMode?: boolean;
  protected?: boolean;
  message?: string;
  error?: string;
}

export function toCanonicalGuardRole(rawRole: string): CanonicalGuardRole {
  const upper = (rawRole || '').toUpperCase();
  if (upper.includes('CDT')) return 'CDT';
  if (upper.includes('PMU') || upper.includes('BQLDA') || upper.includes('ADMIN_PMO')) return 'PMU';
  if (upper.includes('TVGS') || upper.includes('TVTK')) return 'TVGS';
  if (upper.includes('CONTRACTOR') || upper.includes('NTTC')) return 'CONTRACTOR';
  return 'CONTRACTOR';
}

function toCanonicalFourPartyRole(rawRole: string): CanonicalGuardRole {
  return toCanonicalGuardRole(rawRole);
}

/**
 * Kiểm tra chế độ bảo vệ vai trò (Demo Mode vs Protected Mode) từ `/api/verify-role`.
 */
export async function fetchRoleGuardStatus(): Promise<RoleGuardStatus | null> {
  try {
    const res = await fetchWithTimeout(
      '/api/verify-role',
      { method: 'GET', cache: 'no-store' },
      2500
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RoleGuardStatus> & { ok?: boolean };
    if (typeof data.protected !== 'boolean' || typeof data.demoMode !== 'boolean') {
      return null;
    }
    return {
      protected: data.protected,
      demoMode: data.demoMode,
      guardedRoles: Array.isArray(data.guardedRoles)
        ? data.guardedRoles.filter(
            (r): r is 'CDT' | 'PMU' | 'TVGS' => r === 'CDT' || r === 'PMU' || r === 'TVGS'
          )
        : [],
      ...(typeof data.configError === 'string' && data.configError.trim()
        ? { configError: data.configError.trim() }
        : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Xác thực Passcode chuyển vai trò qua `/api/verify-role`.
 */
export async function verifyRolePasscode(
  role: string,
  passcode: string
): Promise<VerifyRoleResponse> {
  const canonicalRole = toCanonicalGuardRole(role);
  const res = await fetchWithTimeout(
    '/api/verify-role',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: canonicalRole, passcode }),
    },
    4000
  );

  let data: Partial<VerifyRoleResponse> = {};
  try {
    data = (await res.json()) as Partial<VerifyRoleResponse>;
  } catch {
    data = {};
  }

  return {
    ok: Boolean(data.ok),
    verified: Boolean(data.verified),
    role: (data.role as CanonicalGuardRole | undefined) || canonicalRole,
    demoMode: data.demoMode,
    protected: data.protected,
    message: data.message,
    error: data.error || (!res.ok ? `Lỗi xác thực (${res.status}).` : undefined),
  };
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
 * Gọi Local PDF Scanner Sidecar (:8008) để trích xuất text/OCR, phân rã cấu trúc Chương/Điều/Khoản
 * & SHA-256 trực tiếp dưới máy trạm; tự động trả về null nếu Sidecar (:8008) chưa bật để dùng bộ phân tích trình duyệt.
 */
export async function scanPdfViaLocalSidecar(fileMeta: {
  fileName: string;
  sizeBytes: number;
  relativePath?: string;
  filePath?: string;
  rawText?: string;
}): Promise<{
  sha256?: string;
  extractedText?: string;
  ocrConfidence?: number;
  meta?: {
    source_type: string;
    ocr_applied: boolean;
    total_pages: number;
    chapters: number;
    articles: number;
    clauses: number;
  };
  sections?: LegalTocSection[];
  legalNodes?: LegalNode[];
  source: 'sidecar-8008';
} | null> {
  try {
    const res = await fetchWithTimeout(
      `${LOCAL_SCANNER_BASE_URL}/scan-file`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fileMeta,
          file_path: fileMeta.filePath || fileMeta.relativePath,
          raw_text: fileMeta.rawText,
        }),
      },
      2500
    );
    if (res.ok) {
      const data = await res.json();
      return {
        sha256: data.sha256,
        extractedText: data.extractedText || data.raw_text,
        ocrConfidence: data.ocrConfidence ?? data.ocr_confidence,
        meta: data.meta,
        sections: Array.isArray(data.sections) ? data.sections : undefined,
        legalNodes: Array.isArray(data.legal_nodes) ? data.legal_nodes : undefined,
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

// ============================================================================
// VBPL DATA FOUNDATION (6 TẦNG — LOCAL SIDECAR :8008 /api/data-foundation/*)
// ============================================================================

const DATA_FOUNDATION_BASE_URL =
  LOCAL_SCANNER_BASE_URL.replace(/\/api\/local\/?$/i, '') + '/api/data-foundation';

export function getDataFoundationExcelExportUrl(): string {
  return `${DATA_FOUNDATION_BASE_URL}/export/excel`;
}

export async function fetchDataFoundationBiOverview(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(
      `${DATA_FOUNDATION_BASE_URL}/bi/overview`,
      { method: 'GET', cache: 'no-store' },
      2500
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function syncDocsToDataFoundation(
  records: Array<Record<string, unknown>>,
  sourceSystem = 'WEB_APP'
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(
      `${DATA_FOUNDATION_BASE_URL}/sync-records`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records,
          source_system: sourceSystem,
          run_etl: true,
        }),
      },
      10000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function ingestFolderToDataFoundation(
  folderPath: string,
  projectCode = 'KCN'
): Promise<Record<string, unknown>> {
  const res = await fetchWithTimeout(
    `${DATA_FOUNDATION_BASE_URL}/ingest-folder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_path: folderPath,
        project_code: projectCode,
        run_etl: true,
      }),
    },
    30000
  );
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data?.detail || `Lỗi nạp thư mục (${res.status})`));
  }
  return data;
}

export async function triggerDataFoundationEtl(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(
      `${DATA_FOUNDATION_BASE_URL}/etl/run`,
      { method: 'POST' },
      10000
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function searchDataFoundationClauses(
  query: string,
  limit = 25,
  filters?: { domain?: string; docType?: string }
): Promise<{
  query: string;
  source?: string;
  total_hits: number;
  hits: Array<Record<string, unknown>>;
} | null> {
  // Ưu tiên 1: Endpoint Node thuần /api/documents/search-fts (đọc trực tiếp SQLite WAL không cần Sidecar :8008)
  try {
    const qs = new URLSearchParams({
      q: query,
      limit: String(limit),
      ...(filters?.domain && filters.domain !== 'ALL' ? { domain: filters.domain } : {}),
      ...(filters?.docType && filters.docType !== 'ALL' ? { docType: filters.docType } : {}),
    });
    const nodeRes = await fetchWithTimeout(`/api/documents/search-fts?${qs.toString()}`, { method: 'GET' }, 2500);
    if (nodeRes.ok) {
      const data = (await nodeRes.json()) as {
        source?: string;
        query?: string;
        total_hits?: number;
        hits?: Array<Record<string, unknown>>;
      };
      if (data.source && data.source !== 'unavailable') {
        return {
          query: data.query || query,
          source: data.source,
          total_hits: data.total_hits ?? (data.hits?.length || 0),
          hits: data.hits || [],
        };
      }
    }
  } catch {
    // fallback sang Sidecar :8008
  }

  // Ưu tiên 2: Local Sidecar :8008
  try {
    const url = `${DATA_FOUNDATION_BASE_URL}/analyst/search?q=${encodeURIComponent(
      query
    )}&limit=${limit}`;
    const res = await fetchWithTimeout(url, { method: 'GET' }, 3000);
    if (res.ok) {
      const data = (await res.json()) as {
        query: string;
        total_hits: number;
        hits: Array<Record<string, unknown>>;
      };
      return { ...data, source: 'sidecar-fts5' };
    }
  } catch {
    return null;
  }
  return null;
}

// ============================================================================
// ZERO-TRUST DOCUMENT PROXY (.DOCX / .DOC / FORMS / CLAUSES) & STEP 1 BRIDGE
// ============================================================================

export interface DocxPreviewResult {
  ok: boolean;
  fileName: string;
  folder: string | null;
  ext: '.docx' | '.doc';
  engine: string;
  degradedMode: boolean;
  sizeBytes: number;
  html: string;
  plainText: string;
  warnings: string[];
}

export interface FolderFormEntry {
  fileName: string;
  ext: string;
  sizeBytes: number;
  sizeLabel: string;
}

export function buildA4StandaloneHtml(title: string, bodyHtml: string, zoom = 100): string {
  const safeTitle = title.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));
  const scale = Math.max(0.5, Math.min(2, zoom / 100));
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  @page { size: A4; margin: 20mm 15mm 20mm 30mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 20px;
    background: #ebe4d6;
    color: #1a2430;
    font-family: "Times New Roman", "Cambria", serif;
    font-size: 13pt;
    line-height: 1.5;
  }
  .vbpl-docx-paper {
    max-width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 18mm 15mm 18mm 25mm;
    background: #ffffff;
    box-shadow: 0 6px 24px rgba(18, 41, 63, 0.16);
    border: 1px solid #d8d2c4;
    transform: scale(${scale});
    transform-origin: top center;
  }
  h1, h2, h3, h4 { color: #1b3a5c; margin: 10pt 0 6pt; line-height: 1.35; }
  p { margin: 0 0 6pt; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 11.5pt; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #334155; padding: 5pt 6pt; vertical-align: top; text-align: left; }
  th { background: #f1f5f9; font-weight: bold; }
  ul, ol { margin: 4pt 0 8pt 18pt; padding: 0; }
  @media print {
    body { background: #ffffff; padding: 0; }
    .vbpl-docx-paper { box-shadow: none; border: none; padding: 0; margin: 0; max-width: none; transform: none; }
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

export async function fetchDocxPreview(
  fileName: string,
  folder?: string | null
): Promise<DocxPreviewResult> {
  const qs = new URLSearchParams({
    file: fileName,
    mode: 'json',
    ...(folder ? { folder } : {}),
  });
  const res = await fetchWithTimeout(`/api/documents/preview-docx?${qs.toString()}`, { method: 'GET' }, 15000);
  const data = (await res.json()) as Partial<DocxPreviewResult> & { error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Không thể đọc tệp Word (${res.status})`);
  }
  return data as DocxPreviewResult;
}

export async function fetchFolderFormsList(
  folder: string
): Promise<{ ok: boolean; folder: string; total: number; files: FolderFormEntry[] }> {
  const res = await fetchWithTimeout(
    `/api/documents/list-forms?folder=${encodeURIComponent(folder)}`,
    { method: 'GET' },
    5000
  );
  const data = (await res.json()) as {
    ok?: boolean;
    folder?: string;
    total?: number;
    files?: FolderFormEntry[];
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Không thể đọc danh sách biểu mẫu (${res.status})`);
  }
  return {
    ok: true,
    folder: data.folder || folder,
    total: data.total || 0,
    files: data.files || [],
  };
}

export interface VerbatimClausesMeta {
  sourceType: string;
  totalPages: number;
  articleCount?: number;
  clauseCount?: number;
  totalChars: number;
  originalName?: string;
  isVerbatimComplete?: boolean;
}

export async function fetchFullDocumentClauses(
  lookup:
    | string
    | { docKey?: string; ssotFileName?: string; rawFileName?: string; docNumber?: string }
): Promise<{ found: boolean; clauses: LegalNode[]; meta?: VerbatimClausesMeta }> {
  try {
    const qs = new URLSearchParams();
    if (typeof lookup === 'string') {
      qs.set('file', lookup);
    } else {
      if (lookup.docKey) qs.set('docKey', lookup.docKey);
      if (lookup.ssotFileName) qs.set('file', lookup.ssotFileName);
      if (lookup.rawFileName) qs.set('rawFile', lookup.rawFileName);
      if (lookup.docNumber && lookup.docNumber !== '01') qs.set('docNumber', lookup.docNumber);
    }
    const res = await fetchWithTimeout(
      `/api/documents/clauses?${qs.toString()}`,
      { method: 'GET' },
      5000
    );
    if (!res.ok) return { found: false, clauses: [] };
    const data = (await res.json()) as {
      found?: boolean;
      clauses?: LegalNode[];
      meta?: VerbatimClausesMeta;
    };
    return {
      found: Boolean(data.found && Array.isArray(data.clauses) && data.clauses.length > 0),
      clauses: Array.isArray(data.clauses) ? data.clauses : [],
      meta: data.meta,
    };
  } catch {
    return { found: false, clauses: [] };
  }
}

export async function scanLocalFolderViaSidecar(
  folderPath: string,
  options: { recursive?: boolean; projectCode?: ProjectArchetypeCode; gateCode?: string } = {}
): Promise<{ total_files: number; files: Array<Record<string, unknown>> }> {
  const res = await fetchWithTimeout(
    `${LOCAL_SCANNER_BASE_URL}/scan-folder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_path: folderPath,
        recursive: options.recursive ?? true,
        project_code: options.projectCode || 'KCN',
        gate_code: options.gateCode || undefined,
      }),
    },
    30000
  );
  const data = (await res.json()) as { total_files?: number; files?: Array<Record<string, unknown>>; detail?: string };
  if (!res.ok) {
    throw new Error(data.detail || `Lỗi quét thư mục (${res.status})`);
  }
  return {
    total_files: data.total_files || 0,
    files: data.files || [],
  };
}

export async function commitBatchToDataFoundation(payload: {
  operation_mode: 'COPY_TO_SILVER' | 'INPLACE_RENAME' | 'METADATA_ONLY';
  actor_name: string;
  project_code: string;
  items: Array<Record<string, unknown>>;
}): Promise<{
  status: string;
  batch_id: string;
  operation_mode: string;
  vault_saved_count: number;
  file_ops_count: number;
  rename_operations: Array<Record<string, unknown>>;
  hydrated_documents: Array<Record<string, unknown>>;
}> {
  const res = await fetchWithTimeout(
    `${DATA_FOUNDATION_BASE_URL}/commit-batch`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, run_etl: true }),
    },
    30000
  );
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data?.detail || `Lỗi commit Data Foundation (${res.status})`));
  }
  return data as unknown as {
    status: string;
    batch_id: string;
    operation_mode: string;
    vault_saved_count: number;
    file_ops_count: number;
    rename_operations: Array<Record<string, unknown>>;
    hydrated_documents: Array<Record<string, unknown>>;
  };
}

export async function hydrateDocumentsFromDataFoundation(): Promise<Array<Record<string, unknown>> | null> {
  try {
    const res = await fetchWithTimeout(
      `${DATA_FOUNDATION_BASE_URL}/documents?include_nodes=true&limit=500`,
      { method: 'GET', cache: 'no-store' },
      4000
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { documents?: Array<Record<string, unknown>> };
    return Array.isArray(data.documents) ? data.documents : null;
  } catch {
    return null;
  }
}

export async function fetchRenameOperationsFromDataFoundation(
  limit = 100
): Promise<Array<Record<string, unknown>> | null> {
  try {
    const res = await fetchWithTimeout(
      `${DATA_FOUNDATION_BASE_URL}/rename-operations?limit=${limit}`,
      { method: 'GET', cache: 'no-store' },
      3000
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { operations?: Array<Record<string, unknown>> };
    return Array.isArray(data.operations) ? data.operations : null;
  } catch {
    return null;
  }
}

export async function undoRenameOperationViaDataFoundation(params: {
  batch_id?: string;
  op_id?: string;
}): Promise<{ status: string; reverted_count: number; reverted_op_ids: string[] }> {
  const res = await fetchWithTimeout(
    `${DATA_FOUNDATION_BASE_URL}/rename-operations/undo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    10000
  );
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(data?.detail || `Lỗi hoàn tác ACID (${res.status})`));
  }
  return data as unknown as { status: string; reverted_count: number; reverted_op_ids: string[] };
}

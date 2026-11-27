import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NodeRequestWithOptionalBody } from './http.js';

export const ALLOWED_DOCUMENT_ROOTS = [
  String.raw`G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026`,
  path.resolve(process.cwd(), '.local_data', 'vbpl'),
  path.resolve(process.cwd(), 'data'),
  path.resolve(process.cwd(), 'public'),
];

export function getSearchParams(req: NodeRequestWithOptionalBody): URLSearchParams {
  if (req.url) {
    try {
      return new URL(req.url, 'http://127.0.0.1').searchParams;
    } catch {
      // fall through
    }
  }
  const params = new URLSearchParams();
  const expressQuery = (req as { query?: Record<string, unknown> }).query;
  if (expressQuery && typeof expressQuery === 'object') {
    for (const [k, v] of Object.entries(expressQuery)) {
      if (typeof v === 'string') params.set(k, v);
    }
  }
  return params;
}

export function validateSafeSegment(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    /[<>:"|?*]/.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

export function extractDocPrefix(name: string): string {
  const m = name.match(/(\d+[\-_]\d+)/);
  return m ? m[1].replace('_', '-') : '';
}

function isContainedInRoot(candidate: string, root: string): boolean {
  try {
    const realCandidate = fs.realpathSync(candidate);
    const realRoot = fs.realpathSync(root);
    const normCand = process.platform === 'win32' ? realCandidate.toLowerCase() : realCandidate;
    const normRoot = process.platform === 'win32' ? realRoot.toLowerCase() : realRoot;
    return normCand === normRoot || normCand.startsWith(normRoot + path.sep);
  } catch {
    return false;
  }
}

function collectFilesLimited(dirPath: string, maxDepth = 3, depth = 0, out: string[] = []): string[] {
  if (depth > maxDepth || !fs.existsSync(dirPath)) return out;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('~$')) continue;
      const full = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        out.push(full);
      } else if (entry.isDirectory() && depth < maxDepth) {
        collectFilesLimited(full, maxDepth, depth + 1, out);
      }
    }
  } catch {
    // ignore unreadable directory
  }
  return out;
}

export function resolveSafeDocumentPath(
  safeFile: string,
  allowedExts: string[],
  safeFolder?: string | null
): { filePath: string; matchedName: string } | null {
  const lowerFile = safeFile.toLowerCase();
  const extAllowed = allowedExts.some(ext => lowerFile.endsWith(ext));
  if (!extAllowed) return null;

  const prefix = allowedExts.includes('.pdf') ? extractDocPrefix(safeFile) : '';

  for (const root of ALLOWED_DOCUMENT_ROOTS) {
    if (!fs.existsSync(root)) continue;

    if (safeFolder) {
      const folderDir = path.join(root, safeFolder);
      if (!fs.existsSync(folderDir) || !isContainedInRoot(folderDir, root)) continue;
      try {
        const entries = fs.readdirSync(folderDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || entry.name.startsWith('~$')) continue;
          if (entry.name.toLowerCase() === lowerFile) {
            const candidate = path.join(folderDir, entry.name);
            if (isContainedInRoot(candidate, root)) {
              return { filePath: candidate, matchedName: entry.name };
            }
          }
        }
      } catch {
        // ignore
      }
      continue;
    }

    const direct = path.join(root, safeFile);
    if (fs.existsSync(direct) && fs.statSync(direct).isFile() && isContainedInRoot(direct, root)) {
      return { filePath: direct, matchedName: path.basename(direct) };
    }

    const isLakeRoot = path.basename(root).toLowerCase() === 'vbpl';
    const allFiles = isLakeRoot
      ? [
          ...collectFilesLimited(path.join(root, '02_silver', 'curated_files'), 3),
          ...collectFilesLimited(path.join(root, '01_bronze', 'raw_files'), 1),
          ...collectFilesLimited(root, 1),
        ]
      : collectFilesLimited(root, 1);

    for (const p of allFiles) {
      const pBase = path.basename(p).toLowerCase();
      if ((pBase === lowerFile || pBase.endsWith(`_${lowerFile}`)) && isContainedInRoot(p, root)) {
        return { filePath: p, matchedName: path.basename(p) };
      }
    }

    if (prefix) {
      for (const p of allFiles) {
        const pBase = path.basename(p);
        if (
          allowedExts.some(ext => pBase.toLowerCase().endsWith(ext)) &&
          pBase.includes(prefix) &&
          isContainedInRoot(p, root)
        ) {
          return { filePath: p, matchedName: pBase };
        }
      }
    }
  }

  return null;
}

export function resolveSafeSubfolder(safeFolder: string): string | null {
  for (const root of ALLOWED_DOCUMENT_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const candidate = path.join(root, safeFolder);
    if (
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isDirectory() &&
      isContainedInRoot(candidate, root)
    ) {
      return candidate;
    }
  }
  return null;
}

export function computeBufferSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex').toLowerCase();
}

export function getPreviewCacheDocxPath(sha256: string): string {
  return path.resolve(process.cwd(), '.local_data', 'vbpl', '06_preview_cache', `${sha256}.docx`);
}

export function getSqliteWarehousePath(): string {
  const custom = process.env.LEX_DATA_LAKE_ROOT;
  const lakeRoot = custom ? path.resolve(custom) : path.resolve(process.cwd(), '.local_data', 'vbpl');
  return path.join(lakeRoot, '04_warehouse', 'vbpl_warehouse.sqlite');
}

export function sanitizeDocHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  let clean = rawHtml
    .replace(/<(script|style|iframe|object|embed|link|meta|form|base)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|link|meta|form|base)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1="#"');

  const allowedTagRe =
    /<\/?(?:p|br|h[1-6]|strong|b|em|i|u|sup|sub|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|blockquote|span|div|article|section|caption|colgroup|col)\b(?:\s+(?:colspan|rowspan|class)=("[^"]*"|'[^']*'))?\s*\/?>/gi;

  // Giữ nguyên các thẻ an toàn hợp chuẩn, loại bỏ thẻ lạ
  clean = clean.replace(/<\/?[a-zA-Z0-9:-]+(?:\s+[^>]*)?>/g, tag => {
    allowedTagRe.lastIndex = 0;
    if (allowedTagRe.test(tag)) {
      return tag;
    }
    const basicMatch = tag.match(/^<\/?(p|br|h[1-6]|strong|b|em|i|u|sup|sub|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|blockquote|span|div|article|section|caption)\b/i);
    if (basicMatch) {
      const closing = tag.startsWith('</') ? '/' : '';
      const colspan = tag.match(/\bcolspan\s*=\s*("?\d+"?)/i);
      const rowspan = tag.match(/\browspan\s*=\s*("?\d+"?)/i);
      const attrs = [
        colspan ? `colspan="${colspan[1].replace(/"/g, '')}"` : '',
        rowspan ? `rowspan="${rowspan[1].replace(/"/g, '')}"` : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `<${closing}${basicMatch[1].toLowerCase()}${attrs ? ' ' + attrs : ''}>`;
    }
    return '';
  });

  return clean;
}

export function buildA4PreviewHtmlDocument(title: string, sanitizedBodyHtml: string): string {
  const safeTitle = title.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));
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
    padding: 24px;
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
    padding: 20mm 15mm 20mm 30mm;
    background: #ffffff;
    box-shadow: 0 6px 24px rgba(18, 41, 63, 0.16);
    border: 1px solid #d8d2c4;
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
    .vbpl-docx-paper { box-shadow: none; border: none; padding: 0; margin: 0; max-width: none; }
  }
</style>
</head>
<body>
<article class="vbpl-docx-paper">
${sanitizedBodyHtml}
</article>
</body>
</html>`;
}

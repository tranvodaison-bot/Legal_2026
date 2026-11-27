import type { ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildA4PreviewHtmlDocument,
  computeBufferSha256,
  getPreviewCacheDocxPath,
  getSearchParams,
  resolveSafeDocumentPath,
  sanitizeDocHtml,
  validateSafeSegment,
} from '../_lib/documentProxy.js';
import {
  type NodeRequestWithOptionalBody,
  sendJson,
  sendMethodNotAllowed,
  setSecurityHeaders,
} from '../_lib/http.js';

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(text: string): string {
  return text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

export default async function previewDocxHandler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const params = getSearchParams(req);
  const rawFile = params.get('file') || params.get('fileName') || '';
  const rawFolder = params.get('folder') || '';
  const mode = (params.get('mode') || 'json').toLowerCase();

  if (!rawFile) {
    sendJson(res, 400, { ok: false, error: 'Thiếu tham số tên file (Missing file parameter)' });
    return;
  }

  const safeFile = validateSafeSegment(rawFile);
  if (!safeFile) {
    sendJson(res, 400, { ok: false, error: 'Tên file chứa ký tự không hợp lệ hoặc path traversal' });
    return;
  }

  let safeFolder: string | null = null;
  if (rawFolder) {
    safeFolder = validateSafeSegment(rawFolder);
    if (!safeFolder) {
      sendJson(res, 400, { ok: false, error: 'Tên thư mục không hợp lệ' });
      return;
    }
  }

  const lowerFile = safeFile.toLowerCase();
  if (!lowerFile.endsWith('.docx') && !lowerFile.endsWith('.doc')) {
    sendJson(res, 400, { ok: false, error: 'Chỉ hỗ trợ xem trực tiếp tài liệu .docx hoặc .doc' });
    return;
  }

  const resolved = resolveSafeDocumentPath(safeFile, ['.docx', '.doc'], safeFolder);
  if (!resolved || !fs.existsSync(resolved.filePath)) {
    sendJson(res, 404, {
      ok: false,
      error: `Không tìm thấy tài liệu Word '${safeFile}' trong kho lưu trữ an toàn`,
    });
    return;
  }

  const ext = path.extname(resolved.filePath).toLowerCase() as '.docx' | '.doc';
  const stat = fs.statSync(resolved.filePath);
  const warnings: string[] = [];
  let engine = 'mammoth-ooxml';
  let degradedMode = false;
  let sanitizedHtml = '';
  let plainText = '';

  try {
    const mammothMod = await import('mammoth');
    const mammoth = (mammothMod.default || mammothMod) as typeof import('mammoth');

    if (ext === '.docx') {
      const buf = fs.readFileSync(resolved.filePath);
      const result = await mammoth.convertToHtml({ buffer: buf });
      sanitizedHtml = sanitizeDocHtml(result.value || '');
      plainText = stripHtmlToPlainText(sanitizedHtml);
      for (const m of result.messages || []) {
        if (m?.message) warnings.push(String(m.message));
      }
    } else {
      // File .doc legacy: ưu tiên đọc bản cache .docx (06_preview_cache), rồi thử Sidecar convert, cuối cùng word-extractor
      const rawBuf = fs.readFileSync(resolved.filePath);
      const sha256 = computeBufferSha256(rawBuf);
      let cachedDocxPath = getPreviewCacheDocxPath(sha256);

      if (!fs.existsSync(cachedDocxPath)) {
        // Thử gọi Sidecar :8008 chuyển đổi .doc -> .docx vào cache nếu đang chạy local
        const isVercel = Boolean(process.env.VERCEL);
        if (!isVercel) {
          try {
            const sidecarBase = process.env.VITE_LOCAL_SCANNER_URL?.replace(/\/api\/local\/?$/i, '') || 'http://127.0.0.1:8008';
            const qs = new URLSearchParams({ file: safeFile, ...(safeFolder ? { folder: safeFolder } : {}) });
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const r = await fetch(`${sidecarBase}/api/local/convert-doc-cache?${qs.toString()}`, {
              signal: controller.signal,
            }).finally(() => clearTimeout(timer));
            if (r.ok) {
              const j = (await r.json()) as { cache_ready?: boolean };
              if (j.cache_ready && fs.existsSync(cachedDocxPath)) {
                // cache ready
              }
            }
          } catch {
            // Sidecar offline -> fallback word-extractor
          }
        }
      }

      if (fs.existsSync(cachedDocxPath)) {
        const cacheBuf = fs.readFileSync(cachedDocxPath);
        const result = await mammoth.convertToHtml({ buffer: cacheBuf });
        sanitizedHtml = sanitizeDocHtml(result.value || '');
        plainText = stripHtmlToPlainText(sanitizedHtml);
        engine = 'doc-cache-mammoth';
      } else {
        const WordExtractorMod = await import('word-extractor');
        const WordExtractor = (WordExtractorMod.default || WordExtractorMod) as unknown as new () => {
          extract: (p: string | Buffer) => Promise<{ getBody: () => string }>;
        };
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(rawBuf);
        const bodyText = (extracted.getBody() || '').trim();
        plainText = bodyText;
        const paras = bodyText
          .split(/\r?\n/)
          .map(ln => ln.trim())
          .filter(Boolean)
          .map(ln => `<p>${escapeHtml(ln)}</p>`)
          .join('\n');
        sanitizedHtml = paras || '<p>(Không trích xuất được nội dung từ tệp .doc)</p>';
        engine = 'word-extractor-fallback';
        degradedMode = true;
        warnings.push(
          'Đang hiển thị bản trích xuất văn bản thuần từ tệp .doc (bản định dạng bảng biểu đầy đủ cần bộ nhớ đệm .docx từ máy trạm).'
        );
      }
    }

    const wrappedHtml = `<article class="vbpl-docx-paper">${sanitizedHtml}</article>`;
    if (mode === 'html') {
      setSecurityHeaders(res);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'"
      );
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.end(buildA4PreviewHtmlDocument(resolved.matchedName, sanitizedHtml));
      return;
    }

    res.setHeader('Cache-Control', 'private, max-age=3600');
    sendJson(res, 200, {
      ok: true,
      fileName: resolved.matchedName,
      folder: safeFolder,
      ext,
      engine,
      degradedMode,
      sizeBytes: stat.size,
      html: wrappedHtml,
      plainText,
      warnings,
    });
  } catch (err) {
    console.error('Lỗi preview Word:', err);
    sendJson(res, 500, { ok: false, error: 'Không thể xử lý nội dung tài liệu Word' });
  }
}

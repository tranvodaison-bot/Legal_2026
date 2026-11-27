import type { ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  getSearchParams,
  resolveSafeDocumentPath,
  validateSafeSegment,
} from '../_lib/documentProxy.js';
import { type NodeRequestWithOptionalBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js';

/**
 * Endpoint stream PDF bảo mật (chuẩn Vercel Serverless & Node http.ServerResponse):
 * - Chặn tuyệt đối tấn công Path Traversal (../, ..\\, /, \)
 * - Ẩn hoàn toàn đường dẫn file vật lý trên Drive
 * - Trả về luồng nhị phân application/pdf với Content-Disposition: inline
 */
export default async function streamPdfHandler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const params = getSearchParams(req);
  const rawFile = params.get('file') || params.get('fileName') || params.get('doc') || '';
  const rawFolder = params.get('folder') || '';

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

  if (!safeFile.toLowerCase().endsWith('.pdf')) {
    sendJson(res, 400, { ok: false, error: 'Chỉ hỗ trợ xem trực tiếp tài liệu PDF' });
    return;
  }

  const resolved = resolveSafeDocumentPath(safeFile, ['.pdf'], safeFolder);
  if (!resolved || !fs.existsSync(resolved.filePath)) {
    sendJson(res, 404, {
      ok: false,
      error: `Không tìm thấy tài liệu PDF '${safeFile}' trong kho lưu trữ an toàn`,
    });
    return;
  }

  try {
    const stat = fs.statSync(resolved.filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(path.basename(resolved.filePath))}"`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(resolved.filePath);
    stream.on('error', err => {
      console.error('Lỗi stream file PDF:', err);
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: 'Lỗi khi truyền dữ liệu tài liệu' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    console.error('Lỗi khi mở file PDF:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: 'Không thể mở tài liệu' });
    }
  }
}

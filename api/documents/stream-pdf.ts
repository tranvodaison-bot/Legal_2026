import type { ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { type NodeRequestWithOptionalBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js';

// Danh mục các thư mục an toàn được phép đọc PDF
const ALLOWED_ROOTS = [
  String.raw`G:\My Drive\02_KNOWLEDGE_LIBRARY\01_Quan_tri_Doanh_nghiep\Phap_che\Data_Legal_2026`,
  path.resolve(process.cwd(), '.local_data', 'vbpl'),
  path.resolve(process.cwd(), 'data'),
  path.resolve(process.cwd(), 'public')
];

/**
 * Trích xuất tiền tố số hiệu từ tên file để tìm kiếm thông minh (ví dụ 206-2026, 135-2025)
 */
function extractDocPrefix(name: string): string {
  const m = name.match(/(\d+[\-_]\d+)/);
  return m ? m[1].replace('_', '-') : '';
}

/**
 * Endpoint stream PDF bảo mật (chuẩn Vercel Serverless & Node http.ServerResponse):
 * - Chặn tuyệt đối tấn công Path Traversal (../, ..\\)
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

  let rawFile = '';
  const expressQuery = (req as { query?: Record<string, string> }).query;
  if (expressQuery && typeof expressQuery === 'object') {
    rawFile = (expressQuery.file || expressQuery.fileName || expressQuery.doc || '') as string;
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1');
      rawFile = parsedUrl.searchParams.get('file') || parsedUrl.searchParams.get('fileName') || parsedUrl.searchParams.get('doc') || '';
    } catch {
      rawFile = '';
    }
  }

  if (!rawFile || typeof rawFile !== 'string') {
    sendJson(res, 400, { ok: false, error: 'Thiếu tham số tên file (Missing file parameter)' });
    return;
  }

  // 1. Path Traversal & Sanitize Guard: Chỉ cho phép tên file hoặc ký tự an toàn
  const normalized = path.normalize(rawFile).replace(/^(\.\.[\/\\])+/, '');
  const basename = path.basename(normalized);

  // Cấm hoàn toàn ký tự nguy hiểm
  if (basename.includes('..') || /[<>:"|?*]/.test(basename)) {
    sendJson(res, 400, { ok: false, error: 'Tên file chứa ký tự không hợp lệ' });
    return;
  }

  // 2. Phải là tệp .pdf
  if (!basename.toLowerCase().endsWith('.pdf')) {
    sendJson(res, 400, { ok: false, error: 'Chỉ hỗ trợ xem trực tiếp tài liệu PDF' });
    return;
  }

  // 3. Tìm kiếm file trong danh sách thư mục an toàn
  let resolvedPath: string | null = null;
  const prefix = extractDocPrefix(basename);

  for (const root of ALLOWED_ROOTS) {
    if (!fs.existsSync(root)) continue;

    // Khớp chính xác
    const candidate = path.join(root, basename);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      resolvedPath = candidate;
      break;
    }

    // Quét toàn bộ thư mục root và thư mục con cấp 1
    try {
      const allFiles: string[] = [];
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          allFiles.push(path.join(root, entry.name));
        } else if (entry.isDirectory()) {
          try {
            const subEntries = fs.readdirSync(path.join(root, entry.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isFile()) {
                allFiles.push(path.join(root, entry.name, sub.name));
              }
            }
          } catch {
            // bỏ qua
          }
        }
      }

      // Khớp theo tên file không phân biệt hoa thường
      const lowerBase = basename.toLowerCase();
      for (const p of allFiles) {
        const pBase = path.basename(p).toLowerCase();
        if (pBase === lowerBase) {
          resolvedPath = p;
          break;
        }
      }
      if (resolvedPath) break;

      // Khớp thông minh theo tiền tố số hiệu (ví dụ "206-2026")
      if (prefix) {
        for (const p of allFiles) {
          const pBase = path.basename(p);
          if (pBase.toLowerCase().endsWith('.pdf') && pBase.includes(prefix)) {
            resolvedPath = p;
            break;
          }
        }
      }
      if (resolvedPath) break;
    } catch {
      // bỏ qua lỗi đọc thư mục
    }
  }

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    sendJson(res, 404, {
      ok: false,
      error: `Không tìm thấy tài liệu PDF '${basename}' trong kho lưu trữ an toàn`
    });
    return;
  }

  // 4. Bảo vệ Stream & Gắn Header an toàn
  try {
    const stat = fs.statSync(resolvedPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(path.basename(resolvedPath))}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const stream = fs.createReadStream(resolvedPath);
    stream.on('error', (err) => {
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

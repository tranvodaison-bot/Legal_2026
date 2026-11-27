import type { ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  getSearchParams,
  resolveSafeSubfolder,
  validateSafeSegment,
} from '../_lib/documentProxy.js';
import { type NodeRequestWithOptionalBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default async function listFormsHandler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const params = getSearchParams(req);
  const rawFolder = params.get('folder') || '';
  if (!rawFolder) {
    sendJson(res, 400, { ok: false, error: 'Thiếu tham số thư mục (folder)' });
    return;
  }

  const safeFolder = validateSafeSegment(rawFolder);
  if (!safeFolder) {
    sendJson(res, 400, { ok: false, error: 'Tên thư mục không hợp lệ hoặc path traversal' });
    return;
  }

  const folderDir = resolveSafeSubfolder(safeFolder);
  if (!folderDir) {
    sendJson(res, 404, { ok: false, error: `Không tìm thấy thư mục '${safeFolder}'` });
    return;
  }

  try {
    const entries = fs.readdirSync(folderDir, { withFileTypes: true });
    const files = entries
      .filter(e => {
        if (!e.isFile() || e.name.startsWith('~$')) return false;
        const lower = e.name.toLowerCase();
        return lower.endsWith('.docx') || lower.endsWith('.doc') || lower.endsWith('.pdf');
      })
      .map(e => {
        const st = fs.statSync(path.join(folderDir, e.name));
        return {
          fileName: e.name,
          ext: path.extname(e.name).toLowerCase(),
          sizeBytes: st.size,
          sizeLabel: formatBytes(st.size),
        };
      })
      .sort((a, b) => a.fileName.localeCompare(b.fileName, 'vi'));

    sendJson(res, 200, {
      ok: true,
      folder: safeFolder,
      total: files.length,
      files,
    });
  } catch (err) {
    console.error('Lỗi liệt kê biểu mẫu:', err);
    sendJson(res, 500, { ok: false, error: 'Không thể đọc danh sách biểu mẫu' });
  }
}

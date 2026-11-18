import type { IncomingMessage, ServerResponse } from 'node:http';

export type NodeRequestWithOptionalBody = IncomingMessage & {
  body?: unknown;
};

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  setSecurityHeaders(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function sendMethodNotAllowed(res: ServerResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, {
    error: `Phương thức HTTP không được hỗ trợ. Chỉ chấp nhận: ${allowed.join(', ')}.`,
  });
}

export function getHeaderString(req: IncomingMessage, name: string): string {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.join(', ');
  return '';
}

export async function readJsonBody(
  req: NodeRequestWithOptionalBody,
  maxBytes = 256 * 1024
): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
        throw new HttpError(
          413,
          'Kích thước dữ liệu gửi lên vượt quá giới hạn an toàn của máy chủ (256KB).'
        );
      }
      if (!req.body.trim()) return null;
      try {
        return JSON.parse(req.body);
      } catch {
        throw new HttpError(400, 'Định dạng JSON đầu vào không hợp lệ.');
      }
    }
    if (Buffer.isBuffer(req.body)) {
      if (req.body.byteLength > maxBytes) {
        throw new HttpError(
          413,
          'Kích thước dữ liệu gửi lên vượt quá giới hạn an toàn của máy chủ (256KB).'
        );
      }
      const text = req.body.toString('utf8');
      if (!text.trim()) return null;
      try {
        return JSON.parse(text);
      } catch {
        throw new HttpError(400, 'Định dạng JSON đầu vào không hợp lệ.');
      }
    }
    return req.body;
  }

  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    let overflowed = false;

    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    };

    const fail = (err: HttpError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onData = (chunk: Buffer | string) => {
      if (settled || overflowed) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');
      totalBytes += buf.byteLength;
      if (totalBytes > maxBytes) {
        overflowed = true;
        chunks.length = 0;
        req.pause();
        fail(
          new HttpError(
            413,
            'Kích thước dữ liệu gửi lên vượt quá giới hạn an toàn của máy chủ (256KB).'
          )
        );
        return;
      }
      chunks.push(buf);
    };

    const onEnd = () => {
      if (settled || overflowed) return;
      settled = true;
      cleanup();
      const rawText = Buffer.concat(chunks).toString('utf8');
      if (!rawText.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(rawText));
      } catch {
        reject(new HttpError(400, 'Định dạng JSON đầu vào không hợp lệ.'));
      }
    };

    const onError = () => {
      if (settled || overflowed) return;
      fail(new HttpError(400, 'Không thể đọc dữ liệu yêu cầu từ client.'));
    };

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import healthHandler from './api/health.js';
import auditLogsHandler from './api/audit-logs.js';
import analyzeLegalHandler from './api/gemini/analyze-legal.js';
import analyzeHandler from './api/gemini/analyze.js';
import compareClausesHandler from './api/gemini/compare-clauses.js';
import verifyRoleHandler from './api/verify-role.js';
import streamPdfHandler from './api/documents/stream-pdf.js';

export type { CanonicalActorRole } from './api/_lib/validation.js';
export type { ServerAuditLog } from './api/_lib/auditStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Giới hạn kích thước payload JSON chống tấn công quá tải (DoS / Payload Flood)
app.use(express.json({ limit: '256kb' }));

// Security Headers cơ bản
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ============================================================================
// API ROUTES (Delegated 1:1 to Vercel Serverless Handlers under `api/`)
// ============================================================================
app.all('/api/health', (req: Request, res: Response, next: NextFunction) => {
  void healthHandler(req, res).catch(next);
});

app.all('/api/audit-logs', (req: Request, res: Response, next: NextFunction) => {
  void auditLogsHandler(req, res).catch(next);
});

app.all('/api/gemini/analyze-legal', (req: Request, res: Response, next: NextFunction) => {
  void analyzeLegalHandler(req, res).catch(next);
});

app.all('/api/gemini/analyze', (req: Request, res: Response, next: NextFunction) => {
  void analyzeHandler(req, res).catch(next);
});

app.all('/api/gemini/compare-clauses', (req: Request, res: Response, next: NextFunction) => {
  void compareClausesHandler(req, res).catch(next);
});

app.all('/api/verify-role', (req: Request, res: Response, next: NextFunction) => {
  void verifyRoleHandler(req, res).catch(next);
});

app.all('/api/documents/stream-pdf', (req: Request, res: Response, next: NextFunction) => {
  void streamPdfHandler(req, res).catch(next);
});

// Middleware xử lý lỗi tập trung (Ẩn hoàn toàn stack trace nội bộ khỏi phản hồi client)
app.use((err: { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({
      error: 'Kích thước dữ liệu gửi lên vượt quá giới hạn an toàn của máy chủ (256KB).',
    });
    return;
  }
  if (err?.type === 'entity.parse.failed' || err?.status === 400) {
    res.status(400).json({
      error: 'Định dạng JSON đầu vào không hợp lệ.',
    });
    return;
  }
  res.status(500).json({
    error: 'Đã xảy ra lỗi nội bộ trên máy chủ. Chi tiết kỹ thuật đã được ẩn để bảo mật.',
  });
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LEX-PMO OS v3.0 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

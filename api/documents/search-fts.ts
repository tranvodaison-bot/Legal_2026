import type { ServerResponse } from 'node:http';
import fs from 'node:fs';
import { getSearchParams, getSqliteWarehousePath } from '../_lib/documentProxy.js';
import { type NodeRequestWithOptionalBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js';

interface SqliteStatementLike {
  all: (...params: Array<string | number>) => Array<Record<string, unknown>>;
}
interface SqliteDatabaseLike {
  prepare: (sql: string) => SqliteStatementLike;
  close: () => void;
}

export default async function searchFtsHandler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const params = getSearchParams(req);
  const query = (params.get('q') || '').trim();
  const limitRaw = Number(params.get('limit') || '30');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 30;
  const domain = (params.get('domain') || '').trim().toUpperCase();
  const docType = (params.get('docType') || '').trim().toUpperCase();

  if (query.length < 1) {
    sendJson(res, 400, { ok: false, error: 'Thiếu từ khóa tìm kiếm (q)' });
    return;
  }

  const tokens = query.match(/[0-9A-Za-zÀ-ỹ]+/gu) || [];
  if (tokens.length === 0) {
    sendJson(res, 200, { ok: true, source: 'sqlite-fts5', query, total_hits: 0, hits: [] });
    return;
  }
  const ftsExpr = tokens.map(t => `"${t}"`).join(' ');

  const dbPath = getSqliteWarehousePath();
  if (fs.existsSync(dbPath)) {
    let db: SqliteDatabaseLike | null = null;
    try {
      const sqliteMod = (await import('node:sqlite')) as unknown as {
        DatabaseSync: new (p: string, opts?: { readOnly?: boolean }) => SqliteDatabaseLike;
      };
      db = new sqliteMod.DatabaseSync(dbPath, { readOnly: true });

      const whereParts = ['fts_vbpl_clauses MATCH ?'];
      const sqlParams: Array<string | number> = [ftsExpr];
      if (domain && domain !== 'ALL') {
        whereParts.push('d.domain_code = ?');
        sqlParams.push(domain);
      }
      if (docType && docType !== 'ALL') {
        whereParts.push('d.doc_type_code = ?');
        sqlParams.push(docType);
      }
      sqlParams.push(limit);

      const cols = db.prepare('PRAGMA table_info(fact_vbpl_documents)').all();
      const colNames = new Set(cols.map(c => String(c.name)));
      const hasSubFolder = colNames.has('sub_folder');

      const sql = `
        SELECT
          f.clause_key,
          f.doc_key,
          f.ssot_file_name,
          d.original_name,
          ${hasSubFolder ? 'd.sub_folder' : "'' AS sub_folder"},
          d.title AS doc_title,
          d.doc_number,
          f.article_number,
          f.title,
          snippet(fts_vbpl_clauses, 5, '【', '】', ' … ', 28) AS snippet,
          c.node_level,
          c.chapter_title,
          d.doc_type_code,
          d.issuer_code,
          d.domain_code,
          d.issue_year,
          d.effect_status
        FROM fts_vbpl_clauses f
        JOIN fact_vbpl_clauses c ON c.clause_key = f.clause_key
        JOIN fact_vbpl_documents d ON d.doc_key = f.doc_key
        WHERE ${whereParts.join(' AND ')}
        ORDER BY bm25(fts_vbpl_clauses)
        LIMIT ?
      `;
      const hits = db.prepare(sql).all(...sqlParams);
      sendJson(res, 200, {
        ok: true,
        source: 'sqlite-fts5',
        query,
        total_hits: hits.length,
        hits,
      });
      return;
    } catch (err) {
      console.warn('node:sqlite FTS5 query fallback:', err);
    } finally {
      if (db) {
        try {
          db.close();
        } catch {
          // ignore
        }
      }
    }
  }

  // Fallback sang Sidecar :8008 nếu chạy local
  if (!process.env.VERCEL) {
    try {
      const sidecarBase =
        process.env.VITE_LOCAL_SCANNER_URL?.replace(/\/api\/local\/?$/i, '') || 'http://127.0.0.1:8008';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const r = await fetch(
        `${sidecarBase}/api/data-foundation/analyst/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        { signal: controller.signal }
      ).finally(() => clearTimeout(timer));
      if (r.ok) {
        const data = (await r.json()) as { total_hits?: number; hits?: unknown[] };
        sendJson(res, 200, {
          ok: true,
          source: 'sidecar-fts5',
          query,
          total_hits: data.total_hits ?? (data.hits?.length || 0),
          hits: data.hits || [],
        });
        return;
      }
    } catch {
      // Sidecar offline
    }
  }

  sendJson(res, 200, {
    ok: true,
    source: 'unavailable',
    query,
    total_hits: 0,
    hits: [],
  });
}

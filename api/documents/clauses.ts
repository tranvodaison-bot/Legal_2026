import type { ServerResponse } from 'node:http';
import fs from 'node:fs';
import { getSearchParams, getSqliteWarehousePath } from '../_lib/documentProxy.js';
import { type NodeRequestWithOptionalBody, sendJson, sendMethodNotAllowed } from '../_lib/http.js';

interface SqliteStatementLike {
  get: (...params: Array<string | number>) => Record<string, unknown> | undefined;
  all: (...params: Array<string | number>) => Array<Record<string, unknown>>;
}
interface SqliteDatabaseLike {
  prepare: (sql: string) => SqliteStatementLike;
  close: () => void;
}

export default async function documentClausesHandler(
  req: NodeRequestWithOptionalBody,
  res: ServerResponse
): Promise<void> {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, ['GET']);
    return;
  }

  const params = getSearchParams(req);
  const key = (params.get('docKey') || params.get('file') || '').trim();
  if (!key) {
    sendJson(res, 400, { ok: false, error: 'Thiếu tham số file hoặc docKey' });
    return;
  }

  const dbPath = getSqliteWarehousePath();
  if (!fs.existsSync(dbPath)) {
    sendJson(res, 200, { ok: true, found: false, source: 'unavailable', clauses: [] });
    return;
  }

  let db: SqliteDatabaseLike | null = null;
  try {
    const sqliteMod = (await import('node:sqlite')) as unknown as {
      DatabaseSync: new (p: string, opts?: { readOnly?: boolean }) => SqliteDatabaseLike;
    };
    db = new sqliteMod.DatabaseSync(dbPath, { readOnly: true });

    const doc = db
      .prepare(
        `SELECT doc_key, ssot_file_name, original_name, doc_number, title
         FROM fact_vbpl_documents
         WHERE doc_key = ? OR ssot_file_name = ? OR original_name = ?
         LIMIT 1`
      )
      .get(key, key, key);

    if (!doc) {
      sendJson(res, 200, { ok: true, found: false, source: 'sqlite-fts5', clauses: [] });
      return;
    }

    const clauses = db
      .prepare(
        `SELECT clause_key AS id, node_level AS level, article_number AS code,
                title, content_text AS content, clause_count AS clauseCount
         FROM fact_vbpl_clauses
         WHERE doc_key = ?
         ORDER BY order_index ASC`
      )
      .all(String(doc.doc_key));

    sendJson(res, 200, {
      ok: true,
      found: true,
      source: 'sqlite-fts5',
      doc,
      total: clauses.length,
      clauses,
    });
  } catch (err) {
    console.warn('Lỗi đọc điều khoản từ SQLite:', err);
    sendJson(res, 200, { ok: true, found: false, source: 'error', clauses: [] });
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

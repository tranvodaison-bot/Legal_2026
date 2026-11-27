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
  const docKey = (params.get('docKey') || '').trim();
  const ssotFile = (params.get('file') || '').trim();
  const rawFile = (params.get('rawFile') || '').trim();
  const docNumber = (params.get('docNumber') || '').trim();
  if (!docKey && !ssotFile && !rawFile && !docNumber) {
    sendJson(res, 400, { ok: false, error: 'Thiếu tham số file, rawFile, docNumber hoặc docKey' });
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

    const candidates: Array<{ col: string; val: string; weight: number }> = [];
    if (docKey) candidates.push({ col: 'doc_key', val: docKey, weight: 1 });
    if (ssotFile) {
      candidates.push({ col: 'ssot_file_name', val: ssotFile, weight: 2 });
      candidates.push({ col: 'original_name', val: ssotFile, weight: 3 });
      candidates.push({ col: 'doc_key', val: ssotFile, weight: 4 });
    }
    if (rawFile) {
      candidates.push({ col: 'original_name', val: rawFile, weight: 2 });
      candidates.push({ col: 'ssot_file_name', val: rawFile, weight: 3 });
    }
    if (docNumber && docNumber !== '01') {
      candidates.push({ col: 'doc_number', val: docNumber, weight: 5 });
    }

    let doc: Record<string, unknown> | undefined;
    const seen = new Set<string>();
    candidates.sort((a, b) => a.weight - b.weight);
    for (const c of candidates) {
      const cacheK = `${c.col}:${c.val.toLowerCase()}`;
      if (seen.has(cacheK)) continue;
      seen.add(cacheK);
      doc = db
        .prepare(
          `SELECT doc_key, ssot_file_name, original_name, doc_number, title,
                  source_type, total_pages, article_count, clause_count
           FROM fact_vbpl_documents
           WHERE LOWER(${c.col}) = LOWER(?)
           LIMIT 1`
        )
        .get(c.val);
      if (doc) break;
    }

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

    let activeDoc = doc;
    let activeClauses = clauses;
    let totalChars = activeClauses.reduce((sum, cl) => sum + String(cl.content || '').length, 0);

    // Nếu bản ghi gốc là PDF hỏng/rỗng, tự động fallback sang bản lành cùng số hiệu trong kho SQLite
    const isCorruptOrEmpty =
      String(activeDoc.source_type || '').toUpperCase().includes('CORRUPT') ||
      activeClauses.length === 0 ||
      totalChars < 120;
    const matchedDocNum = String(activeDoc.doc_number || '').trim();
    if (isCorruptOrEmpty && matchedDocNum && matchedDocNum !== '01') {
      const healthySibling = db
        .prepare(
          `SELECT doc_key, ssot_file_name, original_name, doc_number, title,
                  source_type, total_pages, article_count, clause_count
           FROM fact_vbpl_documents
           WHERE LOWER(doc_number) = LOWER(?)
             AND doc_key <> ?
             AND UPPER(COALESCE(source_type, '')) NOT LIKE '%CORRUPT%'
           ORDER BY clause_count DESC, article_count DESC, total_pages DESC
           LIMIT 1`
        )
        .get(matchedDocNum, String(activeDoc.doc_key));

      if (healthySibling) {
        const siblingClauses = db
          .prepare(
            `SELECT clause_key AS id, node_level AS level, article_number AS code,
                    title, content_text AS content, clause_count AS clauseCount
             FROM fact_vbpl_clauses
             WHERE doc_key = ?
             ORDER BY order_index ASC`
          )
          .all(String(healthySibling.doc_key));
        const siblingChars = siblingClauses.reduce(
          (sum, cl) => sum + String(cl.content || '').length,
          0
        );
        if (siblingChars > totalChars) {
          activeDoc = healthySibling;
          activeClauses = siblingClauses;
          totalChars = siblingChars;
        }
      }
    }

    sendJson(res, 200, {
      ok: true,
      found: activeClauses.length > 0,
      source: 'sqlite-fts5',
      doc: activeDoc,
      total: activeClauses.length,
      clauses: activeClauses,
      meta: {
        sourceType: String(activeDoc.source_type || 'SQLITE'),
        totalPages: Number(activeDoc.total_pages || 1),
        articleCount: Number(activeDoc.article_count || 0),
        clauseCount: Number(activeDoc.clause_count || 0),
        totalChars,
        originalName: String(activeDoc.original_name || ''),
        isVerbatimComplete: activeClauses.length > 0 && totalChars >= 200,
      },
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

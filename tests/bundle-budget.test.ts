import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_ASSETS_DIR = path.join(REPO_ROOT, 'dist', 'assets');
const MAX_CHUNK_BYTES = 500 * 1024; // 500 KB budget

test('Production bundle keeps main index chunk and all JS chunks under 500 KB', () => {
  assert.ok(
    fs.existsSync(DIST_ASSETS_DIR),
    `Expected build output directory at ${DIST_ASSETS_DIR} — run "npm run build" first`
  );

  const jsFiles = fs
    .readdirSync(DIST_ASSETS_DIR)
    .filter(name => name.endsWith('.js'))
    .map(name => ({
      name,
      bytes: fs.statSync(path.join(DIST_ASSETS_DIR, name)).size,
    }));

  assert.ok(jsFiles.length >= 2, 'Expected code-split multiple JS chunks in dist/assets');

  const mainChunks = jsFiles.filter(f => /^index-[^/\\]+\.js$/i.test(f.name));
  assert.equal(mainChunks.length, 1, `Expected 1 main index-*.js chunk, found ${mainChunks.length}`);

  const mainChunk = mainChunks[0];
  assert.ok(
    mainChunk.bytes < MAX_CHUNK_BYTES,
    `Main chunk ${mainChunk.name} is ${(mainChunk.bytes / 1024).toFixed(1)} KB (limit 500 KB)`
  );

  const oversized = jsFiles.filter(f => f.bytes >= MAX_CHUNK_BYTES);
  assert.equal(
    oversized.length,
    0,
    `Oversized JS chunks (>= 500 KB): ${oversized
      .map(f => `${f.name} (${(f.bytes / 1024).toFixed(1)} KB)`)
      .join(', ')}`
  );
});

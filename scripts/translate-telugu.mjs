#!/usr/bin/env node

/**
 * Builds the Telugu content stored in assets/db/gita.db.
 *
 * English remains the source of truth in `shlokas`. This script writes the
 * translated fields into `telugu_translations` and `telugu_commentaries`.
 * It is resumable: an existing row is skipped when its source hash matches.
 *
 * Usage:
 *   SARVAM_API_KEY=... npm run translate:telugu
 *   SARVAM_API_KEY=... npm run translate:telugu -- --limit=5
 *   npm run translate:telugu -- --dry-run --limit=5
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'assets', 'db', 'gita.db');
const API_URL = 'https://api.sarvam.ai/translate';
const MAX_INPUT_CHARS = 1000; // mayura:v1 limit

function loadLocalEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/u);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/gu, '');
  }
}

loadLocalEnv();
const API_KEY = process.env.SARVAM_API_KEY;

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const overwrite = args.has('--overwrite');
const limitArg = [...args].find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity;

if ((limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1))) {
  throw new Error('--limit must be a positive integer.');
}
if (!dryRun && !API_KEY) {
  throw new Error('SARVAM_API_KEY is required. Put it in your shell environment; do not commit it.');
}

function sqliteJson(query) {
  const output = execFileSync('sqlite3', ['-json', DB_PATH, query], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  return JSON.parse(output || '[]');
}

function sqliteExec(query) {
  execFileSync('sqlite3', [DB_PATH], { input: query, encoding: 'utf8' });
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function createTables() {
  sqliteExec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS telugu_translations(
      shloka_id INTEGER PRIMARY KEY,
      chapter_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      translation TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      sarvam_request_id TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (shloka_id) REFERENCES shlokas(id)
    );
    CREATE TABLE IF NOT EXISTS telugu_commentaries(
      shloka_id INTEGER PRIMARY KEY,
      chapter_number INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      commentary TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      sarvam_request_id TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (shloka_id) REFERENCES shlokas(id)
    );
  `);
}

// Split on natural boundaries before using a word-boundary fallback. Whitespace
// is retained so paragraphs do not run together after chunk results are joined.
function splitText(text, maxLength = MAX_INPUT_CHARS) {
  if (text.length <= maxLength) return [text];
  const parts = text.split(/(?<=\n\s*\n)|(?<=[.!?])\s+/u);
  const chunks = [];
  let current = '';

  const add = (part) => {
    if ((current + part).length <= maxLength) {
      current += part;
      return;
    }
    if (current) chunks.push(current);
    current = part;
  };

  for (const part of parts) {
    if (part.length <= maxLength) {
      add(part);
      continue;
    }

    const words = part.match(/\S+\s*/gu) ?? [part];
    for (const word of words) {
      if (word.length > maxLength) {
        if (current) chunks.push(current);
        for (let index = 0; index < word.length; index += maxLength) {
          chunks.push(word.slice(index, index + maxLength));
        }
        current = '';
      } else {
        add(word);
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translate(input) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': API_KEY,
        },
        body: JSON.stringify({
          input,
          source_language_code: 'en-IN',
          target_language_code: 'te-IN',
          model: 'mayura:v1',
          numerals_format: 'native',
          mode: 'formal',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && typeof body.translated_text === 'string') return body;

      const retryable = response.status === 429 || response.status >= 500;
      lastError = new Error(`Sarvam returned ${response.status}: ${body.message ?? body.detail ?? 'translation failed'}`);
      if (!retryable) throw lastError;
    } catch (error) {
      lastError = error;
      if (attempt === 4) break;
    }
    await sleep(1000 * 2 ** attempt);
  }
  throw lastError;
}

function upsert(table, column, row, content, requestId) {
  const now = Date.now();
  sqliteExec(`
    INSERT INTO ${table} (
      shloka_id, chapter_number, verse_number, ${column}, source_hash, sarvam_request_id, updated_at
    ) VALUES (
      ${row.id}, ${row.chapter_number}, ${row.verse_number}, ${sqlString(content)},
      ${sqlString(hash(row.source))}, ${requestId ? sqlString(requestId) : 'NULL'}, ${now}
    )
    ON CONFLICT(shloka_id) DO UPDATE SET
      chapter_number = excluded.chapter_number,
      verse_number = excluded.verse_number,
      ${column} = excluded.${column},
      source_hash = excluded.source_hash,
      sarvam_request_id = excluded.sarvam_request_id,
      updated_at = excluded.updated_at;
  `);
}

async function processField({ table, column, sourceColumn, label }) {
  const sqlLimit = limit === Infinity ? '' : `LIMIT ${limit}`;
  const rows = sqliteJson(`
    SELECT s.id, s.chapter_number, s.verse_number, s.${sourceColumn} AS source,
           t.source_hash AS existing_hash
    FROM shlokas s
    LEFT JOIN ${table} t ON t.shloka_id = s.id
    WHERE s.${sourceColumn} IS NOT NULL AND trim(s.${sourceColumn}) <> ''
    ORDER BY s.chapter_number, s.verse_number
    ${sqlLimit};
  `);

  let completed = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!overwrite && row.existing_hash === hash(row.source)) {
      skipped += 1;
      continue;
    }
    const chunks = splitText(row.source);
    if (dryRun) {
      console.log(`[dry-run] ${label} ${row.chapter_number}.${row.verse_number}: ${chunks.length} request(s)`);
      completed += 1;
      continue;
    }

    const responses = [];
    for (const chunk of chunks) {
      responses.push(await translate(chunk));
    }
    const result = responses.map((response) => response.translated_text).join(' ');
    upsert(table, column, row, result, responses.at(-1)?.request_id ?? null);
    completed += 1;
    console.log(`${label} ${row.chapter_number}.${row.verse_number} (${completed}/${rows.length - skipped})`);
  }
  console.log(`${label}: ${completed} written, ${skipped} unchanged.`);
}

createTables();
await processField({
  table: 'telugu_translations',
  column: 'translation',
  sourceColumn: 'translation_2',
  label: 'Translation',
});
await processField({
  table: 'telugu_commentaries',
  column: 'commentary',
  sourceColumn: 'commentary',
  label: 'Commentary',
});

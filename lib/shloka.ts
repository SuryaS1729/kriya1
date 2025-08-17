// lib/shloka.ts
import { getDb } from './db';
import { daysSinceEpoch } from './date';
import { isDbReady } from './dbReady';

const TABLE = 'shlokas';

export type ShlokaRow = {
  chapter_number: number;
  verse_number: number;
  text: string;               // Sanskrit
  transliteration: string | null;
  word_meanings: string | null;
  description: string | null; // short description / summary
  translation_2: string | null; // English translation
  commentary: string | null;
};

// Small card VM (no DB id). If you want the global index on cards,
// compute it where you render via getIndexOf(ch, v).
export type ShlokaForCard = {
  chapter: number;
  verse: number;
  sa: string;
  en: string;
};

/** Total shlokas (0 if DB not ready). */
export function getTotalShlokas(): number {
  if (!isDbReady()) return 0;
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM ${TABLE}`) as { c: number } | null;
  return row?.c ?? 0;
}

/** Deterministic base index for a date (rotate daily). */
export function baseIndexForToday(date = new Date()): number {
  const total = getTotalShlokas();
  if (total === 0) return 0;
  return daysSinceEpoch(date) % total;
}

/** Get the Nth shloka in canonical order (0-based). */
export function getShlokaAt(index: number): ShlokaRow | null {
  if (!isDbReady()) return null;
  const db = getDb();
  return db.getFirstSync(
    `
    SELECT
      chapter_number,
      verse_number,
      text,
      transliteration,
      word_meanings,
      description,
      translation_2,
      commentary
    FROM ${TABLE}
    ORDER BY chapter_number ASC, verse_number ASC
    LIMIT 1 OFFSET ?
    `,
    [index]
  ) as ShlokaRow | null;
}

/** Map a row into the small card VM. */
export function toCard(row: ShlokaRow): ShlokaForCard {
  return {
    chapter: row.chapter_number,
    verse: row.verse_number,
    sa: row.text,
    en: row.translation_2 ?? row.description ?? '',
  };
}

/** Zero-based global index for (chapter, verse). */
export function getIndexOf(chapter: number, verse: number): number {
  if (!isDbReady()) return 0;
  const db = getDb();
  const r = db.getFirstSync(
    `
    SELECT COUNT(*) AS idx
    FROM ${TABLE}
    WHERE chapter_number < ?
       OR (chapter_number = ? AND verse_number <= ?)
    `,
    [chapter, chapter, verse]
  ) as { idx: number } | null;
  const idx = (r?.idx ?? 1) - 1;
  return Math.max(0, idx);
}

/** Prev/next indices around a given index. */
export function getPrevNextIndices(index: number, total: number) {
  return {
    prevIndex: index > 0 ? index - 1 : null,
    nextIndex: index + 1 < total ? index + 1 : null,
  };
}

/** Chapter counts for the reader. */
export function getChapterCounts(): { chapter: number; verses: number }[] {
  if (!isDbReady()) return [];
  const db = getDb();
  return db.getAllSync<{ chapter: number; verses: number }>(
    `
    SELECT chapter_number AS chapter, COUNT(*) AS verses
    FROM ${TABLE}
    GROUP BY chapter_number
    ORDER BY chapter_number ASC
    `
  );
}

/** Verses for a chapter (no id column). */
export function getVersesForChapter(chapter: number): {
  verse_number: number; text: string; translation_2: string | null; description: string | null;
}[] {
  if (!isDbReady()) return [];
  const db = getDb();
  return db.getAllSync(
    `
    SELECT verse_number, text, translation_2, description
    FROM ${TABLE}
    WHERE chapter_number = ?
    ORDER BY verse_number ASC
    `,
    [chapter]
  ) as {
    verse_number: number; text: string; translation_2: string | null; description: string | null;
  }[];
}

/** Fetch by (chapter, verse). */
export function getShlokaByChapterVerse(chapter: number, verse: number): ShlokaRow | null {
  if (!isDbReady()) return null;
  const db = getDb();
  return db.getFirstSync(
    `
    SELECT
      chapter_number,
      verse_number,
      text,
      transliteration,
      word_meanings,
      description,
      translation_2,
      commentary
    FROM ${TABLE}
    WHERE chapter_number = ? AND verse_number = ?
    LIMIT 1
    `,
    [chapter, verse]
  ) as ShlokaRow | null;
}

/** Simple LIKE search across Sanskrit + translation (no id). */
export function searchShlokasLike(query: string): {
  chapter_number: number; verse_number: number; text: string; translation_2: string | null; description: string | null;
}[] {
  if (!isDbReady()) return [];
  const db = getDb();
  const q = `%${query}%`;
  return db.getAllSync(
    `
    SELECT chapter_number, verse_number, text, translation_2, description
    FROM ${TABLE}
    WHERE text LIKE ? OR translation_2 LIKE ? OR description LIKE ?
    ORDER BY chapter_number ASC, verse_number ASC
    LIMIT 100
    `,
    [q, q, q]
  ) as {
    chapter_number: number; verse_number: number; text: string; translation_2: string | null; description: string | null;
  }[];
}

/** Prev/next indices from a given (chapter, verse). */
export function getPrevNextIndicesFromChapterVerse(
  chapter: number,
  verse: number
): { prevIndex: number | null; nextIndex: number | null } {
  const total = getTotalShlokas();
  if (total === 0) return { prevIndex: null, nextIndex: null };
  const idx = getIndexOf(chapter, verse);
  return getPrevNextIndices(idx, total);
}

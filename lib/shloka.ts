// lib/shloka.ts
import { db } from './db';
import { daysSinceEpoch } from './date';

/**
 * If your table name isn't "shlokas", change this constant.
 * The ORDER BY below is your canonical order (chapter → verse).
 */
const TABLE = 'shlokas';

export type ShlokaRow = {
  id: number;
  chapter_number: number;
  verse_number: number;
  text: string;              // Sanskrit
  transliteration: string | null;
  word_meanings: string | null;
  description: string | null; // short description / summary
  translation_2: string | null; // English translation
  commentary: string | null;
};

// Minimal shape used by the card (you can use ShlokaRow directly if you prefer)
export type ShlokaForCard = {
  id: number;
  chapter: number;
  verse: number;
  sa: string;
  en: string;
};

export function getTotalShlokas(): number {
  const row = db.getFirstSync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${TABLE}`
  );
  return row?.total ?? 0;
}

/**
 * Deterministic “daily base” index from date.
 * Use this with (base + completedToday) % total to pick the active shloka.
 */
export function baseIndexForToday(date = new Date()): number {
  const total = getTotalShlokas();
  if (total === 0) return 0;
  return daysSinceEpoch(date) % total;
}

/** Get the Nth shloka in canonical order (0‑based). */
export function getShlokaAt(index: number): ShlokaRow {
  const row = db.getFirstSync<ShlokaRow>(
    `
    SELECT
      id,
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
  );
  if (!row) throw new Error(`Shloka not found at index ${index}`);
  return row;
}

/** Convenience: fetch by primary key id. */
export function getShlokaById(id: number): ShlokaRow | undefined {
  return db.getFirstSync<ShlokaRow>(
    `
    SELECT
      id,
      chapter_number,
      verse_number,
      text,
      transliteration,
      word_meanings,
      description,
      translation_2,
      commentary
    FROM ${TABLE}
    WHERE id = ?
    `,
    [id]
  ) ?? undefined;
}

/** Map a full row into the small card view model. */
export function toCard(row: ShlokaRow): ShlokaForCard {
  return {
    id: row.id,
    chapter: row.chapter_number,
    verse: row.verse_number,
    sa: row.text,
    en: row.translation_2 ?? row.description ?? '', // fallback if translation_2 is null
  };
}

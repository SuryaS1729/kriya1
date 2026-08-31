// lib/translationService.ts
// Indian-language translation layer backed by JSON files hosted on R2.
//
// This layer is deliberately isolated from the SQLite shloka system:
//   * SQLite stays the source of truth for shlokas + English content.
//   * R2 JSON files (one per language) hold only Indian-language translations.
//   * Downloads are explicitly initiated from the Settings page (app/history.tsx);
//     this service never downloads implicitly.
//   * Reads are served from a local file once a language is downloaded.

import * as FileSystem from 'expo-file-system/legacy';
import { PUBLIC_ASSET_BASE_URL } from './publicAssetBaseUrl';

export type TranslationLanguageCode = 'gu' | 'hi' | 'or' | 'ta' | 'te';

/** English is not an R2 translation file — it is the SQLite/fallback language. */
export type ShlokaDisplayLanguage = 'en' | TranslationLanguageCode;

export interface TranslationLanguage {
  code: TranslationLanguageCode;
  name: string;
  file: string;
  fontFamily?: string;
}

/**
 * Central language configuration. The R2 URL is derived from `file`, so UI
 * components never hold R2 URLs or filesystem paths.
 */
export const TRANSLATION_LANGUAGES: Record<TranslationLanguageCode, TranslationLanguage> = {
  gu: { code: 'gu', name: 'Gujarati', file: 'bhagavad_gita_gu.json', fontFamily: 'NTR' },
  hi: { code: 'hi', name: 'Hindi', file: 'bhagavad_gita_hi.json', fontFamily: 'NTR' },
  or: { code: 'or', name: 'Odia', file: 'bhagavad_gita_or.json', fontFamily: 'NTR' },
  ta: { code: 'ta', name: 'Tamil', file: 'bhagavad_gita_ta.json', fontFamily: 'NTR' },
  te: { code: 'te', name: 'Telugu', file: 'bhagavad_gita_te.json', fontFamily: 'NTR' },
};

export const TRANSLATION_LANGUAGE_LIST: TranslationLanguage[] = [
  TRANSLATION_LANGUAGES.gu,
  TRANSLATION_LANGUAGES.hi,
  TRANSLATION_LANGUAGES.or,
  TRANSLATION_LANGUAGES.ta,
  TRANSLATION_LANGUAGES.te,
];

export function isTranslationLanguageCode(code: string): code is TranslationLanguageCode {
  return code in TRANSLATION_LANGUAGES;
}

interface TranslationEntry {
  chapter: number;
  verse: number;
  translation: string;
  commentary?: string;
}

// Downloaded files live in documentDirectory so they survive cache eviction
// and keep working offline. The settings page manages these files.
const TRANSLATIONS_DIR = `${FileSystem.documentDirectory}translations/`;

function filePathForLang(lang: TranslationLanguageCode): string {
  return `${TRANSLATIONS_DIR}${TRANSLATION_LANGUAGES[lang].file}`;
}

function translationFileUrl(lang: TranslationLanguageCode): string {
  return `${PUBLIC_ASSET_BASE_URL}/translations/${TRANSLATION_LANGUAGES[lang].file}`;
}

async function ensureTranslationsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(TRANSLATIONS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TRANSLATIONS_DIR, { intermediates: true });
  }
}

/** True if the language's JSON file exists locally. */
export async function isTranslationDownloaded(lang: TranslationLanguageCode): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(filePathForLang(lang));
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Download a language's translation JSON from R2 and store it locally.
 * Explicitly called from the Settings page only.
 */
export async function downloadTranslation(lang: TranslationLanguageCode): Promise<void> {
  const url = translationFileUrl(lang);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`Network error while downloading ${TRANSLATION_LANGUAGES[lang].name}: ${String(err)}`);
  }
  if (!response.ok) {
    throw new Error(`Download failed (HTTP ${response.status}) for ${TRANSLATION_LANGUAGES[lang].name}.`);
  }

  const raw = await response.text();
  // Validate the JSON before persisting so a corrupt/hostile payload never
  // lands on disk as a "downloaded" language.
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Downloaded file for ${TRANSLATION_LANGUAGES[lang].name} is not a valid translations file.`);
  }

  await ensureTranslationsDir();
  await FileSystem.writeAsStringAsync(filePathForLang(lang), raw);
}

/** Remove a downloaded language's local file. Safe to call when absent. */
export async function removeTranslation(lang: TranslationLanguageCode): Promise<void> {
  await FileSystem.deleteAsync(filePathForLang(lang), { idempotent: true });
}

// Per-language in-memory map: chapter.verse -> { translation, commentary }.
// Kept so repeated reads across shlokas don't re-parse the JSON file every time.
interface TranslationContent {
  translation: string | null;
  commentary: string | null;
}

const cachedEntries = new Map<TranslationLanguageCode, Map<string, TranslationContent>>();

function cacheKey(chapter: number, verse: number): string {
  return `${chapter}.${verse}`;
}

/**
 * Load the local JSON for a language into memory. Returns null when the
 * language is not downloaded or the file is missing/corrupt.
 */
async function loadLanguageFile(lang: TranslationLanguageCode): Promise<Map<string, TranslationContent> | null> {
  const cached = cachedEntries.get(lang);
  if (cached) return cached;

  let raw: string;
  try {
    const info = await FileSystem.getInfoAsync(filePathForLang(lang));
    if (!info.exists) return null;
    raw = await FileSystem.readAsStringAsync(filePathForLang(lang));
  } catch (err) {
    console.warn(`[Translations] Failed to read local file for ${lang}:`, err);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`[Translations] Corrupt JSON for ${lang}:`, err);
    cachedEntries.delete(lang);
    return null;
  }

  if (!Array.isArray(parsed)) {
    console.warn(`[Translations] Unexpected structure for ${lang}`);
    cachedEntries.delete(lang);
    return null;
  }

  const map = new Map<string, TranslationContent>();
  for (const item of parsed as TranslationEntry[]) {
    if (
      item &&
      typeof item.chapter === 'number' &&
      typeof item.verse === 'number'
    ) {
      map.set(cacheKey(item.chapter, item.verse), {
        translation:
          typeof item.translation === 'string' && item.translation.trim().length > 0
            ? item.translation
            : null,
        commentary:
          typeof item.commentary === 'string' && item.commentary.trim().length > 0
            ? item.commentary
            : null,
      });
    }
  }

  cachedEntries.set(lang, map);
  return map;
}

/**
 * Look up the translation for a shloka in the given language.
 *
 * @returns the translation text, or null when the language is not downloaded
 *          or the verse is missing. Never throws.
 */
export async function getTranslation(
  chapter: number,
  verse: number,
  lang: TranslationLanguageCode
): Promise<string | null> {
  try {
    const map = await loadLanguageFile(lang);
    if (!map) return null;
    return map.get(cacheKey(chapter, verse))?.translation ?? null;
  } catch (err) {
    console.warn(`[Translations] Lookup failed for ${lang} ${chapter}.${verse}:`, err);
    return null;
  }
}

/**
 * Look up the commentary for a shloka in the given language.
 *
 * @returns the commentary text, or null when the language is not downloaded
 *          or the verse has no commentary in that language. Never throws.
 */
export async function getCommentary(
  chapter: number,
  verse: number,
  lang: TranslationLanguageCode
): Promise<string | null> {
  try {
    const map = await loadLanguageFile(lang);
    if (!map) return null;
    return map.get(cacheKey(chapter, verse))?.commentary ?? null;
  } catch (err) {
    console.warn(`[Translations] Commentary lookup failed for ${lang} ${chapter}.${verse}:`, err);
    return null;
  }
}

/**
 * Drop the in-memory cache for a language (used after download/remove so the
 * next read sees the fresh file).
 */
export function invalidateTranslationCache(lang: TranslationLanguageCode): void {
  cachedEntries.delete(lang);
}

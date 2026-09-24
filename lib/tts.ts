// lib/tts.ts
// Text-to-Speech backed by device cache + Cloudflare R2 recordings

import * as FileSystem from 'expo-file-system/legacy';
import { fromByteArray } from 'base64-js';
import { PUBLIC_ASSET_BASE_URL } from './publicAssetBaseUrl';

export type TTSLanguage = 'hi-IN' | 'en-IN';

// --------------- Voiceover (translation + commentary) per display language ---------------
// The shloka recitation is identical across languages; only this voiceover
// switches with the translate-button language. English (`en-IN-m4a`) is the
// default fallback — add a new folder here as you upload each language and
// the player picks it up automatically, falling back to English until then.
export type VoiceoverLanguage = 'en' | 'gu' | 'hi' | 'kn' | 'ml' | 'mr' | 'or' | 'ta' | 'te';

const VOICEOVER_FOLDERS: Record<VoiceoverLanguage, string> = {
  en: 'en-IN-m4a',
  hi: 'hi-IN-m4a',
  gu: 'gu-IN-m4a',
  kn: 'kn-IN-m4a',
  ml: 'ml-IN-m4a',
  mr: 'mr-IN-m4a',
  or: 'or-IN-m4a',
  ta: 'ta-IN-m4a',
  te: 'te-IN-m4a',
};

function getVoiceoverCacheKey(lang: VoiceoverLanguage, chapter: number, verse: number): string {
  return `${CACHE_DIR}voiceover_${lang}_${chapter}_${verse}.m4a`;
}

// --------------- Device cache helpers ---------------

const CACHE_DIR = `${FileSystem.cacheDirectory}tts/`;

async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function getCacheKey(language: TTSLanguage, chapter: number, verse: number): string {
  return `${CACHE_DIR}${language}_${chapter}_${verse}.m4a`;
}

async function getFromDeviceCache(cacheKey: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(cacheKey);
    if (info.exists) {
      const base64 = await FileSystem.readAsStringAsync(cacheKey, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
  } catch {
    // Cache miss, continue
  }
  return null;
}

async function saveToDeviceCache(cacheKey: string, base64Audio: string): Promise<void> {
  try {
    await ensureCacheDir();
    await FileSystem.writeAsStringAsync(cacheKey, base64Audio, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (err) {
    console.warn('[TTS] Failed to cache audio:', err);
  }
}

// --------------- R2 fetch ---------------

async function fetchFromR2(
  folder: string,
  chapter: number,
  verse: number
): Promise<string | null> {
  const url = `${PUBLIC_ASSET_BASE_URL}/${folder}/${chapter}_${verse}.m4a`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    // Read the audio as bytes and base64-encode them directly, avoiding the
    // slow `response.blob()` copy through React Native's blob store.
    const buffer = await response.arrayBuffer();
    return fromByteArray(new Uint8Array(buffer));
  } catch (err) {
    console.warn('[TTS] R2 fetch failed:', err);
    return null;
  }
}

// --------------- Public API ---------------

/**
 * Load pre-generated speech audio with device caching.
 */
export async function textToSpeech(
  _text: string,
  language: TTSLanguage,
  chapter: number,
  verse: number
): Promise<string | null> {
  const cacheKey = getCacheKey(language, chapter, verse);
  const logName = `${language}/${chapter}_${verse}`;

  const cached = await getFromDeviceCache(cacheKey);
  if (cached) {
    console.log(`[TTS] Device cache hit: ${logName}`);
    return cached;
  }

  const r2Audio = await fetchFromR2(`${language}-m4a`, chapter, verse);
  if (r2Audio) {
    console.log(`[TTS] R2 hit: ${logName}`);
    await saveToDeviceCache(cacheKey, r2Audio);
    return r2Audio;
  }

  console.warn(`[TTS] Missing recording in R2: ${logName}`);
  return null;
}

/**
 * Load the translation/commentary voiceover for a display language.
 *
 * Tries the language's own R2 folder first, then falls back to the English
 * recording (`en-IN-m4a`) so playback keeps working until you upload audio
 * for that language. Returns the audio plus which language actually played.
 */
export async function voiceoverAudio(
  displayLang: VoiceoverLanguage,
  chapter: number,
  verse: number
): Promise<{ audio: string; lang: VoiceoverLanguage } | null> {
  const attempts: VoiceoverLanguage[] =
    displayLang === 'en' ? ['en'] : [displayLang, 'en'];

  for (const lang of attempts) {
    const cacheKey = getVoiceoverCacheKey(lang, chapter, verse);
    const cached = await getFromDeviceCache(cacheKey);
    if (cached) {
      console.log(`[TTS] Device cache hit: voiceover_${lang}/${chapter}_${verse}`);
      return { audio: cached, lang };
    }

    const r2Audio = await fetchFromR2(VOICEOVER_FOLDERS[lang], chapter, verse);
    if (r2Audio) {
      console.log(`[TTS] R2 hit: voiceover_${lang}/${chapter}_${verse}`);
      await saveToDeviceCache(cacheKey, r2Audio);
      return { audio: r2Audio, lang };
    }
  }

  console.warn(`[TTS] Missing voiceover in R2: ${displayLang}/${chapter}_${verse} (English fallback also missing)`);
  return null;
}

// --------------- Shloka recitation (authentic Sanskrit only) ---------------

const RECITATION_FOLDER = 'authentic_sanskrit_m4a';

function getRecitationCacheKey(chapter: number, verse: number): string {
  return `${CACHE_DIR}recitation_sanskrit_${chapter}_${verse}.m4a`;
}

/**
 * Load the authentic Sanskrit shloka recitation audio from R2, with device caching.
 */
export async function shlokaRecitation(
  chapter: number,
  verse: number
): Promise<string | null> {
  const cacheKey = getRecitationCacheKey(chapter, verse);
  const logName = `sanskrit/${chapter}_${verse}`;

  const cached = await getFromDeviceCache(cacheKey);
  if (cached) {
    console.log(`[TTS] Device cache hit: ${logName}`);
    return cached;
  }

  const r2Audio = await fetchFromR2(RECITATION_FOLDER, chapter, verse);
  if (r2Audio) {
    console.log(`[TTS] R2 hit: ${logName}`);
    await saveToDeviceCache(cacheKey, r2Audio);
    return r2Audio;
  }

  console.warn(`[TTS] Missing recitation in R2: ${logName}`);
  return null;
}

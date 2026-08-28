// lib/tts.ts
// Text-to-Speech backed by device cache + Cloudflare R2 recordings

import * as FileSystem from 'expo-file-system/legacy';
import { fromByteArray } from 'base64-js';
import { PUBLIC_ASSET_BASE_URL } from './publicAssetBaseUrl';

export type TTSLanguage = 'hi-IN' | 'en-IN';

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

export type RecitationStyle = 'hindi' | 'sanskrit';

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

// --------------- Shloka recitation (Hindi TTS or authentic Sanskrit) ---------------

const RECITATION_FOLDERS: Record<RecitationStyle, string> = {
  hindi: 'hi-IN-m4a',
  sanskrit: 'authentic_sanskrit_m4a',
};

function getRecitationCacheKey(style: RecitationStyle, chapter: number, verse: number): string {
  return `${CACHE_DIR}recitation_${style}_${chapter}_${verse}.m4a`;
}

/**
 * Load the shloka recitation audio (Hindi TTS or authentic Sanskrit
 * recordings from R2), with device caching.
 */
export async function shlokaRecitation(
  style: RecitationStyle,
  chapter: number,
  verse: number
): Promise<string | null> {
  const cacheKey = getRecitationCacheKey(style, chapter, verse);
  const logName = `${style}/${chapter}_${verse}`;

  const cached = await getFromDeviceCache(cacheKey);
  if (cached) {
    console.log(`[TTS] Device cache hit: ${logName}`);
    return cached;
  }

  const r2Audio = await fetchFromR2(RECITATION_FOLDERS[style], chapter, verse);
  if (r2Audio) {
    console.log(`[TTS] R2 hit: ${logName}`);
    await saveToDeviceCache(cacheKey, r2Audio);
    return r2Audio;
  }

  console.warn(`[TTS] Missing recitation in R2: ${logName}`);
  return null;
}

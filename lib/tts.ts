// lib/tts.ts
// Text-to-Speech backed by device cache + Cloudflare R2 recordings

import * as FileSystem from 'expo-file-system/legacy';

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
  return `${CACHE_DIR}${language}_${chapter}_${verse}.wav`;
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
  language: TTSLanguage,
  chapter: number,
  verse: number
): Promise<string | null> {
  const r2BaseUrl = process.env.EXPO_PUBLIC_R2_TTS_URL;
  if (!r2BaseUrl) return null;

  const url = `${r2BaseUrl}/${language}/${chapter}_${verse}.wav`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Strip the data:audio/wav;base64, prefix
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
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

  const r2Audio = await fetchFromR2(language, chapter, verse);
  if (r2Audio) {
    console.log(`[TTS] R2 hit: ${logName}`);
    await saveToDeviceCache(cacheKey, r2Audio);
    return r2Audio;
  }

  console.warn(`[TTS] Missing recording in R2: ${logName}`);
  return null;
}

// lib/tts.ts
// Text-to-Speech with Cloudflare R2 caching + Sarvam AI fallback

import * as FileSystem from 'expo-file-system';

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';

export type TTSLanguage = 'hi-IN' | 'en-IN';

interface TTSRequest {
  text: string;
  target_language_code: TTSLanguage;
  speaker: string;
  model: string;
  pace?: number;
  temperature?: number;
  speech_sample_rate?: string;
}

interface TTSResponse {
  request_id: string;
  audios: string[]; // Base64-encoded audio strings
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

// --------------- Sarvam API (fallback) ---------------

async function callSarvamAPI(
  text: string,
  language: TTSLanguage
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[TTS] Sarvam API key not configured. Please add it to .env');
    return null;
  }

  const truncatedText = text.slice(0, 2500);
  const pace = language === 'hi-IN' ? 0.95 : 1.1;

  const requestBody: TTSRequest = {
    text: truncatedText,
    target_language_code: language,
    speaker: 'aditya',
    model: 'bulbul:v3',
    pace,
    temperature: 0.6,
    speech_sample_rate: '24000',
  };

  try {
    const response = await fetch(SARVAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] API error ${response.status}:`, errorText);
      return null;
    }

    const data: TTSResponse = await response.json();

    if (data.audios && data.audios.length > 0) {
      return data.audios[0];
    }

    console.error('[TTS] No audio in response');
    return null;
  } catch (error) {
    console.error('[TTS] Network error:', error);
    return null;
  }
}

// --------------- Public API ---------------

/**
 * Convert text to speech with caching.
 *
 * When `chapter` and `verse` are provided, uses the optimized path:
 *   1. Device cache (instant)
 *   2. Cloudflare R2 (fast CDN)
 *   3. Sarvam API (fallback)
 *
 * Without chapter/verse, calls Sarvam directly (backward compatible).
 */
export async function textToSpeech(
  text: string,
  language: TTSLanguage,
  chapter?: number,
  verse?: number
): Promise<string | null> {
  // If chapter/verse provided, use cache → R2 → Sarvam flow
  if (chapter != null && verse != null) {
    const cacheKey = getCacheKey(language, chapter, verse);
    const logName = `${language}/${chapter}_${verse}`;

    // 1. Check device cache
    const cached = await getFromDeviceCache(cacheKey);
    if (cached) {
      console.log(`[TTS] Device cache hit: ${logName}`);
      return cached;
    }

    // 2. Try R2
    const r2Audio = await fetchFromR2(language, chapter, verse);
    if (r2Audio) {
      console.log(`[TTS] R2 hit: ${logName}`);
      await saveToDeviceCache(cacheKey, r2Audio);
      return r2Audio;
    }

    // 3. Fallback to Sarvam
    console.log(`[TTS] Sarvam fallback: ${logName}`);
    const sarvamAudio = await callSarvamAPI(text, language);
    if (sarvamAudio) {
      await saveToDeviceCache(cacheKey, sarvamAudio);
    }
    return sarvamAudio;
  }

  // No chapter/verse — direct Sarvam call (backward compatible)
  return callSarvamAPI(text, language);
}

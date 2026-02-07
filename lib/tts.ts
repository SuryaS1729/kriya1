// lib/tts.ts
// Sarvam AI Text-to-Speech service

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

/**
 * Convert text to speech using Sarvam AI's TTS API
 * @param text - Text to convert to speech (max 2500 chars for bulbul:v3)
 * @param language - Language code: 'hi-IN' for Hindi, 'en-IN' for English
 * @returns Base64-encoded audio string or null on error
 */
export async function textToSpeech(
  text: string,
  language: TTSLanguage
): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_SARVAM_API_KEY;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('[TTS] Sarvam API key not configured. Please add it to .env');
    return null;
  }

  // Truncate if too long (bulbul:v3 max is 2500 chars)
  const truncatedText = text.slice(0, 2500);

  // Slower pace for Hindi (Sanskrit shlokas), normal for English
  const pace = language === 'hi-IN' ? 0.95 : 1.05;

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

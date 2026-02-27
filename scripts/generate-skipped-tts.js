#!/usr/bin/env node
// scripts/generate-skipped-tts.js
// Generate TTS for skipped shlokas by condensing commentary via Gemini,
// then sending to Sarvam TTS and uploading to R2.
//
// Usage:
//   export $(grep -v '^#' .env | xargs) && SARVAM_API_KEY=$EXPO_PUBLIC_SARVAM_API_KEY node scripts/generate-skipped-tts.js

const Database = require('better-sqlite3');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

// --------------- Config ---------------

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kriya';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SARVAM_API_KEY) { console.error('Missing SARVAM_API_KEY'); process.exit(1); }
if (!GEMINI_API_KEY) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 credentials'); process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --------------- Helpers ---------------

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch { return false; }
}

async function uploadToR2(key, audioBuffer) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME, Key: key, Body: audioBuffer, ContentType: 'audio/wav',
  }));
}

async function callSarvamTTS(text, language) {
  const pace = language === 'hi-IN' ? 0.95 : 1.1;
  const res = await fetch(SARVAM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': SARVAM_API_KEY },
    body: JSON.stringify({
      text,
      target_language_code: language,
      speaker: 'aditya',
      model: 'bulbul:v3',
      pace,
      temperature: 0.6,
      speech_sample_rate: '24000',
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sarvam API ${res.status}: ${errText}`);
  }
  const data = await res.json();
  if (!data.audios || data.audios.length === 0) throw new Error('No audio in Sarvam response');
  return Buffer.from(data.audios[0], 'base64');
}

async function condenseWithGemini(commentary, maxChars) {
  const prompt = `You are condensing a Bhagavad Gita commentary for text-to-speech narration.

Condense the following commentary to fit within ${maxChars} characters. Rules:
- Preserve the key spiritual insights and core explanations
- Keep the tone scholarly and respectful
- Do NOT add any new information or interpretation
- Do NOT include any formatting, markdown, or special characters
- Write in plain English prose suitable for being read aloud
- The output MUST be under ${maxChars} characters

Commentary to condense:
${commentary}`;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });

  const condensed = response.text.trim();

  // Safety check: if still too long, truncate at last sentence boundary
  if (condensed.length > maxChars) {
    const truncated = condensed.slice(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    return lastPeriod > maxChars * 0.5 ? truncated.slice(0, lastPeriod + 1) : truncated;
  }

  return condensed;
}

async function processWithRetry(fn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  Retry ${attempt}/${retries}: ${err.message}`);
      await sleep(2000 * attempt);
    }
  }
}

// --------------- Main ---------------

async function main() {
  const dbPath = path.resolve(__dirname, '..', 'assets', 'db', 'gita.db');
  const db = new Database(dbPath, { readonly: true });

  // Parse the skipped shlokas file
  const skippedFile = path.resolve(__dirname, 'skipped_shlokas.txt');
  const skippedLines = fs.readFileSync(skippedFile, 'utf-8')
    .split('\n')
    .filter(line => line.match(/^Ch\d+/));

  const skippedShlokas = skippedLines.map(line => {
    const match = line.match(/Ch(\d+) V(\d+)/);
    return match ? { ch: parseInt(match[1]), v: parseInt(match[2]) } : null;
  }).filter(Boolean);

  console.log(`Found ${skippedShlokas.length} skipped shlokas to process.\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (const { ch, v } of skippedShlokas) {
    const label = `Ch${ch} V${v}`;
    const enKey = `en-IN/${ch}_${v}.wav`;

    // Skip if already exists in R2
    if (await existsInR2(enKey)) {
      console.log(`[${label}] Already in R2, skipping`);
      skipped++;
      continue;
    }

    // Get the shloka from DB
    const shloka = db.prepare(
      'SELECT translation_2, description, commentary FROM shlokas WHERE chapter_number = ? AND verse_number = ?'
    ).get(ch, v);

    if (!shloka) {
      console.log(`[${label}] ⚠ Not found in DB, skipping`);
      continue;
    }

    const translation = shloka.translation_2 || shloka.description || '';
    const commentary = shloka.commentary || '';

    // Calculate how much space we have for commentary
    // Format: "Translation. {translation} ... Commentary. {condensed}"
    // Labels + spacing = ~30 chars, leave buffer
    const translationPart = translation ? `Translation. ${translation}` : '';
    const maxCommentaryChars = 2400 - translationPart.length - 30; // 30 chars for " ... Commentary. " label

    if (maxCommentaryChars < 200) {
      // Translation alone is too long — just send translation
      console.log(`[${label}] Translation alone is ${translationPart.length} chars, sending without commentary`);
      try {
        await processWithRetry(async () => {
          const audio = await callSarvamTTS(translationPart.slice(0, 2500), 'en-IN');
          await uploadToR2(enKey, audio);
          console.log(`[${label}] ✓ Uploaded ${enKey} (translation only, ${(audio.length / 1024).toFixed(0)} KB)`);
        });
        await sleep(500);
      } catch (err) {
        console.error(`[${label}] ✗ Failed: ${err.message}`);
        failures.push(label);
        failed++;
      }
      processed++;
      continue;
    }

    try {
      // Condense commentary with Gemini
      console.log(`[${label}] Condensing commentary (${commentary.length} → max ${maxCommentaryChars} chars)...`);

      const condensed = await processWithRetry(() =>
        condenseWithGemini(commentary, maxCommentaryChars)
      );

      console.log(`[${label}] Condensed to ${condensed.length} chars`);

      // Build merged text
      let mergedText = translationPart;
      if (condensed) mergedText += ` ... Commentary. ${condensed}`;

      console.log(`[${label}] Merged text: ${mergedText.length} chars`);

      if (mergedText.length > 2500) {
        // Still too long — truncate at sentence boundary
        console.log(`[${label}] ⚠ Still ${mergedText.length} chars, truncating to 2500`);
        mergedText = mergedText.slice(0, 2500);
        const lastPeriod = mergedText.lastIndexOf('.');
        if (lastPeriod > 2000) mergedText = mergedText.slice(0, lastPeriod + 1);
      }

      // Generate TTS
      await processWithRetry(async () => {
        console.log(`[${label}] Generating TTS (${mergedText.length} chars)...`);
        const audio = await callSarvamTTS(mergedText, 'en-IN');
        await uploadToR2(enKey, audio);
        console.log(`[${label}] ✓ Uploaded ${enKey} (${(audio.length / 1024).toFixed(0)} KB)`);
      });

      await sleep(500);
    } catch (err) {
      console.error(`[${label}] ✗ Failed: ${err.message}`);
      failures.push(label);
      failed++;
    }

    processed++;
    if (processed % 20 === 0) {
      console.log(`\n--- Progress: ${processed}/${skippedShlokas.length} ---\n`);
    }
  }

  db.close();
  console.log(`\n✅ Done! ${processed} processed, ${skipped} already in R2, ${failed} failed.`);
  if (failures.length > 0) {
    console.log(`⚠ Failed shlokas: ${failures.join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

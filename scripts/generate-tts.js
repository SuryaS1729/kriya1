#!/usr/bin/env node
// scripts/generate-tts.js
// One-time batch script: generate TTS audio for all shlokas and upload to Cloudflare R2.
//
// Prerequisites:
//   npm install better-sqlite3 @aws-sdk/client-s3
//
// Usage:
//   source .env && SARVAM_API_KEY=$EXPO_PUBLIC_SARVAM_API_KEY node scripts/generate-tts.js
//
// The script is resumable: it skips any file that already exists in R2.
// Shlokas with English text > 2500 chars are skipped and logged to skipped_shlokas.txt.

const Database = require('better-sqlite3');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

// --------------- Config ---------------

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kriya';

if (!SARVAM_API_KEY) {
  console.error('Missing SARVAM_API_KEY env var');
  process.exit(1);
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// --------------- Helpers ---------------

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2(key, audioBuffer) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/wav',
    })
  );
}

async function callSarvamTTS(text, language) {
  const pace = language === 'hi-IN' ? 0.95 : 1.1;

  const res = await fetch(SARVAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': SARVAM_API_KEY,
    },
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
  if (!data.audios || data.audios.length === 0) {
    throw new Error('No audio in Sarvam response');
  }

  return Buffer.from(data.audios[0], 'base64');
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

  const shlokas = db.prepare(`
    SELECT chapter_number, verse_number, text, translation_2, description, commentary
    FROM shlokas
    ORDER BY chapter_number ASC, verse_number ASC
  `).all();

  console.log(`Found ${shlokas.length} shlokas. Starting TTS generation...\n`);

  const skippedFile = path.resolve(__dirname, 'skipped_shlokas.txt');
  fs.writeFileSync(skippedFile, '# Shlokas skipped because English text > 2500 chars\n# Generate these manually and upload to R2 as en-IN/<ch>_<v>.wav\n\n');

  let processed = 0;
  let skipped = 0;
  let tooLong = 0;

  for (const shloka of shlokas) {
    const { chapter_number: ch, verse_number: v, text, translation_2, description, commentary } = shloka;
    const label = `Ch${ch} V${v}`;

    // ---- 1. Hindi shloka ----
    const hiKey = `hi-IN/${ch}_${v}.wav`;
    if (await existsInR2(hiKey)) {
      skipped++;
    } else {
      await processWithRetry(async () => {
        console.log(`[${label}] Generating Hindi...`);
        const audio = await callSarvamTTS(text, 'hi-IN');
        await uploadToR2(hiKey, audio);
        console.log(`[${label}] ✓ Uploaded ${hiKey} (${(audio.length / 1024).toFixed(0)} KB)`);
      });
      await sleep(500);
    }

    // ---- 2. English (translation + commentary merged) ----
    const enKey = `en-IN/${ch}_${v}.wav`;
    if (await existsInR2(enKey)) {
      skipped++;
    } else {
      const translation = translation_2 || description || '';
      let englishText = '';
      if (translation) englishText += `Translation. ${translation}`;
      if (commentary) englishText += ` ... Commentary. ${commentary}`;

      if (!englishText) {
        console.log(`[${label}] ⚠ No English text, skipping`);
      } else if (englishText.length > 2500) {
        // Too long — skip and log
        tooLong++;
        const logLine = `Ch${ch} V${v} — ${englishText.length} chars\n`;
        fs.appendFileSync(skippedFile, logLine);
        console.log(`[${label}] ⏭ SKIPPED (${englishText.length} chars > 2500) — logged to skipped_shlokas.txt`);
      } else {
        await processWithRetry(async () => {
          console.log(`[${label}] Generating English (${englishText.length} chars)...`);
          const audio = await callSarvamTTS(englishText, 'en-IN');
          await uploadToR2(enKey, audio);
          console.log(`[${label}] ✓ Uploaded ${enKey} (${(audio.length / 1024).toFixed(0)} KB)`);
        });
        await sleep(500);
      }
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`\n--- Progress: ${processed}/${shlokas.length} processed, ${skipped} cached, ${tooLong} too long ---\n`);
    }
  }

  db.close();
  console.log(`\n✅ Done! ${processed} shlokas processed, ${skipped} already in R2, ${tooLong} skipped (too long).`);
  if (tooLong > 0) {
    console.log(`📝 See scripts/skipped_shlokas.txt for the list of skipped shlokas.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

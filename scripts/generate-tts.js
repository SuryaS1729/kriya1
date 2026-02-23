#!/usr/bin/env node
// scripts/generate-tts.js
// One-time batch script: generate TTS audio for all shlokas and upload to Cloudflare R2.
//
// Prerequisites:
//   npm install better-sqlite3 @aws-sdk/client-s3
//
// Usage:
//   SARVAM_API_KEY=sk_xxx R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx R2_BUCKET_NAME=xxx node scripts/generate-tts.js
//
// The script is resumable: it skips any file that already exists in R2.
// Use --force-english to re-generate all English files (e.g. after fixing truncation).
const FORCE_ENGLISH = process.argv.includes('--force-english');

const Database = require('better-sqlite3');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// --------------- Config ---------------

const SARVAM_API_URL = 'https://api.sarvam.ai/text-to-speech';
const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kriya-tts';

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
      text: text.slice(0, 2500),
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
      await sleep(2000 * attempt); // Backoff: 2s, 4s, 6s
    }
  }
}

// --------------- Main ---------------

async function main() {
  // Open the SQLite DB
  const dbPath = path.resolve(__dirname, '..', 'assets', 'db', 'gita.db');
  const db = new Database(dbPath, { readonly: true });

  const shlokas = db.prepare(`
    SELECT chapter_number, verse_number, text, translation_2, description, commentary
    FROM shlokas
    ORDER BY chapter_number ASC, verse_number ASC
  `).all();

  console.log(`Found ${shlokas.length} shlokas. Starting TTS generation...\n`);

  let processed = 0;
  let skipped = 0;

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
      // Rate limit: small delay between API calls
      await sleep(500);
    }

    // ---- 2. English audio ----
    const translation = translation_2 || description || '';
    let translationText = translation ? `Translation. ${translation}` : '';
    let commentaryText = commentary ? `Commentary. ${commentary}` : '';
    const mergedText = translationText + (commentaryText ? ` ... ${commentaryText}` : '');

    const enKey = `en-IN/${ch}_${v}.wav`;
    const commentaryKey = `en-IN/${ch}_${v}_commentary.wav`;

    if (mergedText.length <= 2500) {
      // Merged text fits in one call
      if (!FORCE_ENGLISH && await existsInR2(enKey)) {
        skipped++;
      } else if (mergedText) {
        await processWithRetry(async () => {
          console.log(`[${label}] Generating English merged (${mergedText.length} chars)...`);
          const audio = await callSarvamTTS(mergedText, 'en-IN');
          await uploadToR2(enKey, audio);
          console.log(`[${label}] ✓ Uploaded ${enKey} (${(audio.length / 1024).toFixed(0)} KB)`);
        });
        await sleep(500);
      }
    } else {
      // Text too long — split into separate translation and commentary files
      console.log(`[${label}] ⚠ Merged text ${mergedText.length} chars > 2500, splitting...`);

      // Translation file
      if (translationText) {
        if (!FORCE_ENGLISH && await existsInR2(enKey)) {
          // Check if this was a truncated merged file — re-upload if commentary key doesn't exist
          const commentaryExists = await existsInR2(commentaryKey);
          if (!commentaryExists && commentaryText) {
            // Previously uploaded as truncated merged — re-upload as translation only
            await processWithRetry(async () => {
              console.log(`[${label}] Re-uploading translation only (${translationText.length} chars)...`);
              const audio = await callSarvamTTS(translationText, 'en-IN');
              await uploadToR2(enKey, audio);
              console.log(`[${label}] ✓ Re-uploaded ${enKey} (${(audio.length / 1024).toFixed(0)} KB)`);
            });
            await sleep(500);
          } else {
            skipped++;
          }
        } else {
          await processWithRetry(async () => {
            console.log(`[${label}] Generating translation (${translationText.length} chars)...`);
            const audio = await callSarvamTTS(translationText, 'en-IN');
            await uploadToR2(enKey, audio);
            console.log(`[${label}] ✓ Uploaded ${enKey} (${(audio.length / 1024).toFixed(0)} KB)`);
          });
          await sleep(500);
        }
      }

      // Commentary file (separate)
      if (commentaryText) {
        if (!FORCE_ENGLISH && await existsInR2(commentaryKey)) {
          skipped++;
        } else {
          await processWithRetry(async () => {
            console.log(`[${label}] Generating commentary (${commentaryText.length} chars)...`);
            const audio = await callSarvamTTS(commentaryText, 'en-IN');
            await uploadToR2(commentaryKey, audio);
            console.log(`[${label}] ✓ Uploaded ${commentaryKey} (${(audio.length / 1024).toFixed(0)} KB)`);
          });
          await sleep(500);
        }
      }
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`\n--- Progress: ${processed}/${shlokas.length} processed, ${skipped} skipped ---\n`);
    }
  }

  db.close();
  console.log(`\n✅ Done! ${processed} shlokas processed, ${skipped} files skipped (already in R2).`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

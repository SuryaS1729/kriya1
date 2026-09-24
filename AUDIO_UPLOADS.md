# Audio Upload Reference (TTS / Voiceover on R2)

How the play button works (`app/shloka/[id].tsx` → `lib/tts.ts`).

## 1. Playback flow

Pressing play on a shloka page plays **two files back-to-back**:

1. **Shloka recitation (Sanskrit, always the same)** — `shlokaRecitation(ch, vs)`
2. **Voiceover (translation + commentary, follows the translate-button language)** — `voiceoverAudio(voiceLang, ch, vs)`

`voiceLang` is decided in `app/shloka/[id].tsx`:

```ts
hasDownloadedText = translationLanguage !== 'en'
  && downloadedTranslations.includes(translationLanguage)
  && (translationText != null || commentaryText != null)
voiceLang = hasDownloadedText ? translationLanguage : 'en'
```

So the voiceover only switches away from English if the user **downloaded that language's JSON pack** (My Journey) and the verse has translation/commentary text.

## 2. Fallback (gradual uploads are safe)

`voiceoverAudio()` tries `[requestedLang, 'en']` per verse:

> device cache → R2 folder for requested lang → device cache → R2 folder for English → silent

Consequences:

- A missing verse in any language **auto-plays English**. Upload one language / one verse at a time; nothing breaks.
- Fallback is **per-verse**: `te/2_47` missing falls back while `te/2_48` uploaded plays.
- No code change is needed when you upload — just put the file in the right folder with the right name.

## 3. Where to upload (R2)

Base URL (`lib/publicAssetBaseUrl.ts`):

```
https://kriyarecordings.bitwisedharma.com
```

URL pattern (`lib/tts.ts`):

```
{BASE}/{folder}/{chapter}_{verse}.m4a
```

| Display language | R2 folder | Example (Gita 2.47) |
|---|---|---|
| `en` (English) | `en-IN-m4a` | `.../en-IN-m4a/2_47.m4a` |
| `hi` (Hindi) | `hi-IN-m4a` | `.../hi-IN-m4a/2_47.m4a` |
| `gu` (Gujarati) | `gu-IN-m4a` | `.../gu-IN-m4a/2_47.m4a` |
| `kn` (Kannada) | `kn-IN-m4a` | `.../kn-IN-m4a/2_47.m4a` |
| `ml` (Malayalam) | `ml-IN-m4a` | `.../ml-IN-m4a/2_47.m4a` |
| `mr` (Marathi) | `mr-IN-m4a` | `.../mr-IN-m4a/2_47.m4a` |
| `or` (Odia) | `or-IN-m4a` | `.../or-IN-m4a/2_47.m4a` |
| `ta` (Tamil) | `ta-IN-m4a` | `.../ta-IN-m4a/2_47.m4a` |
| `te` (Telugu) | `te-IN-m4a` | `.../te-IN-m4a/2_47.m4a` |

Shloka recitation (already done, don't touch per language):

```
.../authentic_sanskrit_m4a/{chapter}_{verse}.m4a
```

> Historical note: Hindi voiceover used to live in `hi-translation-m4a` to avoid colliding
> with the old `hi-IN-m4a` recitation files. Those recitations are deleted and nothing reads
> them (`textToSpeech()` in `lib/tts.ts` is dead code), so Hindi now uses `hi-IN-m4a` like
> every other language. Do **not** upload to `hi-translation-m4a` anymore.

## 4. File naming + format

- **Filename:** `{chapter_number}_{verse_number}.m4a` — raw numbers, **no zero-padding**.
  `chapter_number` / `verse_number` from SQLite/JSON (e.g. `1_1.m4a`, `2_47.m4a`, `18_78.m4a`),
  not the 0-based route index. Case-sensitive.
- **Container/codec:** `.m4a` (AAC in MP4). Must stay `.m4a` — the player writes a temp
  `tts_audio_*.m4a` file and cache keys hardcode the extension.
- Keep encoding settings consistent across languages (same sample rate / bitrate family as the English set) so loudness and playback behavior match.

## 5. What to record in each file

Each **voiceover** file = spoken **Translation + Commentary in that language only**:

```
"Translation. {translation text} ... Commentary. {commentary text}"
```

- Do **not** include the shloka — `authentic_sanskrit_m4a` plays first automatically.
- If a verse has no commentary, the file is just the translation.
- Record in the same order the app displays: translation first, then commentary.

## 6. Upload checklist (per batch)

1. Files named exactly `{ch}_{vs}.m4a`, in the language's folder from the table above.
2. `Content-Type: audio/mp4` (or `audio/x-m4a`) on R2.
3. Bucket / custom domain publicly readable — verify with curl before shipping:
   ```sh
   curl -sI https://kriyarecordings.bitwisedharma.com/te-IN-m4a/2_47.m4a
   # expect: HTTP/2 200 + content-type: audio/mp4
   ```
4. Spot-check one verse in-app with that translation language downloaded: should play the new language, not English.
5. Spot-check a verse you have **not** uploaded yet: should fall back to English.

## 7. Cache note

- Device cache keys are `tts/voiceover_{lang}_{ch}_{vs}.m4a` (folder name is not in the key).
- First-time uploads: no action needed; a cache miss fetches the new R2 file once, then plays offline.
- **Re-recordings:** users who already cached a verse keep the stale file. If you fix a recording, either bump/rename or plan an in-app cache invalidation — re-uploading under the same name won't reach cached devices.

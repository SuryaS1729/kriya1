## Kriya — R2 Indian-Language Translation Layer

Implement an isolated Indian-language translation system for Kriya using JSON files hosted on Cloudflare R2.

### 1. Core architecture

Do **not** add Indian-language translations to SQLite.

Keep the architecture:

* **SQLite** → Sanskrit shlokas, existing English translations, metadata, and all existing Gita/shloka data.
* **R2 JSON files** → Indian-language translations.
* **Local device filesystem/cache** → downloaded translation JSON files.
* **Translation service** → isolated layer that reads the local JSON and provides translations to `/shloka/[id].tsx`.

The existing SQLite schema and all existing Gita/shloka update/synchronization logic must remain untouched.

### 2. R2 translation files

The translation files are hosted at:

```text
https://kriyarecordings.bitwisedharma.com/translations/bhagavad_gita_{lang}.json
```

The `{lang}` code is:

```text
gu = Gujarati
hi = Hindi
or = Odia
ta = Tamil
te = Telugu
```

Therefore:

```text
https://kriyarecordings.bitwisedharma.com/translations/bhagavad_gita_gu.json
https://kriyarecordings.bitwisedharma.com/translations/bhagavad_gita_hi.json
https://kriyarecordings.bitwisedharma.com/translations/bhagavad_gita_or.json
https://kriyarecordings.bitwisedharma.com/translations/bhagavad_gita_ta.json
https://kriyarecordings.bitwisedharma.com/translations/bhagavad_gita_te.json
```

Do not hardcode five separate download implementations. Define a language configuration/map and construct the URL from the language code.

### 3. JSON format

The JSON files use this structure:

```json
[
  {
    "chapter": 1,
    "verse": 1,
    "translation": "...",
    "commentary": "..."
  },
  {
    "chapter": 1,
    "verse": 2,
    "translation": "...",
    "commentary": "..."
  }
]
```

The file is an array of objects.

Each object contains:

* `chapter`
* `verse`
* `translation`
* `commentary`

For the Kriya translation layer, **only the `translation` field is required**.

Do not display or integrate the `commentary` field unless explicitly requested later.

The lookup key should be based on:

```text
chapter + verse
```

or whatever chapter/verse identifiers are already available from the existing SQLite shloka record.

**Do not change the existing SQLite schema merely to accommodate this.**

### 4. Settings page

Modify:

```text
/history.tsx
```

to include a **Translations / Languages** section.

Show the available languages:

```text
Gujarati
Hindi
Odia
Tamil
Telugu
```

Each language should have an appropriate action:

```text
Gujarati
[Download]
```

After download:

```text
Gujarati
Downloaded ✓
[Remove]
```

The Settings page is responsible only for managing the translation files.

It must NOT:

* modify SQLite
* trigger Gita database updates
* modify the existing shloka update process
* modify synchronization logic
* automatically update Gita content

### 5. Local caching

When a user downloads a language:

```text
R2
 ↓
download JSON
 ↓
save to local device filesystem/cache
```

Subsequent reads should use the local file.

Do not download the same JSON repeatedly.

The user should be able to remove a downloaded language.

Handle:

* download failures
* missing files
* corrupt files
* malformed JSON
* filesystem errors

without affecting the rest of the application.

### 6. Translation service

Create a dedicated translation service, following the project's existing architecture.

For example:

```text
translationService.ts
```

It should expose a simple interface such as:

```ts
getTranslation(chapter, verse, language)
```

The exact API can follow the existing codebase conventions.

The UI should not contain R2 URLs, filesystem logic, JSON parsing logic, or caching logic.

The service handles:

```text
language
   ↓
local cached JSON?
   ↓
yes → read local file
no  → translation unavailable
```

Downloading should be explicitly initiated from the Settings page.

### 7. STRICT isolation from SQLite

This is extremely important.

The translation system must **not modify the existing SQLite system**.

Do NOT:

* add translation columns
* add translation tables
* modify migrations
* write translations into SQLite
* modify the Gita database schema
* modify Gita update logic
* modify Gita synchronization logic
* modify shloka insertion/update logic
* trigger database updates when translations are downloaded
* trigger translation downloads when the database is updated

The translation JSON is an entirely separate content layer.

The only relationship between SQLite and translations should be the existing shloka's `chapter`/`verse` identity being used to locate the corresponding translation.

### 8. Where translation functionality is consumed

The translation display functionality must **only be triggered from:**

```text
/shloka/[id].tsx
```

Do not integrate the translation service into the general SQLite/shloka data layer.

Do not modify the existing shloka loading mechanism.

Conceptually:

```text
/shloka/[id].tsx
        │
        ├── Existing SQLite logic
        │       ↓
        │   Get shloka
        │
        └── Translation service
                ↓
          Get selected language
                ↓
          Read local JSON
                ↓
          Find chapter + verse
                ↓
          Return translation
```

The existing shloka continues to come from SQLite exactly as it does today.

### 9. Important distinction about Settings

There are two separate responsibilities:

**`/history.tsx`**

```text
Download/remove translation JSON files
```

**`/shloka/[id].tsx`**

```text
Read/display a downloaded translation
```

The Settings page should NOT cause translations to be inserted into SQLite.

The Settings page should NOT directly modify the shloka UI.

The shloka page should simply consume the translation service when it needs to display a translation.

### 10. Language configuration

Create a central configuration similar to:

```ts
const TRANSLATION_LANGUAGES = {
  gu: {
    name: 'Gujarati',
    file: 'bhagavad_gita_gu.json',
  },
  hi: {
    name: 'Hindi',
    file: 'bhagavad_gita_hi.json',
  },
  or: {
    name: 'Odia',
    file: 'bhagavad_gita_or.json',
  },
  ta: {
    name: 'Tamil',
    file: 'bhagavad_gita_ta.json',
  },
  te: {
    name: 'Telugu',
    file: 'bhagavad_gita_te.json',
  },
};
```

Construct the R2 URL from this configuration rather than duplicating URLs throughout the app.

The base URL is:

```text
https://kriyarecordings.bitwisedharma.com/translations/
```

### 11. Offline behavior

After a language has been downloaded, `/shloka/[id].tsx` must be able to display its translation offline.

If the user has not downloaded the selected language, fail gracefully.

Do not automatically download it from the shloka page unless I explicitly ask for that behavior later.

For example:

```text
Translation not downloaded
        ↓
Do not make network request
        ↓
Show appropriate fallback
```

### 12. Existing application behavior

Preserve all existing functionality.

Before modifying anything:

1. Inspect the current `/history.tsx`.
2. Inspect `/shloka/[id].tsx`.
3. Inspect the existing SQLite/data layer.
4. Inspect the existing R2/audio asset infrastructure.
5. Identify the existing app language/settings mechanism.
6. Reuse existing filesystem/cache utilities where appropriate.

Make the smallest possible change surface.

### 13. Acceptance criteria

The implementation is complete when:

1. Gujarati, Hindi, Odia, Tamil, and Telugu appear as downloadable translation languages.
2. Each language maps to the correct R2 JSON file.
3. Translation JSON is downloaded only when explicitly requested from `/history.tsx`.
4. Downloaded files are cached locally.
5. Users can remove downloaded translation files.
6. `/shloka/[id].tsx` can read and display the selected translation.
7. Translation lookup uses the existing chapter/verse identity.
8. Only the `translation` field is displayed.
9. `commentary` is ignored for now.
10. SQLite is completely unchanged.
11. Existing Gita update/synchronization logic is completely unchanged.
12. Existing shloka loading logic is completely unchanged.
13. Translation downloads never trigger database updates.
14. Database updates never trigger translation downloads.
15. The translation layer is isolated from the rest of the data layer.
16. A downloaded translation works offline.
17. Missing/corrupt/unavailable translations fail gracefully.
18. No R2 URLs or filesystem logic are scattered throughout UI components.

**Important:** Do not make assumptions about unrelated parts of the application. Inspect the existing implementation first and integrate this translation layer with the smallest possible changes.

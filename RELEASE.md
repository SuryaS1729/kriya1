# Release builds (local)

Commit everything first — EAS builds from git, uncommitted changes are left out.
Bump `"version"` in `app.json` for each store release; the build number (versionCode / buildNumber) is auto-incremented by EAS.

## Android (.aab for Play Store)

```bash
npx eas-cli@latest build -p android --profile production --local
```

Output: `build-<timestamp>.aab` in the project root. Upload it in Play Console → Production → Create new release.

## iOS (.ipa for App Store)

```bash
npx eas-cli@latest build -p ios --profile production --local
```

Output: `build-<timestamp>.ipa` in the project root. Upload with Transporter, or:

```bash
npx eas-cli@latest submit -p ios --path build-<timestamp>.ipa
```

Tip: add `--output ~/Desktop/kriya-<version>.aab` (or `.ipa`) to save the file outside the repo.

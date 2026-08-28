// `@expo/metro-runtime` MUST be the first import to ensure Fast Refresh works
// on web.
import '@expo/metro-runtime';

// Use expo-blob's native Blob implementation globally so `Response.blob()`
// avoids the slow base64 copy through React Native's blob store.
import { Blob } from 'expo-blob';
globalThis.Blob = Blob as unknown as typeof globalThis.Blob;

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// This file should only import and register the root. No components or exports
// should be added here.
renderRootComponent(App);

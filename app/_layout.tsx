// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ensureDatabasePresent } from '../lib/preloadDb';
import * as SQLite from 'expo-sqlite';
import { runMigrations } from '../lib/migrations';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
        <StatusBar style="light" />

  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) Ensure DB copied from assets on first run
        await ensureDatabasePresent('gita.db');

        // 2) Open DB and run migrations
        const db = SQLite.openDatabaseSync('gita.db');
        runMigrations(db);

        // (Optional) Quick smoke test — remove later
        const row = db.getFirstSync<{ cnt: number }>(
          "SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type='table' AND name='tasks';"
        );
        console.log('Tasks table present?', row?.cnt === 1);

      } catch (e) {
        console.warn('DB prepare/migrate failed:', e);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="add"   options={{ presentation: 'modal', title: 'Add Task' }} />
      <Stack.Screen name="shloka/[id]" options={{ title: 'Shloka' }} />
    </Stack>
  );
}

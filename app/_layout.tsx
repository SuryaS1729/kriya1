// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { ensureDatabasePresent } from '../lib/preloadDb';
import { runMigrations } from '../lib/migrations';

export default function Root() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Make sure the bundled DB is on disk BEFORE opening it
        await ensureDatabasePresent('gita.db');
        setBooted(true);
      } catch (e) {
        console.warn('ensureDatabasePresent failed:', e);
        setBooted(true); // still render so we can see errors
      }
    })();
  }, []);

  if (!booted) return null; // or a tiny splash

  async function initDb(db: any) {
    try {
      runMigrations(db);
      // no generic —> cast
      const row = db.getFirstSync('SELECT COUNT(*) AS c FROM sqlite_master') as { c: number } | null;
      console.log('DB ready. Objects:', row?.c ?? 0);
    } catch (e) {
      console.warn('DB prepare/migrate failed:', e);
    }
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="gita.db" onInit={initDb}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="add" options={{headerShadowVisible:false}} />
          <Stack.Screen name="history" />
          <Stack.Screen name="read" />
          <Stack.Screen name="shloka/[id]" />
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

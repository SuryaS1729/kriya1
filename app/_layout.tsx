import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider } from 'expo-sqlite';
import { ensureDatabasePresent } from '../lib/preloadDb';
import { setDbReady } from '../lib/dbReady';
import { useKriya } from '../lib/store';
import { setDb } from '../lib/db';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

const DB_NAME = 'gita.db';
// NOTE: this file is in /app, assets is one level up:
const DB_ASSET = require('../assets/db/gita.db');

export default function Root() {
  const [booted, setBooted] = useState(false);
  

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set the navigation bar style
      NavigationBar.setStyle('auto');
    }
    (async () => {
      try {
        // While debugging, set forceReplace:true ONCE to guarantee a fresh copy
        await ensureDatabasePresent(DB_NAME, DB_ASSET, { forceReplace: false });
      } catch (e) {
        console.warn('ensureDatabasePresent failed:', e);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  if (!booted) return null;

 async function onInit(db: any) {
  try {
    // 1) Run migrations (see next section)
    await runMigrationsSafe(db);

    // 2) Expose this db to non-React modules
    setDb(db);                            // <-- IMPORTANT

    // 3) (Optional) sanity logs
    const tables = db.getAllSync(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    ) as { name: string }[];
    console.log('SQLite tables:', tables.map(t => t.name).join(', '));

    const row = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM shlokas`);
    console.log('Shlokas count:', row?.c ?? 0);

    // 4) Signal ready and kick store init (which uses getDb())
    setDbReady(true);
    useKriya.getState().init();
  } catch (e) {
    console.warn('DB migrate/init failed:', e);
    setDbReady(false);
  }
}

async function runMigrationsSafe(db: any) {
  // base tables
  db.execSync(`
    CREATE TABLE IF NOT EXISTS tasks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS kriya_progress(
      day_key INTEGER PRIMARY KEY,
      base_index INTEGER NOT NULL,
      day_start_ms INTEGER NOT NULL
    );
  `);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  // add missing columns if not present
  const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(tasks)`) || [];
  const has = (n: string) => cols.some(c => c.name === n);

  if (!has('completed_at')) {
    db.execSync(`ALTER TABLE tasks ADD COLUMN completed_at INTEGER`);
  }
  if (!has('day_key')) {
    db.execSync(`ALTER TABLE tasks ADD COLUMN day_key INTEGER DEFAULT 0`);
    // backfill: clamp created_at to midnight (ms)
    // floor(created_at / 86400000) * 86400000
    db.execSync(`
      UPDATE tasks
      SET day_key = (CAST(created_at / 86400000 AS INTEGER) * 86400000)
      WHERE day_key = 0 OR day_key IS NULL
    `);
  }
  // Your code referenced shloka_id previously; add it so updates don’t fail.
  if (!has('shloka_id')) {
    db.execSync(`ALTER TABLE tasks ADD COLUMN shloka_id INTEGER`);
  }

  // (Optional) indices for speed
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_tasks_day_key ON tasks(day_key)`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)`);
}


  

  return (
    <SafeAreaProvider>
      {/* IMPORTANT: open by NAME. Provider finds it under documentDirectory/SQLite */}
      <SQLiteProvider databaseName={DB_NAME} onInit={onInit}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{animation:'fade'}}/>
          <Stack.Screen name="add" options={{ presentation: 'modal', animation:'none' }} />
          <Stack.Screen name="history" options={{animation:'none'}}/>
          <Stack.Screen name="read" options={{animation:'fade'}} />
          <Stack.Screen name="shloka/[id]" options={{animation:'fade'}}/>
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

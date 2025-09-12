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

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';

const DB_NAME = 'gita.db';
const DB_ASSET = require('../assets/db/gita.db');

let globalDbInitialized = false; // Global flag to prevent multiple initializations

export default function Root() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle('auto');
    }
    (async () => {
      try {
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
    // Use global flag to prevent multiple initializations
    if (globalDbInitialized) {
      console.log('DB already initialized globally, skipping...');
      return;
    }
    
    globalDbInitialized = true;
    console.log('Initializing DB for the first time...');
    
    try {
      await runMigrationsSafe(db);
      setDb(db);

      const tables = db.getAllSync(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      ) as { name: string }[];
      console.log('SQLite tables:', tables.map(t => t.name).join(', '));

      const row = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) AS c FROM shlokas`);
      console.log('Shlokas count:', row?.c ?? 0);

      setDbReady(true);
      
      // Use setTimeout to prevent potential state update conflicts
      setTimeout(() => {
        useKriya.getState().init();
      }, 100);
    } catch (e) {
      console.warn('DB migrate/init failed:', e);
      setDbReady(false);
      globalDbInitialized = false; // Reset on error
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

    const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(tasks)`) || [];
    const has = (n: string) => cols.some(c => c.name === n);

    if (!has('completed_at')) {
      db.execSync(`ALTER TABLE tasks ADD COLUMN completed_at INTEGER`);
    }
    if (!has('day_key')) {
      db.execSync(`ALTER TABLE tasks ADD COLUMN day_key INTEGER DEFAULT 0`);
      db.execSync(`
        UPDATE tasks
        SET day_key = (CAST(created_at / 86400000 AS INTEGER) * 86400000)
        WHERE day_key = 0 OR day_key IS NULL
      `);
    }
    if (!has('shloka_id')) {
      db.execSync(`ALTER TABLE tasks ADD COLUMN shloka_id INTEGER`);
    }

    db.execSync(`CREATE INDEX IF NOT EXISTS idx_tasks_day_key ON tasks(day_key)`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at)`);
  }

  return (
    
    <GluestackUIProvider mode="system">
      <SafeAreaProvider>
      <SQLiteProvider databaseName={DB_NAME} onInit={onInit}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{animation:'fade'}}/>
          <Stack.Screen name="onboarding/index" options={{ headerShown: false, animation:'fade' }} />
          <Stack.Screen name="add" options={{  animation:'fade' }} />
          <Stack.Screen name="history" options={{animation:'fade_from_bottom'}}/>
          <Stack.Screen name="read" options={{animation:'slide_from_bottom'}} />
          <Stack.Screen name="shloka/[id]" options={{animation:'fade'}}/>
          <Stack.Screen name="share" options={{animation:'slide_from_bottom'}}/>
          <Stack.Screen name="bookmarks" options={{animation:'fade'}}/>
          <Stack.Screen name="focus" options={{ title: 'Focus Mode' , animation:'fade'}} />

        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
    </GluestackUIProvider>
  
  );
}

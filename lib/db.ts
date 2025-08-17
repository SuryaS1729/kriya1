// lib/db.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';

// --- For React components (inside Provider tree) ---
export function useDb(): SQLiteDatabase {
  return useSQLiteContext();
}

// --- For non-React modules (store/helpers) ---
let _db: SQLiteDatabase | null = null;

export function setDb(db: SQLiteDatabase) {
  _db = db;
}

export function getDb(): SQLiteDatabase {
  if (!_db) {
    throw new Error('SQLite DB not set yet. Ensure setDb(db) is called in _layout onInit AFTER copying the asset.');
  }
  return _db;
}

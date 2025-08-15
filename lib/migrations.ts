// lib/migrations.ts
import type { SQLiteDatabase } from 'expo-sqlite';

export function runMigrations(db: SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
  `);

  const current = getCurrentVersion(db);

  // v1: tasks (you already have this)
  if (current < 1) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        shloka_id INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
    `);
    setVersion(db, 1);
  }

  // v2: progress table
  if (current < 2) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS kriya_progress (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_index INTEGER NOT NULL,
        day_start_ms INTEGER NOT NULL
      );
    `);
    // Seed: first install → start at shloka 0, today’s midnight
    const now = Date.now();
    const dayStart = startOfTodayMs(now);
    db.runSync(
      'INSERT OR IGNORE INTO kriya_progress (id, base_index, day_start_ms) VALUES (1, 0, ?)',
      [dayStart]
    );
    setVersion(db, 2);
  }
}

function getCurrentVersion(db: SQLiteDatabase) {
  try {
    const row = db.getFirstSync<{ version: number }>('SELECT MAX(version) AS version FROM schema_migrations');
    return row?.version ?? 0;
  } catch { return 0; }
}
function setVersion(db: SQLiteDatabase, v: number) {
  db.runSync('INSERT OR REPLACE INTO schema_migrations (version) VALUES (?)', [v]);
}

// local helper
function startOfTodayMs(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

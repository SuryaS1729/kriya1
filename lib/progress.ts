import { getDb } from './db';
import { isDbReady } from './dbReady';

function startOfDayMs(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export type Progress = {
  day_key: number;      // midnight (ms)
  base_index: number;   // starting index for that day
  day_start_ms: number; // same as day_key
};

// count tasks completed in [start, end)
function countCompletedBetween(startMs: number, endMs: number): number {
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) AS c
     FROM tasks
     WHERE completed = 1
       AND completed_at IS NOT NULL
       AND completed_at >= ?
       AND completed_at < ?`,
    [startMs, endMs]
  );
  return row?.c ?? 0;
}

/**
 * Ensure a row for *today*. If missing:
 *  - If no previous day exists: start at 0 (→ 1.1)
 *  - Else carry forward: prev_base + tasks_completed_yesterday
 */
export function ensureProgressForToday(totalShlokas: number): Progress {
  if (!isDbReady()) {
    const today = startOfDayMs();
    return { day_key: today, base_index: 0, day_start_ms: today };
  }

  const db = getDb();
  const today = startOfDayMs();

  // Already set for today?
  const existing = db.getFirstSync<Progress>(
    `SELECT day_key, base_index, day_start_ms
     FROM kriya_progress
     WHERE day_key = ?
     LIMIT 1`,
    [today]
  );
  if (existing) return existing;

  // Find most recent previous progress (if any)
  const prev = db.getFirstSync<Progress>(
    `SELECT day_key, base_index, day_start_ms
     FROM kriya_progress
     WHERE day_key < ?
     ORDER BY day_key DESC
     LIMIT 1`,
    [today]
  );

  let base = 0; // default first-ever → 1.1
  if (prev && totalShlokas > 0) {
    const completedYesterday = countCompletedBetween(prev.day_start_ms, today);
    base = (prev.base_index + completedYesterday) % totalShlokas;
  }

  db.runSync(
    `INSERT INTO kriya_progress(day_key, base_index, day_start_ms)
     VALUES (?, ?, ?)`,
    [today, base, today]
  );

  return { day_key: today, base_index: base, day_start_ms: today };
}

/** still used by store for “advance within the same day” */
export function countCompletedSince(sinceMs: number): number {
  if (!isDbReady()) return 0;
  const db = getDb();
  const row = db.getFirstSync<{ c: number }>(
    `SELECT COUNT(*) AS c
     FROM tasks
     WHERE completed = 1
       AND completed_at IS NOT NULL
       AND completed_at >= ?`,
    [sinceMs]
  );
  return row?.c ?? 0;
}

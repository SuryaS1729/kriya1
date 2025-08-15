// lib/progress.ts
import { db } from './db';

export type Progress = { base_index: number; day_start_ms: number };

export function getProgress(): Progress {
  const row = db.getFirstSync<Progress>('SELECT base_index, day_start_ms FROM kriya_progress WHERE id = 1');
  if (!row) throw new Error('kriya_progress missing');
  return row;
}

export function setProgress(p: Progress) {
  db.runSync(
    'UPDATE kriya_progress SET base_index = ?, day_start_ms = ? WHERE id = 1',
    [p.base_index, p.day_start_ms]
  );
}

export function ensureProgressForToday(totalShlokas: number) {
  const prog = getProgress();
  const todayStart = startOfTodayMs(Date.now());
  if (prog.day_start_ms === todayStart) return prog; // already today

  // Compute how many tasks were completed yesterday
  const completedYesterday = countCompletedBetween(prog.day_start_ms, todayStart);
  const nextBase = mod(prog.base_index + completedYesterday, totalShlokas);

  const updated = { base_index: nextBase, day_start_ms: todayStart };
  setProgress(updated);
  return updated;
}

export function countCompletedSince(dayStartMs: number): number {
  const row = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM tasks WHERE completed = 1 AND completed_at >= ?',
    [dayStartMs]
  );
  return row?.c ?? 0;
}

function countCompletedBetween(startMs: number, endMs: number): number {
  const row = db.getFirstSync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM tasks WHERE completed = 1 AND completed_at >= ? AND completed_at < ?',
    [startMs, endMs]
  );
  return row?.c ?? 0;
}

function startOfTodayMs(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

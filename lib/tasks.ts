import { getDb } from './db';

export type Task = {
  id: number;
  title: string;
  completed: boolean;        // exposed as boolean in JS
  created_at: number;        // epoch ms
  completed_at: number | null;
  shloka_id: number | null;  // optional link to the shloka at completion time
};

type Row = {
  id: number;
  title: string;
  completed: number;         // 0/1 in SQLite
  created_at: number;
  completed_at: number | null;
  shloka_id: number | null;
};

export function getAllTasks(): Task[] {
  const db = getDb();

  const rows = db.getAllSync<Row>('SELECT * FROM tasks ORDER BY id DESC');
  return rows.map(r => ({ ...r, completed: !!r.completed }));
}
export function insertTask(title: string, shlokaId: number | null = null) {
  const db = getDb();

  const now = Date.now();
  const dayKey = startOfDay(now);
  db.runSync(
    'INSERT INTO tasks (title, completed, created_at, completed_at, shloka_id, day_key) VALUES (?, 0, ?, NULL, ?, ?)',
    [title.trim(), now, shlokaId, dayKey]
  );
}


function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0,0,0,0);
  return d.getTime();
}

export function getTasksForDay(dayKey: number): Task[] {
  const db = getDb();

  const rows = db.getAllSync<Row>(
    'SELECT * FROM tasks WHERE day_key = ? ORDER BY id DESC',
    [dayKey]
  );
  return rows.map(r => ({ ...r, completed: !!r.completed }));
}

export function getDistinctPastDays(limit = 30): { day_key: number; count: number }[] {
  const db = getDb();

  return db.getAllSync<{ day_key: number; count: number }>(
    'SELECT day_key, COUNT(*) as count FROM tasks WHERE day_key < ? GROUP BY day_key ORDER BY day_key DESC LIMIT ?',
    [startOfToday(Date.now()), limit]
  );
}

function startOfToday(ms: number) {
  const d = new Date(ms);
  d.setHours(0,0,0,0);
  return d.getTime();
}


export function setTaskCompleted(id: number, completed: boolean, shlokaIdWhenDone: number | null = null) {
  const db = getDb();

  if (completed) {
    const now = Date.now();
    db.runSync(
      'UPDATE tasks SET completed = 1, completed_at = ?, shloka_id = COALESCE(?, shloka_id) WHERE id = ?',
      [now, shlokaIdWhenDone, id]
    );
  } else {
    db.runSync(
      'UPDATE tasks SET completed = 0, completed_at = NULL WHERE id = ?',
      [id]
    );
  }
}

export function removeTask(id: number) {
  const db = getDb();

  db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
}

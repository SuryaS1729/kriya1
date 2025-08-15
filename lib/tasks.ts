import { db } from './db';

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
  const rows = db.getAllSync<Row>('SELECT * FROM tasks ORDER BY id DESC');
  return rows.map(r => ({ ...r, completed: !!r.completed }));
}

export function insertTask(title: string, shlokaId: number | null = null) {
  const now = Date.now();
  db.runSync(
    'INSERT INTO tasks (title, completed, created_at, completed_at, shloka_id) VALUES (?, 0, ?, NULL, ?)',
    [title.trim(), now, shlokaId]
  );
}

export function setTaskCompleted(id: number, completed: boolean, shlokaIdWhenDone: number | null = null) {
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
  db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
}

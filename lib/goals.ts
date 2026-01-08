import { getDb } from './db';

export type Goal = {
  id: number;
  title: string;
  created_at: number;
};

type Row = {
  id: number;
  title: string;
  created_at: number;
};

export function getAllGoals(): Goal[] {
  const db = getDb();
  const rows = db.getAllSync<Row>('SELECT * FROM goals ORDER BY created_at DESC');
  return rows;
}

export function insertGoal(title: string) {
  const db = getDb();
  const now = Date.now();
  db.runSync(
    'INSERT INTO goals (title, created_at) VALUES (?, ?)',
    [title.trim(), now]
  );
}

export function removeGoal(id: number) {
  const db = getDb();
  db.runSync('DELETE FROM goals WHERE id = ?', [id]);
}

export function updateGoal(id: number, title: string) {
  const db = getDb();
  db.runSync('UPDATE goals SET title = ? WHERE id = ?', [title.trim(), id]);
}

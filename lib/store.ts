import { create } from 'zustand';
import {
  getTasksForDay,
  getDistinctPastDays,
  insertTask,
  setTaskCompleted,
  removeTask as dbRemoveTask,
  type Task,
} from './tasks';
import { getShlokaAt, getTotalShlokas } from './shloka';
import { ensureProgressForToday, countCompletedSince } from './progress';

type State = {
    ready: boolean;                 // ← NEW

  tasksToday: Task[];

  // actions
  init: () => void;
  refresh: () => void;
  addTask: (title: string) => void;
  toggleTask: (id: number) => void;
  removeTask: (id: number) => void;

  // derived
  currentShloka: () => { index: number; data: ReturnType<typeof getShlokaAt> };

  // history api
  todayKey: () => number;
  listHistoryDays: (limit?: number) => { day_key: number; count: number }[];
  getTasksForDay: (dayKey: number) => Task[];
};

export const useKriya = create<State>((set, get) => ({
    ready: false,                   // ← start not ready

  tasksToday: [],

  init: () => {
    try {
      const total = getTotalShlokas();       // ok if DB is present
      if (total > 0) ensureProgressForToday(total);
      set({ tasksToday: getTasksForDay(get().todayKey()) });
      set({ ready: true });                  // ← mark ready only at the end
    } catch (e) {
      console.warn('Init failed:', e);
      set({ ready: true, tasksToday: [] });  // still let UI continue
    }
  },

  refresh: () => set({ tasksToday: getTasksForDay(get().todayKey()) }),

  addTask: (title) => {
    insertTask(title);
    set({ tasksToday: getTasksForDay(get().todayKey()) });
  },

  toggleTask: (id) => {
    const t = get().tasksToday.find(x => x.id === id);
    if (!t) return;
    const next = !t.completed;
    setTaskCompleted(id, next, null);
    set(state => ({
      tasksToday: state.tasksToday.map(x =>
        x.id === id
          ? { ...x, completed: next, completed_at: next ? Date.now() : null }
          : x
      ),
    }));
  },

  removeTask: (id) => {
    dbRemoveTask(id);
    set(state => ({ tasksToday: state.tasksToday.filter(x => x.id !== id) }));
  },

   currentShloka: () => {
    try {
      const total = getTotalShlokas();
      if (total === 0) {
        return { index: 0, data: { id: 0, chapter_number: 0, verse_number: 0, text: '—', transliteration: null, word_meanings: null, description: null, translation_2: '—', commentary: null } as any };
      }
      const prog = ensureProgressForToday(total);
      const offset = countCompletedSince(prog.day_start_ms);
      const idx = (prog.base_index + offset) % total;
      return { index: idx, data: getShlokaAt(idx) };
    } catch (e) {
      // defensive fallback so we never crash during startup/race conditions
      console.warn('currentShloka failed:', e);
      return { index: 0, data: { id: 0, chapter_number: 0, verse_number: 0, text: '—', transliteration: null, word_meanings: null, description: null, translation_2: '—', commentary: null } as any };
    }
  },

  todayKey: () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  },

  listHistoryDays: (limit = 30) => getDistinctPastDays(limit),

  getTasksForDay: (dayKey: number) => getTasksForDay(dayKey),
}));

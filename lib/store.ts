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
  tasksToday: [],

  init: () => {
    const total = getTotalShlokas();
    if (total > 0) ensureProgressForToday(total);
    set({ tasksToday: getTasksForDay(get().todayKey()) });
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
    const total = getTotalShlokas();
    if (total === 0) {
      return { index: 0, data: { id: 0, chapter_number: 0, verse_number: 0, text: '—', transliteration: null, word_meanings: null, description: null, translation_2: '—', commentary: null } as any };
    }
    const prog = ensureProgressForToday(total);
    const offset = countCompletedSince(prog.day_start_ms); // completions since midnight (any day_key)
    const idx = (prog.base_index + offset) % total;
    return { index: idx, data: getShlokaAt(idx) };
  },

  todayKey: () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  },

  listHistoryDays: (limit = 30) => getDistinctPastDays(limit),

  getTasksForDay: (dayKey: number) => getTasksForDay(dayKey),
}));

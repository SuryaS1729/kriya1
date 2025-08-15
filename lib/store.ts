// lib/store.ts
import { create } from 'zustand';
import {
  getAllTasks,
  insertTask,
  setTaskCompleted,
  removeTask as dbRemoveTask,
  type Task,
} from './tasks';
import { getShlokaAt, getTotalShlokas } from './shloka';
import { ensureProgressForToday, countCompletedSince } from './progress';

type State = {
  tasks: Task[];

  // Derived selector exposed as a function (so components can select the function and call it)
  currentShloka: () => { index: number; data: ReturnType<typeof getShlokaAt> };

  // Actions
  init: () => void;
  refresh: () => void;
  addTask: (title: string) => void;
  toggleTask: (id: number) => void;
  removeTask: (id: number) => void;
};

export const useKriya = create<State>((set, get) => ({
  tasks: [],

  init: () => {
    // Load tasks into memory
    set({ tasks: getAllTasks() });

    // Ensure progress is rolled to "today" (advances base if day changed)
    const total = getTotalShlokas();
    if (total > 0) ensureProgressForToday(total);
  },

  refresh: () => set({ tasks: getAllTasks() }),

  addTask: (title) => {
    insertTask(title);
    // Reload to capture new row with its auto ID
    set({ tasks: getAllTasks() });
  },

  toggleTask: (id) => {
    const t = get().tasks.find(x => x.id === id);
    if (!t) return;

    const next = !t.completed;
    setTaskCompleted(id, next, null);

    // Optimistic UI update
    set(state => ({
      tasks: state.tasks.map(x =>
        x.id === id
          ? { ...x, completed: next, completed_at: next ? Date.now() : null }
          : x
      ),
    }));
  },

  removeTask: (id) => {
    dbRemoveTask(id);
    set(state => ({ tasks: state.tasks.filter(x => x.id !== id) }));
  },

  currentShloka: () => {
    const total = getTotalShlokas();
    if (total === 0) {
      // Dev fallback if DB is empty
      return {
        index: 0,
        data: {
          id: 0,
          chapter_number: 0,
          verse_number: 0,
          text: '—',
          transliteration: null,
          word_meanings: null,
          description: null,
          translation_2: '—',
          commentary: null,
        } as any,
      };
    }

    // Make sure base is correct for "today"
    const prog = ensureProgressForToday(total);

    // Offset = #tasks completed since today's start
    const offset = countCompletedSince(prog.day_start_ms);

    const idx = (prog.base_index + offset) % total;
    return { index: idx, data: getShlokaAt(idx) };
  },
}));

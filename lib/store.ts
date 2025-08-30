import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { isDbReady } from './dbReady';
import type { ShlokaRow } from './shloka';

type State = {
  ready: boolean;

  tasksToday: Task[];

  // actions
  init: () => void;
  refresh: () => void;
  addTask: (title: string) => void;
  toggleTask: (id: number) => void;
  removeTask: (id: number) => void;

  // derived (index-based; no id)
  currentShloka: () => { index: number; data: ShlokaRow | null };

  // history api
  todayKey: () => number;
  listHistoryDays: (limit?: number) => { day_key: number; count: number }[];
  getTasksForDay: (dayKey: number) => Task[];

  // dark mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // bookmarks
  bookmarks: Bookmark[];
  addBookmark: (shlokaIndex: number, shlokaData: ShlokaRow) => void;
  removeBookmark: (shlokaIndex: number) => void;
  isBookmarked: (shlokaIndex: number) => boolean;
  getBookmarks: () => Bookmark[];
};

// Add bookmark interface
export interface Bookmark {
  id: number;
  shlokaIndex: number;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  createdAt: string;
}

export const useKriya = create<State>()(
  persist(
    (set, get) => ({
      ready: false,
      tasksToday: [],
      isDarkMode: false, // Default to light mode
      bookmarks: [],

      init: () => {
        if (!isDbReady()) {
          // _layout will call init() again after DB is ready
          return;
        }
        try {
          const total = getTotalShlokas();
          if (total > 0) ensureProgressForToday(total);
          set({ tasksToday: getTasksForDay(get().todayKey()) });
          set({ ready: true });
        } catch (e) {
          console.warn('Init failed:', e);
          set({ ready: true, tasksToday: [] });
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
        // Never query DB if not ready
        if (!isDbReady()) {
          return {
            index: 0,
            data: null, // <- no placeholder with id
          };
        }
        try {
          const total = getTotalShlokas();
          if (total === 0) {
            return { index: 0, data: null };
          }
          const prog = ensureProgressForToday(total);
          const offset = countCompletedSince(prog.day_start_ms);
          const idx = (prog.base_index + offset) % total;
          return { index: idx, data: getShlokaAt(idx) };
        } catch (e) {
          console.warn('currentShloka failed:', e);
          return { index: 0, data: null };
        }
      },

      todayKey: () => {
        const d = new Date();
        d.setHours(0,0,0,0);
        return d.getTime();
      },

      listHistoryDays: (limit = 30) => getDistinctPastDays(limit),

      getTasksForDay: (dayKey: number) => getTasksForDay(dayKey),

      toggleDarkMode: () => {
        set((state) => ({ isDarkMode: !state.isDarkMode }));
      },

      addBookmark: (shlokaIndex, shlokaData) => {
        const existing = get().bookmarks.find(b => b.shlokaIndex === shlokaIndex);
        if (existing) return; // Already bookmarked
        
        const newBookmark: Bookmark = {
          id: Date.now(), // Simple ID generation
          shlokaIndex,
          chapter: shlokaData.chapter_number,
          verse: shlokaData.verse_number,
          text: shlokaData.text,
          translation: shlokaData.translation_2,
          createdAt: new Date().toISOString(),
        };
        
        set(state => ({
          bookmarks: [...state.bookmarks, newBookmark]
        }));
      },

      removeBookmark: (shlokaIndex) => {
        set(state => ({ bookmarks: state.bookmarks.filter(b => b.shlokaIndex !== shlokaIndex) }));
      },

      isBookmarked: (shlokaIndex) => {
        return get().bookmarks.some(b => b.shlokaIndex === shlokaIndex);
      },

      getBookmarks: () => {
        return get().bookmarks;
      },
    }),
    {
      name: 'kriya-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        isDarkMode: state.isDarkMode,
        bookmarks: state.bookmarks  // Add this line!
      }),
    }
  )
);
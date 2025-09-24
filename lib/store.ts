import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
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

// Configure notification handler - Updated to match official docs
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Add this helper function
function getDateKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

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

interface KriyaState {
  ready: boolean;
  tasksToday: Task[];
   hasCompletedTour: boolean;
  setTourCompleted: (completed: boolean) => void;
    hasSeenGuidedTour: boolean;
      setHasSeenGuidedTour: (seen: boolean) => void;





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

  // onboarding
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;

  // Enhanced refresh
  clearCache: () => void;
  hardRefresh: () => void;

  // focus sessions
  focusSessions: Record<number, number>; // dayKey -> number of sessions
  getFocusSessionsForDay: (dayKey: number) => number;
  addFocusSession: (dayKey?: number) => void; // Make dayKey optional

  // Add this new function
  getTotalCompletedTasks: () => number;

  // Notification properties
  notificationsEnabled: boolean;
  reminderTime: { hour: number; minute: number };
  notificationToken: string | null;

  // Notification methods
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  toggleNotifications: () => Promise<void>;
  initializeNotifications: () => Promise<void>;
}

// Updated helper function for notifications - Following official docs exactly
async function registerForPushNotificationsAsync() {


  // Set up Android notification channel - Updated channel name
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('kriyaNotificationChannel', {
      name: 'Kriya Daily Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
       showBadge: true,
      enableLights: true,
      enableVibrate: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      // console.log('Failed to get push token for push notification!');
      return null;
    }
    
      // console.log('✅ Local notification permissions granted');
    return 'local-notifications-enabled'; // Return a simple success indicator
  } else {
    // console.log('Must use physical device for notifications');
    return null;
  }
}

// Updated scheduling function - Using proper trigger format
async function scheduleTaskReminder(hour: number, minute: number) {
  // Cancel existing reminders
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  // Calculate reminder time (10 minutes before)
  let reminderHour = hour;
  let reminderMinute = minute - 10;
  
  if (reminderMinute < 0) {
    reminderMinute += 60;
    reminderHour -= 1;
  }
  
  if (reminderHour < 0) {
    reminderHour += 24;
  }
  
  // Schedule daily reminder using proper trigger format
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🕉️ Time to Plan Your Day",
      body: "Take a moment to write down your tasks before your day begins. Set your intentions mindfully.",
      data: { type: 'task_reminder' },
      sound: true,
       ...(Platform.OS === 'android' && {
        icon: './assets/icons/icon.png',
        color: '#0026ffff', // Use your app's orange color
      }),
  
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderHour,
      minute: reminderMinute,
    },
  });
  
  // console.log(`✅ Daily reminder scheduled for ${reminderHour.toString().padStart(2, '0')}:${reminderMinute.toString().padStart(2, '0')}`);
}

export const useKriya = create<KriyaState>()(
  devtools(
  persist(
    (set, get) => ({
      ready: false,
      tasksToday: [],
      isDarkMode: true,
      bookmarks: [],
      hasCompletedOnboarding: false,
      focusSessions: {},
      hasCompletedTour: false,
        hasSeenGuidedTour: false,
        setHasSeenGuidedTour: (seen: boolean) => {
          set({ hasSeenGuidedTour: seen });
        },


      // Default notification settings
      notificationsEnabled: true,
      reminderTime: { hour: 8, minute: 0 }, // 8:00 AM default
      notificationToken: null,

      init: () => {
        if (!isDbReady()) {
          // _layout will call init() again after DB is ready
          return;
        }
        try {
          const total = getTotalShlokas();
          if (total > 0) ensureProgressForToday(total);

           // Migration logic for existing users
    const { hasCompletedOnboarding, hasSeenGuidedTour } = get();
    if (hasCompletedOnboarding && hasSeenGuidedTour === false) {
      // This is likely an existing user who completed onboarding before the tour was added
      // Check if they have any tasks or bookmarks (signs of existing usage)
      const existingTasks = getTasksForDay(get().todayKey());
      const existingBookmarks = get().bookmarks;
      
      if (existingTasks.length > 0 || existingBookmarks.length > 0) {
        // Skip tour for existing users
        set({ hasSeenGuidedTour: true });
      }
    }
    
          set({ tasksToday: getTasksForDay(get().todayKey()) });
          set({ ready: true });
        } catch (e) {
          // console.warn('Init failed:', e);
          set({ ready: true, tasksToday: [] });
        }
      },

       
      setTourCompleted: (completed: boolean) => {
        set({ hasCompletedTour: completed });
      },
      

      refresh: () => {
        try {
          set({ tasksToday: getTasksForDay(get().todayKey()) });
        } catch (e) {
          // console.warn('Refresh failed:', e);
        }
      },

      clearCache: () => {
        // console.log('🧹 Clearing in-memory cache');
        // Clear tasks array to force fresh load
        set({ tasksToday: [] });
      },

      hardRefresh: () => {
        // console.log('🧹 Hard refresh - clearing cache and reloading');
        try {
          // Clear cache first
          set({ tasksToday: [] });
          
          // Force garbage collection of old references
          const todayKey = get().todayKey();
          const freshTasks = getTasksForDay(todayKey);
          
          set({ tasksToday: freshTasks });
        } catch (e) {
          // console.warn('Hard refresh failed:', e);
          set({ tasksToday: [] });
        }
      },

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
          // console.warn('currentShloka failed:', e);
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

      completeOnboarding: () => {
        // console.log('🎯 Store: Completing onboarding...');
        set({ hasCompletedOnboarding: true });
        // console.log('🎯 Store: New state after completion:', get().hasCompletedOnboarding);
      },

      getFocusSessionsForDay: (dayKey: number) => {
        return get().focusSessions[dayKey] || 0;
      },
      
      addFocusSession: (dayKey?: number) => {
        const today = dayKey || getDateKey(new Date());
        set((state) => ({
          focusSessions: {
            ...state.focusSessions,
            [today]: (state.focusSessions[today] || 0) + 1
          }
        }));
      },

      getTotalCompletedTasks: () => {
        if (!isDbReady()) {
          return 0;
        }
        
        try {
          let totalCompleted = 0;
          
          // Get all history days (we'll use a large limit to get all days)
          const historyDays = get().listHistoryDays(1000); // Get up to 1000 days of history
          
          // Add today's key if it's not in history yet
          const todayKey = get().todayKey();
          const allDayKeys = new Set([todayKey, ...historyDays.map(day => day.day_key)]);
          
          // Count completed tasks for each day
          Array.from(allDayKeys).forEach(dayKey => {
            const tasks = get().getTasksForDay(dayKey);
            totalCompleted += tasks.filter(task => task.completed).length;
          });
          
          return totalCompleted;
        } catch (e) {
          // console.warn('getTotalCompletedTasks failed:', e);
          return 0;
        }
      },

      // Notification methods - Updated implementation
      setReminderTime: async (hour: number, minute: number) => {
        set({ reminderTime: { hour, minute } });
        
        // Reschedule notification with new time
        const state = get();
        if (state.notificationsEnabled) {
          await scheduleTaskReminder(hour, minute);
        }
      },

      toggleNotifications: async () => {
        const { notificationsEnabled } = get();
        const newState = !notificationsEnabled;
        
        set({ notificationsEnabled: newState });
        
        if (newState) {
          await get().initializeNotifications();
        } else {
          await Notifications.cancelAllScheduledNotificationsAsync();
          // console.log('🔕 All notifications cancelled');
        }
      },

      initializeNotifications: async () => {
        try {
          // console.log('🔔 Initializing notifications...');
          const result = await registerForPushNotificationsAsync();
          set({ notificationToken: result });
          
          const { reminderTime } = get();
          await scheduleTaskReminder(reminderTime.hour, reminderTime.minute);
          
          // console.log('✅ Local notifications initialized successfully');
        } catch (error) {
          // console.error('❌ Failed to initialize notifications:', error);
        }
      },
    }),
    {
      name: 'kriya-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        bookmarks: state.bookmarks,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        focusSessions: state.focusSessions,
        notificationsEnabled: state.notificationsEnabled,
        reminderTime: state.reminderTime,
                hasSeenGuidedTour: state.hasSeenGuidedTour, // Add this line

        // Don't persist notification token
      }),
    }
  )
)
);
import { create } from 'zustand';

/**
 * Tracks whether app startup (opening + migrating the bundled DB) failed,
 * so the root layout can show a recoverable error instead of spinning forever.
 */
type StartupStatus = {
  failed: boolean;
  attempt: number;
  markFailed: () => void;
  retry: () => void;
};

export const useStartupStatus = create<StartupStatus>()((set) => ({
  failed: false,
  attempt: 0,
  markFailed: () => set({ failed: true }),
  retry: () => set((s) => ({ failed: false, attempt: s.attempt + 1 })),
}));

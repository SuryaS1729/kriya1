import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Presets,
  Settings,
  HapticSupport,
  usePatternComposer,
  type Pattern,
} from 'react-native-pulsar';

// Rich Pulsar patterns only render well on iPhones (Core Haptics) and on
// Android devices reporting ADVANCED_SUPPORT (precise actuators +
// composition primitives). Elsewhere they collapse into similar buzzes, so
// those devices keep the tuned system haptics instead.
function detectRichHaptics(): boolean {
  if (Platform.OS === 'ios') return true;
  try {
    const level = Settings.getHapticsSupportLevel();
    if (__DEV__) {
      console.log(`[haptics] Pulsar support level: ${HapticSupport[level]} (${level})`);
    }
    return level >= HapticSupport.ADVANCED_SUPPORT;
  } catch {
    return false;
  }
}

/** Checked once at startup; also handy for forcing a path while testing. */
export const RICH_HAPTICS = detectRichHaptics();

/**
 * Success haptic for completing tasks, successful operations
 */
export const taskCompleteHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

/**
 * Light haptic for selections, toggles, minor interactions
 */
export const selectionHaptic = () => {
  Haptics.selectionAsync();
};

/**
 * Light impact haptic for button presses, navigation
 */
export const buttonPressHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/**
 * Error haptic for deletions, failed operations
 */
export const errorHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

/**
 * Warning haptic for warnings, confirmations needed
 */
export const warningHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

/**
 * Medium impact haptic for significant interactions
 */
export const mediumImpactHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

/**
 * Heavy impact haptic for major interactions
 */
export const heavyImpactHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

/**
 * Soft impact haptic for gentle interactions
 */
export const softImpactHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
};

/**
 * Rigid impact haptic for firm interactions
 */
export const rigidImpactHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
};

// ─── Pulsar: signature moments ─────────────────────────────────────
// Reserved for meaningful, infrequent moments. Everyday taps stay on the
// light system haptics above.

/**
 * Task completed → next shloka unlocked. A crisp tap with a short, soft
 * tail, like a small bell settling. Used with a hook because custom
 * patterns are parsed once per component.
 */
const TASK_DONE_PATTERN: Pattern = {
  discretePattern: [{ time: 0, amplitude: 0.85, frequency: 0.75 }],
  continuousPattern: {
    amplitude: [
      { time: 0, value: 0 },
      { time: 20, value: 0.3 },
      { time: 180, value: 0 },
    ],
    frequency: [
      { time: 0, value: 0.35 },
      { time: 180, value: 0.2 },
    ],
  },
};

export const useTaskDoneHaptic = () => {
  // The hook always runs (hooks can't be conditional) but only parses the
  // pattern on rich devices.
  const { play } = usePatternComposer(RICH_HAPTICS ? TASK_DONE_PATTERN : undefined);
  return useCallback(() => {
    if (RICH_HAPTICS) play();
    else taskCompleteHaptic();
  }, [play]);
};

/** Focus session finished after a full sit — rare, so it may be rich. */
export const focusCompleteHaptic = () => {
  if (RICH_HAPTICS) Presets.bellToll();
  else taskCompleteHaptic();
};

/** Verse bookmarked: a short "pressed in" stamp, lighter than a success. */
export const bookmarkHaptic = () => {
  if (RICH_HAPTICS) Presets.stamp();
  else taskCompleteHaptic();
};

/** Share card landed in the gallery: a shutter click confirms the save. */
export const photoSavedHaptic = () => {
  if (RICH_HAPTICS) Presets.cameraShutter();
  else taskCompleteHaptic();
};

/** "Begin the Journey": a rising swell that lifts with the exit animation. */
export const beginJourneyHaptic = () => {
  if (RICH_HAPTICS) Presets.ascent();
  else taskCompleteHaptic();
};

/** User-confirmed delete: one solid "it's gone", not an error buzz. */
export const deleteHaptic = () => {
  if (RICH_HAPTICS) Presets.thud();
  // A single firm tap — still not the triple error buzz.
  else heavyImpactHaptic();
};

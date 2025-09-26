import * as Haptics from 'expo-haptics';

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
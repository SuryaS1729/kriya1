import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection') => {
  // Only run on iOS devices (not simulator)
  if (Platform.OS !== 'ios') return;
  
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch (error) {
    // Silently fail - don't crash the app if haptics fail
    console.warn('Haptic feedback failed:', error);
  }
};

// Convenience functions for common actions
export const taskCompleteHaptic = () => triggerHaptic('success');
export const taskAddHaptic = () => triggerHaptic('medium');
export const buttonPressHaptic = () => triggerHaptic('light');
export const selectionHaptic = () => triggerHaptic('selection');
export const errorHaptic = () => triggerHaptic('error');
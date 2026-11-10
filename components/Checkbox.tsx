import React from 'react';
import { StyleSheet } from 'react-native';
import Feather from '@react-native-vector-icons/feather/static';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

// Soft ease-out for UI, not spring (no finger).
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * The task checkbox, shared by Home and Calendar so completing a task
 * looks and feels the same everywhere.
 */
export default function Checkbox({ completed, isDarkMode }: { completed: boolean; isDarkMode: boolean }) {
  const progress = useSharedValue(completed ? 1 : 0);

  React.useEffect(() => {
    // Tens of times a day → near-imperceptible <150ms, timing not spring.
    progress.set(
      withTiming(completed ? 1 : 0, {
        duration: 150,
        easing: EASE_OUT,
      })
    );
  }, [completed, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      isDarkMode ? ['#1f2937', '#65a25cff'] : ['white', '#98d590ff']
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      isDarkMode ? ['#4b5563', '#65a25cff'] : ['#e2e8f0', '#AADBA3']
    ),
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1]) }],
  }));

  return (
    <Animated.View style={[styles.checkbox, animatedStyle]}>
      {completed && (
        <AnimatedFeather
          name="check"
          size={14}
          color={isDarkMode ? '#17481bff' : '#ffffff'}
          style={checkmarkStyle}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

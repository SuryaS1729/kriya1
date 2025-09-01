import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface AnimatedDigitProps {
  digit: string;
  style?: any;
}

const AnimatedDigit: React.FC<AnimatedDigitProps> = ({ digit, style }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Animate the digit change
    opacity.value = withTiming(0, { duration: 150 }, () => {
      translateY.value = withTiming(0, { duration: 0 });
      opacity.value = withTiming(1, { duration: 150 });
    });
    translateY.value = withTiming(-10, { duration: 150 });
  }, [digit]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {digit}
    </Animated.Text>
  );
};

export default AnimatedDigit;
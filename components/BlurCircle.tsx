import React, { useEffect, useRef } from "react";
import { Circle } from "@shopify/react-native-skia";
import {
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";

// Updated color scheme to match dark theme with subtle accents
const BlurCircleColors = [
  "#1e293b80",  // Slate blue
  "#0f172a80",  // Dark slate
  "#64748ba0",  // Light slate
  "#2563eb60",  // Blue accent (matching your button)
  "#603d2660",
  "#1d7c77a0"
];

interface BlurCircleProps {
  cx: number;
  cy: number;
  r: number;
  delay?: number;
}

const BlurCircle: React.FC<BlurCircleProps> = ({ cx, cy, r, delay = 0 }) => {
  const colors = useRef(
    [...BlurCircleColors].sort(() => Math.random() - 0.5)
  ).current;

  const colorAnimationDuration = useRef(colors.length * 4000).current; // Slower transition
  const color = useSharedValue(0);
  const radius = useSharedValue(r);
  const radiusAnimationSize = useRef(r + r * 0.15).current; // Smaller pulsing

  const animatedColor = useDerivedValue(() =>
    interpolateColor(
      color.value,
      colors.map((_, index) => index / (colors.length - 1)),
      colors
    )
  );

  useEffect(() => {
    radius.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(radiusAnimationSize, { duration: 6000 }), // Slower animation
          withTiming(r, { duration: 6000 })
        ),
        -1
      )
    );

    color.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: colorAnimationDuration }),
          withTiming(0, { duration: colorAnimationDuration })
        ),
        -1
      )
    );
  }, [r, delay, radiusAnimationSize, colorAnimationDuration]);

  return (
    <Circle 
      cx={cx} 
      cy={cy} 
      r={radius} 
      color={animatedColor}
      opacity={0.5} // Reduced opacity for subtlety
    />
  );
};

export default BlurCircle;
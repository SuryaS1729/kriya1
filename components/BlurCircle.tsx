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
  "#bb5b1bcb",
  "#1cd1c8a0"
];

// const BlurCircleColors = [
//   "#FFB80080",  // Orange
//   "#00FFB980",  // Green
//   "#15D6D680",  // Teal
//   "#0898EC80",  // Blue
//   "#0E43EE80",  // Dark blue
// ];

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

  const colorAnimationDuration = useRef(colors.length * 3000).current; // Faster: 1000ms instead of 4000ms
  const color = useSharedValue(0);
  const radius = useSharedValue(r);
  const radiusAnimationSize = useRef(r + r * 0.15).current;

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
          withTiming(radiusAnimationSize, { duration: 3000 }), // Faster: 100ms instead of 6000ms
          withTiming(r, { duration: 3000 })
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
      opacity={0.5}
    />
  );
};

export default BlurCircle;
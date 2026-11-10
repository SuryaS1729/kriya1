import React, { useEffect, useRef } from "react";
import { Circle } from "@shopify/react-native-skia";
import {
  Easing,
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

// Richer, more saturated palette for hero surfaces (onboarding).
// Stays in a narrow teal ↔ aqua band so shifts read as subtle;
// one faint, muted saffron for a rare warm hint.
const VividBlurCircleColors = [
  "#0891b2e6",  // Aqua blue
  "#14b8a6e6",  // Teal
  "#0e7490f2",  // Deep teal
  "#06b6d4d9",  // Bright aqua
  "#c2410c59",  // Saffron hint (low alpha)
  "#0d9488e6",  // Mid teal
  "#115e59f2",  // Dark teal
];

interface BlurCircleProps {
  cx: number;
  cy: number;
  r: number;
  delay?: number;
  vivid?: boolean;
}

const BlurCircle: React.FC<BlurCircleProps> = ({ cx, cy, r, delay = 0, vivid = false }) => {
  const colors = useRef(
    [...(vivid ? VividBlurCircleColors : BlurCircleColors)].sort(() => Math.random() - 0.5)
  ).current;

  // Vivid mode moves slower and breathes less, so the brighter colors stay calm.
  const colorAnimationDuration = useRef(colors.length * (vivid ? 6000 : 3000)).current;
  const pulseDuration = vivid ? 7000 : 3000;
  const color = useSharedValue(0);
  const radius = useSharedValue(r);
  const radiusAnimationSize = useRef(r + r * (vivid ? 0.06 : 0.15)).current;

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
          withTiming(radiusAnimationSize, { duration: pulseDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(r, { duration: pulseDuration, easing: Easing.inOut(Easing.sin) })
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
  }, [r, delay, radiusAnimationSize, colorAnimationDuration, pulseDuration, color, radius]);

  return (
    <Circle 
      cx={cx} 
      cy={cy} 
      r={radius} 
      color={animatedColor}
      opacity={vivid ? 0.85 : 0.5}
    />
  );
};

export default BlurCircle;

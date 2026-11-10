import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useReducedMotion,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { usePatternComposer, type Pattern } from 'react-native-pulsar';

// ─── Timing ────────────────────────────────────────────────────────
// One cycle = three staggered hops, then a short breath before repeating.
const DOT_COUNT = 3;
const HOP_DURATION = 420;   // each dot's rise + fall
const STAGGER = 140;        // delay between neighbouring dots
const CYCLE = 1400;         // full loop, including the rest
const HOP_HEIGHT = 9;
const DOT_SIZE = 7;

// Peak of dot i lands at i * STAGGER + HOP_DURATION / 2 ms into the cycle.
const peakTime = (i: number) => i * STAGGER + HOP_DURATION / 2;

// Three crisp taps, one per dot peak, swelling left → right.
const WAVE_HAPTIC: Pattern = {
  discretePattern: [
    { time: peakTime(0), amplitude: 0.45, frequency: 0.75 },
    { time: peakTime(1), amplitude: 0.65, frequency: 0.8 },
    { time: peakTime(2), amplitude: 0.9, frequency: 0.85 },
  ],
  continuousPattern: {
    amplitude: [{ time: 0, value: 0 }],
    frequency: [{ time: 0, value: 0 }],
  },
};

type Props = {
  color: string;
  /** Turn haptics off while keeping the visual wave. */
  haptics?: boolean;
};

function Dot({ index, clock, color }: { index: number; clock: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const local = (clock.value * CYCLE - index * STAGGER) / HOP_DURATION;
    const lift = local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0;
    return {
      opacity: 0.45 + lift * 0.55,
      transform: [{ translateY: -lift * HOP_HEIGHT }, { scale: 1 + lift * 0.15 }],
    };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

export default function WaveDotsLoader({ color, haptics = true }: Props) {
  const reducedMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const { play } = usePatternComposer(WAVE_HAPTIC);

  useEffect(() => {
    if (reducedMotion) return;
    if (haptics) play(); // first cycle; later cycles fire from the reaction below
    clock.value = withRepeat(
      withTiming(1, { duration: CYCLE, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(clock);
  }, [clock, reducedMotion, haptics, play]);

  // Fire the haptic pattern at the start of every cycle, on the UI thread,
  // so the taps stay locked to the dots.
  useAnimatedReaction(
    () => clock.value,
    (current, previous) => {
      if (!haptics || reducedMotion) return;
      // The clock wraps 1 → 0 at each new cycle.
      if (previous !== null && current < previous) play();
    },
    [haptics, reducedMotion],
  );

  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <Dot key={i} index={i} clock={clock} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: DOT_SIZE + HOP_HEIGHT * 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});

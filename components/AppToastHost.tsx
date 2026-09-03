import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@react-native-vector-icons/feather/static';
import { registerAppToastHandler, type AppToastOptions, type AppToastType } from '../lib/appToast';

type ToastState = {
  id: number;
  type: AppToastType;
  text1: string;
  text2?: string;
  position: 'top' | 'bottom';
  topOffset?: number;
  bottomOffset?: number;
};

const DEFAULT_DURATION_MS = 1800;

// SKILL.md + RECIPES.md — Toast
// Gate: occasional (toast) → standard animation. Purpose: state indication.
// Tool: entering / exiting (RECIPE: Toast). Timing, not spring (no finger).
// Easing: EASE_OUT per SKILL — strong ease-out for entering/exiting.
// Duration: 300 enter / 250 exit (~20% faster exit), both under 300ms cap.
// Properties: transform + opacity only (free). Reduced motion: drop translation.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TOAST_ENTER = FadeInDown.duration(300).easing(EASE_OUT);
const TOAST_EXIT = FadeOutDown.duration(250).easing(EASE_OUT);
const TOAST_ENTER_REDUCED = FadeIn.duration(200).easing(EASE_OUT);
const TOAST_EXIT_REDUCED = FadeOut.duration(150).easing(EASE_OUT);

function colorsForType(type: AppToastType) {
  if (type === 'success') {
    return {
      bg: '#064e3b',
      border: '#065f46',
      title: '#d1fae5',
      body: '#a7f3d0',
    };
  }
  if (type === 'error') {
    return {
      bg: '#7f1d1d',
      border: '#991b1b',
      title: '#fee2e2',
      body: '#fecaca',
    };
  }
  return {
    bg: '#374151',
    border: '#4b5563',
    title: '#e5e7eb',
    body: '#d1d5db',
  };
}

export default function AppToastHost() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const show = useCallback((options: AppToastOptions) => {
    clearTimer();
    const duration = Math.max(250, options.duration ?? DEFAULT_DURATION_MS);
    idRef.current += 1;
    setToast({
      id: idRef.current,
      type: options.type ?? 'info',
      text1: options.text1,
      text2: options.text2,
      position: options.position ?? 'bottom',
      topOffset: options.topOffset,
      bottomOffset: options.bottomOffset,
    });
    hideTimerRef.current = setTimeout(hide, duration);
  }, [clearTimer, hide]);

  useEffect(() => {
    registerAppToastHandler({ show, hide });
    return () => {
      registerAppToastHandler(null);
      clearTimer();
    };
  }, [show, hide, clearTimer]);

  const palette = useMemo(() => colorsForType(toast?.type ?? 'info'), [toast?.type]);

  const entering = reducedMotion ? TOAST_ENTER_REDUCED : TOAST_ENTER;
  const exiting = reducedMotion ? TOAST_EXIT_REDUCED : TOAST_EXIT;

  // Safe-area aware anchors — RECIPES: "Safe area insets, always."
  const anchorStyle = toast
    ? toast.position === 'top'
      ? { top: toast.topOffset ?? insets.top + 12 }
      : { bottom: toast.bottomOffset ?? insets.bottom + 16 }
    : undefined;

  // Pill content: single line when possible — text2 is optional secondary
  const pillText = useMemo(() => {
    if (!toast) return '';
    // Keep pill short — combine if both exist, but callers should already send short copy
    return toast.text2 ? `${toast.text1} · ${toast.text2}` : toast.text1;
  }, [toast]);

  const iconName = useMemo(() => {
    if (toast?.type === 'success') return 'check-circle' as const;
    if (toast?.type === 'error') return 'alert-circle' as const;
    return 'info' as const;
  }, [toast?.type]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {toast ? (
        <View style={[styles.anchor, anchorStyle]}>
          <Animated.View
            key={toast.id}
            entering={entering}
            exiting={exiting}
            style={[
              styles.card,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
              },
            ]}
          >
            <Feather name={iconName} size={14} color={palette.title} />
            <Text numberOfLines={1} style={[styles.title, { color: palette.title }]}>
              {pillText}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  card: {
    // Pill — short, centered, not full-width
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '92%',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Source Serif Pro',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  body: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Source Serif Pro',
  },
});

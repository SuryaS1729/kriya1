import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { registerAppToastHandler, type AppToastOptions, type AppToastType } from '../lib/appToast';

type ToastState = {
  type: AppToastType;
  text1: string;
  text2?: string;
  position: 'top' | 'bottom';
  topOffset: number;
  bottomOffset: number;
};

const DEFAULT_DURATION_MS = 1800;
const DEFAULT_TOP_OFFSET = 64;
const DEFAULT_BOTTOM_OFFSET = 80;

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
  const [toast, setToast] = useState<ToastState | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    opacity.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(10, { duration: 140, easing: Easing.out(Easing.cubic) });
    unmountTimerRef.current = setTimeout(() => {
      setToast(null);
      unmountTimerRef.current = null;
    }, 160);
  }, [clearTimers, opacity, translateY]);

  const show = useCallback((options: AppToastOptions) => {
    clearTimers();
    const duration = Math.max(250, options.duration ?? DEFAULT_DURATION_MS);
    setToast({
      type: options.type ?? 'info',
      text1: options.text1,
      text2: options.text2,
      position: options.position ?? 'bottom',
      topOffset: options.topOffset ?? DEFAULT_TOP_OFFSET,
      bottomOffset: options.bottomOffset ?? DEFAULT_BOTTOM_OFFSET,
    });
    opacity.value = 0;
    translateY.value = 14;
    requestAnimationFrame(() => {
      opacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.cubic) });
    });
    hideTimerRef.current = setTimeout(hide, duration);
  }, [clearTimers, hide, opacity, translateY]);

  useEffect(() => {
    registerAppToastHandler({ show, hide });
    return () => {
      registerAppToastHandler(null);
      clearTimers();
    };
  }, [show, hide, clearTimers]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const palette = useMemo(() => colorsForType(toast?.type ?? 'info'), [toast?.type]);

  if (!toast) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.anchor,
          toast.position === 'top'
            ? { top: toast.topOffset }
            : { bottom: toast.bottomOffset },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: palette.bg,
              borderColor: palette.border,
            },
            animatedStyle,
          ]}
        >
          <Text style={[styles.title, { color: palette.title }]}>{toast.text1}</Text>
          {toast.text2 ? (
            <Text style={[styles.body, { color: palette.body }]}>{toast.text2}</Text>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Source Serif Pro',
    fontWeight: '600',
  },
  body: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Source Serif Pro',
  },
});

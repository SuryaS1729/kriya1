import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, StatusBar, Platform, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import BlurBackground from '../../components/BlurBackground';
import { useKriya } from '../../lib/store';
import { buttonPressHaptic, selectionHaptic } from '../../lib/haptics';
import { hideSplash } from '../../lib/splash';

import {
  themes,
  CONTEMPLATION_DELAY,
  GITA_IMAGE_URL,
  ADD_TASKS_VIDEO_URL,
  COMPLETE_TASKS_VIDEO_URL,
  VOICE_BY_SARVAM_VIDEO_URL,
  AUDIO_FADE_OUT_DURATION,
  onboardingSteps,
} from '../../lib/onboarding/constants';
import { useAmbientAudio } from '../../lib/onboarding/useAmbientAudio';
import WelcomeScreen from './WelcomeScreen';
import OnboardingPager from './OnboardingPager';
import LoadingScreen from './LoadingScreen';

type Phase = 'welcome' | 'onboarding' | 'loading';

// ─── Teal → slate hand-off ─────────────────────────────────────────
// Onboarding opens in teal and drifts toward the main app's slate-blue
// as the user swipes, so landing on the home screen feels continuous.
// Same gradient as the home screen in app/index.tsx.
const SLATE_GRADIENT = {
  dark: ['#2e455fff', '#000000ff'] as const,
  light: ['#ffffffd2', '#ced7ec'] as const,
};
const SLATE_FIRST_PAGE = 0.12; // first feature page: a faint hint
const SLATE_LAST_PAGE = 0.7;   // reminder page: mostly slate
const SLATE_LOADING = 0.92;    // painting/loading screen: almost there
const SLATE_EASE = Easing.bezier(0.33, 1, 0.68, 1);

export default function Onboarding() {
  // ─── Store ─────────────────────────────────────────────────────
  const isDarkMode = useKriya(s => s.isDarkMode);
  const reminderTime = useKriya(s => s.reminderTime);
  const completeOnboarding = useKriya(s => s.completeOnboarding);
  const setReminderTime = useKriya(s => s.setReminderTime);
  const initializeNotifications = useKriya(s => s.initializeNotifications);

  const theme = isDarkMode ? themes.dark : themes.light;

  // ─── Local state ───────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('welcome');
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    const t = new Date();
    t.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    return t;
  });

  // ─── Slate overlay ─────────────────────────────────────────────
  const slate = useSharedValue(0);

  useEffect(() => {
    if (phase === 'onboarding') {
      slate.set(withTiming(SLATE_FIRST_PAGE, { duration: 600, easing: SLATE_EASE }));
    } else if (phase === 'loading') {
      slate.set(withTiming(SLATE_LOADING, { duration: 1800, easing: SLATE_EASE }));
    }
  }, [phase, slate]);

  const handleScrollProgress = useCallback(
    (progress: number) => {
      // Follows the finger directly — no timing, so it tracks the swipe.
      slate.set(SLATE_FIRST_PAGE + progress * (SLATE_LAST_PAGE - SLATE_FIRST_PAGE));
    },
    [slate],
  );

  const slateStyle = useAnimatedStyle(() => ({ opacity: slate.value }));

  // ─── Audio ─────────────────────────────────────────────────────
  const { fadeOut, setDucked } = useAmbientAudio();

  // ─── Asset prefetch ────────────────────────────────────────────
  // Create video players while the user is still on the welcome screen,
  // so buffering starts before the pager mounts and slides appear instantly.
  // Every player mixes with others: by default a starting video takes
  // audio focus, which silenced the ambient track as soon as the first
  // slide played. The first two clips have silent audio tracks, so they're
  // muted outright; the voice demo keeps its sound.
  const addTasksPlayer = useVideoPlayer(ADD_TASKS_VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });
  const completeTasksPlayer = useVideoPlayer(COMPLETE_TASKS_VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = 'mixWithOthers';
  });
  const voicePlayer = useVideoPlayer(VOICE_BY_SARVAM_VIDEO_URL, (p) => {
    p.loop = true;
    p.audioMixingMode = 'mixWithOthers';
  });

  const players = useMemo(
    () => ({
      [ADD_TASKS_VIDEO_URL]: addTasksPlayer,
      [COMPLETE_TASKS_VIDEO_URL]: completeTasksPlayer,
      [VOICE_BY_SARVAM_VIDEO_URL]: voicePlayer,
    }),
    [addTasksPlayer, completeTasksPlayer, voicePlayer],
  );

  // Reveal onboarding from the native splash (fresh installs land here).
  useEffect(() => {
    hideSplash();
  }, []);

  // Warm the loading-screen image cache during welcome too.
  useEffect(() => {
    RNImage.prefetch(GITA_IMAGE_URL).catch(() => {});
  }, []);

  // ─── Callbacks ─────────────────────────────────────────────────
  const handleBeginJourney = useCallback(() => {
    setPhase('onboarding');
  }, []);

  const finishOnboarding = useCallback(() => {
    setPhase('loading');
    setDucked(false);

    // Keep the ambient track through the Partha-Sarathi screen; fade it out
    // only as we hand off to the main app.
    setTimeout(fadeOut, Math.max(0, CONTEMPLATION_DELAY - AUDIO_FADE_OUT_DURATION));
    setTimeout(() => {
      completeOnboarding();
      router.replace('/');
    }, CONTEMPLATION_DELAY);
  }, [fadeOut, setDucked, completeOnboarding]);

  // Duck the ambient bed while the voice demo (which has real audio) plays.
  const handleActivePageChange = useCallback(
    (page: number) => {
      const step = onboardingSteps[page];
      setDucked(step?.type === 'feature' && step.videoUrl === VOICE_BY_SARVAM_VIDEO_URL);
    },
    [setDucked],
  );

  const handleSaveReminder = useCallback(async () => {
    // User explicitly tapped "Set Reminder" → save time + request permission
    // here and now. Skip users never reach this (Skip → onFinish directly),
    // and since the store defaults to disabled, index.tsx won't prompt them.
    setIsSavingReminder(true);
    try {
      await setReminderTime(selectedTime.getHours(), selectedTime.getMinutes());
      await initializeNotifications();
    } finally {
      setIsSavingReminder(false);
    }
  }, [selectedTime, setReminderTime, initializeNotifications]);

  const handleOpenTimePicker = useCallback(() => {
    buttonPressHaptic();
    setShowPicker(true);
  }, []);

  const handleValueChange = useCallback(
    (_event: any, date: Date) => {
      if (Platform.OS === 'android') setShowPicker(false);
      setSelectedTime(date);
      selectionHaptic();
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    setShowPicker(false);
  }, []);

  // ─── Render ────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar hidden />

      <View style={StyleSheet.absoluteFill}>
        <BlurBackground vivid />
      </View>

      <View style={[styles.overlay, { backgroundColor: theme.overlay }]} />

      <Animated.View pointerEvents="none" style={[styles.overlay, slateStyle]}>
        <LinearGradient
          colors={isDarkMode ? SLATE_GRADIENT.dark : SLATE_GRADIENT.light}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        {phase === 'welcome' && (
          <WelcomeScreen theme={theme} onBegin={handleBeginJourney} />
        )}

        {phase === 'onboarding' && (
          <OnboardingPager
            theme={theme}
            isDarkMode={isDarkMode}
            selectedTime={selectedTime}
            showPicker={showPicker}
            isSavingReminder={isSavingReminder}
            players={players}
            onValueChange={handleValueChange}
            onDismiss={handleDismiss}
            onOpenTimePicker={handleOpenTimePicker}
            onSaveReminder={handleSaveReminder}
            onFinish={finishOnboarding}
            onScrollProgress={handleScrollProgress}
            onActivePageChange={handleActivePageChange}
          />
        )}

        {phase === 'loading' && <LoadingScreen theme={theme} />}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
  },
});

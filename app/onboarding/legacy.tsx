import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, StatusBar, Platform, Image as RNImage } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useVideoPlayer } from 'expo-video';
import BlurBackground from '../../components/BlurBackground';
import { useKriya } from '../../lib/store';
import { buttonPressHaptic, selectionHaptic } from '../../lib/haptics';

import {
  themes,
  CONTEMPLATION_DELAY,
  GITA_IMAGE_URL,
  ADD_TASKS_VIDEO_URL,
  COMPLETE_TASKS_VIDEO_URL,
  VOICE_BY_SARVAM_VIDEO_URL,
} from '../../lib/onboarding/constants';
import { useAmbientAudio } from '../../lib/onboarding/useAmbientAudio';
import WelcomeScreen from './WelcomeScreen';
import OnboardingPager from './OnboardingPager';
import LoadingScreen from './LoadingScreen';

type Phase = 'welcome' | 'onboarding' | 'loading';

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

  // ─── Audio ─────────────────────────────────────────────────────
  const { fadeOut } = useAmbientAudio();

  // ─── Asset prefetch ────────────────────────────────────────────
  // Create video players while the user is still on the welcome screen,
  // so buffering starts before the pager mounts and slides appear instantly.
  const addTasksPlayer = useVideoPlayer(ADD_TASKS_VIDEO_URL, (p) => {
    p.loop = true;
  });
  const completeTasksPlayer = useVideoPlayer(COMPLETE_TASKS_VIDEO_URL, (p) => {
    p.loop = true;
  });
  const voicePlayer = useVideoPlayer(VOICE_BY_SARVAM_VIDEO_URL, (p) => {
    p.loop = true;
  });

  const players = useMemo(
    () => ({
      [ADD_TASKS_VIDEO_URL]: addTasksPlayer,
      [COMPLETE_TASKS_VIDEO_URL]: completeTasksPlayer,
      [VOICE_BY_SARVAM_VIDEO_URL]: voicePlayer,
    }),
    [addTasksPlayer, completeTasksPlayer, voicePlayer],
  );

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
    fadeOut();

    setTimeout(() => {
      completeOnboarding();
      router.replace('/');
    }, CONTEMPLATION_DELAY);
  }, [fadeOut, completeOnboarding]);

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
        <BlurBackground />
      </View>

      <View style={[styles.overlay, { backgroundColor: theme.overlay }]} />

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

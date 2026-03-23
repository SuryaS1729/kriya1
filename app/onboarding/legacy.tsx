import React, { useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import BlurBackground from '../../components/BlurBackground';
import { useKriya } from '../../lib/store';
import { buttonPressHaptic, selectionHaptic } from '../../lib/haptics';

import { themes, CONTEMPLATION_DELAY } from '../../lib/onboarding/constants';
import { useAmbientAudio } from '../../lib/onboarding/useAmbientAudio';
import WelcomeScreen from './WelcomeScreen';
import OnboardingPager from './OnboardingPager';
import LoadingScreen from './LoadingScreen';

type Phase = 'welcome' | 'onboarding' | 'loading';

export default function Onboarding() {
  // ─── Store ─────────────────────────────────────────────────────
  const isDarkMode = useKriya(s => s.isDarkMode);
  const reminderTime = useKriya(s => s.reminderTime);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
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
    setIsSavingReminder(true);
    try {
      await setReminderTime(selectedTime.getHours(), selectedTime.getMinutes());
      if (notificationsEnabled) {
        await initializeNotifications();
      }
    } finally {
      setIsSavingReminder(false);
    }
  }, [selectedTime, notificationsEnabled, setReminderTime, initializeNotifications]);

  const handleOpenTimePicker = useCallback(() => {
    buttonPressHaptic();
    setShowPicker(true);
  }, []);

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, time?: Date) => {
      if (Platform.OS === 'android') setShowPicker(false);
      if (event.type === 'dismissed' || !time) return;
      setSelectedTime(time);
      selectionHaptic();
    },
    [],
  );

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
            onTimeChange={handleTimeChange}
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
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
});

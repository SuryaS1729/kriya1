import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import PagerView from 'react-native-pager-view';
import type { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { PressableScale } from 'pressto';
import AntDesign from "@react-native-vector-icons/ant-design/static";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
  FadeIn,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';

import type { VideoPlayer } from 'expo-video';
import {
  onboardingSteps,
  Theme,
} from '../../lib/onboarding/constants';
import FeatureSlide from './FeatureSlide';
import ReminderSlide from './ReminderSlide';
import { buttonPressHaptic, selectionHaptic } from '../../lib/haptics';

type OnboardingPagerProps = {
  theme: Theme;
  isDarkMode: boolean;
  selectedTime: Date;
  showPicker: boolean;
  isSavingReminder: boolean;
  players?: Record<string, VideoPlayer | null>;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  onOpenTimePicker: () => void;
  onSaveReminder: () => Promise<void>;
  onFinish: () => void;
};

export default function OnboardingPager({
  theme,
  isDarkMode,
  selectedTime,
  showPicker,
  isSavingReminder,
  players,
  onValueChange,
  onDismiss,
  onOpenTimePicker,
  onSaveReminder,
  onFinish,
}: OnboardingPagerProps) {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const reducedMotion = useReducedMotion();

  const contentOpacity = useSharedValue(0);

  // Fade in on mount — short, spec curve; instant under reduced motion.
  React.useEffect(() => {
    contentOpacity.value = withTiming(1, {
      duration: reducedMotion ? 0 : 250,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
    });
  }, [contentOpacity, reducedMotion]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const onPageSelected = useCallback(
    (e: PagerViewOnPageSelectedEvent) => {
      const page = e.nativeEvent.position;
      setCurrentPage(page);
      selectionHaptic();
    },
    [],
  );

  const goBack = () => {
    if (currentPage > 0) {
      buttonPressHaptic();
      pagerRef.current?.setPage(currentPage - 1);
    }
  };

  const goNext = async () => {
    if (isSavingReminder) return;
    buttonPressHaptic();

    const step = onboardingSteps[currentPage];

    // If this is the reminder step, save before advancing.
    if (step.type === 'reminder') {
      await onSaveReminder();
    }

    if (currentPage >= onboardingSteps.length - 1) {
      onFinish();
    } else {
      pagerRef.current?.setPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    selectionHaptic();
    onFinish();
  };

  const activeStep = onboardingSteps[currentPage];
  const isReminderStep = activeStep.type === 'reminder';
  const isLastStep = currentPage >= onboardingSteps.length - 1;

  return (
    <Animated.View style={[styles.container, animatedContentStyle]}>
      {/* Pager */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        {onboardingSteps.map((step, index) => (
          <View key={index} style={styles.pageContainer}>
            {step.type === 'reminder' ? (
              <ReminderSlide
                step={step}
                theme={theme}
                isDarkMode={isDarkMode}
                selectedTime={selectedTime}
                showPicker={showPicker}
                onValueChange={onValueChange}
                onDismiss={onDismiss}
                onOpenTimePicker={onOpenTimePicker}
              />
            ) : (
              <FeatureSlide
                step={step}
                theme={theme}
                isActive={index === currentPage}
                player={step.videoUrl ? players?.[step.videoUrl] ?? null : null}
              />
            )}
          </View>
        ))}
      </PagerView>

      {/* Progress dots — state-driven, so a CSS transition on
          transform/opacity only (no layout props animated). */}
      <View style={styles.progressContainer}>
        {onboardingSteps.map((_, index) => {
          const isActive = index === currentPage;
          return (
            <Animated.View
              key={index}
              style={[
                styles.progressDot,
                { backgroundColor: isActive ? theme.text : theme.progressDot },
                !reducedMotion && {
                  transitionProperty: ['transform', 'opacity'],
                  transitionDuration: 150,
                },
                {
                  opacity: isActive ? 1 : 0.6,
                  transform: [{ scale: isActive ? 1.5 : 1 }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Navigation bar */}
      <Animated.View
        entering={FadeIn.delay(100)
          .duration(250)
          .reduceMotion(ReduceMotion.System)}
        style={styles.navigationContainer}
      >
        {/* Back button — hidden on first page */}
        {currentPage > 0 ? (
          <PressableScale
            onPress={goBack}
            rippleColor="transparent"
            style={styles.navSideButton}
          >
            <AntDesign name="arrow-left" size={20} color={theme.textTertiary} />
          </PressableScale>
        ) : (
          <View style={styles.navSideButton} />
        )}

        {/* Center: Next / Set Reminder */}
        <PressableScale
          onPress={isSavingReminder ? undefined : goNext}
          rippleColor="transparent"
          style={[
            styles.nextButton,
            {
              backgroundColor: theme.buttonBackgroundSecondary,
              borderColor: theme.border,
              opacity: isSavingReminder ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.nextText, { color: theme.text }]}>
            {isReminderStep
              ? isSavingReminder
                ? 'Saving...'
                : 'Set Reminder'
              : isLastStep
                ? 'Finish'
                : 'Next'}
          </Text>
          <AntDesign name="arrow-right" size={20} color={theme.text} />
        </PressableScale>

        {/* Skip button */}
        <PressableScale
          onPress={handleSkip}
          rippleColor="transparent"
          style={styles.navSideButton}
        >
          <Text style={[styles.skipText, { color: theme.textTertiary }]}>Skip</Text>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    paddingTop: 10,
  },
  navSideButton: {
    width: 60,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: 'Space Mono',
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Space Mono',
  },
});

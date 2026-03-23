import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import PagerView from 'react-native-pager-view';
import type { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { PressableScale } from 'pressto';
import AntDesign from '@expo/vector-icons/AntDesign';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';

import {
  onboardingSteps,
  Theme,
  FADE_DURATION,
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
  onTimeChange: (event: DateTimePickerEvent, time?: Date) => void;
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
  onTimeChange,
  onOpenTimePicker,
  onSaveReminder,
  onFinish,
}: OnboardingPagerProps) {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const contentOpacity = useSharedValue(0);

  // Fade in on mount.
  React.useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: FADE_DURATION });
  }, [contentOpacity]);

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
                onTimeChange={onTimeChange}
                onOpenTimePicker={onOpenTimePicker}
              />
            ) : (
              <FeatureSlide step={step} theme={theme} />
            )}
          </View>
        ))}
      </PagerView>

      {/* Progress dots */}
      <View style={styles.progressContainer}>
        {onboardingSteps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              { backgroundColor: theme.progressDot },
              index === currentPage && {
                backgroundColor: theme.text,
                width: 12,
                height: 12,
                borderRadius: 6,
              },
            ]}
          />
        ))}
      </View>

      {/* Navigation bar */}
      <Animated.View
        entering={FadeIn.delay(300).duration(FADE_DURATION)}
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

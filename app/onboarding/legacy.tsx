import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useAudioPlayer } from 'expo-audio';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from 'pressto';

import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../../lib/haptics';
import BlurBackground from '../../components/BlurBackground';
import { useKriya } from '../../lib/store';
import { Spinner } from '@/components/ui/spinner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const themes = {
  dark: {
    background: '#0a6b7add',
    overlay: 'rgba(0, 0, 0, 0.3)',
    text: 'white',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.7)',
    textQuaternary: 'rgba(255, 255, 255, 0.6)',
    cardBackground: 'rgba(0, 12, 26, 0.26)',
    buttonBackground: 'rgba(0, 67, 76, 1)',
    buttonBackgroundSecondary: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.3)',
    borderSecondary: 'rgba(255, 255, 255, 0.2)',
    progressDot: 'rgba(255, 255, 255, 0.3)',
    timePickerBackground: 'rgba(0, 0, 0, 0.07)',
    selectedTimeBackground: 'rgba(255, 255, 255, 0.2)',
    arrowColor: 'rgba(19, 202, 244, 0.58)',
    spinnerColor: '#0ccebe5e',
    imageFallbackBackground: 'rgba(255, 255, 255, 0.1)',
  },
  light: {
    background: '#e8f4f8',
    overlay: 'rgba(76, 121, 180, 0.22)',
    text: '#2b4971ff',
    textSecondary: 'rgba(26, 54, 93, 0.8)',
    textTertiary: 'rgba(26, 54, 93, 0.7)',
    textQuaternary: 'rgba(26, 54, 93, 0.6)',
    cardBackground: 'rgba(203, 240, 241, 0.53)',
    buttonBackground: 'rgba(209, 234, 238, 0.94)',
    buttonBackgroundSecondary: 'rgba(26, 54, 93, 0.1)',
    border: 'rgba(26, 54, 93, 0.3)',
    borderSecondary: 'rgba(26, 54, 93, 0.2)',
    progressDot: 'rgba(26, 54, 93, 0.3)',
    timePickerBackground: 'rgba(255, 255, 255, 0.09)',
    selectedTimeBackground: 'rgba(26, 54, 93, 0.15)',
    arrowColor: 'rgba(37, 188, 208, 0.7)',
    spinnerColor: '#0ccebe',
    imageFallbackBackground: 'rgba(26, 54, 93, 0.1)',
  },
};

type Theme = typeof themes.dark;

type FeatureStep = {
  type: 'feature';
  title: string;
  description: string;
  icon: React.ComponentProps<typeof AntDesign>['name'];
};

type ReminderStep = {
  type: 'reminder';
  title: string;
  description: string;
};

type OnboardingStep = FeatureStep | ReminderStep;

const onboardingSteps: OnboardingStep[] = [
  {
    type: 'feature',
    title: 'Add Your Tasks',
    description:
      'Create your daily to-do list just like any other task app. Simple, clean, and focused on what matters to you.',
    icon: 'check-circle',
  },
  {
    type: 'feature',
    title: 'Complete & Learn',
    description:
      'Every time you check off a task, unlock a new verse from the Bhagavad Gita. Transform productivity into spiritual growth.',
    icon: 'book',
  },
  {
    type: 'feature',
    title: 'Action Meets Wisdom',
    description:
      "Follow Krishna's teaching of 'Kriya' - taking action. Complete the entire Gita while building meaningful habits in your life.",
    icon: 'star',
  },
  {
    type: 'reminder',
    title: 'When do you start your day?',
    description:
      "Kriya expects you to write down tasks just before you begin your day. We'll save your preferred time and ask for notification permission when you continue.",
  },
  {
    type: 'feature',
    title: 'Offline & Private',
    description:
      'Everything works offline. No signup required. Your spiritual journey remains completely private.',
    icon: 'lock',
  },
];

type NotificationSlideProps = {
  theme: Theme;
  isDarkMode: boolean;
  selectedTime: Date;
  showPicker: boolean;
  onTimeChange: (event: DateTimePickerEvent, time?: Date) => void;
  onOpenTimePicker: () => void;
};

const NotificationSlide = ({
  theme,
  isDarkMode,
  selectedTime,
  showPicker,
  onTimeChange,
  onOpenTimePicker,
}: NotificationSlideProps) => {
  const getReminderTime = () => {
    const reminderTime = new Date(selectedTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 10);

    return reminderTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDisplayTime = () =>
    selectedTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <View style={styles.notificationContent}>
      <Feather name="bell" size={60} color={theme.text} style={styles.stepIcon} />

      <Text style={[styles.stepTitle, { color: theme.text }]}>When do you start your day?</Text>

      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Kriya expects you to write down tasks just before you begin your day. We&apos;ll save
        your preferred time and ask for notification permission when you continue.
      </Text>

      <View
        style={[
          styles.timePickerContainer,
          {
            backgroundColor: theme.timePickerBackground,
            borderColor: theme.borderSecondary,
          },
        ]}
      >
        <Text style={[styles.timePickerLabel, { color: theme.text }]}>
          I usually start my day at:
        </Text>

        {Platform.OS === 'ios' ? (
          <View style={styles.iosTimePickerContainer}>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="compact"
              onChange={onTimeChange}
              style={styles.iosTimePicker}
              textColor={theme.text}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          </View>
        ) : (
          <View style={styles.androidTimePickerContainer}>
            <TouchableOpacity
              onPress={onOpenTimePicker}
              style={[
                styles.androidTimeButton,
                {
                  backgroundColor: theme.selectedTimeBackground,
                  borderColor: theme.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.androidTimeText, { color: theme.text }]}>{getDisplayTime()}</Text>
              <Feather name="clock" size={20} color={theme.text} />
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={onTimeChange}
                is24Hour={false}
              />
            )}
          </View>
        )}

        <Text style={[styles.reminderNote, { color: theme.textQuaternary }]}>
          You&apos;ll receive a reminder at {getReminderTime()} (10 minutes before)
        </Text>
      </View>
    </View>
  );
};

export default function Onboarding() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const reminderTime = useKriya(s => s.reminderTime);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  const completeOnboarding = useKriya(s => s.completeOnboarding);
  const setReminderTime = useKriya(s => s.setReminderTime);
  const initializeNotifications = useKriya(s => s.initializeNotifications);

  const theme = isDarkMode ? themes.dark : themes.light;
  const [currentStep, setCurrentStep] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingReminder, setIsSavingReminder] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState('Act on your dharma...');
  const [selectedTime, setSelectedTime] = useState(() => {
    const initialTime = new Date();
    initialTime.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    return initialTime;
  });

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRefs = useRef<ReturnType<typeof setInterval>[]>([]);
  const isMountedRef = useRef(true);

  const audioPlayer = useAudioPlayer(
    'https://pub-4862ee5d51df47c4849ba812da5460ff.r2.dev/Drifting_Echoes_j5fudj.aac'
  );
  const imageUrl =
    'https://pub-4862ee5d51df47c4849ba812da5460ff.r2.dev/hflxxtpxtyrhrcteczzn_w1ll3e.webp';

  const stepOpacity = useSharedValue(0);
  const navigationOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const subtitleOpacity = useSharedValue(1);
  const subtitleTranslateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const chevronTranslateY = useSharedValue(0);
  const loadingOpacity = useSharedValue(0);
  const loadingScale = useSharedValue(0.8);
  const shimmerTranslateX = useSharedValue(-200);
  const loadingTextOpacity = useSharedValue(0);

  const loadingTexts = [
    'Act on your dharma...',
    'One task at a time...',
    'Your journey begins now...',
  ];

  const activeStep = currentStep >= 0 ? onboardingSteps[currentStep] : null;
  const isReminderStep = activeStep?.type === 'reminder';

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  };

  const scheduleInterval = (callback: () => void, delay: number) => {
    const intervalId = setInterval(callback, delay);
    intervalRefs.current.push(intervalId);
    return intervalId;
  };

  const clearScheduledWork = () => {
    timeoutRefs.current.forEach(clearTimeout);
    intervalRefs.current.forEach(clearInterval);
    timeoutRefs.current = [];
    intervalRefs.current = [];
  };

  const safelyPauseAudio = useCallback((player = audioPlayer) => {
    if (!player || !isMountedRef.current) {
      return;
    }

    try {
      player.pause();
    } catch {
      // The native player may already be released during teardown.
    }
  }, [audioPlayer]);

  useEffect(() => {
    const newTime = new Date();
    newTime.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    setSelectedTime(newTime);
  }, [reminderTime]);

  useEffect(() => {
    isMountedRef.current = true;
    let isMounted = true;

    const startAmbientAudio = async () => {
      try {
        if (!audioPlayer || !isMounted) {
          return;
        }

        scheduleTimeout(() => {
          if (!isMounted || !audioPlayer) {
            return;
          }

          audioPlayer.loop = true;
          audioPlayer.volume = 0.05;
          audioPlayer.play();

          let currentVolume = 0.05;
          const targetVolume = 0.25;
          const fadeStep = (targetVolume - 0.05) / 45;

          const fadeInterval = scheduleInterval(() => {
            if (!audioPlayer) {
              return;
            }

            if (currentVolume < targetVolume) {
              currentVolume += fadeStep;
              audioPlayer.volume = Math.min(currentVolume, targetVolume);
              return;
            }

            clearInterval(fadeInterval);
            intervalRefs.current = intervalRefs.current.filter(id => id !== fadeInterval);
          }, 33);
        }, 1000);
      } catch {
        // Ignore ambient audio failures during onboarding.
      }
    };

    startAmbientAudio();

    return () => {
      isMounted = false;
    };
  }, [audioPlayer]);

  useEffect(() => {
    chevronTranslateY.value = withRepeat(
      withSequence(withTiming(4, { duration: 1200 }), withTiming(0, { duration: 1200 })),
      -1,
      false
    );
  }, [chevronTranslateY]);

  useEffect(() => {
    const timer = scheduleTimeout(() => {
      shimmerTranslateX.value = -200;
      shimmerTranslateX.value = withRepeat(
        withSequence(
          withTiming(-200, { duration: 0 }),
          withTiming(400, { duration: 1700 }),
          withTiming(400, { duration: 2000 })
        ),
        -1,
        false
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [shimmerTranslateX]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearScheduledWork();
    };
  }, []);

  const fadeOutAudio = () => {
    if (!audioPlayer) {
      return;
    }

    try {
      const currentVolume = audioPlayer.volume || 0;
      if (currentVolume <= 0) {
        safelyPauseAudio();
        return;
      }

      const steps = 20;
      const volumeDecrement = currentVolume / steps;

      const fadeOutInterval = scheduleInterval(() => {
        const nextVolume = (audioPlayer.volume || 0) - volumeDecrement;
        if (nextVolume > 0) {
          audioPlayer.volume = Math.max(nextVolume, 0);
          return;
        }

        audioPlayer.volume = 0;
        safelyPauseAudio();
        clearInterval(fadeOutInterval);
        intervalRefs.current = intervalRefs.current.filter(id => id !== fadeOutInterval);
      }, 30);
    } catch {
      // Ignore ambient audio failures during onboarding.
    }
  };

  const startLoadingTextCycle = () => {
    setCurrentLoadingText(loadingTexts[0]);
    loadingTextOpacity.value = withTiming(1, { duration: 600 });

    scheduleTimeout(() => {
      loadingTextOpacity.value = withTiming(0, { duration: 400 });
    }, 2000);

    scheduleTimeout(() => {
      setCurrentLoadingText(loadingTexts[1]);
      loadingTextOpacity.value = withTiming(1, { duration: 400 });
    }, 2400);

    scheduleTimeout(() => {
      loadingTextOpacity.value = withTiming(0, { duration: 400 });
    }, 6400);

    scheduleTimeout(() => {
      setCurrentLoadingText(loadingTexts[2]);
      loadingTextOpacity.value = withTiming(1, { duration: 400 });
    }, 6800);
  };

  const animateToOnboarding = () => {
    titleTranslateY.value = withTiming(-200, { duration: 800 });
    titleOpacity.value = withTiming(0, { duration: 600 });
    subtitleTranslateY.value = withTiming(-100, { duration: 700 });
    subtitleOpacity.value = withTiming(0, { duration: 500 });
    cardTranslateY.value = withTiming(300, { duration: 800 });
    cardOpacity.value = withTiming(0, { duration: 600 });

    scheduleTimeout(() => {
      setCurrentStep(0);
      stepOpacity.value = withTiming(1, { duration: 800 });

      scheduleTimeout(() => {
        navigationOpacity.value = withTiming(1, { duration: 600 });
      }, 300);
    }, 800);
  };

  const finishOnboarding = () => {
    setIsLoading(true);
    stepOpacity.value = withTiming(0, { duration: 500 });
    navigationOpacity.value = withTiming(0, { duration: 500 });
    fadeOutAudio();

    scheduleTimeout(() => {
      loadingOpacity.value = withTiming(1, { duration: 600 });
      loadingScale.value = withTiming(1, { duration: 600 });
      startLoadingTextCycle();

      scheduleTimeout(() => {
        completeOnboarding();
        loadingOpacity.value = withTiming(0, { duration: 800 });

        scheduleTimeout(() => {
          router.replace('/');
        }, 800);
      }, 12000);
    }, 500);
  };

  const handleGetStarted = () => {
    taskCompleteHaptic();
    animateToOnboarding();
  };

  const advanceToNextStep = () => {
    if (currentStep >= onboardingSteps.length - 1) {
      finishOnboarding();
      return;
    }

    stepOpacity.value = withTiming(0, { duration: 300 });
    scheduleTimeout(() => {
      setCurrentStep(prev => prev + 1);
      stepOpacity.value = withTiming(1, { duration: 500 });
    }, 300);
  };

  const handleNext = async () => {
    if (isSavingReminder) {
      return;
    }

    buttonPressHaptic();

    if (activeStep?.type === 'reminder') {
      setIsSavingReminder(true);
      try {
        await setReminderTime(selectedTime.getHours(), selectedTime.getMinutes());
        if (notificationsEnabled) {
          await initializeNotifications();
        }
      } finally {
        setIsSavingReminder(false);
      }
    }

    advanceToNextStep();
  };

  const handleSkip = () => {
    selectionHaptic();
    finishOnboarding();
  };

  const handleOpenTimePicker = () => {
    buttonPressHaptic();
    setShowPicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed' || !time) {
      return;
    }

    setSelectedTime(time);
    selectionHaptic();
  };

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  const animatedSubtitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: subtitleTranslateY.value }],
    opacity: subtitleOpacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardTranslateY.value }],
    opacity: cardOpacity.value,
  }));

  const animatedStepStyle = useAnimatedStyle(() => ({
    opacity: stepOpacity.value,
  }));

  const animatedNavigationStyle = useAnimatedStyle(() => ({
    opacity: navigationOpacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chevronTranslateY.value }],
  }));

  const animatedLoadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    transform: [{ scale: loadingScale.value }],
  }));

  const animatedLoadingTextStyle = useAnimatedStyle(() => ({
    opacity: loadingTextOpacity.value,
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar hidden />

      <Animated.View style={StyleSheet.absoluteFill}>
        <BlurBackground />
      </Animated.View>

      <View style={[styles.overlay, { backgroundColor: theme.overlay }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[styles.titleContainer, animatedTitleStyle]}>
            <Text style={[styles.title, { color: theme.text }]}>kriya</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>
              ancient wisdom, modern rhythm
            </Text>
          </Animated.View>

          {currentStep === -1 && !isLoading && (
            <Animated.View
              style={[
                styles.subtitleContainer,
                animatedSubtitleStyle,
                { borderColor: theme.text },
              ]}
            >
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                free • offline • no signup • open source
              </Text>
            </Animated.View>
          )}

          {currentStep >= 0 && activeStep && !isLoading && (
            <Animated.View style={[styles.onboardingContainer, animatedStepStyle]}>
              {activeStep.type === 'reminder' ? (
                <NotificationSlide
                  theme={theme}
                  isDarkMode={isDarkMode}
                  selectedTime={selectedTime}
                  showPicker={showPicker}
                  onTimeChange={handleTimeChange}
                  onOpenTimePicker={handleOpenTimePicker}
                />
              ) : (
                <View style={styles.stepContent}>
                  <AntDesign
                    name={activeStep.icon}
                    size={60}
                    color={theme.text}
                    style={styles.stepIcon}
                  />
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{activeStep.title}</Text>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    {activeStep.description}
                  </Text>
                </View>
              )}

              <View style={styles.progressContainer}>
                {onboardingSteps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      { backgroundColor: theme.progressDot },
                      index === currentStep && {
                        backgroundColor: theme.text,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                      },
                    ]}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {isLoading && (
            <Animated.View style={[styles.loadingContainer, animatedLoadingStyle]}>
              {!imageError ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.gitaImage}
                  resizeMode="contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View
                  style={[
                    styles.imageFallback,
                    {
                      backgroundColor: theme.imageFallbackBackground,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={styles.fallbackText}>Om</Text>
                  <Text style={[styles.fallbackSubText, { color: theme.textQuaternary }]}>
                    Image unavailable
                  </Text>
                </View>
              )}

              <Text style={[styles.imageCredit, { color: theme.textQuaternary }]}>
                &quot;Partha-Sarathi&quot; by Giampaolo Tomassetti
              </Text>

              <Animated.Text
                style={[styles.loadingText, animatedLoadingTextStyle, { color: theme.textSecondary }]}
              >
                {currentLoadingText}
              </Animated.Text>

              <View style={styles.spinnerWrapper}>
                <Spinner size="small" color={theme.spinnerColor} />
              </View>
            </Animated.View>
          )}
        </View>

        {currentStep === -1 && !isLoading && (
          <Animated.View
            style={[styles.bottomCard, animatedCardStyle, { backgroundColor: theme.cardBackground }]}
          >
            <View style={styles.cardContent}>
              <Animated.View style={[styles.arrowContainer, animatedIconStyle]}>
                <Feather name="chevrons-down" size={30} color={theme.arrowColor} />
              </Animated.View>

              <PressableScale
                onPress={handleGetStarted}
                rippleColor="transparent"
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.buttonBackground, borderColor: theme.border },
                ]}
              >
                <View style={styles.shimmerContainer}>
                  <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]}>
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0)',
                        'rgba(255, 255, 255, 0.051)',
                        'rgba(255, 255, 255, 0.051)',
                        'rgba(255, 255, 255, 0.04)',
                        'rgba(255, 255, 255, 0)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.shimmerGradient}
                    />
                  </Animated.View>
                </View>
                <Text style={[styles.buttonText, { color: theme.text }]}>Begin the Journey</Text>
                <Text style={styles.lotusIcon}>🪷</Text>
              </PressableScale>
            </View>
          </Animated.View>
        )}

        {currentStep >= 0 && !isLoading && (
          <Animated.View
            style={[
              styles.navigationContainer,
              animatedNavigationStyle,
              isReminderStep && styles.navigationContainerCentered,
            ]}
          >
            {!isReminderStep && (
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.6}>
                <Text style={[styles.skipText, { color: theme.textTertiary }]}>Skip</Text>
              </TouchableOpacity>
            )}

            <PressableScale
              onPress={isSavingReminder ? undefined : handleNext}
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
                {isReminderStep ? (isSavingReminder ? 'Saving...' : 'Set Reminder') : 'Next'}
              </Text>
              <AntDesign name="arrow-right" size={20} color={theme.text} />
            </PressableScale>
          </Animated.View>
        )}
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
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleContainer: {
    marginTop: -100,
  },
  title: {
    fontSize: 80,
    textAlign: 'center',
    fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
    letterSpacing: 2,
    fontWeight: '200',
  },
  tagline: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1.5,
    fontWeight: '300',
    marginTop: 10,
    fontFamily: 'Source Serif Pro',
  },
  subtitleContainer: {
    padding: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 30,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '300',
    fontFamily: 'Space Mono',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1.5,
    marginTop: 16,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#00fff783',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 5,
    transform: [{ translateY: -2 }],
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 25,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    transform: [{ skewX: '-15deg' }],
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 1,
    marginRight: 12,
    fontFamily: 'Source Serif Pro',
  },
  lotusIcon: {
    fontSize: 20,
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -50,
  },
  arrowContainer: {
    alignItems: 'center',
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 30,
  },
  imageCredit: {
    fontSize: 8,
    fontFamily: 'Space Mono',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  stepTitle: {
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Instrument Serif',
    letterSpacing: 1,
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontFamily: 'Source Serif Pro',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
    paddingTop: 20,
  },
  navigationContainerCentered: {
    justifyContent: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Space Mono',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -70,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '300',
    marginTop: 44,
    textAlign: 'center',
    fontFamily: 'Source Serif Pro',
    fontStyle: 'italic',
  },
  spinnerWrapper: {
    marginTop: 40,
    marginBottom: 20,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  fallbackText: {
    fontSize: 60,
    marginBottom: 8,
  },
  fallbackSubText: {
    fontSize: 12,
    fontFamily: 'Space Mono',
  },
  notificationContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    minHeight: '80%',
  },
  timePickerContainer: {
    borderRadius: 16,
    padding: 24,
    marginVertical: 32,
    borderWidth: 1,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Source Serif Pro',
    lineHeight: 28,
  },
  iosTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iosTimePicker: {
    width: 320,
    height: 120,
  },
  androidTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  androidTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 160,
    minHeight: 48,
  },
  androidTimeText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Space Mono',
    marginRight: 12,
  },
  gitaImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
    marginBottom: 20,
    borderRadius: 12,
    opacity: 0.9,
  },
  reminderNote: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginTop: 16,
  },
});

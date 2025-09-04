import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { useSharedValue, withTiming, useAnimatedStyle, interpolateColor, Easing, runOnJS } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

// Import components
import BlurBackground from '../components/BlurBackground';
import BlurEdge from '../components/BlurEdge';
import { StatusBar } from 'expo-status-bar';
import { useKriya } from '../lib/store';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

export default function FocusMode() {
  const { id, title } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const isDarkMode = useKriya(s => s.isDarkMode);
  const addFocusSession = useKriya(s => s.addFocusSession);

  const [timeLeft, setTimeLeft] = React.useState(25 * 60);
  const [isRunning, setIsRunning] = React.useState(true);
  const [sessionCompleted, setSessionCompleted] = React.useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);

  // Animated values for content fade (everything except buttons)
  const contentOpacity = useSharedValue(1);
  // Animated value for button color transition
  const buttonColorProgress = useSharedValue(0);

  // Callback functions to handle shared value updates
  const restoreOpacity = useCallback(() => {
    contentOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    buttonColorProgress.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentOpacity, buttonColorProgress]);

  const handleSessionComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);
    setSessionCompleted(true);
    addFocusSession();
    console.log('🎯 Focus session completed and recorded!');
    
    // Use runOnJS to safely update shared values
    runOnJS(restoreOpacity)();
  }, [addFocusSession, restoreOpacity]);

  // Timer effect
  useEffect(() => {
    if (!isRunning || sessionCompleted) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev > 0 ? prev - 1 : 0;
        if (newTime === 0) {
          // Use runOnJS to call the completion handler
          runOnJS(handleSessionComplete)();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, sessionCompleted, handleSessionComplete]);

  // Fade effect - separate useEffect
  useEffect(() => {
    if (!isRunning) return;

    // Clear any existing timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // Set new fade timeout
    fadeTimeoutRef.current = setTimeout(() => {
      contentOpacity.value = withTiming(0.2, {
        duration: 700,
        easing: Easing.inOut(Easing.quad),
      });
      buttonColorProgress.value = withTiming(1, {
        duration: 700,
        easing: Easing.inOut(Easing.quad),
      });
    }, 5000);

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [isRunning, contentOpacity, buttonColorProgress]);

  // Handle pause/resume
  const toggleTimer = useCallback(() => {
    setIsRunning(!isRunning);
    
    if (isRunning) {
      // If pausing, restore full opacity immediately
      contentOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      buttonColorProgress.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isRunning, contentOpacity, buttonColorProgress]);

  // Handle early exit
  const handleExit = useCallback(() => {
    if (timeLeft > 0 && !sessionCompleted) {
      // Session was not completed - don't record it
      console.log('🚫 Focus session exited early - not recorded');
    }
    router.back();
  }, [timeLeft, sessionCompleted]);

  // Handle reset timer
  const resetTimer = useCallback(() => {
    setTimeLeft(25 * 60);
    setIsRunning(false);
    setSessionCompleted(false);
    contentOpacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
    buttonColorProgress.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentOpacity, buttonColorProgress]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // ...existing code...
  const getThemeColors = () => {
    if (isDarkMode) {
      return {
        container: '#0f172a',
        text: '#f8fafc',
        mutedText: '#94a3b8',
        primaryButton: ['#2563eb', '#132138ff'],
        secondaryButton: '#122035ff',
        successButton: '#10b981',
        buttonBorder: ['#2563eb', '#273241ff'],
        iconColor: ['#ffffff', '#a0b4bcff'],
        blurOverlay: ["#00000088", "#00000000"],
        blurOverlayBottom: ["#00000000", "#00000064"],
      };
    } else {
      return {
        container: '#ffffffb2',
        text: '#1e293bb9',
        mutedText: '#64748b',
        primaryButton: ['#96a9f5ff', '#d1d1d1ff'],
        secondaryButton: '#d1d1d1ff',
        successButton: '#34d399',
        buttonBorder: ['#3b82f6', '#cbd5e1'],
        iconColor: ['#ffffffff', '#7b7b7bff'],
        blurOverlay: ["#ffffff88", "#ffffff00"],
        blurOverlayBottom: ["#ffffff00", "#ffffff64"],
      };
    }
  };

  const themeColors = getThemeColors();

  // Animated styles for background and content (not buttons)
  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // Animated style for the primary button color
  const animatedButtonStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      buttonColorProgress.value,
      [0, 1],
      themeColors.primaryButton
    );
    
    return {
      backgroundColor,
    };
  });

  const animatedButtonBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      buttonColorProgress.value,
      [0, 1],
      themeColors.buttonBorder
    );
    
    const borderWidth = buttonColorProgress.value * 0;
    
    return {
      borderColor,
      borderWidth,
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      buttonColorProgress.value,
      [0, 1],
      themeColors.iconColor
    );

    return {
      color,
    };
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.container,
    },
    taskTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: themeColors.text,
      textAlign: 'center',
      letterSpacing: 0.5,
      fontFamily: "Instrument",
      fontStyle: "italic",
    },
    timerText: {
      fontSize: 64,
      fontWeight: '300',
      color: themeColors.text,
      fontVariant: ['tabular-nums'],
    },
    timerLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: themeColors.mutedText,
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    secondaryButton: {
      backgroundColor: themeColors.secondaryButton,
    },
    successButton: {
      backgroundColor: themeColors.successButton,
    },
    completedText: {
      fontSize: 20,
      fontWeight: '600',
      color: themeColors.successButton,
      textAlign: 'center',
      marginTop: 16,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar hidden={true} />

      {/* Animated Background with opacity control */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
        <BlurBackground />
        
        {/* Top Edge Blur */}
        <BlurEdge
          height={80 + insets.top}
          colors={themeColors.blurOverlay}
          style={[styles.blur, styles.topBlur, { top: 0 }]}
        />

        {/* Bottom Edge Blur */}
        <BlurEdge
          height={50 + insets.bottom}
          colors={themeColors.blurOverlayBottom}
          style={[styles.blur, styles.bottomBlur, { bottom: 0 }]}
        />
      </Animated.View>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Task Title - Positioned at the top */}
        <Animated.View style={[styles.titleContainer, animatedContentStyle]}>
          <Text style={dynamicStyles.taskTitle}>
            {title || 'Focus Session'}
          </Text>
        </Animated.View>

        {/* Timer - Centered */}
        <Animated.View style={[styles.timerContainer, animatedContentStyle]}>
          <Text style={dynamicStyles.timerText}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text style={dynamicStyles.timerLabel}>
            {timeLeft === 0 ? 'Session Complete!' : isRunning ? 'Focus Time' : 'Paused'}
          </Text>
          {sessionCompleted && (
            <Text style={dynamicStyles.completedText}>
              🎯 Focus session recorded!
            </Text>
          )}
        </Animated.View>

        {/* Actions - Positioned at the bottom */}
        <View style={styles.actions}>
          {!sessionCompleted ? (
            <>
              {/* Play/Pause Button */}
              <Pressable onPress={toggleTimer}>
                <Animated.View style={[styles.actionButton, animatedButtonStyle, animatedButtonBorderStyle]}>
                  <AnimatedFeather
                    name={isRunning ? 'pause' : 'play'}
                    size={24}
                    style={animatedIconStyle}
                  />
                </Animated.View>
              </Pressable>
              
              {/* Exit Button */}
              <Pressable onPress={handleExit} style={[styles.actionButton, dynamicStyles.secondaryButton]}>
                <AnimatedFeather name="x" size={24} style={animatedIconStyle} />
              </Pressable>
            </>
          ) : (
            <>
              {/* New Session Button */}
              <Pressable onPress={resetTimer} style={[styles.actionButton, dynamicStyles.successButton]}>
                <Feather name="refresh-cw" size={24} color="#ffffff" />
              </Pressable>
              
              {/* Done Button */}
              <Pressable onPress={handleExit} style={[styles.actionButton, dynamicStyles.secondaryButton]}>
                <Feather name="check" size={24} color="#ffffff" />
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 1,
    paddingVertical: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 5,
  },
  blur: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  topBlur: {
    top: 0,
  },
  bottomBlur: {
    bottom: 0,
  },
  timerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
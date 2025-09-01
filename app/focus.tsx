import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { useSharedValue, withTiming, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

// Import components
import BlurBackground from '../components/BlurBackground';
import BlurEdge from '../components/BlurEdge';
import { StatusBar } from 'expo-status-bar';

export default function FocusMode() {
  const { id, title } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [timeLeft, setTimeLeft] = React.useState(25 * 60);
  const [isRunning, setIsRunning] = React.useState(true);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animated values for content fade (everything except buttons)
  const contentOpacity = useSharedValue(1);
  // Animated value for button color transition
  const buttonColorProgress = useSharedValue(0);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev > 0 ? prev - 1 : 0;
        if (newTime === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsRunning(false);
          // Restore full opacity when session completes
          contentOpacity.value = withTiming(1, { duration: 500 });
          buttonColorProgress.value = withTiming(0, { duration: 500 });
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Fade effect - separate useEffect
  useEffect(() => {
    if (!isRunning) return;

    // Clear any existing timeout
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    // Set new fade timeout
    fadeTimeoutRef.current = setTimeout(() => {
      contentOpacity.value = withTiming(0.2, { duration: 1000 });
      buttonColorProgress.value = withTiming(1, { duration: 1000 });
    }, 5000);

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [isRunning]);

  // Handle pause/resume
  const toggleTimer = () => {
    setIsRunning(!isRunning);
    
    if (isRunning) {
      // If pausing, restore full opacity immediately
      contentOpacity.value = withTiming(1, { duration: 300 });
      buttonColorProgress.value = withTiming(0, { duration: 300 });
    }
    // If resuming (isRunning becomes true), the useEffect will handle the 5-second fade
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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
      ['#2563eb', '#1e293b'] // Blue to dark slate
    );
    
    return {
      backgroundColor,
    };
  });

  const animatedButtonBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      buttonColorProgress.value,
      [0, 1],
      ['#2563eb', '#334155'] // Blue to slate border
    );
    
    const borderWidth = buttonColorProgress.value * 1; // 0 to 1px border
    
    return {
      borderColor,
      borderWidth,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Animated Background with opacity control */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
        <BlurBackground />
        
        {/* Top Edge Blur */}
        <BlurEdge
          height={80 + insets.top}
          colors={["#00000088", "#00000000"]}
          style={[styles.blur, styles.topBlur, { top: 0 }]}
        />

        {/* Bottom Edge Blur */}
        <BlurEdge
          height={50 + insets.bottom}
          colors={["#00000000", "#00000064"]}
          style={[styles.blur, styles.bottomBlur, { bottom: 0 }]}
        />
      </Animated.View>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Task Title and Timer with opacity control */}
        <Animated.View style={[styles.textContent, animatedContentStyle]}>
          <Text style={styles.taskTitle}>
            {title || 'Focus Session'}
          </Text>

          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={styles.timerLabel}>
              {timeLeft === 0 ? 'Session Complete!' : isRunning ? 'Focus Time' : 'Paused'}
            </Text>
          </View>
        </Animated.View>

        {/* Actions - These stay at full opacity */}
        <View style={styles.actions}>
          <Pressable onPress={toggleTimer}>
            <Animated.View style={[styles.actionButton, animatedButtonStyle, animatedButtonBorderStyle]}>
              <Feather name={isRunning ? 'pause' : 'play'} size={24} color="white" />
            </Animated.View>
          </Pressable>
          <Pressable onPress={() => router.back()} style={[styles.actionButton, styles.secondaryButton]}>
            <Feather name="x" size={24} color="#64748b" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark slate background
  },
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 1,
  },
  textContent: {
    alignItems: 'center',
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
  taskTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc', // Light text
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily: "Instrument",
    fontStyle: "italic"
  },
  timerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '300', // Lighter weight for elegance
    color: '#f8fafc',
    fontVariant: ['tabular-nums'], // Better number alignment
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8', // Muted text
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
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
  secondaryButton: {
    backgroundColor: '#1e293b', // Dark slate
    borderWidth: 1,
    borderColor: '#334155',
  },
});
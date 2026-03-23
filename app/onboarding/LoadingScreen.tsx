import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { Spinner } from '@/components/ui/spinner';
import {
  Theme,
  GITA_IMAGE_URL,
  LOADING_TEXTS,
  FADE_DURATION,
} from '../../lib/onboarding/constants';

type LoadingScreenProps = {
  theme: Theme;
};

export default function LoadingScreen({ theme }: LoadingScreenProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);
  const [currentLoadingText, setCurrentLoadingText] = useState(LOADING_TEXTS[0]);

  const loadingOpacity = useSharedValue(0);
  const loadingScale = useSharedValue(0.8);
  const loadingTextOpacity = useSharedValue(0);

  // Entrance animation.
  useEffect(() => {
    loadingOpacity.value = withTiming(1, { duration: FADE_DURATION });
    loadingScale.value = withTiming(1, { duration: FADE_DURATION });
  }, [loadingOpacity, loadingScale]);

  // Cycle through loading texts.
  useEffect(() => {
    setCurrentLoadingText(LOADING_TEXTS[0]);
    loadingTextOpacity.value = withTiming(1, { duration: 600 });

    const timers = [
      setTimeout(() => {
        loadingTextOpacity.value = withTiming(0, { duration: 400 });
      }, 2000),
      setTimeout(() => {
        setCurrentLoadingText(LOADING_TEXTS[1]);
        loadingTextOpacity.value = withTiming(1, { duration: 400 });
      }, 2400),
      setTimeout(() => {
        loadingTextOpacity.value = withTiming(0, { duration: 400 });
      }, 6400),
      setTimeout(() => {
        setCurrentLoadingText(LOADING_TEXTS[2]);
        loadingTextOpacity.value = withTiming(1, { duration: 400 });
      }, 6800),
    ];

    return () => timers.forEach(clearTimeout);
  }, [loadingTextOpacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    transform: [{ scale: loadingScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: loadingTextOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {!imageError ? (
        <Image
          source={{ uri: GITA_IMAGE_URL }}
          style={[styles.gitaImage, { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.6 }]}
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
              width: SCREEN_WIDTH,
              height: SCREEN_WIDTH * 0.6,
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
        style={[styles.loadingText, animatedTextStyle, { color: theme.textSecondary }]}
      >
        {currentLoadingText}
      </Animated.Text>

      <View style={styles.spinnerWrapper}>
        <Spinner size="small" color={theme.spinnerColor} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -70,
  },
  gitaImage: {
    marginBottom: 20,
    borderRadius: 12,
    opacity: 0.9,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
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
});

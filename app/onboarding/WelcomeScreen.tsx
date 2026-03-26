import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from 'pressto';
import { EaseView } from 'react-native-ease';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

import {
  Theme,
  SLIDE_DURATION,
  FADE_DURATION,
  CHEVRON_BOUNCE_DURATION,
  SHIMMER_SLIDE_DURATION,
  SHIMMER_PAUSE_DURATION,
  SHIMMER_START_DELAY,
} from '../../lib/onboarding/constants';
import { taskCompleteHaptic } from '../../lib/haptics';

type WelcomeScreenProps = {
  theme: Theme;
  onBegin: () => void;
};

export default function WelcomeScreen({ theme, onBegin }: WelcomeScreenProps) {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  // ─── Animated values ───────────────────────────────────────────
  const titleTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const subtitleTranslateY = useSharedValue(0);
  const subtitleOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const shimmerTranslateX = useSharedValue(-200);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      shimmerTranslateX.value = withRepeat(
        withSequence(
          withTiming(-200, { duration: 0 }),
          withTiming(400, { duration: SHIMMER_SLIDE_DURATION }),
          withTiming(400, { duration: SHIMMER_PAUSE_DURATION }),
        ),
        -1,
        false,
      );
    }, SHIMMER_START_DELAY);

    return () => clearTimeout(timer);
  }, [shimmerTranslateX]);

  // ─── Animated styles ───────────────────────────────────────────
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



  const animatedShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerTranslateX.value }],
  }));

  // ─── Handle "Begin the Journey" ────────────────────────────────
  const handleBegin = () => {
    taskCompleteHaptic();

    // Slide title up, subtitle up, card down — then notify parent.
    titleTranslateY.value = withTiming(-200, { duration: SLIDE_DURATION });
    titleOpacity.value = withTiming(0, { duration: FADE_DURATION });
    subtitleTranslateY.value = withTiming(-100, { duration: 700 });
    subtitleOpacity.value = withTiming(0, { duration: 500 });
    cardTranslateY.value = withTiming(300, { duration: SLIDE_DURATION });
    cardOpacity.value = withTiming(0, { duration: FADE_DURATION });
  
    setTimeout(onBegin, SLIDE_DURATION);
  };

  return (
    <>
      {/* Title block */}
      <View style={styles.content}>
        <Animated.View style={[styles.titleContainer, animatedTitleStyle]}>
          <Text style={[styles.title, { color: theme.text }]}>kriya</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            ancient wisdom, modern rhythm
          </Text>
        </Animated.View>

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
      </View>

      {/* Bottom card */}
      <Animated.View
        style={[
          styles.bottomCard,
          animatedCardStyle,
          { backgroundColor: theme.cardBackground, height: SCREEN_HEIGHT * 0.3 },
        ]}
      >
        <View style={styles.cardContent}>
          <EaseView
            style={styles.arrowContainer}
            animate={{ translateY: 4 }}
            initialAnimate={{ translateY: 0 }}
            transition={{
              type: 'timing',
              duration: CHEVRON_BOUNCE_DURATION,
              easing: 'easeInOut',
              loop: 'reverse',
            }}
          >
            <Feather name="chevrons-down" size={30} color={theme.arrowColor} />
          </EaseView>

          <PressableScale
            onPress={handleBegin}
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
            {/* <Text style={styles.lotusIcon}>🪷</Text> */}
          </PressableScale>
        </View>
      </Animated.View>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    fontWeight: '400',
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
  arrowContainer: {
    alignItems: 'center',


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
    shadowOffset: { width: 0, height: 2 },
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
    fontSize: 13,
    letterSpacing: 2,

    fontFamily: 'Space Mono',

  },
  lotusIcon: {
    fontSize: 20,
  },
});

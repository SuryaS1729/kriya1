import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useKriya } from '../../lib/store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const onboardingSteps = [
  {
    title: "Welcome to Kriya",
    subtitle: "Your daily spiritual companion",
    description: "Start each day with ancient wisdom and purposeful action",
    icon: "sunrise",
    gradient: ['#667eea', '#764ba2'] as const,
  },
  {
    title: "Ancient Wisdom",
    subtitle: "Bhagavad Gita verses daily",
    description: "Discover timeless teachings that guide your dharma",
    icon: "book-open",
    gradient: ['#f093fb', '#f5576c'] as const,
  },
  {
    title: "Mindful Tasks",
    subtitle: "Organize with purpose",
    description: "Transform daily activities into spiritual practice",
    icon: "check-circle",
    gradient: ['#4facfe', '#00f2fe'] as const,
  },
  {
    title: "Begin Your Journey",
    subtitle: "Ready to start?",
    description: "Let's create your first meaningful day together",
    icon: "arrow-right",
    gradient: ['#43e97b', '#38f9d7'] as const,
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const translateX = useSharedValue(0);
  const completeOnboarding = useKriya(s => s.completeOnboarding);

  const isLastStep = currentStep === onboardingSteps.length - 1;

  const goToNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    console.log('🎯 BEFORE completing onboarding, current state:', useKriya.getState().hasCompletedOnboarding);
    completeOnboarding();
    console.log('🎯 AFTER completing onboarding, new state:', useKriya.getState().hasCompletedOnboarding);
    router.replace('/');
  };

  // Simplified pan gesture with better error handling
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      console.log('Pan gesture began');
    })
    .onUpdate((event) => {
      try {
        translateX.value = event.translationX;
      } catch (error) {
        console.log('Pan update error:', error);
      }
    })
    .onEnd((event) => {
      try {
        const shouldGoNext = event.translationX < -80 && currentStep < onboardingSteps.length - 1;
        const shouldGoPrev = event.translationX > 80 && currentStep > 0;

        if (shouldGoNext) {
          runOnJS(goToNext)();
        } else if (shouldGoPrev) {
          runOnJS(goToPrevious)();
        }
        
        translateX.value = withSpring(0);
      } catch (error) {
        console.log('Pan end error:', error);
        translateX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      console.log('Pan gesture finalized');
    });

  const animatedStyle = useAnimatedStyle(() => {
    try {
      return {
        transform: [{ translateX: translateX.value }],
      };
    } catch (error) {
      console.log('Animated style error:', error);
      return {
        transform: [{ translateX: 0 }],
      };
    }
  });

  const currentStepData = onboardingSteps[currentStep];

  return (
    <GestureHandlerRootView style={styles.rootView}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={currentStepData.gradient}
          style={StyleSheet.absoluteFill}
        />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Skip button */}
          {!isLastStep && (
            <Pressable onPress={handleComplete} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}

          {/* Main content - wrapped in GestureDetector */}
          <View style={styles.contentWrapper}>
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.content, animatedStyle]}>
                <View style={styles.iconContainer}>
                  <Feather name={currentStepData.icon as any} size={80} color="white" />
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.title}>{currentStepData.title}</Text>
                  <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
                  <Text style={styles.description}>{currentStepData.description}</Text>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>

          {/* Progress indicators */}
          <View style={styles.progressContainer}>
            {onboardingSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={styles.navigationContainer}>
            {currentStep > 0 ? (
              <Pressable onPress={goToPrevious} style={styles.navButton}>
                <Feather name="arrow-left" size={24} color="white" />
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}

            <View style={styles.navButtonSpacer} />

            {isLastStep ? (
              <Pressable onPress={handleComplete} style={styles.completeButton}>
                <Text style={styles.completeButtonText}>Get Started</Text>
                <Feather name="arrow-right" size={20} color="#667eea" style={{ marginLeft: 8 }} />
              </Pressable>
            ) : (
              <Pressable onPress={goToNext} style={styles.navButton}>
                <Feather name="arrow-right" size={24} color="white" />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 60,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'SourceSerifPro',
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'SourceSerifPro',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Alegreya',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: 'white',
    width: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonSpacer: {
    flex: 1,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  completeButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SourceSerifPro',
  },
});
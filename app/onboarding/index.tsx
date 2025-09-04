import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,

} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useKriya } from '../../lib/store';
import AntDesign from '@expo/vector-icons/AntDesign';
import BlurBackground from '../../components/BlurBackground';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  withSequence,

} from 'react-native-reanimated';

import { Feather } from '@expo/vector-icons';
import { Spinner } from '@/components/ui/spinner'; // Add this import

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Onboarding content
const onboardingSteps = [
  {
    title: "Add Your Tasks",
    description: "Create your daily to-do list just like any other task app. Simple, clean, and focused on what matters to you.",
    icon: "checkcircle"
  },
  {
    title: "Complete & Learn",
    description: "Every time you check off a task, unlock a new verse from the Bhagavad Gita. Transform productivity into spiritual growth.",
    icon: "book"
  },
  {
    title: "Action Meets Wisdom",
    description: "Follow Krishna's teaching of 'Kriya' - taking action. Complete the entire Gita while building meaningful habits in your life.",
    icon: "star"
  },
  {
    title: "Offline & Private",
    description: "Everything works offline. No signup required. Your spiritual journey remains completely private.",
    icon: "lock"
  }
];

export default function Onboarding() {
  console.log('🎯 Onboarding component rendering');
  const insets = useSafeAreaInsets();
  
  const completeOnboarding = useKriya(s => s.completeOnboarding);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  // Animation values
  const titleTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const subtitleOpacity = useSharedValue(1);
  const subtitleTranslateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const stepOpacity = useSharedValue(0);
  const navigationOpacity = useSharedValue(0);
  
  // Icon animation
  const iconTranslateX = useSharedValue(0);
  
  // Loading animation values
  const loadingOpacity = useSharedValue(0);
  const loadingScale = useSharedValue(0.8);

  // Video player setup
 

  // Start icon animation when component mounts
  useEffect(() => {
    // Smoother vertical animation for downward movement
    iconTranslateX.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1200 }), // Move down slightly and slower
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );
  }, []);

  const animateToOnboarding = () => {
    // Animate title up and fade out
    titleTranslateY.value = withTiming(-200, { duration: 800 });
    titleOpacity.value = withTiming(0, { duration: 600 });
    
    // Animate subtitle out to the left and fade
    subtitleTranslateY.value = withTiming(-100, { duration: 700 });
    subtitleOpacity.value = withTiming(0, { duration: 500 });
    
    // Animate card down and fade out
    cardTranslateY.value = withTiming(300, { duration: 800 });
    cardOpacity.value = withTiming(0, { duration: 600 });
    
    // Show first onboarding step after the exit animations complete
    setTimeout(() => {
      setCurrentStep(0);
      // Fade in step content
      stepOpacity.value = withTiming(1, { duration: 800 });
      // Fade in navigation buttons slightly after content
      setTimeout(() => {
        navigationOpacity.value = withTiming(1, { duration: 600 });
      }, 300);
    }, 800); // Wait for exit animations to complete
  };

  const handleGetStarted = () => {
    console.log('🎯 Starting onboarding flow...');
    animateToOnboarding();
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      // Fade out current step and navigation
      stepOpacity.value = withTiming(0, { duration: 300 });
      navigationOpacity.value = withTiming(0, { duration: 300 });
      
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        // Fade in new step content
        stepOpacity.value = withTiming(1, { duration: 500 });
        // Fade in navigation buttons
        setTimeout(() => {
          navigationOpacity.value = withTiming(1, { duration: 400 });
        }, 200);
      }, 300);
    } else {
      // Complete onboarding with loading transition
      console.log('🎯 Completing onboarding...');
      
      // Start loading transition
      setIsLoading(true);
      
      // Fade out current content and fade in loading
      stepOpacity.value = withTiming(0, { duration: 500 });
      navigationOpacity.value = withTiming(0, { duration: 500 });
      
      setTimeout(() => {
        // Show loading screen with smooth animation
        loadingOpacity.value = withTiming(1, { duration: 600 });
        loadingScale.value = withTiming(1, { duration: 600 });
        
        // After 2 seconds, complete onboarding and navigate
        setTimeout(() => {
          if (completeOnboarding) {
            completeOnboarding();
          }
          
          // Fade out loading screen
          loadingOpacity.value = withTiming(0, { duration: 800 });
          
          setTimeout(() => {
            router.replace('/');
          }, 800); // Wait for fade out to complete
        }, 2000); // 2 second loading delay
      }, 500); // Wait for content to fade out
    }
  };

  const handleSkip = () => {
    console.log('🎯 Skipping onboarding...');
    
    // Same loading transition for skip
    setIsLoading(true);
    
    stepOpacity.value = withTiming(0, { duration: 500 });
    navigationOpacity.value = withTiming(0, { duration: 500 });
    
    setTimeout(() => {
      loadingOpacity.value = withTiming(1, { duration: 600 });
      loadingScale.value = withTiming(1, { duration: 600 });
      
      setTimeout(() => {
        if (completeOnboarding) {
          completeOnboarding();
        }
        
        loadingOpacity.value = withTiming(0, { duration: 800 });
        
        setTimeout(() => {
          router.replace('/');
        }, 800);
      }, 2000);
    }, 500);
  };

  // Animated styles
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
    transform: [{ translateY: iconTranslateX.value }], // Change to translateY for vertical
  }));

  // Add loading screen animated styles
  const animatedLoadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    transform: [{ scale: loadingScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Video Background */}
      <Animated.View style={[StyleSheet.absoluteFill]}>
        <BlurBackground />
      </Animated.View>
      
      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Main title - positioned in upper portion */}
          <Animated.View style={[styles.titleContainer, animatedTitleStyle]}>
            <Text style={styles.title}>kriya</Text>
            <Text style={styles.tagline}>ancient wisdom, modern rhythm</Text>
          </Animated.View>
          
          {currentStep === -1 && !isLoading && (
            <Animated.View style={[styles.subtitleContainer, animatedSubtitleStyle]}>
              <Text style={styles.subtitle}>free • offline • no signup • open source</Text>
            </Animated.View>
          )}

          {/* Onboarding Steps */}
          {currentStep >= 0 && !isLoading && (
            <Animated.View style={[styles.onboardingContainer, animatedStepStyle]}>
              <View style={styles.stepContent}>
                <AntDesign 
                  name={onboardingSteps[currentStep].icon as any} 
                  size={60} 
                  color="white" 
                  style={styles.stepIcon}
                />
                <Text style={styles.stepTitle}>{onboardingSteps[currentStep].title}</Text>
                <Text style={styles.stepDescription}>{onboardingSteps[currentStep].description}</Text>
                
                {/* Progress dots */}
                <View style={styles.progressContainer}>
                  {onboardingSteps.map((_, index) => (
                    <View 
                      key={index}
                      style={[
                        styles.progressDot,
                        index === currentStep && styles.progressDotActive
                      ]}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Loading Screen */}
          {isLoading && (
            <Animated.View style={[styles.loadingContainer, animatedLoadingStyle]}>
              <Spinner size="large" color="white" />
              <Text style={styles.loadingText}>Preparing your journey...</Text>
            </Animated.View>
          )}
        </View>

        {/* Bottom modal card - only show on initial screen */}
        {currentStep === -1 && !isLoading && (
          <Animated.View style={[styles.bottomCard, animatedCardStyle]}>
            <View style={styles.cardContent}>
              {/* Animated down arrow above the button */}
              <Animated.View style={[styles.arrowContainer, animatedIconStyle]}>
                <Feather
                  name="chevrons-down"
                  size={28}
                  color="rgba(104, 164, 177, 0.58)"
                />
              </Animated.View>
              
              <Pressable onPress={handleGetStarted} style={styles.actionButton}>
                <Text style={styles.buttonText}> Step into Action</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Onboarding Navigation - With separate fade animation */}
        {currentStep >= 0 && !isLoading && (
          <Animated.View style={[styles.navigationContainer, animatedNavigationStyle]}>
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextText}>
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <AntDesign name="arrowright" size={20} color="white" />
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#023747e0',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    marginTop: -100, // Reduced from -160
  },
  title: {
    fontSize: 80,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Instrument',
    fontStyle: 'italic',
    letterSpacing: 2,
    fontWeight: '200',
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 1.5,
    fontWeight: '300',
    marginTop: 10,
    fontFamily: 'SourceSerifPro',
  },
  subtitleContainer: {
    padding: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: "white",
    borderRadius: 30,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '300',
    fontFamily: 'SpaceMono',

  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.30,
    backgroundColor: 'rgba(0, 12, 26, 0.34)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
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
    justifyContent: "center",
    alignItems: 'center',
    backgroundColor: 'rgba(37, 188, 208, 0.08)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 16,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 3,
    marginRight: 12,
    fontFamily:"SourceSerifPro"
  },
  buttonArrow: {
    color: 'white',
  },
  // Onboarding styles
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -50, // Reduced from 50
  },
   arrowContainer: {
    marginBottom: 0,
    alignItems: 'center',
  },
  stepContent: {
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 28,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Instrument',
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontFamily: 'SourceSerifPro',
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
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: 'white',
    width: 12,
    height: 12,
    borderRadius: 6,
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
    paddingBottom: 50, // Increased for better visibility
    paddingTop: 20,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'SpaceMono',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: 'SpaceMono',
  },
  // Add loading screen styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 18,
    fontWeight: '300',
    marginTop: 24,
    textAlign: 'center',
    fontFamily: 'SourceSerifPro',
    fontStyle: 'italic',
  },
});
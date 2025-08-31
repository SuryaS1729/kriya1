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
import { VideoView, useVideoPlayer } from 'expo-video';
import { useKriya } from '../../lib/store';
import { Feather } from '@expo/vector-icons';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const onboardingSteps = [
  {
    title: "Welcome to Kriya",
    subtitle: "Your daily spiritual companion",
    description: "Start each day with ancient wisdom and purposeful action",
    icon: "sunrise",
    overlayColors: ['#667eea', '#764ba2'],
  },
  {
    title: "Ancient Wisdom",
    subtitle: "Bhagavad Gita verses daily",
    description: "Discover timeless teachings that guide your dharma",
    icon: "book-open",
    overlayColors: ['#f093fb', '#f5576c'],
  },
  {
    title: "Mindful Tasks",
    subtitle: "Organize with purpose",
    description: "Transform daily activities into spiritual practice",
    icon: "check-circle",
    overlayColors: ['#4facfe', '#00f2fe'],
  },
  {
    title: "Begin Your Journey",
    subtitle: "Ready to start?",
    description: "Let's create your first meaningful day together",
    icon: "arrow-right",
    overlayColors: ['#43e97b', '#38f9d7'],
  },
];

export default function Onboarding() {
  console.log('🎯 Onboarding component rendering');
  
  const [currentStep, setCurrentStep] = useState(0);
  const completeOnboarding = useKriya(s => s.completeOnboarding);

  // Video player setup
  const player = useVideoPlayer(require('../../assets/videos/kriya.mp4'), player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

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
    console.log('🎯 Completing onboarding...');
    if (completeOnboarding) {
      completeOnboarding();
    }
    router.replace('/');
  };

  const currentStepData = onboardingSteps[currentStep];
  console.log('🎯 Current step data:', currentStepData);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Video Background */}
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        showsTimecodes={false}
        requiresLinearPlayback={false}
        contentFit="cover"
      />
      
      {/* Dark overlay for better text readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Skip button */}
        {!isLastStep && (
          <Pressable onPress={handleComplete} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.titleContainer}><Text style={styles.title}>kriya</Text></View>
          {/* <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Feather name={currentStepData.icon as any} size={60} color="white" />
            </View>
          </View> */}

          <View style={styles.textContainer}>

            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
            <Text style={styles.description}>{currentStepData.description}</Text>
          </View>
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
              <Feather name="arrow-right" size={20} color="#2563eb" style={{ marginLeft: 8 }} />
            </Pressable>
          ) : (
            <Pressable onPress={goToNext} style={styles.navButton}>
              <Feather name="arrow-right" size={24} color="white" />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    marginTop: 10,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 60,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 52,
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Instrument',
    fontStyle:'italic',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  titleContainer: {
    marginBottom: 22,
    padding: 10,
  },
  
});
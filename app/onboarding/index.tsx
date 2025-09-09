import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';

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
import { Spinner } from '@/components/ui/spinner';

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

// NotificationSlide component remains the same
const NotificationSlide = ({ onNext }: { onNext: () => void }) => {
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const setReminderTime = useKriya(s => s.setReminderTime);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleContinue = async () => {
    await setReminderTime(selectedHour, selectedMinute);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const getReminderTime = () => {
    let reminderHour = selectedHour;
    let reminderMinute = selectedMinute - 10;
    
    if (reminderMinute < 0) {
      reminderMinute += 60;
      reminderHour -= 1;
    }
    
    if (reminderHour < 0) {
      reminderHour += 24;
    }
    
    return `${reminderHour.toString().padStart(2, '0')}:${reminderMinute.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.notificationSlide}>
      <View style={styles.notificationContent}>
        <Feather name="bell" size={60} color="white" style={styles.stepIcon} />
        
        <Text style={styles.stepTitle}> When do you start your day?</Text>
        
        <Text style={styles.stepDescription}>
          Kriya expects you to write down tasks just before you begin your day. We'll send you a gentle reminder 10 minutes before your chosen time.
        </Text>

        <View style={styles.timePickerContainer}>
          <Text style={styles.timePickerLabel}>I usually start my day at:</Text>
          
          <View style={styles.timePicker}>
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Hour</Text>
              <ScrollView 
                style={styles.timeScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={40}
                decelerationRate="fast"
              >
                {hours.map((hour) => (
                  <Pressable
                    key={hour}
                    onPress={() => {
                      setSelectedHour(hour);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.timeOption,
                      selectedHour === hour && styles.selectedTimeOption
                    ]}
                  >
                    <Text style={[
                      styles.timeText,
                      selectedHour === hour && styles.selectedTimeText
                    ]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Minute</Text>
              <ScrollView 
                style={styles.timeScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={40}
                decelerationRate="fast"
              >
                {minutes.map((minute) => (
                  <Pressable
                    key={minute}
                    onPress={() => {
                      setSelectedMinute(minute);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.timeOption,
                      selectedMinute === minute && styles.selectedTimeOption
                    ]}
                  >
                    <Text style={[
                      styles.timeText,
                      selectedMinute === minute && styles.selectedTimeText
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.reminderNote}>
            📱 You'll receive a reminder at {getReminderTime()} (10 minutes before)
          </Text>
        </View>

        <Pressable onPress={handleContinue} style={styles.notificationButton}>
          <Text style={styles.notificationButtonText}>Set Reminder</Text>
          <AntDesign name="arrowright" size={20} color="white" />
        </Pressable>
      </View>
    </View>
  );
};

export default function Onboarding() {
  console.log('🎯 Onboarding component rendering');
  const insets = useSafeAreaInsets();
  
  const completeOnboarding = useKriya(s => s.completeOnboarding);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Audio setup with expo-audio
  const AUDIO_URL = "https://res.cloudinary.com/dztfsdmcv/video/upload/v1757360585/Drifting_Echoes_j5fudj.mp3"
const IMAGE_URL= "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757413784/hflxxtpxtyrhrcteczzn_w1ll3e.webp"
  const audioPlayer = useAudioPlayer(AUDIO_URL);

   // Add state to track if audio is loading

  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);


  // Animation values
  const stepOpacity = useSharedValue(0);
  const navigationOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const subtitleOpacity = useSharedValue(1);
  const subtitleTranslateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const cardTranslateY = useSharedValue(0);
  const iconTranslateX = useSharedValue(0);
  const loadingOpacity = useSharedValue(0);
  const loadingScale = useSharedValue(0.8);

  // Loading text state
  const [currentLoadingText, setCurrentLoadingText] = useState("Act on your dharma...");
  const loadingTextOpacity = useSharedValue(0);
  
  const loadingTexts = [
    "Act on your dharma...",
    "One task at a time...",
    "Your journey begins now...",
  ];

  // Audio setup - Start playing immediately when component mounts
  useEffect(() => {
    let isMounted = true;
    let fadeInterval: ReturnType<typeof setInterval>;

    const startAmbientAudio = async () => {
      try {
        if (audioPlayer && isMounted) {
          console.log('🎵 Loading ambient music from network...');

             // Wait a moment for the audio to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!isMounted) return;
          
          // Configure audio properties
          audioPlayer.loop = true;
          audioPlayer.volume = 0.05;
          
          // Start playing
          audioPlayer.play();

            
          setAudioLoading(false);
          console.log('🎵 Ambient music started successfully');
          
          
          // Fade in over 2 seconds
          let currentVolume = 0.05;
          const targetVolume = 0.25; // Soft ambient level
          const fadeStep = (targetVolume - 0.05) / 45; // 45 steps for 1.5-second fade
          
          fadeInterval = setInterval(() => {
            if (currentVolume < targetVolume && audioPlayer) {
              currentVolume += fadeStep;
              audioPlayer.volume = Math.min(currentVolume, targetVolume);
            } else {
              clearInterval(fadeInterval);
            }
          }, 33); // ~30fps for smooth fade
        }
      } catch (error) {
 console.warn('Audio setup failed:', error);
        setAudioError(true);
        setAudioLoading(false);      }
    };

    startAmbientAudio();

    return () => {
      isMounted = false;
      if (fadeInterval) {
        clearInterval(fadeInterval);
      }
    };
  }, [audioPlayer]);

  // Function to fade out audio
  const fadeOutAudio = () => {
    if (!audioPlayer) return;
    
    try {
      const currentVolume = audioPlayer.volume || 0;
      const steps = 20;
      const volumeDecrement = currentVolume / steps;
      
      const fadeOutInterval = setInterval(() => {
        const newVolume = audioPlayer.volume - volumeDecrement;
        if (newVolume > 0) {
          audioPlayer.volume = Math.max(newVolume, 0);
        } else {
          audioPlayer.volume = 0;
          audioPlayer.pause();
          clearInterval(fadeOutInterval);
        }
      }, 30); // 1.2 second fade out
    } catch (error) {
      console.warn('Audio fade out failed:', error);
    }
  };

  

  // Icon animation
  useEffect(() => {
    iconTranslateX.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      false
    );
  }, [iconTranslateX]);

  // Loading text cycle
  const startLoadingTextCycle = () => {
    setCurrentLoadingText(loadingTexts[0]);
    loadingTextOpacity.value = withTiming(1, { duration: 600 });
    
    setTimeout(() => {
      loadingTextOpacity.value = withTiming(0, { duration: 400 });
      
      setTimeout(() => {
        setCurrentLoadingText(loadingTexts[1]);
        loadingTextOpacity.value = withTiming(1, { duration: 400 });
        
        setTimeout(() => {
          loadingTextOpacity.value = withTiming(0, { duration: 400 });
          
          setTimeout(() => {
            setCurrentLoadingText(loadingTexts[2]);
            loadingTextOpacity.value = withTiming(1, { duration: 400 });
          }, 400);
        }, 4000);
      }, 400);
    }, 2000);
  };

  const animateToOnboarding = () => {
    titleTranslateY.value = withTiming(-200, { duration: 800 });
    titleOpacity.value = withTiming(0, { duration: 600 });
    
    subtitleTranslateY.value = withTiming(-100, { duration: 700 });
    subtitleOpacity.value = withTiming(0, { duration: 500 });
    
    cardTranslateY.value = withTiming(300, { duration: 800 });
    cardOpacity.value = withTiming(0, { duration: 600 });
    
    setTimeout(() => {
      setCurrentStep(0);
      stepOpacity.value = withTiming(1, { duration: 800 });
      setTimeout(() => {
        navigationOpacity.value = withTiming(1, { duration: 600 });
      }, 300);
    }, 800);
  };

  const handleGetStarted = () => {
    console.log('🎯 Starting onboarding flow...');
    animateToOnboarding();
  };

  const handleNext = () => {
    const totalSteps = onboardingSteps.length + 1;
    
    if (currentStep < totalSteps - 1) {
      stepOpacity.value = withTiming(0, { duration: 300 });
      
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        stepOpacity.value = withTiming(1, { duration: 500 });
      }, 300);
    } else {
      console.log('🎯 Completing onboarding...');
      
      setIsLoading(true);
      
      stepOpacity.value = withTiming(0, { duration: 500 });
      navigationOpacity.value = withTiming(0, { duration: 500 });
      
      // Start fading out audio
      fadeOutAudio();
      
      setTimeout(() => {
        loadingOpacity.value = withTiming(1, { duration: 600 });
        loadingScale.value = withTiming(1, { duration: 600 });

        startLoadingTextCycle();
        
        setTimeout(() => {
          if (completeOnboarding) {
            completeOnboarding();
          }
          
          loadingOpacity.value = withTiming(0, { duration: 800 });
          
          setTimeout(() => {
            router.replace('/');
          }, 800);
        }, 12000);
      }, 500);
    }
  };

  const handleSkip = () => {
    console.log('🎯 Skipping onboarding...');
    
    setIsLoading(true);
    
    stepOpacity.value = withTiming(0, { duration: 500 });
    navigationOpacity.value = withTiming(0, { duration: 500 });
    
    // Start fading out audio
    fadeOutAudio();
    
    setTimeout(() => {
      loadingOpacity.value = withTiming(1, { duration: 600 });
      loadingScale.value = withTiming(1, { duration: 600 });

      startLoadingTextCycle();
      
      setTimeout(() => {
        if (completeOnboarding) {
          completeOnboarding();
        }
        
        loadingOpacity.value = withTiming(0, { duration: 800 });
        
        setTimeout(() => {
          router.replace('/');
        }, 800);
      }, 12000);
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
    transform: [{ translateY: iconTranslateX.value }],
  }));

  const animatedLoadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    transform: [{ scale: loadingScale.value }],
  }));

  const animatedLoadingTextStyle = useAnimatedStyle(() => ({
    opacity: loadingTextOpacity.value,
  }));

  const isNotificationSlide = currentStep === 3;

  // UPDATED: Add image status function
  // const renderImageStatus = () => {
  //   if (imageLoading && isLoading) {
  //     return (
  //       <View style={styles.imageStatusContainer}>
  //         <Text style={styles.imageStatusText}>🖼️ Loading image...</Text>
  //       </View>
  //     );
  //   }
  //   return null;
  // };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      <Animated.View style={[StyleSheet.absoluteFill]}>
        <BlurBackground />
      </Animated.View>
      
      <View style={styles.overlay} />

            {/* Show image loading status */}


            {/* {renderImageStatus()} */}

      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
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
              {isNotificationSlide ? (
                <NotificationSlide onNext={handleNext} />
              ) : (
                <View style={styles.stepContent}>
                  {currentStep < 3 ? (
                    <>
                      <AntDesign 
                        name={onboardingSteps[currentStep].icon as any} 
                        size={60} 
                        color="white" 
                        style={styles.stepIcon}
                      />
                      <Text style={styles.stepTitle}>{onboardingSteps[currentStep].title}</Text>
                      <Text style={styles.stepDescription}>{onboardingSteps[currentStep].description}</Text>
                    </>
                  ) : (
                    <>
                      <AntDesign 
                        name={onboardingSteps[3].icon as any} 
                        size={60} 
                        color="white" 
                        style={styles.stepIcon}
                      />
                      <Text style={styles.stepTitle}>{onboardingSteps[3].title}</Text>
                      <Text style={styles.stepDescription}>{onboardingSteps[3].description}</Text>
                    </>
                  )}
                  
                  <View style={styles.progressContainer}>
                    {[0, 1, 2, 3, 4].map((index) => (
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
              )}
            </Animated.View>
          )}

          {/* Loading Screen - FIXED to prevent crashes */}
          {isLoading && (
            <Animated.View style={[styles.loadingContainer, animatedLoadingStyle]}>
               <Image 
                source={{ uri: IMAGE_URL }}
                style={styles.gitaImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
               {imageError && (
                <View style={styles.imageFallback}>
                  <Text style={styles.fallbackText}>🕉️</Text>
                  <Text style={styles.fallbackSubText}>Image unavailable</Text>
                </View>
              )}

              <Animated.Text style={[styles.loadingText, animatedLoadingTextStyle]}>
                {currentLoadingText}
              </Animated.Text>
              
              <View style={{marginTop:40, marginBottom:20}}>
                <Spinner size="small" color='#0ccebe5e' />
              </View>
            </Animated.View>
          )}
        </View>

        {/* Bottom modal card */}
        {currentStep === -1 && !isLoading && (
          <Animated.View style={[styles.bottomCard, animatedCardStyle]}>
            <View style={styles.cardContent}>
              <Animated.View style={[styles.arrowContainer, animatedIconStyle]}>
                <Feather
                  name="chevrons-down"
                  size={28}
                  color="rgba(104, 164, 177, 0.58)"
                />
              </Animated.View>
              
              <Pressable onPress={handleGetStarted} style={styles.actionButton}>
                <Text style={styles.buttonText}> Begin the Journey</Text>
                <Text style={{fontSize:20}}>🪷</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Navigation */}
        {currentStep >= 0 && !isLoading && !isNotificationSlide && (
          <Animated.View style={[styles.navigationContainer, animatedNavigationStyle]}>
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            
            <Pressable onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextText}>
                {currentStep === 4 ? 'Next' : 'Next'}
              </Text>
              <AntDesign name="arrowright" size={20} color="white" />
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ...styles remain exactly the same...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a6b7add',
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
    marginTop: -100,
  },
  title: {
    fontSize: 80,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Instrument Serif',
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
    fontFamily: 'Source Serif Pro',
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
    fontFamily: 'Space Mono',
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
letterSpacing: 1,
    marginRight: 12,
fontFamily: 'Source Serif Pro',



  },
  
  // Onboarding styles
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -50,
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
    fontSize: 21,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Instrument Serif',
    letterSpacing: 1,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    paddingBottom: 50,
    paddingTop: 20,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'Space Mono',
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
    fontFamily: 'Space Mono',
  },
  
  // Loading screen styles
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
    fontFamily: 'Source Serif Pro',
    fontStyle: 'italic',
  },

  // NEW: Image status and fallback styles
  imageStatusContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageStatusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    textAlign: 'center',
    fontFamily: 'Space Mono',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 1,
    height: SCREEN_WIDTH * 1 * 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 20,
  },
  fallbackText: {
    fontSize: 60,
    marginBottom: 8,
  },
  fallbackSubText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'Space Mono',
  },

  // NEW: Notification slide styles
  notificationSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  notificationContent: {
    alignItems: 'center',
    width: '100%',
  },
  timePickerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  timePickerLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Source Serif Pro',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeSection: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timeScroll: {
    height: 120,
    width: 60,
  },
  timeOption: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
    gitaImage: {
    width: SCREEN_WIDTH * 1, // 100% of screen width for horizontal image
    height: SCREEN_WIDTH * 1 * 0.6, // Maintain aspect ratio (assuming 5:3 ratio)
    marginBottom: 20,
    borderRadius: 12,
    opacity: 0.9,
  },
  selectedTimeOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    fontFamily: 'Space Mono',
  },
  selectedTimeText: {
    color: '#fff',
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 16,
    fontFamily: 'Space Mono',
  },
  reminderNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 20,
  },
  notificationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: 'Space Mono',
  },
});
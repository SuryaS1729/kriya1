import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,
  Platform,
  Image,
  useColorScheme,
  Touchable,
  TouchableOpacity
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
import DateTimePicker from '@react-native-community/datetimepicker'; // Add this import

import { Feather } from '@expo/vector-icons';
import { Spinner } from '@/components/ui/spinner';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Theme configuration
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
    arrowColor: "rgba(104, 164, 177, 0.58)",
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
    arrowColor: "rgba(37, 188, 208, 0.7)",
    spinnerColor: '#0ccebe',
    imageFallbackBackground: 'rgba(26, 54, 93, 0.1)',
  }
};

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


// Update the NotificationSlide component
// ...existing code...

// Update the NotificationSlide component
const NotificationSlide = ({ onNext, theme }: { onNext: () => void, theme: any }) => {
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const setReminderTime = useKriya(s => s.setReminderTime);

  // Initialize with 8:00 AM
  useEffect(() => {
    const initialTime = new Date();
    initialTime.setHours(8, 0, 0, 0);
    setSelectedTime(initialTime);
  }, []);

  const handleTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (time) {
      setSelectedTime(time);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContinue = async () => {
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    await setReminderTime(hours, minutes);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  const getReminderTime = () => {
    const reminderTime = new Date(selectedTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 10);
    
    return reminderTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getDisplayTime = () => {
    return selectedTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <View style={styles.notificationContent}>
      <Feather name="bell" size={60} color={theme.text} style={styles.stepIcon} />
      
      <Text style={[styles.stepTitle, { color: theme.text }]}>
        When do you start your day?
      </Text>
      
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Kriya expects you to write down tasks just before you begin your day. We'll send you a gentle reminder 10 minutes before your chosen time.
      </Text>

      <View style={[styles.timePickerContainer, { 
        backgroundColor: theme.timePickerBackground, 
        borderColor: theme.borderSecondary 
      }]}>
        <Text style={[styles.timePickerLabel, { color: theme.text }]}>
          I usually start my day at:
        </Text>
        
        {/* Native Time Picker */}
        {Platform.OS === 'ios' ? (
          <View style={styles.iosTimePickerContainer}>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="compact" // Changed from "wheels" to "compact"
              onChange={handleTimeChange}
              style={styles.iosTimePicker}
              textColor={theme.text}
              themeVariant={theme === themes.dark ? 'dark' : 'light'}
            />
          </View>
        ) : (
          // Android: Show button to open picker
        <View style={styles.androidTimePickerContainer}>
            <TouchableOpacity // Changed from Pressable to TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={[styles.androidTimeButton, { 
                backgroundColor: theme.selectedTimeBackground,
                borderColor: theme.border
              }]}
              activeOpacity={0.7} // Add touch feedback
            >
              <Text style={[styles.androidTimeText, { color: theme.text }]}>
                {getDisplayTime()}
              </Text>
              <Feather name="clock" size={20} color={theme.text} />
            </TouchableOpacity>
            
            {showPicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>
        )}

        <Text style={[styles.reminderNote, { color: theme.textQuaternary }]}>
          📱 You'll receive a reminder at {getReminderTime()} (10 minutes before)
        </Text>
      </View>

      {/* <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View 
            key={index}
            style={[
              styles.progressDot,
              { backgroundColor: theme.progressDot },
              index === 4 && { backgroundColor: theme.text, width: 12, height: 12, borderRadius: 6 }
            ]}
          />
        ))}
      </View> */}
    </View>
  );
};

// ...rest of your component remains the same...


export default function Onboarding() {
  // console.log('🎯 Onboarding component rendering');
  const insets = useSafeAreaInsets();
  
  // Clean color scheme detection
  const colorScheme = "dark"; 
  const theme = themes[colorScheme === 'dark' ? 'dark' : 'light'];
  
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
  // Add this new animated component after your other useSharedValue declarations
const shimmerTranslateX = useSharedValue(-200);
  const nextButtonScale = useSharedValue(1);

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
          // console.log('🎵 Loading ambient music from network...');

             // Wait a moment for the audio to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!isMounted) return;
          
          // Configure audio properties
          audioPlayer.loop = true;
          audioPlayer.volume = 0.05;
          
          // Start playing
          audioPlayer.play();

            
          setAudioLoading(false);
          // console.log('🎵 Ambient music started successfully');
          
          
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
//  console.warn('Audio setup failed:', error);
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
      // console.warn('Audio fade out failed:', error);
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
  // Add shimmer animation in useEffect (add this after your icon animation)
useEffect(() => {
  // Start shimmer animation with a delay, then repeat
  const startShimmer = () => {
    shimmerTranslateX.value = -200;
    shimmerTranslateX.value = withRepeat(
      withSequence(
        withTiming(-200, { duration: 0 }), // Reset position
        withTiming(400, { duration: 1700 }), // Animate across
        withTiming(400, { duration: 2000 }) // Pause before repeat
      ),
      -1,
      false
    );
  };
  
  // Start after a short delay
  const timer = setTimeout(startShimmer, 1000);
  
  return () => clearTimeout(timer);
}, [shimmerTranslateX]);

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // console.log('🎯 Starting onboarding flow...');
    animateToOnboarding();
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Add scale animation
    nextButtonScale.value = withSequence(
      withTiming(0.92, { duration: 60 }), // Faster and more scale down
      withTiming(1.02, { duration: 80 }), // Slight overshoot for bounce
      withTiming(1, { duration: 100 })  
    );

    const totalSteps = onboardingSteps.length + 1;
    
    if (currentStep < totalSteps - 1) {
      stepOpacity.value = withTiming(0, { duration: 300 });
      
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        stepOpacity.value = withTiming(1, { duration: 500 });
      }, 300);
    } else {
      // console.log('🎯 Completing onboarding...');
      
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
  const animatedShimmerStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: shimmerTranslateX.value }],
}));
const animatedNextButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextButtonScale.value }],
  }));

  const isNotificationSlide = currentStep === 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar hidden={true} />

      <Animated.View style={[StyleSheet.absoluteFill]}>
        <BlurBackground />
      </Animated.View>
      
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[styles.titleContainer, animatedTitleStyle]}>
            <Text style={[styles.title, { color: theme.text }]}>kriya</Text>
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>ancient wisdom, modern rhythm</Text>
          </Animated.View>
          
          {currentStep === -1 && !isLoading && (
            <Animated.View style={[styles.subtitleContainer, animatedSubtitleStyle, { borderColor: theme.text }]}>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>free • offline • no signup • open source</Text>
            </Animated.View>
          )}

          {/* Onboarding Steps */}
          {currentStep >= 0 && !isLoading && (
            <Animated.View style={[styles.onboardingContainer, animatedStepStyle]}>
              {isNotificationSlide ? (
                <NotificationSlide onNext={handleNext} theme={theme} />
              ) : (
                <View style={styles.stepContent}>
                  {currentStep < 3 ? (
                    <>
                      <AntDesign 
                        name={onboardingSteps[currentStep].icon as any} 
                        size={60} 
                        color={theme.text} 
                        style={styles.stepIcon}
                      />
                      <Text style={[styles.stepTitle, { color: theme.text }]}>{onboardingSteps[currentStep].title}</Text>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>{onboardingSteps[currentStep].description}</Text>
                    </>
                  ) : (
                    <>
                      <AntDesign 
                        name={onboardingSteps[3].icon as any} 
                        size={60} 
                        color={theme.text} 
                        style={styles.stepIcon}
                      />
                      <Text style={[styles.stepTitle, { color: theme.text }]}>{onboardingSteps[3].title}</Text>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>{onboardingSteps[3].description}</Text>
                    </>
                  )}
                  
                  <View style={styles.progressContainer}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <View 
                        key={index}
                        style={[
                          styles.progressDot,
                          { backgroundColor: theme.progressDot },
                          index === currentStep && { backgroundColor: theme.text, width: 12, height: 12, borderRadius: 6 }
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* Loading Screen */}
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
                <View style={[styles.imageFallback, { backgroundColor: theme.imageFallbackBackground, borderColor: theme.border }]}>
                  <Text style={styles.fallbackText}>🕉️</Text>
                  <Text style={[styles.fallbackSubText, { color: theme.textQuaternary }]}>Image unavailable</Text>
                </View>
              )}

               {/* Image Credit */}
              <Text style={[styles.imageCredit, { color: theme.textQuaternary }]}>
               "Partha-Sarathi" by Giampaolo Tomassetti
              </Text>

              <Animated.Text style={[styles.loadingText, animatedLoadingTextStyle, { color: theme.textSecondary }]}>
                {currentLoadingText}
              </Animated.Text>
              
              <View style={{marginTop:40, marginBottom:20}}>
                <Spinner size="small" color={theme.spinnerColor} />
              </View>
            </Animated.View>
          )}
        </View>

        {/* Bottom modal card */}
    {/* // Update your bottom card section with the shimmer effect */}
{currentStep === -1 && !isLoading && (
  <Animated.View style={[styles.bottomCard, animatedCardStyle, { backgroundColor: theme.cardBackground }]}>

    <View style={styles.cardContent}>
      <Animated.View style={[styles.arrowContainer, animatedIconStyle]}>
        <Feather
          name="chevrons-down"
          size={30}
          color={theme.arrowColor}
        />
      </Animated.View>
      <TouchableOpacity 
        onPress={handleGetStarted} 
               activeOpacity={0.8} 

        style={[styles.actionButton, { backgroundColor: theme.buttonBackground, borderColor: theme.border }]}
      ><View style={styles.shimmerContainer}>
          <Animated.View style={[styles.shimmerOverlay, animatedShimmerStyle]}>
            <LinearGradient
              colors={[
    'rgba(255, 255, 255, 0)',      // Transparent
                'rgba(255, 255, 255, 0.051)',
                'rgba(255, 255, 255, 0.051)',
                'rgba(255, 255, 255, 0.04)',
                'rgba(255, 255, 255, 0)'
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </View>
        <Text style={[styles.buttonText, { color: theme.text }]}>Begin the Journey</Text>
        <Text style={{fontSize:20}}>🪷</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
)}

        {/* Navigation */}
      {currentStep >= 0 && !isLoading && (
  <Animated.View style={[
    styles.navigationContainer, 
    animatedNavigationStyle,
    isNotificationSlide && styles.navigationContainerCentered
  ]}>
    {!isNotificationSlide && (
      <TouchableOpacity 
        onPress={handleSkip} 
        style={styles.skipButton}
        activeOpacity={0.6} // Add touch feedback
      >
        <Text style={[styles.skipText, { color: theme.textTertiary }]}>Skip</Text>
      </TouchableOpacity>
    )}
    
   <Animated.View style={animatedNextButtonStyle}>
            <TouchableOpacity 
              onPress={handleNext} 
              style={[styles.nextButton, { backgroundColor: theme.buttonBackgroundSecondary, borderColor: theme.border }]}
              activeOpacity={1} // Remove default opacity change since we're using custom scale
            >
              <Text style={[styles.nextText, { color: theme.text }]}>
                {isNotificationSlide ? 'Set Reminder' : 'Next'}
              </Text>
              <AntDesign name="arrowright" size={20} color={theme.text} />
            </TouchableOpacity>
          </Animated.View>
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
    height: SCREEN_HEIGHT * 0.30,
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
    justifyContent: "center",
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2.4,
    marginTop: 16,
    marginBottom: 20,
    overflow: 'hidden', // Important: ensures shimmer doesn't overflow button bounds
    position: 'relative', // For absolute positioning of shimmer
    // 3D Effect Properties
    shadowColor: '#00fff783',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 5, // Android shadow
    // Additional 3D styling
    transform: [{ translateY: -2 }], // Lift the button slightly
  },
    // New shimmer styles
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRadius: 25, // Match button border radius
  },
  
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100, // Width of the shimmer effect
    transform: [{ skewX: '-15deg' }], // Slight angle for more realistic effect
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
  
  // Loading screen styles
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
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH * 1,
    height: SCREEN_WIDTH * 1 * 0.6,
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

  // Notification slide styles
  notificationContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    minHeight: '80%', // Ensure it takes enough space but allows for accessibility scaling
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
    fontSize: 20, // Larger for better readability
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24, // Increased spacing
    fontFamily: 'Source Serif Pro',
    lineHeight: 28, // Better line height for accessibility
  },
  // iOS Time Picker Styles
  iosTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  
  iosTimePicker: {
    width: 320,
    height: 120,
  },

  // Android Time Picker Styles
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
    minHeight: 48, // Accessibility guideline
  },
  
  androidTimeText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Space Mono',
    marginRight: 12,
  },
  gitaImage: {
    width: SCREEN_WIDTH * 1,
    height: SCREEN_WIDTH * 1 * 0.6,
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
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    marginTop: 20,
    minHeight: 44, // Accessibility guideline for touch targets
  },
  notificationButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    fontFamily: 'Space Mono',
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useKriya } from '../../lib/store';
import AntDesign from '@expo/vector-icons/AntDesign';
import BlurBackground from '../../components/BlurBackground';
import Animated from 'react-native-reanimated';
import BlurEdge from '../../components/BlurEdge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Onboarding() {
  console.log('🎯 Onboarding component rendering');
  const insets = useSafeAreaInsets();
  
  const completeOnboarding = useKriya(s => s.completeOnboarding);

  // Video player setup
  const player = useVideoPlayer(require('../../assets/videos/kriya.mp4'), player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const handleGetStarted = () => {
    console.log('🎯 Completing onboarding...');
    if (completeOnboarding) {
      completeOnboarding();
    }
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Video Background */}
      <Animated.View style={[StyleSheet.absoluteFill]}>
        <BlurBackground />
        

        
        {/* Bottom Edge Blur */}
        {/* <BlurEdge
          height={50 + insets.bottom}
          colors={["rgba(0, 0, 0, 0)", "#000000cd"]}
          style={[styles.blur, styles.bottomBlur, { bottom: 0 }]}
        /> */}
      </Animated.View>
      
      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Main title - positioned in upper portion */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>kriya</Text>
            <Text style={styles.tagline}>ancient wisdom, modern rhythm</Text>
            
          </View>
          <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>free • offline • no signup • open source</Text>
            </View>
        </View>

        {/* Bottom modal card */}
        <View style={styles.bottomCard}>
          <View style={styles.cardContent}>
            {/* Subtitle text */}
            

            {/* Action button */}
            <Pressable onPress={handleGetStarted} style={styles.actionButton}>
              <Text style={styles.buttonText}>step into action</Text>
              <AntDesign 
                style={styles.buttonArrow} 
                name="arrowright" 
                size={24} 
                color="white"
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#023747e0',
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
    marginTop: -160, // Move title slightly up to accommodate bottom card
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
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.30, // Bottom third
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
  subtitleContainer: {
    padding: 10,
    alignItems: 'center',

    borderWidth: 0.5,
    borderColor: "white",
    borderRadius: 30,
    paddingHorizontal: 13,
  },
  subtitle: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '300',
    fontFamily: 'SpaceMono',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent:"center",
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 230,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 16,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: 1,
    marginRight: 12,

  },
  buttonArrow: {
    color: 'white',
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
});
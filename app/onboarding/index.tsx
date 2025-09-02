import React, { useState } from 'react';
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
import { VideoView, useVideoPlayer } from 'expo-video';
import { useKriya } from '../../lib/store';
import AntDesign from '@expo/vector-icons/AntDesign';
import BlurBackground from '../../components/BlurBackground';
import Animated from 'react-native-reanimated';
import BlurEdge from '../../components/BlurEdge';
import { Canvas, Blur, RoundedRect, Fill } from '@shopify/react-native-skia';


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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Video Background */}
       <Animated.View style={[StyleSheet.absoluteFill]}>
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
      
      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Main title - positioned in upper portion */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>kriya</Text>
          </View>
        </View>

        {/* Bottom modal card with Skia blur */}
        <View style={styles.bottomCard}>
          <Canvas style={StyleSheet.absoluteFill}>
            <RoundedRect
              x={0}
              y={0}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT * 0.35}
              r={24}
            >
              <Fill color="transparent" />
              <Blur blur={100} />
            </RoundedRect>
          </Canvas>
          
          <View style={styles.cardContent}>
            {/* Subtitle text */}
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>free • offline • no signup • open source</Text>
            </View>

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
    backgroundColor: '#021047ff',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  titleContainer: {
    marginTop: -200, // Move title slightly up to accommodate bottom card
  },
  title: {
    fontSize: 120,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Instrument',
    fontStyle: 'italic',
    letterSpacing: 2,
    fontWeight: '200',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35, // Bottom third
    // Remove backgroundColor since Skia handles it
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,


    overflow: 'hidden', // Ensure rounded corners work properly
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  subtitleContainer: {
    padding:10,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth:1,
    borderColor:"white",
    borderRadius:30,
    paddingHorizontal:13
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 1,
    fontWeight: '300',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 230,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
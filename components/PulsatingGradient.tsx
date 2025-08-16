// components/PulsatingGradient.tsx
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PulsatingGradient() {
  const fade = useRef(new Animated.Value(0)).current; // 0..1 top gradient opacity
  const drift = useRef(new Animated.Value(0)).current; // -1..1 subtle movement

  useEffect(() => {
    // Opacity pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Gentle drift left-right
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: -1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [fade, drift]);

  const translateX = drift.interpolate({
    inputRange: [-1, 1],
    outputRange: [-8, 8], // tweak for more/less motion
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Base gradient */}
      <LinearGradient
        colors={['#0e4570', '#b1c62dff']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top gradient cross-fading + drifting for a watery shimmer */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['#116399', '#09365a']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

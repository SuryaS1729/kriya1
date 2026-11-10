import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PressableScale } from 'pressto';
import WaveDotsLoader from './WaveDotsLoader';
import { SPLASH_BACKGROUND } from '../lib/splash';

// Same artwork and size as the native splash (app.json → imageWidth: 200),
// so if startup runs long this reads as the splash coming alive.
const WORDMARK = require('../assets/icons/splash-icon-light.png');
const WORDMARK_SIZE = 200;

type Props =
  | { state: 'loading' }
  | { state: 'failed'; onRetry: () => void };

export default function StartupScreen(props: Props) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image source={WORDMARK} style={styles.wordmark} resizeMode="contain" />

      <View style={styles.below}>
        {props.state === 'loading' ? (
          // No haptics: this is a quiet fallback, not a moment.
          <WaveDotsLoader color="#ffffff" haptics={false} />
        ) : (
          <View style={styles.errorBlock}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorBody}>
              Kriya couldn&apos;t open its library. Try again, or close and reopen the app.
            </Text>
            <PressableScale onPress={props.onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </PressableScale>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    width: WORDMARK_SIZE,
    height: WORDMARK_SIZE,
  },
  // Sits under the wordmark without shifting it off the splash position.
  below: {
    position: 'absolute',
    top: '50%',
    marginTop: WORDMARK_SIZE / 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorBlock: {
    alignItems: 'center',
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  errorBody: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontFamily: 'Source Serif Pro',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 13,
    letterSpacing: 1.5,
    fontFamily: 'Space Mono',
  },
});

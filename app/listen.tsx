// app/listen.tsx — Continuous Gita Audio Player
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

import { useKriya } from '../lib/store';
import { getShlokaAt, getTotalShlokas } from '../lib/shloka';
import { textToSpeech } from '../lib/tts';
import { buttonPressHaptic, taskCompleteHaptic } from '../lib/haptics';
import type { ShlokaRow } from '../lib/shloka';

type PlaybackPhase = 'idle' | 'loading' | 'hindi' | 'english' | 'advancing';

export default function ListenScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useKriya(s => s.isDarkMode);
  const listenProgress = useKriya(s => s.listenProgress);
  const setListenProgress = useKriya(s => s.setListenProgress);

  const totalShlokas = getTotalShlokas();

  const [currentIndex, setCurrentIndex] = useState(listenProgress.shlokaIndex);
  const [shloka, setShloka] = useState<ShlokaRow | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<PlaybackPhase>('idle');

  const abortRef = useRef(false);
  const audioPlayer = useAudioPlayer(null);

  // Pulse animation for the now-playing indicator
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [isPlaying]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Load shloka data when index changes
  useEffect(() => {
    const data = getShlokaAt(currentIndex);
    setShloka(data);
    setListenProgress(currentIndex);
  }, [currentIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  const playAudio = useCallback(async (base64Audio: string): Promise<boolean> => {
    try {
      const tempFile = `${FileSystem.cacheDirectory}listen_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempFile, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      audioPlayer.replace({ uri: tempFile });
      audioPlayer.play();

      return new Promise((resolve) => {
        const checkStatus = setInterval(() => {
          if (abortRef.current) {
            clearInterval(checkStatus);
            try { audioPlayer.pause(); } catch {}
            resolve(false);
          } else if (!audioPlayer.playing && audioPlayer.currentTime > 0) {
            clearInterval(checkStatus);
            FileSystem.deleteAsync(tempFile, { idempotent: true });
            resolve(true);
          }
        }, 100);
      });
    } catch (error) {
      console.error('[Listen] Playback error:', error);
      return false;
    }
  }, [audioPlayer]);

  const playShloka = useCallback(async (index: number) => {
    const data = getShlokaAt(index);
    if (!data) return;

    setPhase('loading');

    try {
      // Build English text
      const translation = data.translation_2 ?? data.description ?? '';
      let englishText = '';
      if (translation) englishText += `Translation. ${translation}`;
      if (data.commentary) englishText += ` ... Commentary. ${data.commentary}`;

      // Fetch both audio files in parallel
      const [hindiAudio, englishAudio] = await Promise.all([
        textToSpeech(data.text, 'hi-IN', data.chapter_number, data.verse_number),
        englishText ? textToSpeech(englishText, 'en-IN', data.chapter_number, data.verse_number) : Promise.resolve(null),
      ]);

      if (abortRef.current || !hindiAudio) {
        setPhase('idle');
        return false;
      }

      // Play Hindi
      setPhase('hindi');
      const hindiDone = await playAudio(hindiAudio);
      if (!hindiDone || abortRef.current) {
        setPhase('idle');
        return false;
      }

      // Play English
      if (englishAudio) {
        setPhase('english');
        const englishDone = await playAudio(englishAudio);
        if (!englishDone || abortRef.current) {
          setPhase('idle');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[Listen] Error:', error);
      setPhase('idle');
      return false;
    }
  }, [playAudio]);

  const startPlayback = useCallback(async () => {
    abortRef.current = false;
    setIsPlaying(true);

    let idx = currentIndex;

    while (!abortRef.current && idx < totalShlokas) {
      setCurrentIndex(idx);

      const completed = await playShloka(idx);
      if (!completed || abortRef.current) break;

      // Auto-advance
      idx++;
      if (idx < totalShlokas) {
        setPhase('advancing');
        await new Promise(r => setTimeout(r, 800)); // Brief pause between shlokas
      }
    }

    setPhase('idle');
    setIsPlaying(false);

    if (idx >= totalShlokas) {
      taskCompleteHaptic();
    }
  }, [currentIndex, totalShlokas, playShloka]);

  const handlePlayPause = useCallback(() => {
    buttonPressHaptic();
    if (isPlaying) {
      abortRef.current = true;
      try { audioPlayer.pause(); } catch {}
      setIsPlaying(false);
      setPhase('idle');
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, audioPlayer]);

  const handlePrevious = useCallback(() => {
    buttonPressHaptic();
    if (currentIndex > 0) {
      abortRef.current = true;
      try { audioPlayer.pause(); } catch {}
      const wasPlaying = isPlaying;
      setIsPlaying(false);
      setPhase('idle');

      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);

      if (wasPlaying) {
        // Restart playback from new index after a tick
        setTimeout(() => {
          abortRef.current = false;
          setIsPlaying(true);
          (async () => {
            let idx = newIndex;
            while (!abortRef.current && idx < totalShlokas) {
              setCurrentIndex(idx);
              const completed = await playShloka(idx);
              if (!completed || abortRef.current) break;
              idx++;
              if (idx < totalShlokas) {
                setPhase('advancing');
                await new Promise(r => setTimeout(r, 800));
              }
            }
            setPhase('idle');
            setIsPlaying(false);
          })();
        }, 100);
      }
    }
  }, [currentIndex, isPlaying, audioPlayer, totalShlokas, playShloka]);

  const handleNext = useCallback(() => {
    buttonPressHaptic();
    if (currentIndex < totalShlokas - 1) {
      abortRef.current = true;
      try { audioPlayer.pause(); } catch {}
      const wasPlaying = isPlaying;
      setIsPlaying(false);
      setPhase('idle');

      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);

      if (wasPlaying) {
        setTimeout(() => {
          abortRef.current = false;
          setIsPlaying(true);
          (async () => {
            let idx = newIndex;
            while (!abortRef.current && idx < totalShlokas) {
              setCurrentIndex(idx);
              const completed = await playShloka(idx);
              if (!completed || abortRef.current) break;
              idx++;
              if (idx < totalShlokas) {
                setPhase('advancing');
                await new Promise(r => setTimeout(r, 800));
              }
            }
            setPhase('idle');
            setIsPlaying(false);
          })();
        }, 100);
      }
    }
  }, [currentIndex, isPlaying, audioPlayer, totalShlokas, playShloka]);

  const phaseLabel = (): string => {
    switch (phase) {
      case 'loading': return 'Loading audio...';
      case 'hindi': return 'Playing Sanskrit shloka';
      case 'english': return 'Playing translation & commentary';
      case 'advancing': return 'Next shloka...';
      default: return isPlaying ? 'Playing' : 'Paused';
    }
  };

  const progressPercent = totalShlokas > 0 ? ((currentIndex + 1) / totalShlokas) * 100 : 0;

  return (
    <View style={[styles.container, { 
      backgroundColor: isDarkMode ? '#0a0f1a' : '#f0f4f8',
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { buttonPressHaptic(); router.back(); }} hitSlop={12}>
          <Feather name="chevron-down" size={28} color={isDarkMode ? '#e5e7eb' : '#374151'} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#f9fafb' : '#111827' }]}>
          Listen to Gita
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Chapter / Verse indicator */}
      {shloka && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.chapterBadge}>
          <Text style={[styles.chapterText, { color: isDarkMode ? '#93c5fd' : '#3b82f6' }]}>
            Adhyaya {shloka.chapter_number}, Shloka {shloka.verse_number}
          </Text>
        </Animated.View>
      )}

      {/* Shloka text */}
      <ScrollView
        style={styles.textContainer}
        contentContainerStyle={styles.textContent}
        showsVerticalScrollIndicator={false}
      >
        {shloka ? (
          <>
            <Text style={[styles.sanskritText, { color: isDarkMode ? '#e2e8f0' : '#1e293b' }]}>
              {shloka.text}
            </Text>
            <View style={[styles.divider, { backgroundColor: isDarkMode ? '#1e3a5f' : '#cbd5e1' }]} />
            <Text style={[styles.translationText, { color: isDarkMode ? '#94a3b8' : '#475569' }]}>
              {shloka.translation_2 || shloka.description || ''}
            </Text>
          </>
        ) : (
          <ActivityIndicator size="large" color={isDarkMode ? '#60a5fa' : '#3b82f6'} />
        )}
      </ScrollView>

      {/* Phase indicator */}
      <View style={styles.phaseContainer}>
        {isPlaying && (
          <Animated.View style={[styles.pulseDot, pulseStyle, {
            backgroundColor: isDarkMode ? '#60a5fa' : '#3b82f6',
          }]} />
        )}
        <Text style={[styles.phaseText, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
          {phaseLabel()}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
          <View style={[styles.progressFill, { 
            width: `${progressPercent}%`,
            backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb',
          }]} />
        </View>
        <Text style={[styles.progressText, { color: isDarkMode ? '#6b7280' : '#9ca3af' }]}>
          Shloka {currentIndex + 1} of {totalShlokas}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          onPress={handlePrevious}
          disabled={currentIndex === 0}
          style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Feather
            name="skip-back"
            size={28}
            color={currentIndex === 0
              ? (isDarkMode ? '#374151' : '#d1d5db')
              : (isDarkMode ? '#e5e7eb' : '#374151')}
          />
        </Pressable>

        <Pressable
          onPress={handlePlayPause}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb' },
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
        >
          {phase === 'loading' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#ffffff"
              style={isPlaying ? {} : { marginLeft: 3 }}
            />
          )}
        </Pressable>

        <Pressable
          onPress={handleNext}
          disabled={currentIndex >= totalShlokas - 1}
          style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Feather
            name="skip-forward"
            size={28}
            color={currentIndex >= totalShlokas - 1
              ? (isDarkMode ? '#374151' : '#d1d5db')
              : (isDarkMode ? '#e5e7eb' : '#374151')}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
  },
  chapterBadge: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chapterText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  textContainer: {
    flex: 1,
    marginHorizontal: 24,
  },
  textContent: {
    paddingVertical: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  sanskritText: {
    fontSize: 20,
    lineHeight: 34,
    textAlign: 'center',
    fontFamily: 'Tiro Devanagari Sanskrit',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginVertical: 16,
    marginHorizontal: 40,
  },
  translationText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Space Mono',
    fontWeight: '400',
  },
  phaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressSection: {
    paddingHorizontal: 32,
    paddingBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 24,
    paddingBottom: 32,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

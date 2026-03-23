import { useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

import {
  AMBIENT_AUDIO_URL,
  AUDIO_FADE_IN_DURATION,
  AUDIO_FADE_OUT_DURATION,
  AUDIO_INITIAL_VOLUME,
  AUDIO_START_DELAY,
  AUDIO_TARGET_VOLUME,
} from './constants';

/**
 * Custom hook that manages ambient audio with smooth Reanimated-driven
 * volume fading (replaces the old setInterval approach).
 */
export function useAmbientAudio() {
  const audioPlayer = useAudioPlayer(AMBIENT_AUDIO_URL);
  const isMountedRef = useRef(true);
  const hasStartedRef = useRef(false);

  // Shared value drives the volume; Reanimated interpolates it frame-by-frame.
  const volume = useSharedValue(0);

  // Bridge from UI thread → JS thread to update the native player volume.
  const applyVolume = useCallback(
    (v: number) => {
      if (!audioPlayer || !isMountedRef.current) return;
      try {
        audioPlayer.volume = Math.max(0, Math.min(v, 1));
      } catch {
        // Player may be released during teardown.
      }
    },
    [audioPlayer],
  );

  const safelyPause = useCallback(() => {
    if (!audioPlayer || !isMountedRef.current) return;
    try {
      audioPlayer.pause();
    } catch {
      // Already released.
    }
  }, [audioPlayer]);

  // React to volume shared-value changes and apply to the native player.
  useAnimatedReaction(
    () => volume.value,
    (current) => {
      runOnJS(applyVolume)(current);
    },
  );

  // Start ambient audio after a short delay.
  useEffect(() => {
    isMountedRef.current = true;

    if (!audioPlayer || hasStartedRef.current) return;

    const timer = setTimeout(() => {
      if (!isMountedRef.current || !audioPlayer) return;

      hasStartedRef.current = true;
      audioPlayer.loop = true;
      audioPlayer.volume = AUDIO_INITIAL_VOLUME;
      audioPlayer.play();

      // Animate volume from initial → target using Reanimated.
      volume.value = AUDIO_INITIAL_VOLUME;
      volume.value = withTiming(AUDIO_TARGET_VOLUME, {
        duration: AUDIO_FADE_IN_DURATION,
      });
    }, AUDIO_START_DELAY);

    return () => clearTimeout(timer);
  }, [audioPlayer, volume]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelAnimation(volume);
      safelyPause();
    };
  }, [volume, safelyPause]);

  /** Smoothly fade out audio then pause the player. */
  const fadeOut = useCallback(() => {
    if (!audioPlayer) return;

    volume.value = withTiming(0, { duration: AUDIO_FADE_OUT_DURATION });

    // Pause after the fade completes.
    setTimeout(() => {
      safelyPause();
    }, AUDIO_FADE_OUT_DURATION + 50);
  }, [audioPlayer, volume, safelyPause]);

  return { fadeOut, audioPlayer };
}

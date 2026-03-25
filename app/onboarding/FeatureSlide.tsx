import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { FeatureStep as FeatureStepType, Theme } from '../../lib/onboarding/constants';

type FeatureSlideProps = {
  step: FeatureStepType;
  theme: Theme;
};

export default function FeatureSlide({ step, theme }: FeatureSlideProps) {
  const player = useVideoPlayer(step.videoUrl ?? null, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      {step.videoUrl ? (
        <View style={styles.videoContainer}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </View>
      ) : step.icon ? (
        <AntDesign name={step.icon} size={60} color={theme.text} style={styles.icon} />
      ) : null}

      <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {step.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  icon: {
    marginBottom: 30,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 3 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 90,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Instrument Serif',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Source Serif Pro',
  },
});

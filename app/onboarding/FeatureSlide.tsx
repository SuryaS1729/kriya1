import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { FeatureStep as FeatureStepType, Theme } from '../../lib/onboarding/constants';
import type { VideoPlayer } from 'expo-video';

type FeatureSlideProps = {
  step: FeatureStepType;
  theme: Theme;
  isActive: boolean;
};

/** Inline replica of the "View in English" toggle pill */
function TranslateButton({ isDark }: { isDark: boolean }) {
  return (
    <View style={[
      styles.inlineToggleButton,
      { backgroundColor: isDark ? '#4b556365' : '#ffffffff' },
    ]}>
      <Text style={[
        styles.inlineToggleText,
        { color: isDark ? '#f9fafb' : '#000000ff' },
      ]}>
        View in English
      </Text>
    </View>
  );
}

/** Inline replica of the book-open "read more" pill */
function ReadMoreButton({ isDark }: { isDark: boolean }) {
  return (
    <View style={[
      styles.inlineDescButton,
      { backgroundColor: isDark ? '#4b556365' : '#ffffffff' },
    ]}>
      <Feather name="book-open" size={14} color={isDark ? '#f9fafb' : '#000000ff'} />
    </View>
  );
}

/**
 * Renders description text with inline button components by splitting
 * on {{translate}} and {{readmore}} placeholders. Everything is inside
 * a single <Text> so wrapping is handled natively.
 */
function RichDescription({
  description,
  textStyle,
  isDark,
}: {
  description: string;
  textStyle: object;
  isDark: boolean;
}) {
  const parts = description.split(/({{translate}}|{{readmore}})/);
  return (
    <Text style={textStyle}>
      {parts.map((part, i) => {
        if (part === '{{translate}}') return <TranslateButton key={i} isDark={isDark} />;
        if (part === '{{readmore}}') return <ReadMoreButton key={i} isDark={isDark} />;
        return part;
      })}
    </Text>
  );
}

export default function FeatureSlide({ step, theme, isActive }: FeatureSlideProps) {
  const player = useVideoPlayer(step.videoUrl ?? null);
  const playerRef = React.useRef<VideoPlayer | null>(player);

  React.useEffect(() => {
    playerRef.current = player;

    if (!step.videoUrl) return;

    playerRef.current.loop = true;
  }, [player, step.videoUrl]);

  React.useEffect(() => {
    const currentPlayer = playerRef.current;

    if (!currentPlayer || !step.videoUrl) return;

    if (isActive) {
      currentPlayer.play();
    } else {
      currentPlayer.pause();
      currentPlayer.replay();
      currentPlayer.pause();
    }
  }, [isActive, step.videoUrl]);

  const isDark = theme.text === 'white';
  const hasPlaceholders = step.description.includes('{{');

  return (
    <View style={styles.container}>
      {/* Video / icon section — fixed in the upper area */}
      <View style={styles.mediaSection}>
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
          <AntDesign name={step.icon} size={60} color={theme.text} />
        ) : null}
      </View>

      {/* Text section — independent from media */}
      <View style={styles.textSection}>
        <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>

        {step.showSarvamLogo && (
          <View style={styles.poweredByRow}>
            <Text style={[styles.poweredByText, { color: theme.textTertiary }]}>
              powered by
            </Text>
            <Image
              source={require('../../assets/icons/sarvam.svg')}
              style={[styles.sarvamLogo, { tintColor: theme.textTertiary }]}
              contentFit="contain"
            />
          </View>
        )}

        {hasPlaceholders ? (
          <RichDescription
            description={step.description}
            textStyle={[styles.description, { color: theme.textSecondary }]}
            isDark={isDark}
          />
        ) : (
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {step.description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 5,
  },
  mediaSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 28,
    fontFamily: 'Dancing Script',
    letterSpacing: 1,
  },
  sarvamLogo: {
    width: 60,
    height: 16,
    marginLeft: 2,
    marginBottom:2,
    transform: [{ translateY: 3 }],
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    marginBottom: 22,
  },
  poweredByText: {
    fontSize: 13,
    fontFamily: 'Source Serif Pro',
    marginRight: 4,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
fontFamily:"Source Serif Pro"

  },
  // ─── Inline button replicas ──────────────────────────────
  inlineToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    transform: [{ translateY: 6 }],
  },
  inlineToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inlineDescButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    transform: [{ translateY: 5 }],
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';

import type { FeatureStep as FeatureStepType, Theme } from '../../lib/onboarding/constants';

type FeatureSlideProps = {
  step: FeatureStepType;
  theme: Theme;
};

export default function FeatureSlide({ step, theme }: FeatureSlideProps) {
  return (
    <View style={styles.container}>
      <AntDesign name={step.icon} size={60} color={theme.text} style={styles.icon} />
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
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 30,
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

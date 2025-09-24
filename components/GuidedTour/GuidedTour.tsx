import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import RNMaskedView from '@react-native-masked-view/masked-view';
import { AddTaskMask, BookMask, ShlokaMask } from './Maskys';
import { AddTaskBackground, BookBackground, ShlokaBackground } from './Backgrounds';
import { ShlokaCard, AddTaskCard, BookCard } from './Cards';

const { width, height } = Dimensions.get('window');

interface GuidedTourProps {
  children: React.ReactNode;
  onComplete: () => void;
}

export function GuidedTour({ children, onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleBackgroundPress = () => {
    // Optional: could skip to next step or show hint
  };

  const MaskedView = () => (
    <RNMaskedView
      style={styles.container}
      maskElement={
        <View style={styles.masks}>
          {step === 0 && <ShlokaMask />}
          {step === 1 && <AddTaskMask />}
          {step === 2 && <BookMask />}
        </View>
      }
    >
      {children}
      {step === 0 && <ShlokaBackground onPress={handleBackgroundPress} />}
      {step === 1 && <AddTaskBackground onPress={handleBackgroundPress} />}
      {step === 2 && <BookBackground onPress={handleBackgroundPress} />}
    </RNMaskedView>
  );

  return (
    <View style={styles.layout}>
      <MaskedView />
      {step === 0 && <ShlokaCard onNext={handleNext} onSkip={handleSkip} />}
      {step === 1 && <AddTaskCard onNext={handleNext} onSkip={handleSkip} />}
      {step === 2 && <BookCard onNext={handleNext} onSkip={handleSkip} />}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
  masks: {
    flex: 1,
    backgroundColor: '#00000080',
    width,
    height,
  },
});
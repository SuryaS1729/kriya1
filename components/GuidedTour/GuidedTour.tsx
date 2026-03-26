import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import RNMaskedView from '@react-native-masked-view/masked-view';
import { AddTaskMask, BookMask, ShlokaMask, FirstTaskMask, CombinedMask } from './Maskys';
import { AddTaskBackground, BookBackground, ShlokaBackground, FirstTaskBackground, CombinedBackground } from './Backgrounds';
import { ShlokaCard, AddTaskCard, ToggleTaskCard, FocusModeCard, BookCard } from './Cards';

interface GuidedTourProps {
  children: React.ReactNode;
  onComplete: () => void;
  hasUserTasks: boolean;
}

export function GuidedTour({ children, onComplete, hasUserTasks }: GuidedTourProps) {
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasUserTasks && step === 1) {
      return;
    }
    if (hasUserTasks && step === 1) {
      setStep(2);
    }
  }, [hasUserTasks, step]);

  const handleNext = () => {
    if (step === 1 && !hasUserTasks) {
      return;
    }
    
    if (step < getTotalSteps()) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const getTotalSteps = () => {
    return hasUserTasks ? 4 : 1;
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleBackgroundPress = () => {
    // Optional: could skip to next step or show hint
  };

  const getCurrentStep = () => {
    if (!hasUserTasks) {
      switch (step) {
        case 0: return 'shloka';
        case 1: return 'addTask';
        default: return 'shloka';
      }
    } else {
      switch (step) {
        case 0: return 'shloka';
        case 1: return 'addTask';
        case 2: return 'toggle';
        case 3: return 'focus';
        case 4: return 'book';
        default: return 'shloka';
      }
    }
  };

  const currentStep = getCurrentStep();

  return (
    <View style={styles.layout}>
      {/* Inlined MaskedView — avoids re-creating a component on every render */}
      <RNMaskedView
        style={styles.container}
        maskElement={
          <View style={[styles.masks, { width, height }]}>
            {currentStep === 'shloka' && <ShlokaMask />}
            {currentStep === 'addTask' && <AddTaskMask />}
            {currentStep === 'toggle' && <CombinedMask />}
            {currentStep === 'focus' && <FirstTaskMask />}
            {currentStep === 'book' && <BookMask />}
          </View>
        }
      >
        {children}
        {currentStep === 'shloka' && <ShlokaBackground onPress={handleBackgroundPress} />}
        {currentStep === 'addTask' && <AddTaskBackground onPress={handleBackgroundPress} />}
        {currentStep === 'toggle' && <CombinedBackground onPress={handleBackgroundPress} />}
        {currentStep === 'focus' && <FirstTaskBackground onPress={handleBackgroundPress} />}
        {currentStep === 'book' && <BookBackground onPress={handleBackgroundPress} />}
      </RNMaskedView>

      {currentStep === 'shloka' && <ShlokaCard onNext={handleNext} onSkip={handleSkip} />}
      {currentStep === 'addTask' && <AddTaskCard onNext={handleNext} onSkip={handleSkip} />}
      {currentStep === 'toggle' && <ToggleTaskCard onNext={handleNext} onSkip={handleSkip} />}
      {currentStep === 'focus' && <FocusModeCard onNext={handleNext} onSkip={handleSkip} />}
      {currentStep === 'book' && <BookCard onNext={handleNext} onSkip={handleSkip} />}
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
  },
});

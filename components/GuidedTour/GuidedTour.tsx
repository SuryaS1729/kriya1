import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import RNMaskedView from '@react-native-masked-view/masked-view';
import { AddTaskMask, BookMask, ShlokaMask, FirstTaskMask, CombinedMask } from './Maskys';
import { AddTaskBackground, BookBackground, ShlokaBackground, FirstTaskBackground, CombinedBackground } from './Backgrounds';
import { ShlokaCard, AddTaskCard, ToggleTaskCard, FocusModeCard, BookCard } from './Cards';

const { width, height } = Dimensions.get('window');

interface GuidedTourProps {
  children: React.ReactNode;
  onComplete: () => void;
  hasUserTasks: boolean; // New prop to track if user has added tasks
}

export function GuidedTour({ children, onComplete, hasUserTasks }: GuidedTourProps) {
  const [step, setStep] = useState(0);

  // Adjust tour flow based on whether user has tasks
  const totalSteps = hasUserTasks ? 4 : 1; // If has tasks: shloka -> toggle -> focus -> book; If no tasks: shloka -> add task

  useEffect(() => {
    // If user adds a task during the tour, advance to the task interaction steps
    if (!hasUserTasks && step === 1) {
      // Stay on step 1 (add task) until they actually add a task
      return;
    }
    if (hasUserTasks && step === 1) {
      // User just added a task, move to the toggle step
      setStep(2);
    }
  }, [hasUserTasks, step]);

  const handleNext = () => {
    if (step === 1 && !hasUserTasks) {
      // Don't advance from "add task" until they actually add one
      return;
    }
    
    if (step < getTotalSteps()) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const getTotalSteps = () => {
    return hasUserTasks ? 4 : 1; // shloka, toggle, focus, book OR just shloka + add task
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

  const MaskedView = () => (
    <RNMaskedView
      style={styles.container}
      maskElement={
        <View style={styles.masks}>
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
  );

  return (
    <View style={styles.layout}>
      <MaskedView />
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
    width,
    height,
  },
});
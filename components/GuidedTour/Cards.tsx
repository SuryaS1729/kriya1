import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  ADD_TASK_MASK_BOTTOM,
  ADD_TASK_MASK_HEIGHT,
  BOOK_MASK_TOP,
  SHLOKA_MASK_TOP,
  SHLOKA_MASK_HEIGHT,
  FIRST_TASK_MASK_TOP,
  FIRST_TASK_MASK_HEIGHT,
  COMBINED_MASK_TOP,
  COMBINED_MASK_HEIGHT
} from './masks';

const { width, height } = Dimensions.get('window');
const CARD_OFFSET = 20;

interface CardProps {
  onNext: () => void;
  onSkip?: () => void;
}

export function ShlokaCard({ onNext, onSkip }: CardProps) {
  return (
    <View style={[styles.card, styles.shlokaCard]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>📖 Welcome to Kriya</Text>
        <Text style={styles.cardText}>
          Each day starts with a verse from the Bhagavad Gita. Complete tasks to unlock new shlokas and make the Gita part of your daily routine!
        </Text>
        <View style={styles.cardActions}>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Got it!</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function AddTaskCard({ onNext, onSkip }: CardProps) {
  return (
    <View style={[styles.card, styles.addTaskCard]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>✅ Add Your First Task</Text>
        <Text style={styles.cardText}>
          Tap here to add your first task. Each completed task brings you closer to unlocking new shlokas from the Bhagavad Gita!   Tap on "Add a task" below
        </Text>
        <View style={styles.cardActions}>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function ToggleTaskCard({ onNext, onSkip }: CardProps) {
  return (
    <View style={[styles.card, styles.toggleTaskCard]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>🎯 Complete Your Task</Text>
        <Text style={styles.cardText}>
          Great! Now tap the checkbox to complete your task. Watch how the shloka above updates when you make progress!
        </Text>
        <View style={styles.cardActions}>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function FocusModeCard({ onNext, onSkip }: CardProps) {
  return (
    <View style={[styles.card, styles.focusModeCard]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>🧘 Focus Mode</Text>
        <Text style={styles.cardText}>
          Long press any task to enter Focus Mode. Try it now!
        </Text>
        <View style={styles.cardActions}>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function BookCard({ onNext, onSkip }: CardProps) {
  return (
    <View style={[styles.card, styles.bookCard]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>📚 Deep Dive</Text>
        <Text style={styles.cardText}>
          Tap the book icon to explore detailed commentary and meaning of each shloka. Discover the wisdom of the Gita!
        </Text>
        <View style={styles.cardActions}>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip Tour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Finish</Text>
            <Feather name="check" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: width - 40,
  },
  shlokaCard: {
    top: SHLOKA_MASK_TOP + SHLOKA_MASK_HEIGHT + CARD_OFFSET,
    alignSelf: 'center',
  },
  addTaskCard: {
    bottom: ADD_TASK_MASK_BOTTOM + ADD_TASK_MASK_HEIGHT + CARD_OFFSET,
    alignSelf: 'center',
  },
  toggleTaskCard: {
    top: COMBINED_MASK_TOP + COMBINED_MASK_HEIGHT + CARD_OFFSET,
    alignSelf: 'center',
  },
  focusModeCard: {
    bottom: height - FIRST_TASK_MASK_TOP + CARD_OFFSET,
    alignSelf: 'center',
  },
  bookCard: {
    top: BOOK_MASK_TOP + 60,
    right: 20,
    maxWidth: 280,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    fontFamily: 'Kalam',
  },
  cardText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'Source Serif Pro',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  nextText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});
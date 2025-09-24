import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { AddTaskMask, BookMask, ShlokaMask, FirstTaskMask, CombinedMask } from './Maskys';
import { 
  ADD_TASK_MASK_BOTTOM, 
  ADD_TASK_MASK_HEIGHT,
  BOOK_MASK_TOP,
  BOOK_MASK_SIZE,
  SHLOKA_MASK_TOP,
  SHLOKA_MASK_HEIGHT,
  FIRST_TASK_MASK_TOP,
  FIRST_TASK_MASK_HEIGHT,
  COMBINED_MASK_TOP,
  COMBINED_MASK_HEIGHT
} from './masks';

const { height } = Dimensions.get('window');

interface BackgroundProps {
  onPress: () => void;
}

export function AddTaskBackground({ onPress }: BackgroundProps) {
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: height - ADD_TASK_MASK_BOTTOM - ADD_TASK_MASK_HEIGHT }}
      />
      <AddTaskMask style={{ position: 'relative', opacity: 0 }} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export function BookBackground({ onPress }: BackgroundProps) {
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: BOOK_MASK_TOP }}
      />
      <BookMask style={{ position: 'relative', opacity: 0 }} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export function ShlokaBackground({ onPress }: BackgroundProps) {
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: SHLOKA_MASK_TOP }}
      />
      <ShlokaMask style={{ position: 'relative', opacity: 0 }} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export function FirstTaskBackground({ onPress }: BackgroundProps) {
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: FIRST_TASK_MASK_TOP }}
      />
      <FirstTaskMask style={{ position: 'relative', opacity: 0 }} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ flex: 1 }}
      />
    </View>
  );
}

export function CombinedBackground({ onPress }: BackgroundProps) {
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: COMBINED_MASK_TOP }}
      />
      <CombinedMask style={{ position: 'relative', opacity: 0 }} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
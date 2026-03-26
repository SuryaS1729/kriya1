import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AddTaskMask, BookMask, ShlokaMask, FirstTaskMask, CombinedMask } from './Maskys';
import { useMaskLayout } from './masks';

interface BackgroundProps {
  onPress: () => void;
}

export function AddTaskBackground({ onPress }: BackgroundProps) {
  const { backgroundHeights } = useMaskLayout();
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: backgroundHeights.addTaskFill }}
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
  const { backgroundHeights } = useMaskLayout();
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: backgroundHeights.bookTop }}
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
  const { backgroundHeights } = useMaskLayout();
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: backgroundHeights.shlokaTop }}
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
  const { backgroundHeights } = useMaskLayout();
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: backgroundHeights.firstTaskTop }}
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
  const { backgroundHeights } = useMaskLayout();
  return (
    <View style={styles.layout} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        style={{ height: backgroundHeights.combinedTop }}
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

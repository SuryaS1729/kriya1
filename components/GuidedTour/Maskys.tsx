import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useMaskLayout } from './masks';

export function AddTaskMask({ style }: { style?: StyleProp<ViewStyle> }) {
  const { maskStyles } = useMaskLayout();
  return <View style={[maskStyles.addTaskMask, style]} pointerEvents="none" />;
}

export function BookMask({ style }: { style?: StyleProp<ViewStyle> }) {
  const { maskStyles } = useMaskLayout();
  return <View style={[maskStyles.bookMask, style]} pointerEvents="none" />;
}

export function ShlokaMask({ style }: { style?: StyleProp<ViewStyle> }) {
  const { maskStyles } = useMaskLayout();
  return <View style={[maskStyles.shlokaMask, style]} pointerEvents="none" />;
}

export function FirstTaskMask({ style }: { style?: StyleProp<ViewStyle> }) {
  const { maskStyles } = useMaskLayout();
  return <View style={[maskStyles.firstTaskMask, style]} pointerEvents="none" />;
}

export function CombinedMask({ style }: { style?: StyleProp<ViewStyle> }) {
  const { maskStyles } = useMaskLayout();
  return <View style={[maskStyles.combinedMask, style]} pointerEvents="none" />;
}
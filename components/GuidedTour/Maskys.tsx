import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { masksStyles } from './masks';

export function AddTaskMask({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[masksStyles.addTaskMask, style]} pointerEvents="none" />;
}

export function BookMask({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[masksStyles.bookMask, style]} pointerEvents="none" />;
}

export function ShlokaMask({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[masksStyles.shlokaMask, style]} pointerEvents="none" />;
}
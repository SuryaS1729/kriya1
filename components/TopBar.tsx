import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title?: string;
  variant?: 'back' | 'close' | 'none'; // back arrow vs. close (for modals)
  right?: React.ReactNode;            // e.g., a Save button
};

export function TopBar({ title, variant = 'back', right }: Props) {
  return (
    <View style={styles.wrap}>
      {variant === 'none' ? <View style={styles.side} /> : (
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.btn}>
          <Text style={styles.icon}>{variant === 'back' ? '←' : '✕'}</Text>
        </Pressable>
      )}
      <Text style={styles.title} numberOfLines={1}>{title ?? ''}</Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  btn: { padding: 6 },
  icon: { fontSize: 20, color: '#111827' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  side: { minWidth: 28, alignItems: 'flex-end' },
});

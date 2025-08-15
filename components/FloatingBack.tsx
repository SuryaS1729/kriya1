import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

export function FloatingBack() {
  return (
    <Pressable onPress={() => router.back()} style={styles.fab} hitSlop={12}>
      <Text style={styles.icon}>←</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  fab: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(17,24,39,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { color: 'white', fontSize: 18, marginTop: -1 },
});

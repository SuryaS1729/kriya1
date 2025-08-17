// app/index.tsx
import { Link } from 'expo-router';
import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';

export default function Home() {
  const ready     = useKriya(s => s.ready);
  const tasks     = useKriya(s => s.tasksToday);
  const getShloka = useKriya(s => s.currentShloka); // returns { index, data }
  const toggle    = useKriya(s => s.toggleTask);
  const remove    = useKriya(s => s.removeTask);

  // Only compute shloka after store is ready
  const { index: shlokaIndex, data: shloka } = ready ? getShloka() : { index: 0, data: null as any };

  // Fade animation for shloka card
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready || !shloka) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [ready, shlokaIndex, fade]); // re-run when index changes

  const renderItem = ({ item }: { item: Task }) => (
    <Pressable
      onPress={() => toggle(item.id)}
      onLongPress={() => remove(item.id)}
      style={styles.row}
      android_ripple={{ color: '#eee' }}
    >
      <View style={[styles.checkbox, item.completed ? styles.checkboxOn : styles.checkboxOff]} />
      <Text style={[styles.title, item.completed ? styles.done : undefined]} numberOfLines={1}>
        {item.title}
      </Text>
    </Pressable>
  );

  // Minimal skeleton while DB/store warm up
  if (!ready || !shloka) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.card, { height: 120, opacity: 0.5 }]} />
        <Text style={styles.h1}>Today</Text>
        <View style={[styles.row, { opacity: 0.5 }]}>
          <View style={[styles.checkbox, styles.checkboxOff]} />
          <View style={{ flex: 1, height: 18, backgroundColor: '#eee', borderRadius: 4 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Shloka Card (tappable) */}
      <Link
        href={{ pathname: '/shloka/[id]', params: { id: String(shlokaIndex) } }}
        asChild
      >
        <Pressable>
          <Animated.View style={[styles.card, { opacity: fade }]}>
            <Text style={styles.meta}>
              Adhyaya {shloka.chapter_number}, Shloka {shloka.verse_number}
            </Text>
            <Text style={styles.sa} numberOfLines={4}>{shloka.text}</Text>
            <Text style={styles.en} numberOfLines={3}>
              {shloka.translation_2 ?? shloka.description ?? ''}
            </Text>
          </Animated.View>
        </Pressable>
      </Link>

      {/* Tasks */}
      <Text style={styles.h1}>Today</Text>
      <Link href="/history" asChild>
        <Pressable><Text style={{ color: '#2563eb' }}>Yesterday & History →</Text></Pressable>
      </Link>

      <FlatList
        data={tasks}
        keyExtractor={t => String(t.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>No tasks yet. Add one →</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Add button → /add */}
      <Link href="/add" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16 },
  card: { marginTop: 16, marginBottom: 10, borderRadius: 14, padding: 14, backgroundColor: '#f8fafc' },
  meta: { color: '#64748b', marginBottom: 6 },
  sa: { fontSize: 18, lineHeight: 26, color: '#0f172a', marginBottom: 8 },
  en: { fontSize: 16, lineHeight: 22, color: '#334155' },
  h1: { fontSize: 22, fontWeight: '700', marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4 },
  checkboxOn: { backgroundColor: '#22c55e' },
  checkboxOff: { backgroundColor: '#cbd5e1' },
  title: { flex: 1, fontSize: 18, color: '#111827' },
  done: { opacity: 0.6, textDecorationLine: 'line-through' },
  sep: { height: 1, backgroundColor: '#e5e7eb' },
  empty: { color: '#6b7280', marginTop: 8 },
  fab: {
    position: 'absolute', right: 16, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', elevation: 4
  },
  fabText: { color: 'white', fontSize: 28, lineHeight: 28, marginTop: -2 },
});

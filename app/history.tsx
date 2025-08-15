// app/history.tsx
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';

function formatDay(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function History() {
  const listDays = useKriya(s => s.listHistoryDays);
  const getForDay = useKriya(s => s.getTasksForDay);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const days = useMemo(() => listDays(60), [listDays]);

  const renderDay = ({ item }: { item: { day_key: number; count: number } }) => {
    const isOpen = !!expanded[item.day_key];
    const tasks: Task[] = isOpen ? getForDay(item.day_key) : [];

    return (
      <View style={styles.section}>
        <Pressable onPress={() => setExpanded(s => ({ ...s, [item.day_key]: !s[item.day_key] }))} style={styles.header}>
          <Text style={styles.headerText}>{formatDay(item.day_key)}</Text>
          <Text style={styles.headerMeta}>{item.count} task{item.count !== 1 ? 's' : ''} • {isOpen ? 'Hide' : 'Show'}</Text>
        </Pressable>

        {isOpen && tasks.map(t => (
          <View key={t.id} style={styles.row}>
            <View style={[styles.dot, t.completed ? styles.dotOn : styles.dotOff]} />
            <Text style={[styles.title, t.completed && styles.done]} numberOfLines={2}>{t.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.h1}>History</Text>
      <FlatList
        data={days}
        keyExtractor={(d) => String(d.day_key)}
        renderItem={renderDay}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16 },
  h1: { fontSize: 22, fontWeight: '700', marginVertical: 12 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb', paddingVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  headerText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  headerMeta: { fontSize: 12, color: '#64748b' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#22c55e' },
  dotOff: { backgroundColor: '#cbd5e1' },
  title: { flex: 1, fontSize: 16, color: '#111827' },
  done: { opacity: 0.6, textDecorationLine: 'line-through' },
});

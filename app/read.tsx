// app/read.tsx
import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import {
  FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  getChapterCounts,
  getVersesForChapter,
  searchShlokasLike,
} from '../lib/shloka';

export default function Read() {
  const chapters = useMemo(() => getChapterCounts(), []);
  const [chapter, setChapter] = useState<number>(chapters[0]?.chapter ?? 1);
  const [query, setQuery] = useState('');
  const verses = useMemo(() => getVersesForChapter(chapter), [chapter]);
  const results = useMemo(
    () => (query.trim() ? searchShlokasLike(query.trim()) : []),
    [query]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Bhagavad Gita</Text>

      <TextInput
        placeholder="Search shlokas… (Sanskrit or English)"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        returnKeyType="search"
        autoCorrect={false}
      />

      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/shloka/[id]', params: { id: String(item.id) } }}
              asChild
            >
              <Pressable style={styles.resultRow}>
                <Text style={styles.resultMeta}>
                  {item.chapter_number}.{item.verse_number}
                </Text>
                <Text style={styles.resultText} numberOfLines={2}>
                  {item.translation_2 ?? item.description ?? item.text}
                </Text>
              </Pressable>
            </Link>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      ) : (
        <View style={styles.split}>
          {/* chapters list */}
          <FlatList
            style={styles.left}
            data={chapters}
            keyExtractor={(c) => String(c.chapter)}
            renderItem={({ item }) => {
              const sel = item.chapter === chapter;
              return (
                <Pressable
                  onPress={() => setChapter(item.chapter)}
                  style={[styles.chRow, sel && styles.chRowSel]}
                >
                  <Text style={[styles.chText, sel && styles.chTextSel]}>
                    {item.chapter}
                  </Text>
                  <Text style={styles.chMeta}>{item.verses}</Text>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />

          {/* verses list */}
          <FlatList
            style={styles.right}
            data={verses}
            keyExtractor={(v) => String(v.id)}
            renderItem={({ item }) => (
              <Link
                href={{ pathname: '/shloka/[id]', params: { id: String(item.id) } }}
                asChild
              >
                <Pressable style={styles.vRow}>
                  <Text style={styles.vNum}>{item.verse_number}</Text>
                  <Text style={styles.vText} numberOfLines={2}>
                    {item.translation_2 ?? item.description ?? item.text}
                  </Text>
                </Pressable>
              </Link>
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  search: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, fontSize: 16,
  },
  split: { flex: 1, flexDirection: 'row', gap: 12 },
  left: { flex: 1, maxWidth: 96 },
  right: { flex: 1 },
  chRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
  },
  chRowSel: { backgroundColor: '#f1f5f9' },
  chText: { fontSize: 18, color: '#0f172a', fontWeight: '600' },
  chTextSel: { color: '#111827' },
  chMeta: { fontSize: 12, color: '#64748b' },

  vRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  vNum: { width: 24, textAlign: 'center', fontWeight: '700', color: '#0f172a' },
  vText: { flex: 1, color: '#334155' },

  resultRow: { paddingVertical: 10 },
  resultMeta: { fontSize: 12, color: '#64748b' },
  resultText: { fontSize: 16, color: '#0f172a' },

  sep: { height: 1, backgroundColor: '#f1f5f9' },
});

// app/read.tsx
import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import {
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  getChapterCounts,
  getVersesForChapter,
  searchShlokasLike,
  getIndexOf,
} from '../lib/shloka';
import { useKriya } from '../lib/store';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function Read() {
  const chapters = useMemo(() => getChapterCounts(), []);
  const initialChapter = chapters.length ? chapters[0].chapter : 1;

  const [chapter, setChapter] = useState<number>(initialChapter);
  const [query, setQuery] = useState('');

  const isDarkMode = useKriya(s => s.isDarkMode);

  const verses = useMemo(() => getVersesForChapter(chapter), [chapter]);
  const results = useMemo(
    () => (query.trim() ? searchShlokasLike(query.trim()) : []),
    [query]
  );

  return (
    <LinearGradient
      colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffff', '#9FABC8']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        
        <Text style={[styles.title, { color: isDarkMode ? '#f9fafb' : '#000000' }]}>
          Bhagavad Gita
        </Text>

        <TextInput
          placeholder="Search shlokas . . ."
          value={query}
          onChangeText={setQuery}
          style={[
            styles.search,
            {
              backgroundColor: isDarkMode ? '#1f2937' : 'white',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb',
              color: isDarkMode ? '#f9fafb' : '#000000',
            }
          ]}
          returnKeyType="search"
          autoCorrect={false}
          placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
        />

        {query.trim() ? (
          // SEARCH RESULTS
          <FlashList
            data={results}
            keyExtractor={(r) => `${r.chapter_number}.${r.verse_number}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const idx = getIndexOf(item.chapter_number, item.verse_number);
              return (
                <Link
                  href={{ pathname: '/shloka/[id]', params: { id: String(idx) } }}
                  asChild
                >
                  <Pressable style={[
                    styles.resultRow,
                    { backgroundColor: isDarkMode ? '#1f2937' : 'white' }
                  ]}>
                    <Text style={[
                      styles.resultMeta,
                      { color: isDarkMode ? '#9ca3af' : '#64748b' }
                    ]}>
                      {item.chapter_number}.{item.verse_number}
                    </Text>
                    <Text style={[
                      styles.resultText,
                      { color: isDarkMode ? '#e5e7eb' : '#0f172a' }
                    ]} numberOfLines={2}>
                      {item.translation_2 ?? item.description ?? item.text}
                    </Text>
                  </Pressable>
                </Link>
              );
            }}
            ItemSeparatorComponent={() => (
              <View style={[
                styles.sep,
                { backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }
              ]} />
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        ) : (
          <View style={styles.split}>
            {/* CHAPTERS LIST */}
            <View style={styles.left}>
              <FlashList
                data={chapters}
                keyExtractor={(c) => String(c.chapter)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const sel = item.chapter === chapter;
                  return (
                    <Pressable
                      onPress={() => setChapter(item.chapter)}
                      style={[
                        styles.chRow,
                        {
                          backgroundColor: sel
                            ? (isDarkMode ? '#374151' : '#f1f5f9')
                            : 'transparent'
                        }
                      ]}
                    >
                      <Text style={[
                        styles.chText,
                        {
                          color: sel
                            ? (isDarkMode ? '#f9fafb' : '#111827')
                            : (isDarkMode ? '#d1d5db' : '#0f172a')
                        }
                      ]}>
                        {item.chapter}
                      </Text>
                      <Text style={[
                        styles.chMeta,
                        { color: isDarkMode ? '#9ca3af' : '#64748b' }
                      ]}>
                        {item.verses}
                      </Text>
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => (
                  <View style={[
                    styles.sep,
                    { backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }
                  ]} />
                )}
              />
            </View>

             {/* DIVIDER LINE */}
            <View style={[
              styles.divider,
              { backgroundColor: isDarkMode ? '#a5abb7ff' : '#d1d5db' }
            ]} />

            {/* VERSES LIST FOR SELECTED CHAPTER */}
            <View style={styles.right}>
              <FlashList
                data={verses}
                keyExtractor={(v) => `${chapter}.${v.verse_number}`}

                renderItem={({ item }) => {
                  const idx = getIndexOf(chapter, item.verse_number);
                  return (
                    <Link
                      href={{ pathname: '/shloka/[id]', params: { id: String(idx) } }}
                      asChild
                    >
                      <Pressable style={styles.vRow}>
                        <Text style={[
                          styles.vNum,
                          { color: isDarkMode ? '#f9fafb' : '#0f172a' }
                        ]}>
                          {item.verse_number}
                        </Text>
                        <Text style={[
                          styles.vText,
                          { color: isDarkMode ? '#d1d5db' : '#334155' }
                        ]} numberOfLines={2}>
                          {item.translation_2 ?? item.description ?? item.text}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                }}
                ItemSeparatorComponent={() => (
                  <View style={[
                    styles.sep,
                    { backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }
                  ]} />
                )}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  title: { 
    fontSize: 22, 
    fontWeight: '600', 
    marginTop: 12, 
    marginBottom: 8,
    fontFamily: "SpaceMono",
    fontStyle:'italic'
  },
  search: {
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 10,
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    marginBottom: 10, 
    fontSize: 16,
  },
  split: { flex: 1, flexDirection: 'row', gap: 0 }, // Changed gap to 0 since we have divider
  left: { flex: 1, maxWidth: 96 },
  right: { flex: 1 },
  chRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 8, 
    paddingHorizontal: 10,
    marginVertical:4, 
    borderRadius: 10,
  },
  chText: { 
    fontSize: 18, 
    fontWeight: '600',
    fontFamily: "SourceSerifPro",
  },
  divider: {
    width: 3,
    backgroundColor: '#ffffffff',
    marginHorizontal: 12,
  },
  chMeta: { 
    fontSize: 12,
    fontFamily: "Alegreya",
  },
  vRow: { 
    flexDirection: 'row', 
    gap: 10, 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 8 
  },
  vNum: { 
    width: 24, 
    textAlign: 'center', 
    fontWeight: '700',
    fontFamily: "SourceSerifPro",
  },
  vText: { 
    flex: 1,

  },
  resultRow: { 
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultMeta: { 
    fontSize: 12,
    fontFamily: "SourceSerifPro",
    fontWeight: '600',
  },
  resultText: { 
    fontSize: 16,
    fontFamily: "Alegreya",
    marginTop: 4,
  },
  sep: { height: 1 },
});

// app/read.tsx
import { useMemo, useRef, useState } from 'react';
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
  getChapterBaseIndex,
  getGlobalIndexMap,
} from '../lib/shloka';
import { useKriya } from '../lib/store';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
// Add haptics import
import { buttonPressHaptic, selectionHaptic } from '../lib/haptics';
import Feather from '@react-native-vector-icons/feather/static';

// Traditional chapter titles of the Bhagavad Gita (not stored in the DB).
const CHAPTER_NAMES = [
  'Arjuna Vishada Yoga',
  'Sankhya Yoga',
  'Karma Yoga',
  'Jnana Karma Sanyasa Yoga',
  'Karma Sanyasa Yoga',
  'Dhyana Yoga',
  'Jnana Vijnana Yoga',
  'Akshara Brahma Yoga',
  'Raja Vidya Raja Guhya Yoga',
  'Vibhuti Yoga',
  'Vishvarupa Darshana Yoga',
  'Bhakti Yoga',
  'Kshetra Kshetrajna Vibhaga Yoga',
  'Gunatraya Vibhaga Yoga',
  'Purushottama Yoga',
  'Daivasura Sampad Vibhaga Yoga',
  'Shraddhatraya Vibhaga Yoga',
  'Moksha Sanyasa Yoga',
];

// App palette (matches History): slate cards, navy for the selected state.
const COLORS = {
  dark: {
    field: 'rgba(52, 76, 103, 0.5)',
    fieldBorder: 'rgba(139, 165, 225, 0.25)',
    card: '#16283d',
    selected: '#2b4382',
    current: 'rgba(52, 76, 103, 0.55)',
    accent: '#8ba5e1',
    sep: 'rgba(93, 123, 158, 0.25)',
    divider: 'rgba(139, 165, 225, 0.2)',
    text: '#f9fafb',
    body: '#d1d5db',
    muted: '#9ca3af',
  },
  light: {
    field: 'rgba(255, 255, 255, 0.85)',
    fieldBorder: '#e2e8f0',
    card: 'rgba(255, 255, 255, 0.85)',
    selected: '#2e4fa3',
    current: '#e9effa',
    accent: '#2e4fa3',
    sep: '#e2e8f0',
    divider: '#d5dceb',
    text: '#0f172a',
    body: '#334155',
    muted: '#64748b',
  },
};

export default function Read() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const currentShloka = useKriya(s => s.currentShloka);
  const c = isDarkMode ? COLORS.dark : COLORS.light;
  const chapters = useMemo(() => getChapterCounts(), []);

  // Where the reader is (same shloka Home and History show). Read once per visit.
  const current = useMemo(() => {
    const { data } = currentShloka();
    return data
      ? { chapter: data.chapter_number, verse: data.verse_number }
      : { chapter: chapters.length ? chapters[0].chapter : 1, verse: 1 };
  }, [currentShloka, chapters]);

  const [chapter, setChapter] = useState<number>(current.chapter);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  // TELUGU DISABLED: language selector hidden while Telugu features are paused.
  // const language = useKriya(s => s.language);
  // const setLanguage = useKriya(s => s.setLanguage);

  // Best available translation for a verse in the selected language.
  const textFor = (item: { translation_2: string | null; description: string | null; text: string }) =>
    // TELUGU DISABLED: Telugu DB lookup skipped; always show English content.
    (item.translation_2 ?? item.description ?? item.text);

  const verses = useMemo(() => getVersesForChapter(chapter), [chapter]);
  // Global index of this chapter's first verse (one query). Verses are
  // contiguous, so each row's link index is base + verse_number - 1 with
  // no per-row DB calls during render.
  const baseIndex = useMemo(() => getChapterBaseIndex(chapter), [chapter]);
  // Chapter/verse -> global index for search results. Built lazily on first
  // search (one scan; the shloka table is static) so mounting the screen
  // never pays for it.
  const indexMapRef = useRef<Map<string, number> | null>(null);
  const lookupGlobalIndex = (chapterNumber: number, verseNumber: number): number => {
    if (!indexMapRef.current) indexMapRef.current = getGlobalIndexMap();
    return indexMapRef.current.get(`${chapterNumber}.${verseNumber}`) ?? 0;
  };
  const results = useMemo(
    () => (trimmedQuery ? searchShlokasLike(trimmedQuery) : []),
    [trimmedQuery]
  );

  // Add haptic feedback for chapter selection
  const handleChapterSelect = (chapterNumber: number) => {
    selectionHaptic(); // Haptic feedback for chapter selection
    setChapter(chapterNumber);
  };

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

        {/* TELUGU DISABLED: language toggle hidden while Telugu features are paused.
        <Pressable
          onPress={() => {
            selectionHaptic();
            setLanguage(language === 'en' ? 'te' : 'en');
          }}
          hitSlop={8}
          style={[styles.langToggle, { backgroundColor: isDarkMode ? '#1f2937' : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }]}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', fontFamily: language === 'te' ? 'NTR' : undefined, color: isDarkMode ? '#f9fafb' : '#000000' }}>
            {language === 'en' ? 'English' : 'తెలుగు'}
          </Text>
        </Pressable>
        */}
        <View style={[styles.search, { backgroundColor: c.field, borderColor: c.fieldBorder }]}>
          <TextInput
            placeholder="Search shlokas . . ."
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
            autoCorrect={false}
            placeholderTextColor={c.muted}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                selectionHaptic();
                setQuery('');
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={18} color={c.muted} />
            </Pressable>
          )}
        </View>

        {trimmedQuery ? (
          // SEARCH RESULTS
          <FlashList
            data={results}
            keyExtractor={(r) => `${r.chapter_number}.${r.verse_number}`}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: c.text }]}>
                  No verses match “{trimmedQuery}”
                </Text>
                <Text style={[styles.emptyHint, { color: c.muted }]}>
                  Try a different word or a shorter phrase.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const idx = lookupGlobalIndex(item.chapter_number, item.verse_number);
              return (
                <Link
                  href={{ pathname: '/shloka/[id]', params: { id: String(idx) } }}
                  replace asChild
                >
                  <Pressable
                    // Link asChild needs a single style object, not an array.
                    style={StyleSheet.flatten([
                      styles.resultRow,
                      { backgroundColor: c.card }
                    ])}
                    android_ripple={{ color: '#cccccc18'}}
                    onPress={() => buttonPressHaptic()} // Add haptic for search result tap
                  >
                    <Text style={[
                      styles.resultMeta,
                      { color: c.accent }
                    ]}>
                      {item.chapter_number}.{item.verse_number}
                    </Text>
                    <Text style={[
                      styles.resultText,
                      // TELUGU DISABLED: language === 'te' && styles.teluguText,
                      { color: c.text }
                    ]} numberOfLines={2}>
                      {textFor(item)}
                    </Text>
                  </Pressable>
                </Link>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        ) : (
          <View style={styles.split}>
            {/* CHAPTERS LIST */}
            <View style={styles.left}>
              <FlashList
                data={chapters}
                keyExtractor={(ch) => String(ch.chapter)}
                showsVerticalScrollIndicator={false}
                // Open with the reader's chapter in view.
                initialScrollIndex={Math.max(0, chapters.findIndex(ch => ch.chapter === current.chapter) - 2)}
                renderItem={({ item }) => {
                  const sel = item.chapter === chapter;
                  return (
                    <Pressable
                      onPress={() => handleChapterSelect(item.chapter)}
                      style={[
                        styles.chRow,
                        { backgroundColor: sel ? c.selected : 'transparent' }
                      ]}
                      android_ripple={{ color: '#cccccc18'}}
                      accessibilityRole="button"
                      accessibilityLabel={`Chapter ${item.chapter}, ${item.verses} verses`}
                      accessibilityState={{ selected: sel }}
                    >
                      <Text style={[
                        styles.chText,
                        { color: sel ? '#ffffff' : c.body }
                      ]}>
                        {item.chapter}
                      </Text>
                      <Text style={[
                        styles.chMeta,
                        { color: sel ? 'rgba(255, 255, 255, 0.75)' : c.muted }
                      ]}>
                        {item.verses}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            {/* Hairline between the two columns */}
            <View style={[styles.divider, { backgroundColor: c.divider }]} />

            {/* VERSES LIST FOR SELECTED CHAPTER */}
            <View style={styles.right}>
              <View style={[styles.chapterHeader, { borderBottomColor: c.sep }]}>
                <Text style={[styles.chapterHeaderTitle, { color: c.text }]}>
                  Chapter {chapter} · {CHAPTER_NAMES[chapter - 1] ?? ''}
                </Text>
                <Text style={[styles.chapterHeaderMeta, { color: c.muted }]}>
                  {verses.length} verses
                </Text>
              </View>
              <FlashList
                // Remount per chapter: each chapter starts at the top, and the
                // reader's chapter opens scrolled to the verse they're on.
                key={chapter}
                data={verses}
                keyExtractor={(v) => `${chapter}.${v.verse_number}`}
                initialScrollIndex={chapter === current.chapter ? Math.max(0, current.verse - 3) : undefined}
                renderItem={({ item }) => {
                  const idx = baseIndex + item.verse_number - 1;
                  const isCurrent = chapter === current.chapter && item.verse_number === current.verse;
                  return (
                    <Link
                      href={{ pathname: '/shloka/[id]', params: { id: String(idx) } }}
                      replace
                      asChild
                    >
                      <Pressable
                        // Link asChild needs a single style object, not an array.
                        style={StyleSheet.flatten([styles.vRow, isCurrent && { backgroundColor: c.current }])}
                        android_ripple={{ color: '#cccccc18'}}
                        onPress={() => buttonPressHaptic()}
                        accessibilityLabel={isCurrent ? `Verse ${item.verse_number}, where you are now` : undefined}
                      >
                        <Text style={[
                          styles.vNum,
                          { color: isCurrent ? c.accent : c.text }
                        ]}
                        >
                          {item.verse_number}
                        </Text>
                        <Text style={[
                          styles.vText,
                          // TELUGU DISABLED: language === 'te' && styles.teluguText,
                          { color: c.body }
                        ]} numberOfLines={2}>
                          {textFor(item)}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                }}
                ItemSeparatorComponent={() => (
                  <View style={[
                    styles.sep,
                    { backgroundColor: c.sep }
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

// ...existing styles remain the same...
const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    fontFamily: "Space Mono",
    fontStyle:'italic'
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Source Serif Pro',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  langToggle: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 8,
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
    fontFamily: "Source Serif Pro",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  chapterHeader: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chapterHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Source Serif Pro',
    fontWeight: '600',
  },
  chapterHeaderMeta: {
    fontSize: 12,
    marginTop: 2,
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
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  vNum: {
    width: 24,
    textAlign: 'center',
    fontWeight: '700',
    fontFamily: "Source Serif Pro",
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
    fontFamily: "Source Serif Pro",
    fontWeight: '600',
  },
  resultText: {
    fontSize: 16,
    fontFamily: "Alegreya",
    marginTop: 4,
  },
  teluguText: {
    fontFamily: "NTR",
    fontSize: 18,
    lineHeight: 26,
  },
  sep: { height: 1 },
});

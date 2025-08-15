// app/shloka/[id].tsx
import { useLocalSearchParams, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { getShlokaById } from '../../lib/shloka';

export default function ShlokaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const row = getShlokaById(Number(id));

  if (!row) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16 }}>Shloka not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: 'white' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Simple top bar */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.circle} />
        <Text style={styles.title}>Adhyaya {row.chapter_number}, Shloka {row.verse_number}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Sanskrit</Text>
        <Text style={styles.sa}>{row.text}</Text>

        {row.transliteration ? (
          <>
            <Text style={styles.section}>Transliteration</Text>
            <Text style={styles.en}>{row.transliteration}</Text>
          </>
        ) : null}

        <Text style={styles.section}>Translation</Text>
        <Text style={styles.en}>{row.translation_2 ?? row.description ?? '—'}</Text>

        {row.commentary ? (
          <>
            <Text style={styles.section}>Commentary</Text>
            <Text style={styles.en}>{row.commentary}</Text>
          </>
        ) : null}

        {row.word_meanings ? (
          <>
            <Text style={styles.section}>Word meanings</Text>
            <Text style={styles.en}>{row.word_meanings}</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: {
    paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#111827' },
  title: { fontSize: 16, fontWeight: '700' },

  body: { padding: 16, paddingBottom: 40, gap: 10 },
  section: { fontSize: 14, fontWeight: '700', marginTop: 6, color: '#334155' },
  sa: { fontSize: 20, lineHeight: 30, color: '#0f172a' },
  en: { fontSize: 16, lineHeight: 24, color: '#111827' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'white' },
  backBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#111827' },
});

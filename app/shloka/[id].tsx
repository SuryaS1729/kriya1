// app/shloka/[id].tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View, Pressable, StatusBar } from 'react-native';
import { getShlokaById, type ShlokaRow } from '../../lib/shloka';
import { Link } from "expo-router";
import PulsatingGradient from '../../components/PulsatingGradient';


export default function ShlokaDetail() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const shlokaId = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.id]);

  const [row, setRow] = useState<ShlokaRow | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (shlokaId == null) return;
    try { setRow(getShlokaById(shlokaId) ?? null); } catch { setRow(null); }
  }, [shlokaId]);

  if (shlokaId == null) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: '#0b2946' }]}>
        <Text style={{ color: 'white' }}>Invalid shloka id.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={{ color: 'white' }}>Go back</Text></Pressable>
      </SafeAreaView>
    );
  }
  if (!row) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: '#0b2946' }]}>
        <Text style={{ color: 'white' }}>Shloka not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={{ color: 'white' }}>Go back</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b2946' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2946" />
      <LinearGradient colors={['#0D4986', '#040320']} style={StyleSheet.absoluteFill} />
          {/* <PulsatingGradient /> */}


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop:  28,   // respect status bar
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
      >
        {/* IN-FLOW HEADER ROW (scrolls away) */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <Text style={styles.headerIcon}>✕</Text>
          </Pressable>
          
          <Link href="/read" asChild>
      <Pressable hitSlop={16}>
        <Text style={styles.headerIcon}>📖</Text>
      </Pressable>
    </Link>
        </View>

        {/* BODY */}
        <Text style={styles.headerTitle}>
            Adhyaya {row.chapter_number}, Shloka {row.verse_number}
          </Text>
        <Text style={styles.section}>Shloka :</Text>
        <Text style={styles.sa}>{row.text}</Text>

        {row.transliteration ? (
          <>
            <Text style={styles.section}>Transliteration :</Text>
            <Text style={styles.en}>{row.transliteration}</Text>
          </>
        ) : null}

        <Text style={styles.section}>Translation :</Text>
        <Text style={styles.en}>{row.translation_2 ?? row.description ?? '—'}</Text>

        {row.commentary ? (
          <>
            <Text style={styles.section}>Commentary :</Text>
            <Text style={styles.en}>{row.commentary}</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // in-flow header (not floating)
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerIcon: { color: 'white', fontSize: 22, fontWeight: '700' },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    marginHorizontal: 0,
  },

  section: { color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '700', marginTop: 8 },
  sa: { color: 'white', fontSize: 24, lineHeight: 34 },
  en: { color: 'rgba(255,255,255,0.95)', fontSize: 18, lineHeight: 26 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  backBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#111827' },
});

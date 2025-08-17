// app/shloka/[id].tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, router, Link } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BackHandler,
  Animated,
  StyleSheet,
  Text,
  View,
  Pressable,
  StatusBar,
} from 'react-native';
import {
  getShlokaAt,
  getTotalShlokas,
  getPrevNextIndices,
  type ShlokaRow,
} from '../../lib/shloka';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

const PILL_W = 180;

export default function ShlokaDetail() {
  // --- Always-on hooks ---
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const allowExitRef = useRef(false);

  // Intercept any "go back" gesture/button → go Home (and avoid loops)
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (allowExitRef.current) return;
      const t = e?.data?.action?.type;
      if (t === 'GO_BACK' || t === 'POP' || t === 'POP_TO_TOP') {
        e.preventDefault?.();
        allowExitRef.current = true;
        router.replace('/');
      }
    });
    return unsub;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        allowExitRef.current = true;
        router.replace('/');
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  // Treat URL param as *index* (0-based)
  const initialIndex = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.id]);

  const [currentIndex, setCurrentIndex] = useState<number | null>(initialIndex);
  const [row, setRow] = useState<ShlokaRow | null>(null);
  const [total, setTotal] = useState<number>(0);

  // sync if route changes externally
  useEffect(() => {
    if (initialIndex != null && initialIndex !== currentIndex) setCurrentIndex(initialIndex);
  }, [initialIndex, currentIndex]);

  // load total (once)
  useEffect(() => {
    try {
      setTotal(getTotalShlokas());
    } catch {
      setTotal(0);
    }
  }, []);

  // cross-fade on verse change
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (currentIndex == null) return;
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      const r = getShlokaAt(currentIndex) ?? null;
      setRow(r);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }, [currentIndex, fade]);

  // prev/next indices from current index and total
  const { prevIndex, nextIndex } = getPrevNextIndices(currentIndex ?? 0, total);

  const goPrev = () => {
    if (prevIndex == null) return;
    setCurrentIndex(prevIndex);
    router.setParams({ id: String(prevIndex) });
  };
  const goNext = () => {
    if (nextIndex == null) return;
    setCurrentIndex(nextIndex);
    router.setParams({ id: String(nextIndex) });
  };

  // auto-hide pill on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const clamped = Animated.diffClamp(scrollY, 0, 60);
  const pillTranslateY = clamped.interpolate({ inputRange: [0, 60], outputRange: [0, 64] });
  const pillOpacity = clamped.interpolate({ inputRange: [0, 60], outputRange: [1, 0] });

  const invalidIndex = currentIndex == null;
  const loading = !row && !invalidIndex;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b2946' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0b2946" />
      <LinearGradient colors={['#0D4986', '#040320']} style={StyleSheet.absoluteFill} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 28,
          paddingHorizontal: 24,
          paddingBottom: 120,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header row */}
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

        {/* Body states */}
        {invalidIndex ? (
          <View style={styles.center}>
            <Text style={{ color: 'white' }}>Invalid shloka index.</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <Text style={{ color: 'white' }}>Loading…</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fade }}>
            <Text style={styles.headerTitle}>
              Adhyaya {row!.chapter_number}, Shloka {row!.verse_number}
            </Text>

            <Text style={styles.section}>Shloka :</Text>
            <Text style={styles.sa}>{row!.text}</Text>

            {row!.transliteration ? (
              <>
                <Text style={styles.section}>Transliteration :</Text>
                <Text style={styles.en}>{row!.transliteration}</Text>
              </>
            ) : null}

            <Text style={styles.section}>Translation :</Text>
            <Text style={styles.en}>{row!.translation_2 ?? row!.description ?? '—'}</Text>

            {row!.commentary ? (
              <>
                <Text style={styles.section}>Commentary :</Text>
                <Text style={styles.en}>{row!.commentary}</Text>
              </>
            ) : null}
          </Animated.View>
        )}
      </Animated.ScrollView>

      {/* Floating pill: ◀  📖  ▶  (auto-hides on scroll) */}
      {!invalidIndex && (
        <Animated.View
          style={[
            styles.pillWrap,
            {
              bottom: insets.bottom + 20,
              transform: [{ translateY: pillTranslateY }],
              opacity: pillOpacity,
            },
          ]}
        >
          <Pressable
            onPress={goPrev}
            disabled={prevIndex == null}
            hitSlop={12}
            style={[styles.pillBtn, prevIndex == null && styles.disabled]}
          >
            <Text style={styles.pillIcon}>◀</Text>
          </Pressable>

          <Link href="/read" asChild>
            <Pressable hitSlop={12} style={styles.pillBtn}>
              <Text style={styles.pillIcon}>📖</Text>
            </Pressable>
          </Link>

          <Pressable
            onPress={goNext}
            disabled={nextIndex == null}
            hitSlop={12}
            style={[styles.pillBtn, nextIndex == null && styles.disabled]}
          >
            <Text style={styles.pillIcon}>▶</Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerIcon: { color: 'white', fontSize: 22, fontWeight: '700' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '700' },

  section: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  sa: { color: 'white', fontSize: 24, lineHeight: 34 },
  en: { color: 'rgba(255,255,255,0.95)', fontSize: 18, lineHeight: 26 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  pillWrap: {
    position: 'absolute',
    left: '50%',
    width: PILL_W,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
    transform: [{ translateX: -PILL_W / 2 }],
  },
  pillBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  pillIcon: { color: 'white', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.35 },
});

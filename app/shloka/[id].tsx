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
} from 'react-native';
import {
  getShlokaAt,
  getTotalShlokas,
  getPrevNextIndices,
  type ShlokaRow,
} from '../../lib/shloka';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useKriya } from '../../lib/store';

import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
const PILL_W = 180;

export default function ShlokaDetail() {
  // --- Always-on hooks ---
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const allowExitRef = useRef(false);
  const isDarkMode = useKriya(s => s.isDarkMode);

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
    <SafeAreaView style={{ flex: 1 }} edges={['right', 'bottom', 'left']}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <LinearGradient 
        colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffff', '#9FABC8']} 
        style={StyleSheet.absoluteFill} 
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 28,
          paddingHorizontal: 22,
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
            <Text style={[styles.headerIcon, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>✕</Text>
          </Pressable>
          <Link href={`/share?shlokaId=${currentIndex}`} asChild>
            <Pressable hitSlop={16}>
              <FontAwesome5 name="share" size={20} color={isDarkMode ? '#9ca3af' : '#696969ff'} />
            </Pressable>
          </Link>
        </View>

        {/* Body states */}
        {invalidIndex ? (
          <View style={styles.center}>
            <Text style={{ color: isDarkMode ? '#d1d5db' : '#545454' }}>Invalid shloka index.</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <Text style={{ color: isDarkMode ? '#d1d5db' : '#545454' }}>Loading…</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fade }}>
            <Text style={[styles.headerTitle, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>
              Adhyaya {row!.chapter_number}, Shloka {row!.verse_number}
            </Text>

            <Text style={[styles.sa, { color: isDarkMode ? '#e5e7eb' : '#545454' }]}>
              {row!.text}
            </Text>

            {row!.transliteration ? (
              <>
                <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
                  Transliteration :
                </Text>
                <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>
                  {row!.transliteration}
                </Text>
              </>
            ) : null}

            <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
              Translation :
            </Text>
            <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>
              {row!.translation_2 ?? row!.description ?? '—'}
            </Text>

            {row!.commentary ? (
              <>
                <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
                  Commentary :
                </Text>
                <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>
                  {row!.commentary}
                </Text>
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
              backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(4, 37, 77, 0.81)',
              borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(255, 255, 255, 0.43)',
            },
          ]}
        >
          <Pressable
            onPress={goPrev}
            disabled={prevIndex == null}
            hitSlop={12}
            style={[styles.pillBtn, prevIndex == null && styles.disabled]}
          >
            <AntDesign 
              style={[styles.pillIcon, { color: prevIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#65a25cff' : 'green') }]} 
              name="arrowleft" 
              size={32} 
            />
          </Pressable>

          <Link href="/read" asChild>
            <Pressable hitSlop={12} style={styles.pillBtn}>
              <FontAwesome5 name="scroll" size={20} color={isDarkMode ? '#f9fafb' : 'white'} />
            </Pressable>
          </Link>

          <Pressable
            onPress={goNext}
            disabled={nextIndex == null}
            hitSlop={12}
            style={[styles.pillBtn, nextIndex == null && styles.disabled]}
          >
            <AntDesign 
              style={[styles.pillIcon, { color: nextIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#65a25cff' : 'green') }]} 
              name="arrowright" 
              size={32} 
            />
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
  headerIcon: { fontSize: 22, fontWeight: '700' },
  headerTitle: { 
    fontFamily:"SourceSerifPro",
    fontSize: 23,
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 42,
    textAlign:'center'
  },
  section: {
    fontSize: 18,
    marginTop: 8,
    fontFamily:"SourceSerifPro",
    fontWeight:"600",
    fontStyle:"normal",
    paddingVertical:10,
    marginVertical:10
  },
  sa: { 
    fontSize: 20, 
    lineHeight: 20,
    fontFamily:"Kalam",
    fontWeight:"400",
    fontStyle:"normal", 
    paddingTop:6, 
    textAlign:'center', 
    marginBottom:10
  },
  en: { 
    fontSize: 19, 
    lineHeight: 26,
    fontFamily:"Alegreya",
    fontWeight:"400",
    fontStyle:"normal"
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  pillWrap: {
    position: 'absolute',
    left: '26%',
    width: PILL_W,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 10,
    transform: [{ translateX: -PILL_W / 2 }],
    borderWidth: 2,
  },
  pillBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  pillIcon: { fontSize: 21, fontWeight: '700' },
  disabled: { opacity: 1 },
});

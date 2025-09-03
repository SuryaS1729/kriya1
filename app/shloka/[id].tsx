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
import * as Haptics from 'expo-haptics';

import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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

  const invalidIndex = currentIndex == null;
  const loading = !row && !invalidIndex;

  const addBookmark = useKriya(s => s.addBookmark);
  const removeBookmark = useKriya(s => s.removeBookmark);
  
  // Use a more reactive approach - directly access the bookmarks array
  const bookmarks = useKriya(s => s.bookmarks || []);
  const bookmarked = currentIndex !== null ? bookmarks.some(b => b.shlokaIndex === currentIndex) : false;

  // Add animation ref (remove rotation ref)
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const toggleBookmark = () => {
    if (currentIndex === null || !row) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Snappier animation sequence - no rotation
     // Simple bounce animation
    const bounceAnimation = Animated.sequence([
      Animated.timing(bookmarkScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(bookmarkScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    // Run animation
    bounceAnimation.start();
    
    // Update state
    if (bookmarked) {
      removeBookmark(currentIndex);
    } else {
      addBookmark(currentIndex, row);
    }
  };

  // Add long press handler
  const handleLongPressBookmark = () => {
    // Stronger haptic feedback for long press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Navigate to bookmarks page
    router.push('/bookmarks');
  };

  // Create interpolated values
  const animatedScale = bookmarkScale;

  const [showTooltip, setShowTooltip] = useState(false);

  const handleSharePress = () => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1500); // Hide tooltip after 1.5 seconds
  };

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
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <Text style={[styles.headerIcon, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>✕</Text>
          </Pressable>
          
          <View style={styles.headerActions}>
            <Pressable 
              onPress={toggleBookmark} 
              onLongPress={handleLongPressBookmark}
              hitSlop={16} 
              style={styles.actionButton}
            >
              <Animated.View
                style={{
                  transform: [{ scale: bookmarkScale }],
                }}
              >
                <MaterialIcons 
                  name={bookmarked ? "bookmark" : "bookmark-border"} 
                  size={24} 
                  color={bookmarked 
                    ? (isDarkMode ? '#fbbf24' : '#f59e0b') 
                    : (isDarkMode ? '#9ca3af' : '#696969ff')
                  } 
                />
              </Animated.View>
            </Pressable>
            
            {/* Share button with tooltip */}
            <Pressable onPress={handleSharePress} hitSlop={16} style={styles.actionButton}>
              <FontAwesome5 name="share" size={20} color={isDarkMode ? '#9ca3af' : '#696969ff'} />
            </Pressable>

            {/* Tooltip */}
            {showTooltip && (
              <View style={[styles.tooltip, { backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6' }]}>
                <Text style={[styles.tooltipText, { color: isDarkMode ? '#f9fafb' : '#374151' }]}>
                  Coming soon
                </Text>
              </View>
            )}
          </View>
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

            <Text style={[styles.sa, { color: isDarkMode ? '#e5e7eb' : '#545454' }]} selectable>
              {row!.text}
            </Text>

            {row!.transliteration ? (
              <>
                <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
                  Transliteration :
                </Text>
                <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]} selectable>
                  {row!.transliteration}
                </Text>
              </>
            ) : null}

            <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
              Translation :
            </Text>
            <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]} selectable={true}>
              {row!.translation_2 ?? row!.description ?? '—'}
            </Text>

            {row!.commentary ? (
              <>
                <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
                  Commentary :
                </Text>
                <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]} selectable>
                  {row!.commentary}
                </Text>
              </>
            ) : null}
          </Animated.View>
        )}
      </Animated.ScrollView>

      {/* Floating pill: ◀  📖  ▶  (now fixed in position) */}
      {!invalidIndex && (
        <Animated.View
          style={[
            styles.pillWrap,
            {
              bottom: insets.bottom + 20,
              backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(148, 168, 193, 0.81)',
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
              style={[styles.pillIcon, { color: prevIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#ffffffff' : '#18464aff') }]} 
              name="arrowleft" 
              size={32} 
            />
          </Pressable>

          <Link href="/read" asChild>
            <Pressable hitSlop={12} style={styles.pillBtn}>
              <FontAwesome5 name="book" size={20} color={isDarkMode ? '#f9fafb' : '#18464aff'} />
            </Pressable>
          </Link>

          <Pressable
            onPress={goNext}
            disabled={nextIndex == null}
            hitSlop={12}
            style={[styles.pillBtn, nextIndex == null && styles.disabled]}
          >
            <AntDesign 
              style={[styles.pillIcon, { color: nextIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#ffffffff' : '#18464aff') }]} 
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
    left: '50%',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  tooltip: {
    position: 'absolute',
    top: -30, // Adjust to position above the share button
    right: -10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

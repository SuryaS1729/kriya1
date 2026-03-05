// app/shloka/[id].tsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import {
  getShlokaAt,
  getTotalShlokas,
  getPrevNextIndices,
  type ShlokaRow,
} from '../../lib/shloka';

import { StatusBar } from 'expo-status-bar';
import { useKriya } from '../../lib/store';
import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../../lib/haptics';
import { textToSpeech } from '../../lib/tts';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { showAppToast } from '../../lib/appToast';

import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const PILL_W = 180;
const SHLOKA_FADE_OUT_MS = 140;
const SHLOKA_FADE_IN_MS = 800;
const SHLOKA_LIFT_PX = 15;

export default function ShlokaDetail() {
  // --- Always-on hooks ---
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const isDarkMode = useKriya(s => s.isDarkMode);

  // Treat URL param as *index* (0-based)
  const initialIndex = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [params.id]);

  const [currentIndex, setCurrentIndex] = useState<number | null>(initialIndex);
  const [row, setRow] = useState<ShlokaRow | null>(null);
  const [total, setTotal] = useState<number>(0);
  const hasLoadedOnce = useRef(false);
  const transitionIdRef = useRef(0);
  const pendingRowRef = useRef<ShlokaRow | null>(null);
  const bookmarkLongPressRef = useRef(false);

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

  // Smooth verse transition on index change.
  const fade = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  const commitRowAndFadeIn = useCallback((transitionId: number) => {
    if (transitionId !== transitionIdRef.current) return;
    setRow(pendingRowRef.current);
    fade.value = 0;
    contentTranslateY.value = SHLOKA_LIFT_PX;
    fade.value = withTiming(1, {
      duration: SHLOKA_FADE_IN_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    contentTranslateY.value = withTiming(0, {
      duration: SHLOKA_FADE_IN_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [fade, contentTranslateY]);

  useEffect(() => {
    if (currentIndex == null) {
      transitionIdRef.current += 1;
      setRow(null);
      fade.value = 1;
      contentTranslateY.value = 0;
      return;
    }
    let nextRow: ShlokaRow | null = null;
    try {
      nextRow = getShlokaAt(currentIndex) ?? null;
    } catch {
      nextRow = null;
    }
    if (!hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      setRow(nextRow);
      fade.value = 1;
      contentTranslateY.value = 0;
      return;
    }

    pendingRowRef.current = nextRow;
    const transitionId = ++transitionIdRef.current;

    fade.value = withTiming(0, {
      duration: SHLOKA_FADE_OUT_MS,
      easing: Easing.out(Easing.quad),
    }, (finished) => {
      if (!finished) return;
      runOnJS(commitRowAndFadeIn)(transitionId);
    });
  }, [currentIndex, fade, contentTranslateY, commitRowAndFadeIn]);

  // Guard route param against out-of-range values once total is known.
  useEffect(() => {
    if (currentIndex == null) return;
    if (total <= 0) return;
    if (currentIndex >= total) {
      setCurrentIndex(total - 1);
      router.setParams({ id: String(total - 1) });
    }
  }, [currentIndex, total]);

  const animatedFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: fade.value,
      transform: [{ translateY: contentTranslateY.value }],
    };
  }, []);

  // prev/next indices from current index and total
  const { prevIndex, nextIndex } = getPrevNextIndices(currentIndex ?? 0, total);

const goPrev = () => {
  if (prevIndex == null) return;
  selectionHaptic(); // Changed from direct Haptics call - light haptic for navigation
  setCurrentIndex(prevIndex);
  router.setParams({ id: String(prevIndex) });
};

const goNext = () => {
  if (nextIndex == null) return;
  selectionHaptic(); // Changed from direct Haptics call - light haptic for navigation
  setCurrentIndex(nextIndex);
  router.setParams({ id: String(nextIndex) });
};

const handleBookPress = () => {
  buttonPressHaptic(); // Changed from direct Haptics call - medium haptic for navigation
  router.replace('/read');
};

  const invalidIndex = currentIndex == null;
  const loading = !row && !invalidIndex;

  const addBookmark = useKriya(s => s.addBookmark);
  const removeBookmark = useKriya(s => s.removeBookmark);
  
  // Use a more reactive approach - directly access the bookmarks array
  const bookmarks = useKriya(s => s.bookmarks || []);
  const bookmarked = currentIndex !== null ? bookmarks.some(b => b.shlokaIndex === currentIndex) : false;

  // Add animation ref (remove rotation ref)
  const bookmarkScale = useSharedValue(1);

  const toggleBookmark = () => {
    // On some RN versions, onLongPress can be followed by onPress on release.
    // Ignore that trailing onPress so long press only navigates.
    if (bookmarkLongPressRef.current) {
      bookmarkLongPressRef.current = false;
      return;
    }
    if (currentIndex === null) return;
    const rowForBookmark = row ?? getShlokaAt(currentIndex);
    if (!rowForBookmark) return;
    
    // Enhanced haptic feedback based on action
    if (bookmarked) {
      selectionHaptic(); // Light haptic for removing bookmark
    } else {
      taskCompleteHaptic(); // Success haptic for adding bookmark
    }
    
    // Snappier animation sequence - no rotation
    // Simple bounce animation
    bookmarkScale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    // Update state and show appropriate toast
    if (bookmarked) {
      removeBookmark(currentIndex);
      showRemovedToast();
    } else {
      addBookmark(currentIndex, rowForBookmark);
      showSavedToast();
    }
  };

  const animatedBookmarkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bookmarkScale.value }],
    };
  });

  const showSavedToast = () => {
    showAppToast({
      type: 'success',
      text1: 'Saved to Bookmarks',
      text2: 'Find it in Profile -> Bookmarks or long press the bookmark icon',
      duration: 2000,
      bottomOffset: 80,
    });
  };

  const showRemovedToast = () => {
    showAppToast({
      type: 'info',
      text1: 'Bookmark Removed',
      duration: 1000,
      bottomOffset: 80,
    });
  };

  // Add long press handler
  const handleLongPressBookmark = () => {
    bookmarkLongPressRef.current = true;
    // Stronger haptic feedback for long press
    buttonPressHaptic(); // Medium haptic for navigation to bookmarks
    
    // Navigate to bookmarks page
    router.push('/bookmarks');
  };

  // Create interpolated values
  const [showTooltip] = useState(false);

  // TTS state
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAbortRef = useRef(false);
  const audioPlayer = useAudioPlayer(null);

  // Cleanup audio on unmount or index change
  useEffect(() => {
    return () => {
      ttsAbortRef.current = true;
      // Don't pause audio on unmount — allow background playback
    };
  }, [currentIndex]);

  const playAudio = async (base64Audio: string): Promise<boolean> => {
    try {
      // Write base64 to temp file
      const tempFile = `${FileSystem.cacheDirectory}tts_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempFile, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Replace the audio source
      audioPlayer.replace({ uri: tempFile });
      audioPlayer.play();

      // Wait for playback to complete
      return new Promise((resolve) => {
        const checkStatus = setInterval(() => {
          if (ttsAbortRef.current) {
            clearInterval(checkStatus);
            try { audioPlayer.pause(); } catch {}
            resolve(false);
          } else if (!audioPlayer.playing && audioPlayer.currentTime > 0) {
            clearInterval(checkStatus);
            // Cleanup temp file
            FileSystem.deleteAsync(tempFile, { idempotent: true });
            resolve(true);
          }
        }, 100);
      });
    } catch (error) {
      console.error('[TTS] Playback error:', error);
      return false;
    }
  };

  const handlePlayPress = async () => {
    if (!row) return;

    // If already playing, stop
    if (ttsPlaying) {
      ttsAbortRef.current = true;
      try { audioPlayer.pause(); } catch {}
      setTtsPlaying(false);
      setTtsLoading(false);
      return;
    }

    buttonPressHaptic();
    ttsAbortRef.current = false;
    setTtsLoading(true);
    setTtsPlaying(true);

    try {
      // Build merged English text: "Translation. {text} ... Commentary. {text}"
      const translation = row.translation_2 ?? row.description ?? '';
      let englishText = '';
      if (translation) englishText += `Translation. ${translation}`;
      if (row.commentary) englishText += ` ... Commentary. ${row.commentary}`;

      // Fetch both audio files in parallel (from cache/R2/Sarvam)
      const [shlokaAudio, englishAudio] = await Promise.all([
        textToSpeech(row.text, 'hi-IN', row.chapter_number, row.verse_number),
        englishText ? textToSpeech(englishText, 'en-IN', row.chapter_number, row.verse_number) : Promise.resolve(null),
      ]);

      if (ttsAbortRef.current || !shlokaAudio) {
        setTtsLoading(false);
        setTtsPlaying(false);
        return;
      }

      // Play shloka first
      setTtsLoading(false);
      const shlokaComplete = await playAudio(shlokaAudio);
      if (!shlokaComplete || ttsAbortRef.current) {
        setTtsPlaying(false);
        return;
      }

      // Then play English (translation + commentary)
      if (englishAudio) {
        await playAudio(englishAudio);
      }

      taskCompleteHaptic();
    } catch (error) {
      console.error('[TTS] Error:', error);
    } finally {
      setTtsLoading(false);
      setTtsPlaying(false);
    }
  };

  const handleSharePress = () => {
    if (!row || currentIndex === null) return;
    buttonPressHaptic();
    router.push({
      pathname: '/share2',
      params: {
        id: String(currentIndex),
        chapter: String(row.chapter_number),
        verse: String(row.verse_number),
        text: row.text,
        translation: row.translation_2 ?? row.description ?? '',
      },
    });
  };

const headerHeight = insets.top + 12 + 36 + 12; // safeArea + paddingTop + buttonHeight + paddingBottom

// ...existing code...
return (
  <SafeAreaView style={{ flex: 1 }} edges={['right', 'bottom', 'left']}>
    <StatusBar hidden={true} />

    <LinearGradient 
      colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffff', '#9FABC8']} 
      style={StyleSheet.absoluteFill} 
    />

    {/* Sticky Header */}
    <View style={[
      styles.stickyHeader, 
      { 
        paddingTop: insets.top + 12,
      }
    ]}>
      {/* Close Button */}
      <Pressable 
        onPress={() => {
          buttonPressHaptic(); // Add haptic for close button
          router.back();
        }} 
        hitSlop={16}
        style={[
          styles.circularButton,
          { backgroundColor: isDarkMode ? 'rgba(23, 29, 63, 0.75)' : 'rgba(117, 117, 117, 0.08)' }
        ]}
      >
        <Text style={[styles.closeIcon, { color: isDarkMode ? '#d1d5db' : '#18464aff' }]}>✕</Text>
      </Pressable>
      
      {/* Action Buttons */}
      <View style={styles.headerActions}>
        {/* Bookmark Button */}
        <Pressable 
          onPress={toggleBookmark} 
          onLongPress={handleLongPressBookmark}
          hitSlop={16} 
          style={[
            styles.circularButton,
            { backgroundColor: isDarkMode ? 'rgba(23, 29, 63, 0.75)' : 'rgba(117, 117, 117, 0.08)'  }
          ]}
        >
          <Animated.View style={animatedBookmarkStyle}>
            <MaterialIcons 
              name={bookmarked ? "bookmark" : "bookmark-border"} 
              size={20} 
              color={bookmarked 
                ? (isDarkMode ? '#fbbf24' : '#ff7700ff') 
                : (isDarkMode ? '#d1d5db' : '#18464aff')
              } 
            />
          </Animated.View>
        </Pressable>

        {/* Play TTS Button */}
        <Pressable 
          onPress={handlePlayPress} 
          hitSlop={16} 
          style={[
            styles.circularButton,
            { backgroundColor: isDarkMode ? 'rgba(23, 29, 63, 0.75)' : 'rgba(117, 117, 117, 0.08)' }
          ]}
        >
          {ttsLoading ? (
            <ActivityIndicator size="small" color={isDarkMode ? '#ffffffff' : '#18464aff'} />
          ) : (
            <FontAwesome5 
              name={ttsPlaying ? 'stop' : 'play'} 
              size={14} 
              color={ttsPlaying 
                ? (isDarkMode ? '#f87171' : '#dc2626') 
                : (isDarkMode ? '#ffffffff' : '#18464aff')
              } 
            />
          )}
        </Pressable>
        
        {/* Share Button */}
        <Pressable 
          onPress={handleSharePress} 
          hitSlop={16} 
          style={[
            styles.circularButton,
            { backgroundColor: isDarkMode ? 'rgba(23, 29, 63, 0.75)' : 'rgba(117, 117, 117, 0.08)'  }
          ]}
        >
          <FontAwesome5 name="share" size={16} color={isDarkMode ? '#ffffffff' : '#18464aff'} />
        </Pressable>

        {/* Tooltip - positioned relative to header */}
        {showTooltip && (
          <View style={[
            styles.tooltip, 
            { 
              backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
              top: 45, // Position below the sticky header
            }
          ]}>
            <Text style={[styles.tooltipText, { color: isDarkMode ? '#f9fafb' : '#374151' }]}>
              Coming soon
            </Text>
          </View>
        )}
      </View>
    </View>

    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: headerHeight + 20, // Dynamic top padding
        paddingHorizontal: 22,
        paddingBottom: 120,
      }}
    >
      {/* Body states - removed old header row */}
      {invalidIndex ? (
        <View style={styles.center}>
          <Text style={{ color: isDarkMode ? '#d1d5db' : '#545454' }}>Invalid shloka index.</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <Text style={{ color: isDarkMode ? '#d1d5db' : '#545454' }}>Loading…</Text>
        </View>
      ) : (
        <Animated.View style={animatedFadeStyle}>
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
    </ScrollView>

    {/* Floating pill navigation - unchanged */}
    {!invalidIndex && (
      <View
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
          android_ripple={{ color: '#cccccc18', radius: 18 }}
        >
          <AntDesign 
            style={[styles.pillIcon, { color: prevIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#ffffffff' : '#18464aff') }]} 
            name="arrow-left" 
            size={32} 
          />
        </Pressable>

        <Pressable 
        onPress={handleBookPress} 
        hitSlop={12} 
        style={styles.pillBtn}
        android_ripple={{ color: '#cccccc18', radius: 24 }}>
          <FontAwesome5 name="book" size={20} color={isDarkMode ? '#f9fafb' : '#18464aff'} />
        </Pressable>

        <Pressable
          onPress={goNext}
          disabled={nextIndex == null}
          hitSlop={12}
          style={[styles.pillBtn, nextIndex == null && styles.disabled]}
          android_ripple={{ color: '#cccccc18', radius: 18 }}
        >
          <AntDesign 
            style={[styles.pillIcon, { color: nextIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#ffffffff' : '#18464aff') }]} 
            name="arrow-right" 
            size={32} 
          />
        </Pressable>
      </View>
    )}
  </SafeAreaView>
);
}

// ...existing styles remain the same...
const styles = StyleSheet.create({
  headerIcon: { fontSize: 22, fontWeight: '700' },
  headerTitle: { 
    fontFamily:"Source Serif Pro",
    fontSize: 23,
    fontStyle: 'normal',
    fontWeight: '500',
    marginBottom: 42,
    textAlign:'center',
  },
  section: {
    fontSize: 18,
    marginTop: 8,
    fontFamily:"Source Serif Pro",
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
    right: -10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex:101
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '500',
  },
   stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  
  circularButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  closeIcon: { 
    fontSize: 16, 
    fontWeight: '700' 
  },

});

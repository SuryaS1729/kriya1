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
  Modal,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import {
  getShlokaAt,
  getTotalShlokas,
  getPrevNextIndices,
  getTranslationForLanguage,
  getCommentaryForLanguage,
  type ShlokaRow,
} from '../../lib/shloka';

import { StatusBar } from 'expo-status-bar';
import { useKriya } from '../../lib/store';
import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../../lib/haptics';
import { textToSpeech, shlokaRecitation } from '../../lib/tts';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { showAppToast } from '../../lib/appToast';
import {
  TRANSLATION_LANGUAGE_LIST,
  getTranslation,
  getCommentary,
  type ShlokaDisplayLanguage,
} from '../../lib/translationService';

import AntDesign from "@react-native-vector-icons/ant-design/static";
import FontAwesome5 from "@react-native-vector-icons/fontawesome5/static";
import MaterialIcons from "@react-native-vector-icons/material-icons/static";

const PILL_W = 180;
const SHLOKA_FADE_OUT_MS = 140;
const SHLOKA_FADE_IN_MS = 800;
const SHLOKA_LIFT_PX = 15;

export default function ShlokaDetail() {
  // --- Always-on hooks ---
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const isDarkMode = useKriya(s => s.isDarkMode);
  const language = useKriya(s => s.language);
  const recitationStyle = useKriya(s => s.recitationStyle);
  const translationLanguage = useKriya(s => s.translationLanguage);
  const setTranslationLanguage = useKriya(s => s.setTranslationLanguage);
  const downloadedTranslations = useKriya(s => s.downloadedTranslations);

  // Treat URL param as *index* (0-based)
  const initialIndex = useMemo(() => {
    const raw = Array.isArray(params.id) ? params.id[0] : params.id;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [params.id]);

  // The URL param is the source of truth for the current shloka. When the
  // route changes externally (prev/next or a deep link), the derived value
  // below picks it up on the next render, so no effect-sync is needed.
  const [row, setRow] = useState<ShlokaRow | null>(null);

  // Indian-language translation (R2 JSON). Loaded only when a downloaded,
  // non-English language is selected; never triggers a network request.
  const [translationText, setTranslationText] = useState<string | null>(null);
  const [commentaryText, setCommentaryText] = useState<string | null>(null);
  const [translationLang, setTranslationLang] = useState<ShlokaDisplayLanguage>('en');

  useEffect(() => {
    let cancelled = false;
    // Keep a translation loaded while browsing verses in the same language.
    if (translationLanguage === 'en' || !row || !downloadedTranslations.includes(translationLanguage)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the loaded translation is part of syncing with the selected language/file state; the effect is the single source that feeds the async read below.
      setTranslationText(null);
      setCommentaryText(null);
      return;
    }
    (async () => {
      const [t, c] = await Promise.all([
        getTranslation(row.chapter_number, row.verse_number, translationLanguage),
        getCommentary(row.chapter_number, row.verse_number, translationLanguage),
      ]);
      if (!cancelled) {
        setTranslationText(t);
        setCommentaryText(c);
        setTranslationLang(translationLanguage);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row, translationLanguage, downloadedTranslations]);

  const [total, setTotal] = useState<number>(() => {
    try {
      return getTotalShlokas();
    } catch {
      return 0;
    }
  });
  // DB may not be ready on first mount (store init happens after DB opens);
  // refill the total once the store reports ready.
  const isReady = useKriya(s => s.ready);
  useEffect(() => {
    if (!isReady || total > 0) return;
    let nextTotal = 0;
    try {
      nextTotal = getTotalShlokas();
    } catch {
      // DB still unavailable — keep total at 0.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must run synchronously the moment the store reports the DB is ready; React bails out if the value is unchanged.
    setTotal(nextTotal);
  }, [isReady, total]);

  const hasLoadedOnce = useRef(false);
  const transitionIdRef = useRef(0);
  const pendingRowRef = useRef<ShlokaRow | null>(null);
  const bookmarkLongPressRef = useRef(false);

  // Clamp the route param when it falls outside the available shlokas.
  const currentIndex = useMemo(() => {
    if (initialIndex == null) return null;
    if (total <= 0) return initialIndex;
    return Math.min(initialIndex, total - 1);
  }, [initialIndex, total]);

  // Keep the URL in sync when the index was clamped (or will be clamped) so
  // that prev/next navigation and deep links always reference a valid shloka.
  const clampedIndex = currentIndex != null && initialIndex != null && currentIndex !== initialIndex;
  useEffect(() => {
    if (clampedIndex && currentIndex != null) {
      router.setParams({ id: String(currentIndex) });
    }
  }, [clampedIndex, currentIndex]);

  // Smooth verse transition on index change.
  const fade = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  const commitRowAndFadeIn = useCallback((transitionId: number) => {
    if (transitionId !== transitionIdRef.current) return;
    setRow(pendingRowRef.current);
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared values are mutable handles; assigning .value is the documented API.
    fade.value = 0;
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared values are mutable handles; assigning .value is the documented API.
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- this effect loads the row for the current shloka index and is the single source that feeds the fade transition; moving it into render is not possible because it mutates reanimated shared values.
      setRow(null);
      // eslint-disable-next-line react-hooks/immutability -- reanimated shared values are mutable handles; assigning .value is the documented API.
      fade.value = 1;
      // eslint-disable-next-line react-hooks/immutability -- reanimated shared values are mutable handles; assigning .value is the documented API.
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
  router.setParams({ id: String(prevIndex) });
};

const goNext = () => {
  if (nextIndex == null) return;
  selectionHaptic(); // Changed from direct Haptics call - light haptic for navigation
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
  const isMountedRef = useRef(true);
  const playbackSessionRef = useRef(0);
  const audioPlayer = useAudioPlayer(null);

  // Cleanup audio on unmount or index change
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      ttsAbortRef.current = true;
      playbackSessionRef.current += 1;
      // Don't pause audio on unmount — allow background playback
    };
  }, []);

  const safelyPauseAudio = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      audioPlayer.pause();
    } catch {
      // The native player may already be released while the screen is changing.
    }
  }, [audioPlayer]);

  const playAudio = async (base64Audio: string): Promise<boolean> => {
    const sessionId = ++playbackSessionRef.current;
    const tempFile = `${FileSystem.cacheDirectory}tts_audio_${Date.now()}.m4a`;

    try {
      // Write base64 to temp file
      await FileSystem.writeAsStringAsync(tempFile, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (!isMountedRef.current || ttsAbortRef.current || sessionId !== playbackSessionRef.current) {
        await FileSystem.deleteAsync(tempFile, { idempotent: true });
        return false;
      }

      // Replace the audio source
      audioPlayer.replace({ uri: tempFile });
      audioPlayer.play();

      // Wait for playback to complete
      return new Promise((resolve) => {
        const checkStatus = setInterval(() => {
          if (!isMountedRef.current || sessionId !== playbackSessionRef.current || ttsAbortRef.current) {
            clearInterval(checkStatus);
            FileSystem.deleteAsync(tempFile, { idempotent: true });
            safelyPauseAudio();
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
      FileSystem.deleteAsync(tempFile, { idempotent: true });
      console.error('[TTS] Playback error:', error);
      return false;
    }
  };

  const handlePlayPress = async () => {
    if (!row) return;

    // If already playing, stop
    if (ttsPlaying) {
      ttsAbortRef.current = true;
      playbackSessionRef.current += 1;
      safelyPauseAudio();
      setTtsPlaying(false);
      setTtsLoading(false);
      return;
    }

    buttonPressHaptic();
    ttsAbortRef.current = false;
    setTtsLoading(true);
    setTtsPlaying(true);

    try {
      // Build the spoken text from the selected language:
      // "Translation. {text} ... Commentary. {text}"
      const translation = getTranslationForLanguage(row, language) ?? '';
      let speakText = '';
      if (translation) speakText += `Translation. ${translation}`;
      const commentary = getCommentaryForLanguage(row, language);
      if (commentary) speakText += ` ... Commentary. ${commentary}`;

      // Fetch both audio files in parallel from cache/R2 recordings
      // The shloka recitation follows the user's chosen style (Hindi TTS or authentic Sanskrit)
      const [shlokaAudio, spokenAudio] = await Promise.all([
        shlokaRecitation(recitationStyle, row.chapter_number, row.verse_number),
        speakText ? textToSpeech(speakText, 'en-IN', row.chapter_number, row.verse_number) : Promise.resolve(null),
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

      // Then play the translation (and commentary) audio
      if (spokenAudio) {
        await playAudio(spokenAudio);
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
      },
    });
  };

  // Language picker — opens a dropdown modal with all available languages.
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);

  const openLanguagePicker = () => {
    selectionHaptic();
    setLanguagePickerOpen(true);
  };

  const closeLanguagePicker = () => {
    setLanguagePickerOpen(false);
  };

  const selectLanguage = (code: ShlokaDisplayLanguage) => {
    selectionHaptic();
    if (code !== 'en' && !downloadedTranslations.includes(code)) {
      showAppToast({
        type: 'info',
        text1: 'Not Downloaded',
        text2: 'Download this language from My Journey → Translations / Languages.',
        duration: 2500,
        position: 'bottom',
      });
      return;
    }
    setTranslationLanguage(code);
    closeLanguagePicker();
  };

const headerHeight = insets.top + 12 + 36 + 12; // safeArea + paddingTop + buttonHeight + paddingBottom

// ...existing code...
return (
  <SafeAreaView style={{ flex: 1 }} edges={['right', 'bottom', 'left']}>
    <StatusBar hidden={true} />

    <LinearGradient
      colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffff', '#ffffffff']}
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
        {/* Language selector — opens dropdown with English + downloaded Indian languages */}
        <Pressable
          onPress={openLanguagePicker}
          hitSlop={16}
          style={[
            styles.circularButton,
            { backgroundColor: isDarkMode ? 'rgba(23, 29, 63, 0.75)' : 'rgba(117, 117, 117, 0.08)' }
          ]}
        >
          <FontAwesome5 name="globe" size={16} iconStyle="solid" color={isDarkMode ? '#ffffffff' : '#18464aff'} />
        </Pressable>
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
              iconStyle="solid"
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
          <FontAwesome5 name="share" size={16} iconStyle="solid" color={isDarkMode ? '#ffffffff' : '#18464aff'} />
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
          <Text
            style={[
              styles.en,
              translationLang !== 'en' && styles.translationIndic,
              { color: isDarkMode ? '#d1d5db' : '#545454' }
            ]}
            selectable={true}
          >
            {translationLang !== 'en'
              ? (translationText ?? (translationLanguage !== 'en'
                  ? 'Translation not downloaded'
                  : getTranslationForLanguage(row!, language) ?? '—'))
              : (getTranslationForLanguage(row!, language) ?? '—')}
          </Text>

          {translationLang !== 'en'
            ? (commentaryText || getCommentaryForLanguage(row!, language)) ? (
                <>
                  <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
                    Commentary :
                  </Text>
                  <Text
                    style={[
                      styles.en,
                      styles.translationIndic,
                      { color: isDarkMode ? '#d1d5db' : '#545454' }
                    ]}
                    selectable
                  >
                    {commentaryText ?? getCommentaryForLanguage(row!, language)}
                  </Text>
                </>
              ) : null
            : getCommentaryForLanguage(row!, language) ? (
                <>
                  <Text style={[styles.section, { color: isDarkMode ? '#9ca3af' : '#4a4a4aff' }]}>
                    Commentary :
                  </Text>
                  <Text style={[styles.en, { color: isDarkMode ? '#d1d5db' : '#545454' }]} selectable>
                    {getCommentaryForLanguage(row!, language)}
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
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255)',
            borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.6)' : '#18464aff',
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
          <FontAwesome5 name="book" size={20} iconStyle="solid" color={isDarkMode ? '#f9fafb' : '#18464aff'} />
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

    {/* Language picker dropdown */}
    <Modal
      visible={languagePickerOpen}
      transparent
      animationType="fade"
      onRequestClose={closeLanguagePicker}
    >
      <Pressable style={styles.langModalBackdrop} onPress={closeLanguagePicker}>
        {/* Stop backdrop presses from closing when the panel itself is tapped */}
        <Pressable
          style={[styles.langModalPanel, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}
          onPress={() => {}}
        >
          <Text style={[styles.langModalTitle, { color: isDarkMode ? '#e5e7eb' : '#1f2937' }]}>
            Translation Language
          </Text>

          {[
            { code: 'en' as ShlokaDisplayLanguage, name: 'English' },
            ...TRANSLATION_LANGUAGE_LIST.map(lang => ({
              code: lang.code as ShlokaDisplayLanguage,
              name: lang.name,
            })),
          ].map(option => {
            const selected = translationLanguage === option.code;
            const downloaded = option.code === 'en' || downloadedTranslations.includes(option.code);
            return (
              <Pressable
                key={option.code}
                style={({ pressed }) => [
                  styles.langOption,
                  { backgroundColor: isDarkMode ? 'rgba(52, 76, 103, 0.3)' : 'rgba(248, 250, 252, 0.8)' },
                  selected && { borderColor: '#8ba5e1', borderWidth: 1 },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => selectLanguage(option.code)}
                android_ripple={{ color: '#cccccc18' }}
              >
                <Text style={[styles.langOptionName, { color: isDarkMode ? '#e5e7eb' : '#1f2937' }]}>
                  {option.name}
                </Text>
                {selected ? (
                  <MaterialIcons name="check" size={18} color={isDarkMode ? '#8ba5e1' : '#4a6a9a'} />
                ) : !downloaded ? (
                  <Text style={[styles.langOptionHint, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                    Not downloaded
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
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
  te: {
    fontFamily: "NTR",
    fontSize: 22,
    lineHeight: 34,
    fontWeight: "400",
    fontStyle: "normal"
  },
  // Indian-language translation fallback (font mirrors styles.te; the system
  // font renders scripts NTR does not cover, e.g. Devanagari/Gujarati/Tamil).
  translationIndic: {
    fontSize: 19,
    lineHeight: 30,
    fontWeight: "400",
    fontStyle: "normal"
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

  // Language picker dropdown
  langModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
  },
  langModalPanel: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 8,
  },
  langModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langOptionName: {
    fontSize: 15,
    fontWeight: '500',
  },
  langOptionHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },

});

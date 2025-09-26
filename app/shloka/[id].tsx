// app/shloka/[id].tsx
import {  useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, router, Link } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
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

import { StatusBar } from 'expo-status-bar';
import { useKriya } from '../../lib/store';
// Remove this line: import * as Haptics from 'expo-haptics';
// Add this instead:
import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../../lib/haptics';

// Add toast imports
import {
  Toast,
  ToastTitle,
  ToastDescription,
  useToast,
} from '@/components/ui/toast';

import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const PILL_W = 180;

export default function ShlokaDetail() {
  // --- Always-on hooks ---
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const isDarkMode = useKriya(s => s.isDarkMode);

   // Fix: Use separate toast IDs for saved and removed toasts
  const toast = useToast();
  const [savedToastId, setSavedToastId] = useState<string>('0');
  const [removedToastId, setRemovedToastId] = useState<string>('0');

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
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const toggleBookmark = () => {
    if (currentIndex === null || !row) return;
    
    // Enhanced haptic feedback based on action
    if (bookmarked) {
      selectionHaptic(); // Light haptic for removing bookmark
    } else {
      taskCompleteHaptic(); // Success haptic for adding bookmark
    }
    
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
    
    // Update state and show appropriate toast
    if (bookmarked) {
      removeBookmark(currentIndex);
      showRemovedToast();
    } else {
      addBookmark(currentIndex, row);
      showSavedToast();
    }
  };

   // Toast function
  const showSavedToast = () => {
    if (!toast.isActive(savedToastId)) {
      const newId = Math.random().toString();
      setSavedToastId(newId);
      toast.show({
        id: newId,
        placement: 'bottom',
        duration: 2000,
        render: ({ id }) => {
          const uniqueToastId = 'toast-' + id;
          return (
            <Toast 
              nativeID={uniqueToastId} 
              action="success" 
              variant="solid"
              style={[
                styles.toastContainer,
                { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' }
              ]}
            >
              <View style={styles.toastContent}>
                <MaterialIcons 
                  name="bookmark" 
                  size={16} 
                  color={isDarkMode ? '#10b981' : '#059669'} 
                />
                <ToastTitle style={[
                  styles.toastTitle,
                  { color: isDarkMode ? '#d1fae5' : '#064e3b' }
                ]}>
                  Saved to Bookmarks
                </ToastTitle>
              </View>
              <ToastDescription style={[
                styles.toastDescription,
                { color: isDarkMode ? '#a7f3d0' : '#047857' }
              ]}>
                Find it in Profile → Bookmarks or long press the bookmark icon
              </ToastDescription>
            </Toast>
          );
        },
      });
    }
  };

  const showRemovedToast = () => {
    if (!toast.isActive(removedToastId)) {
      const newId = Math.random().toString();
      setRemovedToastId(newId);
      toast.show({
        id: newId,
        placement: 'bottom',
        duration: 1000,
        render: ({ id }) => {
          const uniqueToastId = 'toast-' + id;
          return (
            <Toast 
              nativeID={uniqueToastId} 
              action="muted" 
              variant="solid"
              style={[
                styles.toastContainerRemoved,
                { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6' }
              ]}
            >
              <View style={styles.toastContent}>
                <MaterialIcons 
                  name="bookmark-border" 
                  size={16} 
                  color={isDarkMode ? '#9ca3af' : '#6b7280'} 
                />
                <ToastTitle style={[
                  styles.toastTitle,
                  { color: isDarkMode ? '#e5e7eb' : '#374151' }
                ]}>
                  Bookmark Removed
                </ToastTitle>
              </View>
            </Toast>
          );
        },
      });
    }
  };

  // Add long press handler
  const handleLongPressBookmark = () => {
    // Stronger haptic feedback for long press
    buttonPressHaptic(); // Medium haptic for navigation to bookmarks
    
    // Navigate to bookmarks page
    router.push('/bookmarks');
  };

  // Create interpolated values
  const animatedScale = bookmarkScale;

  const [showTooltip, setShowTooltip] = useState(false);

  const handleSharePress = () => {
    selectionHaptic(); // Light haptic for interaction
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1500); // Hide tooltip after 1.5 seconds
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
          <Animated.View
            style={{
              transform: [{ scale: bookmarkScale }],
            }}
          >
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

    <Animated.ScrollView
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

    {/* Floating pill navigation - unchanged */}
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
          android_ripple={{ color: '#cccccc18', radius: 18 }}
        >
          <AntDesign 
            style={[styles.pillIcon, { color: prevIndex == null ? (isDarkMode ? '#4b5563' : '#9ca3af') : (isDarkMode ? '#ffffffff' : '#18464aff') }]} 
            name="arrowleft" 
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
            name="arrowright" 
            size={32} 
          />
        </Pressable>
      </Animated.View>
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

  // Toast styles
  toastContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom:80,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // New style for removed toast
  toastContainerRemoved: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 80,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Source Serif Pro',
    marginLeft: 8,
  },
  
  toastDescription: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Source Serif Pro',
    lineHeight: 16,
  },
});
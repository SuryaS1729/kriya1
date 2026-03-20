import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Image, 
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useKriya } from '../lib/store';
import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../lib/haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { showAppToast } from '../lib/appToast';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import {
  SHARE_BACKGROUNDS,
  getShareBackground,
  getShareBackgroundImageSource,
  type ShareBackgroundId,
} from '../lib/shareBackgrounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card format configurations - optimized resolution (2K — fast to encode, plenty for social media)
const FORMATS = [
  { id: 'story', label: 'Story', aspectRatio: 9/16, width: 1152, height: 2048 },
    { id: 'post', label: 'Post', aspectRatio: 1, width: 2048, height: 2048 },

] as const;

type FormatId = typeof FORMATS[number]['id'];

const SLIDER_MIN = 0;
const SLIDER_MAX = 1;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

const parseRgba = (color: string) => {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) {
    return { red: 20, green: 10, blue: 30, alpha: 0.15 };
  }

  const [red = '20', green = '10', blue = '30', alpha = '1'] = match[1]
    .split(',')
    .map((part) => part.trim());

  return {
    red: Number(red),
    green: Number(green),
    blue: Number(blue),
    alpha: clamp(Number(alpha), SLIDER_MIN, SLIDER_MAX),
  };
};

const formatRgba = (
  { red, green, blue }: ReturnType<typeof parseRgba>,
  alpha: number,
) => `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, SLIDER_MIN, SLIDER_MAX).toFixed(2)})`;

export default function Share2() {
  const params = useLocalSearchParams<{
    id?: string;
    chapter?: string;
    verse?: string;
    text?: string;
    translation?: string;
  }>();
  
  const isDarkMode = useKriya(s => s.isDarkMode);
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('story');
  const [selectedBackground, setSelectedBackground] = useState<ShareBackgroundId>('ocean');
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textboxOpacity, setTextboxOpacity] = useState<number>(
    parseRgba(SHARE_BACKGROUNDS[0].textBoxBg).alpha,
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    SHARE_BACKGROUNDS[0].defaultBgOpacity,
  );
  
  const viewShotRef = useRef<ViewShot>(null);
  const captureTargetRef = useRef<View>(null);
  
  const currentFormat = FORMATS.find(f => f.id === selectedFormat)!;
  const currentBackground = getShareBackground(selectedBackground);
  const currentTextBoxColor = parseRgba(currentBackground.textBoxBg);
  const resolvedTextBoxBg = formatRgba(currentTextBoxColor, textboxOpacity);
  const currentBackgroundSource =
    currentBackground.type === 'image'
      ? getShareBackgroundImageSource(currentBackground)
      : null;

  useEffect(() => {
    setTextboxOpacity(parseRgba(currentBackground.textBoxBg).alpha);
    setBackgroundOpacity(currentBackground.defaultBgOpacity);
  }, [currentBackground]);

  const updateTextboxOpacity = (nextOpacity: number) => {
    setTextboxOpacity(Math.round(clamp(nextOpacity, SLIDER_MIN, SLIDER_MAX) * 100) / 100);
  };

  const updateBackgroundOpacity = (nextOpacity: number) => {
    setBackgroundOpacity(Math.round(clamp(nextOpacity, SLIDER_MIN, SLIDER_MAX) * 100) / 100);
  };
  
  // Calculate preview dimensions to fit screen
  const PREVIEW_PADDING = 40;
  const maxWidth = SCREEN_WIDTH - PREVIEW_PADDING * 2;
  const previewWidth = Math.min(maxWidth, 350);
  const previewHeight = previewWidth / currentFormat.aspectRatio;
  
  // Get background image based on selected background
  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    
    setIsSharing(true);
    buttonPressHaptic();
    
    try {
      const uri = await captureCardUri();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share Shloka',
        });
        taskCompleteHaptic();
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleSave = async () => {
    if (!viewShotRef.current?.capture) return;
    
    setIsSaving(true);
    buttonPressHaptic();
    
    try {
      console.log('[Save] Requesting permissions...');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showAppToast({
          type: 'error',
          text1: 'Permission denied',
          text2: 'Please allow photo access to save this image.',
          duration: 2000,
          position: 'top',
          topOffset: 64,
        });
        return;
      }
      
      console.log('[Save] Permission granted, capturing...');
      const uri = await captureCardUri();
      console.log('[Save] Captured URI:', uri);
      
      await MediaLibrary.saveToLibraryAsync(uri);
      console.log('[Save] Saved successfully');
      
      taskCompleteHaptic();
      showAppToast({
        type: 'success',
        text1: 'Saved to gallery',
        text2: 'Your shloka card is ready to share.',
        duration: 2000,
        position: 'top',
        topOffset: 64,
      });
    } catch (error) {
      console.error('[Save] Failed:', error);
      showAppToast({
        type: 'error',
        text1: 'Save failed',
        text2: 'Please try again.',
        duration: 1800,
        position: 'top',
        topOffset: 64,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const captureCardUri = async () => {
    const options = {
      format: 'jpg' as const,
      quality: 0.92,
      width: currentFormat.width,
      height: currentFormat.height,
      result: 'tmpfile' as const,
    };
    const captureTimeoutMs = 15000;

    const withTimeout = async <T,>(promise: Promise<T>, label: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${captureTimeoutMs}ms`));
        }, captureTimeoutMs);
      });
      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutId!);
      }
    };

    // Let the UI settle before taking snapshot, especially after button press/layout updates.
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
    await new Promise(resolve => setTimeout(resolve, 60));

    const primaryTarget = captureTargetRef.current;
    const fallbackTarget = viewShotRef.current;

    if (!primaryTarget && !fallbackTarget) {
      throw new Error('Capture view is not ready yet');
    }

    try {
      if (primaryTarget) {
        return await withTimeout(captureRef(primaryTarget, options), 'captureRef(primary)');
      }
      return await withTimeout(captureRef(fallbackTarget!, options), 'captureRef(fallback)');
    } catch (firstError) {
      console.warn('[Capture] Primary capture failed, trying fallback target:', firstError);
      if (!fallbackTarget || fallbackTarget === primaryTarget) throw firstError;
      return withTimeout(captureRef(fallbackTarget, options), 'captureRef(fallback)');
    }
  };
  
  // Resolve text box positioning based on per-background config
  const getOverlayJustify = () => {
    const pos = currentBackground.textBoxPosition as string;
    if (pos === 'top') return 'flex-start' as const;
    if (pos === 'bottom') return 'flex-end' as const;
    return 'center' as const;
  };

  // Card Component - This gets captured as image
  const ShareCard = () => (
    <View style={[styles.cardContainer, { width: previewWidth, height: previewHeight }]}>
      {/* Background - either image or gradient */}
      {currentBackground.type === 'image' ? (
        <>
          <LinearGradient
            colors={currentBackground.colors as unknown as [string, string, ...string[]]}
            style={styles.cardBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Image
            source={currentBackgroundSource!}
            style={[styles.cardBackground, { opacity: backgroundOpacity }]}
            resizeMode="cover"
          />
        </>
      ) : (
        <LinearGradient
          colors={currentBackground.colors as unknown as [string, string, ...string[]]}
          style={[styles.cardBackground, { opacity: backgroundOpacity }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      
      {/* Content Overlay */}
      <View style={[styles.cardOverlay, { justifyContent: getOverlayJustify() }]}>
        {/* Text Box */}
        <View style={[
          styles.textBox,
          { backgroundColor: resolvedTextBoxBg },
        ]}>
          {/* Sanskrit Text */}
          <Text style={[
            styles.sanskritText,
            { color: currentBackground.textColor },
          ]}>
            {params.text || 'धृतराष्ट्र उवाच |\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |'}
          </Text>
          
          {/* English Translation */}
          <Text style={[
            styles.translationText,
            { color: currentBackground.translationColor },
          ]}>
            {params.translation || 'Dhritarashtra said: O Sanjay, after gathering on the holy field of Kurukshetra...'}
          </Text>
          
          {/* Reference */}
          <Text style={[styles.referenceBottom, { color: currentBackground.refColor }]}>
            BG {params.chapter}.{params.verse}
          </Text>
        </View>
        
        {/* Bottom branding */}
        <View
          style={selectedFormat === 'story' ? styles.brandingWrap : styles.brandingWrapPost}
        >
          <Text style={[
            styles.brandingBottom,
            { color: currentBackground.brandingColor },
          ]}>
            kriya
          </Text>
          <View style={styles.platformRow}>
            <Text
              style={[
                styles.platformText,
                { color: currentBackground.brandingColor },
              ]}
            >
              available on
            </Text>
            <Ionicons
              name="logo-google-playstore"
              size={8}
              color={currentBackground.brandingColor}
            />
            <FontAwesome5
              name="app-store-ios"
              size={8}
              color={currentBackground.brandingColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
  
  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a2634', '#0a0f14'] : ['#f8fafc', '#e2e8f0']}
      style={styles.container}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => {
              buttonPressHaptic();
              router.back();
            }}
            hitSlop={16}
          >
            <Feather name="x" size={24} color={isDarkMode ? "#fff" : "#000"} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            Share Shloka
          </Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* Preview Area - Now at the top */}
        <ScrollView 
          contentContainerStyle={styles.previewContainer}
          showsVerticalScrollIndicator={false}
        >
          <ViewShot 
            ref={viewShotRef} 
            options={{ 
              format: 'jpg', 
              quality: 0.95,
              width: currentFormat.width,
              height: currentFormat.height,
            }}
          >
            <View ref={captureTargetRef} collapsable={false}>
              <ShareCard />
            </View>
          </ViewShot>
        </ScrollView>
        
        {/* Bottom Controls Panel */}
        <View style={[styles.bottomPanel, { backgroundColor: isDarkMode ? '#00151a' : '#ffffff' }]}>
          {/* Format Selector */}
          <View style={styles.formatSelector}>
            {FORMATS.map((format) => (
              <Pressable
                key={format.id}
                onPress={() => {
                  selectionHaptic();
                  setSelectedFormat(format.id);
                }}
                style={[
                  styles.formatTab,
                  selectedFormat === format.id && styles.formatTabActive,
                  { 
                    backgroundColor: selectedFormat === format.id 
                      ? (isDarkMode ? '#013540' : '#2563eb')
                      : (isDarkMode ? '#293a3d' : '#e5e7eb')
                  }
                ]}
              >
                <Text style={[
                  styles.formatTabText,
                  { color: selectedFormat === format.id ? '#fff' : (isDarkMode ? '#9ca3af' : '#6b7280') }
                ]}>
                  {format.label}
                </Text>
              </Pressable>
            ))}
          </View>
          
          {/* Background Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.backgroundSelector}
          >
            {SHARE_BACKGROUNDS.map((bg) => (
              <Pressable
                key={bg.id}
                onPress={() => {
                  selectionHaptic();
                  setSelectedBackground(bg.id);
                }}
                style={[
                  styles.backgroundSwatch,
                  selectedBackground === bg.id && styles.backgroundSwatchActive,
                ]}
              >
                {bg.type === 'image' ? (
                  <View style={styles.backgroundSwatchImageContainer}>
                    <LinearGradient
                      colors={bg.colors as unknown as [string, string, ...string[]]}
                      style={styles.backgroundSwatchGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Image
                      source={getShareBackgroundImageSource(bg)}
                      style={styles.backgroundSwatchImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <LinearGradient
                    colors={bg.colors as unknown as [string, string, ...string[]]}
                    style={styles.backgroundSwatchGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.opacitySection}>
            <View style={styles.opacityHeader}>
              <Text style={[styles.opacityLabel, { color: isDarkMode ? '#fff' : '#111827' }]}>
                Background opacity
              </Text>
            </View>
            <View style={styles.opacityControlRow}>
              <Slider
                value={Math.round(backgroundOpacity * 100)}
                minValue={0}
                maxValue={100}
                step={1}
                size="md"
                orientation="horizontal"
                isDisabled={false}
                isReversed={false}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    updateBackgroundOpacity(value / 100);
                  }
                }}
                className="w-full"
              >
                <SliderTrack
                  className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}
                >
                  <SliderFilledTrack
                    className={isDarkMode ? 'bg-teal-700' : 'bg-blue-600'}
                  />
                </SliderTrack>
                <SliderThumb
                  className={isDarkMode ? 'bg-white border border-gray-900' : 'bg-slate-50 border border-slate-300'}
                />
              </Slider>
            </View>
          </View>

          <View style={styles.opacitySection}>
            <View style={styles.opacityHeader}>
              <Text style={[styles.opacityLabel, { color: isDarkMode ? '#fff' : '#111827' }]}>
                Text box opacity
              </Text>
            </View>
            <View style={styles.opacityControlRow}>
              <Slider
                value={Math.round(textboxOpacity * 100)}
                minValue={0}
                maxValue={100}
                step={1}
                size="md"
                orientation="horizontal"
                isDisabled={false}
                isReversed={false}
                onChange={(value) => {
                  if (typeof value === 'number') {
                    updateTextboxOpacity(value / 100);
                  }
                }}
                className="w-full"
              >
                <SliderTrack
                  className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}
                >
                  <SliderFilledTrack
                    className={isDarkMode ? 'bg-teal-700' : 'bg-blue-600'}
                  />
                </SliderTrack>
                <SliderThumb
                  className={isDarkMode ? 'bg-white border border-gray-900' : 'bg-slate-50 border border-slate-300'}
                />
              </Slider>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: isDarkMode ? '#293a3d' : '#e5e7eb' }
              ]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={isDarkMode ? '#fff' : '#000'} />
              ) : (
                <>
                  <Feather name="download" size={20} color={isDarkMode ? '#fff' : '#000'} />
                  <Text style={[styles.actionButtonText, { color: isDarkMode ? '#fff' : '#000' }]}>
                    Save
                  </Text>
                </>
              )}
            </Pressable>
            
            <Pressable
              onPress={handleShare}
              disabled={isSharing}
              style={[
                styles.actionButton,
                styles.shareButton,
                { backgroundColor: isDarkMode ? '#013540' : '#2563eb' }
              ]}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="share" size={20} color="#fff" />
                  <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                    Share
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formatSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
marginTop: 10,
  },
  formatTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  formatTabActive: {
    // Styling applied inline
  },
  formatTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    flexGrow: 1,
    alignItems: 'center',

    paddingVertical: 20,
  },
  cardContainer: {

    overflow: 'hidden',
    position: 'relative',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',

  },
  textBox: {
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  sanskritText: {
    fontFamily: 'Kalam',
    fontSize: 14,
    lineHeight: 12,
    fontWeight: '700',
    marginTop: 12,
    paddingTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  translationText: {
    fontFamily: 'Alegreya',
    fontSize: 11,
    lineHeight: 16,
  },
  referenceBottom: {
    fontFamily: 'Source Serif Pro',
    fontSize: 10,
    color: '#b0b0b0',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 12,
  },
  brandingWrap: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
  },
  brandingWrapPost: {
    position: 'absolute',
    top: 10,
    right: 16,
    alignItems: 'flex-end',
    gap: 4,
  },
  brandingBottom: {
    fontFamily: 'Instrument Serif',
    fontSize: 18,
    color: '#ffffff',
    fontStyle: 'italic',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformText: {
    fontFamily: 'Space Mono',
    fontSize: 6,
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  bottomPanel: {
    paddingTop: 16,
    paddingBottom: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,

  },
  opacitySection: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  opacityHeader: {
    marginBottom: 10,
  },
  opacityLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  opacityControlRow: {
    width: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {},
  shareButton: {},
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backgroundSelector: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  backgroundSwatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backgroundSwatchActive: {
    borderColor: '#3b82f6',
    borderWidth: 3,
  },
  backgroundSwatchImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundSwatchImageContainer: {
    width: '100%',
    height: '100%',
  },
  backgroundSwatchGradient: {
    width: '100%',
    height: '100%',
  },
});

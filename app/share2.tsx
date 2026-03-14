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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card format configurations - optimized resolution (2K — fast to encode, plenty for social media)
const FORMATS = [
  { id: 'story', label: 'Story', aspectRatio: 9/16, width: 1152, height: 2048 },
    { id: 'post', label: 'Post', aspectRatio: 1, width: 2048, height: 2048 },

] as const;

type FormatId = typeof FORMATS[number]['id'];

const EXTRA_BACKGROUND_IMAGE_SOURCES = {
  b1: require('../assets/images/b1.jpeg'),
  b2: require('../assets/images/b2.jpeg'),
  b3: require('../assets/images/b3.jpeg'),
  b4: require('../assets/images/b4.jpeg'),
  b5: require('../assets/images/b5.jpeg'),
  b6: require('../assets/images/b6.jpeg'),
  b7: require('../assets/images/b7.jpeg'),
  b8: require('../assets/images/b8.jpeg'),
  b9: require('../assets/images/b9.jpeg'),
  b10: require('../assets/images/b10.jpeg'),
  b11: require('../assets/images/b11.jpeg'),
  b12: require('../assets/images/b12.jpeg'),
  b13: require('../assets/images/b13.jpeg'),
  b14: require('../assets/images/b14.png'),
} as const;

const EXTRA_IMAGE_BACKGROUNDS = [
  { id: 'b1', label: 'B1' },
  { id: 'b2', label: 'B2' },
  { id: 'b3', label: 'B3' },
  { id: 'b4', label: 'B4' },
  { id: 'b5', label: 'B5' },
  { id: 'b6', label: 'B6' },
  { id: 'b7', label: 'B7' },
  { id: 'b8', label: 'B8' },
  { id: 'b9', label: 'B9' },
  { id: 'b10', label: 'B10' },
  { id: 'b11', label: 'B11' },
  { id: 'b12', label: 'B12' },
  { id: 'b13', label: 'B13' },
  { id: 'b14', label: 'B14' },
] as const;

// Background configurations with per-background styling
const BACKGROUNDS = [
  {
    id: 'krishna',
    label: 'Krishna',
    type: 'image' as const,
    colors: ['#1a1a2e', '#16213e'],
    // Per-background style overrides
    textBoxBg: 'rgba(30, 30, 30, 0.9)',
    textBoxPosition: 'center' as const,   // 'top' | 'center' | 'bottom'
    textColor: '#f5f5f5',
    translationColor: '#e0e0e0',
    refColor: '#b0b0b0',
    brandingColor: '#ffffff',
    bgOpacity: 0.6,
  },
  {
    id: 'temple',
    label: 'Temple',
    type: 'image' as const,
    colors: ['#2d1b3d', '#1a1a2e'],
    textBoxBg: 'rgba(20, 10, 30, 0.09)',
    textBoxPosition: 'center' as const,
    textColor: '#f5f5f5',
    translationColor: '#e0e0e0',
    refColor: '#b0b0b0',
    brandingColor: '#ffffff',
    bgOpacity: 0.65,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    type: 'gradient' as const,
    colors: ['#0f0c29', '#16537e', '#0f0c29'],
    textBoxBg: 'rgba(15, 52, 96, 0)',
    textBoxPosition: 'center' as const,
    textColor: '#e0f0ff',
    translationColor: '#b8d8f0',
    refColor: '#8ab4d4',
    brandingColor: '#cce5ff',
    bgOpacity: 1,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    type: 'gradient' as const,
    colors: ['#0f0c29', '#302b63', '#24243e'],
    textBoxBg: 'rgba(15, 12, 41, 0)',
    textBoxPosition: 'center' as const,
    textColor: '#e8e6f0',
    translationColor: '#c8c4d8',
    refColor: '#9a96b0',
    brandingColor: '#d4d0e8',
    bgOpacity: 1,
  },
  ...EXTRA_IMAGE_BACKGROUNDS.map((bg) => ({
    id: bg.id,
    label: bg.label,
    type: 'image' as const,
    colors: ['#1a1a2e', '#16213e'],
    textBoxBg: 'rgba(20, 10, 30, 0.15)',
    textBoxPosition: 'center' as const,
    textColor: '#ffffff',
    translationColor: '#f5f5f5',
    refColor: '#ffffff',
    brandingColor: '#ffffff',
    bgOpacity: 0.6,
  })),
];

type BackgroundId = typeof BACKGROUNDS[number]['id'];

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
  const [selectedBackground, setSelectedBackground] = useState<BackgroundId>('krishna');
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textboxOpacity, setTextboxOpacity] = useState(parseRgba(BACKGROUNDS[0].textBoxBg).alpha);
  
  const viewShotRef = useRef<ViewShot>(null);
  const captureTargetRef = useRef<View>(null);
  
  const currentFormat = FORMATS.find(f => f.id === selectedFormat)!;
  const currentBackground = BACKGROUNDS.find(b => b.id === selectedBackground)!;
  const currentTextBoxColor = parseRgba(currentBackground.textBoxBg);
  const resolvedTextBoxBg = formatRgba(currentTextBoxColor, textboxOpacity);

  useEffect(() => {
    setTextboxOpacity(parseRgba(currentBackground.textBoxBg).alpha);
  }, [currentBackground]);

  const updateTextboxOpacity = (nextOpacity: number) => {
    setTextboxOpacity(Math.round(clamp(nextOpacity, SLIDER_MIN, SLIDER_MAX) * 100) / 100);
  };
  
  // Calculate preview dimensions to fit screen
  const PREVIEW_PADDING = 40;
  const maxWidth = SCREEN_WIDTH - PREVIEW_PADDING * 2;
  const previewWidth = Math.min(maxWidth, 350);
  const previewHeight = previewWidth / currentFormat.aspectRatio;
  
  // Get background image based on selected background
  const getBackgroundSource = (backgroundId: BackgroundId, format: FormatId = selectedFormat) => {
    if (backgroundId === 'krishna') {
      return format === 'story'
        ? require('../assets/images/rawInstagramStory.png')
        : require('../assets/images/rawInstagramPost.png');
    }
    if (backgroundId === 'temple') {
      return require('../assets/images/background2.jpg');
    }
    if (backgroundId in EXTRA_BACKGROUND_IMAGE_SOURCES) {
      return EXTRA_BACKGROUND_IMAGE_SOURCES[backgroundId as keyof typeof EXTRA_BACKGROUND_IMAGE_SOURCES];
    }
    return require('../assets/images/rawInstagramPost.png');
  };
  
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
        <Image 
          source={getBackgroundSource(selectedBackground)} 
          style={[styles.cardBackground, { opacity: currentBackground.bgOpacity }]}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={currentBackground.colors as unknown as [string, string, ...string[]]}
          style={[styles.cardBackground, { opacity: currentBackground.bgOpacity }]}
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
        <Text style={[
          selectedFormat === 'story' ? styles.brandingBottom : styles.brandingBottomPost,
          { color: currentBackground.brandingColor },
        ]}>
          kriya
        </Text>
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
        <View style={[styles.bottomPanel, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }]}>
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
                      ? (isDarkMode ? '#3b82f6' : '#2563eb')
                      : (isDarkMode ? '#374151' : '#e5e7eb')
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
            {BACKGROUNDS.map((bg) => (
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
                  <Image 
                    source={getBackgroundSource(bg.id, 'post')}
                    style={styles.backgroundSwatchImage}
                    resizeMode="cover"
                  />
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
                Text box opacity
              </Text>
              <Text style={[styles.opacityValue, { color: isDarkMode ? '#d1d5db' : '#6b7280' }]}>
                {Math.round(textboxOpacity * 100)}%
              </Text>
            </View>

            <Pressable onPress={() => updateTextboxOpacity(parseRgba(currentBackground.textBoxBg).alpha)}>
              <Text style={[styles.opacityReset, { color: isDarkMode ? '#93c5fd' : '#2563eb' }]}>
                Reset to background default
              </Text>
            </Pressable>

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
                  className={isDarkMode ? 'bg-blue-400' : 'bg-blue-600'}
                />
              </SliderTrack>
              <SliderThumb
                className={isDarkMode ? 'bg-white border border-gray-900' : 'bg-slate-50 border border-slate-300'}
              />
            </Slider>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.actionButton,
                styles.saveButton,
                { backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }
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
                { backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb' }
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
  brandingBottom: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontFamily: 'Instrument Serif',
    fontSize: 18,
    color: '#ffffff',
    fontStyle: 'italic',
  },
  brandingBottomPost:{
 position: 'absolute',
    top: 10,
    alignSelf: 'flex-end',
    fontFamily: 'Instrument Serif',
    fontSize: 18,
    marginRight:16,

    color: '#ffffff',
    fontStyle: 'italic',
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
    paddingBottom: 16,
  },
  opacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  opacityLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  opacityValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  opacityReset: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
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
    width: '100%',
    height: '100%',
  },
  backgroundSwatchGradient: {
    width: '100%',
    height: '100%',
  },
});

import { memo, useEffect, useMemo, useRef, useState } from 'react';
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
import Feather from "@react-native-vector-icons/feather/static";
import FontAwesome5 from "@react-native-vector-icons/fontawesome5/static";
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { useKriya } from '../lib/store';
import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../lib/haptics';
import { CaptureView, type CaptureViewRef } from 'react-native-capture-view';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { showAppToast } from '../lib/appToast';
import { getShlokaAt, getTranslationForLanguage, type ShlokaRow } from '../lib/shloka';
import Slider from '@react-native-community/slider';
import {
  SHARE_BACKGROUNDS,
  getShareBackground,
  getShareBackgroundImageSource,
  getShareBackgrounds,
  loadRemoteBackgrounds,
  type ShareBackground,
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

const asFileUri = (uri: string) => (uri.startsWith('file://') ? uri : `file://${uri}`);

type ShareCardProps = {
  previewWidth: number;
  previewHeight: number;
  selectedFormat: FormatId;
  currentBackground: ReturnType<typeof getShareBackground>;
  currentBackgroundSource: ReturnType<typeof getShareBackgroundImageSource> | null;
  backgroundOpacity: number;
  onBackgroundLoad?: () => void;
  onBackgroundError?: (error: unknown) => void;
  resolvedTextBoxBg: string;
  chapter?: string;
  verse?: string;
  text?: string;
  translation?: string;
  isTelugu: boolean;
};

const getOverlayJustify = (textBoxPosition: string) => {
  if (textBoxPosition === 'top') return 'flex-start' as const;
  if (textBoxPosition === 'bottom') return 'flex-end' as const;
  return 'center' as const;
};

const ShareCard = memo(function ShareCard({
  previewWidth,
  previewHeight,
  selectedFormat,
  currentBackground,
  currentBackgroundSource,
  backgroundOpacity,
  onBackgroundLoad,
  onBackgroundError,
  resolvedTextBoxBg,
  chapter,
  verse,
  text,
  translation,
  isTelugu,
}: ShareCardProps) {
  return (
    <View style={[styles.cardContainer, { width: previewWidth, height: previewHeight }]}>
      {currentBackground.type === 'image' && currentBackgroundSource ? (
        <View style={styles.backgroundLayer}>
          <Image
            source={currentBackgroundSource}
            style={[styles.backgroundImage, { opacity: backgroundOpacity }]}
            resizeMode="cover"
            onLoad={onBackgroundLoad}
            onError={(event) => onBackgroundError?.(event.nativeEvent.error)}
          />
          <LinearGradient
            colors={['rgba(15, 12, 41, 0.08)', 'rgba(22, 33, 62, 0.08)']}
            style={styles.backgroundTint}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      ) : (
        <LinearGradient
          colors={currentBackground.colors as unknown as [string, string, ...string[]]}
          style={styles.backgroundLayer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      <View style={[styles.cardOverlay, { justifyContent: getOverlayJustify(currentBackground.textBoxPosition) }]}>
        <View
          style={[
            styles.textBox,
            { backgroundColor: resolvedTextBoxBg },
          ]}
        >
          <Text
            style={[
              styles.sanskritText,
              { color: currentBackground.textColor },
            ]}
          >
            {text || 'धृतराष्ट्र उवाच |\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |'}
          </Text>

          <Text
            style={[
              styles.translationText,
              isTelugu && styles.translationTextTelugu,
              { color: currentBackground.translationColor },
            ]}
          >
            {translation || 'Dhritarashtra said: O Sanjay, after gathering on the holy field of Kurukshetra...'}
          </Text>

          <Text style={[styles.referenceBottom, { color: currentBackground.refColor }]}>
            Bhagavad Gita - Chapter {chapter}, Verse {verse}
          </Text>
        </View>

        <View
          style={selectedFormat === 'story' ? styles.brandingWrap : styles.brandingWrapPost}
        >
          <Text
            style={[
              styles.brandingBottom,
              { color: currentBackground.brandingColor },
            ]}
          >
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
              iconStyle="brand"
              color={currentBackground.brandingColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
});

export default function Share2() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    chapter?: string | string[];
    verse?: string | string[];
    text?: string | string[];
    translation?: string | string[];
  }>();
  
  const isDarkMode = useKriya(s => s.isDarkMode);
  const isReady = useKriya(s => s.ready);
  const language = useKriya(s => s.language);
  const firstParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const routeId = firstParam(params.id);
  const routeChapter = firstParam(params.chapter);
  const routeVerse = firstParam(params.verse);
  const routeText = firstParam(params.text);
  const routeTranslation = firstParam(params.translation);
  const [loadedShloka, setLoadedShloka] = useState<ShlokaRow | null>(null);
  const [failedBackgroundIds, setFailedBackgroundIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Remote backgrounds from R2 index.json; starts as the static set and is
  // replaced with whatever R2 lists once the fetch resolves.
  const [remoteBackgrounds, setRemoteBackgrounds] = useState<ShareBackground[]>(() =>
    getShareBackgrounds(),
  );

  useEffect(() => {
    let cancelled = false;
    loadRemoteBackgrounds().then((backgrounds) => {
      if (!cancelled) setRemoteBackgrounds(backgrounds);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const index = Number(routeId);
    if (!Number.isInteger(index) || index < 0) return;

    try {
      setLoadedShloka(getShlokaAt(index));
    } catch (error) {
      console.warn('[Share] Could not load shloka from local database:', error);
    }
  }, [isReady, routeId]);

  // The database row is the source of truth. The route content values are
  // retained only so older/deep links that included them still render.
  const shareChapter = loadedShloka?.chapter_number?.toString() ?? routeChapter;
  const shareVerse = loadedShloka?.verse_number?.toString() ?? routeVerse;
  const shareText = loadedShloka?.text ?? routeText;
  const shareTranslation =
    (loadedShloka
      // TELUGU DISABLED: always render English share cards while Telugu features are paused.
      ? getTranslationForLanguage(loadedShloka, 'en')
      : null)
    ?? routeTranslation
    ?? '';
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
  const [isBackgroundReady, setIsBackgroundReady] = useState(true);
  
  const captureViewRef = useRef<CaptureViewRef>(null);

  const currentFormat = FORMATS.find(f => f.id === selectedFormat)!;
  const currentBackground = getShareBackground(selectedBackground);
  const currentTextBoxColor = parseRgba(currentBackground.textBoxBg);
  const resolvedTextBoxBg = formatRgba(currentTextBoxColor, textboxOpacity);
  const currentBackgroundSource = useMemo(
    () => (currentBackground.type === 'image' && !failedBackgroundIds.has(currentBackground.id)
      ? getShareBackgroundImageSource(currentBackground)
      : null),
    [currentBackground, failedBackgroundIds],
  );

  const handleBackgroundError = (error: unknown) => {
    if (currentBackground.type !== 'image') return;
    console.warn('[Share] Background image failed:', {
      backgroundId: currentBackground.id,
      url: currentBackground.imageUrl,
      error,
    });
    setFailedBackgroundIds((previous) => {
      const next = new Set(previous);
      next.add(currentBackground.id);
      return next;
    });
  };

  useEffect(() => {
    // Do NOT reset opacity sliders here — the user's background/text box
    // opacity choices should persist across background selections.
    setIsBackgroundReady(currentBackground.type !== 'image' || currentBackgroundSource === null);
  }, [currentBackground, currentBackgroundSource]);

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
    setIsSharing(true);
    buttonPressHaptic();
    
    try {
      const uri = await captureCardUri();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          UTI: 'public.jpeg',
          dialogTitle: 'Share Shloka',
        });
        taskCompleteHaptic();
      } else {
        showAppToast({
          type: 'error',
          text1: 'Sharing is unavailable',
          text2: 'Please save the card and share it from your gallery.',
          duration: 2200,
          position: 'top',
          topOffset: 64,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      showAppToast({
        type: 'error',
        text1: 'Share failed',
        text2: 'Please try again.',
        duration: 1800,
        position: 'top',
        topOffset: 64,
      });
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    buttonPressHaptic();
    
    try {
      // Android 13+ only offers READ_MEDIA_*; a write-only request resolves to
      // an empty (never "granted") result there, so ask for read access too.
      const { status } = await MediaLibrary.requestPermissionsAsync(false);
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
      
      const uri = await captureCardUri();
      await MediaLibrary.Asset.create(uri);
      
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

  const captureCardUri = async (): Promise<string> => {
    if (!isBackgroundReady) {
      throw new Error('The selected background image has not finished loading.');
    }

    // CaptureView does not wait for <Image> loading. `isBackgroundReady` is
    // set by Image#onLoad, then two frames ensure the image is painted.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const captureView = captureViewRef.current;
    if (!captureView) {
      throw new Error('The share card is not ready to capture.');
    }
    const result = await captureView.capture({
      format: 'jpg',
      quality: 1,
      output: 'tmpfile',
    });
    if (!result.uri) {
      throw new Error('The share card capture did not return a file URI.');
    }
    return asFileUri(result.uri);
  };
  
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
          <CaptureView ref={captureViewRef}>
            <ShareCard
              previewWidth={previewWidth}
              previewHeight={previewHeight}
              selectedFormat={selectedFormat}
              currentBackground={currentBackground}
              currentBackgroundSource={currentBackgroundSource}
              backgroundOpacity={backgroundOpacity}
              resolvedTextBoxBg={resolvedTextBoxBg}
              chapter={shareChapter}
              verse={shareVerse}
              text={shareText}
              translation={shareTranslation}
              isTelugu={false /* TELUGU DISABLED: was language === 'te' */}
              onBackgroundLoad={() => setIsBackgroundReady(true)}
              onBackgroundError={handleBackgroundError}
            />
          </CaptureView>
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
            {remoteBackgrounds.map((bg) => (
              <Pressable
                key={bg.id}
                onPress={() => {
                  selectionHaptic();
                  setIsBackgroundReady(bg.type !== 'image' || failedBackgroundIds.has(bg.id));
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
                    {!failedBackgroundIds.has(bg.id) && (
                      <Image
                        source={getShareBackgroundImageSource(bg)}
                        style={styles.backgroundSwatchImage}
                        resizeMode="cover"
                        onError={(event) => {
                          console.warn('[Share] Background swatch failed:', {
                            backgroundId: bg.id,
                            url: bg.imageUrl,
                            error: event.nativeEvent.error,
                          });
                          setFailedBackgroundIds((previous) => {
                            const next = new Set(previous);
                            next.add(bg.id);
                            return next;
                          });
                        }}
                      />
                    )}
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
                style={{ width: '100%' }}
                value={Math.round(backgroundOpacity * 100)}
                minimumValue={0}
                maximumValue={100}
                step={1}
                minimumTrackTintColor={isDarkMode ? '#0f766e' : '#2563eb'}
                maximumTrackTintColor={isDarkMode ? '#374151' : '#e5e7eb'}
                thumbTintColor={isDarkMode ? '#ffffff' : '#f8fafc'}
                onValueChange={(value) => updateBackgroundOpacity(value / 100)}
              />
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
                style={{ width: '100%' }}
                value={Math.round(textboxOpacity * 100)}
                minimumValue={0}
                maximumValue={100}
                step={1}
                minimumTrackTintColor={isDarkMode ? '#0f766e' : '#2563eb'}
                maximumTrackTintColor={isDarkMode ? '#374151' : '#e5e7eb'}
                thumbTintColor={isDarkMode ? '#ffffff' : '#f8fafc'}
                onValueChange={(value) => updateTextboxOpacity(value / 100)}
              />
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
                {
                  backgroundColor: isDarkMode ? '#293a3d' : '#e5e7eb',
                }
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
                {
                  backgroundColor: isDarkMode ? '#013540' : '#2563eb',
                }
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
    backgroundColor: '#10121f',
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
    paddingTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  translationText: {
    fontFamily: 'Dancing Script',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,


  },
  translationTextTelugu: {
    fontFamily: 'NTR',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  referenceBottom: {
    fontFamily: 'Cedarville Cursive',
    fontSize: 8,
    color: '#b0b0b0',
    marginTop: 22,
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
    fontSize: 15,
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundSwatchImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  backgroundSwatchGradient: {
    width: '100%',
    height: '100%',
  },
});

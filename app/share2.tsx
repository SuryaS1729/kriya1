import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Asset, Album, getPermissionsAsync, requestPermissionsAsync } from 'expo-media-library';
import { File } from 'expo-file-system';
import { showAppToast } from '../lib/appToast';
import { getShlokaAt, getTranslationForLanguage } from '../lib/shloka';
import Slider from '@react-native-community/slider';
import {
  DEFAULT_SHARE_BG_OPACITY,
  DEFAULT_SHARE_TEXT_BOX_BG,
  getShareBackground,
  getShareBackgroundImageSource,
  getShareBackgrounds,
  loadRemoteBackgrounds,
  type ShareImageBackground,
  type ShareBackgroundId,
} from '../lib/shareBackgrounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card formats. Export resolution = layout points × screen scale
// (CaptureView has no scale option), so aspect ratio is what matters here.
const FORMATS = [
  { id: 'story', label: 'Story', aspectRatio: 9/16 },
  { id: 'post', label: 'Post', aspectRatio: 1 },
] as const;

type FormatId = typeof FORMATS[number]['id'];
type TextAlignment = 'left' | 'center' | 'right';

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const SLIDER_MIN = 0;
const SLIDER_MAX = 1;

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
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

const asFileUri = (uri: string) =>
  /^[a-z][a-z0-9+.-]*:\/\//i.test(uri) ? uri : `file://${uri}`;

type ShareCardProps = {
  previewWidth: number;
  previewHeight: number;
  selectedFormat: FormatId;
  currentBackground: ReturnType<typeof getShareBackground>;
  currentBackgroundSource: ReturnType<typeof getShareBackgroundImageSource> | null;
  backgroundOpacity: number;
  textAlignment: TextAlignment;
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

// Normalize stored breaks: real newlines, CRLF, and literal "\\n"
// (from deep-link params or escaped DB rows) all become "\n".
const normalizeBreaks = (input: string | undefined) =>
  input?.replace(/\r\n?/g, '\n').replace(/\\n/g, '\n');

// Database verses use blank lines between padas. They are useful in the reader,
// but too spacious for a share card; retain each meaningful line instead.
const compactShlokaBreaks = (input: string | undefined) =>
  normalizeBreaks(input)
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

const MIN_TEXT_FIT_SCALE = 0.58;

const ShareCard = memo(function ShareCard({
  previewWidth,
  previewHeight,
  selectedFormat,
  currentBackground,
  currentBackgroundSource,
  backgroundOpacity,
  textAlignment,
  onBackgroundLoad,
  onBackgroundError,
  resolvedTextBoxBg,
  chapter,
  verse,
  text,
  translation,
  isTelugu,
}: ShareCardProps) {
  // The card always has the same logical width at its largest preview, then
  // scales down proportionally on narrow devices.
  const fontScale = previewWidth / 350;
  const s = (size: number) => Math.round(size * fontScale * 10) / 10;
  const shlokaText = compactShlokaBreaks(
    text || 'धृतराष्ट्र उवाच |\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |',
  );
  const wrappedTranslation =
    translation || 'Dhritarashtra said: O Sanjay, after gathering on the holy field of Kurukshetra...';
  const [textFitScale, setTextFitScale] = useState(1);
  const expectedSanskritLines = shlokaText?.split('\n').length ?? 1;
  const maxTextBoxHeight = previewHeight * (selectedFormat === 'story' ? 0.68 : 0.7);
  const sanskritFontSize = s(18) * textFitScale;
  const translationFontSize = s(12) * textFitScale;
  const sanskritLineHeight = Math.round(sanskritFontSize * 1.7 * 10) / 10;
  const translationLineHeight = Math.round(translationFontSize * 1.52 * 10) / 10;

  const reduceTextFit = useCallback((factor: number) => {
    setTextFitScale((current) => {
      const next = Math.max(
        MIN_TEXT_FIT_SCALE,
        Math.round(current * factor * 100) / 100,
      );
      return next < current ? next : current;
    });
  }, [setTextFitScale]);

  const handleSanskritTextLayout = useCallback((event: { nativeEvent: { lines: unknown[] } }) => {
    // Every source line is a semantic Sanskrit pada. If native wrapping makes
    // more visual lines than that, reduce type a little and measure again.
    if (event.nativeEvent.lines.length > expectedSanskritLines) {
      reduceTextFit(0.92);
    }
  }, [expectedSanskritLines, reduceTextFit]);

  const handleTextBoxLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const height = event.nativeEvent.layout.height;
    if (height > maxTextBoxHeight) {
      // Keep adjustments gradual: line wrapping can change after each pass.
      reduceTextFit(Math.max(0.88, maxTextBoxHeight / height));
    }
  }, [maxTextBoxHeight, reduceTextFit]);

  return (
    <View style={[styles.cardContainer, { width: previewWidth, height: previewHeight }]}>
      <View style={styles.backgroundLayer}>
        {currentBackgroundSource ? (
          <>
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
          </>
        ) : (
          <View style={[styles.backgroundImage, { backgroundColor: '#10121f', opacity: backgroundOpacity }]} />
        )}
      </View>

      <View style={[styles.cardOverlay, { justifyContent: getOverlayJustify(currentBackground.textBoxPosition) }]}>
        <View
          style={[
            styles.textBox,
            { backgroundColor: resolvedTextBoxBg },
          ]}
          onLayout={handleTextBoxLayout}
        >
          <Text
            style={[
              styles.sanskritText,
              {
                color: currentBackground.textColor,
                fontSize: sanskritFontSize,
                lineHeight: sanskritLineHeight,
                textAlign: textAlignment,
              },
            ]}
            onTextLayout={handleSanskritTextLayout}
          >
            {shlokaText}
          </Text>

          <Text
            style={[
              styles.translationText,
              isTelugu && styles.translationTextTelugu,
              {
                color: currentBackground.translationColor,
                fontSize: translationFontSize,
                lineHeight: translationLineHeight,
                textAlign: textAlignment,
              },
            ]}
          >
            {wrappedTranslation}
          </Text>

          <Text style={[styles.referenceBottom, {
            color: currentBackground.refColor,
            fontSize: s(10) * textFitScale,
            textAlign: textAlignment,
          }]}>
            Bhagavad Gita - Chapter {chapter}, Verse {verse}
          </Text>
        </View>

        <View
          style={selectedFormat === 'story' ? styles.brandingWrap : styles.brandingWrapPost}
        >
          <Text
            style={[
              styles.brandingBottom,
              { color: currentBackground.brandingColor, fontSize: s(15) },
            ]}
          >
            kriya
          </Text>
          <View style={styles.platformRow}>
            <Text
              style={[
                styles.platformText,
                { color: currentBackground.brandingColor, fontSize: s(8) },
              ]}
            >
              available on
            </Text>
            <Ionicons
              name="logo-google-playstore"
              size={s(10)}
              color={currentBackground.brandingColor}
            />
            <FontAwesome5
              name="app-store-ios"
              size={s(10)}
              iconStyle="brand"
              color={currentBackground.brandingColor}
            />
          </View>
        </View>
      </View>
    </View>
  );
});

type BackgroundSwatchProps = {
  background: ShareImageBackground;
  isSelected: boolean;
  hasFailed: boolean;
  onSelect: (id: ShareBackgroundId) => void;
  onImageError: (id: ShareBackgroundId, url: string, error: unknown) => void;
};

// Keep thumbnail images mounted while the selected background changes. Without
// this boundary every swatch receives a new `source` object on a parent render,
// which makes the entire bottom panel appear to refresh.
const BackgroundSwatch = memo(function BackgroundSwatch({
  background,
  isSelected,
  hasFailed,
  onSelect,
  onImageError,
}: BackgroundSwatchProps) {
  const source = useMemo(
    () => getShareBackgroundImageSource(background),
    [background],
  );
  const handlePress = useCallback(() => onSelect(background.id), [background.id, onSelect]);
  const handleError = useCallback(
    (event: { nativeEvent: { error: unknown } }) =>
      onImageError(background.id, background.imageUrl, event.nativeEvent.error),
    [background.id, background.imageUrl, onImageError],
  );

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.backgroundSwatch, isSelected && styles.backgroundSwatchActive]}
    >
      <View style={styles.backgroundSwatchImageContainer}>
        {!hasFailed && (
          <Image
            source={source}
            style={styles.backgroundSwatchImage}
            resizeMode="cover"
            onError={handleError}
          />
        )}
      </View>
    </Pressable>
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
  const routeId = firstParam(params.id);
  const routeChapter = firstParam(params.chapter);
  const routeVerse = firstParam(params.verse);
  const routeText = firstParam(params.text);
  const routeTranslation = firstParam(params.translation);
  const [failedBackgroundIds, setFailedBackgroundIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Remote backgrounds from R2 index.json (pictures only — no gradients).
  const [remoteBackgrounds, setRemoteBackgrounds] = useState<ShareImageBackground[]>(() =>
    getShareBackgrounds(),
  );
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('story');
  const [textAlignment, setTextAlignment] = useState<TextAlignment>('center');
  const [selectedBackground, setSelectedBackground] = useState<ShareBackgroundId>('b01');
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textboxOpacity, setTextboxOpacity] = useState<number>(
    parseRgba(DEFAULT_SHARE_TEXT_BOX_BG).alpha,
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    DEFAULT_SHARE_BG_OPACITY,
  );
  const [loadedBackgroundId, setLoadedBackgroundId] = useState<ShareBackgroundId | null>(null);

  const captureViewRef = useRef<CaptureViewRef>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadRemoteBackgrounds().then((backgrounds) => {
      if (!cancelled) {
        setRemoteBackgrounds(backgrounds);
        setSelectedBackground((current) =>
          backgrounds.some((background) => background.id === current)
            ? current
            : (backgrounds[0]?.id ?? current),
        );
        // Warm the cache so taps capture instantly.
        backgrounds.slice(0, 6).forEach((bg) => {
          Image.prefetch(bg.imageUrl).catch(() => {});
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadedShloka = useMemo(() => {
    const index = Number(routeId);
    if (!isReady || !Number.isInteger(index) || index < 0) return null;

    try {
      return getShlokaAt(index);
    } catch (error) {
      if (__DEV__) console.warn('[Share] Could not load shloka from local database:', error);
      return null;
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

  const currentFormat = FORMATS.find(f => f.id === selectedFormat)!;
  // Look up in the loaded list (not the global cache) so the active swatch
  // always matches the rendered card.
  const currentBackground = useMemo(
    () =>
      remoteBackgrounds.find((bg) => bg.id === selectedBackground) ??
      remoteBackgrounds[0] ??
      getShareBackground(selectedBackground),
    [remoteBackgrounds, selectedBackground],
  );
  const currentTextBoxColor = useMemo(
    () => parseRgba(currentBackground.textBoxBg),
    [currentBackground.textBoxBg],
  );
  const resolvedTextBoxBg = useMemo(
    () => formatRgba(currentTextBoxColor, textboxOpacity),
    [currentTextBoxColor, textboxOpacity],
  );
  const backgroundFailed = failedBackgroundIds.has(currentBackground.id);
  const currentBackgroundSource = useMemo(
    () => (!backgroundFailed ? getShareBackgroundImageSource(currentBackground) : null),
    [backgroundFailed, currentBackground],
  );
  const isBackgroundReady =
    currentBackgroundSource === null || loadedBackgroundId === currentBackground.id;

  const handleBackgroundError = useCallback((error: unknown) => {
    if (__DEV__) {
      console.warn('[Share] Background image failed:', {
        backgroundId: currentBackground.id,
        url: currentBackground.imageUrl,
        error,
      });
    }
    setFailedBackgroundIds((previous) => {
      if (previous.has(currentBackground.id)) return previous;
      const next = new Set(previous);
      next.add(currentBackground.id);
      return next;
    });
  }, [currentBackground.id, currentBackground.imageUrl]);

  const handleBackgroundLoad = useCallback(() => {
    setLoadedBackgroundId(currentBackground.id);
  }, [currentBackground.id]);

  const handleBackgroundSelect = useCallback((id: ShareBackgroundId) => {
    selectionHaptic();
    setSelectedBackground(id);
  }, []);

  const handleSwatchImageError = useCallback(
    (id: ShareBackgroundId, url: string, error: unknown) => {
      if (__DEV__) {
        console.warn('[Share] Background swatch failed:', {
          backgroundId: id,
          url,
          error,
        });
      }
      setFailedBackgroundIds((previous) => {
        if (previous.has(id)) return previous;
        const next = new Set(previous);
        next.add(id);
        return next;
      });
    },
    [setFailedBackgroundIds],
  );

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
      quality: 0.9,
      output: 'tmpfile',
    });
    if (!result.uri) {
      throw new Error('The share card capture did not return a file URI.');
    }
    return asFileUri(result.uri);
  };

  const deleteTempFile = (uri: string) => {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Best effort cleanup — capture tmp files are in cache anyway.
    }
  };

  const handleShare = async () => {
    if (isSharing || !isBackgroundReady) return;
    setIsSharing(true);
    buttonPressHaptic();

    let uri: string | null = null;
    try {
      uri = await captureCardUri();

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
          text1: 'Sharing unavailable',
          duration: 2000,
          position: 'top',
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Share failed:', error);
      showAppToast({
        type: 'error',
        text1:
          error instanceof Error && /not finished loading/i.test(error.message)
            ? 'Image still loading… try again'
            : 'Share failed',
        duration: 1800,
        position: 'top',
      });
    } finally {
      if (uri) deleteTempFile(uri);
      if (mountedRef.current) setIsSharing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving || !isBackgroundReady) return;
    setIsSaving(true);
    buttonPressHaptic();

    let uri: string | null = null;
    try {
      const existing = await getPermissionsAsync(false);
      const { status } =
        existing.status === 'granted'
          ? existing
          : await requestPermissionsAsync(false);
      if (status !== 'granted') {
        showAppToast({
          type: 'error',
          text1: 'Photo access needed',
          duration: 2000,
          position: 'top',
        });
        return;
      }

      uri = await captureCardUri();
      const asset = await Asset.create(uri);

      // Best effort: group saves under a Kriya album; ignore failures.
      try {
        const album = await Album.get('Kriya');
        if (album) {
          await album.add(asset);
        } else {
          await Album.create('Kriya', [asset], false);
        }
      } catch {
        // Asset is already in the gallery; album grouping is optional.
      }

      taskCompleteHaptic();
      showAppToast({
        type: 'success',
        text1: 'Saved to gallery',
        duration: 1800,
        position: 'top',
      });
    } catch (error) {
      if (__DEV__) console.error('[Save] Failed:', error);
      showAppToast({
        type: 'error',
        text1:
          error instanceof Error && /not finished loading/i.test(error.message)
            ? 'Image still loading… try again'
            : 'Save failed',
        duration: 1800,
        position: 'top',
      });
    } finally {
      if (uri) deleteTempFile(uri);
      if (mountedRef.current) setIsSaving(false);
    }
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
          <CaptureView ref={captureViewRef} style={{ width: previewWidth, height: previewHeight }}>
            <ShareCard
              key={`${selectedFormat}:${previewWidth}:${shareText ?? ''}:${shareTranslation}`}
              previewWidth={previewWidth}
              previewHeight={previewHeight}
              selectedFormat={selectedFormat}
              textAlignment={textAlignment}
              currentBackground={currentBackground}
              currentBackgroundSource={currentBackgroundSource}
              backgroundOpacity={backgroundOpacity}
              resolvedTextBoxBg={resolvedTextBoxBg}
              chapter={shareChapter}
              verse={shareVerse}
              text={shareText}
              translation={shareTranslation}
              isTelugu={false /* TELUGU DISABLED: was language === 'te' */}
              onBackgroundLoad={handleBackgroundLoad}
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

          <View style={styles.alignmentSelector}>
            {([
              { id: 'left', icon: 'align-left', label: 'Align text left' },
              { id: 'center', icon: 'align-center', label: 'Align text center' },
              { id: 'right', icon: 'align-right', label: 'Align text right' },
            ] as const).map((alignment) => {
              const isActive = textAlignment === alignment.id;
              return (
                <Pressable
                  key={alignment.id}
                  onPress={() => {
                    selectionHaptic();
                    setTextAlignment(alignment.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={alignment.label}
                  accessibilityState={{ selected: isActive }}
                  style={[
                    styles.alignmentButton,
                    {
                      backgroundColor: isActive
                        ? (isDarkMode ? '#013540' : '#2563eb')
                        : (isDarkMode ? '#293a3d' : '#e5e7eb'),
                    },
                  ]}
                >
                  <Feather
                    name={alignment.icon}
                    size={18}
                    color={isActive ? '#fff' : (isDarkMode ? '#9ca3af' : '#6b7280')}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Background Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.backgroundSelector}
          >
            {remoteBackgrounds.map((bg) => (
              <BackgroundSwatch
                key={bg.id}
                background={bg}
                isSelected={selectedBackground === bg.id}
                hasFailed={failedBackgroundIds.has(bg.id)}
                onSelect={handleBackgroundSelect}
                onImageError={handleSwatchImageError}
              />
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
              accessibilityRole="button"
              accessibilityLabel="Save share card to gallery"
              style={[
                styles.actionButton,
                styles.saveButton,
                {
                  backgroundColor: isDarkMode ? '#293a3d' : '#e5e7eb',
                  opacity: 1,
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
              accessibilityRole="button"
              accessibilityLabel="Share shloka image"
              style={[
                styles.actionButton,
                styles.shareButton,
                {
                  backgroundColor: isDarkMode ? '#013540' : '#2563eb',
                  opacity: 1,
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
  alignmentSelector: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  alignmentButton: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '92%',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 4,
    alignItems: 'stretch',
  },
  sanskritText: {
    // Tillana has much more even Devanagari metrics than the handwritten
    // Kalam face, which matters when each Sanskrit pada is centered.
    fontFamily: 'Tillana',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 10,
    textAlign: 'center',
    includeFontPadding: false,

  },
  translationText: {
    fontFamily: 'Dancing Script',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',

    includeFontPadding: false,
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
    marginTop: 14,
    textAlign: 'center',
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

import { useState, useRef } from 'react';
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
  PixelRatio,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useKriya } from '../lib/store';
import { buttonPressHaptic, selectionHaptic, taskCompleteHaptic } from '../lib/haptics';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Toast, ToastTitle, useToast } from '@/components/ui/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card format configurations - 4K resolution
const FORMATS = [
  { id: 'post', label: 'Post', aspectRatio: 1, width: 4096, height: 4096 },
  { id: 'story', label: 'Story', aspectRatio: 9/16, width: 2304, height: 4096 },
  { id: 'twitter', label: 'Twitter', aspectRatio: 16/9, width: 4096, height: 2304 },
] as const;

type FormatId = typeof FORMATS[number]['id'];

// Beautiful gradient backgrounds
const BACKGROUNDS = [
  { id: 'image', label: 'Krishna', type: 'image' as const, colors: ['#1a1a2e', '#16213e'] },
  { id: 'sunset', label: 'Sunset', type: 'gradient' as const, colors: ['#ff6b6b', '#ee5a24', '#f0932b'] },
  { id: 'ocean', label: 'Ocean', type: 'gradient' as const, colors: ['#0f3460', '#16537e', '#1e6f9f'] },
  { id: 'forest', label: 'Forest', type: 'gradient' as const, colors: ['#134e5e', '#1a5d37', '#2d6a4f'] },
  { id: 'twilight', label: 'Twilight', type: 'gradient' as const, colors: ['#2c3e50', '#4a69bd', '#6a89cc'] },
  { id: 'rose', label: 'Rose', type: 'gradient' as const, colors: ['#c44569', '#cf6a87', '#e7a8a8'] },
  { id: 'midnight', label: 'Midnight', type: 'gradient' as const, colors: ['#0f0c29', '#302b63', '#24243e'] },
  { id: 'gold', label: 'Gold', type: 'gradient' as const, colors: ['#8b6914', '#b8860b', '#daa520'] },
] as const;

type BackgroundId = typeof BACKGROUNDS[number]['id'];

export default function Share2() {
  const params = useLocalSearchParams<{
    id?: string;
    chapter?: string;
    verse?: string;
    text?: string;
    translation?: string;
  }>();
  
  const isDarkMode = useKriya(s => s.isDarkMode);
  const toast = useToast();
  
  const [selectedFormat, setSelectedFormat] = useState<FormatId>('post');
  const [selectedBackground, setSelectedBackground] = useState<BackgroundId>('image');
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);
  
  const currentFormat = FORMATS.find(f => f.id === selectedFormat)!;
  const currentBackground = BACKGROUNDS.find(b => b.id === selectedBackground)!;
  
  // Calculate preview dimensions to fit screen
  const PREVIEW_PADDING = 40;
  const maxWidth = SCREEN_WIDTH - PREVIEW_PADDING * 2;
  const previewWidth = Math.min(maxWidth, 350);
  const previewHeight = previewWidth / currentFormat.aspectRatio;
  
  // Get background image based on format
  const getBackgroundSource = () => {
    switch (selectedFormat) {
      case 'twitter':
        return require('../assets/images/rawTwitter.png');
      case 'story':
        return require('../assets/images/rawInstagramStory.png');
      case 'post':
        return require('../assets/images/rawInstagramPost.png');
    }
  };
  
  const handleShare = async () => {
    if (!viewShotRef.current?.capture) return;
    
    setIsSharing(true);
    buttonPressHaptic();
    
    try {
      const uri = await viewShotRef.current.capture();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
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
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        toast.show({
          id: 'permission-denied',
          placement: 'bottom',
          duration: 2000,
          render: ({ id }) => (
            <Toast nativeID={`toast-${id}`} action="error" variant="solid">
              <ToastTitle>Permission denied</ToastTitle>
            </Toast>
          ),
        });
        return;
      }
      
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      
      taskCompleteHaptic();
      toast.show({
        id: 'saved-success',
        placement: 'bottom',
        duration: 2000,
        render: ({ id }) => (
          <Toast 
            nativeID={`toast-${id}`} 
            action="success" 
            variant="solid"
            style={{ backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' }}
          >
            <ToastTitle style={{ color: isDarkMode ? '#d1fae5' : '#064e3b' }}>
              Saved to gallery!
            </ToastTitle>
          </Toast>
        ),
      });
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Card Component - This gets captured as image
  const ShareCard = () => (
    <View style={[styles.cardContainer, { width: previewWidth, height: previewHeight }]}>
      {/* Background - either image or gradient */}
      {currentBackground.type === 'image' ? (
        <Image 
          source={getBackgroundSource()} 
          style={styles.cardBackground}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={currentBackground.colors as unknown as [string, string, ...string[]]}
          style={styles.cardBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}
      
      {/* Content Overlay */}
      <View style={styles.cardOverlay}>
        {/* Twitter layout - branding top right */}
        {selectedFormat === 'twitter' && (
          <>
            <Text style={styles.brandingTopRight}>kriya</Text>
            <Text style={styles.referenceTop}>BG{params.chapter}.{params.verse}</Text>
          </>
        )}
        
        {/* Text Box */}
        <View style={[
          styles.textBox,
          selectedFormat === 'story' && styles.textBoxStory,
          selectedFormat === 'post' && styles.textBoxPost,
          selectedFormat === 'twitter' && styles.textBoxTwitter,
        ]}>
          {/* Sanskrit Text */}
          <Text style={[
            styles.sanskritText,
            selectedFormat === 'story' && styles.sanskritTextStory,
          ]}>
            {params.text || 'धृतराष्ट्र उवाच |\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |'}
          </Text>
          
          {/* English Translation */}
          <Text style={[
            styles.translationText,
            selectedFormat === 'story' && styles.translationTextStory,
          ]}>
            {params.translation || 'Dhritarashtra said: O Sanjay, after gathering on the holy field of Kurukshetra...'}
          </Text>
          
          {/* Reference for Story/Post */}
          {selectedFormat !== 'twitter' && (
            <Text style={styles.referenceBottom}>
              BG {params.chapter}.{params.verse}
            </Text>
          )}
        </View>
        
        {/* Bottom branding for Story/Post */}
        {selectedFormat !== 'twitter' && (
          <Text style={styles.brandingBottom}>kriyā</Text>
        )}
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
                  source={require('../assets/images/rawInstagramPost.png')}
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
        
        {/* Preview Area */}
        <ScrollView 
          contentContainerStyle={styles.previewContainer}
          showsVerticalScrollIndicator={false}
        >
          <ViewShot 
            ref={viewShotRef} 
            options={{ 
              format: 'png', 
              quality: 1,
              width: currentFormat.width,
              height: currentFormat.height,
            }}
          >
            <ShareCard />
          </ViewShot>
        </ScrollView>
        
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
    opacity:0.6
  },
  cardOverlay: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',

  },
  textBox: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  textBoxStory: {
    // Story format - centered vertically with slight offset from bottom for branding
  },
  textBoxPost: {
    // Post format - perfectly centered (default from cardOverlay)
    backgroundColor:'rgba(30, 30, 30, 0.9)'

  },
  textBoxTwitter: {
    // Twitter format - centered with space for top reference
    marginTop: 40,
  },
  sanskritText: {
    fontFamily: 'Kalam',
    fontSize: 14,
    lineHeight: 12,
    color: '#f5f5f5',
    fontWeight: '700',
    marginTop: 12,
    paddingTop:12,
    marginBottom: 12,
    textAlign:'center'
  },
  sanskritTextStory: {
    fontSize: 16,
    lineHeight: 16,
  },
  translationText: {
    fontFamily: 'Alegreya',
    fontSize: 11,
    lineHeight: 16,
    color: '#e0e0e0',
  },
  translationTextStory: {
    fontSize: 12,
    lineHeight: 18,
  },
  referenceTop: {
    fontFamily: 'Source Serif Pro',
    fontSize: 10,
    color: '#d0d0d0',
    fontStyle: 'italic',
    position: 'absolute',
    top: 12,
    left: 16,
  },
  referenceBottom: {
    fontFamily: 'Source Serif Pro',
    fontSize: 10,
    color: '#b0b0b0',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 12,
  },
  brandingTopRight: {
    position: 'absolute',
    top: 12,
    right: 16,
    fontFamily: 'Instrument Serif',
    fontSize: 16,
    color: '#ffffff',
    fontStyle: 'italic',
  },
  brandingBottom: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    fontFamily: 'Instrument Serif',
    fontSize: 24,
    color: '#ffffff',
    fontStyle: 'italic',
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

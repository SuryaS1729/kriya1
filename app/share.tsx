import { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Dimensions,
  Alert,
  Platform,
  ScrollView,
  ImageBackground // Add this import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getShlokaAt, type ShlokaRow } from '../lib/shloka';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Platform configurations
const PLATFORMS = {
  story: {
    name: 'Instagram Story',
    icon: 'instagram',
    ratio: 9/16,
    description: '9:16'
  },
  post: {
    name: 'Instagram Post',
    icon: 'instagram',
    ratio: 1,
    description: '1:1'
  },
  twitter: {
    name: 'Twitter/X Post',
    icon: 'twitter',
    ratio: 16/9,
    description: '16:9'
  }
} as const;

type PlatformType = keyof typeof PLATFORMS;

// Remove the backgroundImages array and replace with platform-specific backgrounds
const getBackgroundForPlatform = (platform: PlatformType) => {
  switch (platform) {
    case 'story':
      return require('../assets/images/krishna-1.jpeg');
    case 'twitter':
      return require('../assets/images/krishna-2.jpeg');
    case 'post':
      // You can add krishna-3.jpeg here when you find the right image
      return require('../assets/images/krishna-1.jpeg'); // Temporary fallback
    default:
      return require('../assets/images/krishna-1.jpeg');
  }
};

export default function SharePage() {
  const params = useGlobalSearchParams();
  const [shloka, setShloka] = useState<ShlokaRow | null>(null);
  const [platform, setPlatform] = useState<PlatformType>('story');
  // Remove backgroundIndex state - no longer needed
  const cardRef = useRef<ViewShot>(null);

  // Calculate card dimensions to fit in the top half
  const availableHeight = screenHeight * 0.4; // Leave some margin
  const availableWidth = screenWidth * 0.8;
  
  const cardConfig = PLATFORMS[platform];
  let cardWidth, cardHeight;
  
  if (cardConfig.ratio > 1) {
    // Landscape (Twitter)
    cardWidth = availableWidth;
    cardHeight = cardWidth / cardConfig.ratio;
  } else {
    // Portrait or Square
    cardHeight = availableHeight;
    cardWidth = cardHeight * cardConfig.ratio;
  }

  useEffect(() => {
    const shlokaId = params.shlokaId as string;
    if (shlokaId) {
      const shlokaData = getShlokaAt(parseInt(shlokaId));
      setShloka(shlokaData);
    }
  }, [params]);

  const shareCard = async () => {
    try {
      if (!cardRef.current) return;
      
      const uri = await cardRef.current.capture();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share to ${cardConfig.name}`,
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share card');
    }
  };

  const saveCard = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the card to your gallery');
        return;
      }

      if (!cardRef.current) return;
      
      // capture() method takes no arguments
      const uri = await cardRef.current.capture();
      
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Kriya', asset, false);
      
      Alert.alert('Success!', `${cardConfig.name} card saved to gallery ✨`);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save card to gallery');
    }
  };

  // Dynamic font sizes based on card size
  const getFontSizes = () => {
    const scale = Math.min(cardWidth, cardHeight) / 300;
    return {
      om: Math.max(24, 40 * scale),
      chapter: Math.max(10, 14 * scale),
      sanskrit: Math.max(12, 18 * scale),
      translation: Math.max(11, 16 * scale),
      footer: Math.max(8, 12 * scale),
      app: Math.max(10, 16 * scale)
    };
  };

  const fontSizes = getFontSizes();

  if (!shloka) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>Share Shloka</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.loadingText}>Loading shloka...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Share Shloka</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Fixed 50:50 Layout */}
      <View style={styles.mainContent}>
        {/* Top Half - Card Preview (Fixed) */}
        <View style={styles.previewSection}>
          <ViewShot 
            ref={cardRef} 
            options={{
              format: "png",
              quality: 1.0,

            }}
            style={[styles.card, { width: cardWidth, height: cardHeight }]}
          >
            <ImageBackground
              source={getBackgroundForPlatform(platform)}
              style={styles.cardBackground}
              imageStyle={styles.backgroundImage}
            >
              {/* Dark overlay for better text readability */}
              <View style={styles.overlay} />
              
              {platform === 'twitter' ? (
                // Horizontal layout for Twitter
                <View style={styles.twitterLayout}>
                  <View style={styles.twitterLeft}>
                    <Text style={[styles.om, { fontSize: fontSizes.om }]}>ॐ</Text>
                    <Text style={[styles.chapterText, { fontSize: fontSizes.chapter }]}>
                      Bhagavad Gita {shloka.chapter_number}.{shloka.verse_number}
                    </Text>
                  </View>
                  <View style={styles.twitterRight}>
                    <View style={styles.textContainer}>
                      <Text style={[styles.sanskritText, { fontSize: fontSizes.sanskrit }]}>
                        {shloka.text}
                      </Text>
                      <Text style={[styles.translationText, { fontSize: fontSizes.translation }]}>
                        {shloka.translation_2 || shloka.description}
                      </Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.appName, { fontSize: fontSizes.app }]}>kriya</Text>
                    </View>
                  </View>
                </View>
              ) : (
                // Vertical layout for Instagram
                <View style={styles.verticalLayout}>
                  <View style={styles.topSection}>
                    <Text style={[styles.chapterText, { fontSize: fontSizes.chapter }]}>
                      Bhagavad Gita {shloka.chapter_number}.{shloka.verse_number}
                    </Text>
                  </View>

                  <View style={styles.contentSection}>
                    <View style={styles.textContainer}>
                      <Text style={[styles.sanskritText, { fontSize: fontSizes.sanskrit }]}>
                        {shloka.text}
                      </Text>
                      <Text style={[styles.translationText, { fontSize: fontSizes.translation }]}>
                        {shloka.translation_2 || shloka.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bottomSection}>
                    <View style={styles.brandContainer}>
                      <Text style={[styles.appName, { fontSize: fontSizes.app }]}>kriya</Text>
                      
                    </View>
                  </View>
                </View>
              )}
            </ImageBackground>
          </ViewShot>
        </View>

        {/* Bottom Half - Options (Scrollable) */}
        <View style={styles.optionsSection}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsContent}
          >
            {/* Platform Selector */}
            <View style={styles.optionGroup}>
              <Text style={styles.sectionTitle}>Choose Platform</Text>
              <View style={styles.platformRow}>
                {(Object.keys(PLATFORMS) as PlatformType[]).map((platformKey) => {
                  const config = PLATFORMS[platformKey];
                  return (
                    <Pressable
                      key={platformKey}
                      onPress={() => setPlatform(platformKey)}
                      style={[
                        styles.platformOption,
                        platform === platformKey && styles.platformOptionSelected
                      ]}
                    >
                      <FontAwesome5 
                        name={config.icon as any} 
                        size={18} 
                        color={platform === platformKey ? '#007AFF' : '#666'} 
                      />
                      <Text style={[
                        styles.platformName,
                        platform === platformKey && styles.platformNameSelected
                      ]}>
                        {config.name}
                      </Text>
                      <Text style={styles.platformDesc}>{config.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Remove the entire "Choose Background" section */}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable style={styles.actionBtn} onPress={saveCard}>
                <FontAwesome5 name="download" size={18} color="white" />
                <Text style={styles.actionText}>Save to Gallery</Text>
              </Pressable>
              
              <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={shareCard}>
                <FontAwesome5 name="share" size={18} color="white" />
                <Text style={styles.actionText}>Share Now</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Update styles - remove background picker related styles
const newStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
  },
  previewSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  cardBackground: {
    flex: 1,
    justifyContent: 'space-between',
  },
  backgroundImage: {
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 16,
  },
  optionsSection: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  optionsContent: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  optionGroup: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
  },
  platformOption: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  platformOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#1a1a2e',
  },
  platformName: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  platformNameSelected: {
    color: 'white',
  },
  platformDesc: {
    color: '#666',
    fontSize: 9,
    marginTop: 1,
    textAlign: 'center',
  },
  twitterLayout: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
    padding: 20,
  },
  twitterLeft: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  twitterRight: {
    flex: 0.7,
    justifyContent: 'center',
  },
  verticalLayout: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  topSection: {
    alignItems: 'flex-start',
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
  textContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  playIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playSymbol: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
  om: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
  },
  chapterText: {
    color: 'white',
    fontWeight: '600',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  sanskritText: {
    color: 'white',
    lineHeight: 1.6,
    textAlign: 'center',
    fontFamily: 'SourceSerifPro',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  translationText: {
    color: 'white',
    lineHeight: 1.5,
    textAlign: 'center',
    fontFamily: 'Alegreya',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginTop: 8,
  },
  cardFooter: {
    alignItems: 'center',
    gap: 3,
  },
  appName: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtn: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

const styles = newStyles;
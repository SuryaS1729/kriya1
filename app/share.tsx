import { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  Dimensions,
  Alert,
  Platform
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

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 40;
const cardHeight = cardWidth * 1.25;

export default function SharePage() {
  const params = useGlobalSearchParams();
  const [shloka, setShloka] = useState<ShlokaRow | null>(null);
  const [gradientIndex, setGradientIndex] = useState(0);
  const cardRef = useRef<ViewShot>(null);

  const gradients = [
    ['#667eea', '#764ba2'] as const,
    ['#f093fb', '#f5576c'] as const,
    ['#4facfe', '#00f2fe'] as const,
    ['#43e97b', '#38f9d7'] as const,
    ['#fa709a', '#fee140'] as const,
    ['#a8edea', '#fed6e3'] as const,
    ['#ff9a9e', '#fecfef'] as const,
    ['#ffecd2', '#fcb69f'] as const,
  ] as const;

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
          dialogTitle: 'Share this beautiful shloka',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device');
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
      
      const uri = await cardRef.current.capture();
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('Kriya', asset, false);
      
      Alert.alert('Success!', 'Beautiful shloka card saved to your gallery ✨');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save card to gallery');
    }
  };

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

      {/* Card Preview */}
      <View style={styles.cardContainer}>
        <ViewShot 
          ref={cardRef} 
          options={{ 
            format: "png", 
            quality: 0.9,
            result: 'tmpfile'
          }}
          style={styles.card}
        >
          <LinearGradient
            colors={gradients[gradientIndex]}
            style={styles.cardGradient}
          >
            {/* Decorative elements */}
            <View style={styles.decorativeTop}>
              <Text style={styles.om}>ॐ</Text>
            </View>

            {/* Chapter and verse */}
            <Text style={styles.chapterText}>
              Adhyaya {shloka.chapter_number} • Shloka {shloka.verse_number}
            </Text>

            {/* Sanskrit text */}
            <Text style={styles.sanskritText}>{shloka.text}</Text>

            {/* Translation */}
            <Text style={styles.translationText}>
              "{shloka.translation_2 || shloka.description}"
            </Text>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>Bhagavad Gita</Text>
              <Text style={styles.appName}>Kriya</Text>
            </View>
          </LinearGradient>
        </ViewShot>
      </View>

      {/* Color Picker */}
      <View style={styles.colorPicker}>
        <Text style={styles.colorPickerTitle}>Choose Background</Text>
        <View style={styles.colorRow}>
          {gradients.map((gradient, index) => (
            <Pressable
              key={index}
              onPress={() => setGradientIndex(index)}
              style={[
                styles.colorOption,
                gradientIndex === index && styles.colorOptionSelected
              ]}
            >
              <LinearGradient
                colors={gradient}
                style={styles.colorGradient}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={saveCard}>
          <FontAwesome5 name="download" size={18} color="white" />
          <Text style={styles.actionText}>Save</Text>
        </Pressable>
        
        <Pressable style={[styles.actionBtn, styles.shareBtn]} onPress={shareCard}>
          <FontAwesome5 name="share" size={18} color="white" />
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  cardContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  card: {
    width: cardWidth,
    height: cardHeight,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardGradient: {
    flex: 1,
    padding: 30,
    justifyContent: 'space-between',
  },
  decorativeTop: {
    alignItems: 'center',
  },
  om: {
    fontSize: 40,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
  },
  chapterText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 1,
  },
  sanskritText: {
    color: 'white',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: 'SourceSerifPro',
    fontWeight: '400',
    marginVertical: 20,
  },
  translationText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Alegreya',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  cardFooter: {
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  appName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  colorPicker: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  colorPickerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: 'white',
  },
  colorGradient: {
    flex: 1,
    borderRadius: 18,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
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
    fontSize: 16,
    fontWeight: '600',
  },
});
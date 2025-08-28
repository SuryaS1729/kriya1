import { useMemo } from 'react';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
} from 'react-native';
import { useKriya, type Bookmark } from '../lib/store';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';

export default function Bookmarks() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useKriya(s => s.isDarkMode);
  const bookmarks = useKriya(s => s.getBookmarks());
  const removeBookmark = useKriya(s => s.removeBookmark);

  // Sort bookmarks by creation date (newest first)
  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookmarks]);

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <Pressable
      style={[styles.bookmarkCard, { 
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
      }]}
      onPress={() => router.push(`/shloka/${item.shlokaIndex}`)}
    >
      <View style={styles.bookmarkHeader}>
        <Text style={[styles.bookmarkMeta, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
          Adhyaya {item.chapter}, Shloka {item.verse}
        </Text>
        <Pressable
          onPress={() => removeBookmark(item.shlokaIndex)}
          hitSlop={8}
          style={styles.removeButton}
        >
          <MaterialIcons 
            name="bookmark-remove" 
            size={20} 
            color={isDarkMode ? '#ef4444' : '#dc2626'} 
          />
        </Pressable>
      </View>
      
      <Text 
        style={[styles.bookmarkText, { color: isDarkMode ? '#e5e7eb' : '#374151' }]}
        numberOfLines={2}
      >
        {item.text}
      </Text>
      
      <Text 
        style={[styles.bookmarkTranslation, { color: isDarkMode ? '#d1d5db' : '#6b7280' }]}
        numberOfLines={3}
      >
        {item.translation}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['right', 'bottom', 'left']}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <LinearGradient 
        colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffff', '#9FABC8']} 
        style={StyleSheet.absoluteFill} 
      />

      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <AntDesign 
              name="arrowleft" 
              size={24} 
              color={isDarkMode ? '#d1d5db' : '#374151'} 
            />
          </Pressable>
          <Text style={[styles.title, { color: isDarkMode ? '#f9fafb' : '#111827' }]}>
            Bookmarks
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        {sortedBookmarks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name="bookmark-border" 
              size={64} 
              color={isDarkMode ? '#4b5563' : '#9ca3af'} 
            />
            <Text style={[styles.emptyTitle, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
              No Bookmarks Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#6b7280' : '#9ca3af' }]}>
              Bookmark verses you want to revisit by tapping the bookmark icon
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedBookmarks}
            renderItem={renderBookmark}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'SourceSerifPro',
  },
  list: {
    paddingBottom: 20,
  },
  bookmarkCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookmarkMeta: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'SourceSerifPro',
  },
  removeButton: {
    padding: 4,
  },
  bookmarkText: {
    fontSize: 16,
    fontFamily: 'Kalam',
    lineHeight: 22,
    marginBottom: 8,
  },
  bookmarkTranslation: {
    fontSize: 14,
    fontFamily: 'Alegreya',
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'SourceSerifPro',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Alegreya',
  },
});
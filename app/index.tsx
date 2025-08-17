// app/index.tsx
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Layout,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { StatusBar } from 'expo-status-bar';

export default function Home() {
  const ready     = useKriya(s => s.ready);
  const tasks     = useKriya(s => s.tasksToday);
  const getShloka = useKriya(s => s.currentShloka); // returns { index, data }
  const toggle    = useKriya(s => s.toggleTask);
  const remove    = useKriya(s => s.removeTask);
  const insets    = useSafeAreaInsets();

  // Only compute shloka after store is ready
  const { index: shlokaIndex, data: shloka } = ready ? getShloka() : { index: 0, data: null as any };

  // State for toggling between Sanskrit and English
  const [showTranslation, setShowTranslation] = useState(false);

  // Fade animation for shloka card
  const fade = useSharedValue(0);
  useEffect(() => {
    if (!ready || !shloka) return;
    fade.value = 0;
    fade.value = withSpring(1);
  }, [ready, shloka, fade, showTranslation]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  const handleTogglePress = () => {
    setShowTranslation(!showTranslation);
  };

  const renderItem = ({ item }: { item: Task }) => (
    <Pressable
      onPress={() => toggle(item.id)}
      onLongPress={() => remove(item.id)}
      style={styles.row}
    >
      <View style={[styles.checkbox, item.completed ? styles.checkboxOn : styles.checkboxOff]} />
      <Text style={[styles.title, item.completed ? styles.done : undefined]} numberOfLines={1}>
        {item.title}
      </Text>
    </Pressable>
  );

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Minimal skeleton while DB/store warm up
  if (!ready || !shloka) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <View style={[styles.card, { height: 240, opacity: 0.5, backgroundColor: '#111827' }]} />
        <View style={styles.tasksContainer}>
          <Text style={styles.h1}>Today</Text>
          <View style={[styles.row, { opacity: 0.5 }]}>
            <View style={[styles.checkbox, styles.checkboxOff]} />
            <View style={{ flex: 1, height: 18, backgroundColor: '#eee', borderRadius: 4 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.topHalf, { paddingTop: insets.top }]}>
        {/* Shloka Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.meta}>
              Adhyaya {shloka.chapter_number}, Shloka {shloka.verse_number}
            </Text>
            <Pressable onPress={() => setShowTranslation(!showTranslation)}>
              <Animated.View style={styles.toggleButton} layout={Layout.springify()}>
                <Text style={styles.toggleText}>
                  {showTranslation ? 'View Sanskrit' : 'View Translation'}
                </Text>
              </Animated.View>
            </Pressable>
          </View>

          <Link
            href={{ pathname: '/shloka/[id]', params: { id: String(shlokaIndex) } }}
            asChild
          >
            <Pressable style={{ flex: 1, justifyContent: 'center', }}>
              <Animated.View style={[fadeStyle, { flex: 1, justifyContent: 'center' }]}>
                {showTranslation ? (
                  <Text style={styles.en}>
                    {shloka.translation_2 || shloka.description || 'No translation available'}
                  </Text>
                ) : (
                  <Text style={styles.sa}>{shloka.text}</Text>
                )}
              </Animated.View>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Tasks Section */}
      <View style={[styles.tasksContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.tasksHeader}>
          <Text style={styles.h1}>Today's Tasks</Text>
          <Link href="/add" asChild>
            <Pressable style={styles.addButton}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </Link>
        </View>
        
        <FlatList
          data={tasks}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.tasksList}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black',
  },
  topHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical:0
  },
  card: {
    height: 240,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#111827',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 16,
  },
  meta: { 
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#374151',
    overflow: 'hidden', // Important for reanimated layout animations
  },
  toggleText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  sa: { 
    flex: 1,
    fontSize: 20,
    lineHeight: 30,
    color: '#f9fafb',
    textAlign: 'center',
    fontFamily: 'Sanskrit-Text', // Make sure to load this font in your app
  },
  en: { 
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#d1d5db',
    textAlign: 'center',
  },
  tasksContainer: {
    flex: 1.6,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  h1: { 
    fontSize: 20, 
    fontWeight: '700',
    color: '#0f172a',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
    lineHeight: 20,
    marginTop: -2,
  },
  tasksList: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: { 
    flex: 1, 
    fontSize: 16, 
    color: '#0f172a',
    marginLeft: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
  },
  checkboxOn: { 
    backgroundColor: '#3b82f6', 
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOff: { 
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  done: { 
    color: '#94a3b8', 
    textDecorationLine: 'line-through' 
  },
});

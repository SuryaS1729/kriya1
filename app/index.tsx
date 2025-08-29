// app/index.tsx
import { Link } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Layout,
  LinearTransition,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { AnimatedFlashList, FlashList } from '@shopify/flash-list';

import { router } from 'expo-router';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

// Update the Checkbox component for better timing

const Checkbox = React.memo(({ completed, isDarkMode }: { completed: boolean, isDarkMode: boolean }) => {
  const progress = useSharedValue(completed ? 1 : 0);

  React.useEffect(() => {
    // Slightly slower spring so you can see the check animation
    progress.value = withSpring(completed ? 1 : 0, {
      stiffness: 300, // Reduced from 400
      damping: 25,    // Reduced from 30
      mass: 0.8,
    });
  }, [completed]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        isDarkMode 
          ? ['#1f2937', '#65a25cff']
          : ['white', '#AADBA3']
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        isDarkMode 
          ? ['#4b5563', '#65a25cff']
          : ['#e2e8f0', '#AADBA3']
      ),
    };
  }, [isDarkMode]);

  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0, 1]), // Slower fade in
      transform: [{ 
        scale: interpolate(progress.value, [0, 0.6, 0.8, 1], [0, 0, 1.2, 1]) // More bounce
      }],
    };
  }, []);

  return (
    <Animated.View style={[styles.checkbox, animatedStyle]}>
      {completed && (
        <AnimatedFeather
          name="check"
          size={14}
          color={isDarkMode ? "#020639ff" : "#ffffff"}
          style={checkmarkStyle}
        />
      )}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.completed === nextProps.completed && prevProps.isDarkMode === nextProps.isDarkMode;
});

export default function Home() {
  const ready     = useKriya(s => s.ready);
  const tasks     = useKriya(s => s.tasksToday);
  const getShloka = useKriya(s => s.currentShloka);
  const toggle    = useKriya(s => s.toggleTask);
  const remove    = useKriya(s => s.removeTask);
  const isDarkMode = useKriya(s => s.isDarkMode);
  const hasCompletedOnboarding = useKriya(s => s.hasCompletedOnboarding);
  const insets    = useSafeAreaInsets();
  const navigationRef = useRef(false); // Prevent multiple navigations

  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

    console.log('🔍 Debug - ready:', ready, 'hasCompletedOnboarding:', hasCompletedOnboarding, 'hasCheckedOnboarding:', hasCheckedOnboarding);


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

  // Optimized sorting - avoid double reverse
  const sortedTasks = useMemo(() => {
    const incomplete: Task[] = [];
    const completed: Task[] = [];
    
    // Single pass through tasks
    for (const task of tasks) {
      if (task.completed) {
        completed.push(task);
      } else {
        incomplete.push(task);
      }
    }
    
    return [...incomplete, ...completed];
  }, [tasks]);

  // Memoized callbacks to prevent unnecessary re-renders
  const onToggle = React.useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(id);
  }, [toggle]);

  const onRemove = React.useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    remove(id);
  }, [remove]);

  // Replace your TaskRow component with this version that delays the layout animation

  const TaskRow = React.memo(({ 
    item, 
    isDarkMode, 
    onToggle, 
    onRemove 
  }: { 
    item: Task; 
    isDarkMode: boolean; 
    onToggle: (id: number) => void; 
    onRemove: (id: number) => void 
  }) => {
    const handleToggle = React.useCallback(() => onToggle(item.id), [onToggle, item.id]);
    const handleRemove = React.useCallback(() => onRemove(item.id), [onRemove, item.id]);
    
    return (
      <View style={[styles.row, { borderBottomColor: isDarkMode ? '#1a2535ff' : '#d8dde1ff' }]}>
        <Pressable 
          onPress={handleToggle} 
          onLongPress={handleRemove} 
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        >
          <Checkbox completed={item.completed} isDarkMode={isDarkMode} />
          <Text
            style={[
              styles.title,
              {
                color: item.completed ? '#94a3b8' : (isDarkMode ? '#f9fafb' : '#000000ff'),
                textDecorationLine: item.completed ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </Pressable>
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: isDarkMode ? '#6b7280' : '#94a3b8' }]}>✕</Text>
        </Pressable>
      </View>
    );
  }, (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.completed === nextProps.item.completed &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.isDarkMode === nextProps.isDarkMode
    );
  });

  const keyExtractor = React.useCallback((item: Task) => item.id.toString(), []);

  // Update the renderItem to add a delay to the layout animation
  const renderItem = React.useCallback(
    ({ item }: { item: Task }) => (
      // Delayed layout animation - starts after checkbox animation
      <Animated.View layout={LinearTransition.duration(150).delay(200)}>
        <TaskRow 
          item={item} 
          isDarkMode={isDarkMode} 
          onToggle={onToggle} 
          onRemove={onRemove} 
        />
      </Animated.View>
    ),
    [isDarkMode, onToggle, onRemove]
  );

  // Handle onboarding redirect - only once when ready
  useEffect(() => {
    if (ready && !navigationRef.current) {
      navigationRef.current = true;
      console.log('🔍 Checking onboarding status:', hasCompletedOnboarding);
      
      if (!hasCompletedOnboarding) {
        console.log('🔍 Redirecting to onboarding...');
        router.replace('/onboarding');
      } else {
        console.log('🔍 Onboarding already completed, staying on main app');
      }
    }
  }, [ready, hasCompletedOnboarding]);

  // Show loading while not ready
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Don't render main content if going to onboarding
  if (!hasCompletedOnboarding) {
    return null;
  }

  // Minimal skeleton while DB/store warm up
  if (!ready || !shloka) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style={isDarkMode ? "light" : "auto"} />
        <View style={[styles.card, { height: 240, opacity: 0.5, backgroundColor: isDarkMode ? '#374151' : '#111827' }]} />
        <View style={[styles.tasksContainer, { backgroundColor: isDarkMode ? '#1f2937' : 'white' }]}>
          <Text style={[styles.h1, { color: isDarkMode ? '#d1d5db' : '#848fa9ff' }]}>Today</Text>
          <View style={[styles.row, { opacity: 0.5 }]}>
            <View style={[styles.checkbox, styles.checkboxOff]} />
            <View style={{ flex: 1, height: 18, backgroundColor: isDarkMode ? '#4b5563' : '#eee', borderRadius: 4 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffff', '#9FABC8']}
      style={[styles.container]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={[styles.topHalf, { paddingTop: insets.top }]}>
        {/* Shloka Card */}
        <View style={styles.card}>
          <View style={styles.headerSection}>
            <Text style={[styles.meta, { color: isDarkMode ? '#d1d5db' : '#545454' }]}>
              Adhyaya {shloka.chapter_number}, Shloka {shloka.verse_number}
            </Text>
          </View>

          <Link
            href={{ pathname: '/shloka/[id]', params: { id: String(shlokaIndex) } }}
            asChild
          >
            <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View style={[fadeStyle, styles.contentSection]}>
                {showTranslation ? (
                  <View style={styles.englishSection}>
                    <Text 
                      style={[
                        styles.en, 
                        {lineHeight:(shloka.translation_2 || "").length < 350 ? 24 : 18},
                        { color: isDarkMode ? '#d1d5db' : '#434343ff' }
                      ]} 
                      adjustsFontSizeToFit
                    >
                      {shloka.translation_2 || shloka.description || 'No translation available'}
                    </Text>
                  </View>
                ) : (
                  <View>
                    <Text 
                      style={[
                        styles.sa, 
                        {lineHeight:(shloka.translation_2 || "").length < 90 ? 24 : 20},
                        { color: isDarkMode ? '#e5e7eb' : '#565657ff' }
                      ]}
                      adjustsFontSizeToFit
                    >
                      {shloka.text}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </Pressable>
          </Link>
          
          <Pressable onPress={handleTogglePress}>
            <Animated.View style={[
              styles.toggleButton,
              { backgroundColor: isDarkMode ? '#4b556365' : '#ffffffff' }
            ]}>
              <Text style={[
                styles.toggleText,
                { color: isDarkMode ? '#f9fafb' : '#000000ff' }
              ]}>
                {showTranslation ? 'View Sanskrit' : 'View Translation'}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* Tasks Section */}
      <View style={[
        styles.tasksContainer,
        { backgroundColor: isDarkMode ? '#03233181' : '#ffffffe0', paddingBottom: insets.bottom }
      ]}>
        <View style={styles.tasksHeader}>
          <Text style={[styles.h1, { color: isDarkMode ? '#d1d5db' : '#848fa9ff' }]}>Today's Tasks</Text>
          <Link href="/history" asChild>
            <Pressable >
              <View style={[styles.profileButton, { backgroundColor: isDarkMode ? '#1d2736ff' : '#f8fafc', borderColor: isDarkMode ? '#2a2f36ff' : '#e2e8f0' }]}>
              <Feather name='user' size={20} color={isDarkMode ? "#9db5daff" : "#7493d7ff"} />
              </View>
            </Pressable>
          </Link>
        </View>
        
        <FlashList
          data={sortedTasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}

          removeClippedSubviews={true}
          contentContainerStyle={styles.tasksList}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Feather name="sunrise" size={48} color={isDarkMode ? "#6b7280" : "#cbd5e1"} />
              <Text style={[styles.emptyStateTitle, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                Fresh Start
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: isDarkMode ? '#6b7280' : '#94a3b8' }]}>
                No tasks yet. Add your first task to begin your day.
              </Text>
            </View>
          )}
        />
        
        <Link href="/add" asChild>
          <Pressable>
            <View style={[styles.addTaskButton, {backgroundColor: isDarkMode ? '#1b293d91' : '#f9fafb'}]}>
            <View style={[styles.addTaskIcon, { backgroundColor: isDarkMode ? '#081623ff' : '#E6E6E6' }]}>
              <Feather name="plus" size={20} color={isDarkMode ? "#ffffffff" : "#606060"} />
            </View>
            <Text style={[styles.addTaskText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
              Add a task . . .
            </Text>
            </View>
          </Pressable>
        </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  topHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical:0
  },
  card: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 300,
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  headerSection: {
    width: '100%',
    marginBottom: 0,
    marginTop:6,
    alignItems:'center',
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    marginTop: 20,
    paddingBottom: 20,
  },
  meta: { 
    fontFamily:"SourceSerifPro",
    fontSize: 23,
    fontStyle: 'italic',
    color: '#545454',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#fffffffe',
    overflow: 'hidden',
    marginTop: 0, 

  },
  toggleText: {
    color: '#000000ff',
    fontSize: 12,
    fontWeight: '600',
  },
  englishSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: 0,
    paddingTop: 5,
  },
   profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sa: { 
    // flex: 1,
    // fontSize: 18,
    // lineHeight: 24,
    // color: '#565657ff',
    // textAlign: 'center',
    // fontFamily:"Samanya",
    // fontWeight:"100",
    // fontStyle:"normal",
    // paddingTop: 20,

     flex: 1,
    fontSize: 20,
    lineHeight: 24,
    color: '#565657ff',
    textAlign: 'center',
    fontFamily:"Kalam",
    fontWeight:"300",
    fontStyle:"normal",
    paddingTop: 20,
  },
  en: { 
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: '#434343ff',
    textAlign: 'center',
    fontFamily:"Alegreya",
    fontWeight:"400",
    fontStyle:"normal"
  },
  tasksContainer: {
    flex: 1.37,
    backgroundColor: 'white',
    borderTopLeftRadius: 41,
    borderTopRightRadius: 43,
    paddingTop: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft:3
  },
  h1: { 
    fontSize: 17, 
    fontWeight: '700',
    color: '#848fa9ff',
  },
  tasksList: {
    flexGrow: 1,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 0.3,
    borderBottomColor: '#f1f5f9',
  },
  title: { 
    flex: 1, 
    fontSize: 18, 
    color: '#000000ff',
    marginLeft: 12,
    fontFamily:"SourceSerifPro",
    fontWeight:"300",
    fontStyle:"normal"
  },
  deleteButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: { 
    backgroundColor: '#AADBA3', 
    borderColor: '#AADBA3',
  },
  checkboxOff: { 
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  done: { 
    color: '#94a3b8', 
    textDecorationLine: 'line-through' 
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 11,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#efefef37',
    marginLeft:-5.8
  },
  addTaskText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#64748b',
    fontFamily:"SpaceMono",
    fontWeight:"400",
    fontStyle:"normal"
  },
  addTaskIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#E6E6E6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "SourceSerifPro",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: "Alegreya",
  },
});

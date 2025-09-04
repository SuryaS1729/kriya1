// app/index.tsx
import { Link } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  LinearTransition,
  interpolateColor,
  interpolate,
  FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Spinner } from '@/components/ui/spinner';
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
          : ['white', '#98d590ff']
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
          color={isDarkMode ? "#17481bff" : "#ffffff"}
          style={checkmarkStyle}
          
        />
      )}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.completed === nextProps.completed && prevProps.isDarkMode === nextProps.isDarkMode;
});

// Add this new component before the Home component
const YesterdayTasksBanner = React.memo(({ 
  tasks, 
  isDarkMode, 
  onImportTasks 
}: { 
  tasks: Task[]; 
  isDarkMode: boolean; 
  onImportTasks: (tasks: Task[]) => void;
}) => {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const displayTasks = showAll ? tasks : tasks.slice(0, 3);

  const toggleTask = (taskId: number) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleImport = () => {
    const tasksToImport = tasks.filter(task => selectedTasks.has(task.id));
    if (tasksToImport.length > 0) {
      onImportTasks(tasksToImport);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={[
      styles.yesterdayBanner, 
      { backgroundColor: isDarkMode ? '#1f293789' : '#f8fafc', borderColor: isDarkMode ? '#526d7071' : '#e2e8f0' }
    ]}>
      <View style={styles.bannerHeader}>
        <Text style={[styles.bannerTitle, { color: isDarkMode ? '#f9fafb' : '#1f2937' }]}>
          📋 {tasks.length} unfinished task{tasks.length > 1 ? 's' : ''} from yesterday
        </Text>
        <Text style={[styles.bannerSubtitle, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
          Select which ones to bring forward:
        </Text>
      </View>

      <View style={styles.taskSelection}>
        {displayTasks.map((task) => (
          <Pressable
            key={task.id}
            onPress={() => toggleTask(task.id)}
            style={[
              styles.selectableTask,
              { 
                backgroundColor: selectedTasks.has(task.id) 
                  ? (isDarkMode ? '#0c4f3c36' : '#dcfce7') 
                  : 'transparent'
              }
            ]}
          >
            <View style={[
              styles.selectionCheckbox,
              {
                backgroundColor: selectedTasks.has(task.id)
                  ? (isDarkMode ? '#10b981' : '#22c55e')
                  : 'transparent',
                borderColor: isDarkMode ? '#4b5563' : '#d1d5db'
              }
            ]}>
              {selectedTasks.has(task.id) && (
                <Feather name="check" size={12} color="white" />
              )}
            </View>
            <Text 
              style={[
                styles.selectableTaskText, 
                { color: isDarkMode ? '#e5e7eb' : '#374151' }
              ]} 
              numberOfLines={1}
            >
              {task.title}
            </Text>
          </Pressable>
        ))}

        {tasks.length > 3 && (
          <Pressable onPress={() => setShowAll(!showAll)} style={styles.showMoreButton}>
            <Text style={[styles.showMoreText, { color: isDarkMode ? '#60a5fa' : '#3b82f6' }]}>
              {showAll ? 'Show less' : `Show ${tasks.length - 3} more...`}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.bannerActions}>
        <Pressable
          onPress={handleImport}
          disabled={selectedTasks.size === 0}
          style={[
            styles.importButton,
            {
              backgroundColor: selectedTasks.size > 0 
                ? (isDarkMode ? '#059669' : '#10b981') 
                : (isDarkMode ? '#374151' : '#e5e7eb'),
              opacity: selectedTasks.size > 0 ? 1 : 0.5
            }
          ]}
        >
          <Text style={[
            styles.importButtonText,
            { color: selectedTasks.size > 0 ? 'white' : (isDarkMode ? '#6b7280' : '#9ca3af') }
          ]}>
            Import {selectedTasks.size > 0 ? `${selectedTasks.size} ` : ''}Task{selectedTasks.size !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

export default function Home() {
  const ready     = useKriya(s => s.ready);
  const tasks     = useKriya(s => s.tasksToday);
  const getShloka = useKriya(s => s.currentShloka);
  const toggle    = useKriya(s => s.toggleTask);
  const remove    = useKriya(s => s.removeTask);
  const addTask   = useKriya(s => s.addTask); // Add this
  const getTasksForDay = useKriya(s => s.getTasksForDay); // Add this
  const isDarkMode = useKriya(s => s.isDarkMode);
  const hasCompletedOnboarding = useKriya(s => s.hasCompletedOnboarding);
  const refresh   = useKriya(s => s.refresh);
  const insets    = useSafeAreaInsets();
  const navigationRef = useRef(false);

  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Fade animation for shloka card
  const fade = useSharedValue(0);

  // Clear cache and refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (ready) {
        console.log('🧹 Home screen focused - refreshing state');
        refresh(); // This will reload tasks from SQLite
        
        // Reset animation values to prevent accumulation
        fade.value = 0;
        fade.value = withSpring(1);
      }
    }, [ready, refresh, fade])
  );

  // Only compute shloka after store is ready
  const { index: shlokaIndex, data: shloka } = ready ? getShloka() : { index: 0, data: null as any };

  // State for toggling between Sanskrit and English
  const [showTranslation, setShowTranslation] = useState(false);
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
    
    // Sort by creation time (newest first for better UX)
    incomplete.sort((a, b) => a.created_at - b.created_at);
    completed.sort((a, b) => a.created_at - b.created_at);
    
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


const onFocus = React.useCallback((task: Task) => {
  router.push({
    pathname: '/focus',
    params: { 
       id: String(task.id), 
      title: task.title,   
     },
  });
}, []);


  // Enhanced TaskRow with cleanup
  const TaskRow = React.memo(({ 
    item, 
    isDarkMode, 
    onToggle, 
    onFocus 
  }: { 
    item: Task; 
    isDarkMode: boolean; 
    onToggle: (id: number) => void; 
  onFocus: (task: Task) => void; 
  }) => {
    const handleToggle = React.useCallback(() => onToggle(item.id), [onToggle, item.id]);
    const handleRemove = React.useCallback(() => onRemove(item.id), [onRemove, item.id]);
    const handleFocus = React.useCallback(() => onFocus(item), [onFocus, item]); // Handle long press

    
    return (
       <View style={[styles.row, { borderBottomColor: isDarkMode ? '#1a2535ff' : '#d8dde1ff' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {/* Separate Pressable for checkbox with hitSlop */}
          <Pressable 
            onPress={handleToggle}
            hitSlop={12}
            style={{ padding: 4 }} // Optional: add some padding for better touch area
          >
            <Checkbox completed={item.completed} isDarkMode={isDarkMode} />
          </Pressable>
          
          {/* Pressable for the text area */}
          <Pressable 
            onPress={handleToggle} 
            onLongPress={handleFocus}
            style={{ flex: 1, paddingVertical: 5, paddingLeft: 8 }}
          >
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
        </View>
        
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: isDarkMode ? '#6b7280' : '#94a3b8' }]}>✕</Text>
        </Pressable>
      </View>
    )
    }, (prevProps, nextProps) => {
    // More strict comparison to prevent unnecessary re-renders
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.completed === nextProps.item.completed &&
      prevProps.item.title === nextProps.item.title &&
      prevProps.isDarkMode === nextProps.isDarkMode
    );
  });



  // Enhanced renderItem with cleanup
  const renderItem = React.useCallback(
    ({ item }: { item: Task }) => (
      <Animated.View  
        entering={FadeIn.duration(200).delay(100)}
        layout={LinearTransition.springify().duration(200).delay(200)}
        key={`task-${item.id}`} // Explicit key for better reconciliation
      >
        <TaskRow 
          item={item} 
          isDarkMode={isDarkMode} 
          onToggle={onToggle} 
          onFocus={onFocus} 
        />
      </Animated.View>
    ),
    [isDarkMode, onToggle, onRemove]
  );

    const keyExtractor = React.useCallback((item: Task) => `task-${item.id}`, []);

  // Clear animation states when component unmounts
  React.useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      fade.value = 0;
    };
  }, [fade]);

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

  // Add function to get yesterday's unfinished tasks
  const getYesterdayUnfinishedTasks = React.useCallback(() => {
    if (!ready) return [];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    
    const yesterdayTasks = getTasksForDay(yesterdayKey);
    return yesterdayTasks.filter(task => !task.completed);
  }, [ready, getTasksForDay]);

  const yesterdayUnfinishedTasks = getYesterdayUnfinishedTasks();

  // Handle importing tasks from yesterday
  const handleImportTasks = React.useCallback((tasksToImport: Task[]) => {
    tasksToImport.forEach(task => {
      addTask(task.title); // This will create a new task for today
    });
  }, [addTask]);

  // Show loading while not ready
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center', backgroundColor: isDarkMode ? '#000' : '#fff' }}>
        <View></View>
        <Spinner size="large" color="white" />
        <Text style={{ fontSize: 20, fontFamily:"Instrument", fontStyle:"italic", color: isDarkMode ? '#fff' : '#000' }}>loading...</Text>
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
      colors={isDarkMode ? ['#344c67ff', '#000000ff'] : ['#ffffffd2', '#8ba5e1ff']}
      style={[styles.container]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
            {/* <StatusBar hidden={true} /> */}
      
      
      <View style={[styles.topHalf, { paddingTop: insets.top }]}>
        {/* Shloka Card */}
        <View style={styles.card}>
          <View style={styles.headerSection}>
            <Text style={[styles.meta, { color: isDarkMode ? '#eef1f4ff' : '#545454' }]}>
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
                        { color: isDarkMode ? '#eaecf1ff' : '#565657ff' }
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
        { backgroundColor: isDarkMode ? '#03233181' : '#ffffffdd', paddingBottom: insets.bottom }
      ]}>
        <View style={styles.tasksHeader}>
          <Text style={[styles.h1, { color: isDarkMode ? '#d1d5db' : '#5a6173ff' }]}>Today's Tasks</Text>
          <Link href="/history" asChild>
            <Pressable >
              <View style={[styles.profileButton, { backgroundColor: isDarkMode ? '#1d2736ff' : '#f8fafc', borderColor: isDarkMode ? '#2a2f36ff' : '#e2e8f0' }]}>
              <Feather name='user' size={20} color={isDarkMode ? "#9db5daff" : "#7493d7ff"} />
              </View>
            </Pressable>
          </Link>
        </View>
        
        <FlatList
          data={sortedTasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.tasksList}
          ListEmptyComponent={() => (
            <View>
              <Pressable onPress={() => router.push('/add')}>
                <View style={styles.emptyState}>
                  <Feather name="sun" size={48} color={isDarkMode ? "#6b7280" : "#cbd5e1"} />
                  <Text style={[
                    styles.emptyStateTitle,
                    { color: isDarkMode ? '#9ca3af' : '#64748b' }
                  ]}>It's a Fresh Start</Text>
                  <View style={{ height: 16 }}></View>
                  <Text style={[
                    styles.emptyStateSubtitle,
                    { color: isDarkMode ? '#6b7280' : '#94a3b8' }
                  ]}>
                   add your tasks for today!
                  </Text>
                </View>
              </Pressable>
              
              {/* Show yesterday's tasks banner if available */}
              {yesterdayUnfinishedTasks.length > 0 && (
                <YesterdayTasksBanner
                  tasks={yesterdayUnfinishedTasks}
                  isDarkMode={isDarkMode}
                  onImportTasks={handleImportTasks}
                />
              )}
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
    marginTop: 26,
    marginBottom: 8,
    fontFamily: "Kalam",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: "SourceSerifPro",
    fontWeight:"300",

  },

  // Add these new styles for the banner
  yesterdayBanner: {
    marginTop: 0,
    marginHorizontal: 4,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerHeader: {
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  taskSelection: {
    marginBottom: 16,
  },
  selectableTask: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  selectionCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectableTaskText: {
    flex: 1,
    fontSize: 14,
  },
  showMoreButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  importButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
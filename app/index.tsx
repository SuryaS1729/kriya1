// app/index.tsx
import { Link } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable, ScrollView, TouchableOpacity } from 'react-native';
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
import { taskCompleteHaptic, selectionHaptic, buttonPressHaptic, errorHaptic } from '../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Spinner } from '@/components/ui/spinner';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

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
    selectionHaptic(); 
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
      taskCompleteHaptic(); 
      onImportTasks(tasksToImport);
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
    const initializeNotifications = useKriya(s => s.initializeNotifications);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  
 // ADD refs to track listeners
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // Fade animation for shloka card
  const fade = useSharedValue(0);

   // Add scale animation for toggle button
  const toggleScale = useSharedValue(1);

  // Clear cache and refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (ready) {

        refresh(); // This will reload tasks from SQLite
                // console.log('🧹 Home screen focused - refreshing state');

        // // Clear the navigation stack
        if (router.canGoBack()) {
          router.dismissAll();
        }
        
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
    selectionHaptic();
  toggleScale.value = withSpring(0.90, {
    stiffness: 800,
    damping: 12,
    mass: 0.2,
  });
  
  setTimeout(() => {
    toggleScale.value = withSpring(1, {
      stiffness: 700,
      damping: 18,
      mass: 0.3,
    });
  }, 50);
  
  setShowTranslation(!showTranslation);
};

  // Add animated style for toggle button
  const toggleButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: toggleScale.value }],
  }));

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
   // Update the onToggle callback
  const onToggle = React.useCallback((id: number) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      taskCompleteHaptic(); // Success haptic for completing tasks
    } else {
      selectionHaptic(); // Light haptic for uncompleting
    }
    toggle(id);
  }, [toggle, tasks]);

  // Update the onRemove callback
  const onRemove = React.useCallback((id: number) => {
    errorHaptic(); // Error haptic for deletion
    remove(id);
  }, [remove]);

  // Update the onFocus callback
  const onFocus = React.useCallback((task: Task) => {
    buttonPressHaptic(); // Light haptic for navigation
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
        
         {/* UPDATED: Simple conditional rendering */}
      {!item.completed && (
        
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: isDarkMode ? '#6b7280' : '#94a3b8' }]}>✕</Text>
        </Pressable>
      )}
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
      // console.log('🔍 Checking onboarding status:', hasCompletedOnboarding);
      
      if (!hasCompletedOnboarding) {
        // console.log('🔍 Redirecting to onboarding...');
        router.replace('/onboarding');
      } else {
        // console.log('🔍 Onboarding already completed, staying on main app');
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

  // ADD: Initialize notifications when app loads
  useEffect(() => {
    if (ready && hasCompletedOnboarding && notificationsEnabled) {
      initializeNotifications();
    }
  }, [ready, hasCompletedOnboarding, notificationsEnabled, initializeNotifications]);

  // ADD: Handle notifications
  useEffect(() => {
    // Listener for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // console.log('📱 Notification received:', notification);
    });

    // Listener for when user taps notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log('📱 Notification response:', response);
      const data = response.notification.request.content.data;
      
      if (data?.type === 'task_reminder') {
        // Navigate to add task screen
        router.push('/add');
      }
    });

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Show loading while not ready
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'space-evenly', alignItems: 'center', backgroundColor: isDarkMode ? '#000' : '#fff' }}>
        <View></View>
        <Spinner size="large" color={isDarkMode ? '#fff' : '#000'} />
        <Text style={{ fontSize: 20, fontFamily:"Instrument Serif", fontStyle:"italic", color: isDarkMode ? '#fff' : '#000' }}>loading...</Text>
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
      colors={isDarkMode ? ['#2e455fff', '#000000ff'] : ['#ffffffd2', '#8ba0d3ff']}
      style={[styles.container]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
            {/* <StatusBar hidden={true} /> */}
      
      
   <View style={[styles.topHalf, { paddingTop: insets.top }]}>
  {/* Shloka Card */}
  <View style={styles.card}>
    <View style={styles.headerSection}>
       <Pressable 
      onPress={() => {
        buttonPressHaptic(); 
        router.push({
          pathname: '/shloka/[id]',
          params: { id: String(shlokaIndex) }
        });
      }}
    >
      <Text style={[styles.meta, { color: isDarkMode ? '#eef1f4ff' : '#545454' }]}>
        Adhyaya {shloka.chapter_number}, Shloka {shloka.verse_number}
      </Text>
    </Pressable>
    </View>

    {/* <Link
      href={{ pathname: '/shloka/[id]', params: { id: String(shlokaIndex) } }}
      asChild
    > */}
      <View style={styles.shlokaContentContainer}
      >
        <Animated.View style={[fadeStyle, styles.contentSection]}>
          {showTranslation ? (
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContentEnglish}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              <Text 
                style={[
                  styles.en, 
                  { color: isDarkMode ? '#d1d5db' : '#434343ff' }
                ]}
              >
                {shloka.translation_2 || shloka.description || 'No translation available'}
              </Text>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContentSanskrit}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              <Text 
                style={[styles.sa, { color: isDarkMode ? '#eaecf1ff' : '#565657ff' }]}
              >
                {shloka.text}
              </Text>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    {/* </Link> */}
  </View>
  
  {/* Fixed Toggle Button - moved outside the card */}
<View style={styles.toggleButtonRow}>
  {/* Invisible spacer to push toggle button to center */}
  <View style={styles.leftSpacer} />

  <TouchableOpacity onPress={handleTogglePress} activeOpacity={0.7}>
    <Animated.View style={[
      styles.toggleButton,
      { backgroundColor: isDarkMode ? '#4b556365' : '#ffffffff' },
      toggleButtonStyle
    ]}>
      <Text style={[
        styles.toggleText,
        { color: isDarkMode ? '#f9fafb' : '#000000ff' }
      ]}>
        {showTranslation ? 'View in Sanskrit' : 'View in English'}
      </Text>
    </Animated.View>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => {
     buttonPressHaptic();
    router.push({
      pathname: '/shloka/[id]',
      params: { id: String(shlokaIndex) }
    });
  }}
  activeOpacity={0.7}>
    <Animated.View style={[
      styles.descButton,
      { backgroundColor: isDarkMode ? '#4b556365' : '#ffffffff' },
    ]}>
      <Feather name="book-open" size={16} color={isDarkMode ? "#f9fafb" : "#000000ff"} />
    </Animated.View>
  </TouchableOpacity>
</View>
</View>

      {/* Tasks Section */}
      <View style={[
        styles.tasksContainer,
        { backgroundColor: isDarkMode ? '#03233181' : '#ffffffff', paddingBottom: insets.bottom }
      ]}>
        <View style={styles.tasksHeader}>
          <Text style={[styles.h1, { color: isDarkMode ? '#d1d5db' : '#5a6173ff' }]}>Today's Tasks</Text>
          <Link href="/history" asChild>
            <TouchableOpacity activeOpacity={0.8} onPress={() => buttonPressHaptic()}>
              <View style={[styles.profileButton, { backgroundColor: isDarkMode ? '#1d2736ff' : '#f8fafc', borderColor: isDarkMode ? '#2a2f36ff' : '#e2e8f0' }]}>
              <Feather name='user' size={20} color={isDarkMode ? "#9db5daff" : "#7493d7ff"} />
              </View>
            </TouchableOpacity>
          </Link>
        </View>
        
        <FlatList
          data={sortedTasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.tasksList}
          ListEmptyComponent={() => (
            <View>

              {/* Show yesterday's tasks banner if available */}
              {yesterdayUnfinishedTasks.length > 0 && (
                <YesterdayTasksBanner
                  tasks={yesterdayUnfinishedTasks}
                  isDarkMode={isDarkMode}
                  onImportTasks={handleImportTasks}
                />
              )}
              <Pressable onPress={() => {
                buttonPressHaptic(); // Add haptic for empty state press
                router.push('/add');
              }}>
                <View style={styles.emptyState}>
                  <Feather name="sun" size={48} color={isDarkMode ? "#8a93a4ff" : "#cbd5e1"} />
                  <Text style={[
                    styles.emptyStateTitle,
                    { color: isDarkMode ? '#9ca3af' : '#64748b' }
                  ]}>It's a Fresh Start</Text>
                  <View style={{ height: 10 }}></View>
                <Text style={[styles.emptyStateSubtitle, { color: isDarkMode ? '#959eb1ff' : '#94a3b8' }]}>
  1. Add your tasks for today 📝
</Text>
<Text style={[styles.emptyStateSubSubtitle, { color: isDarkMode ? '#959eb1ff' : '#94a3b8' }]}>
  2. Complete tasks to unlock new shlokas ✅
</Text>
<Text style={[styles.emptyStateSubSubtitle, { color: isDarkMode ? '#959eb1ff' : '#94a3b8' }]}>
  3. The Gita becomes part of your routine ☸️
</Text>
                </View>
              </Pressable>
              
            </View>
          )}
        />
        
        <Link href="/add" asChild>
          <TouchableOpacity onPress={() => buttonPressHaptic()} activeOpacity={0.7}>{/* Changed from direct Haptics call */}
            <View style={[styles.addTaskButton, {backgroundColor: isDarkMode ? '#1b293d91' : '#f9fafb'}]}>
            <View style={[styles.addTaskIcon, { backgroundColor: isDarkMode ? '#081623ff' : '#E6E6E6' }]}>
              <Feather name="plus" size={20} color={isDarkMode ? "#ffffffff" : "#606060"} />
            </View>
            <Text style={[styles.addTaskText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
              Add a task . . .
            </Text>
            </View>
          </TouchableOpacity>
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
    justifyContent: 'flex-start', // Changed from 'space-between'
    flex: 1, // Take remaining space
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 5,
    marginBottom: 8, // Small gap before toggle button
  },
  
  // New container for the toggle button
  toggleButtonContainer: {
    alignItems: 'center',
    paddingBottom: 16, // Fixed distance from tasks container
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



  },
  meta: { 
    fontFamily:"Alegreya",
    fontSize: 23,
    fontStyle: 'normal',
    color: '#545454',

  },
 toggleButtonRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingBottom: 16,
  paddingHorizontal: 20,
  position: 'relative', // Enable absolute positioning for children if needed
},

leftSpacer: {
  width: 32, // Same width as descButton (8px padding + 16px icon + 8px padding)
  // This invisible spacer balances the book button on the right
},

toggleButton: {
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderRadius: 16,
  backgroundColor: '#fffffffe',
  overflow: 'hidden',
},

descButton: {
  paddingVertical: 8,
  paddingHorizontal: 8,
  borderRadius: 16,
  backgroundColor: '#fffffffe',
  overflow: 'hidden',
  marginLeft: 8, // Space between the two buttons
},
  
  shlokaContentContainer: {
    flex: 1, // Take all remaining space in the card
    width: '100%',
    paddingHorizontal: 8,
  },

  scrollContainer: {
    flex: 1,
  },
  
 scrollContentEnglish: {
  paddingVertical: 20,
  paddingHorizontal: 10,
  minHeight: '100%', // This ensures the content takes full height
  justifyContent: 'center', // Centers the text vertically
  alignItems: 'center', // Centers the text horizontally
},

scrollContentSanskrit: {
  paddingVertical: 20,
  paddingHorizontal: 16,
  minHeight: '100%', // This ensures the content takes full height
  justifyContent: 'center', // Centers the text vertically
  alignItems: 'center', // Centers the text horizontally
},
  toggleText: {
    color: '#000000ff',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 23,
    color: '#565657ff',
    textAlign: 'center',
    fontFamily: "Kalam",
    fontWeight: "300",
    fontStyle: "normal",
    paddingTop: 10,
    lineHeight: 26, // Fixed line height for better readability
  },
  
  en: { 
    fontSize: 20,
    color: '#434343ff',
    textAlign: 'center',
    fontFamily: "Source Serif Pro",
    fontWeight: "400",
    fontStyle: "italic",
    lineHeight: 28, // Fixed line height for better readability
  },
  
  tasksContainer: {
    flex: 1.47,
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

  },
  h1: { 
    fontSize: 17, 
    fontWeight: '500',
    color: '#848fa9ff',
marginLeft:10
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
    fontSize: 19, 
    color: '#000000ff',
    marginLeft: 12,
    fontFamily:"Source Serif Pro",
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
    fontFamily:"Space Mono",
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
    paddingHorizontal: 10,

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
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: "Source Serif Pro",
    fontWeight:"300",

  },
  emptyStateSubSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: "Source Serif Pro",
    fontWeight:"300",
    marginTop:16

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
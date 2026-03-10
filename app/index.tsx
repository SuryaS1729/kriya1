// app/index.tsx
import { Link, router } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
import { setTaskCompleted, removeTask as removeTaskDb, type Task } from '../lib/tasks';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { taskCompleteHaptic, selectionHaptic, buttonPressHaptic, errorHaptic } from '../lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Spinner } from '@/components/ui/spinner';
import * as Notifications from 'expo-notifications';
import { GuidedTour } from '../components/GuidedTour/GuidedTour';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

// Update the Checkbox component for better timing

const Checkbox = ({ completed, isDarkMode }: { completed: boolean, isDarkMode: boolean }) => {
  const progress = useSharedValue(completed ? 1 : 0);

  React.useEffect(() => {
    // Slightly slower spring so you can see the check animation
    progress.value = withSpring(completed ? 1 : 0, {
      stiffness: 300, // Reduced from 400
      damping: 25,    // Reduced from 30
      mass: 0.8,
    });
  }, [completed, progress]);

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
};

const TaskRow = React.memo(({
  item,
  isDarkMode,
  onToggle,
  onRemove,
  onFocus,
}: {
  item: Task;
  isDarkMode: boolean;
  onToggle: (id: number, completed: boolean) => void;
  onRemove: (id: number) => void;
  onFocus: (task: Task) => void;
}) => {
  const handleToggle = () => onToggle(item.id, item.completed);
  const handleRemove = () => onRemove(item.id);
  const handleFocus = () => onFocus(item);

  return (
    <View style={[styles.row, { borderBottomColor: isDarkMode ? '#1a2535ff' : '#d8dde1ff' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Pressable
          onPress={handleToggle}
          hitSlop={12}
          style={{ padding: 4 }}
        >
          <Checkbox completed={item.completed} isDarkMode={isDarkMode} />
        </Pressable>

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

      {!item.completed && (
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.deleteButton}>
          <Text style={[styles.deleteIcon, { color: isDarkMode ? '#6b7280' : '#94a3b8' }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
});

export default function Home() {
  const ready     = useKriya(s => s.ready);
  const tasks     = useKriya(s => s.tasksToday);
  const getShloka = useKriya(s => s.currentShloka);
  const toggle    = useKriya(s => s.toggleTask);
  const remove    = useKriya(s => s.removeTask);
  const getTasksForDay = useKriya(s => s.getTasksForDay); 
  const isDarkMode = useKriya(s => s.isDarkMode);
  const hasCompletedOnboarding = useKriya(s => s.hasCompletedOnboarding);
  const refresh   = useKriya(s => s.refresh);
  const insets    = useSafeAreaInsets();
  const navigationRef = useRef(false);
    const initializeNotifications = useKriya(s => s.initializeNotifications);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  const hasSeenGuidedTour = useKriya(s => s.hasSeenGuidedTour);
  const setHasSeenGuidedTour = useKriya(s => s.setHasSeenGuidedTour);

 // ADD refs to track listeners
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [yesterdayTasksState, setYesterdayTasksState] = useState<Task[]>([]);

  // Fade animation for shloka card
  const fade = useSharedValue(0);

   // Add scale animation for toggle button
  const toggleScale = useSharedValue(1);

  const loadYesterdayTasks = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    setYesterdayTasksState(getTasksForDay(yesterdayKey));
  }, [getTasksForDay]);

  // Clear cache and refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (ready) {

        refresh();
        loadYesterdayTasks();
                // console.log('🧹 Home screen focused - refreshing state');


        if (router.canGoBack()) {
          router.dismissAll();
        }
        

        fade.value = 0;
        fade.value = withSpring(1);
      }
    }, [ready, refresh, fade, loadYesterdayTasks])
  );

  // Only compute shloka after store is ready
  const { index: shlokaIndex, data: shloka } = ready ? getShloka() : { index: 0, data: null as any };
  const openShlokaDetail = () => {
    if (!Number.isFinite(shlokaIndex) || shlokaIndex < 0) return;
    router.push({
      pathname: '/shloka/[id]',
      params: { id: String(shlokaIndex) }
    });
  };

  // State for toggling between Sanskrit and English
  const [showTranslation, setShowTranslation] = useState(false);
  useEffect(() => {
    if (!ready || !shloka) return;
    fade.value = 0;
    fade.value = withSpring(1);
  }, [ready, shlokaIndex, fade, showTranslation]);

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

  // Incomplete tasks first, completed tasks after, preserving entry order in each bucket.
  const sortedTasks = useMemo(() => {
    const incomplete = tasks
      .filter((task) => !task.completed)
      .sort((a, b) => a.created_at - b.created_at);
    const completed = tasks
      .filter((task) => task.completed)
      .sort((a, b) => a.created_at - b.created_at);
    return [...incomplete, ...completed];
  }, [tasks]);

  const onToggle = useCallback((id: number, completed: boolean) => {
    if (!completed) {
      taskCompleteHaptic(); // Success haptic for completing tasks
    } else {
      selectionHaptic(); // Light haptic for uncompleting
    }
    toggle(id);
  }, [toggle]);

  const onRemove = useCallback((id: number) => {
    errorHaptic(); // Error haptic for deletion
    remove(id);
  }, [remove]);

  const onFocus = useCallback((task: Task) => {
    buttonPressHaptic(); // Light haptic for navigation
    router.push({
      pathname: '/focus',
      params: { 
        id: String(task.id), 
        title: task.title,   
      },
    });
  }, []);
  const handleTourComplete = () => {
    setHasSeenGuidedTour(true);
  };

    const shouldShowGuidedTour = ready && hasCompletedOnboarding && !hasSeenGuidedTour;

console.log('🔍 Guided Tour Debug:', {
    ready,
    hasCompletedOnboarding,
    hasSeenGuidedTour,
    tasksLength: tasks.length,
    shouldShowGuidedTour
  });

  const renderItem = useCallback(({ item }: { item: Task }) => (
    <Animated.View  
      entering={FadeIn.duration(90)}
      layout={LinearTransition.duration(100)}
    >
      <TaskRow 
        item={item} 
        isDarkMode={isDarkMode} 
        onToggle={onToggle} 
        onRemove={onRemove}
        onFocus={onFocus} 
      />
    </Animated.View>
  ), [isDarkMode, onToggle, onRemove, onFocus]);

  const keyExtractor = useCallback((item: Task) => `task-${item.id}`, []);

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

  useEffect(() => {
    if (ready) {
      loadYesterdayTasks();
    }
  }, [ready, loadYesterdayTasks]);

  const sortedYesterdayTasks = useMemo(() => {
    const incomplete = yesterdayTasksState
      .filter((task) => !task.completed)
      .sort((a, b) => a.created_at - b.created_at);
    const completed = yesterdayTasksState
      .filter((task) => task.completed)
      .sort((a, b) => a.created_at - b.created_at);
    return [...incomplete, ...completed];
  }, [yesterdayTasksState]);

  const onToggleYesterdayTask = useCallback((id: number, completed: boolean) => {
    const next = !completed;
    if (next) {
      taskCompleteHaptic();
    } else {
      selectionHaptic();
    }
    setTaskCompleted(id, next, null);
    setYesterdayTasksState((state) =>
      state.map((task) =>
        task.id === id
          ? { ...task, completed: next, completed_at: next ? Date.now() : null }
          : task
      )
    );
  }, []);

  const onRemoveYesterday = useCallback((id: number) => {
    errorHaptic();
    removeTaskDb(id);
    setYesterdayTasksState((state) => state.filter((task) => task.id !== id));
  }, []);

  const renderYesterdayItem = useCallback(({ item }: { item: Task }) => (
    <Animated.View
      entering={FadeIn.duration(90)}
      layout={LinearTransition.duration(100)}
    >
      <TaskRow
        item={item}
        isDarkMode={isDarkMode}
        onToggle={onToggleYesterdayTask}
        onRemove={onRemoveYesterday}
        onFocus={onFocus}
      />
    </Animated.View>
  ), [isDarkMode, onToggleYesterdayTask, onRemoveYesterday, onFocus]);

  const yesterdayKeyExtractor = useCallback((item: Task) => `yesterday-task-${item.id}`, []);

  const yesterdayFooter = useMemo(() => {
    if (sortedYesterdayTasks.length === 0) return null;

    return (
      <View style={styles.yesterdaySection}>
        <View style={styles.yesterdayDividerRow}>
          <View style={[styles.yesterdayDivider, { backgroundColor: isDarkMode ? '#334155' : '#d1d5db' }]} />
          <Text style={[styles.yesterdayDividerText, { color: isDarkMode ? '#9ca3af' : '#6b7280' }]}>
            Yesterday's Tasks
          </Text>
          <View style={[styles.yesterdayDivider, { backgroundColor: isDarkMode ? '#334155' : '#d1d5db' }]} />
        </View>
        <FlatList
          data={sortedYesterdayTasks}
          renderItem={renderYesterdayItem}
          keyExtractor={yesterdayKeyExtractor}
          scrollEnabled={false}
        />
      </View>
    );
  }, [sortedYesterdayTasks, isDarkMode, renderYesterdayItem, yesterdayKeyExtractor]);

  // ADD: Initialize notifications when app loads
  useEffect(() => {
    if (ready && hasCompletedOnboarding && notificationsEnabled) {
      initializeNotifications();
    }
  }, [ready, hasCompletedOnboarding, notificationsEnabled, initializeNotifications]);


  useEffect(() => {

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // console.log('📱 Notification received:', notification);
    });


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

  const mainContent = (
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
        openShlokaDetail();
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
    openShlokaDetail();
  }}
  activeOpacity={0.7}>
    <View style={[
      styles.descButton,
      { backgroundColor: isDarkMode ? '#4b556365' : '#ffffffff' },
    ]}>
      <Feather name="book-open" size={16} color={isDarkMode ? "#f9fafb" : "#000000ff"} />
    </View>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => {
    buttonPressHaptic();
    router.push('/listen');
  }}
  activeOpacity={0.7}>
    <View style={[
      styles.descButton,
      { backgroundColor: isDarkMode ? '#4b556365' : '#ffffffff' },
    ]}>
      <Feather name="headphones" size={16} color={isDarkMode ? "#f9fafb" : "#000000ff"} />
    </View>
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
          <View style={styles.headerButtons}>
            <Link href="/testwidget" asChild>
              <TouchableOpacity activeOpacity={0.8} onPress={() => buttonPressHaptic()}>
                <View style={[styles.profileButton, { backgroundColor: isDarkMode ? '#1d2736ff' : '#f8fafc', borderColor: isDarkMode ? '#2a2f36ff' : '#e2e8f0' }]}>
                  <Feather name='anchor' size={20} color={isDarkMode ? "#9db5daff" : "#7493d7ff"} />
                </View>
              </TouchableOpacity>
            </Link>
            <Link href="/goals" asChild>
              <TouchableOpacity activeOpacity={0.8} onPress={() => buttonPressHaptic()}>
                <View style={[styles.profileButton, { backgroundColor: isDarkMode ? '#1d2736ff' : '#f8fafc', borderColor: isDarkMode ? '#2a2f36ff' : '#e2e8f0' }]}>
                  <Feather name='file-text' size={20} color={isDarkMode ? "#9db5daff" : "#7493d7ff"} />
                </View>
              </TouchableOpacity>
            </Link>
            <Link href="/history" asChild>
              <TouchableOpacity activeOpacity={0.8} onPress={() => buttonPressHaptic()}>
                <View style={[styles.profileButton, { backgroundColor: isDarkMode ? '#1d2736ff' : '#f8fafc', borderColor: isDarkMode ? '#2a2f36ff' : '#e2e8f0' }]}>
                  <Feather name='user' size={20} color={isDarkMode ? "#9db5daff" : "#7493d7ff"} />
                </View>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
        
        <FlatList
          data={sortedTasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.tasksList}
          ListFooterComponent={yesterdayFooter}
          ListEmptyComponent={() => (
            <View>
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
          <TouchableOpacity onPress={() => buttonPressHaptic()} activeOpacity={0.7}>
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

 if (shouldShowGuidedTour) {
    return (
      <GuidedTour 
      onComplete={handleTourComplete}       
      hasUserTasks={tasks.length > 0}
>
        {mainContent}
      </GuidedTour>
    );
  }


  return mainContent
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
    justifyContent: 'flex-start', 
    flex: 1,
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 5,
    marginBottom: 8, 
  },
  

  toggleButtonContainer: {
    alignItems: 'center',
    paddingBottom: 16,
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
  position: 'relative', 
},

leftSpacer: {
  width: 32, 

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
  marginLeft: 8,
},
  
  shlokaContentContainer: {
    flex: 1, 
    width: '100%',
    paddingHorizontal: 8,
  },

  scrollContainer: {
    flex: 1,
  },
  
 scrollContentEnglish: {
  paddingVertical: 20,
  paddingHorizontal: 10,
  minHeight: '100%', 
  justifyContent: 'center',
  alignItems: 'center', 
},

scrollContentSanskrit: {
  paddingVertical: 20,
  paddingHorizontal: 16,
  minHeight: '100%',
  justifyContent: 'center',
  alignItems: 'center',
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
    lineHeight: 26, 
  },
  
  en: { 
    fontSize: 20,
    color: '#434343ff',
    textAlign: 'center',
    fontFamily: "Source Serif Pro",
    fontWeight: "400",
    fontStyle: "italic",
    lineHeight: 28, 
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
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

  yesterdaySection: {
    marginTop: 8,
  },
  yesterdayDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  yesterdayDivider: {
    flex: 1,
    height: 1,
  },
  yesterdayDividerText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginHorizontal: 10,
  },
});

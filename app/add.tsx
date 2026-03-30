import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  TouchableOpacity
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../components/TopBar';
import { useKriya } from '../lib/store';
import {
  getTasksForDay,
  removeTask as removeTaskDb,
  setTaskCompleted,
  type Task,
} from '../lib/tasks';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  LinearTransition,
  FadeInDown
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { mediumImpactHaptic, selectionHaptic, errorHaptic } from '../lib/haptics';
import { PressableScale } from 'pressto';



// Create animated Feather component
const AnimatedFeather = Animated.createAnimatedComponent(Feather);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function normalizeDayKey(input?: string | string[]) {
  const raw = Array.isArray(input) ? input[0] : input;
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  const date = new Date(parsed);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatDateLabel(dayKey: number) {
  const selectedDate = new Date(dayKey);
  const today = new Date();
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  if (dayKey === todayKey) {
    return 'Today';
  }

  return selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function toStartOfDayKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getRemainingCount(tasks: Task[]) {
  return tasks.filter((task) => !task.completed).length;
}

function splitInputIntoTasks(input: string) {
  return input
    .split('.')
    .map((task) => task.trim())
    .filter(Boolean);
}

export default function Add() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ dayKey?: string | string[] }>();
  const [text, setText] = useState('');
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [isTomorrow, setIsTomorrow] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customDayKey, setCustomDayKey] = useState<number | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reanimated shared value for rotation
  const rotationValue = useSharedValue(0);

  const tasksToday = useKriya(s => s.tasksToday);
  const addTaskForDay = useKriya(s => s.addTaskForDay);
  const refresh = useKriya(s => s.refresh);
  const isDarkMode = useKriya(s => s.isDarkMode);
  const todayKey = useKriya(s => s.todayKey);
  const paramDayKey = normalizeDayKey(params.dayKey) ?? todayKey();
  const isTodayScreen = paramDayKey === todayKey();

  // Compute tomorrow's key
  const tomorrowKey = (() => {
    const d = new Date(todayKey());
    d.setDate(d.getDate() + 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  })();

  // Active day key: if user toggled "Tomorrow" or "Custom", use that selection; otherwise use paramDayKey
  const activeDayKey = (isTodayScreen && isTomorrow)
    ? tomorrowKey
    : (isTodayScreen && isCustom && customDayKey != null)
      ? customDayKey
      : paramDayKey;
  const isActiveToday = activeDayKey === todayKey();
  const visibleTasks = isActiveToday ? tasksToday : dayTasks;
  const dateLabel = formatDateLabel(activeDayKey);
  const summaryLabel = `${visibleTasks.length} total, ${getRemainingCount(visibleTasks)} remaining`;
  const customLabel = customDayKey != null ? formatDateLabel(customDayKey) : 'Pick a date';

  // Calculate dynamic placeholder text
  const placeholderText = visibleTasks.length > 6
    ? "Easy there, overachiever 😅"
    : isTomorrow
      ? "Plan ahead for tomorrow 🌅"
      : isCustom
        ? "Plan ahead for a custom day 📅"
      : "Fulfill your dharma today 🏹";

  const refreshSelectedDayTasks = useCallback(() => {
    if (isActiveToday) {
      refresh();
      return;
    }

    setDayTasks(getTasksForDay(activeDayKey));
  }, [isActiveToday, refresh, activeDayKey]);

  useEffect(() => {
    refreshSelectedDayTasks();
  }, [refreshSelectedDayTasks]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // SDK54 timing can mount this screen before it is truly focused.
  // Focus after navigation interactions complete.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const interaction = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          focusInput();
          setTimeout(() => {
            if (!cancelled) focusInput();
          }, 120);
        });
      });

      return () => {
        cancelled = true;
        interaction.cancel();
      };
    }, [focusInput])
  );

  useFocusEffect(
    useCallback(() => {
      refreshSelectedDayTasks();
    }, [refreshSelectedDayTasks])
  );

  // Animate rotation when text changes
  useEffect(() => {
    rotationValue.value = withSpring(text.length > 0 ? 1 : 0, {
      damping: 9,
      stiffness: 300,
      mass: 0.3
    });
  }, [text, rotationValue]);

  // Animated style for rotation
  const animatedIconStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      rotationValue.value,
      [0, 1],
      [0, -90] // Rotate from 0° to -90° (right arrow becomes up arrow)
    );
    
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const addAndStay=()=> {
    mediumImpactHaptic(); // More reliable haptic

    const tasks = splitInputIntoTasks(text);
    if (tasks.length === 0) return;

    tasks.forEach((task) => addTaskForDay(task, activeDayKey));
    if (!isActiveToday) {
      setDayTasks(getTasksForDay(activeDayKey));
    }
    setText('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }
  function addAndStayOrGoHome() {
  const tasks = splitInputIntoTasks(text);
  if (tasks.length === 0) {
    // If empty, go back to homescreen
    doneAndClose();
    return;
  }
  // If not empty, add task and stay
  tasks.forEach((task) => addTaskForDay(task, activeDayKey));
  if (!isActiveToday) {
    setDayTasks(getTasksForDay(activeDayKey));
  }
  setText('');
  setTimeout(() => {
    inputRef.current?.focus();
  }, 0);
}
  
  function doneAndClose() {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }

  const openCustomPicker = () => {
    selectionHaptic();
    Keyboard.dismiss();
    setIsTomorrow(false);
    setIsCustom(true);
    setCustomDayKey((current) => current ?? tomorrowKey);
    setShowCustomPicker(true);
  };

  const closeCustomPicker = () => {
    setShowCustomPicker(false);
  };

  const onCustomDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowCustomPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    setCustomDayKey(toStartOfDayKey(selectedDate));
    setIsCustom(true);
  };


  const orderedTasks = [
    ...visibleTasks.filter((task) => !task.completed).sort((a, b) => a.created_at - b.created_at),
    ...visibleTasks.filter((task) => task.completed).sort((a, b) => a.created_at - b.created_at),
  ];

  const renderItem = ({ item, index }: { item: Task; index: number }) => (
    <AnimatedPressable
      entering={FadeInDown.duration(100).delay(Math.min(index, 3) * 6)}
      layout={LinearTransition.duration(100)}
      onPress={() => {
        selectionHaptic(); // Add haptic feedback
        const next = !item.completed;
        setTaskCompleted(item.id, next, null);
        refreshSelectedDayTasks();
      }}
      onLongPress={() => {
        errorHaptic(); // Different haptic for delete
        removeTaskDb(item.id);
        refreshSelectedDayTasks();
      }}
      style={[styles.row, { borderBottomColor: isDarkMode ? '#374151' : '#f1f5f9' }]}
      android_ripple={{ color: '#eeeeee1c' }}
    >
      <View style={[
        styles.checkbox, 
        item.completed 
          ? [
              styles.checkboxOn,
              // Different green shades for dark/light mode
              { backgroundColor: isDarkMode ? '#65a25cff' : '#AADBA3' }
            ]
          : [
              styles.checkboxOff,
              isDarkMode && { backgroundColor: '#4b5563', borderColor: '#6b7280' }
            ]
      ]}>
        {item.completed && (
          <Feather
            name="check"
            size={14}
          color={isDarkMode ? "#17481bff" : "#ffffff"}
          />
        )}
      </View>
      <Text style={[
        styles.title, 
        { color: item.completed 
          ? (isDarkMode ? '#94a3b8' : '#94a3b8')  // Same gray for completed tasks
          : (isDarkMode ? '#f9fafb' : '#111827')   // Different colors for active tasks
        },
        item.completed && { textDecorationLine: 'line-through' }
      ]} numberOfLines={2}>
        {item.title}
      </Text>
    </AnimatedPressable>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Add gradient background */}
      <LinearGradient 
        colors={isDarkMode ? ['#031d31e7', '#000000ff'] : ['#ffffffff', '#f0f2f8ff']} 
        style={StyleSheet.absoluteFill} 
      />
      
      
      <KeyboardAvoidingView
        behavior="padding"
  keyboardVerticalOffset={0} // Remove all offset
  style={{ flex: 1 }}
>
        <TopBar
          title="Quick Add"
          variant="close"
          isDarkMode={isDarkMode}
        />

        {/* Main content column: list grows, input bar sits at the bottom */}
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.dateHeading, { color: isDarkMode ? '#e5e7eb' : '#0f172a' }]}>
              {dateLabel}
            </Text>
            <Text style={[styles.subhead, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
              {summaryLabel}
            </Text>
          </View>

          <FlatList
          
            data={orderedTasks}
            keyExtractor={t => String(t.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: isDarkMode ? '#1a2535ff' : '#f1f5f9' }]} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                {/* <Feather name="sunrise" size={48} color={isDarkMode ? "#6b7280" : "#cbd5e1"} /> */}
                <Text style={[
                  styles.emptyStateTitle,
                  { color: isDarkMode ? '#9ca3af' : '#64748b' }
                ]}>It's a Fresh Start</Text>
                <View style={{ height: 16 }}></View>
                <Text style={[
                  styles.emptyStateSubtitle,
                  { color: isDarkMode ? '#6b7280' : '#94a3b8' }
                ]}>
                  {isActiveToday ? 'add your tasks for today!' : isTomorrow ? 'add your tasks for tomorrow!' : 'add your tasks for this date!'}
                </Text>
              </View>
            )}
            contentContainerStyle={{  
              flexGrow: 1,
              padding: 12,  
              paddingBottom: 16 + 56 + insets.bottom  
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          />

          {/* DATE PILLS — only shown when navigated for today */}
          {isTodayScreen && (
            <View style={styles.pillWrap}>
              <View style={styles.pillRow}>
                <PressableScale
                  onPress={() => {
                    selectionHaptic();
                    setIsCustom(false);
                    setShowCustomPicker(false);
                    setIsTomorrow(prev => !prev);
                  }}
                  rippleColor="transparent"
                  style={[
                    styles.datePill,
                    isTomorrow
                      ? { backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe', borderColor: isDarkMode ? '#3b82f6' : '#93c5fd' }
                      : { backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9', borderColor: isDarkMode ? '#374151' : '#e2e8f0' },
                  ]}
                >
                  <Feather
                    name="clock"
                    size={13}
                    color={isTomorrow
                      ? (isDarkMode ? '#93c5fd' : '#2563eb')
                      : (isDarkMode ? '#9ca3af' : '#64748b')}
                  />
                  <Text style={[
                    styles.datePillText,
                    { color: isTomorrow
                      ? (isDarkMode ? '#93c5fd' : '#2563eb')
                      : (isDarkMode ? '#9ca3af' : '#64748b') }
                  ]}>
                    Tomorrow
                  </Text>
                </PressableScale>

                <PressableScale
                  onPress={openCustomPicker}
                  rippleColor="transparent"
                  style={[
                    styles.datePill,
                    isCustom
                      ? { backgroundColor: isDarkMode ? '#143b2f' : '#dcfce7', borderColor: isDarkMode ? '#10b981' : '#86efac' }
                      : { backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9', borderColor: isDarkMode ? '#374151' : '#e2e8f0' },
                  ]}
                >
                  <Feather
                    name="calendar"
                    size={13}
                    color={isCustom
                      ? (isDarkMode ? '#6ee7b7' : '#16a34a')
                      : (isDarkMode ? '#9ca3af' : '#64748b')}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.datePillText,
                      { color: isCustom
                        ? (isDarkMode ? '#6ee7b7' : '#16a34a')
                        : (isDarkMode ? '#9ca3af' : '#64748b') }
                    ]}
                  >
                    {isCustom ? customLabel : 'Custom'}
                  </Text>
                </PressableScale>
              </View>

              {/* {isCustom && (
                <Text style={[styles.customDateText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                  Selected: {customLabel}
                </Text>
              )} */}
            </View>
          )}

          {showCustomPicker && Platform.OS !== 'web' && (
            Platform.OS === 'ios' ? (
              <View
                style={[
                  styles.iosDatePickerCard,
                  {
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    borderColor: isDarkMode ? '#1f2937' : '#e2e8f0',
                  },
                ]}
              >
                <View style={styles.iosDatePickerHeader}>
                  <Text
                    style={[
                      styles.iosDatePickerLabel,
                      { color: isDarkMode ? '#cbd5e1' : '#475569' },
                    ]}
                  >
                    Choose a date
                  </Text>
                  <Pressable onPress={closeCustomPicker} hitSlop={8}>
                    <Text
                      style={[
                        styles.iosDatePickerDone,
                        { color: isDarkMode ? '#93c5fd' : '#2563eb' },
                      ]}
                    >
                      Done
                    </Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={customDayKey != null ? new Date(customDayKey) : new Date(tomorrowKey)}
                  mode="date"
                  display="spinner"
                  onChange={onCustomDateChange}
                  minimumDate={new Date(todayKey())}
                  style={styles.iosDatePicker}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                />
              </View>
            ) : (
              <DateTimePicker
                value={customDayKey != null ? new Date(customDayKey) : new Date(tomorrowKey)}
                mode="date"
                display="default"
                onChange={onCustomDateChange}
                minimumDate={new Date(todayKey())}
              />
            )
          )}

          {/* INPUT BAR — stays at the bottom, lifted by KeyboardAvoidingView */}
          <View style={[
            styles.inputBar,
            { 
              backgroundColor: 'transparent', // Make transparent to show gradient
              paddingBottom: 8
            }
          ]}>
            <TouchableOpacity activeOpacity={0.8} onPress={addAndStay}>
              <View style={[
                styles.addTaskIcon,
                { backgroundColor: isDarkMode ? '#0a3a4bff' : '#ebebebff' }
              ]}>
                <AnimatedFeather 
                  name="arrow-right" 
                  size={25} 
                  color={isDarkMode ? '#ffffffff' : '#606060ff'} 
                  style={animatedIconStyle}
                />
              </View>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder={placeholderText}
              style={[styles.input, { color: isDarkMode ? '#f9fafb' : '#111827' }]}
              returnKeyType="done"
              onSubmitEditing={addAndStayOrGoHome}
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              blurOnSubmit={false}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  dateHeading: {
    fontSize: 20,
    fontFamily: 'Source Serif Pro',
    fontWeight: '600',
    marginBottom: 2,
  },
  subhead: { color: '#64748b' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, paddingHorizontal: 16 },
  checkbox: { 
    width: 18, 
    height: 18, 
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: {  backgroundColor: '#AADBA3' },
  checkboxOff: { backgroundColor: '#cbd5e1' },
  title: { 
    flex: 1, 
    fontSize: 18, 
    color: '#111827',
    fontFamily:"Source Serif Pro",
    fontWeight:"300",
    fontStyle:"normal" },
  done: { opacity: 0.6, textDecorationLine: 'line-through',    color: '#94a3b8', 
 },
  sep: { height: 0.5, backgroundColor: '#f1f5f9', marginLeft: 16 },

  // bottom input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent', // Changed from white to transparent
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    gap:8,
    marginBottom:0

  
  },
  input: {
    flex:1,
    fontSize: 16,
    borderWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',

    paddingHorizontal: 12,
    paddingVertical: 15,
    color:"#111827",

  },
  // addBtn: {
  //   alignSelf: 'flex-end',
  //   marginTop: 8,
  //   backgroundColor: '#111827',
  //   paddingHorizontal: 14,
  //   paddingVertical: 10,
  //   borderRadius: 10,
  // },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', fontSize: 16 },
  addTaskIcon: {
    width: 40, // Make it bigger than checkbox (20px)
    height: 40, // Make it bigger than checkbox (20px)
    backgroundColor: '#E6E6E6',
    borderRadius: 20, // Half of width/height for perfect circle
    justifyContent: 'center',
    alignItems: 'center',

  },
   tasksList: {
    flexGrow: 1,
    padding: 10,
    

  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    marginTop: 50,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "Kalam",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: "Source Serif Pro",
    fontWeight:"300",

  },

  pillWrap: {
    gap: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems:'center',
    justifyContent:'flex-end',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 13,
  },
  customDateText: {
    paddingHorizontal: 16,
    textAlign: 'right',
    fontSize: 12,
  },
  iosDatePickerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  iosDatePickerLabel: {
    fontSize: 13,
    fontFamily: 'Space Mono',
  },
  iosDatePickerDone: {
    fontSize: 15,
    fontWeight: '600',
  },
  iosDatePicker: {
    alignSelf: 'center',
    height: 180,
  },
});

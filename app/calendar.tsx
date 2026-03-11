import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  Calendar,
  type CalendarTheme,
  fromDateId,
  toDateId,
} from '@marceloterreiro/flash-calendar';

import { TopBar } from '../components/TopBar';
import { useKriya } from '../lib/store';
import { removeTask, setTaskCompleted, type Task } from '../lib/tasks';
import { buttonPressHaptic, errorHaptic, selectionHaptic, taskCompleteHaptic } from '../lib/haptics';

function dayKeyFromDateId(dateId: string) {
  const d = fromDateId(dateId);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function toReadableDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useKriya((s) => s.isDarkMode);
  const getTasksForDay = useKriya((s) => s.getTasksForDay);
  const addTaskForDay = useKriya((s) => s.addTaskForDay);
  const refresh = useKriya((s) => s.refresh);
  const todayKey = useKriya((s) => s.todayKey);

  const [selectedDateId, setSelectedDateId] = useState(toDateId(new Date()));
  const [calendarMonthId, setCalendarMonthId] = useState(toDateId(new Date()));
  const [taskText, setTaskText] = useState('');
  const [tasksForSelectedDay, setTasksForSelectedDay] = useState<Task[]>([]);

  const selectedDate = useMemo(() => fromDateId(selectedDateId), [selectedDateId]);
  const selectedDayKey = useMemo(() => dayKeyFromDateId(selectedDateId), [selectedDateId]);

  const loadTasksForSelectedDate = useCallback(() => {
    setTasksForSelectedDay(getTasksForDay(selectedDayKey));
  }, [getTasksForDay, selectedDayKey]);

  useFocusEffect(
    useCallback(() => {
      loadTasksForSelectedDate();
    }, [loadTasksForSelectedDate])
  );

  const orderedTasks = useMemo(() => {
    const incomplete = tasksForSelectedDay
      .filter((t) => !t.completed)
      .sort((a, b) => a.created_at - b.created_at);
    const completed = tasksForSelectedDay
      .filter((t) => t.completed)
      .sort((a, b) => a.created_at - b.created_at);
    return [...incomplete, ...completed];
  }, [tasksForSelectedDay]);

  const theme = useMemo<CalendarTheme>(() => {
    const accent = isDarkMode ? '#5f9fe6' : '#7493d7';
    return {
      rowMonth: {
        content: {
          textAlign: 'left',
          color: isDarkMode ? '#d1d5db' : '#334155',
          fontWeight: '700',
        },
      },
      rowWeek: {
        container: {
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
        },
      },
      itemWeekName: {
        content: {
          color: isDarkMode ? '#9ca3af' : '#64748b',
        },
      },
      itemDayContainer: {
        activeDayFiller: {
          backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe',
        },
      },
      itemDay: {
        idle: ({ isPressed, isWeekend }) => ({
          container: {
            backgroundColor: isPressed ? accent : 'transparent',
            borderRadius: 8,
          },
          content: {
            color: isWeekend
              ? isDarkMode
                ? '#94a3b8'
                : '#64748b'
              : isDarkMode
              ? '#f8fafc'
              : '#0f172a',
          },
        }),
        today: ({ isPressed }) => ({
          container: {
            borderColor: accent,
            borderWidth: 1,
            borderRadius: isPressed ? 8 : 20,
            backgroundColor: isPressed ? accent : 'transparent',
          },
          content: {
            color: isPressed ? '#ffffff' : accent,
          },
        }),
        active: ({ isStartOfRange, isEndOfRange }) => ({
          container: {
            backgroundColor: accent,
            borderTopLeftRadius: isStartOfRange ? 8 : 0,
            borderBottomLeftRadius: isStartOfRange ? 8 : 0,
            borderTopRightRadius: isEndOfRange ? 8 : 0,
            borderBottomRightRadius: isEndOfRange ? 8 : 0,
          },
          content: {
            color: '#ffffff',
          },
        }),
      },
    };
  }, [isDarkMode]);

  const shiftMonth = useCallback((delta: number) => {
    const base = fromDateId(calendarMonthId);
    const shifted = new Date(base.getFullYear(), base.getMonth() + delta, 1);
    setCalendarMonthId(toDateId(shifted));
  }, [calendarMonthId]);

  const jumpToToday = useCallback(() => {
    const todayId = toDateId(new Date());
    setSelectedDateId(todayId);
    setCalendarMonthId(todayId);
  }, []);

  const handleAddTask = useCallback(() => {
    const title = taskText.trim();
    if (!title) return;

    taskCompleteHaptic();
    addTaskForDay(title, selectedDayKey);
    if (selectedDayKey === todayKey()) {
      refresh();
    }
    setTaskText('');
    loadTasksForSelectedDate();
  }, [addTaskForDay, loadTasksForSelectedDate, refresh, selectedDayKey, taskText, todayKey]);

  const handleToggleTask = useCallback((task: Task) => {
    const next = !task.completed;
    if (next) {
      taskCompleteHaptic();
    } else {
      selectionHaptic();
    }
    setTaskCompleted(task.id, next, null);
    if (selectedDayKey === todayKey()) {
      refresh();
    }
    loadTasksForSelectedDate();
  }, [loadTasksForSelectedDate, refresh, selectedDayKey, todayKey]);

  const handleDeleteTask = useCallback((id: number) => {
    errorHaptic();
    removeTask(id);
    if (selectedDayKey === todayKey()) {
      refresh();
    }
    loadTasksForSelectedDate();
  }, [loadTasksForSelectedDate, refresh, selectedDayKey, todayKey]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient
        colors={isDarkMode ? ['#031d31e7', '#000000ff'] : ['#ffffffff', '#f0f2f8ff']}
        style={StyleSheet.absoluteFill}
      />

      <TopBar title="Calendar Planner" variant="back" isDarkMode={isDarkMode} />

      <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}> 
        <View style={styles.monthControls}>
          <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.monthControlBtn}>
            <Feather name="chevron-left" size={18} color={isDarkMode ? '#f9fafb' : '#0f172a'} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: isDarkMode ? '#e5e7eb' : '#1e293b' }]}>
            {fromDateId(calendarMonthId).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.monthControlBtn}>
            <Feather name="chevron-right" size={18} color={isDarkMode ? '#f9fafb' : '#0f172a'} />
          </Pressable>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: isDarkMode ? '#0f1e2d99' : '#ffffffcc' }]}> 
          <Calendar
            calendarDayHeight={36}
            calendarFirstDayOfWeek="sunday"
            calendarMonthId={calendarMonthId}
            calendarRowHorizontalSpacing={10}
            calendarRowVerticalSpacing={12}
            calendarActiveDateRanges={[{ startId: selectedDateId, endId: selectedDateId }]}
            onCalendarDayPress={(dateId) => {
              buttonPressHaptic();
              setSelectedDateId(dateId);
              setCalendarMonthId(dateId);
            }}
            theme={theme}
          />
        </View>

        <View style={styles.selectedDateRow}>
          <Text style={[styles.selectedDateText, { color: isDarkMode ? '#d1d5db' : '#334155' }]}>
            {toReadableDate(selectedDate)}
          </Text>
          <TouchableOpacity onPress={jumpToToday} activeOpacity={0.8} style={styles.todayChip}>
            <Text style={[styles.todayChipText, { color: isDarkMode ? '#bfdbfe' : '#1e40af' }]}>Today</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={orderedTasks}
          keyExtractor={(item) => `calendar-task-${item.id}`}
          contentContainerStyle={styles.taskList}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: isDarkMode ? '#7e8a9c' : '#94a3b8' }]}>
              No tasks for this date yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.taskRow, { borderBottomColor: isDarkMode ? '#2c3d51' : '#e2e8f0' }]}> 
              <Pressable onPress={() => handleToggleTask(item)} hitSlop={10} style={styles.checkboxWrap}>
                <View
                  style={[
                    styles.checkbox,
                    item.completed
                      ? { backgroundColor: '#65a25cff', borderColor: '#65a25cff' }
                      : { borderColor: isDarkMode ? '#6b7280' : '#cbd5e1' },
                  ]}
                >
                  {item.completed ? <Feather name="check" size={13} color="#ffffff" /> : null}
                </View>
              </Pressable>

              <Text
                style={[
                  styles.taskTitle,
                  {
                    color: item.completed ? '#94a3b8' : isDarkMode ? '#f9fafb' : '#111827',
                    textDecorationLine: item.completed ? 'line-through' : 'none',
                  },
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <Pressable onPress={() => handleDeleteTask(item.id)} hitSlop={10}>
                <Feather name="x" size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </Pressable>
            </View>
          )}
        />

        <View style={[styles.inputRow, { borderColor: isDarkMode ? '#243447' : '#e2e8f0' }]}> 
          <TextInput
            value={taskText}
            onChangeText={setTaskText}
            placeholder="Add a task for this date"
            placeholderTextColor={isDarkMode ? '#6b7280' : '#94a3b8'}
            style={[styles.input, { color: isDarkMode ? '#f9fafb' : '#111827' }]}
            returnKeyType="done"
            onSubmitEditing={handleAddTask}
          />
          <TouchableOpacity onPress={handleAddTask} activeOpacity={0.8} style={styles.addBtn}>
            <Feather name="plus" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 10,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 6,
  },
  monthControlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarCard: {
    borderRadius: 18,
    padding: 14,
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#dbeafe33',
  },
  todayChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskList: {
    flexGrow: 1,
    paddingTop: 2,
  },
  emptyText: {
    paddingVertical: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  checkboxWrap: {
    padding: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Source Serif Pro',
    fontWeight: '300',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5f9fe6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

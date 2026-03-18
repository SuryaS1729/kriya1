import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  Calendar,
  fromDateId,
  toDateId,
} from '@marceloterreiro/flash-calendar';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { create } from 'zustand';
import { EaseView } from 'react-native-ease';

import { useKriya } from '../lib/store';
import {
  getAllTasks,
  getTasksForDay,
  insertTaskForDay,
  removeTask,
  setTaskCompleted,
  type Task,
} from '../lib/tasks';
import { buttonPressHaptic, errorHaptic, selectionHaptic, taskCompleteHaptic } from '../lib/haptics';

const EMPTY_TASKS: Task[] = [];

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEK_DAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type FastDayMeta = {
  id: string;
  displayLabel: string;
  isDifferentMonth: boolean;
  isStartOfWeek: boolean;
  isWeekend: boolean;
  state: 'idle' | 'today' | 'disabled';
};

function buildMonthGrid(
  monthId: string,
  firstDay: 'sunday' | 'monday' = 'sunday',
): FastDayMeta[][] {
  const month = fromDateId(monthId);
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(year, m, 1);
  const startDow = firstOfMonth.getDay();
  const emptyAtStart = firstDay === 'sunday' ? startDow : (startDow === 0 ? 6 : startDow - 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, m, 0).getDate();
  const startOfWeekIdx = firstDay === 'sunday' ? 0 : 1;

  const todayId = toDateId(new Date());

  const weeks: FastDayMeta[][] = [[]];

  // Previous month trailing days
  for (let i = 0; i < emptyAtStart; i++) {
    const day = daysInPrevMonth - emptyAtStart + 1 + i;
    const d = new Date(year, m - 1, day);
    const dow = d.getDay();
    weeks[0].push({
      id: toDateId(d),
      displayLabel: String(day),
      isDifferentMonth: true,
      isStartOfWeek: dow === startOfWeekIdx,
      isWeekend: dow === 0 || dow === 6,
      state: 'idle',
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const lastWeek = weeks[weeks.length - 1];
    if (lastWeek.length === 7) weeks.push([]);

    const d = new Date(year, m, day);
    const dow = d.getDay();
    const id = toDateId(d);
    weeks[weeks.length - 1].push({
      id,
      displayLabel: String(day),
      isDifferentMonth: false,
      isStartOfWeek: dow === startOfWeekIdx,
      isWeekend: dow === 0 || dow === 6,
      state: id === todayId ? 'today' : 'idle',
    });
  }

  // Next month leading days
  const lastWeek = weeks[weeks.length - 1];
  const remaining = 7 - lastWeek.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, m + 1, i);
    const dow = d.getDay();
    lastWeek.push({
      id: toDateId(d),
      displayLabel: String(i),
      isDifferentMonth: true,
      isStartOfWeek: dow === startOfWeekIdx,
      isWeekend: dow === 0 || dow === 6,
      state: 'idle',
    });
  }

  return weeks;
}

const monthCache = new Map<string, FastDayMeta[][]>();

function getMonthGrid(monthId: string, firstDay: 'sunday' | 'monday' = 'sunday'): FastDayMeta[][] {
  const cached = monthCache.get(monthId);
  if (cached) return cached;
  const grid = buildMonthGrid(monthId, firstDay);
  monthCache.set(monthId, grid);
  return grid;
}

function useFastCalendar({
  calendarMonthId,
  calendarFirstDayOfWeek = 'sunday',
}: {
  calendarMonthId: string;
  calendarFirstDayOfWeek?: 'sunday' | 'monday';
}) {
  return useMemo(() => {
    const weeksList = getMonthGrid(calendarMonthId, calendarFirstDayOfWeek);

    // Pre-compute adjacent months into cache
    const base = fromDateId(calendarMonthId);
    const prevId = toDateId(new Date(base.getFullYear(), base.getMonth() - 1, 1));
    const nextId = toDateId(new Date(base.getFullYear(), base.getMonth() + 1, 1));
    getMonthGrid(prevId, calendarFirstDayOfWeek);
    getMonthGrid(nextId, calendarFirstDayOfWeek);

    const weekDaysList = calendarFirstDayOfWeek === 'sunday' ? WEEK_DAYS : WEEK_DAYS_MON;

    return { weeksList, weekDaysList };
  }, [calendarMonthId, calendarFirstDayOfWeek]);
}

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

function dateIdFromTask(task: Task) {
  const dayMs = typeof task.day_key === 'number'
    ? task.day_key
    : new Date(task.created_at).setHours(0, 0, 0, 0);
  return toDateId(new Date(dayMs));
}

type CalendarTaskStore = {
  tasksByDate: Record<string, Task[]>;
  selectedDate: string;
  loaded: boolean;
  setSelectedDate: (date: string) => void;
  loadTasks: () => void;
  addTask: (title: string, dateId: string) => void;
  toggleTask: (task: Task, dateId: string) => void;
  deleteTask: (id: number, dateId: string) => void;
};

const useCalendarTaskStore = create<CalendarTaskStore>((set, get) => ({
  tasksByDate: {},
  selectedDate: toDateId(new Date()),
  loaded: false,

  setSelectedDate: (date) => set({ selectedDate: date }),

  loadTasks: () => {
    const allTasks = getAllTasks();
    const grouped: Record<string, Task[]> = {};

    allTasks.forEach((task) => {
      const dateId = dateIdFromTask(task);
      if (!grouped[dateId]) grouped[dateId] = [];
      grouped[dateId].push(task);
    });

    set({ tasksByDate: grouped, loaded: true });
  },

  addTask: (title, dateId) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const dayKey = dayKeyFromDateId(dateId);
    const optimistic: Task = {
      id: -Date.now(),
      title: trimmed,
      completed: false,
      created_at: Date.now(),
      completed_at: null,
      shloka_id: null,
      day_key: dayKey,
    };

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [dateId]: [optimistic, ...(state.tasksByDate[dateId] ?? [])],
      },
    }));

    try {
      insertTaskForDay(trimmed, dayKey, null);
      const persisted = getTasksForDay(dayKey);
      set((state) => ({
        tasksByDate: {
          ...state.tasksByDate,
          [dateId]: persisted,
        },
      }));
    } catch {
      get().loadTasks();
    }
  },

  toggleTask: (task, dateId) => {
    const next = !task.completed;

    set((state) => ({
      tasksByDate: {
        ...state.tasksByDate,
        [dateId]: (state.tasksByDate[dateId] ?? []).map((t) =>
          t.id === task.id
            ? { ...t, completed: next, completed_at: next ? Date.now() : null }
            : t
        ),
      },
    }));

    try {
      setTaskCompleted(task.id, next, null);
    } catch {
      get().loadTasks();
    }
  },

  deleteTask: (id, dateId) => {
    set((state) => {
      const current = state.tasksByDate[dateId] ?? [];
      const next = current.filter((t) => t.id !== id);
      const updated = { ...state.tasksByDate };

      if (next.length === 0) {
        delete updated[dateId];
      } else {
        updated[dateId] = next;
      }

      return { tasksByDate: updated };
    });

    try {
      removeTask(id);
    } catch {
      get().loadTasks();
    }
  },
}));

const CalendarDayPill = React.memo(function CalendarDayPill({
  label,
  isSelected,
  isToday,
  isWeekend,
  pressed,
  isDarkMode,
  accent,
  isDisabled,
}: {
  label: string;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
  pressed: boolean;
  isDarkMode: boolean;
  accent: string;
  isDisabled: boolean;
}) {
  const isTodayOnly = isToday && !isSelected;
  const bgColor = isSelected
    ? accent
    : isTodayOnly
    ? (isDarkMode ? 'rgba(95, 159, 230, 0.12)' : 'rgba(116, 147, 215, 0.14)')
    : pressed
    ? (isDarkMode ? 'rgba(95, 159, 230, 0.16)' : 'rgba(116, 147, 215, 0.16)')
    : 'transparent';
  const borderColor = isSelected || isTodayOnly || pressed ? accent : 'transparent';
  const borderWidth = isSelected ? 1.5 : (isTodayOnly || pressed ? 1 : 0);
  const textColor = isSelected
    ? '#ffffff'
    : isToday
    ? accent
    : isWeekend
    ? (isDarkMode ? '#94a3b8' : '#64748b')
    : isDarkMode
    ? '#f8fafc'
    : '#0f172a';

  return (
    <View
      style={[
        styles.dayPill,
        {
          borderWidth,
          borderColor,
          backgroundColor: bgColor,
          opacity: isDisabled ? 0.45 : 1,
        }
      ]}
    >
      <Text
        style={[
          styles.dayPillText,
          { color: textColor, fontWeight: (isSelected || isToday || pressed) ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
});

const dayCellStyle = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flex: 1,
  height: 36,
  padding: 2,
};

const DayCell = React.memo(function DayCell({
  dayProps,
  selectedDateId,
  todayDateId,
  isDarkMode,
  accent,
  onSelect,
}: {
  dayProps: { id: string; displayLabel: string; isWeekend: boolean; isStartOfWeek: boolean; isDifferentMonth: boolean; state: string };
  selectedDateId: string;
  todayDateId: string;
  isDarkMode: boolean;
  accent: string;
  onSelect: (dateId: string) => void;
}) {
  const handlePress = useCallback(() => {
    buttonPressHaptic();
    onSelect(dayProps.id);
  }, [dayProps.id, onSelect]);

  if (dayProps.isDifferentMonth) {
    return (
      <Calendar.Item.Day.Container
        dayHeight={36}
        daySpacing={20}
        isStartOfWeek={dayProps.isStartOfWeek}
      >
        <Calendar.Item.Empty height={36} />
      </Calendar.Item.Day.Container>
    );
  }

  return (
    <Calendar.Item.Day.Container
      dayHeight={36}
      daySpacing={20}
      isStartOfWeek={dayProps.isStartOfWeek}
    >
      <Pressable
        disabled={dayProps.state === 'disabled'}
        onPress={handlePress}
        style={() => dayCellStyle}
      >
        {({ pressed }: { pressed: boolean }) => (
          <CalendarDayPill
            label={dayProps.displayLabel}
            isSelected={dayProps.id === selectedDateId}
            isToday={dayProps.id === todayDateId}
            isWeekend={dayProps.isWeekend}
            pressed={pressed}
            isDarkMode={isDarkMode}
            accent={accent}
            isDisabled={dayProps.state === 'disabled'}
          />
        )}
      </Pressable>
    </Calendar.Item.Day.Container>
  );
});

type CalendarSectionProps = {
  isDarkMode: boolean;
};

const CalendarChevronButton = ({
  direction,
  isDarkMode,
  onPress,
}: {
  direction: 'left' | 'right';
  isDarkMode: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} hitSlop={12} style={styles.monthShiftBtn}>
    {({ pressed }: { pressed: boolean }) => (
      <EaseView
        animate={{
          scale: pressed ? 1.2 : 1,
        }}
        transition={{
          type: 'spring',
          damping: 18,
          stiffness: 320,
          mass: 1,
        }}
        style={styles.monthShiftIconWrap}
      >
        <Feather
          name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
          size={18}
          color={isDarkMode ? '#f9fafb' : '#0f172a'}
        />
      </EaseView>
    )}
  </Pressable>
);

const CalendarSectionContent = ({ isDarkMode }: CalendarSectionProps) => {
  const setSelectedDate = useCalendarTaskStore((s) => s.setSelectedDate);

  const [selectedDateId, setSelectedDateId] = useState(() => toDateId(new Date()));
  const [calendarMonthId, setCalendarMonthId] = useState(() => toDateId(new Date()));
  const [todayDateId, setTodayDateId] = useState(() => toDateId(new Date()));

  const accent = isDarkMode ? '#5f9fe6' : '#7493d7';

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextMidnightTick = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        50
      );

      midnightTimer = setTimeout(() => {
        setTodayDateId(toDateId(new Date()));
        scheduleNextMidnightTick();
      }, nextMidnight.getTime() - now.getTime());
    };

    scheduleNextMidnightTick();
    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, []);

  const { weeksList, weekDaysList } = useFastCalendar({
    calendarMonthId,
    calendarFirstDayOfWeek: 'sunday',
  });

  const shiftMonth = useCallback((delta: number) => {
    setCalendarMonthId((prevMonthId) => {
      const base = fromDateId(prevMonthId);
      const shifted = new Date(base.getFullYear(), base.getMonth() + delta, 1);
      return toDateId(shifted);
    });
  }, []);

  const handleSelectDate = useCallback((dateId: string) => {
    setSelectedDateId(dateId);
    setSelectedDate(dateId);
  }, [setSelectedDate]);

  const jumpToToday = useCallback(() => {
    const today = new Date();
    const todayId = toDateId(today);
    const todayMonthId = toDateId(new Date(today.getFullYear(), today.getMonth(), 1));
    setCalendarMonthId(todayMonthId);
    handleSelectDate(todayId);
  }, [handleSelectDate]);

  return (
    <View style={[styles.topHalf, { backgroundColor: isDarkMode ? '#0f1e2d30' : '#ffffffaa' }]}> 
      <View style={styles.calendarHeaderRow}>
        <Pressable
          onPress={() => {
            buttonPressHaptic();
            router.back();
          }}
          hitSlop={16}
          style={[
            styles.closeButton,
            { backgroundColor: isDarkMode ? 'rgba(23, 29, 63, 0.75)' : 'rgba(117, 117, 117, 0.08)' },
          ]}
        >
          <Text style={[styles.closeIcon, { color: isDarkMode ? '#d1d5db' : '#18464a' }]}>✕</Text>
        </Pressable>

        <View style={styles.monthLabelSlot}>
          <EaseView
            key={calendarMonthId}
            initialAnimate={{ opacity: 0, translateX: 36, scale: 0.9 }}
            animate={{ opacity: 1, translateX: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 520, easing: 'easeOut' }}
          >
            <Text style={[styles.monthLabel, { color: isDarkMode ? '#e5e7eb' : '#1e293b' }]}>
              {fromDateId(calendarMonthId).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </EaseView>
        </View>
      </View>

      <EaseView
        key={`calendar-card-${calendarMonthId}`}
        initialAnimate={{ opacity: 0, translateX: 50, scale: 0.8 }}
        animate={{ opacity: 1, translateX: 0, scale: 1 }}
        transition={{ type: 'timing', duration: 520, easing: 'easeOut' }}
        style={[styles.calendarCard, { backgroundColor: isDarkMode ? '#0f1e2d99' : '#ffffffcc' }]}
      >
        <Calendar.VStack alignItems="center" spacing={6}>
          <Calendar.Row.Week
            spacing={20}
            theme={{
              container: {
                borderBottomWidth: 1,
                borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
                paddingBottom: 4,
                marginBottom: 4,
              },
            }}
          >
            {weekDaysList.map((weekDay, idx) => (
              <Calendar.Item.WeekName
                key={`week-day-${idx}`}
                height={30}
                theme={{ content: { color: isDarkMode ? '#9ca3af' : '#64748b' } }}
              >
                {weekDay}
              </Calendar.Item.WeekName>
            ))}
          </Calendar.Row.Week>

          <ScrollView
            style={styles.calendarDatesScroll}
            contentContainerStyle={styles.calendarDatesContent}
            showsVerticalScrollIndicator={false}
          >
            {weeksList.map((week, weekIndex) => (
              <Calendar.Row.Week key={`week-${weekIndex}`}>
                {week.map((dayProps) => (
                  <DayCell
                    key={dayProps.id}
                    dayProps={dayProps}
                    selectedDateId={selectedDateId}
                    todayDateId={todayDateId}
                    isDarkMode={isDarkMode}
                    accent={accent}
                    onSelect={handleSelectDate}
                  />
                ))}
              </Calendar.Row.Week>
            ))}
          </ScrollView>
        </Calendar.VStack>
      </EaseView>

      <View style={styles.calendarActionsRow}>
        <View style={[styles.monthShiftGroup, { backgroundColor: isDarkMode ? '#0f1e2d99' : '#ffffffcc' }]}>
          <CalendarChevronButton
            direction="left"
            isDarkMode={isDarkMode}
            onPress={() => {
              buttonPressHaptic();
              shiftMonth(-1);
            }}
          />
          <View style={[styles.monthShiftDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />
          <CalendarChevronButton
            direction="right"
            isDarkMode={isDarkMode}
            onPress={() => {
              buttonPressHaptic();
              shiftMonth(1);
            }}
          />
        </View>

        <TouchableOpacity onPress={jumpToToday} activeOpacity={0.8} style={styles.todayChip}>
          <Text style={[styles.todayChipText, { color: isDarkMode ? '#bfdbfe' : '#1e40af' }]}>Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CalendarSectionMemo = React.memo(CalendarSectionContent);

type TasksSectionProps = {
  isDarkMode: boolean;
  onWriteForToday: () => void;
};

const TasksSection = React.memo(function TasksSection({ isDarkMode, onWriteForToday }: TasksSectionProps) {
  const selectedDate = useCalendarTaskStore((s) => s.selectedDate);
  const tasks = useCalendarTaskStore((s) => s.tasksByDate[s.selectedDate] ?? EMPTY_TASKS);
  const toggleTask = useCalendarTaskStore((s) => s.toggleTask);
  const deleteTask = useCalendarTaskStore((s) => s.deleteTask);

  const orderedTasks = useMemo(() => {
    const incomplete = tasks
      .filter((t) => !t.completed)
      .sort((a, b) => a.created_at - b.created_at);
    const completed = tasks
      .filter((t) => t.completed)
      .sort((a, b) => a.created_at - b.created_at);
    return [...incomplete, ...completed];
  }, [tasks]);

  const selectedDateLabel = useMemo(
    () => toReadableDate(fromDateId(selectedDate)),
    [selectedDate]
  );

  const handleOpenAddScreen = useCallback(() => {
    buttonPressHaptic();
    router.push({
      pathname: '/add',
      params: { dayKey: String(dayKeyFromDateId(selectedDate)) },
    });
  }, [selectedDate]);

  const handleToggleTask = useCallback((task: Task) => {
    const next = !task.completed;
    if (next) {
      taskCompleteHaptic();
    } else {
      selectionHaptic();
    }

    toggleTask(task, selectedDate);
    if (selectedDate === toDateId(new Date())) {
      onWriteForToday();
    }
  }, [onWriteForToday, selectedDate, toggleTask]);

  const handleDeleteTask = useCallback((id: number) => {
    errorHaptic();
    deleteTask(id, selectedDate);
    if (selectedDate === toDateId(new Date())) {
      onWriteForToday();
    }
  }, [deleteTask, onWriteForToday, selectedDate]);

  return (
    <View style={styles.bottomHalf}>
      <View style={styles.selectedDateRow}>
        <Text style={[styles.selectedDateText, { color: isDarkMode ? '#d1d5db' : '#334155' }]}>
          {selectedDateLabel}
        </Text>
      </View>

      <FlashList
        data={orderedTasks}
        keyExtractor={(item) => `calendar-task-${item.id}`}
        contentContainerStyle={[
          styles.taskList,
          orderedTasks.length === 0 && styles.taskListEmpty,
        ]}
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

      <TouchableOpacity
        onPress={handleOpenAddScreen}
        activeOpacity={0.7}
        style={[styles.addTaskButton, { backgroundColor: isDarkMode ? '#1b293d91' : '#f9fafb' }]}
      >
        <View style={[styles.addTaskIcon, { backgroundColor: isDarkMode ? '#081623ff' : '#E6E6E6' }]}>
          <Feather name="plus" size={20} color={isDarkMode ? '#ffffff' : '#606060'} />
        </View>
        <Text style={[styles.addTaskText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
          Add a task for this date
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useKriya((s) => s.isDarkMode);
  const refreshTodayTasks = useKriya((s) => s.refresh);
  const loadTasks = useCalendarTaskStore((s) => s.loadTasks);
  const setSelectedDate = useCalendarTaskStore((s) => s.setSelectedDate);

  useEffect(() => {
    setSelectedDate(toDateId(new Date()));

    const id = requestAnimationFrame(() => {
      loadTasks();
    });

    return () => cancelAnimationFrame(id);
  }, [loadTasks, setSelectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient
        colors={isDarkMode ? ['#031d31e7', '#000000ff'] : ['#ffffffff', '#f0f2f8ff']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]}> 
        <CalendarSectionMemo isDarkMode={isDarkMode} />
        <TasksSection isDarkMode={isDarkMode} onWriteForToday={refreshTodayTasks} />
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
  topHalf: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
  },
  bottomHalf: {
    flex: 1.2,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,

  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 22,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  monthLabelSlot: {
    minHeight: 26,
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  dayPill: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    textAlign: 'center',
  },
  calendarCard: {
    borderRadius: 18,
    padding: 12,
    marginTop: 26,
    
  },
  calendarDatesScroll: {
    height: 212,
  },
  calendarDatesContent: {
    paddingBottom: 2,
  },
  calendarActionsRow: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthShiftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  monthShiftBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthShiftIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthShiftDivider: {
    width: 1,
    height: 22,
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 2,
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
    padding: 10,
    paddingBottom: 8,
  },
  taskListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
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
    fontSize: 18,
    fontFamily: 'Source Serif Pro',
    fontWeight: '300',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 11,
    marginTop: 10,
    marginBottom: 10,
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
});

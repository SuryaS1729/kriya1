import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Feather from "@react-native-vector-icons/feather/static";
import { ConfirmDialog } from '../components/ConfirmDialog';
import Checkbox from '../components/Checkbox';

import {
  Calendar,
  fromDateId,
  toDateId,
} from '@marceloterreiro/flash-calendar';
import { useFocusEffect, router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { create } from 'zustand';
import { EaseView } from 'react-native-ease';
import { PressableScale } from 'pressto';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useKriya } from '../lib/store';
import {
  getTasksBetween,
  getTasksForDay,
  removeTask,
  setTaskCompleted,
  type Task,
} from '../lib/tasks';
import { buttonPressHaptic, deleteHaptic, selectionHaptic, useTaskDoneHaptic } from '../lib/haptics';
import { StatusBar } from 'expo-status-bar';

const EMPTY_TASKS: Task[] = [];

// Same as Home: a just-completed task lingers in place briefly before
// sinking to the completed group, so the tick registers before it moves.
const COMPLETED_REORDER_DELAY_MS = 320;

/** Whether a day has tasks, and whether they're all done. */
type DayTaskStatus = 'none' | 'pending' | 'done';

const TASK_DOT_DONE = '#65a25c'; // same green as the completed checkbox

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEK_DAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type FastDayMeta = {
  id: string;
  displayLabel: string;
  isDifferentMonth: boolean;
  isStartOfWeek: boolean;
  isWeekend: boolean;
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
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const lastWeek = weeks[weeks.length - 1];
    if (lastWeek.length === 7) weeks.push([]);

    const d = new Date(year, m, day);
    const dow = d.getDay();
    weeks[weeks.length - 1].push({
      id: toDateId(d),
      displayLabel: String(day),
      isDifferentMonth: false,
      isStartOfWeek: dow === startOfWeekIdx,
      isWeekend: dow === 0 || dow === 6,
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
    });
  }

  return weeks;
}

const monthCache = new Map<string, FastDayMeta[][]>();

function getMonthGrid(monthId: string, firstDay: 'sunday' | 'monday' = 'sunday'): FastDayMeta[][] {
  // Week start changes the layout, so it's part of the key.
  const key = `${monthId}:${firstDay}`;
  const cached = monthCache.get(key);
  if (cached) return cached;
  const grid = buildMonthGrid(monthId, firstDay);
  monthCache.set(key, grid);
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

/** First day of the month containing `date`, as a date id. */
function monthIdFor(date: Date) {
  return toDateId(new Date(date.getFullYear(), date.getMonth(), 1));
}

function shiftMonthId(monthId: string, delta: number) {
  const base = fromDateId(monthId);
  return toDateId(new Date(base.getFullYear(), base.getMonth() + delta, 1));
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
  /** First day of the month shown in the grid. */
  monthId: string;
  setSelectedDate: (date: string) => void;
  setMonth: (monthId: string) => void;
  resetToToday: () => void;
  loadTasks: () => void;
  toggleTask: (task: Task, dateId: string) => void;
  deleteTask: (id: number, dateId: string) => void;
};

const useCalendarTaskStore = create<CalendarTaskStore>((set, get) => ({
  tasksByDate: {},
  selectedDate: toDateId(new Date()),
  monthId: monthIdFor(new Date()),

  setSelectedDate: (date) => set({ selectedDate: date }),

  setMonth: (monthId) => {
    set({ monthId });
    get().loadTasks();
  },

  resetToToday: () => set({ selectedDate: toDateId(new Date()), monthId: monthIdFor(new Date()) }),

  // Loads only the visible month and its neighbours (for instant month
  // flips), plus the selected day if it's outside that window — instead of
  // every task ever created.
  loadTasks: () => {
    const { monthId, selectedDate } = get();
    const start = dayKeyFromDateId(shiftMonthId(monthId, -1));
    const end = dayKeyFromDateId(shiftMonthId(monthId, 2));
    const tasks = getTasksBetween(start, end);

    const selectedKey = dayKeyFromDateId(selectedDate);
    if (selectedKey < start || selectedKey >= end) {
      tasks.push(...getTasksForDay(selectedKey));
    }

    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      const dateId = dateIdFromTask(task);
      if (!grouped[dateId]) grouped[dateId] = [];
      grouped[dateId].push(task);
    });

    set({ tasksByDate: grouped });
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
  taskStatus,
}: {
  label: string;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
  pressed: boolean;
  isDarkMode: boolean;
  accent: string;
  taskStatus: DayTaskStatus;
}) {
  const isTodayOnly = isToday && !isSelected;
  const bgColor = isSelected
    ? accent
    : isTodayOnly
    ? (isDarkMode ? 'transparent' : 'rgba(116, 147, 215, 0.14)')
    : pressed
    ? (isDarkMode ? 'rgba(95, 159, 230, 0.16)' : 'rgba(116, 147, 215, 0.16)')
    : 'transparent';
  const borderColor = isSelected || isTodayOnly || pressed ? accent : 'transparent';
  const borderWidth = isSelected ? 1.5 : (isTodayOnly || pressed ? 1 : 0);
  const textColor = isSelected
    ? '#ffffff'
    : isToday
    ? (isDarkMode ? '#9ce1ff' : '#3b5fb0')
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
      {taskStatus !== 'none' && (
        <View
          style={[
            styles.taskDot,
            isSelected
              ? { backgroundColor: '#ffffff', opacity: taskStatus === 'done' ? 1 : 0.6 }
              : taskStatus === 'done'
              ? { backgroundColor: TASK_DOT_DONE }
              : { backgroundColor: isDarkMode ? '#94a3b8' : '#64748b', opacity: 0.7 },
          ]}
        />
      )}
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
  taskStatus,
}: {
  dayProps: FastDayMeta;
  selectedDateId: string;
  todayDateId: string;
  isDarkMode: boolean;
  accent: string;
  onSelect: (dateId: string) => void;
  taskStatus: DayTaskStatus;
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
            taskStatus={taskStatus}
          />
        )}
      </Pressable>
    </Calendar.Item.Day.Container>
  );
});

type CalendarSectionProps = {
  isDarkMode: boolean;
};

const CalendarChevronIcon = ({
  direction,
  color,
  progress,
}: {
  direction: 'left' | 'right';
  color: string;
  progress: { value: number };
}) => {
  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [1, 0.84]),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.monthShiftIconWrap, iconAnimatedStyle]}>
      <Feather
        name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
        size={24}
        color={color}
      />
    </Animated.View>
  );
};

const CalendarChevronButton = ({
  direction,
  isDarkMode,
  onPress,
}: {
  direction: 'left' | 'right';
  isDarkMode: boolean;
  onPress: () => void;
}) => {
  const iconColor = isDarkMode ? '#f9fafb' : '#0f172a';

  return (
    <PressableScale onPress={onPress} hitSlop={12} rippleColor="transparent" style={styles.monthShiftBtn}>
      {({ progress }) => (
        <CalendarChevronIcon direction={direction} color={iconColor} progress={progress} />
      )}
    </PressableScale>
  );
};

const CalendarSectionContent = ({ isDarkMode }: CalendarSectionProps) => {
  // The store is the single source of truth for the selected date, so the
  // highlighted day and the task list below can never disagree.
  const selectedDateId = useCalendarTaskStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarTaskStore((s) => s.setSelectedDate);
  const tasksByDate = useCalendarTaskStore((s) => s.tasksByDate);

  const taskStatusByDate = useMemo(() => {
    const map: Record<string, DayTaskStatus> = {};
    for (const [dateId, tasks] of Object.entries(tasksByDate)) {
      if (tasks.length === 0) continue;
      map[dateId] = tasks.every((t) => t.completed) ? 'done' : 'pending';
    }
    return map;
  }, [tasksByDate]);

  const calendarMonthId = useCalendarTaskStore((s) => s.monthId);
  const setMonth = useCalendarTaskStore((s) => s.setMonth);
  const [todayDateId, setTodayDateId] = useState(() => toDateId(new Date()));

  const accent = isDarkMode ? '#056c99' : '#7493d7';

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
    setMonth(shiftMonthId(calendarMonthId, delta));
  }, [calendarMonthId, setMonth]);

  const handleSelectDate = useCallback((dateId: string) => {
    setSelectedDate(dateId);
  }, [setSelectedDate]);

  const jumpToToday = useCallback(() => {
    const today = new Date();
    handleSelectDate(toDateId(today));
    setMonth(monthIdFor(today));
  }, [handleSelectDate, setMonth]);

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

        <View style={styles.monthHeaderStack}>
          <View style={styles.monthLabelSlot}>
            <EaseView
              key={calendarMonthId}
              initialAnimate={{ opacity: 0, translateX: 0, scale: 0.8 }}
              animate={{ opacity: 1, translateX: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100, mass: 1}}
            >
              <Text style={[styles.monthLabel, { color: isDarkMode ? '#e5e7eb' : '#1e293b' }]}>
                {fromDateId(calendarMonthId).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
            </EaseView>
          </View>
        </View>
      </View>

      <View style={[styles.calendarCard, { backgroundColor: isDarkMode ? '#0f1e2d99' : '#ffffffcc' }]}>
        <View style={styles.calendarGridWrap}>
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
                    taskStatus={taskStatusByDate[dayProps.id] ?? 'none'}
                  />
                ))}
              </Calendar.Row.Week>
            ))}
          </ScrollView>
          </Calendar.VStack>
        </View>
      </View>

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
  const taskDoneHaptic = useTaskDoneHaptic();
  const deleteTask = useCalendarTaskStore((s) => s.deleteTask);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<number | null>(null);
  const [lingeringIds, setLingeringIds] = useState<number[]>([]);
  const lingerTimeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timeouts = lingerTimeouts.current;
    return () => Object.values(timeouts).forEach(clearTimeout);
  }, []);

  const orderedTasks = useMemo(() => {
    const isSettledDone = (t: Task) => t.completed && !lingeringIds.includes(t.id);
    const incomplete = tasks
      .filter((t) => !isSettledDone(t))
      .sort((a, b) => a.created_at - b.created_at);
    const completed = tasks
      .filter(isSettledDone)
      .sort((a, b) => a.created_at - b.created_at);
    return [...incomplete, ...completed];
  }, [tasks, lingeringIds]);

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
    const existing = lingerTimeouts.current[task.id];
    if (existing) {
      clearTimeout(existing);
      delete lingerTimeouts.current[task.id];
    }

    if (next) {
      taskDoneHaptic();
      setLingeringIds((ids) => (ids.includes(task.id) ? ids : [...ids, task.id]));
      lingerTimeouts.current[task.id] = setTimeout(() => {
        setLingeringIds((ids) => ids.filter((id) => id !== task.id));
        delete lingerTimeouts.current[task.id];
      }, COMPLETED_REORDER_DELAY_MS);
    } else {
      selectionHaptic();
      setLingeringIds((ids) => ids.filter((id) => id !== task.id));
    }

    toggleTask(task, selectedDate);
    if (selectedDate === toDateId(new Date())) {
      onWriteForToday();
    }
  }, [onWriteForToday, selectedDate, toggleTask, taskDoneHaptic]);

  const handleDeleteTask = useCallback((id: number) => {
    setPendingDeleteTaskId(id);
  }, []);

  const confirmDeleteTask = useCallback(() => {
    const id = pendingDeleteTaskId;
    setPendingDeleteTaskId(null);
    if (id == null) return;
    deleteHaptic();
    deleteTask(id, selectedDate);
    if (selectedDate === toDateId(new Date())) {
      onWriteForToday();
    }
  }, [pendingDeleteTaskId, deleteTask, onWriteForToday, selectedDate]);

  const handleOpenDetails = useCallback((id: number) => {
    buttonPressHaptic();
    router.push({
      pathname: '/task/[id]',
      params: { id: String(id) },
    });
  }, []);

  return (
    <View style={[styles.bottomHalf, { backgroundColor: isDarkMode ? '#08131f66' : '#ffffffb3' }]}>
      <View style={styles.selectedDateRow}>
        <Text style={[styles.selectedDateText, { color: isDarkMode ? '#d1d5db' : '#334155' }]}>
          {selectedDateLabel}
        </Text>
      </View>

      <FlashList
        style={styles.taskListView}
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
            {/* Only the checkbox completes a task; the title opens it. */}
            <Pressable
              onPress={() => handleToggleTask(item)}
              hitSlop={10}
              style={styles.checkboxWrap}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              accessibilityLabel={item.title}
            >
              <Checkbox completed={item.completed} isDarkMode={isDarkMode} />
            </Pressable>

            <Pressable
              style={{ flex: 1 }}
              onPress={() => handleOpenDetails(item.id)}
              accessibilityRole="button"
              accessibilityHint="Opens the task details"
            >
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
            </Pressable>

            {/* Completed tasks can't be deleted: they hold the link to the
                shloka they unlocked (same rule as Home and Add). */}
            {!item.completed && (
              <Pressable onPress={() => handleDeleteTask(item.id)} hitSlop={10} style={styles.deleteButton}>
                <Feather name="x" size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
              </Pressable>
            )}

            <Pressable
              onPress={() => handleOpenDetails(item.id)}
              hitSlop={12}
              style={styles.chevronButton}
              accessibilityLabel="Open task details"
              accessibilityHint="Opens the full task view"
            >
              <Feather
                name="chevron-right"
                size={16}
                color={isDarkMode ? '#4b5563' : '#cbd5e1'}
              />
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
          Add a task for this date ...
        </Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={pendingDeleteTaskId !== null}
        isDarkMode={isDarkMode}
        title="Delete task?"
        message="This task will be permanently removed."
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteTaskId(null)}
        onConfirm={confirmDeleteTask}
      />
    </View>
  );
});

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useKriya((s) => s.isDarkMode);
  const refreshTodayTasks = useKriya((s) => s.refresh);
  const loadTasks = useCalendarTaskStore((s) => s.loadTasks);
  const resetToToday = useCalendarTaskStore((s) => s.resetToToday);

  // Every visit opens on today's month and date.
  useEffect(() => {
    resetToToday();
  }, [resetToToday]);

  // Focus also fires on first mount, so this is the only load: on open and
  // on returning from Add / task details. Deferred a frame so the screen
  // paints first.
  useFocusEffect(
    useCallback(() => {
      const id = requestAnimationFrame(loadTasks);
      return () => cancelAnimationFrame(id);
    }, [loadTasks])
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar hidden= {true} />

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
    flex: 0.98,
    borderRadius: 18,
    padding: 12,
    overflow: 'hidden',
  },
  bottomHalf: {
    flex: 1.02,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    overflow: 'hidden',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,

  },
  monthHeaderStack: {
    alignItems: 'flex-end',
    gap: 0,
    marginLeft: 12,
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
    maxWidth: '100%',
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
  taskDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarCard: {
    borderRadius: 18,
    padding: 12,
    marginTop: 18,
    flex: 1,
    overflow: 'hidden',
  },
  calendarGridWrap: {
    flex: 1,
    width: '100%',
  },
  calendarDatesScroll: {
    height: 212,
  },
  calendarDatesContent: {
    paddingBottom: 2,
  },
  calendarActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthShiftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
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
    justifyContent: 'flex-start',
    marginTop: 2,
    marginBottom: 8,
  },
  selectedDateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  taskListView: {
    flex: 1,
  },
  todayChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#dbeafe88',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayChipText: {
    fontFamily:"Cedarville",
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
  taskTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Source Serif Pro',
    fontWeight: '300',
  },
  deleteButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    opacity: 0.9,
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
    fontSize: 13,
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

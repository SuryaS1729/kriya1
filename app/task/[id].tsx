import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import Feather from "@react-native-vector-icons/feather/static";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TopBar } from '../../components/TopBar';
import { useKriya } from '../../lib/store';
import {
  getTaskById,
  updateTaskDescription,
  updateTaskTitle,
  type Task,
} from '../../lib/tasks';
import {
  addTaskReminder,
  getRemindersForTask,
  isReminderInPast,
  removeTaskReminder,
  type TaskReminder,
} from '../../lib/reminders';
import { showAppToast } from '../../lib/appToast';
import {
  buttonPressHaptic,
  errorHaptic,
  selectionHaptic,
  taskCompleteHaptic,
} from '../../lib/haptics';

const DEFAULT_REMINDER_HOUR = 9;

function formatTime(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function TaskDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const taskId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const isDarkMode = useKriya(s => s.isDarkMode);
  const refresh = useKriya(s => s.refresh);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  const initializeNotifications = useKriya(s => s.initializeNotifications);

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [reminders, setReminders] = useState<TaskReminder[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(() => new Date());

  const load = useCallback(() => {
    if (!Number.isFinite(taskId)) return;
    const found = getTaskById(taskId);
    setTask(found);
    if (found) {
      setTitle(found.title);
      setDescription(found.description ?? '');
      setLoadedId(found.id);
    }
    const rows = getRemindersForTask(taskId);
    setReminders(rows);
    setPanelOpen(rows.length > 0);
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        // Persist anything still in flight, then let the lists behind us resync.
        Keyboard.dismiss();
        refresh();
      };
    }, [load, refresh])
  );

  const onTitleChange = (text: string) => {
    setTitle(text);
    const trimmed = text.trim();
    if (trimmed.length > 0) updateTaskTitle(taskId, trimmed);
  };

  const onDescriptionChange = (text: string) => {
    setDescription(text);
    updateTaskDescription(taskId, text);
  };

  const startFocus = () => {
    buttonPressHaptic();
    router.push({
      pathname: '/focus',
      params: {
        id: String(taskId),
        title: title.trim().length > 0 ? title.trim() : (task?.title ?? ''),
      },
    });
  };

  const syncReminders = useCallback(() => {
    setReminders(getRemindersForTask(taskId));
  }, [taskId]);

  /** Best effort: turns on the app's notification settings if they are off. */
  const ensureNotifications = useCallback(async () => {
    if (notificationsEnabled) return;
    try {
      await initializeNotifications();
    } catch {
      // addTaskReminder re-checks permission and reports the real failure.
    }
  }, [notificationsEnabled, initializeNotifications]);

  const reportFailure = useCallback((reason: 'no-task' | 'past' | 'duplicate' | 'permission' | 'error') => {
    if (reason === 'past') {
      showAppToast({
        type: 'info',
        text1: 'That time has already passed',
        text2: 'Pick a time on this task’s day that is still ahead.',
      });
      return;
    }
    if (reason === 'duplicate') {
      showAppToast({ type: 'info', text1: 'You already have a reminder at that time.' });
      return;
    }
    if (reason === 'permission') {
      showAppToast({
        type: 'error',
        text1: 'Notifications are off',
        text2: 'Turn them on in My Journey → Notification Settings.',
      });
      return;
    }
    if (reason === 'no-task') {
      showAppToast({ type: 'error', text1: 'This task no longer exists.' });
      return;
    }
    showAppToast({ type: 'error', text1: 'Couldn’t set that reminder.' });
  }, []);

  const createReminder = useCallback(
    async (hour: number, minute: number) => {
      await ensureNotifications();
      const result = await addTaskReminder(taskId, hour, minute);
      if (result.ok) {
        syncReminders();
        taskCompleteHaptic();
        showAppToast({
          type: 'success',
          text1: `Reminder set for ${formatTime(hour, minute)}`,
        });
        return true;
      }
      errorHaptic();
      reportFailure(result.reason);
      return false;
    },
    [ensureNotifications, taskId, syncReminders, reportFailure]
  );

  // A reminder can only ever land on the task's own day, so a task from
  // yesterday (or earlier) can't be reminded about any more.
  const taskDayEnded = (() => {
    if (!task || task.day_key == null) return false;
    const now = new Date();
    const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return task.day_key < todayKey;
  })();

  const onBellPress = useCallback(async () => {
    selectionHaptic();
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }
    if (taskDayEnded) {
      showAppToast({
        type: 'info',
        text1: 'This task’s day has already passed',
        text2: 'Reminders can only be set for today or a future day.',
      });
      return;
    }
    setPanelOpen(true);
    if (reminders.length > 0) return;
    // No reminders yet: the bell itself drops in the morning reminder.
    await createReminder(DEFAULT_REMINDER_HOUR, 0);
  }, [panelOpen, reminders.length, createReminder, taskDayEnded]);

  const openPicker = useCallback(() => {
    selectionHaptic();
    Keyboard.dismiss();
    const now = new Date();
    let suggested: Date;
    if (task && !isReminderInPast(task.day_key ?? now.getTime(), DEFAULT_REMINDER_HOUR, 0)) {
      suggested = new Date(task.day_key ?? now.getTime());
      suggested.setHours(DEFAULT_REMINDER_HOUR, 0, 0, 0);
    } else {
      // Morning is gone — suggest the next round half hour instead.
      suggested = new Date(now.getTime() + 30 * 60 * 1000);
      suggested.setSeconds(0, 0);
      suggested.setMinutes(Math.ceil(suggested.getMinutes() / 5) * 5);
    }
    setPickerValue(suggested);
    setPickerVisible(true);
  }, [task]);

  const commitPicker = useCallback(
    async (date: Date) => {
      setPickerVisible(false);
      await createReminder(date.getHours(), date.getMinutes());
    },
    [createReminder]
  );

  const onDeleteReminder = useCallback(
    async (reminderId: number) => {
      errorHaptic();
      await removeTaskReminder(reminderId);
      syncReminders();
    },
    [syncReminders]
  );

  const notFound = loadedId !== null && task === null;
  const accent = isDarkMode ? '#93c5fd' : '#2563eb';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient
        colors={isDarkMode ? ['#031d31e7', '#000000ff'] : ['#ffffffff', '#f0f2f8ff']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <TopBar title="Task" variant="back" isDarkMode={isDarkMode} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
        >
          {notFound ? (
            <View style={styles.missingWrap}>
              <Feather name="alert-circle" size={22} color={isDarkMode ? '#6b7280' : '#94a3b8'} />
              <Text style={[styles.missingText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                This task no longer exists.
              </Text>
            </View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(120)}>
                <Text style={[styles.label, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                  Title
                </Text>
                <TextInput
                  value={title}
                  onChangeText={onTitleChange}
                  placeholder="Untitled task"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[
                    styles.titleInput,
                    { color: isDarkMode ? '#f9fafb' : '#111827' },
                  ]}
                  multiline
                  onFocus={() => selectionHaptic()}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(120).delay(40)}>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={startFocus}
                    style={({ pressed }) => [
                      styles.focusButton,
                      {
                        backgroundColor: isDarkMode ? '#1e3a5f' : '#1d4ed8',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Feather name="zap" size={18} color="#ffffff" />
                    <Text style={styles.focusButtonText}>Focus</Text>
                  </Pressable>

                  <Pressable
                    onPress={onBellPress}
                    style={({ pressed }) => [
                      styles.bellButton,
                      {
                        backgroundColor: reminders.length > 0
                          ? (isDarkMode ? '#1e3a5f' : '#dbeafe')
                          : (isDarkMode ? '#1f2937' : '#f1f5f9'),
                        borderColor: reminders.length > 0
                          ? (isDarkMode ? '#3b82f6' : '#93c5fd')
                          : (isDarkMode ? '#374151' : '#e2e8f0'),
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name="bell"
                      size={20}
                      color={reminders.length > 0 ? accent : (isDarkMode ? '#9ca3af' : '#64748b')}
                    />
                  </Pressable>
                </View>
              </Animated.View>

              {panelOpen && (
                <Animated.View entering={FadeInDown.duration(120).delay(80)}>
                  <Text style={[styles.label, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                    Reminders
                  </Text>

                  <View style={styles.reminderList}>
                    {reminders.map(reminder => (
                      <View
                        key={reminder.id}
                        style={[
                          styles.reminderPill,
                          {
                            backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9',
                            borderColor: isDarkMode ? '#374151' : '#e2e8f0',
                          },
                        ]}
                      >
                        <Feather name="bell" size={14} color={accent} />
                        <Text style={[styles.reminderTime, { color: isDarkMode ? '#e5e7eb' : '#0f172a' }]}>
                          {formatTime(reminder.hour, reminder.minute)}
                        </Text>
                        <Pressable
                          onPress={() => onDeleteReminder(reminder.id)}
                          hitSlop={10}
                          style={styles.reminderRemove}
                        >
                          <Feather name="x" size={14} color={isDarkMode ? '#9ca3af' : '#64748b'} />
                        </Pressable>
                      </View>
                    ))}

                    <Pressable
                      onPress={openPicker}
                      style={({ pressed }) => [
                        styles.addTimeButton,
                        {
                          borderColor: isDarkMode ? '#374151' : '#e2e8f0',
                          backgroundColor: pressed
                            ? (isDarkMode ? '#1f2937' : '#e2e8f0')
                            : 'transparent',
                        },
                      ]}
                    >
                      <Feather name="plus" size={14} color={isDarkMode ? '#9ca3af' : '#64748b'} />
                      <Text style={[styles.addTimeText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                        Add another time
                      </Text>
                    </Pressable>
                  </View>

                  {reminders.length > 0 && !notificationsEnabled && (
                    <Text style={[styles.warnText, { color: isDarkMode ? '#fbbf24' : '#b45309' }]}>
                      Notifications are off, so these won’t fire. Turn them on in My Journey →
                      Notification Settings.
                    </Text>
                  )}
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.duration(120).delay(120)}>
                <Text style={[styles.label, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={onDescriptionChange}
                  placeholder="Add a description…"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[
                    styles.descriptionInput,
                    { color: isDarkMode ? '#e5e7eb' : '#334155' },
                  ]}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => selectionHaptic()}
                />
              </Animated.View>
            </>
          )}
        </ScrollView>

        {pickerVisible && Platform.OS === 'ios' && !notFound && (
          <View
            style={[
              styles.pickerCard,
              {
                backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                borderColor: isDarkMode ? '#1f2937' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerLabel, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
                Remind me at
              </Text>
              <Pressable
                onPress={() => {
                  setPickerVisible(false);
                  void commitPicker(pickerValue);
                }}
                hitSlop={8}
              >
                <Text style={[styles.pickerDone, { color: accent }]}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerValue}
              mode="time"
              display="spinner"
              onValueChange={(_event, date) => setPickerValue(date)}
              style={styles.picker}
              themeVariant={isDarkMode ? 'dark' : 'light'}
              accentColor={accent}
            />
          </View>
        )}

        {pickerVisible && Platform.OS !== 'ios' && !notFound && (
          <DateTimePicker
            value={pickerValue}
            mode="time"
            presentation="dialog"
            onValueChange={(_event, date) => {
              setPickerVisible(false);
              void commitPicker(date);
            }}
            onDismiss={() => setPickerVisible(false)}
            accentColor={accent}
            themeVariant={isDarkMode ? 'dark' : 'light'}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: 'Source Serif Pro',
    fontWeight: '400',
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  focusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 14,
    gap: 8,
  },
  focusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Source Serif Pro',
  },
  bellButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderList: {
    gap: 8,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  reminderTime: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Source Serif Pro',
    fontWeight: '500',
  },
  reminderRemove: {
    padding: 4,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addTimeText: {
    fontSize: 14,
    fontFamily: 'Source Serif Pro',
    fontWeight: '500',
  },
  warnText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Source Serif Pro',
  },
  descriptionInput: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'Source Serif Pro',
    fontWeight: '300',
    minHeight: 160,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  pickerLabel: {
    fontSize: 13,
    fontFamily: 'Space Mono',
  },
  pickerDone: {
    fontSize: 15,
    fontWeight: '600',
  },
  picker: {
    alignSelf: 'center',
    height: 180,
  },
  missingWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  missingText: {
    fontSize: 15,
    fontFamily: 'Source Serif Pro',
  },
});

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDb } from './db';

export type TaskReminder = {
  id: number;
  task_id: number;
  day_key: number;
  hour: number;
  minute: number;
  notification_id: string | null;
};

type Row = {
  id: number;
  task_id: number;
  day_key: number;
  hour: number;
  minute: number;
  notification_id: string | null;
};

/** Distinct from the daily "plan your day" reminder type (store.ts). */
export const TASK_REMINDER_NOTIFICATION_TYPE = 'task_time_reminder';

const ANDROID_CHANNEL_ID = 'kriyaNotificationChannel';

export type AddReminderResult =
  | { ok: true; reminder: TaskReminder }
  | { ok: false; reason: 'no-task' | 'past' | 'duplicate' | 'permission' | 'error' };

function toReminder(row: Row): TaskReminder {
  return { ...row };
}

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type ReminderTask = { id: number; title: string; day_key: number };

function reminderTask(taskId: number): ReminderTask | null {
  try {
    const db = getDb();
    const row = db.getFirstSync<{ id: number; title: string; day_key: number | null; created_at: number }>(
      'SELECT id, title, day_key, created_at FROM tasks WHERE id = ?',
      [taskId]
    );
    if (!row) return null;
    const dayKey = row.day_key ? row.day_key : startOfDay(row.created_at);
    return { id: row.id, title: row.title, day_key: dayKey };
  } catch {
    return null;
  }
}

/** The exact moment a reminder fires: the task's day at hour:minute. */
export function reminderDate(dayKey: number, hour: number, minute: number): Date {
  const d = new Date(dayKey);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function isReminderInPast(dayKey: number, hour: number, minute: number): boolean {
  return reminderDate(dayKey, hour, minute).getTime() <= Date.now();
}

export function getRemindersForTask(taskId: number): TaskReminder[] {
  try {
    const db = getDb();
    // Days before today can never fire again — keep them out of the UI.
    const rows = db.getAllSync<Row>(
      'SELECT * FROM task_reminders WHERE task_id = ? AND day_key >= ? ORDER BY hour, minute, id',
      [taskId, startOfDay(Date.now())]
    );
    return rows.map(toReminder);
  } catch {
    return [];
  }
}

/** Drops reminders whose day is behind us — they can never fire again. */
function pruneExpiredReminders(): void {
  try {
    const db = getDb();
    const cutoff = startOfDay(Date.now());
    const stale = db.getAllSync<{ notification_id: string | null }>(
      'SELECT notification_id FROM task_reminders WHERE day_key < ?',
      [cutoff]
    );
    db.runSync('DELETE FROM task_reminders WHERE day_key < ?', [cutoff]);
    stale.forEach(row => {
      void cancelNotification(row.notification_id);
    });
  } catch {
    // Nothing to prune.
  }
}

export function getAllTaskReminders(): TaskReminder[] {
  try {
    const db = getDb();
    const rows = db.getAllSync<Row>(
      'SELECT * FROM task_reminders ORDER BY day_key, hour, minute, id'
    );
    return rows.map(toReminder);
  } catch {
    return [];
  }
}

async function scheduleReminder(row: TaskReminder): Promise<string | null> {
  try {
    const task = reminderTask(row.task_id);
    if (!task) return null;

    const date = reminderDate(row.day_key, row.hour, row.minute);
    if (date.getTime() <= Date.now()) return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      // Same channel store.ts creates for the daily nudge — reminders must
      // land on it even when the user has never enabled the daily reminder.
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Kriya Daily Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        showBadge: true,
        enableLights: true,
        enableVibrate: true,
      });
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: "It's time for this task.",
        data: { type: TASK_REMINDER_NOTIFICATION_TYPE, taskId: row.task_id },
        sound: true,
        ...(Platform.OS === 'android' && {
          icon: './assets/icons/icon.png',
          color: '#1e40afff',
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
      },
    });
  } catch {
    return null;
  }
}

async function cancelNotification(notificationId: string | null) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired or already cancelled — nothing to do.
  }
}

export async function addTaskReminder(
  taskId: number,
  hour: number,
  minute: number
): Promise<AddReminderResult> {
  try {
    const task = reminderTask(taskId);
    if (!task) return { ok: false, reason: 'no-task' };

    if (isReminderInPast(task.day_key, hour, minute)) {
      return { ok: false, reason: 'past' };
    }

    if (getRemindersForTask(taskId).some(r => r.hour === hour && r.minute === minute)) {
      return { ok: false, reason: 'duplicate' };
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return { ok: false, reason: 'permission' };

    const db = getDb();
    const result = db.runSync(
      'INSERT INTO task_reminders (task_id, day_key, hour, minute, notification_id) VALUES (?, ?, ?, ?, NULL)',
      [taskId, task.day_key, hour, minute]
    );

    const inserted = db.getFirstSync<Row>('SELECT * FROM task_reminders WHERE id = ?', [
      result.lastInsertRowId,
    ]);
    if (!inserted) return { ok: false, reason: 'error' };

    const notificationId = await scheduleReminder(inserted);
    if (!notificationId) {
      db.runSync('DELETE FROM task_reminders WHERE id = ?', [inserted.id]);
      return { ok: false, reason: 'error' };
    }

    db.runSync('UPDATE task_reminders SET notification_id = ? WHERE id = ?', [
      notificationId,
      inserted.id,
    ]);

    return { ok: true, reminder: { ...inserted, notification_id: notificationId } };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function removeTaskReminder(reminderId: number): Promise<void> {
  try {
    const db = getDb();
    const row = db.getFirstSync<Row>('SELECT * FROM task_reminders WHERE id = ?', [reminderId]);
    if (!row) return;
    db.runSync('DELETE FROM task_reminders WHERE id = ?', [reminderId]);
    await cancelNotification(row.notification_id);
  } catch {
    // Nothing to clean up.
  }
}

/** Called from tasks.removeTask — keeps the DB and OS queues in sync. */
export function removeRemindersForTask(taskId: number): void {
  try {
    const db = getDb();
    const rows = db.getAllSync<{ notification_id: string | null }>(
      'SELECT notification_id FROM task_reminders WHERE task_id = ?',
      [taskId]
    );
    db.runSync('DELETE FROM task_reminders WHERE task_id = ?', [taskId]);
    rows.forEach(row => {
      void cancelNotification(row.notification_id);
    });
  } catch {
    // Nothing to clean up.
  }
}

/**
 * Re-arms every stored reminder. Store code cancels *all* scheduled
 * notifications in a few places (daily nudge reschedule, permission failures),
 * so those call sites invoke this afterwards to bring task reminders back.
 */
export async function rescheduleTaskReminders(): Promise<void> {
  try {
    pruneExpiredReminders();
    const rows = getAllTaskReminders();
    for (const row of rows) {
      await cancelNotification(row.notification_id);
      const notificationId = await scheduleReminder(row);
      const db = getDb();
      db.runSync('UPDATE task_reminders SET notification_id = ? WHERE id = ?', [
        notificationId,
        row.id,
      ]);
    }
  } catch {
    // Leave rows untouched; the next focus/refresh retries.
  }
}

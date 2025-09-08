import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView, Alert, Dimensions, Modal, Platform } from 'react-native';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';
import BlurBackground from '@/components/BlurBackground';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';


const { width } = Dimensions.get('window');

function formatDay(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}


// Updated DayDetailModal to always show content
function DayDetailModal({ date, onClose }: { date: Date | null; onClose: () => void }) {
  const getForDay = useKriya(s => s.getTasksForDay);
  const getFocusSessionsForDay = useKriya(s => s.getFocusSessionsForDay);
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  if (!date) return null;
  
  const dayKey = getDateKey(date);
  const tasks = getForDay(dayKey);
  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);
  const focusSessions = getFocusSessionsForDay ? getFocusSessionsForDay(dayKey) : 0;
  const successRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
  
  // Check if it's today or future date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDay = new Date(date);
  selectedDay.setHours(0, 0, 0, 0);
  const isToday = selectedDay.getTime() === today.getTime();
  const isFuture = selectedDay.getTime() > today.getTime();
  
  return (
    <Modal
      visible={!!date}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, !isDarkMode && styles.lightModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, !isDarkMode && styles.lightText]}>
              {date.toLocaleDateString(undefined, { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
              {isToday && ' (Today)'}
              {isFuture && ' (Future)'}
            </Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={isDarkMode ? "#fff" : "#000"} />
            </Pressable>
          </View>
          
          <View style={[styles.modalStats, !isDarkMode && styles.lightModalStats]}>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{successRate}%</Text>
              <Text style={[styles.modalStatLabel, !isDarkMode && styles.lightSubText]}>Success Rate</Text>
            </View>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{completed.length}</Text>
              <Text style={[styles.modalStatLabel, !isDarkMode && styles.lightSubText]}>Completed</Text>
            </View>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{focusSessions}</Text>
              <Text style={[styles.modalStatLabel, !isDarkMode && styles.lightSubText]}>Focus Sessions</Text>
            </View>
          </View>
          
          {tasks.length > 0 ? (
            <ScrollView style={styles.tasksList}>
              {completed.length > 0 && (
                <>
                  <Text style={[styles.tasksSection, !isDarkMode && styles.lightText]}>Completed Tasks</Text>
                  {completed.map((task, index) => (
                    <View key={`completed-${index}`} style={[styles.taskItem, styles.completedTask]}>
                      <Feather name="check-circle" size={16} color="#8ba5e1" />
                      <Text style={[styles.taskText, !isDarkMode && styles.lightText]}>{task.title}</Text>
                    </View>
                  ))}
                </>
              )}
              
              {pending.length > 0 && (
                <>
                  <Text style={[styles.tasksSection, !isDarkMode && styles.lightText]}>Pending Tasks</Text>
                  {pending.map((task, index) => (
                    <View key={`pending-${index}`} style={[styles.taskItem, styles.pendingTask]}>
                      <Feather name="circle" size={16} color="#888" />
                      <Text style={[styles.taskText, styles.pendingTaskText]}>{task.title}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.noTasksContainer}>
              <Feather 
                name={isFuture ? "calendar" : "coffee"} 
                size={48} 
                color="#979797ff" 
              />
              <Text style={[styles.noTasksText, !isDarkMode && styles.lightSubText]}>
                {isFuture 
                  ? "No tasks planned for this day" 
                  : isToday 
                    ? "No tasks for today yet - time to add some!"
                    : "No tasks were recorded for this day"
                }
              </Text>
              {(isToday || isFuture) && (
                <Pressable 
                  style={[styles.addTaskButton]}
                  onPress={() => {
                    onClose();
                    router.push('/add');
                  }}
                >
                  <Text style={styles.addTaskButtonText}>Add Tasks</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ...existing code...
// Main Calendar Component
function MainCalendar() {
  const getForDay = useKriya(s => s.getTasksForDay);
  const getFocusSessionsForDay = useKriya(s => s.getFocusSessionsForDay);
  const isDarkMode = useKriya(s => s.isDarkMode);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const calendarStart = new Date(firstDay);
    calendarStart.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days = [];
    const totalDays = 42;
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + i);
      
      const dayKey = getDateKey(date);
      const tasks = getForDay(dayKey);
      const completed = tasks.filter(t => t.completed).length;
      const total = tasks.length;
      const focusSessions = getFocusSessionsForDay ? getFocusSessionsForDay(dayKey) : 0;
      
      days.push({
        date: new Date(date),
        dayKey,
        completed,
        total,
        focusSessions,
        isCurrentMonth: date.getMonth() === month,
        isToday: new Date().toDateString() === date.toDateString(),
        hasActivity: total > 0 || focusSessions > 0,
        completionRate: total > 0 ? completed / total : 0
      });
    }
    
    return {
      days,
      monthName: firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    };
  }, [currentDate, getForDay, getFocusSessionsForDay]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const getActivityStyle = (day: any) => {
    if (!day.isCurrentMonth) {
      return [styles.inactiveDay, !isDarkMode && styles.lightInactiveDay];
    }
    
    if (day.isToday) {
      return [styles.todayDay, { backgroundColor: '#7c9fb0' }]; // Updated today color
    }
    
    if (!day.hasActivity) {
      return [styles.noActivityDay, !isDarkMode && styles.lightNoActivityDay];
    }
    
    // Calculate activity intensity
    const taskScore = day.total > 0 ? day.completionRate : 0;
    const focusScore = Math.min(day.focusSessions / 3, 1);
    const combinedScore = (taskScore + focusScore) / 2;
    
    if (combinedScore >= 0.8) {
      return styles.completedDay; // #8ba5e1
    } else if (combinedScore >= 0.6) {
      return styles.highActivityDay; // #6b8db5
    } else if (combinedScore >= 0.3) {
      return styles.partialDay; // #5a7a9a
    } else {
      return styles.lowActivityDay; // #4a6b8a
    }
  };

const handleDayPress = (day: any) => {
  if (day.isCurrentMonth) { // Remove the hasActivity condition
    setSelectedDate(day.date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Add haptic feedback
  }
};

  // Create weeks array for better layout control
  const weeks = [];
  for (let i = 0; i < calendarData.days.length; i += 7) {
    weeks.push(calendarData.days.slice(i, i + 7));
  }

  return (
    <>
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <Text style={[styles.calendarTitle, !isDarkMode && styles.lightText]}>{calendarData.monthName}</Text>
          <View style={styles.monthNavigation}>
            <Pressable onPress={() => navigateMonth('prev')} style={styles.navButton}>
              <Feather name="chevron-left" size={20} color="#888" />
            </Pressable>
            <Pressable onPress={() => navigateMonth('next')} style={styles.navButton}>
              <Feather name="chevron-right" size={20} color="#888" />
            </Pressable>
          </View>
        </View>

        {/* Week Labels */}
        <View style={styles.weekLabels}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <View key={day} style={styles.weekLabelContainer}>
              <Text style={[styles.weekLabel, !isDarkMode && styles.lightSubText]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid - Now using weeks */}
        <View style={[styles.calendarContainer, !isDarkMode && styles.lightCalendarContainer]}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => (
                <Pressable 
                  key={dayIndex} 
                  style={[
                    styles.dayCell, 
                    getActivityStyle(day)
                  ]}
                  onPress={() => handleDayPress(day)}
                  // disabled={!day.hasActivity || !day.isCurrentMonth}
                    disabled={!day.isCurrentMonth} // Only disable for non-current month days

                >
                  <Text style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.inactiveDayText,
                    day.isToday && styles.todayText,
                    !isDarkMode && day.isCurrentMonth && !day.isToday && styles.lightText
                  ]}>
                    {day.date.getDate()}
                  </Text>
                  {/* {day.hasActivity && day.isCurrentMonth && (
                    <View style={styles.activityIndicator}>
                      <Text style={styles.activityCount}>
                        {day.completed > 0 && `${day.completed}t`}
                        {day.focusSessions > 0 && ` ${day.focusSessions}f`}
                      </Text>
                    </View>
                  )} */}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        
        {/* Legend */}
        <View style={styles.legend}>
          <Text style={[styles.legendTitle, !isDarkMode && styles.lightSubText]}>Activity Level</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#444' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>None</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4a6b8a' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#5a7a9a' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6b8db5' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>High</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#8ba5e1' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>Perfect</Text>
            </View>
          </View>
          <Text style={[styles.legendNote, !isDarkMode && styles.lightSubText]}>
            Activity combines task completion and focus sessions. t = tasks, f = focus sessions
          </Text>
        </View>
      </View>
      
      {selectedDate && (
        <DayDetailModal 
          date={selectedDate} 
          onClose={() => setSelectedDate(null)} 
        />
      )}
    </>
  );
}

// Weekly Summary Component
function WeeklySummary() {
  const getForDay = useKriya(s => s.getTasksForDay);
  const getFocusSessionsForDay = useKriya(s => s.getFocusSessionsForDay);
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - today.getDay());
    
    let totalTasks = 0;
    let completedTasks = 0;
    let totalFocusSessions = 0;
    let activeDays = 0;
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      const dayKey = getDateKey(day);
      
      const tasks = getForDay(dayKey);
      const focusSessions = getFocusSessionsForDay ? getFocusSessionsForDay(dayKey) : 0;
      
      if (tasks.length > 0 || focusSessions > 0) {
        activeDays++;
      }
      
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
      totalFocusSessions += focusSessions;
    }
    
    return {
      activeDays,
      completedTasks,
      totalTasks,
      totalFocusSessions,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      focusTime: totalFocusSessions * 25 // 25 minutes per session
    };
  }, [getForDay, getFocusSessionsForDay]);

  return (
    <View style={styles.summarySection}>
      <Text style={[styles.summaryTitle, !isDarkMode && styles.lightText]}>This Week</Text>
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="calendar" size={24} color="#8ba5e1" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.activeDays}</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Active Days</Text>
        </View>
        
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="check-circle" size={24} color="#8ba5e1" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.completedTasks}</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Tasks Done</Text>
        </View>
        
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="target" size={24} color="#8ba5e1" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.totalFocusSessions}</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Focus Sessions</Text>
        </View>
        
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="clock" size={24} color="#8ba5e1" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.focusTime}m</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Focus Time</Text>
        </View>
      </View>
    </View>
  );
}



// Updated NotificationSettings component with proper Modal
function NotificationSettings() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  const reminderTime = useKriya(s => s.reminderTime);
  const toggleNotifications = useKriya(s => s.toggleNotifications);
  const setReminderTime = useKriya(s => s.setReminderTime);
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(reminderTime.hour);
  const [tempMinute, setTempMinute] = useState(reminderTime.minute);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleSaveTime = async () => {
    await setReminderTime(tempHour, tempMinute);
    setShowTimePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.section, !isDarkMode && styles.lightSection]}>
      <Text style={[styles.sectionTitle, !isDarkMode && styles.lightText]}>Notification Settings</Text>
      
      <View style={styles.notificationSettings}>
        {/* Toggle Notifications */}
        <Pressable 
          style={[styles.settingRow, !isDarkMode && styles.lightSettingRow]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggleNotifications();
          }}
        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, !isDarkMode && styles.lightText]}>
              Daily Task Reminder
            </Text>
            <Text style={[styles.settingDescription, !isDarkMode && styles.lightSubText]}>
              Get reminded to plan your day
            </Text>
          </View>
          <View style={[
            styles.toggle,
            notificationsEnabled && styles.toggleActive,
            notificationsEnabled && !isDarkMode && styles.lightToggleActive
          ]}>
            <View style={[
              styles.toggleKnob,
              notificationsEnabled && styles.toggleKnobActive
            ]} />
          </View>
        </Pressable>

        {/* Time Setting */}
        {notificationsEnabled && (
          <Pressable 
            style={[styles.settingRow, !isDarkMode && styles.lightSettingRow]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTimePicker(true);
            }}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, !isDarkMode && styles.lightText]}>
                Reminder Time
              </Text>
              <Text style={[styles.settingDescription, !isDarkMode && styles.lightSubText]}>
                When you usually start your day
              </Text>
            </View>
            <View style={styles.timeDisplay}>
              <Text style={[styles.timeDisplayText, !isDarkMode && styles.lightText]}>
                {reminderTime.hour.toString().padStart(2, '0')}:{reminderTime.minute.toString().padStart(2, '0')}
              </Text>
              <Feather name="chevron-right" size={16} color={isDarkMode ? '#9ca3af' : '#64748b'} />
            </View>
          </Pressable>
        )}
      </View>

      {/* Time Picker Modal - Updated with proper Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.timePickerOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowTimePicker(false)} />
          <View style={[styles.timePickerModal, !isDarkMode && styles.lightTimePickerModal]}>
            <Text style={[styles.timePickerTitle, !isDarkMode && styles.lightText]}>
              Set Reminder Time
            </Text>
            
            <View style={styles.timePickerContent}>
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, !isDarkMode && styles.lightSubText]}>Hour</Text>
                  <ScrollView 
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {hours.map((hour) => (
                      <Pressable
                        key={hour}
                        onPress={() => setTempHour(hour)}
                        style={[
                          styles.timePickerOption,
                          tempHour === hour && styles.selectedTimePickerOption,
                          tempHour === hour && !isDarkMode && styles.lightSelectedTimePickerOption
                        ]}
                      >
                        <Text style={[
                          styles.timePickerOptionText,
                          !isDarkMode && styles.lightText,
                          tempHour === hour && styles.selectedTimePickerOptionText
                        ]}>
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                <Text style={[styles.timePickerSeparator, !isDarkMode && styles.lightText]}>:</Text>

                <View style={styles.timePickerSection}>
                  <Text style={[styles.timePickerLabel, !isDarkMode && styles.lightSubText]}>Minute</Text>
                  <ScrollView 
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {minutes.map((minute) => (
                      <Pressable
                        key={minute}
                        onPress={() => setTempMinute(minute)}
                        style={[
                          styles.timePickerOption,
                          tempMinute === minute && styles.selectedTimePickerOption,
                          tempMinute === minute && !isDarkMode && styles.lightSelectedTimePickerOption
                        ]}
                      >
                        <Text style={[
                          styles.timePickerOptionText,
                          !isDarkMode && styles.lightText,
                          tempMinute === minute && styles.selectedTimePickerOptionText
                        ]}>
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.timePickerActions}>
              <Pressable 
                onPress={() => setShowTimePicker(false)}
                style={[styles.timePickerButton, styles.timePickerCancelButton]}
              >
                <Text style={styles.timePickerCancelText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                onPress={handleSaveTime}
                style={[styles.timePickerButton, styles.timePickerSaveButton, !isDarkMode && styles.lightTimePickerSaveButton]}
              >
                <Text style={styles.timePickerSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



// Add this test function before the QuickActions component
function TestNotificationButton() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  const triggerTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body: "This is a test notification from Kriya. Your notification setup is working!",
          data: { type: 'test_notification' },
          sound: true,
          ...(Platform.OS === 'android' && {
            icon: './assets/icons/icon.png',
            color: '#ff9500',
          }),
        },
        trigger: {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1, // Trigger after 2 seconds
        },
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('✅ Test notification scheduled');
    } catch (error) {
      console.error('❌ Failed to schedule test notification:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.testSection}>
      <Text style={[styles.sectionTitle, !isDarkMode && styles.lightText]}>Test Notifications</Text>
      <Pressable 
        style={[styles.testButton, !isDarkMode && styles.lightTestButton]}
        onPress={triggerTestNotification}
      >
        <View style={styles.testButtonContent}>
          <Feather name="bell" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Test Notification</Text>
        </View>
        <Text style={[styles.testButtonDesc, !isDarkMode && styles.lightSubText]}>
          Tap to send a test notification in 2 seconds
        </Text>
      </Pressable>
    </View>
  );
}


// Quick Actions Component
function QuickActions() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  return (
    <View style={styles.actionsSection}>
      <Text style={[styles.actionsTitle, !isDarkMode && styles.lightText]}>Quick Actions</Text>
      <View style={styles.actionButtons}>
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/')}
        >
          <Feather name="plus-circle" size={24} color="#35E21B" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Add Tasks</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/focus')}
        >
          <Feather name="target" size={24} color="#00FFFF" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Focus Session</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/bookmarks')}
        >
          <MaterialIcons name="bookmark" size={24} color="#fbbf24" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Bookmarks</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Gita Progress Component
function GitaProgress() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const getTotalCompletedTasks = useKriya(s => s.getTotalCompletedTasks);
  
  // Assuming 700 total shlokas in Bhagavad Gita
  const totalShlokas = 700;
  const completedTasks = getTotalCompletedTasks ? getTotalCompletedTasks() : 0;
  const unlockedShlokas = Math.min(completedTasks, totalShlokas);
  const progressPercentage = Math.round((unlockedShlokas / totalShlokas) * 100);
  
  // Calculate which chapter and verse they're currently on
  const chaptersAndVerses = [
    47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78
  ];
  
  let currentChapter = 1;
  let currentVerse = 1;
  let remainingShlokas = unlockedShlokas;
  
  for (let i = 0; i < chaptersAndVerses.length && remainingShlokas > 0; i++) {
    if (remainingShlokas >= chaptersAndVerses[i]) {
      remainingShlokas -= chaptersAndVerses[i];
      currentChapter = i + 2; // Next chapter
      currentVerse = 1;
    } else {
      currentChapter = i + 1;
      currentVerse = remainingShlokas + 1;
      break;
    }
  }
  
  if (unlockedShlokas >= totalShlokas) {
    currentChapter = 18;
    currentVerse = 78;
  }
  
  return (
    <View style={[styles.gitaSection, !isDarkMode && styles.lightGitaSection]}>
      <View style={styles.gitaHeader}>
        <View style={styles.gitaTitle}>
          <Text style={[styles.gitaTitleText, !isDarkMode && styles.lightText]}>🕉️ Bhagavad Gita Journey</Text>
          <Text style={[styles.gitaSubtitle, !isDarkMode && styles.lightSubText]}>
            Chapter {currentChapter}, Verse {currentVerse}
          </Text>
        </View>
        <View style={styles.gitaStats}>
          <Text style={[styles.gitaStatsNumber, !isDarkMode && styles.lightGitaStatsNumber]}>{unlockedShlokas}</Text>
          <Text style={[styles.gitaStatsLabel, !isDarkMode && styles.lightSubText]}>/ {totalShlokas}</Text>
        </View>
      </View>
      
      <View style={[styles.progressContainer, !isDarkMode && styles.lightProgressContainer]}>
        <View style={[styles.progressBar, !isDarkMode && styles.lightProgressBar]}>
          <View 
            style={[
              styles.progressFilled, 
              { width: `${progressPercentage}%` },
              !isDarkMode && styles.lightProgressFilled
            ]} 
          />
        </View>
        <Text style={[styles.progressText, !isDarkMode && styles.lightSubText]}>
          {progressPercentage}% Complete
        </Text>
      </View>
      
      <View style={styles.gitaMilestones}>
        <Text style={[styles.milestonesTitle, !isDarkMode && styles.lightSubText]}>Next Milestone</Text>
        <View style={styles.milestoneItem}>
          <View style={[styles.milestoneIcon, { borderColor: "grey" }]}>
            <Text style={styles.milestoneIconText}>📿</Text>
          </View>
          <View style={styles.milestoneText}>
            <Text style={[styles.milestoneTitle, !isDarkMode && styles.lightText]}>
              Chapter {currentChapter === 18 && currentVerse === 78 ? '1 (Restart)' : currentChapter + (currentVerse === chaptersAndVerses[currentChapter - 1] ? 1 : 0)} Complete
            </Text>
            <Text style={[styles.milestoneDesc, !isDarkMode && styles.lightSubText]}>
              {currentChapter === 18 && currentVerse === 78 
                ? 'You\'ve completed the entire Gita! Start a new journey.' 
                : `${currentVerse === chaptersAndVerses[currentChapter - 1] ? chaptersAndVerses[currentChapter] - currentVerse : chaptersAndVerses[currentChapter - 1] - currentVerse + 1} more tasks to unlock`
              }
            </Text>
          </View>
        </View>
      </View>
      
      {/* {unlockedShlokas > 0 && (
        <Pressable 
          style={[styles.gitaActionButton, !isDarkMode && styles.lightGitaActionButton]}
          onPress={() => {
            // Navigate to gita reader or show current shloka
            Alert.alert(
              `Chapter ${currentChapter}, Verse ${currentVerse - 1 > 0 ? currentVerse - 1 : currentVerse}`,
              'This would open your current shloka in the Gita reader.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={[styles.gitaActionText, !isDarkMode && styles.lightText]}>
            📖 Read Current Shloka
          </Text>
          <Feather name="chevron-right" size={16} color={isDarkMode ? "#fff" : "#000"} />
        </Pressable>
      )} */}
    </View>
  );
}

function Footer() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  const openLink = (url: string) => {
    // You'll need to import Linking from react-native and handle this
    console.log('Opening:', url);
  };
  
  return (
    <View style={[styles.footerContainer, !isDarkMode && styles.lightFooterContainer]}>
      {/* App Branding */}
      <View style={styles.footerBranding}>
        <Text style={[styles.footerAppName, !isDarkMode && styles.lightText]}>kriya</Text>
        <View style={styles.footerTagline}>
          <Text style={[styles.footerMadeIn, !isDarkMode && styles.lightSubText]}>Made with 🤍 in Bharāt</Text>
          <Text style={[styles.footerInspiration, !isDarkMode && styles.lightSubText]}>
            Inspired by the timeless wisdom of the Bhagavad Gita
          </Text>
        </View>
      </View>
      
      {/* Social Links */}
      <View style={styles.footerSocials}>
        <Text style={[styles.footerSocialTitle, !isDarkMode && styles.lightSubText]}>Connect</Text>
        <View style={styles.socialButtons}>
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://twitter.com/kriyaapp')}
          >
            <Feather name="twitter" size={18} color={isDarkMode ? "#1da1f2" : "#1da1f2"} />
          </Pressable>
          
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://github.com/kriyaapp')}
          >
            <Feather name="github" size={18} color={isDarkMode ? "#fff" : "#000"} />
          </Pressable>
          
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('mailto:hello@kriyaapp.com')}
          >
            <Feather name="mail" size={18} color={isDarkMode ? "#ff6b6b" : "#ff6b6b"} />
          </Pressable>
          
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://instagram.com/kriyaapp')}
          >
            <Feather name="instagram" size={18} color={isDarkMode ? "#e4405f" : "#e4405f"} />
          </Pressable>
        </View>
      </View>
      
      {/* App Info */}
      <View style={styles.footerInfo}>
        <Text style={[styles.footerVersion, !isDarkMode && styles.lightSubText]}>Version 1.0.0</Text>
        <View style={styles.footerLinks}>
          <Pressable onPress={() => openLink('https://kriyaapp.com/privacy')}>
            <Text style={[styles.footerLink, !isDarkMode && styles.lightFooterLink]}>Privacy Policy</Text>
          </Pressable>
          <Text style={[styles.footerDivider, !isDarkMode && styles.lightSubText]}>•</Text>
          <Pressable onPress={() => openLink('https://kriyaapp.com/terms')}>
            <Text style={[styles.footerLink, !isDarkMode && styles.lightFooterLink]}>Terms of Service</Text>
          </Pressable>
        </View>
      </View>
      
      {/* Quote */}
      <View style={styles.footerQuote}>
        <Text style={[styles.footerQuoteText, !isDarkMode && styles.lightSubText]}>
          "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"
        </Text>
        <Text style={[styles.footerQuoteTranslation, !isDarkMode && styles.lightSubText]}>
          You have the right to perform actions, but never to the fruits of action
        </Text>
      </View>
      
      {/* Copyright */}
      <View style={styles.footerCopyright}>
        <Text style={[styles.footerCopyrightText, !isDarkMode && styles.lightSubText]}>
          © 2024 Kriya. No rights reserved.
        </Text>
      </View>
    </View>
  );
}


export default function History() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const toggleDarkMode = useKriya(s => s.toggleDarkMode);

  return (
    <View style={[styles.container, !isDarkMode && styles.lightContainer]}>
      {/* BlurBackground */}
      <Animated.View style={[StyleSheet.absoluteFill]}>
        <BlurBackground />
      </Animated.View>

      {/* Linear Gradient Overlay with reduced opacity */}
      <LinearGradient
        colors={isDarkMode 
          ? ['rgba(52, 76, 103, 0.8)', 'rgba(0, 0, 0, 0.6)'] 
          : ['rgba(255, 255, 255, 0.3)', 'rgba(139, 165, 225, 0.4)']
        }
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeAreaContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <Feather name="arrow-left" size={24} color={isDarkMode ? "#fff" : "#000"} />
          </Pressable>
              <Text style={[styles.headerTitle, !isDarkMode && styles.lightText]}>My Journey</Text>
          <Pressable onPress={toggleDarkMode} hitSlop={16}>
            <Feather 
              name={isDarkMode ? "sun" : "moon"} 
              size={24} 
              color={isDarkMode ? "#fff" : "#000"} 
            />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Gita Progress */}
          <GitaProgress />
          
          {/* Main Calendar */}
          <MainCalendar />
          
          {/* Weekly Summary */}
          <WeeklySummary />
             {/* ADD: Notification Settings - Add this here */}
          <NotificationSettings />

            {/* Test Notification Button - Add this here */}
          <TestNotificationButton />

          {/* Quick Actions */}
          <QuickActions />
                    <Footer />

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ...existing code...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  safeAreaContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 30,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  lightText: {
    color: '#000',
  },
  lightSubText: {
    color: '#666',
  },
  
  // Calendar Section
  calendarSection: {
    marginBottom: 30,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  monthNavigation: {
    flexDirection: 'row',
    gap: 12,
  },
    toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  lightToggleActive: {
    backgroundColor: '#059669',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  section: {
    marginBottom: 30,
  },
  lightSection: {
    // Light mode specific styles if needed
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  notificationSettings: {
    gap: 8,
  },
    addTaskButton: {
    marginTop: 26,
    backgroundColor: '#111724ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 76, 103, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.3)',
  },
  lightSettingRow: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Space Mono',
  },
   timePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lightTimePickerModal: {
    backgroundColor: '#fff',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerContent: {
    marginBottom: 24,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerSection: {
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: '500',
  },
  timePickerScroll: {
    height: 100,
    width: 60,
  },
  timePickerOption: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  selectedTimePickerOption: {
    backgroundColor: '#3b82f6',
  },
  lightSelectedTimePickerOption: {
    backgroundColor: '#2563eb',
  },
  timePickerOptionText: {
    fontSize: 16,
    color: '#d1d5db',
    fontFamily: 'Space Mono',
  },
  selectedTimePickerOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  timePickerSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 12,
  },
  timePickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  timePickerSaveButton: {
    backgroundColor: '#3b82f6',
  },
  lightTimePickerSaveButton: {
    backgroundColor: '#2563eb',
  },
  timePickerCancelText: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  timePickerSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  navButton: {
    padding: 8,
  },
  weekLabels: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  weekLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: 'rgba(52, 76, 103, 0.4)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.3)',
    marginBottom: 16,
    gap: 4,
  },
  lightCalendarContainer: {
    backgroundColor: 'rgba(248, 248, 248, 0.4)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    position: 'relative',
  },
  dayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  activityIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  activityCount: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '600',
  },
  inactiveDay: {
    backgroundColor: 'transparent',
  },
  lightInactiveDay: {
    backgroundColor: 'transparent',
  },
  inactiveDayText: {
    color: '#444',
  },
  todayDay: {
    backgroundColor: '#7c9fb0',
  },
  todayText: {
    color: '#fff',
    fontWeight: '700',
  },
  noActivityDay: {
    backgroundColor: 'transparent',
  },
  lightNoActivityDay: {
    backgroundColor: 'transparent',
  },
  completedDay: {
    backgroundColor: '#8ba5e1',
  },
  highActivityDay: {
    backgroundColor: '#6b8db5',
  },
  partialDay: {
    backgroundColor: '#5a7a9a',
  },
  lowActivityDay: {
    backgroundColor: '#4a6b8a',
  },
  
  // Legend
  legend: {
    marginTop: 8,
  },
  legendTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#666',
    fontSize: 10,
  },
  legendNote: {
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
  },
  
  // Weekly Summary
  summarySection: {
    marginBottom: 30,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.4)',
  },
  lightCard: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  
  // Quick Actions
  actionsSection: {
    marginBottom: 20,
  },
  actionsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.4)',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  
  // Modal Styles
   modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'rgba(31, 54, 81, 1)',
    borderRadius: 16,
    padding: 20,
    width: width - 40,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.6)',
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lightModalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(224, 224, 224, 0.7)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: 'rgba(36, 60, 85, 0.8)',
    borderRadius: 12,
    padding: 16,
  },
  lightModalStats: {
    backgroundColor: '#f0f0f0',
  },
  modalStat: {
    alignItems: 'center',
  },
  modalStatValue: {
    color: '#8ba5e1',
    fontSize: 20,
    fontWeight: '600',
  },
  modalStatLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  tasksList: {
    maxHeight: 200,
  },
  tasksSection: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  completedTask: {
    backgroundColor: 'rgba(139, 165, 225, 0.15)',
  },
  pendingTask: {
    backgroundColor: 'rgba(136, 136, 136, 0.1)',
  },
  taskText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  pendingTaskText: {
    color: '#888',
  },
  noTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noTasksText: {
    color: '#dfdfdfff',
    fontSize: 12,
    marginTop: 12,
  },
  
  // Gita Progress Styles
  gitaSection: {
    marginBottom: 30,
    backgroundColor: 'rgba(52, 76, 103, 0.4)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.3)',
  },
  lightGitaSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  gitaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  gitaTitle: {
    flex: 1,
  },
  gitaTitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  gitaSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  gitaStats: {
    alignItems: 'flex-end',
  },
  gitaStatsNumber: {
    color: '#ff9500',
    fontSize: 24,
    fontWeight: '700',
  },
  lightGitaStatsNumber: {
    color: '#e67e00',
  },
  gitaStatsLabel: {
    color: '#888',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 20,
  },
  lightProgressContainer: {
    // Light mode specific styles if needed
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(36, 60, 85, 0.6)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  lightProgressBar: {
    backgroundColor: '#e0e0e0',
  },
  progressFilled: {
    height: '100%',
    backgroundColor: '#ff9500',
    borderRadius: 4,
  },
  lightProgressFilled: {
    backgroundColor: '#e67e00',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  gitaMilestones: {
    marginBottom: 16,
  },
  milestonesTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, 

  },
  milestoneIconText: {
    fontSize: 16,
  },
  milestoneText: {
    flex: 1,
  },
  milestoneTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  milestoneDesc: {
    color: '#888',
    fontSize: 12,
  },
  gitaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(36, 60, 85, 0.8)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.5)',
  },
  lightGitaActionButton: {
    backgroundColor: '#f0f0f0',
    borderColor: '#d0d0d0',
  },
  gitaActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
    footerContainer: {
    marginTop: 40,
    marginBottom: 20,
    paddingTop: 30,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93, 123, 158, 0.3)',
  },
  lightFooterContainer: {
    borderTopColor: 'rgba(224, 224, 224, 0.6)',
  },
  footerBranding: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerAppName: {
    color: '#fff',
    fontSize: 28,

    marginBottom: 8,
     fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
    letterSpacing: 0,
    fontWeight: '200',
  },
  footerTagline: {
    alignItems: 'center',
    gap: 4,
  },
  footerMadeIn: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  footerInspiration: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
  },
  footerSocials: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerSocialTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightSocialButton: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  footerInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerVersion: {
    color: '#666',
    fontSize: 11,
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    color: '#8ba5e1',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  lightFooterLink: {
    color: '#5a7a9a',
  },
  footerDivider: {
    color: '#666',
    fontSize: 12,
  },
  footerQuote: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  footerQuoteText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Kalam',
    marginBottom: 4,
  },
  footerQuoteTranslation: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
  },
  footerCopyright: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93, 123, 158, 0.2)',
  },
  footerCopyrightText: {
    color: '#555',
    fontSize: 10,
  },
   testSection: {
    marginBottom: 30,
  },
  testButton: {
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.4)',
  },
  lightTestButton: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testButtonDesc: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView, Alert, Dimensions, Modal, Platform, Linking, TouchableOpacity, Image } from 'react-native';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { Toast, ToastTitle, ToastDescription, useToast } from '@/components/ui/toast'; // Add this import


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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Add haptic feedback
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
            <Pressable 
            onPress={() => navigateMonth('prev')} 
            style={styles.navButton} 
            android_ripple={{ color: '#cccccc18', radius: 22 }} >
              <Feather name="chevron-left" size={20} color="#888" />
            </Pressable>
            <Pressable onPress={() => navigateMonth('next')} style={styles.navButton} android_ripple={{ color: '#cccccc18', radius: 22 }}>
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
android_ripple={{ color: '#cccccc18', radius: 25 }}
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
// Updated NotificationSettings component with native DateTimePicker
// Updated NotificationSettings component with proper Android handling
function NotificationSettings() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  const reminderTime = useKriya(s => s.reminderTime);
  const toggleNotifications = useKriya(s => s.toggleNotifications);
  const setReminderTime = useKriya(s => s.setReminderTime);
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const toast = useToast(); // Add toast hook

  // Initialize selectedTime with current reminder time
  useEffect(() => {
    const newTime = new Date();
    newTime.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    setSelectedTime(newTime);
  }, [reminderTime]);

  const showSuccessToast = (timeString: string) => {
    const newId = Math.random().toString();
    toast.show({
      id: newId,
      placement: 'bottom',
      duration: 3000,
      render: ({ id }) => {
        const uniqueToastId = 'toast-' + id;
        return (
          <Toast nativeID={uniqueToastId} action="success" variant="solid">
            <ToastTitle>Reminder Time Set!</ToastTitle>
            <ToastDescription>
              Your daily reminder is now set for {timeString}
            </ToastDescription>
          </Toast>
        );
      },
    });
  };

  const handleTimeChange = async (event: any, time?: Date) => {
    // Hide picker on Android when user interacts
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (time) {
      setSelectedTime(time);
      
      // Save the time immediately for both platforms
      const hours = time.getHours();
      const minutes = time.getMinutes();
      
      try {
        await setReminderTime(hours, minutes);
        
        // Format time for display in toast
        const timeString = time.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        
        console.log(`✅ Time updated to ${hours}:${minutes.toString().padStart(2, '0')}`);
        
        // Show success toast
        showSuccessToast(timeString);
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('❌ Failed to update reminder time:', error);
        
        // Show error toast
        const errorId = Math.random().toString();
        toast.show({
          id: errorId,
          placement: 'bottom',
          duration: 3000,
          render: ({ id }) => {
            const uniqueToastId = 'toast-' + id;
            return (
              <Toast nativeID={uniqueToastId} action="error" variant="solid">
                <ToastTitle>Failed to Set Time</ToastTitle>
                <ToastDescription>
                  Could not update your reminder time. Please try again.
                </ToastDescription>
              </Toast>
            );
          },
        });
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } else if (Platform.OS === 'android') {
      // User cancelled on Android
      console.log('User cancelled time picker on Android');
    }
  };

  const getDisplayTime = () => {
    return `${reminderTime.hour.toString().padStart(2, '0')}:${reminderTime.minute.toString().padStart(2, '0')}`;
  };

  const handleOpenTimePicker = () => {
    // Sync selectedTime with current reminderTime before opening picker
    const currentTime = new Date();
    currentTime.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    setSelectedTime(currentTime);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimePicker(true);
  };

  const handleToggleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleNotifications();
    
    // Show toast based on new state
    const newState = !notificationsEnabled; // Since toggle happens after this
    const toastId = Math.random().toString();
    
    toast.show({
      id: toastId,
      placement: 'bottom',
      duration: 2500,
      render: ({ id }) => {
        const uniqueToastId = 'toast-' + id;
        return (
          <Toast nativeID={uniqueToastId} action={newState ? "success" : "info"} variant="solid">
            <ToastTitle>
              {newState ? "Notifications Enabled" : "Notifications Disabled"}
            </ToastTitle>
            <ToastDescription>
              {newState 
                ? "You'll receive daily reminders to plan your day" 
                : "Daily reminders have been turned off"
              }
            </ToastDescription>
          </Toast>
        );
      },
    });
  };

  return (
    <View style={[styles.section, !isDarkMode && styles.lightSection]}>
      <Text style={[styles.sectionTitle, !isDarkMode && styles.lightText]}>Notification Settings</Text>
      
      <View style={styles.notificationSettings}>
        {/* Toggle Notifications */}
        <Pressable 
          style={[styles.settingRow, !isDarkMode && styles.lightSettingRow]}
          onPress={handleToggleNotifications}
          android_ripple={{ color: '#cccccc18' }}

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
            onPress={handleOpenTimePicker}
            android_ripple={{ color: '#cccccc18' }}
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
                {getDisplayTime()}
              </Text>
              <Feather name="chevron-right" size={16} color={isDarkMode ? '#9ca3af' : '#64748b'} />
            </View>
          </Pressable>
        )}
      </View>

      {/* Native Time Picker - unchanged */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.timePickerOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowTimePicker(false)} />
            <View style={[styles.nativeTimePickerModal, !isDarkMode && styles.lightNativeTimePickerModal]}>
              <Text style={[styles.timePickerTitle, !isDarkMode && styles.lightText]}>
                Set Reminder Time
              </Text>
              
              <View style={styles.nativeTimePickerContainer}>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.nativeTimePicker}
                  textColor={isDarkMode ? '#fff' : '#000'}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                />
              </View>

              <View style={styles.nativeTimePickerActions}>
                <Pressable 
                  onPress={() => setShowTimePicker(false)}
                  style={[styles.timePickerButton, styles.timePickerCancelButton]}
                >
                  <Text style={[styles.timePickerCancelText, !isDarkMode && { color: '#4b5563' }]}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={handleTimeChange}
            is24Hour={false}
          />
        )
      )}
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
          onPress={() => router.push('/add')}
          android_ripple={{ color: '#cccccc18' }}
        >
          <Feather name="plus-circle" size={24} color="#35E21B" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Add Tasks</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/focus')}
          android_ripple={{ color: '#cccccc18' }}

        >
          <Feather name="target" size={24} color="#00FFFF" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Focus Session</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/bookmarks')}
          android_ripple={{ color: '#cccccc18' }}
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
  const totalShlokas = 701;
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
    <View style={[styles.gitaProgressCard, !isDarkMode && styles.lightGitaSection]}>
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


// Add this new component after GitaProgress function
function ScripturesProgress() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const getTotalCompletedTasks = useKriya(s => s.getTotalCompletedTasks);
  
  const completedTasks = getTotalCompletedTasks ? getTotalCompletedTasks() : 0;
  
   const scriptures = [
    {
      id: 'bhagavad-gita',
      title: 'Bhagavad Gita',
      subtitle: 'Krishna & Arjuna',
      totalVerses: 701,
      isUnlocked: true,
      // Different images for dark and light mode
      darkImage: {uri: "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757921476/krishnarjuna_npvsot.webp"},
      lightImage: {uri: "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757921475/krishnarjunalight_fdqa8x.webp"},
      description: 'The eternal dialogue between Krishna and Arjuna',
      progress: Math.min(completedTasks, 701),
    },
    {
      id: 'ashtavakra-gita',
      title: 'Ashtavakra Gita',
      subtitle: 'Janaka & Ashtavakra',
      totalVerses: 298,
      isUnlocked: false,
      // Different images for dark and light mode
      darkImage: {uri: "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757921475/ashtavakra_gfmoqa.webp"},
      lightImage: {uri: "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757921475/ashtavakralight_qnuqgv.webp"},
      description: 'The profound dialogue on Advaita Vedanta',
      progress: 0,
      unlockRequirement: 'Complete Bhagavad Gita',
    },
    {
      id: 'Advaita-vedanta',
      title: 'Advaita Vedanta',
      subtitle: 'Shankaracharya',
      totalVerses: 32000,
      isUnlocked: false,
      // Different images for dark and light mode
      darkImage: {uri: "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757921476/shankara_j1k104.webp"},
      lightImage: {uri: "https://res.cloudinary.com/dztfsdmcv/image/upload/v1757921476/shankaralight_lid6ez.webp"},
      description: 'The non-dualistic philosophy of oneness',
      progress: 0,
      unlockRequirement: 'Complete Ashtavakra Gita',
    },
  ];

  const handleScripturePress = (scripture: any) => {
    if (scripture.isUnlocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Navigate to scripture reader
      // router.push(`/scripture/${scripture.id}`);
      console.log(`Opening ${scripture.title}`);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Show unlock requirement
      Alert.alert(
        `🔒 ${scripture.title}`,
        `This scripture will be unlocked when you ${scripture.unlockRequirement.toLowerCase()}.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[styles.scripturesSection, !isDarkMode && styles.lightGitaSection]}>
      <View style={styles.scripturesHeader}>
        <Text style={[styles.scripturesSectionTitle, !isDarkMode && styles.lightText]}>
          📚 Sacred Scriptures
        </Text>
        <Text style={[styles.scripturesSubtitle, !isDarkMode && styles.lightSubText]}>
          Your journey through ancient wisdom
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scripturesScrollContainer}
        style={styles.scripturesScroll}
      >
        {scriptures.map((scripture, index) => (
          <Pressable
            key={scripture.id}
            style={[
              styles.scriptureCard,
              !scripture.isUnlocked && styles.lockedScriptureCard,
              !isDarkMode && styles.lightScriptureCard
            ]}
            onPress={() => handleScripturePress(scripture)}
            android_ripple={{ 
              color: scripture.isUnlocked ? '#cccccc18' : '#ff000018' 
            }}
          >
            {/* Scripture Image */}
          <View style={styles.scriptureImageContainer}>
  <View style={[
    styles.scriptureImage,
    !scripture.isUnlocked && styles.lockedScriptureImage
  ]}>
    {/* Replace the placeholder with actual Image */}
   <Image
                  source={isDarkMode ? scripture.darkImage : scripture.lightImage}
                  style={styles.scriptureImageStyle}
                  resizeMode="cover"
                />
    
    {/* Lock Overlay */}
    {/* {!scripture.isUnlocked && (
      <View style={styles.lockOverlay}>
        <Feather name="lock" size={24} color="#fff" />
      </View>
    )} */}
  </View>
</View>

            {/* Scripture Info */}
            <View style={styles.scriptureInfo}>
              <Text style={[
                styles.scriptureTitle,
                !isDarkMode && styles.lightText,
                !scripture.isUnlocked && styles.lockedText
              ]}>
                {scripture.title}
              </Text>
              
              <Text style={[
                styles.scriptureSubtitle,
                !isDarkMode && styles.lightSubText,
                !scripture.isUnlocked && styles.lockedSubText
              ]}>
                {scripture.subtitle}
              </Text>

              <Text style={[
                styles.scriptureDescription,
                !isDarkMode && styles.lightSubText,
                !scripture.isUnlocked && styles.lockedSubText
              ]}>
                {scripture.description}
              </Text>

              {/* Progress Section */}
              {scripture.isUnlocked ? (
                <View style={styles.scriptureProgress}>
                  <View style={styles.scriptureProgressInfo}>
                    <Text style={[styles.scriptureProgressText, !isDarkMode && styles.lightText]}>
                      {scripture.progress} / {scripture.totalVerses}
                    </Text>
                    <Text style={[styles.scriptureProgressPercentage, !isDarkMode && styles.lightSubText]}>
                      {Math.round((scripture.progress / scripture.totalVerses) * 100)}%
                    </Text>
                  </View>
                  
                  <View style={[styles.scriptureProgressBar, !isDarkMode && styles.lightProgressBar]}>
                    <View 
                      style={[
                        styles.scriptureProgressFilled,
                        { width: `${(scripture.progress / scripture.totalVerses) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.unlockRequirement}>
                  <Feather name="info" size={12} color="#888" />
                  <Text style={[styles.unlockText, !isDarkMode && styles.lightSubText]}>
                    {scripture.unlockRequirement}
                  </Text>
                </View>
              )}

              {/* Action Button */}
              {scripture.isUnlocked && (
                <View style={styles.scriptureAction}>
                  <Feather name="book-open" size={16} color="#4a90e2" />
                  <Text style={styles.scriptureActionText}>Continue Reading</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Coming Soon Badge */}
      <View style={styles.comingSoonBadge}>
        <Text style={[styles.comingSoonText, !isDarkMode && styles.lightSubText]}>
          ✨ More scriptures coming soon
        </Text>
      </View>
    </View>
  );
}

function Footer() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  const openLink = (url: string) => {
    Linking.openURL(url); // Opens the provided URL
    console.log('Opening:', url);
  };
  
  return (
    <View style={[styles.footerContainer, !isDarkMode && styles.lightFooterContainer]}>
      {/* App Branding */}
      <View style={styles.footerBranding}>
        <Text style={[styles.footerAppName, !isDarkMode && styles.lightText]}>kriya</Text>

        <View style={styles.footerTagline}>
          <Text style={[styles.footerMadeIn, !isDarkMode && styles.lightSubText]}>Crafted with  {<AntDesign name="heart" size={15} color="#ff0044ff" />}  in Bharāt</Text>
          <Text style={[styles.footerInspiration, !isDarkMode && styles.lightSubText]}>
            Inspired by the timeless wisdom of the Bhagavad Gita
          </Text>
        </View>
      </View>
       {/* Feedback Form Button */}
      <View style={styles.feedbackSection}>
        <Pressable 
          style={[styles.feedbackButton, !isDarkMode && styles.lightFeedbackButton]}
          onPress={() => openLink('https://forms.gle/iLQH7vjNZuY27Du17')} // Replace with your Google Form link
          android_ripple={{ color: '#cccccc18'}}
        >
          <Feather name="message-square" size={20} color={isDarkMode ? "#fff" : "#000"} />
          <Text style={[styles.feedbackButtonText, !isDarkMode && styles.lightText]}>
            Share Feedback
          </Text>
        </Pressable>
      </View>
      {/* Social Links */}
      <View style={styles.footerSocials}>
        <Text style={[styles.footerSocialTitle, !isDarkMode && styles.lightSubText]}>Connect</Text>
        <View style={styles.socialButtons}>
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://twitter.com/SuryaS_1729')}
            android_ripple={{ color: '#cccccc18', radius: 22 }}
          >
            <Feather name="twitter" size={18} color={isDarkMode ? "#1da1f2" : "#1da1f2"} />
          </Pressable>
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('mailto:bitwisedharma@gmail.com')}
            android_ripple={{ color: '#cccccc18', radius: 22 }}
          >
            <Feather name="mail" size={18} color={isDarkMode ? "#ff6b6b" : "#ff6b6b"} />
          </Pressable>
          <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://github.com/SuryaS1729/kriya1')}
            android_ripple={{ color: '#cccccc18', radius: 22 }}
          >
            <Feather name="github" size={18} color={isDarkMode ? "#fff" : "#000"} />
          </Pressable>
          
          
          
          {/* <Pressable 
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://instagram.com/thebitwisedharma')}
          >
            <Feather name="instagram" size={18} color={isDarkMode ? "#e4405f" : "#e4405f"} />
          </Pressable> */}
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
      <StatusBar hidden= {true} />
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
          <Pressable onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            router.back();
                          }}   hitSlop={16}>
            <Feather name="arrow-left" size={24} color={isDarkMode ? "#fff" : "#000"} />
          </Pressable>
              <Text style={[styles.headerTitle, !isDarkMode && styles.lightText]}>My Journey</Text>
          <TouchableOpacity 
          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            toggleDarkMode();
                          }}  
          hitSlop={16} 
          activeOpacity={0.7}>
            <Feather 
              name={isDarkMode ? "sun" : "moon"} 
              size={24} 
              color={isDarkMode ? "#fff" : "#000"} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
   
          {/* Main Calendar */}
          <MainCalendar />
          
          {/* Weekly Summary */}
          <WeeklySummary />
           

          {/* Gita Progress */}
          <GitaProgress />

               {/* NEW: Scriptures Progress List */}
        <ScripturesProgress />
       
          {/* Quick Actions */}
          <QuickActions /> 
          
           {/* ADD: Notification Settings - Add this here */}
          <NotificationSettings />

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

  timePickerCancelText: {
    color: '#9ca3af',
    fontWeight: '500',
  },
   nativeTimePickerModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lightNativeTimePickerModal: {
    backgroundColor: '#fff',
  },
  nativeTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  nativeTimePicker: {
    width: 280,
    height: 120,
  },
  nativeTimePickerActions: {
    alignItems: 'center',
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
  gitaProgressCard: {
    marginBottom: 20, // Reduced margin since scriptures section follows
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
    fontSize: 48,
    marginBottom: 8, // Reduced margin to make room for company name
    fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
    letterSpacing: 0,
    fontWeight: '200',
  },
  footerCompany: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
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
   feedbackSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.4)',
    gap: 12,
  },
  lightFeedbackButton: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

   // New Scripture Styles
  scripturesSection: {
    marginBottom: 30,
    backgroundColor: 'rgba(52, 76, 103, 0.4)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.3)',
  },
  
  scripturesHeader: {
    marginBottom: 20,
  },
  
  scripturesSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  
  scripturesSubtitle: {
    color: '#888',
    fontSize: 14,
  },

  scripturesScroll: {
    marginHorizontal: -4,
  },

  scripturesScrollContainer: {
    paddingHorizontal: 4,
    gap: 16,
  },

  scriptureCard: {
    width: 280,
    backgroundColor: 'rgba(36, 60, 85, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(93, 123, 158, 0.4)',
    marginRight: 16,
  },

  lightScriptureCard: {
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },

  lockedScriptureCard: {
    opacity: 0.7,
    backgroundColor: 'rgba(36, 60, 85, 0.3)',
  },

  scriptureImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

// Add these new styles:
scriptureImageStyle: {
  width: 80,
  height: 80,
  borderRadius: 40,
},

scriptureImage: {
  position: 'relative',
  borderRadius: 40,
  overflow: 'hidden', // Important for circular clipping
},

lockedScriptureImage: {
  opacity: 0.5,
},

lockOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 40,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},

  scriptureInfo: {
    flex: 1,
  },

  scriptureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  scriptureSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },

  scriptureDescription: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },

  lockedText: {
    color: '#666',
  },

  lockedSubText: {
    color: '#555',
  },

  scriptureProgress: {
    marginBottom: 12,
  },

  scriptureProgressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  scriptureProgressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  scriptureProgressPercentage: {
    color: '#888',
    fontSize: 12,
  },

  scriptureProgressBar: {
    height: 4,
    backgroundColor: 'rgba(36, 60, 85, 0.6)',
    borderRadius: 2,
    overflow: 'hidden',
  },

  scriptureProgressFilled: {
    height: '100%',
    backgroundColor: '#4a90e2',
    borderRadius: 2,
  },

  unlockRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  unlockText: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
  },

  scriptureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scriptureActionText: {
    color: '#4a90e2',
    fontSize: 12,
    fontWeight: '500',
  },

  comingSoonBadge: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93, 123, 158, 0.2)',
  },

  comingSoonText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
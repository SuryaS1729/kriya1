import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView, Alert, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

function formatDay(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Day Detail Modal Component
function DayDetailModal({ date, onClose }: { date: Date | null; onClose: () => void }) {
  const getForDay = useKriya(s => s.getTasksForDay);
  const getFocusSessionsForDay = useKriya(s => s.getFocusSessionsForDay); // You'll need to add this to your store
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  if (!date) return null;
  
  const dayKey = getDateKey(date);
  const tasks = getForDay(dayKey);
  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);
  const focusSessions = getFocusSessionsForDay ? getFocusSessionsForDay(dayKey) : 0;
  const successRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
  
  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, !isDarkMode && styles.lightModalContent]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, !isDarkMode && styles.lightText]}>
            {date.toLocaleDateString(undefined, { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
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
                    <Feather name="check-circle" size={16} color="#00D4AA" />
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
            <Feather name="calendar" size={48} color="#444" />
            <Text style={[styles.noTasksText, !isDarkMode && styles.lightSubText]}>No tasks for this day</Text>
          </View>
        )}
      </View>
    </View>
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
      return [styles.todayDay, { backgroundColor: '#00D4AA' }];
    }
    
    if (!day.hasActivity) {
      return [styles.noActivityDay, !isDarkMode && styles.lightNoActivityDay];
    }
    
    // Calculate activity intensity based on both tasks and focus sessions
    const taskScore = day.total > 0 ? day.completionRate : 0;
    const focusScore = Math.min(day.focusSessions / 3, 1); // Normalize to 0-1 (3+ sessions = max)
    const combinedScore = (taskScore + focusScore) / 2;
    
    if (combinedScore >= 0.8) {
      return styles.completedDay;
    } else if (combinedScore >= 0.6) {
      return styles.highActivityDay;
    } else if (combinedScore >= 0.3) {
      return styles.partialDay;
    } else {
      return styles.lowActivityDay;
    }
  };

  const handleDayPress = (day: any) => {
    if (day.hasActivity && day.isCurrentMonth) {
      setSelectedDate(day.date);
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
                  disabled={!day.hasActivity || !day.isCurrentMonth}
                >
                  <Text style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.inactiveDayText,
                    day.isToday && styles.todayText,
                    !isDarkMode && day.isCurrentMonth && !day.isToday && styles.lightText
                  ]}>
                    {day.date.getDate()}
                  </Text>
                  {day.hasActivity && day.isCurrentMonth && (
                    <View style={styles.activityIndicator}>
                      <Text style={styles.activityCount}>
                        {day.completed > 0 && `${day.completed}t`}
                        {day.focusSessions > 0 && ` ${day.focusSessions}f`}
                      </Text>
                    </View>
                  )}
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
              <View style={[styles.legendDot, { backgroundColor: '#004D3D' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#007A5E' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>Medium</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00A678' }]} />
              <Text style={[styles.legendText, !isDarkMode && styles.lightSubText]}>High</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00D4AA' }]} />
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
          <Feather name="calendar" size={24} color="#00D4AA" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.activeDays}</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Active Days</Text>
        </View>
        
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="check-circle" size={24} color="#00D4AA" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.completedTasks}</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Tasks Done</Text>
        </View>
        
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="target" size={24} color="#00D4AA" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.totalFocusSessions}</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Focus Sessions</Text>
        </View>
        
        <View style={[styles.summaryCard, !isDarkMode && styles.lightCard]}>
          <Feather name="clock" size={24} color="#00D4AA" />
          <Text style={[styles.summaryValue, !isDarkMode && styles.lightText]}>{weeklyStats.focusTime}m</Text>
          <Text style={[styles.summaryLabel, !isDarkMode && styles.lightSubText]}>Focus Time</Text>
        </View>
      </View>
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
          <Feather name="plus-circle" size={24} color="#00D4AA" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Add Tasks</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/focus')}
        >
          <Feather name="target" size={24} color="#00D4AA" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Focus Session</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.actionButton, !isDarkMode && styles.lightCard]}
          onPress={() => router.push('/bookmarks')}
        >
          <MaterialIcons name="bookmark" size={24} color="#00D4AA" />
          <Text style={[styles.actionButtonText, !isDarkMode && styles.lightText]}>Bookmarks</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function History() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const toggleDarkMode = useKriya(s => s.toggleDarkMode);

  return (
    <SafeAreaView style={[styles.container, !isDarkMode && styles.lightContainer]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Feather name="arrow-left" size={24} color={isDarkMode ? "#fff" : "#000"} />
        </Pressable>
        <Text style={[styles.headerTitle, !isDarkMode && styles.lightText]}>Activity History</Text>
        <Pressable onPress={toggleDarkMode} hitSlop={16}>
          <Feather 
            name={isDarkMode ? "sun" : "moon"} 
            size={24} 
            color={isDarkMode ? "#fff" : "#000"} 
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Calendar */}
        <MainCalendar />
        
        {/* Weekly Summary */}
        <WeeklySummary />
        
        {/* Quick Actions */}
        <QuickActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginTop: 10,
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
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
    gap: 4, // Gap between weeks
  },
  lightCalendarContainer: {
    backgroundColor: '#f8f8f8',
    borderColor: '#e0e0e0',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4, // Gap between days
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
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
    backgroundColor: '#00D4AA',
  },
  todayText: {
    color: '#000',
    fontWeight: '700',
  },
  noActivityDay: {
    backgroundColor: 'transparent',
  },
  lightNoActivityDay: {
    backgroundColor: 'transparent',
  },
  completedDay: {
    backgroundColor: '#00D4AA',
  },
  highActivityDay: {
    backgroundColor: '#00A678',
  },
  partialDay: {
    backgroundColor: '#007A5E',
  },
  lowActivityDay: {
    backgroundColor: '#004D3D',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  lightCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    color: '#00D4AA',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: width - 40,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  lightModalContent: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
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
    backgroundColor: '#0f0f0f',
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
    color: '#00D4AA',
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
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
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
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
});
// app/history.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView, Alert, Dimensions } from 'react-native';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated';

function formatDay(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDateKey(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Activity Heatmap Component
function ActivityHeatmap() {
  const getForDay = useKriya(s => s.getTasksForDay);
  const isDarkMode = useKriya(s => s.isDarkMode);
  
  const activityData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90); // Last 90 days
    
    const data = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dayKey = getDateKey(d);
      const tasks = getForDay(dayKey);
      const completedCount = tasks.filter(t => t.completed).length;
      
      // Calculate intensity (0-4 scale like GitHub)
      let intensity = 0;
      if (completedCount > 0) intensity = 1;
      if (completedCount >= 3) intensity = 2;
      if (completedCount >= 5) intensity = 3;
      if (completedCount >= 8) intensity = 4;
      
      data.push({
        date: new Date(d),
        dayKey,
        completedCount,
        totalCount: tasks.length,
        intensity
      });
    }
    return data;
  }, [getForDay]);

  const weeks = useMemo(() => {
    const weekGroups: any[][] = [];
    let currentWeek: any[] = [];
    
    activityData.forEach((day, index) => {
      if (index === 0) {
        // Fill empty days at start of first week
        const dayOfWeek = day.date.getDay();
        for (let i = 0; i < dayOfWeek; i++) {
          currentWeek.push(null);
        }
      }
      
      currentWeek.push(day);
      
      if (currentWeek.length === 7) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add remaining days
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weekGroups.push(currentWeek);
    }
    
    return weekGroups;
  }, [activityData]);

  const getIntensityColor = (intensity: number) => {
    if (isDarkMode) {
      const colors = ['#4b5563', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6'];
      return colors[intensity] || colors[0];
    } else {
      const colors = ['#f1f5f9', '#c7d2fe', '#818cf8', '#4338ca', '#312e81'];
      return colors[intensity] || colors[0];
    }
  };

  const showDayDetails = (day: any) => {
    if (!day) return;
    
    const dateStr = day.date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const message = `${dateStr}\n\n${day.completedCount} of ${day.totalCount} tasks completed`;
    
    Alert.alert('Daily Progress', message, [{ text: 'OK' }]);
  };

  const totalCompleted = activityData.reduce((sum, day) => sum + day.completedCount, 0);
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].completedCount > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [activityData]);

  const themeStyles = isDarkMode ? darkHeatmapStyles : lightHeatmapStyles;

  return (
    <View style={[styles.heatmapContainer, themeStyles.heatmapContainer]}>
      <View style={styles.heatmapHeader}>
        <Text style={[styles.heatmapTitle, themeStyles.heatmapTitle]}>Your journey so far</Text>
        <View style={styles.statsRow}>
          <Text style={[styles.statText, themeStyles.statText]}>{totalCompleted} tasks completed</Text>
          <Text style={[styles.statText, themeStyles.statText]}>{currentStreak} day streak</Text>
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
        <View style={styles.heatmap}>
          <View style={styles.weekLabels}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Text key={i} style={[styles.weekLabel, themeStyles.weekLabel]}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.weeksContainer}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.week}>
                {week.map((day, dayIndex) => (
                  <Pressable
                    key={dayIndex}
                    onPress={() => showDayDetails(day)}
                    disabled={!day}
                    style={[
                      styles.daySquare,
                      day && { backgroundColor: getIntensityColor(day.intensity) }
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.legend}>
        <Text style={[styles.legendText, themeStyles.legendText]}>Less</Text>
        {[0, 1, 2, 3, 4].map(intensity => (
          <View
            key={intensity}
            style={[styles.legendSquare, { backgroundColor: getIntensityColor(intensity) }]}
          />
        ))}
        <Text style={[styles.legendText, themeStyles.legendText]}>More</Text>
      </View>
    </View>
  );
}

export default function History() {
  const listDays = useKriya(s => s.listHistoryDays);
  const getForDay = useKriya(s => s.getTasksForDay);
  const isDarkMode = useKriya(s => s.isDarkMode);
  const toggleDarkMode = useKriya(s => s.toggleDarkMode);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const days = useMemo(() => listDays(60), [listDays]);

  const renderDay = ({ item }: { item: { day_key: number; count: number } }) => {
    const isOpen = !!expanded[item.day_key];
    const tasks: Task[] = isOpen ? getForDay(item.day_key) : [];
    const themeStyles = isDarkMode ? darkStyles : lightStyles;

    return (
      <View style={[styles.section, themeStyles.section]}>
        <Pressable onPress={() => setExpanded(s => ({ ...s, [item.day_key]: !s[item.day_key] }))} style={styles.header}>
          <Text style={[styles.headerText, themeStyles.headerText]}>{formatDay(item.day_key)}</Text>
          <Text style={[styles.headerMeta, themeStyles.headerMeta]}>{item.count} task{item.count !== 1 ? 's' : ''} • {isOpen ? 'Hide' : 'Show'}</Text>
        </Pressable>

        {isOpen && tasks.map(t => (
          <View key={t.id} style={styles.row}>
            <View style={[styles.dot, t.completed ? styles.dotOn : styles.dotOff]} />
            <Text style={[styles.title, t.completed && styles.done, themeStyles.title]} numberOfLines={2}>{t.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const themeStyles = isDarkMode ? darkStyles : lightStyles;

  return (
    <SafeAreaView style={[styles.container, themeStyles.container]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text style={[styles.headerIcon, themeStyles.headerIcon]}>✕</Text>
        </Pressable>
        <Pressable onPress={toggleDarkMode} hitSlop={16} style={[styles.darkModeToggle, themeStyles.darkModeToggle]}>
          <Feather 
            name={isDarkMode ? "sun" : "moon"} 
            size={20} 
            color={isDarkMode ? "#fbbf24" : "#6b7280"} 
          />
        </Pressable>
      </View>
      
      <Text style={[styles.h1, themeStyles.h1]}>Hey There !</Text>
      
      <ActivityHeatmap />

      <FlatList
        data={days}
        keyExtractor={(d) => String(d.day_key)}
        renderItem={renderDay}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  h1: { fontSize: 22, fontWeight: '700', marginVertical: 12 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  headerMeta: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#22c55e' },
  dotOff: { backgroundColor: '#cbd5e1' },
  title: { flex: 1, fontSize: 16 },
  done: { opacity: 0.6, textDecorationLine: 'line-through' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 20,
  },
  headerIcon: { fontSize: 22, fontWeight: '700' },
  darkModeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Heatmap styles
  heatmapContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  heatmapHeader: {
    marginBottom: 12,
  },
  heatmapTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
  },
  heatmapScroll: {
    marginBottom: 12,
  },
  heatmap: {
    flexDirection: 'row',
    gap: 8,
  },
  weekLabels: {
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  weekLabel: {
    fontSize: 9,
    textAlign: 'center',
    height: 12,
    lineHeight: 12,
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  week: {
    gap: 2,
  },
  daySquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#4b5563',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  legendText: {
    fontSize: 9,
    marginHorizontal: 2,
  },
  legendSquare: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },
});

// Light theme styles
const lightStyles = StyleSheet.create({
  container: { backgroundColor: 'white' },
  h1: { color: '#111827' },
  headerIcon: { color: '#545454' },
  darkModeToggle: { backgroundColor: '#f1f5f9' },
  section: { borderBottomColor: '#e5e7eb' },
  headerText: { color: '#0f172a' },
  headerMeta: { color: '#64748b' },
  title: { color: '#111827' },
});

// Dark theme styles
const darkStyles = StyleSheet.create({
  container: { backgroundColor: '#1f2937' },
  h1: { color: '#f9fafb' },
  headerIcon: { color: '#d1d5db' },
  darkModeToggle: { backgroundColor: '#374151' },
  section: { borderBottomColor: '#374151' },
  headerText: { color: '#f9fafb' },
  headerMeta: { color: '#9ca3af' },
  title: { color: '#f9fafb' },
});

// Heatmap theme styles
const lightHeatmapStyles = StyleSheet.create({
  heatmapContainer: { backgroundColor: '#f8fafc' },
  heatmapTitle: { color: '#54647dff' },
  statText: { color: '#64748b' },
  weekLabel: { color: '#64748b' },
  legendText: { color: '#64748b' },
});

const darkHeatmapStyles = StyleSheet.create({
  heatmapContainer: { backgroundColor: '#374151' },
  heatmapTitle: { color: '#f9fafb' },
  statText: { color: '#d1d5db' },
  weekLabel: { color: '#d1d5db' },
  legendText: { color: '#d1d5db' },
});

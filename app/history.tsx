// app/history.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView, Alert, Dimensions } from 'react-native';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Link } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
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
    const colors = ['#f1f5f9', '#c7d2fe', '#818cf8', '#4338ca', '#312e81'];
    return colors[intensity] || colors[0];
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

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmapHeader}>
        <Text style={styles.heatmapTitle}>Your Journey</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{totalCompleted} tasks completed</Text>
          <Text style={styles.statText}>{currentStreak} day streak</Text>
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
        <View style={styles.heatmap}>
          <View style={styles.weekLabels}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Text key={i} style={styles.weekLabel}>{day}</Text>
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
        <Text style={styles.legendText}>Less</Text>
        {[0, 1, 2, 3, 4].map(intensity => (
          <View
            key={intensity}
            style={[styles.legendSquare, { backgroundColor: getIntensityColor(intensity) }]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

export default function History() {
  const listDays = useKriya(s => s.listHistoryDays);
  const getForDay = useKriya(s => s.getTasksForDay);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const days = useMemo(() => listDays(60), [listDays]);

  const renderDay = ({ item }: { item: { day_key: number; count: number } }) => {
    const isOpen = !!expanded[item.day_key];
    const tasks: Task[] = isOpen ? getForDay(item.day_key) : [];

    return (
      <View style={styles.section}>
        <Pressable onPress={() => setExpanded(s => ({ ...s, [item.day_key]: !s[item.day_key] }))} style={styles.header}>
          <Text style={styles.headerText}>{formatDay(item.day_key)}</Text>
          <Text style={styles.headerMeta}>{item.count} task{item.count !== 1 ? 's' : ''} • {isOpen ? 'Hide' : 'Show'}</Text>
        </Pressable>

        {isOpen && tasks.map(t => (
          <View key={t.id} style={styles.row}>
            <View style={[styles.dot, t.completed ? styles.dotOn : styles.dotOff]} />
            <Text style={[styles.title, t.completed && styles.done]} numberOfLines={2}>{t.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.headerIcon}>✕</Text>
        </Pressable>
        <Link href="/read" asChild>
          <Pressable hitSlop={16}>
            <FontAwesome5 name="scroll" size={20} color="white" />
          </Pressable>
        </Link>
      </View>
      
      <Text style={styles.h1}>History</Text>
      
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
  container: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16 },
  h1: { fontSize: 22, fontWeight: '700', marginVertical: 12 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb', paddingVertical: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  headerText: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  headerMeta: { fontSize: 12, color: '#64748b' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#22c55e' },
  dotOff: { backgroundColor: '#cbd5e1' },
  title: { flex: 1, fontSize: 16, color: '#111827' },
  done: { opacity: 0.6, textDecorationLine: 'line-through' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 20,
  },
  headerIcon: { color: '#545454', fontSize: 22, fontWeight: '700' },
  
  // Heatmap styles
  heatmapContainer: {
    backgroundColor: '#f8fafc',
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
    color: '#1e293b',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
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
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  legendText: {
    fontSize: 9,
    color: '#64748b',
    marginHorizontal: 2,
  },
  legendSquare: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },
});

// app/index.tsx
import { Link } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Layout,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

function Checkbox({ completed }: { completed: boolean }) {
  // You can tweak these values to change the animation
  const springConfig = { stiffness: 900, damping: 30, mass: 1 };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withSpring(completed ? '#AADBA3' : 'white', springConfig),
      borderColor: withSpring(completed ? '#AADBA3' : '#e2e8f0', springConfig),
    };
  });

  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(completed ? 1 : 0, springConfig) }],
      opacity: withSpring(completed ? 1 : 0, springConfig),
    };
  });

  return (
    <Animated.View style={[styles.checkbox, animatedStyle]}>
      <AnimatedFeather
        name="check"
        size={14}
        color="white"
        style={checkmarkStyle}
      />
    </Animated.View>
  );
}

export default function Home() {
  const ready     = useKriya(s => s.ready);
  const tasks     = useKriya(s => s.tasksToday);
  const getShloka = useKriya(s => s.currentShloka); // returns { index, data }
  const toggle    = useKriya(s => s.toggleTask);
  const remove    = useKriya(s => s.removeTask);
  const insets    = useSafeAreaInsets();

  // Only compute shloka after store is ready
  const { index: shlokaIndex, data: shloka } = ready ? getShloka() : { index: 0, data: null as any };

  // State for toggling between Sanskrit and English
  const [showTranslation, setShowTranslation] = useState(false);

  // Fade animation for shloka card
  const fade = useSharedValue(0);
  useEffect(() => {
    if (!ready || !shloka) return;
    fade.value = 0;
    fade.value = withSpring(1);
  }, [ready, shloka, fade, showTranslation]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  const handleTogglePress = () => {
    setShowTranslation(!showTranslation);
  };

  // Add this sorted tasks computation
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  }, [tasks]);

  const renderItem = ({ item }: { item: Task }) => (
    <Animated.View 
      layout={LinearTransition
        .duration(100)
        .springify()
        .delay(50)
      }
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          toggle(item.id);
        }}
        onLongPress={() => remove(item.id)}
        style={styles.row}
      >
        <Checkbox completed={item.completed} />
        <Text style={[styles.title, item.completed ? styles.done : undefined]} numberOfLines={1}>
          {item.title}
        </Text>
      </Pressable>
    </Animated.View>
  );

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Minimal skeleton while DB/store warm up
  if (!ready || !shloka) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="auto" />
        <View style={[styles.card, { height: 240, opacity: 0.5, backgroundColor: '#111827' }]} />
        <View style={styles.tasksContainer}>
          <Text style={styles.h1}>Today</Text>
          <View style={[styles.row, { opacity: 0.5 }]}>
            <View style={[styles.checkbox, styles.checkboxOff]} />
            <View style={{ flex: 1, height: 18, backgroundColor: '#eee', borderRadius: 4 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#ffffffff', '#9FABC8']}
      style={[styles.container]}
    >
      <StatusBar style="light" />
      
      <View style={[styles.topHalf, { paddingTop: insets.top }]}>
        {/* Shloka Card */}
        
             <View style={styles.card}>
                    <View style={styles.headerSection}>
                      <Text style={styles.meta}>
                        Adhyaya {shloka.chapter_number}, Shloka {shloka.verse_number}
                      </Text>
                    </View>

            <Link
            href={{ pathname: '/shloka/[id]', params: { id: String(shlokaIndex) } }}
            asChild
          >
          <Pressable style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.View style={[fadeStyle, styles.contentSection]}>
                          {showTranslation ? (
                            <Text style={styles.en}>
                              {shloka.translation_2 || shloka.description || 'No translation available'}
                            </Text>
                          ) : (
                            <Text style={styles.sa}>{shloka.text}</Text>
                          )}
                    </Animated.View>
 </Pressable>
        </Link>
                    <Pressable onPress={() => setShowTranslation(!showTranslation)}>
                        <Animated.View style={styles.toggleButton} layout={LinearTransition.springify()}>
                       <Text style={styles.toggleText}>
                         {showTranslation ? 'View Sanskrit' : 'View Translation'}
                         </Text>
                         </Animated.View>
                  </Pressable>
              </View>
        
      </View>

      {/* Tasks Section */}
      <View style={[styles.tasksContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.tasksHeader}>
          <Text style={styles.h1}>Today's Tasks</Text>
          <Link href="/history" asChild>
          <Pressable><Text style={{ color: '#2563eb' }}>Yesterday & History →</Text></Pressable>
        </Link>
        </View>
        
        
        <FlatList
          data={sortedTasks}  // <- Change this from tasks to sortedTasks
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.tasksList}
          
        />
        <Link href="/add" asChild>
              <Pressable style={styles.addTaskButton}>
                
                <Feather style={{backgroundColor:'grey', borderRadius:50,}} name="plus" size={25} color="white" />
                <Text style={styles.addTaskText}>Add a task . . .</Text>
              </Pressable>
            </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  topHalf: {
    flex: 1,
    justifyContent: 'center',


    paddingHorizontal: 16,
    paddingVertical:0
  },
  card: {
    alignItems: 'center',
    justifyContent: 'space-between', // This will create maximum space between children
    height: 300,
    borderRadius: 16,
    paddingTop: 20,
    paddingHorizontal: 13,
    paddingBottom: 10,



  },
  headerSection: {
    width: '100%',
    marginBottom: 10,
    alignItems:'center',

    // Add significant bottom margin to create space
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
marginTop: 20,


  
 // Add some top padding for additional spacing
  },
  meta: { 
    fontFamily:"SourceSerifPro",

    fontSize: 23,
fontStyle: 'italic',
    color: '#545454',

    // letterSpacing: 0.5,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#ffffffff',
    overflow: 'hidden',
    marginTop: 0, 
    // Important for reanimated layout animations
  },
  toggleText: {
    color: '#000000ff',
    fontSize: 12,
    fontWeight: '600',
  },
  sa: { 
  
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: '#565657ff',
    textAlign: 'center',
    fontFamily:"Samanya",
    fontWeight:"100",
    fontStyle:"normal",
    paddingTop: 10,
    


  },
  en: { 
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: '#434343ff',
    textAlign: 'center',
    fontFamily:"Alegreya",
    fontWeight:"400",
    fontStyle:"normal"
  },
  tasksContainer: {
    flex: 1.37,
    backgroundColor: 'white',
    borderTopLeftRadius: 41,
    borderTopRightRadius: 43,
    paddingTop: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  h1: { 
    fontSize: 20, 
    fontWeight: '700',
    color: '#0f172a',
  },
  tasksList: {
    flexGrow: 1,
    padding: 10,
    

  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 0.7,
    borderBottomColor: '#f1f5f9',
  },
  title: { 
    flex: 1, 
    fontSize: 18, 
    color: '#000000ff',
    marginLeft: 12,
    fontFamily:"SourceSerifPro",
    fontWeight:"300",
    fontStyle:"normal"

  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: { 
    backgroundColor: '#AADBA3', 
    borderColor: '#AADBA3',
  },
  checkboxOff: { 
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  done: { 
    color: '#94a3b8', 
    textDecorationLine: 'line-through' 
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 14,
    paddingHorizontal: 11,
    marginTop: 30,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'white',
    backgroundColor: 'white',
  },
  addTaskText: {
    marginLeft: 12,
    fontSize: 17,
    color: '#64748b',
  },
});

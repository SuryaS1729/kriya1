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
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';

const AnimatedFeather = Animated.createAnimatedComponent(Feather);

function Checkbox({ completed }: { completed: boolean }) {
  const progress = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(completed ? 1 : 0, {
      stiffness: 600,
      damping: 25,
      mass: 1,
    });
  }, [completed]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['white', '#AADBA3']
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ['#e2e8f0', '#AADBA3']
      ),
    };
  });

  const checkmarkStyle = useAnimatedStyle(() => {
    // Only show checkmark when progress is > 0.7 (background is mostly filled)
    const checkOpacity = interpolate(progress.value, [0, 0.7, 1], [0, 0, 1]);
    const checkScale = interpolate(progress.value,[0, 0.7, 0.9, 1], [0, 0, 1.3, 1]);
    
    return {
      opacity: checkOpacity,
      transform: [{ scale: checkScale }],
    };
  });

  return (
    <Animated.View style={[styles.checkbox, animatedStyle]}>
      {completed && (
        <AnimatedFeather
          name="check"
          size={14}
          color="white"
          style={checkmarkStyle}
        />
      )}
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

  // Fix the sorted tasks computation
  const sortedTasks = useMemo(() => {
    const incomplete = tasks.filter(t => !t.completed).reverse(); // Newest incomplete first
    const completed = tasks.filter(t => t.completed).reverse();   // Newest completed first
    return [...incomplete, ...completed]; // Incomplete tasks first, then completed
  }, [tasks]);

  const renderItem = ({ item }: { item: Task }) => (
    <Animated.View 
      layout={LinearTransition
        .duration(300)
        .springify()
        .delay(200)
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
      <StatusBar style="dark" />
      
      <View style={[styles.topHalf, { paddingTop: insets.top }]}>
        {/* Shloka Card */}
        
             <View style={styles.card}>
                    {/* Add the mandala background */}
                    {/* <View style={styles.mandalaContainer}>
                      <Mandala size={250} opacity={0.08} />
                    </View>
                     */}
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
                            <View style ={styles.englishSection}>
                            <Text style={[styles.en, {lineHeight:(shloka.translation_2 || "").length < 350 ? 24 : 18,}, ]} adjustsFontSizeToFit>
                              {shloka.translation_2 || shloka.description || 'No translation available'}
                            </Text>
                            </View>
                          ) : (<View >
                            <Text style={[styles.sa, {lineHeight:(shloka.translation_2 || "").length < 90 ? 24 : 20,},]}adjustsFontSizeToFit>{shloka.text}</Text>
                          </View>
                          )}
                    </Animated.View>
 </Pressable>
        </Link>
                    <Pressable onPress={() => setShowTranslation(!showTranslation)}>
                        <Animated.View style={styles.toggleButton}>
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
          {/* <Link href="/history" asChild>
          <Pressable><Text style={{ color: '#7493d7ff' }}>Yesterday & History →</Text></Pressable>
        </Link> */}
         <Link href="/history" asChild>
            <Pressable style={styles.profileButton}>
              <Feather name="user" size={20} color="#7493d7ff" />
            </Pressable>
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
                <View style={styles.addTaskIcon}>
                  <Feather name="plus" size={20} color="#606060" />
                </View>
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
    marginBottom: 0,
    alignItems:'center',
    // backgroundColor:"yellow"

    // Add significant bottom margin to create space
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',

    paddingTop: 20,
marginTop: 20,
paddingBottom: 20,
// backgroundColor:'white'



  
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
  englishSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',

    paddingHorizontal: 16,
    paddingBottom: 0,
    paddingTop: 10,

    // backgroundColor: 'red'
  },
   profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 0,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 20,
    // backgroundColor:'red'
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
    marginLeft:3
  },
  h1: { 
    fontSize: 17, 
    fontWeight: '700',
    color: '#848fa9ff',
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
    borderBottomWidth: 0.6,
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
    borderRadius: 3,
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
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'white',
    backgroundColor: '#efefef37',
    marginLeft:-5.8
  },
  addTaskText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#64748b',
      fontFamily:"SpaceMono",
    fontWeight:"400",
    fontStyle:"normal"
  },
  addTaskIcon: {
    width: 32, // Make it bigger than checkbox (20px)
    height: 32, // Make it bigger than checkbox (20px)
    backgroundColor: '#E6E6E6',
    borderRadius: 16, // Half of width/height for perfect circle
    justifyContent: 'center',
    alignItems: 'center',
  },
  mandalaContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
  },
});

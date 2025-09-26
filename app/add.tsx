import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  BackHandler,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../components/TopBar';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate
} from 'react-native-reanimated';
import { InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mediumImpactHaptic, selectionHaptic, errorHaptic } from '../lib/haptics';


// Create animated Feather component
const AnimatedFeather = Animated.createAnimatedComponent(Feather);

const HEADER_HEIGHT = 54; // approx TopBar height (tweak if needed)

export default function Add() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Reanimated shared value for rotation
  const rotationValue = useSharedValue(0);

  const tasksToday = useKriya(s => s.tasksToday);
  const addTask    = useKriya(s => s.addTask);
  const toggle     = useKriya(s => s.toggleTask);
  const remove     = useKriya(s => s.removeTask);
  const isDarkMode = useKriya(s => s.isDarkMode);

  // Calculate dynamic placeholder text
  const placeholderText = useMemo(() => {
    return tasksToday.length > 6 ? "Easy there, overachiever 😅" : "Fulfill your dharma today 🏹";
  }, [tasksToday.length]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Animate rotation when text changes
  useEffect(() => {
    rotationValue.value = withSpring(text.length > 0 ? 1 : 0, {
      damping: 9,
      stiffness: 300,
      mass: 0.3
    });
  }, [text]);

  // Animated style for rotation
  const animatedIconStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      rotationValue.value,
      [0, 1],
      [0, -90] // Rotate from 0° to -90° (right arrow becomes up arrow)
    );
    
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const addAndStay=()=> {
    mediumImpactHaptic(); // More reliable haptic

    const t = text.trim();
    if (!t) return;
    addTask(t);
    setText('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }
  function addAndStayOrGoHome() {
  const t = text.trim();
  if (!t) {
    // If empty, go back to homescreen
    doneAndClose();
    return;
  }
  // If not empty, add task and stay
  addTask(t);
  setText('');
  setTimeout(() => {
    inputRef.current?.focus();
  }, 0);
}
  
  function doneAndClose() {
    Keyboard.dismiss();
    router.back();
  }


  const remaining = useMemo(
    () => tasksToday.filter(t => !t.completed).length,
    [tasksToday]
  );

  const renderItem = ({ item }: { item: Task }) => (
    <Pressable
      onPress={() => {
        selectionHaptic(); // Add haptic feedback
        toggle(item.id);
      }}
      onLongPress={() => {
        errorHaptic(); // Different haptic for delete
        remove(item.id);
      }}
      style={[styles.row, { borderBottomColor: isDarkMode ? '#374151' : '#f1f5f9' }]}
      android_ripple={{ color: '#eeeeee1c' }}
    >
      <View style={[
        styles.checkbox, 
        item.completed 
          ? [
              styles.checkboxOn,
              // Different green shades for dark/light mode
              { backgroundColor: isDarkMode ? '#65a25cff' : '#AADBA3' }
            ]
          : [
              styles.checkboxOff,
              isDarkMode && { backgroundColor: '#4b5563', borderColor: '#6b7280' }
            ]
      ]}>
        {item.completed && (
          <Feather
            name="check"
            size={14}
          color={isDarkMode ? "#17481bff" : "#ffffff"}
          />
        )}
      </View>
      <Text style={[
        styles.title, 
        { color: item.completed 
          ? (isDarkMode ? '#94a3b8' : '#94a3b8')  // Same gray for completed tasks
          : (isDarkMode ? '#f9fafb' : '#111827')   // Different colors for active tasks
        },
        item.completed && { textDecorationLine: 'line-through' }
      ]} numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Add gradient background */}
      <LinearGradient 
        colors={isDarkMode ? ['#031d31e7', '#000000ff'] : ['#ffffffff', '#f0f2f8ff']} 
        style={StyleSheet.absoluteFill} 
      />
      
      
      <KeyboardAvoidingView
        behavior="padding"
  keyboardVerticalOffset={0} // Remove all offset
  style={{ flex: 1 }}
>
        <TopBar
          title="Quick Add"
          variant="close"
          right={<Pressable onPress={doneAndClose}><Text style={[styles.link, { color: isDarkMode ? '#60a5fa' : '#2563eb' }]}></Text></Pressable>}
          isDarkMode={isDarkMode}
        />

        {/* Main content column: list grows, input bar sits at the bottom */}
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={[styles.subhead, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
              Today • {tasksToday.length} total, {remaining} remaining
            </Text>
          </View>

          <FlatList
          
            data={[...tasksToday].reverse()}
            keyExtractor={t => String(t.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: isDarkMode ? '#1a2535ff' : '#f1f5f9' }]} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                {/* <Feather name="sunrise" size={48} color={isDarkMode ? "#6b7280" : "#cbd5e1"} /> */}
                <Text style={[
                  styles.emptyStateTitle,
                  { color: isDarkMode ? '#9ca3af' : '#64748b' }
                ]}>It's a Fresh Start</Text>
                <View style={{ height: 16 }}></View>
                <Text style={[
                  styles.emptyStateSubtitle,
                  { color: isDarkMode ? '#6b7280' : '#94a3b8' }
                ]}>
                  add your tasks for today!
                </Text>
              </View>
            )}
            contentContainerStyle={{  
              flexGrow: 1,
              padding: 12,  
              paddingBottom: 16 + 56 + insets.bottom  
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          />

          {/* INPUT BAR — stays at the bottom, lifted by KeyboardAvoidingView */}
          <View style={[
            styles.inputBar,
            { 
              backgroundColor: 'transparent', // Make transparent to show gradient
              paddingBottom: 8
            }
          ]}>
            <TouchableOpacity activeOpacity={0.8} onPress={addAndStay}>
              <View style={[
                styles.addTaskIcon,
                { backgroundColor: isDarkMode ? '#0a3a4bff' : '#ebebebff' }
              ]}>
                <AnimatedFeather 
                  name="arrow-right" 
                  size={25} 
                  color={isDarkMode ? '#ffffffff' : '#606060ff'} 
                  style={animatedIconStyle}
                />
              </View>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={placeholderText}
              style={[styles.input, { color: isDarkMode ? '#f9fafb' : '#111827' }]}
              returnKeyType="done"
              onSubmitEditing={addAndStayOrGoHome}
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              blurOnSubmit={false}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  subhead: { color: '#64748b' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, paddingHorizontal: 16 },
  checkbox: { 
    width: 18, 
    height: 18, 
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxOn: {  backgroundColor: '#AADBA3' },
  checkboxOff: { backgroundColor: '#cbd5e1' },
  title: { 
    flex: 1, 
    fontSize: 18, 
    color: '#111827',
    fontFamily:"Source Serif Pro",
    fontWeight:"300",
    fontStyle:"normal" },
  done: { opacity: 0.6, textDecorationLine: 'line-through',    color: '#94a3b8', 
 },
  sep: { height: 0.5, backgroundColor: '#f1f5f9', marginLeft: 16 },

  // bottom input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent', // Changed from white to transparent
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
    gap:8,
    marginBottom:0

  
  },
  input: {
    flex:1,
    fontSize: 16,
    borderWidth: 0,
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',

    paddingHorizontal: 12,
    paddingVertical: 15,
    color:"#111827",

  },
  // addBtn: {
  //   alignSelf: 'flex-end',
  //   marginTop: 8,
  //   backgroundColor: '#111827',
  //   paddingHorizontal: 14,
  //   paddingVertical: 10,
  //   borderRadius: 10,
  // },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', fontSize: 16 },
  addTaskIcon: {
    width: 40, // Make it bigger than checkbox (20px)
    height: 40, // Make it bigger than checkbox (20px)
    backgroundColor: '#E6E6E6',
    borderRadius: 20, // Half of width/height for perfect circle
    justifyContent: 'center',
    alignItems: 'center',

  },
   tasksList: {
    flexGrow: 1,
    padding: 10,
    

  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    marginTop: 50,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "Kalam",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: "Source Serif Pro",
    fontWeight:"300",

  },
});


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

  // Calculate dynamic placeholder text
  const placeholderText = useMemo(() => {
    return tasksToday.length > 6 ? "Easy there, overachiever 😅" : "Fulfill your dharma today... Parth!";
  }, [tasksToday.length]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  //    const interaction = InteractionManager.runAfterInteractions(() => {
  //   inputRef.current?.focus();
  // });
  
  // return () => interaction.cancel();
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

  function addAndStay() {
    const t = text.trim();
    if (!t) return;
    addTask(t);
    setText('');
    // requestAnimationFrame(() => inputRef.current?.focus());
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
      onPress={() => toggle(item.id)}
      onLongPress={() => remove(item.id)}
      style={styles.row}
      android_ripple={{ color: '#eee' }}
    >
      <View style={[styles.checkbox, item.completed ? styles.checkboxOn : styles.checkboxOff]}>
        {item.completed && (
          <Feather
            name="check"
            size={14}
            color="white"
          />
        )}
      </View>
      <Text style={[styles.title, item.completed && styles.done]} numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <KeyboardAvoidingView
        // iOS uses 'padding' (best), Android prefers 'height' to avoid jumpiness
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        // Offset by the custom header height so iOS calculates correctly
        keyboardVerticalOffset={Platform.OS === 'ios' ?  HEADER_HEIGHT + insets.top : 0}
        style={{ flex: 1 }}
      >
        <TopBar
          title="Quick Add"
          variant="close"
          right={<Pressable onPress={doneAndClose}><Text style={styles.link}>Done</Text></Pressable>}
        />

        {/* Main content column: list grows, input bar sits at the bottom */}
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text style={styles.subhead}>
              Today • {tasksToday.length} total, {remaining} remaining
            </Text>
          </View>

          <FlatList
            // data={tasksToday}
            data={[...tasksToday].reverse()}
            keyExtractor={t => String(t.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            // Give the list bottom padding so last items aren't hidden behind the input bar
            contentContainerStyle={{  flexGrow: 1,padding: 12,  paddingBottom: 16 + 56 + insets.bottom  }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          />

          {/* INPUT BAR — stays at the bottom, lifted by KeyboardAvoidingView */}
          <View style={[styles.inputBar, { paddingBottom: 8}]}>
            <Pressable onPress={addAndStay}>
            <View style={styles.addTaskIcon}>
              <AnimatedFeather 
                name="arrow-right" 
                size={22} 
                color="#606060ff" 
                style={animatedIconStyle}
              />
            </View>
            </Pressable>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={placeholderText}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={addAndStay}
              placeholderTextColor="#9ca3af"
                blurOnSubmit={false} // Add this - prevents keyboard from closing on submit

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
  checkboxOn: { backgroundColor: '#AADBA3' },
  checkboxOff: { backgroundColor: '#cbd5e1' },
  title: { 
    flex: 1, 
    fontSize: 18, 
    color: '#111827',
    fontFamily:"SourceSerifPro",
    fontWeight:"300",
    fontStyle:"normal" },
  done: { opacity: 0.6, textDecorationLine: 'line-through',    color: '#94a3b8', 
 },
  sep: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 },

  // bottom input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'white', // Change from pink to white
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb', // Change from red to gray
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
    borderRadius: 30, // Half of width/height for perfect circle
    justifyContent: 'center',
    alignItems: 'center',
  },
   tasksList: {
    flexGrow: 1,
    padding: 10,
    

  },
});

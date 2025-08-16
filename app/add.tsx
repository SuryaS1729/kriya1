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

const HEADER_HEIGHT = 54; // approx TopBar height (tweak if needed)

export default function Add() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const tasksToday = useKriya(s => s.tasksToday);
  const addTask    = useKriya(s => s.addTask);
  const toggle     = useKriya(s => s.toggleTask);
  const remove     = useKriya(s => s.removeTask);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  function addAndStay() {
    const t = text.trim();
    if (!t) return;
    addTask(t);
    setText('');
    requestAnimationFrame(() => inputRef.current?.focus());
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
      <View style={[styles.checkbox, item.completed ? styles.checkboxOn : styles.checkboxOff]} />
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT + insets.top : 0}
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
            data={tasksToday}
            keyExtractor={t => String(t.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            // Give the list bottom padding so last items aren't hidden behind the input bar
            contentContainerStyle={{ paddingBottom: 16 + 56 + insets.bottom }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          />

          {/* INPUT BAR — stays at the bottom, lifted by KeyboardAvoidingView */}
          <View style={[styles.inputBar, { paddingBottom: 8 + insets.bottom }]}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Add a task…"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={addAndStay}
            />
            {/* <Pressable style={styles.addBtn} onPress={addAndStay}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable> */}
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
  checkbox: { width: 18, height: 18, borderRadius: 4 },
  checkboxOn: { backgroundColor: '#22c55e' },
  checkboxOff: { backgroundColor: '#cbd5e1' },
  title: { flex: 1, fontSize: 16, color: '#111827' },
  done: { opacity: 0.6, textDecorationLine: 'line-through' },
  sep: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 },

  // bottom input bar
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ffffffff',
  },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', fontSize: 16 },
});

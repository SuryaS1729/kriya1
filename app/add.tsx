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
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/TopBar';
import { useKriya } from '../lib/store';
import type { Task } from '../lib/tasks';

export default function Add() {
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

  function addAndKeepOpen() {
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TopBar
          title="Quick Add"
          variant="close"
          right={
            <Pressable onPress={doneAndClose}>
              <Text style={styles.link}>Done</Text>
            </Pressable>
          }
        />

        <View style={styles.body}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Add a task…"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={addAndKeepOpen}
          />

          <Pressable style={styles.addBtn} onPress={addAndKeepOpen}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.subhead}>
            Today • {tasksToday.length} total, {remaining} remaining
          </Text>

          <FlatList
            data={tasksToday}
            keyExtractor={t => String(t.id)}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, flex: 1 },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', fontSize: 16 },
  subhead: { color: '#64748b', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4 },
  checkboxOn: { backgroundColor: '#22c55e' },
  checkboxOff: { backgroundColor: '#cbd5e1' },
  title: { flex: 1, fontSize: 16, color: '#111827' },
  done: { opacity: 0.6, textDecorationLine: 'line-through' },
  sep: { height: 1, backgroundColor: '#f1f5f9' },
});

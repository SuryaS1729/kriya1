// app/add.tsx
import { router } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useKriya } from '../lib/store';

export default function Add() {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const addTask = useKriya(s => s.addTask);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function save() {
    const t = text.trim();
    if (!t) return;
    addTask(t);       // writes to DB + updates store
    Keyboard.dismiss();
    router.back();    // Home is already updated via Zustand subscription
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.link}>Cancel</Text></Pressable>
        <Text style={styles.title}>New Task</Text>
        <Pressable onPress={save}><Text style={styles.link}>Save</Text></Pressable>
      </View>
      <View style={styles.body}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onSubmitEditing={save}
          placeholder="What do you need to do?"
          style={styles.input}
          returnKeyType="done"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb'
  },
  link: { color: '#2563eb', fontSize: 16, paddingVertical: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { padding: 16 },
  input: { fontSize: 18, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 },
});

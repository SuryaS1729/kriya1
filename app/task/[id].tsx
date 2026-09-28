import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from "@react-native-vector-icons/feather/static";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TopBar } from '../../components/TopBar';
import { useKriya } from '../../lib/store';
import {
  getTaskById,
  updateTaskDescription,
  updateTaskTitle,
  type Task,
} from '../../lib/tasks';
import { buttonPressHaptic, selectionHaptic } from '../../lib/haptics';

export default function TaskDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const taskId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const isDarkMode = useKriya(s => s.isDarkMode);
  const refresh = useKriya(s => s.refresh);

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loadedId, setLoadedId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!Number.isFinite(taskId)) return;
    const found = getTaskById(taskId);
    setTask(found);
    if (found) {
      setTitle(found.title);
      setDescription(found.description ?? '');
      setLoadedId(found.id);
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        // Persist anything still in flight, then let the lists behind us resync.
        Keyboard.dismiss();
        refresh();
      };
    }, [load, refresh])
  );

  const onTitleChange = (text: string) => {
    setTitle(text);
    const trimmed = text.trim();
    if (trimmed.length > 0) updateTaskTitle(taskId, trimmed);
  };

  const onDescriptionChange = (text: string) => {
    setDescription(text);
    updateTaskDescription(taskId, text);
  };

  const startFocus = () => {
    buttonPressHaptic();
    router.push({
      pathname: '/focus',
      params: {
        id: String(taskId),
        title: title.trim().length > 0 ? title.trim() : (task?.title ?? ''),
      },
    });
  };

  const notFound = loadedId !== null && task === null;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient
        colors={isDarkMode ? ['#031d31e7', '#000000ff'] : ['#ffffffff', '#f0f2f8ff']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <TopBar title="Task" variant="back" isDarkMode={isDarkMode} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
        >
          {notFound ? (
            <View style={styles.missingWrap}>
              <Feather name="alert-circle" size={22} color={isDarkMode ? '#6b7280' : '#94a3b8'} />
              <Text style={[styles.missingText, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                This task no longer exists.
              </Text>
            </View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(120)}>
                <Text style={[styles.label, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                  Title
                </Text>
                <TextInput
                  value={title}
                  onChangeText={onTitleChange}
                  placeholder="Untitled task"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[
                    styles.titleInput,
                    { color: isDarkMode ? '#f9fafb' : '#111827' },
                  ]}
                  multiline
                  onFocus={() => selectionHaptic()}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(120).delay(60)}>
                <Text style={[styles.label, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={onDescriptionChange}
                  placeholder="Add a description…"
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  style={[
                    styles.descriptionInput,
                    { color: isDarkMode ? '#e5e7eb' : '#334155' },
                  ]}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => selectionHaptic()}
                />
              </Animated.View>
            </>
          )}
        </ScrollView>

        {!notFound && (
          <View style={[styles.footer, { paddingBottom: 12 }]}>
            <Pressable
              onPress={startFocus}
              style={({ pressed }) => [
                styles.focusButton,
                { backgroundColor: isDarkMode ? '#1e3a5f' : '#1d4ed8', opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="zap" size={18} color="#ffffff" />
              <Text style={styles.focusButtonText}>Focus</Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 26,
    lineHeight: 34,
    fontFamily: 'Source Serif Pro',
    fontWeight: '400',
    paddingVertical: 4,
  },
  descriptionInput: {
    fontSize: 17,
    lineHeight: 26,
    fontFamily: 'Source Serif Pro',
    fontWeight: '300',
    minHeight: 160,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 14,
    gap: 8,
  },
  focusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Source Serif Pro',
  },
  missingWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  missingText: {
    fontSize: 15,
    fontFamily: 'Source Serif Pro',
  },
});

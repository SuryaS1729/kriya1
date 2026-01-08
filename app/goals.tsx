import { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Pressable, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useKriya, type Goal } from '../lib/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { buttonPressHaptic, selectionHaptic, errorHaptic, taskCompleteHaptic } from '../lib/haptics';

export default function Goals() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const goals = useKriya(s => s.goals);
  const addGoal = useKriya(s => s.addGoal);
  const removeGoal = useKriya(s => s.removeGoal);
  const updateGoal = useKriya(s => s.updateGoal);
  const refreshGoals = useKriya(s => s.refreshGoals);
  
  const [newGoal, setNewGoal] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Load goals on mount
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      taskCompleteHaptic();
      addGoal(newGoal.trim());
      setNewGoal('');
    }
  };

  const handleDeleteGoal = (id: number, title: string) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            errorHaptic();
            removeGoal(id);
          }
        }
      ]
    );
  };

  const handleStartEdit = (goal: Goal) => {
    selectionHaptic();
    setEditingId(goal.id);
    setEditText(goal.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editText.trim()) {
      taskCompleteHaptic();
      updateGoal(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    selectionHaptic();
    setEditingId(null);
    setEditText('');
  };

  return (
    <LinearGradient
      colors={isDarkMode 
        ? ['#1a2634', '#0a0f14'] 
        : ['#f8fafc', '#e2e8f0']
      }
      style={styles.container}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => {
              buttonPressHaptic();
              router.back();
            }} 
            hitSlop={16}
          >
            <Feather name="arrow-left" size={24} color={isDarkMode ? "#fff" : "#000"} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#000' }]}>
            Long Term Goals
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
            Note down your longer-term aspirations and goals. These stay here permanently until you remove them.
          </Text>
        </View>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Goals List */}
          <ScrollView 
            style={styles.goalsList}
            contentContainerStyle={styles.goalsListContent}
            showsVerticalScrollIndicator={false}
          >
            {goals.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="target" size={48} color={isDarkMode ? '#4b5563' : '#cbd5e1'} />
                <Text style={[styles.emptyTitle, { color: isDarkMode ? '#9ca3af' : '#64748b' }]}>
                  No goals yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#6b7280' : '#94a3b8' }]}>
                  Add your first long-term goal below
                </Text>
              </View>
            ) : (
              goals.map((goal) => (
                <View 
                  key={goal.id} 
                  style={[
                    styles.goalItem, 
                    { 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      borderColor: isDarkMode ? '#374151' : '#e2e8f0'
                    }
                  ]}
                >
                  {editingId === goal.id ? (
                    // Editing mode
                    <View style={styles.editContainer}>
                      <TextInput
                        style={[
                          styles.editInput,
                          { 
                            color: isDarkMode ? '#fff' : '#000',
                            backgroundColor: isDarkMode ? '#374151' : '#f1f5f9',
                            borderColor: isDarkMode ? '#4b5563' : '#cbd5e1'
                          }
                        ]}
                        value={editText}
                        onChangeText={setEditText}
                        autoFocus
                        multiline
                      />
                      <View style={styles.editActions}>
                        <TouchableOpacity 
                          onPress={handleCancelEdit}
                          style={[styles.editButton, styles.cancelButton]}
                        >
                          <Feather name="x" size={18} color="#ef4444" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={handleSaveEdit}
                          style={[styles.editButton, styles.saveButton]}
                        >
                          <Feather name="check" size={18} color="#10b981" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Display mode
                    <>
                      <Text style={[styles.goalText, { color: isDarkMode ? '#f3f4f6' : '#1f2937' }]}>
                        {goal.title}
                      </Text>
                      <View style={styles.goalActions}>
                        <TouchableOpacity 
                          onPress={() => handleStartEdit(goal)}
                          hitSlop={8}
                          style={styles.actionButton}
                        >
                          <Feather name="edit-2" size={16} color={isDarkMode ? '#9ca3af' : '#64748b'} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => handleDeleteGoal(goal.id, goal.title)}
                          hitSlop={8}
                          style={styles.actionButton}
                        >
                          <Feather name="trash-2" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Add Goal Input */}
          <View style={[
            styles.inputContainer,
            { 
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e2e8f0'
            }
          ]}>
            <TextInput
              style={[
                styles.input,
                { color: isDarkMode ? '#fff' : '#000' }
              ]}
              placeholder="Add a new goal..."
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              value={newGoal}
              onChangeText={setNewGoal}
              onSubmitEditing={handleAddGoal}
              returnKeyType="done"
            />
            <TouchableOpacity 
              onPress={handleAddGoal}
              disabled={!newGoal.trim()}
              style={[
                styles.addButton,
                { 
                  backgroundColor: newGoal.trim() 
                    ? (isDarkMode ? '#3b82f6' : '#2563eb')
                    : (isDarkMode ? '#374151' : '#e2e8f0')
                }
              ]}
            >
              <Feather 
                name="plus" 
                size={20} 
                color={newGoal.trim() ? '#fff' : (isDarkMode ? '#6b7280' : '#9ca3af')} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  goalsList: {
    flex: 1,
  },
  goalsListContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  goalText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
  },
  actionButton: {
    padding: 4,
  },
  editContainer: {
    flex: 1,
    gap: 12,
  },
  editInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
  },
  saveButton: {
    backgroundColor: '#ecfdf5',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

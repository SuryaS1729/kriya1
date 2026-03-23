import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { PressableScale } from 'pressto';

import type { ReminderStep as ReminderStepType, Theme } from '../../lib/onboarding/constants';
import { buttonPressHaptic } from '../../lib/haptics';

type ReminderSlideProps = {
  step: ReminderStepType;
  theme: Theme;
  isDarkMode: boolean;
  selectedTime: Date;
  showPicker: boolean;
  onTimeChange: (event: DateTimePickerEvent, time?: Date) => void;
  onOpenTimePicker: () => void;
};

export default function ReminderSlide({
  step,
  theme,
  isDarkMode,
  selectedTime,
  showPicker,
  onTimeChange,
  onOpenTimePicker,
}: ReminderSlideProps) {
  const getReminderTime = () => {
    const reminderTime = new Date(selectedTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 10);
    return reminderTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDisplayTime = () =>
    selectedTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <View style={styles.container}>
      <Feather name="bell" size={60} color={theme.text} style={styles.icon} />

      <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>

      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {step.description}
      </Text>

      <View
        style={[
          styles.timePickerContainer,
          {
            backgroundColor: theme.timePickerBackground,
            borderColor: theme.borderSecondary,
          },
        ]}
      >
        <Text style={[styles.timePickerLabel, { color: theme.text }]}>
          I usually start my day at:
        </Text>

        {Platform.OS === 'ios' ? (
          <View style={styles.iosTimePickerContainer}>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="compact"
              onChange={onTimeChange}
              style={styles.iosTimePicker}
              textColor={theme.text}
              themeVariant={isDarkMode ? 'dark' : 'light'}
            />
          </View>
        ) : (
          <View style={styles.androidTimePickerContainer}>
            <PressableScale
              onPress={() => {
                buttonPressHaptic();
                onOpenTimePicker();
              }}
              rippleColor="transparent"
              style={[
                styles.androidTimeButton,
                {
                  backgroundColor: theme.selectedTimeBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.androidTimeText, { color: theme.text }]}>
                {getDisplayTime()}
              </Text>
              <Feather name="clock" size={20} color={theme.text} />
            </PressableScale>

            {showPicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                onChange={onTimeChange}
                is24Hour={false}
              />
            )}
          </View>
        )}

        <Text style={[styles.reminderNote, { color: theme.textQuaternary }]}>
          You&apos;ll receive a reminder at {getReminderTime()} (10 minutes before)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
  },
  icon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Instrument Serif',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Source Serif Pro',
    marginBottom: 10,
  },
  timePickerContainer: {
    borderRadius: 16,
    padding: 24,
    marginVertical: 32,
    borderWidth: 1,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Source Serif Pro',
    lineHeight: 28,
  },
  iosTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iosTimePicker: {
    width: 320,
    height: 120,
  },
  androidTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  androidTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 160,
    minHeight: 48,
  },
  androidTimeText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Space Mono',
    marginRight: 12,
  },
  reminderNote: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
    lineHeight: 18,
    paddingHorizontal: 10,
    marginTop: 16,
  },
});

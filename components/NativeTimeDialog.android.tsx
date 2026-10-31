import { Host, TimePickerDialog } from '@expo/ui/jetpack-compose';

type Props = {
  value: Date;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  is24Hour?: boolean;
  accentColor?: string;
  dark?: boolean;
};

const buildEvent = (date: Date) => ({
  nativeEvent: { timestamp: date.getTime(), utcOffset: -date.getTimezoneOffset() },
});

/**
 * Android native time dialog — Material3 TimePickerDialog inside a Host.
 * The Host forces the app's own color scheme (instead of the system
 * wallpaper palette) and the dialog surface is themed via elementColors.
 */
export function NativeTimeDialog({ value, onValueChange, onDismiss, is24Hour, accentColor, dark }: Props) {
  return (
    <Host colorScheme={dark ? 'dark' : 'light'} seedColor={accentColor}>
      <TimePickerDialog
        initialDate={value.toISOString()}
        is24Hour={is24Hour}
        color={accentColor}
        elementColors={{
          containerColor: dark ? '#101f2e' : '#ffffff',
          clockDialColor: dark ? '#18323e' : '#eef5f8',
          clockDialSelectedContentColor: dark ? '#06232a' : '#ffffff',
          clockDialContentColor: dark ? '#e2f1f3' : '#2b4971',
          selectorColor: accentColor,
          periodSelectorBorderColor: dark ? '#22333a' : '#e2e8f0',
          periodSelectorSelectedContainerColor: accentColor,
          periodSelectorContainerColor: dark ? '#18323e' : '#eef5f8',
          periodSelectorSelectedContentColor: dark ? '#06232a' : '#ffffff',
          periodSelectorContentColor: dark ? '#e2f1f3' : '#2b4971',
          timeSelectorSelectedContainerColor: accentColor,
          timeSelectorSelectedContentColor: dark ? '#06232a' : '#ffffff',
          timeSelectorContainerColor: dark ? '#18323e' : '#eef5f8',
          timeSelectorContentColor: dark ? '#e2f1f3' : '#2b4971',
        }}
        onDateSelected={(date) => onValueChange(buildEvent(date), date)}
        onDismissRequest={onDismiss}
      />
    </Host>
  );
}

import { DateTimePicker } from '@expo/ui/community/datetime-picker';

type Props = {
  value: Date;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  is24Hour?: boolean;
  accentColor?: string;
  dark?: boolean;
};

/** Web fallback — community time picker. */
export function NativeTimeDialog({ value, onValueChange, onDismiss, is24Hour, accentColor, dark }: Props) {
  return (
    <DateTimePicker
      value={value}
      mode="time"
      display="default"
      onValueChange={onValueChange}
      onDismiss={onDismiss}
      is24Hour={is24Hour}
      accentColor={accentColor}
      themeVariant={dark ? 'dark' : 'light'}
    />
  );
}

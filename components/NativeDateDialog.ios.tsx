import { DateTimePicker } from '@expo/ui/community/datetime-picker';

type Props = {
  value: Date;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  minimumDate?: Date;
  accentColor?: string;
  dark?: boolean;
};

/** iOS / web fallback — community date picker (dialog presentation is Android-only). */
export function NativeDateDialog({ value, onValueChange, onDismiss, minimumDate, accentColor, dark }: Props) {
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="default"
      onValueChange={onValueChange}
      onDismiss={onDismiss}
      minimumDate={minimumDate}
      accentColor={accentColor}
      themeVariant={dark ? 'dark' : 'light'}
    />
  );
}

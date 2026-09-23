import { Host, DatePickerDialog } from '@expo/ui/jetpack-compose';

type Props = {
  value: Date;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  minimumDate?: Date;
  accentColor?: string;
  dark?: boolean;
};

const buildEvent = (date: Date) => ({
  nativeEvent: { timestamp: date.getTime(), utcOffset: -date.getTimezoneOffset() },
});

/**
 * Android native date dialog — Material3 DatePickerDialog inside a Host.
 * Unlike the community wrapper, the Host forces the app's own color scheme
 * (instead of the system wallpaper palette) and the dialog surface is
 * themed via elementColors.
 */
export function NativeDateDialog({ value, onValueChange, onDismiss, minimumDate, accentColor, dark }: Props) {
  return (
    <Host colorScheme={dark ? 'dark' : 'light'} seedColor={accentColor}>
      <DatePickerDialog
        initialDate={value.toISOString()}
        color={accentColor}
        elementColors={{ containerColor: dark ? '#101f2e' : '#ffffff' }}
        selectableDates={minimumDate ? { start: minimumDate } : undefined}
        onDateSelected={(date) => onValueChange(buildEvent(date), date)}
        onDismissRequest={onDismiss}
      />
    </Host>
  );
}

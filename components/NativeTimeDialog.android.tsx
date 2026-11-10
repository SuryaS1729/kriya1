import { Host, TimePickerDialog } from '@expo/ui/jetpack-compose';

type Props = {
  value: Date;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  is24Hour?: boolean;
  accentColor?: string;
  dark?: boolean;
  /** 'teal' matches the onboarding aesthetic; default keeps the app-wide look. */
  palette?: 'default' | 'teal';
};

const buildEvent = (date: Date) => ({
  nativeEvent: { timestamp: date.getTime(), utcOffset: -date.getTimezoneOffset() },
});

/**
 * Android native time dialog — Material3 TimePickerDialog inside a Host.
 * The Host forces the app's own color scheme (instead of the system
 * wallpaper palette) and the dialog surface is themed via elementColors.
 */
// Onboarding palette: deep teal surfaces, aqua accent, no navy or wallpaper tones.
const TEAL = {
  dark: {
    accent: '#3cc8c8',
    container: '#0b2a30',
    surface: '#12404a',
    border: '#1d5560',
    onAccent: '#042f2e',
    text: '#d6f1f0',
  },
  light: {
    accent: '#0e7490',
    container: '#f2fafa',
    surface: '#d9eff0',
    border: '#b5dcde',
    onAccent: '#ffffff',
    text: '#134e4a',
  },
};

function tealElementColors(dark: boolean) {
  const c = dark ? TEAL.dark : TEAL.light;
  return {
    accent: c.accent,
    elementColors: {
      containerColor: c.container,
      clockDialColor: c.surface,
      clockDialSelectedContentColor: c.onAccent,
      clockDialContentColor: c.text,
      selectorColor: c.accent,
      periodSelectorBorderColor: c.border,
      periodSelectorSelectedContainerColor: c.accent,
      periodSelectorContainerColor: c.surface,
      periodSelectorSelectedContentColor: c.onAccent,
      periodSelectorContentColor: c.text,
      timeSelectorSelectedContainerColor: c.accent,
      timeSelectorSelectedContentColor: c.onAccent,
      timeSelectorContainerColor: c.surface,
      timeSelectorContentColor: c.text,
    },
  };
}

export function NativeTimeDialog({ value, onValueChange, onDismiss, is24Hour, accentColor, dark, palette = 'default' }: Props) {
  if (palette === 'teal') {
    const teal = tealElementColors(!!dark);
    return (
      <Host colorScheme={dark ? 'dark' : 'light'} seedColor={teal.accent}>
        <TimePickerDialog
          initialDate={value.toISOString()}
          is24Hour={is24Hour}
          color={teal.accent}
          elementColors={teal.elementColors}
          onDateSelected={(date) => onValueChange(buildEvent(date), date)}
          onDismissRequest={onDismiss}
        />
      </Host>
    );
  }

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

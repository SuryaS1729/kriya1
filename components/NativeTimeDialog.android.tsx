import { Host, TimePickerDialog } from '@expo/ui/jetpack-compose';

type Props = {
  value: Date;
  onValueChange: (event: any, date: Date) => void;
  onDismiss: () => void;
  is24Hour?: boolean;
  accentColor?: string;
  dark?: boolean;
  /** 'slate' matches the onboarding reminder page; default keeps the app-wide look. */
  palette?: 'default' | 'slate';
};

const buildEvent = (date: Date) => ({
  nativeEvent: { timestamp: date.getTime(), utcOffset: -date.getTimezoneOffset() },
});

/**
 * Android native time dialog — Material3 TimePickerDialog inside a Host.
 * The Host forces the app's own color scheme (instead of the system
 * wallpaper palette) and the dialog surface is themed via elementColors.
 */
// Onboarding palette: the reminder page sits on the slate-blue gradient
// (#2e455f -> black) that bridges into the home screen, so the dialog uses
// muted slate surfaces with a soft blue-grey accent instead of teal.
const SLATE = {
  dark: {
    accent: '#a9bfd8',
    container: '#18222f',
    surface: '#24344a',
    border: '#344a63',
    onAccent: '#132030',
    text: '#e4ebf3',
  },
  light: {
    accent: '#2b4971',
    container: '#f5f7fb',
    surface: '#e2e8f3',
    border: '#ced7ec',
    onAccent: '#ffffff',
    text: '#2b4971',
  },
};

function slateElementColors(dark: boolean) {
  const c = dark ? SLATE.dark : SLATE.light;
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
  if (palette === 'slate') {
    const slate = slateElementColors(!!dark);
    return (
      <Host colorScheme={dark ? 'dark' : 'light'} seedColor={slate.accent}>
        <TimePickerDialog
          initialDate={value.toISOString()}
          is24Hour={is24Hour}
          color={slate.accent}
          elementColors={slate.elementColors}
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

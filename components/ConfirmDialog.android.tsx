import { AlertDialog, Host, Text, TextButton } from '@expo/ui/jetpack-compose';

import type { ConfirmDialogProps } from './ConfirmDialog';

const DARK = {
  container: '#101f2e',
  title: '#f9fafb',
  body: '#9ca3af',
  cancel: '#9db4b8',
  accent: '#8ea0b5',
};

const LIGHT = {
  container: '#ffffff',
  title: '#111827',
  body: '#475569',
  cancel: '#18464a',
  accent: '#18464a',
};

const DESTRUCTIVE = '#ef4444';

/**
 * Android destructive-action confirmation rendered with the native Material 3
 * AlertDialog. Colors are explicit so the dialog follows the app theme rather
 * than Material You's wallpaper palette.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  isDarkMode,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const palette = isDarkMode ? DARK : LIGHT;
  const confirmColor = destructive ? DESTRUCTIVE : palette.accent;

  return (
    <Host colorScheme={isDarkMode ? 'dark' : 'light'} style={{ width: 0, height: 0 }}>
      {visible ? (
        <AlertDialog
          colors={{
            containerColor: palette.container,
            titleContentColor: palette.title,
            textContentColor: palette.body,
            iconContentColor: palette.body,
          }}
          properties={{ dismissOnBackPress: false, dismissOnClickOutside: false }}
          onDismissRequest={onCancel}>
          <AlertDialog.Title>
            <Text color={palette.title}>{title}</Text>
          </AlertDialog.Title>
          {message ? (
            <AlertDialog.Text>
              <Text color={palette.body}>{message}</Text>
            </AlertDialog.Text>
          ) : null}
          <AlertDialog.DismissButton>
            <TextButton
              onClick={onCancel}
              colors={{ contentColor: palette.cancel }}>
              <Text color={palette.cancel}>{cancelLabel}</Text>
            </TextButton>
          </AlertDialog.DismissButton>
          <AlertDialog.ConfirmButton>
            <TextButton
              onClick={onConfirm}
              colors={{ contentColor: confirmColor }}>
              <Text color={confirmColor} style={{ fontWeight: '600' }}>
                {confirmLabel}
              </Text>
            </TextButton>
          </AlertDialog.ConfirmButton>
        </AlertDialog>
      ) : null}
    </Host>
  );
}

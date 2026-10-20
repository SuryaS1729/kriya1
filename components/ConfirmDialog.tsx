import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isDarkMode: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Destructive-action confirmation. Android uses a themed Jetpack Compose
 * AlertDialog; this fallback (iOS/web) uses the platform-native alert, which
 * already matches iOS conventions and cannot be color-themed.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Keep the latest copy/handlers without re-presenting the alert when the
  // parent re-renders while it is open.
  const latest = useRef({ title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel });

  useEffect(() => {
    latest.current = { title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel };
  });

  useEffect(() => {
    if (!visible) return;
    const current = latest.current;
    Alert.alert(
      current.title,
      current.message,
      [
        {
          text: current.cancelLabel,
          style: 'cancel',
          onPress: () => latest.current.onCancel(),
        },
        {
          text: current.confirmLabel,
          style: current.destructive ? 'destructive' : 'default',
          onPress: () => latest.current.onConfirm(),
        },
      ],
      { cancelable: false }
    );
  }, [visible]);

  return null;
}

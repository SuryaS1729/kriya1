export type AppToastType = 'success' | 'info' | 'error';

export type AppToastOptions = {
  type?: AppToastType;
  text1: string;
  text2?: string;
  duration?: number;
  position?: 'top' | 'bottom';
  topOffset?: number;
  bottomOffset?: number;
};

type ToastHandler = {
  show: (options: AppToastOptions) => void;
  hide: () => void;
};

let handler: ToastHandler | null = null;

export function registerAppToastHandler(next: ToastHandler | null) {
  handler = next;
}

export function showAppToast(options: AppToastOptions) {
  handler?.show(options);
}

export function hideAppToast() {
  handler?.hide();
}

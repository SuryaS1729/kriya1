import * as SplashScreen from 'expo-splash-screen';

// Keep the native splash up until the first real screen is ready, so the
// app goes splash → content with no blank/white frame or interim loader.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 350 });

/** Matches the native splash background in app.json. */
export const SPLASH_BACKGROUND = '#000000';

let hidden = false;

/** Hide the native splash. Safe to call more than once. */
export function hideSplash() {
  if (hidden) return;
  hidden = true;
  SplashScreen.hide();
}

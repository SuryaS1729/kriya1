import AntDesign from '@expo/vector-icons/AntDesign';

// ─── Animation Timings ──────────────────────────────────────────────
export const FADE_DURATION = 600;
export const SLIDE_DURATION = 800;
export const STEP_TRANSITION_DURATION = 300;
export const CONTEMPLATION_DELAY = 12000;
export const AUDIO_FADE_IN_DURATION = 1500; // ~45 frames * 33ms
export const AUDIO_FADE_OUT_DURATION = 600; // ~20 frames * 30ms
export const AUDIO_START_DELAY = 1000;
export const AUDIO_TARGET_VOLUME = 0.25;
export const AUDIO_INITIAL_VOLUME = 0.05;
export const CHEVRON_BOUNCE_DURATION = 1400;
export const SHIMMER_SLIDE_DURATION = 1700;
export const SHIMMER_PAUSE_DURATION = 2000;
export const SHIMMER_START_DELAY = 1000;

// ─── Remote Assets ──────────────────────────────────────────────────
export const AMBIENT_AUDIO_URL =
  'https://pub-4862ee5d51df47c4849ba812da5460ff.r2.dev/Drifting_Echoes_j5fudj.aac';
export const GITA_IMAGE_URL =
  'https://pub-4862ee5d51df47c4849ba812da5460ff.r2.dev/hflxxtpxtyrhrcteczzn_w1ll3e.webp';

// ─── Loading Texts ──────────────────────────────────────────────────
export const LOADING_TEXTS = [
  'Act on your dharma...',
  'One task at a time...',
  'Your journey begins now...',
];

// ─── Theme ──────────────────────────────────────────────────────────
export const themes = {
  dark: {
    background: '#0a6b7add',
    overlay: 'rgba(0, 0, 0, 0.3)',
    text: 'white',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.7)',
    textQuaternary: 'rgba(255, 255, 255, 0.6)',
    cardBackground: 'rgba(0, 12, 26, 0.26)',
    buttonBackground: 'rgba(0, 67, 76, 1)',
    buttonBackgroundSecondary: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.3)',
    borderSecondary: 'rgba(255, 255, 255, 0.2)',
    progressDot: 'rgba(255, 255, 255, 0.3)',
    timePickerBackground: 'rgba(0, 0, 0, 0.07)',
    selectedTimeBackground: 'rgba(255, 255, 255, 0.2)',
    arrowColor: 'rgba(19, 202, 244, 0.58)',
    spinnerColor: '#0ccebe5e',
    imageFallbackBackground: 'rgba(255, 255, 255, 0.1)',
  },
  light: {
    background: '#e8f4f8',
    overlay: 'rgba(76, 121, 180, 0.22)',
    text: '#2b4971ff',
    textSecondary: 'rgba(26, 54, 93, 0.8)',
    textTertiary: 'rgba(26, 54, 93, 0.7)',
    textQuaternary: 'rgba(26, 54, 93, 0.6)',
    cardBackground: 'rgba(203, 240, 241, 0.53)',
    buttonBackground: 'rgba(209, 234, 238, 0.94)',
    buttonBackgroundSecondary: 'rgba(26, 54, 93, 0.1)',
    border: 'rgba(26, 54, 93, 0.3)',
    borderSecondary: 'rgba(26, 54, 93, 0.2)',
    progressDot: 'rgba(26, 54, 93, 0.3)',
    timePickerBackground: 'rgba(255, 255, 255, 0.09)',
    selectedTimeBackground: 'rgba(26, 54, 93, 0.15)',
    arrowColor: 'rgba(37, 188, 208, 0.7)',
    spinnerColor: '#0ccebe',
    imageFallbackBackground: 'rgba(26, 54, 93, 0.1)',
  },
};

export type Theme = (typeof themes)['dark'];

// ─── Onboarding Steps ───────────────────────────────────────────────
export type FeatureStep = {
  type: 'feature';
  title: string;
  description: string;
  icon: React.ComponentProps<typeof AntDesign>['name'];
};

export type ReminderStep = {
  type: 'reminder';
  title: string;
  description: string;
};

export type OnboardingStep = FeatureStep | ReminderStep;

export const onboardingSteps: OnboardingStep[] = [
  {
    type: 'feature',
    title: 'Add Your Tasks',
    description:
      'Create your daily to-do list just like any other task app. Simple, clean, and focused on what matters to you.',
    icon: 'check-circle',
  },
  {
    type: 'feature',
    title: 'Complete & Learn',
    description:
      'Every time you check off a task, unlock a new verse from the Bhagavad Gita. Transform productivity into spiritual growth.',
    icon: 'book',
  },
  {
    type: 'feature',
    title: 'Focus Mode',
    description:
      'Long press a task to go into focus mode.',
    icon: 'arrows-alt',
  },
  {
    type: 'feature',
    title: 'Action Meets Wisdom',
    description:
      "Follow Krishna's teaching of 'Kriya' - taking action. Complete the entire Gita while building meaningful habits in your life.",
    icon: 'star',
  },
  {
    type: 'reminder',
    title: 'When do you start your day?',
    description:
      "Kriya expects you to write down tasks just before you begin your day. We'll save your preferred time and ask for notification permission when you continue.",
  },
  {
    type: 'feature',
    title: 'Offline & Private',
    description:
      'Everything works offline. No signup required. Your spiritual journey remains completely private.',
    icon: 'lock',
  },
];

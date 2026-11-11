import { memo, useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Modal, Platform, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useKriya } from '../lib/store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from "@react-native-vector-icons/feather/static";
import FontAwesome5 from "@react-native-vector-icons/fontawesome5/static";
import { Image } from 'expo-image';
import BlurBackground from '@/components/BlurBackground';
import { LinearGradient } from 'expo-linear-gradient';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import * as Notifications from 'expo-notifications';
import { NativeTimeDialog } from '../components/NativeTimeDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBar } from 'expo-status-bar';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { buttonPressHaptic, selectionHaptic, errorHaptic, taskCompleteHaptic, deleteHaptic } from '../lib/haptics';
import { showAppToast } from '../lib/appToast';
import { formatTime } from '../lib/formatTime';
import { PressableScale } from 'pressto';
import Constants from 'expo-constants';
import {
  TRANSLATION_LANGUAGE_LIST,
  downloadTranslation,
  removeTranslation,
  isTranslationDownloaded,
  invalidateTranslationCache,
  type TranslationLanguageCode,
} from '../lib/translationService';


// Translation Settings Component
// Manages downloaded Indian-language translation files (R2 JSON, kept out of
// SQLite). Download/remove is the only responsibility of this section.
function TranslationSettings() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const translationLanguage = useKriya(s => s.translationLanguage);
  const setTranslationLanguage = useKriya(s => s.setTranslationLanguage);
  const downloadedTranslations = useKriya(s => s.downloadedTranslations);
  const setDownloadedTranslations = useKriya(s => s.setDownloadedTranslations);

  // Local state keyed by language code for download/remove in-flight spinners
  const [busyLang, setBusyLang] = useState<TranslationLanguageCode | null>(null);
  const [pendingRemove, setPendingRemove] = useState<TranslationLanguageCode | null>(null);
  const [localDownloaded, setLocalDownloaded] = useState<Set<string>>(new Set());

  // Sync the row "Downloaded" state with the persisted store list + actual
  // files on disk (files may have been evicted by the OS between launches).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const actual: string[] = [];
      for (const lang of TRANSLATION_LANGUAGE_LIST) {
        if (await isTranslationDownloaded(lang.code)) actual.push(lang.code);
      }
      if (!cancelled) setLocalDownloaded(new Set(actual));
    })();
    return () => {
      cancelled = true;
    };
  }, [downloadedTranslations]);

  const handleDownload = async (code: TranslationLanguageCode) => {
    if (busyLang) return;
    buttonPressHaptic();
    setBusyLang(code);
    try {
      await downloadTranslation(code);
      invalidateTranslationCache(code);
      const next = Array.from(new Set([...downloadedTranslations, code]));
      setDownloadedTranslations(next);
      setLocalDownloaded(prev => new Set(prev).add(code));
      taskCompleteHaptic();
      showAppToast({
        type: 'success',
        text1: `${TRANSLATION_LANGUAGE_LIST.find(l => l.code === code)?.name} downloaded`,
        duration: 2200,
        position: 'bottom',
      });
    } catch (err) {
      console.warn('[TranslationSettings] Download failed:', err);
      errorHaptic();
      showAppToast({
        type: 'error',
        text1: 'Download failed',
        duration: 2500,
        position: 'bottom',
      });
    } finally {
      setBusyLang(null);
    }
  };

  const doRemove = async (code: TranslationLanguageCode) => {
    if (busyLang) return;
    deleteHaptic();
    setBusyLang(code);
    try {
      await removeTranslation(code);
      invalidateTranslationCache(code);
      const next = downloadedTranslations.filter(l => l !== code);
      setDownloadedTranslations(next);
      setLocalDownloaded(prev => {
        const s = new Set(prev);
        s.delete(code);
        return s;
      });
      // If the removed language was selected, fall back to English (SQLite)
      if (translationLanguage === code) {
        setTranslationLanguage('en');
      }
    } catch (err) {
      console.warn('[TranslationSettings] Remove failed:', err);
      errorHaptic();
      showAppToast({
        type: 'error',
        text1: "Couldn't remove",
        duration: 2200,
        position: 'bottom',
      });
    } finally {
      setBusyLang(null);
    }
  };

  const handleRemove = (code: TranslationLanguageCode) => {
    if (busyLang) return;
    setPendingRemove(code);
  };

  // Pill interaction: tap downloads (if missing) or selects (if downloaded).
  // Long-press on a downloaded pill removes it (with confirm above).
  const handlePillPress = (code: TranslationLanguageCode) => {
    if (busyLang) return;
    if (!localDownloaded.has(code)) {
      void handleDownload(code);
      return;
    }
    if (translationLanguage === code) return;
    selectionHaptic();
    setTranslationLanguage(code);
  };

  const handleEnglishPress = () => {
    if (busyLang || translationLanguage === 'en') return;
    selectionHaptic();
    setTranslationLanguage('en');
  };

  return (
    <View style={[styles.section, !isDarkMode && styles.lightSection]}>
      <Text style={[styles.sectionTitle, !isDarkMode && styles.lightText]}>Languages</Text>
      <Text style={[styles.recitationHint, !isDarkMode && styles.lightSubText]}>
        Tap to download or select. Long-press a downloaded language to remove it.
      </Text>

      <View style={styles.translationPillsWrap}>
        {/* English is always available (SQLite) — no download needed. */}
        <Pressable
          onPress={handleEnglishPress}
          android_ripple={{ color: '#cccccc18' }}
          style={[
            styles.translationPill,
            !isDarkMode && styles.lightTranslationPill,
            // English is always available, so it looks "downloaded".
            styles.translationPillDownloaded,
            !isDarkMode && styles.lightTranslationPillDownloaded,
            translationLanguage === 'en' && styles.translationPillActive,
            translationLanguage === 'en' && !isDarkMode && styles.lightTranslationPillActive,
          ]}
        >
          <Feather
            name="check"
            size={14}
            color={translationLanguage === 'en' ? '#ffffff' : isDarkMode ? '#9ca3af' : '#64748b'}
          />
          <Text
            style={[
              styles.translationPillText,
              !isDarkMode && styles.lightText,
              translationLanguage === 'en' && styles.translationPillTextActive,
            ]}
          >
            English
          </Text>
        </Pressable>

        {TRANSLATION_LANGUAGE_LIST.map((lang) => {
          const downloaded = localDownloaded.has(lang.code);
          const busy = busyLang === lang.code;
          const active = translationLanguage === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => handlePillPress(lang.code)}
              onLongPress={() => { if (downloaded && !busy) handleRemove(lang.code); }}
              android_ripple={{ color: '#cccccc18' }}
              style={[
                styles.translationPill,
                !isDarkMode && styles.lightTranslationPill,
                downloaded && styles.translationPillDownloaded,
                downloaded && !isDarkMode && styles.lightTranslationPillDownloaded,
                active && styles.translationPillActive,
                active && !isDarkMode && styles.lightTranslationPillActive,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={isDarkMode ? '#8ba5e1' : '#4a6a9a'} />
              ) : downloaded ? (
                <Feather
                  name="check"
                  size={14}
                  color={active ? '#ffffff' : isDarkMode ? '#8ba5e1' : '#3b5fb0'}
                />
              ) : (
                <Feather name="download" size={14} color={isDarkMode ? '#9ca3af' : '#64748b'} />
              )}
              <Text
                style={[
                  styles.translationPillText,
                  !isDarkMode && styles.lightText,
                  !downloaded && styles.translationPillTextMuted,
                  !downloaded && !isDarkMode && styles.lightTranslationPillTextMuted,
                  active && styles.translationPillTextActive,
                ]}
              >
                {lang.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ConfirmDialog
        visible={pendingRemove !== null}
        isDarkMode={isDarkMode}
        title={`Remove ${TRANSLATION_LANGUAGE_LIST.find(l => l.code === pendingRemove)?.name ?? 'language'}?`}
        message="You can download it again anytime."
        confirmLabel="Remove"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          const code = pendingRemove;
          setPendingRemove(null);
          if (code) void doRemove(code);
        }}
      />
    </View>
  );
}

function NotificationSettings() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const notificationsEnabled = useKriya(s => s.notificationsEnabled);
  const reminderTime = useKriya(s => s.reminderTime);
  const toggleNotifications = useKriya(s => s.toggleNotifications);
  const setReminderTime = useKriya(s => s.setReminderTime);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const reducedMotion = useReducedMotion();
  const [selectedTime, setSelectedTime] = useState(new Date());

  // Initialize selectedTime with current reminder time
  useEffect(() => {
    const newTime = new Date();
    newTime.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must sync the picker's draft value whenever the persisted reminder time changes; the picker otherwise keeps a stale date.
    setSelectedTime(newTime);
  }, [reminderTime]);

  const saveReminderTime = async (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === reminderTime.hour && minutes === reminderTime.minute) return;

    try {
      await setReminderTime(hours, minutes);
      showAppToast({
        type: 'success',
        text1: `Reminder · ${formatTime(hours, minutes)}`,
        duration: 2200,
        position: 'bottom',
      });
      taskCompleteHaptic();
    } catch {
      showAppToast({
        type: 'error',
        text1: "Couldn't save time",
        duration: 2200,
        position: 'bottom',
      });
      errorHaptic();
    }
  };

  // Android's dialog reports once, on OK → save right away. The iOS wheel
  // reports every tick while spinning → keep it as a draft until Done.
  const handleValueChange = (_event: any, date: Date) => {
    setSelectedTime(date);
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      void saveReminderTime(date);
    }
  };

  const handleConfirmIOS = () => {
    setShowTimePicker(false);
    void saveReminderTime(selectedTime);
  };

  const handleDismiss = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleOpenTimePicker = () => {
    // Sync selectedTime with current reminderTime before opening picker
    const currentTime = new Date();
    currentTime.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
    setSelectedTime(currentTime);

    buttonPressHaptic();
    setShowTimePicker(true);
  };

  const handleToggleNotifications = async () => {
    selectionHaptic();
    const attemptedEnable = !notificationsEnabled;

    if (attemptedEnable) {
      // iOS only presents the permission prompt once. Once it's locked out the
      // toggle would dead-end on "Permission needed", so send the user to the
      // system Settings app instead.
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== 'granted' && !canAskAgain) {
        showAppToast({
          type: 'error',
          text1: 'Enable notifications in Settings',
          duration: 2500,
          position: 'bottom',
        });
        Linking.openSettings();
        return;
      }
    }

    const enabled = await toggleNotifications();

    showAppToast({
      type: enabled ? 'success' : attemptedEnable ? 'error' : 'info',
      text1: enabled ? 'Reminders on' : attemptedEnable ? 'Permission needed' : 'Reminders off',
      duration: 2000,
      position: 'bottom',
    });
  };

  return (
    <View style={[styles.section, !isDarkMode && styles.lightSection]}>
      <Text style={[styles.sectionTitle, !isDarkMode && styles.lightText]}>Reminders</Text>

      <View style={styles.notificationSettings}>
        {/* Toggle Notifications */}
        <Pressable
          style={[styles.settingRow, !isDarkMode && styles.lightSettingRow]}
          onPress={handleToggleNotifications}
          android_ripple={{ color: '#cccccc18' }}
          accessibilityRole="switch"
          accessibilityLabel="Daily Task Reminder"
          accessibilityHint="Get reminded to plan your day"
          accessibilityState={{ checked: notificationsEnabled }}

        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, !isDarkMode && styles.lightText]}>
              Daily Task Reminder
            </Text>
            <Text style={[styles.settingDescription, !isDarkMode && styles.lightSubText]}>
              Get reminded to plan your day
            </Text>
          </View>
          <View style={[
            styles.toggle,
            notificationsEnabled && styles.toggleActive,
            notificationsEnabled && !isDarkMode && styles.lightToggleActive
          ]}>
            <Animated.View style={[
              styles.toggleKnob,
              notificationsEnabled && styles.toggleKnobActive,
              !reducedMotion && { transitionProperty: 'transform', transitionDuration: 180 },
            ]} />
          </View>
        </Pressable>

        {/* Time Setting */}
        {notificationsEnabled && (
          <Pressable
            style={[styles.settingRow, !isDarkMode && styles.lightSettingRow]}
            onPress={handleOpenTimePicker}
            android_ripple={{ color: '#cccccc18' }}
            accessibilityRole="button"
            accessibilityLabel={`Reminder time, ${formatTime(reminderTime.hour, reminderTime.minute)}`}
            accessibilityHint="Opens the time picker"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, !isDarkMode && styles.lightText]}>
                Reminder Time
              </Text>
              <Text style={[styles.settingDescription, !isDarkMode && styles.lightSubText]}>
                When you usually start your day
              </Text>
            </View>
            <View style={styles.timeDisplay}>
              <Text style={[styles.timeDisplayText, !isDarkMode && styles.lightText]}>
                {formatTime(reminderTime.hour, reminderTime.minute)}
              </Text>
              <Feather name="chevron-right" size={16} color={isDarkMode ? '#9ca3af' : '#64748b'} />
            </View>
          </Pressable>
        )}
      </View>

      {/* Native time picker: iOS wheel in a modal, Android dialog */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.timePickerOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowTimePicker(false)} />
            <View style={[styles.nativeTimePickerModal, !isDarkMode && styles.lightNativeTimePickerModal]}>
              <Text style={[styles.timePickerTitle, !isDarkMode && styles.lightText]}>
                Set Reminder Time
              </Text>

              <View style={styles.nativeTimePickerContainer}>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="spinner"
                  onValueChange={handleValueChange}
                  style={styles.nativeTimePicker}
                  themeVariant={isDarkMode ? 'dark' : 'light'}
                  accentColor={isDarkMode ? '#5a7d84' : '#8ea0b5'}
                />
              </View>

              <View style={styles.nativeTimePickerActions}>
                <Pressable
                  onPress={handleConfirmIOS}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm reminder time"
                  style={[
                    styles.timePickerButton,
                    { backgroundColor: isDarkMode ? '#33484f' : '#e5e7eb' },
                  ]}
                >
                  <Text style={[styles.timePickerButtonText, { color: isDarkMode ? '#e8eef0' : '#111827' }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        showTimePicker && (
          <NativeTimeDialog
            value={selectedTime}
            onValueChange={handleValueChange}
            onDismiss={handleDismiss}
            is24Hour={false}
            dark={isDarkMode}
            palette="slate"
          />
        )
      )}
    </View>
  );
}

function SupportLink() {
  const isDarkMode = useKriya(s => s.isDarkMode);

  const openSupportLink = async () => {
    buttonPressHaptic();
    try {
      await Linking.openURL('https://kriya.bitwisedharma.com/donate');
    } catch {
      showAppToast({
        type: 'error',
        text1: 'Couldn’t open link',
        duration: 2000,
        position: 'bottom',
      });
    }
  };

  // Quiet and editorial rather than attention-seeking: serif copy, a
  // hairline border and one warm accent — no glow, no pulse.
  const accent = isDarkMode ? '#e0a96d' : '#b25e00';

  return (
    <View style={[styles.section, !isDarkMode && styles.lightSection]}>
      <Text style={[styles.sectionTitle, !isDarkMode && styles.lightText]}>Contribute</Text>
      <PressableScale
        style={[styles.supportCard, !isDarkMode && styles.lightSupportCard]}
        onPress={openSupportLink}
        rippleColor="transparent"
        accessibilityRole="link"
        accessibilityLabel="Support Kriya"
        accessibilityHint="Opens the donation page in your browser"
      >
        <Text style={[styles.supportBody, !isDarkMode && styles.lightSupportBody]}>
          Kriya is free, offline and open source. If it has been useful, consider supporting its continued growth.
        </Text>
        <View style={styles.supportFooter}>
          <View style={[styles.supportRule, { backgroundColor: accent }]} />
          <Text style={[styles.supportCta, { color: accent }]}>SUPPORT KRIYA</Text>
          <Feather name="arrow-up-right" size={14} color={accent} />
        </View>
      </PressableScale>
    </View>
  );
}

// Verses per chapter of the Bhagavad Gita (sums to 701).
const GITA_CHAPTER_LENGTHS = [
  47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 35, 27, 20, 24, 28, 78,
];
const GITA_TOTAL_VERSES = GITA_CHAPTER_LENGTHS.reduce((a, b) => a + b, 0);

/**
 * Where the reader is in the Gita, taken from the same shloka the home
 * screen shows (store.currentShloka), so the two can never disagree.
 * `index` is 0-based, i.e. the number of verses already passed.
 */
type GitaPosition = { index: number; chapter: number; verse: number };

function gitaPositionFromIndex(index: number): GitaPosition {
  let remaining = index;
  for (let i = 0; i < GITA_CHAPTER_LENGTHS.length; i++) {
    if (remaining < GITA_CHAPTER_LENGTHS[i]) {
      return { index, chapter: i + 1, verse: remaining + 1 };
    }
    remaining -= GITA_CHAPTER_LENGTHS[i];
  }
  return { index: 0, chapter: 1, verse: 1 };
}

// Gita Progress Component
const GitaProgress = memo(function GitaProgress({ position }: { position: GitaPosition }) {
  const isDarkMode = useKriya(s => s.isDarkMode);

  const totalShlokas = GITA_TOTAL_VERSES;
  const unlockedShlokas = position.index;
  const progressPercentage = Math.round((unlockedShlokas / totalShlokas) * 100);
  const currentChapter = position.chapter;
  const currentVerse = position.verse;

  // Tasks left to finish the current chapter, counting the verse you're on.
  const chapterLength = GITA_CHAPTER_LENGTHS[currentChapter - 1];
  const tasksToChapterEnd = chapterLength - currentVerse + 1;
  const isFinalChapter = currentChapter === GITA_CHAPTER_LENGTHS.length;

  return (
    <View style={[styles.gitaProgressCard, !isDarkMode && styles.lightGitaSection]}>
      <View style={styles.gitaHeader}>
        <View style={styles.gitaTitle}>
          <Text style={[styles.gitaTitleText, !isDarkMode && styles.lightText]}>Bhagavad Gita Journey</Text>
          <Text style={[styles.gitaSubtitle, !isDarkMode && styles.lightSubText]}>
            Chapter {currentChapter}, Verse {currentVerse}
          </Text>
        </View>
        <View style={styles.gitaStats}>
          <Text style={[styles.gitaStatsNumber, !isDarkMode && styles.lightGitaStatsNumber]}>{unlockedShlokas}</Text>
          <Text style={[styles.gitaStatsLabel, !isDarkMode && styles.lightSubText]}>/ {totalShlokas}</Text>
        </View>
      </View>

      <View style={[styles.progressContainer, !isDarkMode && styles.lightProgressContainer]}>
        <View style={[styles.progressBar, !isDarkMode && styles.lightProgressBar]}>
          <View
            style={[
              styles.progressFilled,
              { width: `${progressPercentage}%` },
              !isDarkMode && styles.lightProgressFilled
            ]}
          />
        </View>
        <Text style={[styles.progressText, !isDarkMode && styles.lightSubText]}>
          {progressPercentage}% Complete
        </Text>
      </View>

      <View style={styles.gitaMilestones}>
        <Text style={[styles.milestonesTitle, !isDarkMode && styles.lightSubText]}>Next Milestone</Text>
        <View style={styles.milestoneItem}>
          <View style={[styles.milestoneIcon, { borderColor: "grey" }]}>
            <Feather name="flag" size={16} color={isDarkMode ? "#cbd5e1" : "#475569"} />
          </View>
          <View style={styles.milestoneText}>
            <Text style={[styles.milestoneTitle, !isDarkMode && styles.lightText]}>
              {isFinalChapter ? 'Complete the Gita' : `Chapter ${currentChapter} Complete`}
            </Text>
            <Text style={[styles.milestoneDesc, !isDarkMode && styles.lightSubText]}>
              {tasksToChapterEnd} more {tasksToChapterEnd === 1 ? 'task' : 'tasks'} to unlock
            </Text>
          </View>
        </View>
      </View>

    </View>
  );
});


const ScripturesProgress = memo(function ScripturesProgress({ gitaPosition }: { gitaPosition: GitaPosition }) {
  const isDarkMode = useKriya(s => s.isDarkMode);

   const scriptures = [
    {
      id: 'bhagavad-gita',
      title: 'Bhagavad Gita',
      subtitle: 'Krishna & Arjuna',
      totalVerses: 701,
      isUnlocked: true,
      darkImage: require('../assets/images/scriptures/gita-dark.webp'),
      lightImage: require('../assets/images/scriptures/gita-light.webp'),
      description: 'The eternal dialogue between Krishna and Arjuna',
    },
    {
      id: 'Nachiketa-upanishad',
      title: 'Nachiketa Upanishad',
      subtitle: 'Yama & Nachiketa',
      totalVerses: 108,
      isUnlocked: false,
      darkImage: require('../assets/images/scriptures/nachiketa-dark.webp'),
      lightImage: require('../assets/images/scriptures/nachiketa-light.webp'),
      description: 'Dialogue on death, immortality, and self-realization.',
      unlockRequirement: 'Complete Bhagavad Gita',
    },
    {
      id: 'ashtavakra-gita',
      title: 'Ashtavakra Gita',
      subtitle: 'Janaka & Ashtavakra',
      totalVerses: 298,
      isUnlocked: false,
      darkImage: require('../assets/images/scriptures/ashtavakra-dark.webp'),
      lightImage: require('../assets/images/scriptures/ashtavakra-light.webp'),
      description: 'Pure non-duality and liberation through self-realization.',
      unlockRequirement: 'Complete Nachiketa Upanishad',
    },
    {
      id: 'Advaita-vedanta',
      title: 'Advaita Vedanta',
      subtitle: 'Shankaracharya',
      totalVerses: 32000,
      isUnlocked: false,
      darkImage: require('../assets/images/scriptures/shankara-dark.webp'),
      lightImage: require('../assets/images/scriptures/shankara-light.webp'),
      description: 'The non-dualistic philosophy of oneness',
      unlockRequirement: 'Complete Ashtavakra Gita',
    },

  ];
  // Images are bundled (assets/images/scriptures) so this works offline.

  const handleScripturePress = (scripture: (typeof scriptures)[number]) => {
    if (scripture.isUnlocked) {
      // Only the Gita is readable today: open the verse you're on, the
      // same one the home screen shows.
      buttonPressHaptic();
      router.push({
        pathname: '/shloka/[id]',
        params: { id: String(gitaPosition.index) },
      });
      return;
    }

    // Locked isn't an error — a light tap and a gentle note.
    selectionHaptic();
    showAppToast({
      type: 'info',
      // Toasts render as a single-line pill, so keep it short.
      text1: `${scripture.unlockRequirement} to unlock`,
      duration: 2400,
      position: 'bottom',
    });
  };

  return (
    <View style={[styles.scripturesSection, !isDarkMode && styles.lightGitaSection]}>
      <View style={styles.scripturesHeader}>
        <Text style={[styles.scripturesSectionTitle, !isDarkMode && styles.lightText]}>
          Scriptures
        </Text>
        <Text style={[styles.scripturesSubtitle, !isDarkMode && styles.lightSubText]}>
          Your journey through ancient wisdom
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scripturesScrollContainer}
        style={styles.scripturesScroll}
      >
        {scriptures.map((scripture, index) => (
          <Pressable
            key={scripture.id}
            style={[
              styles.scriptureCard,
              !scripture.isUnlocked && styles.lockedScriptureCard,
              !isDarkMode && styles.lightScriptureCard
            ]}
            onPress={() => handleScripturePress(scripture)}
            android_ripple={{ color: '#cccccc18' }}
          >
            {/* Scripture Image */}
          <View style={styles.scriptureImageContainer}>
  <View style={[
    styles.scriptureImage,
    !scripture.isUnlocked && styles.lockedScriptureImage
  ]}>
   <Image
                  source={isDarkMode ? scripture.darkImage : scripture.lightImage}
                  style={styles.scriptureImageStyle}
                  contentFit="cover"
                />

  </View>
</View>

            {/* Scripture Info */}
            <View style={styles.scriptureInfo}>
              <Text style={[
                styles.scriptureTitle,
                !isDarkMode && styles.lightText,
                !scripture.isUnlocked && styles.lockedText
              ]}>
                {scripture.title}
              </Text>

              <Text style={[
                styles.scriptureSubtitle,
                !isDarkMode && styles.lightSubText,
                !scripture.isUnlocked && styles.lockedSubText
              ]}>
                {scripture.subtitle}
              </Text>

              <Text style={[
                styles.scriptureDescription,
                !isDarkMode && styles.lightSubText,
                !scripture.isUnlocked && styles.lockedSubText
              ]}>
                {scripture.description}
              </Text>

              {/* Chapter/verse lives in the Journey card above; locked cards say how to unlock. */}
              {!scripture.isUnlocked && (
                <View style={styles.unlockRequirement}>
                  <Feather name="info" size={12} color="#888" />
                  <Text style={[styles.unlockText, !isDarkMode && styles.lightSubText]}>
                    {scripture.unlockRequirement}
                  </Text>
                </View>
              )}

              {/* Action Button */}
              {scripture.isUnlocked && (
                <View style={styles.scriptureAction}>
                  <Feather name="book-open" size={16} color={isDarkMode ? '#8ba5e1' : '#2e4fa3'} />
                  <Text style={[styles.scriptureActionText, !isDarkMode && styles.lightScriptureActionText]}>Continue Reading</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Coming Soon Badge */}
      <View style={styles.comingSoonBadge}>
        <Text style={[styles.comingSoonText, !isDarkMode && styles.lightSubText]}>
          ✨ More scriptures coming soon
        </Text>
      </View>
    </View>
  );
});

// Read from app.json so the footer never drifts from the shipped version.
const APP_VERSION = Constants.expoConfig?.version ?? '';
const CURRENT_YEAR = new Date().getFullYear();

function Footer() {
  const isDarkMode = useKriya(s => s.isDarkMode);

  const openLink = async (url: string) => {
    buttonPressHaptic();

    try {
      await Linking.openURL(url); // Opens the provided URL
    } catch {
      // No handler for the URL (e.g. the iOS Simulator has no Mail app for
      // mailto:) — report it instead of throwing an uncaught rejection.
      showAppToast({
        type: 'error',
        text1: 'Couldn’t open link',
        duration: 2000,
        position: 'bottom',
      });
    }
  };

  return (
    <View style={[styles.footerContainer, !isDarkMode && styles.lightFooterContainer]}>
      {/* App Branding */}
      <View style={styles.footerBranding}>
        <Text style={[styles.footerAppName, !isDarkMode && styles.lightText]}>kriya</Text>

        <View style={styles.footerTagline}>
          <Text style={[styles.footerMadeIn, !isDarkMode && styles.lightSubText]}>Crafted with  {<FontAwesome5 name="heart" size={12} iconStyle="solid" color="#FF6E26" />}  in Bharāt</Text>
          <Text style={[styles.footerInspiration, !isDarkMode && styles.lightSubText]}>
            Inspired by the timeless wisdom of the Bhagavad Gita
          </Text>
        </View>
      </View>
      {/* Quote */}
      <View style={styles.footerQuote}>
        <Text style={[styles.footerQuoteText, !isDarkMode && styles.lightSubText]}>
          "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"
        </Text>
        <Text style={[styles.footerQuoteTranslation, !isDarkMode && styles.lightSubText]}>
          You have the right to perform actions, but never to the fruits of action
        </Text>
      </View>

      {/* Connect: mail, GitHub and feedback in one row */}
      <View style={styles.footerSocials}>
        <Text style={[styles.footerSocialTitle, !isDarkMode && styles.lightSubText]}>Connect</Text>
        <View style={styles.socialButtons}>
          <Pressable
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('mailto:bitwisedharma@gmail.com')}
            android_ripple={{ color: '#cccccc18', radius: 22 }}
            accessibilityRole="link"
            accessibilityLabel="Email Kriya"
          >
            <Feather name="mail" size={18} color={isDarkMode ? "#fff" : "#0f172a"} />
          </Pressable>
          <Pressable
            style={[styles.socialButton, !isDarkMode && styles.lightSocialButton]}
            onPress={() => openLink('https://github.com/SuryaS1729/kriya1')}
            android_ripple={{ color: '#cccccc18', radius: 22 }}
            accessibilityRole="link"
            accessibilityLabel="Kriya on GitHub"
          >
            <Feather name="github" size={18} color={isDarkMode ? "#fff" : "#0f172a"} />
          </Pressable>
          <Pressable
            style={[styles.feedbackButton, !isDarkMode && styles.lightFeedbackButton]}
            onPress={() => openLink('https://forms.gle/iLQH7vjNZuY27Du17')}
            android_ripple={{ color: '#cccccc18' }}
            accessibilityRole="link"
          >
            <Feather name="message-square" size={16} color={isDarkMode ? "#fff" : "#0f172a"} />
            <Text style={[styles.feedbackButtonText, !isDarkMode && styles.lightText]}>
              Share Feedback
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Fine print: version, privacy and copyright on one quiet line */}
      <View style={styles.footerCopyright}>
        <Text style={[styles.footerCopyrightText, !isDarkMode && styles.lightSubText]}>
          Version {APP_VERSION}
        </Text>
        <Text style={[styles.footerCopyrightText, !isDarkMode && styles.lightSubText]}>·</Text>
        <Pressable onPress={() => openLink('https://kriya.bitwisedharma.com/privacy')} hitSlop={10} accessibilityRole="link">
          <Text style={[styles.footerLink, !isDarkMode && styles.lightFooterLink]}>Privacy Policy</Text>
        </Pressable>
        <Text style={[styles.footerCopyrightText, !isDarkMode && styles.lightSubText]}>·</Text>
        <Text style={[styles.footerCopyrightText, !isDarkMode && styles.lightSubText]}>
          © {CURRENT_YEAR} Kriya. No rights reserved. 🙏
        </Text>
      </View>
    </View>
  );
}


export default function History() {
  const isDarkMode = useKriya(s => s.isDarkMode);
  const toggleDarkMode = useKriya(s => s.toggleDarkMode);
  const currentShloka = useKriya(s => s.currentShloka);

  // Read once per visit and shared by both progress sections. Nothing here
  // writes to the store while rendering.
  const gitaPosition = useMemo(() => {
    const { index, data } = currentShloka();
    const position = gitaPositionFromIndex(index);
    // Trust the DB row's chapter/verse when available.
    return data
      ? { ...position, chapter: data.chapter_number, verse: data.verse_number }
      : position;
  }, [currentShloka]);

  return (
    <View style={[styles.container, !isDarkMode && styles.lightContainer]}>
      <StatusBar hidden= {true} />
      {/* BlurBackground */}
      <BlurBackground />

      {/* Tint over the moving background. Light mode stays mostly white and
          only drifts into a soft periwinkle near the bottom. */}
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(52, 76, 103, 0.8)', 'rgba(0, 0, 0, 0.6)']
          : ['rgba(255, 255, 255, 0.88)', 'rgba(255, 255, 255, 0.82)', 'rgba(139, 165, 225, 0.6)']
        }
        locations={isDarkMode ? [0, 1] : [0, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeAreaContent}>
        {/* Header - Always render immediately */}
        <View style={styles.headerRow}>
          {/* Equal-width sides keep the title centred with two icons on the right. */}
          <View style={styles.headerSide}>
            <Pressable
              onPress={() => {
                buttonPressHaptic();
                router.back();
              }}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={24} color={isDarkMode ? "#fff" : "#0f172a"} />
            </Pressable>
          </View>
          <Text style={[styles.headerTitle, !isDarkMode && styles.lightText]}>My Journey</Text>
          <View style={[styles.headerSide, styles.headerActions]}>
            <TouchableOpacity
              onPress={() => {
                buttonPressHaptic();
                router.push('/bookmarks');
              }}
              hitSlop={10}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Your bookmarks"
            >
              <Feather name="bookmark" size={22} color={isDarkMode ? "#fff" : "#0f172a"} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                selectionHaptic();
                toggleDarkMode();
              }}
              hitSlop={10}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Feather
                name={isDarkMode ? "sun" : "moon"}
                size={24}
                color={isDarkMode ? "#fff" : "#0f172a"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Gita Progress */}
          <GitaProgress position={gitaPosition} />

          {/* Scriptures Progress List */}
          <ScripturesProgress gitaPosition={gitaPosition} />

          {/* Notification Settings */}
          <NotificationSettings />

          {/* Translation Settings */}
          <TranslationSettings />

          {/* Support Link */}
          <SupportLink />

          <Footer />

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  lightContainer: {
    backgroundColor: '#fff',
  },
  safeAreaContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 30,
  },
  headerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    justifyContent: 'flex-end',
    gap: 22,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // Light mode uses the app's slate palette (matches Home and Calendar).
  lightText: {
    color: '#0f172a',
  },
  lightSubText: {
    color: '#64748b',
  },
    toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#2b4382',
  },
  lightToggleActive: {
    backgroundColor: '#2e4fa3',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  section: {
    marginBottom: 30,
  },
  lightSection: {
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  notificationSettings: {
    gap: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 76, 103, 0.3)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  lightSettingRow: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderColor: 'transparent',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  recitationHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
    marginTop: -8,
    fontStyle: 'italic',
  },
  translationPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  translationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(52, 76, 103, 0.3)',
  },
  // Three clear states, solid fills so they read over the moving background:
  // not downloaded (quiet) → downloaded (slate card) → selected (accent).
  lightTranslationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: '#e2e8f0',
  },
  translationPillDownloaded: {
    borderColor: 'rgba(139, 165, 225, 0.45)',
    backgroundColor: '#16283d',
  },
  lightTranslationPillDownloaded: {
    borderColor: '#b9c8ea',
    backgroundColor: '#e9effa',
  },
  translationPillActive: {
    borderColor: '#2b4382',
    backgroundColor: '#2b4382',
  },
  lightTranslationPillActive: {
    borderColor: '#2e4fa3',
    backgroundColor: '#2e4fa3',
  },
  translationPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  translationPillTextMuted: {
    fontWeight: '400',
    color: '#cbd5e1',
  },
  lightTranslationPillTextMuted: {
    color: '#64748b',
  },
  // Listed after lightText, so the selected pill stays white in light mode.
  translationPillTextActive: {
    fontWeight: '700',
    color: '#ffffff',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Space Mono',
  },
   timePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },


  timePickerButton: {
    minWidth: 140,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
   nativeTimePickerModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  lightNativeTimePickerModal: {
    backgroundColor: '#fff',
  },
  nativeTimePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  nativeTimePicker: {
    width: 280,
    height: 120,
  },
  nativeTimePickerActions: {
    alignItems: 'center',
  },

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Gita Progress Styles
  gitaProgressCard: {
    marginBottom: 20, // Reduced margin since scriptures section follows
    backgroundColor: 'rgba(52, 76, 103, 0.4)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
    borderColor: 'rgba(93, 123, 158, 0.3)',
  },
  lightGitaSection: {
    backgroundColor: 'rgba(248, 248, 248, 0.6)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  gitaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  gitaTitle: {
    flex: 1,
  },
  gitaTitleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  gitaSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  gitaStats: {
    alignItems: 'flex-end',
  },
  gitaStatsNumber: {
    color: '#ff9500',
    fontSize: 24,
    fontWeight: '700',
  },
  lightGitaStatsNumber: {
    color: '#e67e00',
  },
  gitaStatsLabel: {
    color: '#888',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: 20,
  },
  lightProgressContainer: {
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(36, 60, 85, 0.6)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  lightProgressBar: {
    backgroundColor: '#e0e0e0',
  },
  progressFilled: {
    height: '100%',
    backgroundColor: '#ff9500',
    borderRadius: 4,
  },
  lightProgressFilled: {
    backgroundColor: '#e67e00',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  gitaMilestones: {
    marginBottom: 16,
  },
  milestonesTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,

  },
  milestoneText: {
    flex: 1,
  },
  milestoneTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  milestoneDesc: {
    color: '#888',
    fontSize: 12,
  },
    footerContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingTop: 30,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93, 123, 158, 0.3)',
  },
  lightFooterContainer: {
    borderTopColor: 'rgba(224, 224, 224, 0.6)',
  },
  footerBranding: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerAppName: {
    color: '#fff',
    fontSize: 58,
    marginBottom: 18, // Reduced margin to make room for company name
    fontFamily: 'Instrument Serif',
    fontStyle: 'italic',
    letterSpacing: 0,
    fontWeight: '200',
  },
  footerTagline: {
    alignItems: 'center',
    gap: 4,
  },
  footerMadeIn: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  footerInspiration: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
  },
  footerSocials: {
    alignItems: 'center',
    marginBottom: 28,
  },
  footerSocialTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  socialButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightSocialButton: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
  },
  footerLink: {
    color: '#8ba5e1',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  lightFooterLink: {
    color: '#5a7a9a',
  },
  footerQuote: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  footerQuoteText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Kalam',
    marginBottom: 4,
  },
  footerQuoteTranslation: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Source Serif Pro',
  },
  footerCopyright: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 6,
    rowGap: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93, 123, 158, 0.2)',
  },
  footerCopyrightText: {
    color: '#666',
    fontSize: 11,
  },
  // Pill sized to sit in the same row as the 44px round social buttons.
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 76, 103, 0.5)',
    gap: 8,
  },
  lightFeedbackButton: {
    backgroundColor: 'rgba(245, 245, 245, 0.7)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  supportCard: {
    marginTop: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(22, 40, 61, 0.55)',
    gap: 16,
  },
  lightSupportCard: {
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  supportBody: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'Source Serif Pro',
  },
  lightSupportBody: {
    color: '#1e293b',
  },
  supportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportRule: {
    width: 18,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.8,
  },
  supportCta: {
    fontFamily: 'Space Mono',
    fontSize: 11,
    letterSpacing: 2,
  },

   // New Scripture Styles
  scripturesSection: {
    marginBottom: 30,
    backgroundColor: 'rgba(52, 76, 103, 0.4)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
    borderColor: 'rgba(93, 123, 158, 0.3)',
  },

  scripturesHeader: {
    marginBottom: 20,
  },

  scripturesSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },

  scripturesSubtitle: {
    color: '#888',
    fontSize: 14,
  },

  scripturesScroll: {
    marginHorizontal: -4,
  },

  scripturesScrollContainer: {
    paddingHorizontal: 4,
    gap: 16,
  },

  scriptureCard: {
    width: 280,
    backgroundColor: 'rgba(36, 60, 85, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0,
    borderColor: 'rgba(93, 123, 158, 0.4)',
    marginRight: 16,
  },

  lightScriptureCard: {
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderColor: 'rgba(224, 224, 224, 0.6)',
  },

  lockedScriptureCard: {
    opacity: 0.7,
    backgroundColor: 'rgba(36, 60, 85, 0.3)',
  },

  scriptureImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

scriptureImageStyle: {
  width: 80,
  height: 80,
  borderRadius: 40,
},

scriptureImage: {
  position: 'relative',
  borderRadius: 40,
  overflow: 'hidden', // Important for circular clipping
},

lockedScriptureImage: {
  opacity: 0.5,
},

lockOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 40,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  justifyContent: 'center',
  alignItems: 'center',
},

  scriptureInfo: {
    flex: 1,
  },

  scriptureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,

  },

  scriptureSubtitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },

  scriptureDescription: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },

  lockedText: {
    color: '#666',
  },

  lockedSubText: {
    color: '#555',
  },





  unlockRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  unlockText: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
  },

  scriptureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scriptureActionText: {
    color: '#8ba5e1',
    fontSize: 12,
    fontWeight: '500',
  },
  lightScriptureActionText: {
    color: '#2e4fa3',
  },

  comingSoonBadge: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93, 123, 158, 0.2)',
  },

  comingSoonText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

# Material UI Ideas (Expo UI / Jetpack Compose)

Reference notes for adopting Android-native Material 3 controls piecemeal, without
losing the app's custom visual identity. Written after the `ConfirmDialog` rollout.

Last updated: 2026-10-21

## Where we already use Expo UI

- `components/ConfirmDialog.android.tsx` - Material `AlertDialog` for destructive actions.
- `components/NativeDateDialog*.tsx` - date picker dialog.
- `components/NativeTimeDialog*.tsx` - time picker dialog.
- `components/NativeSegmented*.tsx` - segmented control.
- `components/OpacitySlider*.tsx` - slider.
- `components/TranslationLanguageMenu*.tsx` - themed dropdown menu.
- `app/add.tsx`, `app/task/[id].tsx`, `app/history.tsx` - community date/time pickers.

Pattern to follow: one shared wrapper per control, with a `.android.tsx` that uses
`@expo/ui/jetpack-compose` and a default file that falls back to the current
React Native UI on iOS/web. Never fork a whole screen.

## Ground rules

1. Android-only. Every component under `@expo/ui/jetpack-compose` renders only on
   Android. iOS keeps the existing native/RN UI (or `@expo/ui/swift-ui` if we ever
   want a SwiftUI control).
2. Leaf controls, not layouts. Swap a picker, switch, slider, or menu. Do not
   replace screen scaffolding, gradients, custom cards, or typography.
3. Always pass colors explicitly. Material You derives colors from the wallpaper.
   Use `isDarkMode` from `lib/store.ts` and the app palette (`#18464a` light,
   `#1c3d4d` dark, red `#ef4444`) so dialogs/controls match the app.
4. Keep the existing haptics (`lib/haptics.ts`) and toast (`lib/appToast.ts`)
   unless the native control provides its own feedback.
5. Preserve accessibility labels and hit targets when swapping a `Pressable`.
6. No default Material typography. Keep Instrument Serif / NTR / existing fonts.

## Per-screen ideas

### 1. Task details - `app/task/[id].tsx`

Best candidate after dialogs. The screen already mixes RN inputs with native pickers.

- `Switch` for notification enable / reminder toggles instead of custom pills.
- `TextField` for title and description, keeping the current labels and spacing.
  TextField needs explicit container/content colors and a `ModifierConfig` for
  padding; if it fights the gradient background, keep `TextInput`.
- Keep the existing reminder-time picker. Android already uses the native time
  dialog (`DateTimePicker presentation="dialog"`); iOS uses an inline card. There
  is no custom `Modal` here to remove, and wrapping the native dialog in a sheet
  would add a step without improving anything.
- Optional UX change: a `ModalBottomSheet` with quick presets (Morning 9:00,
  Evening 6:00, Custom...) that falls back to the native dialog for "Custom".
  Treat this as a new flow, not a cleanup.
- `FlowRow` for reminder chips so multiple times wrap naturally.
- `IconButton` for the bell, focus, and reminder-delete actions to get a consistent
  48dp touch target.
- `Tooltip` (long-press) on the bell / focus icons for discoverability.
- `DropdownMenu` if repeat or priority options are added later.

Do not replace the custom "Focus" button or the task title hero.

### 2. Quick Add - `app/add.tsx`

- `FlowRow` with `Chip` / `ToggleButton` for Today / Tomorrow / custom date. This
  removes the current horizontal custom date row and gives a larger tap target.
- Keep `NativeDateDialog`; it is already the right abstraction.
- `TextField` for the task title if it can be styled to match; otherwise keep
  `TextInput` because the composer is the visual center of the screen.
- `ModalBottomSheet` for "more options" (date, repeat, priority) instead of inline
  expanding sections, so the main composer stays calm.
- `Snackbar` is tempting for validation errors, but we already have
  `showAppToast`; do not run both.

### 3. Calendar - `app/calendar.tsx`

- `IconButton` for the header arrows and today button for consistent touch targets.
- `ModalBottomSheet` for tapping a day: show tasks plus "Add task for this date".
  This is the biggest UX win on the screen.
- `SegmentedButton` / `ToggleButton` for month/week/agenda if a view switch is added.
- `DatePicker` dialog behind a "Jump to date" action, instead of only arrow paging.
- `DropdownMenu` for filters (all / open / done).
- Do not try to rebuild the calendar grid with `LazyColumn`; the custom grid and
  its gestures are better left alone.

### 4. Home - `app/index.tsx`

- `BadgedBox` / `Badge` for an incomplete-task count on the tasks header.
- `Progress` (linear) for a small daily completion bar, if a goal exists.
- `IconButton` for the calendar and profile icons to standardize hit targets.
- `AnimatedVisibility` is a possible replacement for some Reanimated row
  enter/exit, but Reanimated is already tuned; skip unless there is a bug.
- Keep the shloka card, quote typography, and bottom "Add a task" bar custom.
- A `FloatingActionButton` would duplicate the bottom add bar. Do not add one.

### 5. My Journey - `app/history.tsx`

- `SegmentedButton` for stats range (7 days / 30 days / all time).
- `Chip` row for filtering activity by type (tasks / focus / shlokas).
- `PullToRefreshBox` around the stats content for manual refresh.
- `ListItem` for translation rows (name, size, downloaded state, trailing action),
  replacing the custom row layout. Keep the download spinner logic.
- Leave the notification-time picker alone. The custom `Modal` there is iOS-only;
  Android already uses `NativeTimeDialog`, so `ModalBottomSheet` has nothing to
  replace on Android and cannot replace the iOS modal.
- `Switch` for notification toggles and `NativeTimeDialog` for the reminder time
  (already present).
- `ModalBottomSheet` with `RadioButton` rows as an alternative to the custom
  `TranslationLanguageMenu`; only do this if the dropdown ever feels cramped.
- Keep the contribution section and headers as-is.

### 6. Bookmarks - `app/bookmarks.tsx`

- `SearchBar` above the list when the bookmark count grows.
- `Card` (outlined, explicit colors) for bookmark cards if the current press
  feedback feels weak. Keep the preview text truncation.
- `Badge` on the header showing the bookmark count.
- `ModalBottomSheet` for long-press actions (open / remove) instead of a bare
  remove icon; keep the icon too for discoverability.
- Keep the custom empty state and gradient.

### 7. Shloka reader - `app/read.tsx`

- `DockedSearchBar` / `SearchBar` to replace the custom search input, with explicit
  container and text colors so it does not turn white in dark mode.
- `SegmentedButton` for script/transliteration mode.
- `IconButton` for back, search, and settings.
- `ModalBottomSheet` for reader settings; `OpacitySlider` already covers the
  brightness/opacity control.
- Do not wrap the shloka text itself in Material `Text`; the custom typography and
  line height are core to the reading experience.

### 8. Shloka detail - `app/shloka/[id].tsx`

- `IconButton` for bookmark, share, and audio controls.
- `Tooltip` on the bookmark icon on first use.
- `ModalBottomSheet` for "verse actions" (share, copy, bookmark, translation) if
  the header gets crowded.
- The themed `TranslationLanguageMenu` is already good and matches the brand;
  leave it. If it is replaced, use `ModalBottomSheet` plus `RadioButton`, not a
  Material `DropdownMenu` (too narrow for long language names).
- Keep the verse card, translation panel, and serif typography custom.

### 9. Share composer - `app/share2.tsx`

- `SegmentedButton` for text alignment (left / center / right) instead of three
  separate pressables.
- `Slider` for background opacity if the custom `OpacitySlider` ever needs a
  native fallback; today the custom one is fine.
- `ModalBottomSheet` for share options and background presets.
- `ToggleButton` group for preset backgrounds if thumbnails are added.
- Keep the canvas, gradients, and image composition untouched. This screen is
  about output fidelity, not Material chrome.

### 10. Focus timer - `app/focus.tsx`

- Keep the custom timer. Material has no timer component and the large serif
  numerals are the identity of this screen.
- `SegmentedButton` for presets (15 / 25 / 50 min) if presets are added.
- `Slider` for a custom duration scrubber.
- `IconButton` for play/pause/exit with explicit colors.
- `Tooltip` for the exit button so it does not read as destructive.
- Avoid `Progress` as a ring; the existing animated visuals are better.

### 11. Onboarding - `app/onboarding/*`

- `HorizontalPager` is the only credible swap, but the existing pager already
  handles snapping, dots, and transitions. Leave it.
- `ModalBottomSheet` for the reminder setup on `ReminderSlide.tsx` if the inline
  picker feels heavy.
- Do not introduce Material buttons here; onboarding is brand-first.

## What not to use

- `NavigationBar` / Material bottom navigation: we have a custom top bar and
  navigation model.
- Material `TopAppBar`: would break the serif headers and safe-area treatment.
- Dynamic Material You colors: ignore wallpaper-derived palettes entirely.
- `Snackbar` everywhere: duplicates `showAppToast` and would stack two feedback
  systems.
- Material `Text` for body copy inside custom cards; it brings default Material
  typography and color roles.
- `LazyColumn` inside an existing `ScrollView` or `FlatList`; nested scrolling and
  virtualization will fight each other.
- Ripple on iOS. Gate all Android-only props behind the `.android.tsx` file.

## Known pitfalls (learned from ConfirmDialog)

- Slot APIs need the real interactive component. `AlertDialog` confirm/dismiss
  slots require `TextButton` with `onClick`; a bare `Text` is not tappable even
  though it looks correct.
- Keep the `Host` mounted and conditionally render the dialog inside it. Unmounting
  the whole `Host` caused a transient blank frame on dismiss.
- `Text` in Compose has no `fontWeight` prop; use `style={{ fontWeight: '600' }}`.
- Supply `containerColor`, `titleContentColor`, and `textContentColor` explicitly,
  otherwise dark mode falls back to Material defaults.
- Zero-size `Host` works for dialogs and menus, but do not use it for controls that
  need layout space; give those a real size and let flex position them.
- Test with the app's own dark mode, not the system theme. `isDarkMode` comes from
  the store and defaults to `true`.

## Recommended order

1. `FlowRow` + `Chip` for date shortcuts (`app/add.tsx`) - faster task entry.
2. `ModalBottomSheet` for calendar day actions (`app/calendar.tsx`) - biggest UX
   gain per line of code.
3. `SegmentedButton` for stats range (`app/history.tsx`) - cheap, visible, low risk.
4. `SearchBar` for bookmarks (`app/bookmarks.tsx`) - only once the list is long
   enough to need it.
5. Optional: reminder quick-pick sheet (`app/task/[id].tsx`) - a new flow, not a
   cleanup; measure whether an extra tap is worth it.

## Rollout checklist

- [ ] Shared wrapper with `.android.tsx` and a default fallback.
- [ ] Colors driven by `isDarkMode`, no Material defaults.
- [ ] Haptics and toast behavior unchanged.
- [ ] Accessibility label and minimum 48dp touch target.
- [ ] Verified in dark and light mode on the Android device.
- [ ] iOS still renders the fallback unchanged.
- [ ] `npx tsc --noEmit` and `npx eslint <files>` clean.

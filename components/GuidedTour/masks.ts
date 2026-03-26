import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

/**
 * Returns responsive mask positions & styles based on the current window
 * dimensions. Using `useWindowDimensions` ensures values stay in sync
 * if the window size ever changes (split-screen, rotation, etc.).
 */
export function useMaskLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isSmallScreen = height < 700;
    const isTallScreen = height > 900;

    const shlokaTop = isSmallScreen ? height * 0.08 : height * 0.05;
    const shlokaHeight = isSmallScreen ? height * 0.28 : height * 0.40;
    const firstTaskTop = isSmallScreen
      ? height * 0.45
      : isTallScreen
        ? height * 0.48
        : height * 0.50;
    const combinedHeight = isSmallScreen ? height * 0.45 : height * 0.65;
    const bookTop = isSmallScreen ? height * 0.32 : height * 0.34;

    // Computed constants
    const ADD_TASK_MASK_LEFT = 8;
    const ADD_TASK_MASK_BOTTOM = 10;
    const ADD_TASK_MASK_WIDTH = width;
    const ADD_TASK_MASK_HEIGHT = 110;

    const BOOK_MASK_RIGHT = 0;
    const BOOK_MASK_TOP = bookTop;
    const BOOK_MASK_SIZE = 90;

    const SHLOKA_MASK_TOP = shlokaTop;
    const SHLOKA_MASK_LEFT = 8;
    const SHLOKA_MASK_WIDTH = width - 16;
    const SHLOKA_MASK_HEIGHT = shlokaHeight;

    const FIRST_TASK_MASK_LEFT = 16;
    const FIRST_TASK_MASK_TOP = firstTaskTop;
    const FIRST_TASK_MASK_WIDTH = width - 32;
    const FIRST_TASK_MASK_HEIGHT = 125;

    const COMBINED_MASK_TOP = shlokaTop;
    const COMBINED_MASK_LEFT = 8;
    const COMBINED_MASK_WIDTH = width - 16;
    const COMBINED_MASK_HEIGHT = combinedHeight;

    const CARD_OFFSET = 20;

    const maskStyles = StyleSheet.create({
      addTaskMask: {
        position: 'absolute',
        left: ADD_TASK_MASK_LEFT,
        bottom: ADD_TASK_MASK_BOTTOM,
        width: ADD_TASK_MASK_WIDTH,
        height: ADD_TASK_MASK_HEIGHT,
        backgroundColor: 'white',
      },
      bookMask: {
        position: 'absolute',
        right: BOOK_MASK_RIGHT,
        top: BOOK_MASK_TOP,
        width,
        height: BOOK_MASK_SIZE,
        borderRadius: 20,
        backgroundColor: 'white',
      },
      shlokaMask: {
        position: 'absolute',
        left: SHLOKA_MASK_LEFT,
        top: SHLOKA_MASK_TOP,
        width: SHLOKA_MASK_WIDTH,
        height: SHLOKA_MASK_HEIGHT,
        borderRadius: 16,
        backgroundColor: 'white',
      },
      firstTaskMask: {
        position: 'absolute',
        left: FIRST_TASK_MASK_LEFT,
        top: FIRST_TASK_MASK_TOP,
        width: FIRST_TASK_MASK_WIDTH,
        height: FIRST_TASK_MASK_HEIGHT,
        borderRadius: 12,
        backgroundColor: 'white',
      },
      combinedMask: {
        position: 'absolute',
        left: COMBINED_MASK_LEFT,
        top: COMBINED_MASK_TOP,
        width: COMBINED_MASK_WIDTH,
        height: COMBINED_MASK_HEIGHT,
        borderRadius: 16,
        backgroundColor: 'white',
      },
    });

    const cardPositions = StyleSheet.create({
      shlokaCard: {
        top: SHLOKA_MASK_TOP + SHLOKA_MASK_HEIGHT + CARD_OFFSET,
        alignSelf: 'center' as const,
      },
      addTaskCard: {
        bottom: ADD_TASK_MASK_BOTTOM + ADD_TASK_MASK_HEIGHT + CARD_OFFSET,
        alignSelf: 'center' as const,
      },
      toggleTaskCard: {
        top: COMBINED_MASK_TOP + COMBINED_MASK_HEIGHT + CARD_OFFSET,
        alignSelf: 'center' as const,
      },
      focusModeCard: {
        bottom: height - FIRST_TASK_MASK_TOP + CARD_OFFSET,
        alignSelf: 'center' as const,
      },
      bookCard: {
        top: BOOK_MASK_TOP + 60,
        right: 20,
        maxWidth: 280,
      },
    });

    const backgroundHeights = {
      addTaskFill: height - ADD_TASK_MASK_BOTTOM - ADD_TASK_MASK_HEIGHT,
      bookTop: BOOK_MASK_TOP,
      shlokaTop: SHLOKA_MASK_TOP,
      firstTaskTop: FIRST_TASK_MASK_TOP,
      combinedTop: COMBINED_MASK_TOP,
    };

    return { width, height, maskStyles, cardPositions, backgroundHeights };
  }, [width, height]);
}
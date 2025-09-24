import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// More responsive positioning
const getResponsiveValues = () => {
  const isSmallScreen = height < 700;
  const isTallScreen = height > 900;
  
  return {
    shlokaTop: isSmallScreen ? height * 0.08 : height * 0.05,
    shlokaHeight: isSmallScreen ? height * 0.28 : height * 0.40,
    firstTaskTop: isSmallScreen ? height * 0.45 : isTallScreen ? height * 0.48 : height * 0.50,
    combinedHeight: isSmallScreen ? height * 0.45 : height * 0.65,
    bookTop: isSmallScreen ? height * 0.32 : height * 0.34,
  };
};

const responsive = getResponsiveValues();

// Updated constants
export const ADD_TASK_MASK_LEFT = 8;
export const ADD_TASK_MASK_BOTTOM = 10;
export const ADD_TASK_MASK_WIDTH = width;
export const ADD_TASK_MASK_HEIGHT = 110;

export const BOOK_MASK_RIGHT = 0;
export const BOOK_MASK_TOP = responsive.bookTop;
export const BOOK_MASK_SIZE = 90;

export const SHLOKA_MASK_TOP = responsive.shlokaTop;
export const SHLOKA_MASK_LEFT = 8;
export const SHLOKA_MASK_WIDTH = width - 16;
export const SHLOKA_MASK_HEIGHT = responsive.shlokaHeight;

export const FIRST_TASK_MASK_LEFT = 16;
export const FIRST_TASK_MASK_TOP = responsive.firstTaskTop;
export const FIRST_TASK_MASK_WIDTH = width - 32;
export const FIRST_TASK_MASK_HEIGHT = 125;

export const COMBINED_MASK_TOP = responsive.shlokaTop;
export const COMBINED_MASK_LEFT = 8;
export const COMBINED_MASK_WIDTH = width - 16;
export const COMBINED_MASK_HEIGHT = responsive.combinedHeight;

export const masksStyles = StyleSheet.create({
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
    width: width,
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
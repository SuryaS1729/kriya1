import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Position constants for masks - adjusted for your layout
export const ADD_TASK_MASK_LEFT = 8;
export const ADD_TASK_MASK_BOTTOM = 30; // Bottom position for add task button
export const ADD_TASK_MASK_WIDTH = width;
export const ADD_TASK_MASK_HEIGHT = 90;

export const BOOK_MASK_RIGHT = 95;
export const BOOK_MASK_TOP = height * 0.35; // Approximate book button position
export const BOOK_MASK_SIZE = 60;

export const SHLOKA_MASK_TOP = height * 0.05;
export const SHLOKA_MASK_LEFT = 8;
export const SHLOKA_MASK_WIDTH = width - 16;
export const SHLOKA_MASK_HEIGHT = height * 0.35;

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
    width: BOOK_MASK_SIZE,
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
});
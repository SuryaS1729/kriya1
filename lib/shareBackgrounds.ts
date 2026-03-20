import type { ImageSourcePropType } from 'react-native';

export type ShareFormatId = 'story' | 'post';
export type BackgroundType = 'image' | 'gradient';
export type TextBoxPosition = 'top' | 'center' | 'bottom';

type ShareBackgroundBase = {
  id: string;
  label: string;
  type: BackgroundType;
  colors: readonly string[];
  textBoxBg: string;
  textBoxPosition: TextBoxPosition;
  textColor: string;
  translationColor: string;
  refColor: string;
  brandingColor: string;
  defaultBgOpacity: number;
};

export type ShareImageBackground = ShareBackgroundBase & {
  type: 'image';
  imageUrl: string;
};

export type ShareGradientBackground = ShareBackgroundBase & {
  type: 'gradient';
};

export type ShareBackground = ShareImageBackground | ShareGradientBackground;

const SHARE_BACKGROUND_BASE_URL = process.env.EXPO_PUBLIC_R2_SHARE_BACKGROUNDS_URL;

const buildR2Url = (path: string) =>
  `${(SHARE_BACKGROUND_BASE_URL || '').replace(/\/$/, '')}/${path}`;

const imageBackground = (
  config: Omit<ShareImageBackground, 'type'>,
): ShareImageBackground => ({
  ...config,
  type: 'image',
});

const REMOTE_BACKGROUND_IDS = [
  'b01',
  'b02',
  'b03',
  'b04',
  'b05',
  'b06',
  'b07',
  'b08',
  'b09',
  'b10',
  'b11',
  'b12',
  'b13',
  'b14',
  'b15',
  'b16',
] as const;

export const SHARE_BACKGROUNDS = [
  {
    id: 'ocean',
    label: 'Ocean',
    type: 'gradient',
    colors: ['#0f0c29', '#16537e', '#0f0c29'],
    textBoxBg: 'rgba(15, 52, 96, 0.00)',
    textBoxPosition: 'center',
    textColor: '#e0f0ff',
    translationColor: '#b8d8f0',
    refColor: '#8ab4d4',
    brandingColor: '#cce5ff',
    defaultBgOpacity: 1,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    type: 'gradient',
    colors: ['#0f0c29', '#302b63', '#24243e'],
    textBoxBg: 'rgba(15, 12, 41, 0.00)',
    textBoxPosition: 'center',
    textColor: '#e8e6f0',
    translationColor: '#c8c4d8',
    refColor: '#9a96b0',
    brandingColor: '#d4d0e8',
    defaultBgOpacity: 1,
  },
  ...REMOTE_BACKGROUND_IDS.map((id) =>
    imageBackground({
      id,
      label: id.toUpperCase(),
      colors: ['#1a1a2e', '#16213e'],
      textBoxBg: 'rgba(20, 10, 30, 0.15)',
      textBoxPosition: 'center',
      textColor: '#ffffff',
      translationColor: '#f5f5f5',
      refColor: '#ffffff',
      brandingColor: '#ffffff',
      defaultBgOpacity: 0.6,
      imageUrl: buildR2Url(`backgrounds/${id}.jpeg`),
    }),
  ),
] as const satisfies readonly ShareBackground[];

export type ShareBackgroundId = typeof SHARE_BACKGROUNDS[number]['id'];

export function getShareBackground(id: ShareBackgroundId) {
  return SHARE_BACKGROUNDS.find((background) => background.id === id) ?? SHARE_BACKGROUNDS[0];
}

export function getShareBackgroundImageSource(background: ShareImageBackground): ImageSourcePropType {
  return { uri: background.imageUrl };
}

import type { ImageSourcePropType } from 'react-native';
import { PUBLIC_ASSET_BASE_URL } from './publicAssetBaseUrl';

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

const buildR2Url = (path: string) =>
  `${PUBLIC_ASSET_BASE_URL.replace(/\/$/, '')}/${path}`;

const imageBackground = (
  config: Omit<ShareImageBackground, 'type'>,
): ShareImageBackground => ({
  ...config,
  type: 'image',
});

// Default styling applied to any remote background that doesn't ship its own
// values in index.json. Keeps the JSON payload tiny (just ids + optional overrides).
const DEFAULT_REMOTE_STYLE = {
  colors: ['#1a1a2e', '#16213e'],
  textBoxBg: 'rgba(0, 17, 28, 0.55)',
  textBoxPosition: 'center',
  textColor: '#ffffff',
  translationColor: '#f5f5f5',
  refColor: '#ffffff',
  brandingColor: '#ffffff',
  defaultBgOpacity: 1,
} as const satisfies Omit<ShareBackgroundBase, 'id' | 'label' | 'type'>;

// The R2 index.json payload — only id is required; everything else is optional
// and falls back to DEFAULT_REMOTE_STYLE.
type RemoteBackgroundEntry = Partial<
  Omit<ShareBackgroundBase, 'id' | 'type'>
> & {
  id: string;
};

export const SHARE_BACKGROUNDS: ShareBackground[] = [
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
];

// Kept as a fallback so the UI still shows the classic remote set if the
// index.json fetch fails (offline, R2 hiccup) — same ids it always shipped.
const FALLBACK_REMOTE_IDS = [
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

export const REMOTE_INDEX_URL = buildR2Url('backgrounds/index.json');

const buildRemoteBackground = (id: string): ShareImageBackground =>
  imageBackground({
    id,
    label: id.toUpperCase(),
    ...DEFAULT_REMOTE_STYLE,
    imageUrl: buildR2Url(`backgrounds/${id}.jpeg`),
  });

const fallbackRemoteBackgrounds = (): ShareImageBackground[] =>
  FALLBACK_REMOTE_IDS.map(buildRemoteBackground);

let remoteBackgroundsCache: ShareImageBackground[] | null = null;

function resolveRemoteBackgrounds(): ShareImageBackground[] {
  return remoteBackgroundsCache ?? fallbackRemoteBackgrounds();
}

// Fetches backgrounds/index.json from R2 once and merges any entries into the
// static list. Call this on app load; the resolved list is cached in memory.
// Returns the full resolved list so the caller can also use it for rendering.
export async function loadRemoteBackgrounds(): Promise<ShareBackground[]> {
  try {
    const response = await fetch(REMOTE_INDEX_URL);
    if (!response.ok) throw new Error(`R2 index.json: HTTP ${response.status}`);

    const entries: RemoteBackgroundEntry[] = await response.json();
    if (!Array.isArray(entries)) throw new Error('R2 index.json: expected an array');

    const seen = new Set<string>();
    const merged = entries.map((entry): ShareImageBackground => {
      seen.add(entry.id);
      return imageBackground({
        id: entry.id,
        label: entry.label ?? entry.id.toUpperCase(),
        colors: entry.colors ?? DEFAULT_REMOTE_STYLE.colors,
        textBoxBg: entry.textBoxBg ?? DEFAULT_REMOTE_STYLE.textBoxBg,
        textBoxPosition: entry.textBoxPosition ?? DEFAULT_REMOTE_STYLE.textBoxPosition,
        textColor: entry.textColor ?? DEFAULT_REMOTE_STYLE.textColor,
        translationColor: entry.translationColor ?? DEFAULT_REMOTE_STYLE.translationColor,
        refColor: entry.refColor ?? DEFAULT_REMOTE_STYLE.refColor,
        brandingColor: entry.brandingColor ?? DEFAULT_REMOTE_STYLE.brandingColor,
        defaultBgOpacity: entry.defaultBgOpacity ?? DEFAULT_REMOTE_STYLE.defaultBgOpacity,
        imageUrl: buildR2Url(`backgrounds/${entry.id}.jpeg`),
      });
    });

    // Replace the cache with whatever R2 actually lists — no stale ids left behind.
    remoteBackgroundsCache = merged;
    return merged.length > 0 ? [...SHARE_BACKGROUNDS, ...merged] : SHARE_BACKGROUNDS;
  } catch (error) {
    console.warn('[Share] Failed to load remote backgrounds index:', error);
    // Cache a sentinel so a failed fetch doesn't retry on every render.
    remoteBackgroundsCache = [];
    return resolveRemoteBackgrounds();
  }
}

// Synchronous accessor used by the rest of the app: returns static gradients
// plus whatever remote backgrounds have been resolved so far (fallback ids
// until loadRemoteBackgrounds() completes, then the R2 list).
export function getShareBackgrounds(): ShareBackground[] {
  return [...SHARE_BACKGROUNDS, ...resolveRemoteBackgrounds()];
}

export type ShareBackgroundId = ShareBackground['id'];

export function getShareBackground(id: ShareBackgroundId) {
  return getShareBackgrounds().find((background) => background.id === id) ?? SHARE_BACKGROUNDS[0];
}

export function getShareBackgroundImageSource(background: ShareImageBackground): ImageSourcePropType {
  return { uri: background.imageUrl };
}

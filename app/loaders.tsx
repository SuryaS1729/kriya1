import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Feather from '@react-native-vector-icons/feather/static';
import {
  CurveLoader,
  curveNames,
  curves,
  type CurveName,
} from '@animatereactnative/skia-loaders';
import { useKriya } from '../lib/store';

const SWATCHES = ['#bada55', '#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#ffffff', '#111111'];
const GRID_SIZE = 130;
const HERO_SIZE = 190;

export default function LoadersGallery() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDarkMode = useKriya((s) => s.isDarkMode);

  const [selected, setSelected] = useState<CurveName>('roseOrbit');
  const [color, setColor] = useState(isDarkMode ? '#ffffff' : '#111111');
  const [paused, setPaused] = useState(false);

  const numColumns = width > 520 ? 3 : 2;
  const meta = useMemo(() => curves[selected], [selected]);

  const bg = isDarkMode ? '#0b0f14' : '#f8fafc';
  const cardBg = isDarkMode ? '#151c26' : '#ffffff';
  const cardBorder = isDarkMode ? '#243041' : '#e5e7eb';
  const text = isDarkMode ? '#e5e7eb' : '#111827';
  const subtext = isDarkMode ? '#9ca3af' : '#6b7280';
  const loaderColor = color;

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: text }]}>Skia Loaders</Text>
          <Text style={[styles.subtitle, { color: subtext }]}>
            {curveNames.length} curves · tap any tile to preview
          </Text>
        </View>
        <Pressable
          onPress={() => setPaused((p) => !p)}
          hitSlop={12}
          style={[styles.pauseBtn, { borderColor: cardBorder }]}
        >
          <Feather
            name={paused ? 'play' : 'pause'}
            size={18}
            color={text}
          />
        </Pressable>
      </View>

      {/* Hero preview */}
      <View style={[styles.hero, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <CurveLoader
          curve={selected}
          size={HERO_SIZE}
          color={loaderColor}
          paused={paused}
        />
        <Text style={[styles.heroName, { color: text }]}>{meta.name}</Text>
        <Text style={[styles.heroKey, { color: subtext }]}>
          {selected} · {meta.tag} · {meta.particleCount} particles
        </Text>

        {/* Color swatches */}
        <View style={styles.swatches}>
          {SWATCHES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.swatch,
                {
                  backgroundColor: c,
                  borderColor: c === color ? (isDarkMode ? '#fff' : '#111') : cardBorder,
                  borderWidth: c === color ? 3 : 1,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={curveNames}
        keyExtractor={(name) => name}
        numColumns={numColumns}
        key={numColumns}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item: name, index }) => {
          const info = curves[name];
          const active = name === selected;
          return (
            <Pressable
              onPress={() => setSelected(name)}
              style={[
                styles.cell,
                {
                  backgroundColor: cardBg,
                  borderColor: active ? loaderColor : cardBorder,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <CurveLoader
                curve={name}
                size={GRID_SIZE}
                color={loaderColor}
                paused={paused}
                phaseOffset={index / curveNames.length}
              />
              <Text style={[styles.cellName, { color: text }]} numberOfLines={1}>
                {info.name}
              </Text>
              <Text style={[styles.cellKey, { color: subtext }]} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  pauseBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  heroName: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  heroKey: { fontSize: 12, marginTop: 2 },
  swatches: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
  grid: { paddingHorizontal: 16, gap: 12 },
  row: { gap: 12 },
  cell: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  cellName: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  cellKey: { fontSize: 11, marginTop: 1 },
});

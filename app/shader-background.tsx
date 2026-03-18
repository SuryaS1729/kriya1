import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import WaterShaderBackground from '../components/WaterShaderBackground';
import { TopBar } from '../components/TopBar';
import { useKriya } from '../lib/store';

export default function ShaderBackgroundScreen() {
  const isDarkMode = useKriya((state) => state.isDarkMode);
  const [variant, setVariant] = React.useState<'turbulence' | 'caustics'>('turbulence');
  const isCaustics = variant === 'caustics';

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#02141c' : '#dff7ff' }]}>
      <WaterShaderBackground variant={variant} />

      <View
        style={[
          styles.vignette,
          { backgroundColor: isDarkMode ? 'rgba(2, 8, 14, 0.34)' : 'rgba(226, 248, 255, 0.24)' },
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        <TopBar title="Shader Test" isDarkMode={true} />

        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.switchRow}>
              <ShaderToggle
                active={!isCaustics}
                icon="wind"
                label="Original"
                onPress={() => setVariant('turbulence')}
              />
              <ShaderToggle
                active={isCaustics}
                icon="droplet"
                label="Caustics"
                onPress={() => setVariant('caustics')}
              />
            </View>

            <View style={styles.badge}>
              <Feather name="droplet" size={14} color="#dff9ff" />
              <Text style={styles.badgeText}>
                {isCaustics ? 'Skia Caustics Shader' : 'Skia Runtime Shader'}
              </Text>
            </View>

            <Text style={styles.title}>
              {isCaustics ? 'Pool-style caustics background' : 'Water-style animated background'}
            </Text>
            <Text style={styles.subtitle}>
              {isCaustics
                ? 'This version uses layered caustic lines and underwater turbulence so you can compare a brighter, more refracted look.'
                : 'This is your original turbulence shader translated into Skia so you can test motion, color, and text readability inside the app.'}
            </Text>
          </View>

          <View style={styles.previewRow}>
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Motion</Text>
              <Text style={styles.previewValue}>
                {isCaustics ? 'Refraction waves' : 'Continuous'}
              </Text>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Palette</Text>
              <Text style={styles.previewValue}>
                {isCaustics ? 'Pool cyan' : 'Aqua / teal'}
              </Text>
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>What to check</Text>
            <Text style={styles.noteText}>Smoothness on device</Text>
            <Text style={styles.noteText}>If foreground cards stay readable</Text>
            <Text style={styles.noteText}>Whether you want this brighter, darker, or slower</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ShaderToggle({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        active ? styles.toggleActive : styles.toggleInactive,
      ]}
    >
      <Feather name={icon} size={15} color={active ? '#04131b' : '#dff7ff'} />
      <Text style={[styles.toggleText, active ? styles.toggleTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  heroCard: {
    gap: 14,
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(6, 24, 32, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(219, 244, 255, 0.2)',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  toggleActive: {
    backgroundColor: '#dff7ff',
    borderColor: '#dff7ff',
  },
  toggleInactive: {
    backgroundColor: 'rgba(222, 248, 255, 0.06)',
    borderColor: 'rgba(219, 244, 255, 0.16)',
  },
  toggleText: {
    color: '#dff7ff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#04131b',
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(222, 248, 255, 0.14)',
  },
  badgeText: {
    color: '#effcff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f4feff',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(233, 248, 255, 0.88)',
    fontSize: 15,
    lineHeight: 22,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(7, 27, 36, 0.36)',
    borderWidth: 1,
    borderColor: 'rgba(219, 244, 255, 0.18)',
  },
  previewLabel: {
    color: 'rgba(223, 247, 255, 0.72)',
    fontSize: 13,
    marginBottom: 6,
  },
  previewValue: {
    color: '#f3fdff',
    fontSize: 18,
    fontWeight: '600',
  },
  noteCard: {
    gap: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(5, 18, 25, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(219, 244, 255, 0.16)',
  },
  noteTitle: {
    color: '#f3fdff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  noteText: {
    color: 'rgba(232, 248, 255, 0.84)',
    fontSize: 14,
    lineHeight: 20,
  },
});

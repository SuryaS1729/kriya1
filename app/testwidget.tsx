import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WidgetPreview } from 'react-native-android-widget';
import { EaseView } from 'react-native-ease';

import { HelloWidget } from '@/widgets/HelloWidget';

export default function TestWidget() {
  const [expanded, setExpanded] = useState(false);
  const [isActive, setIsActive] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>EaseView native property demos</Text>
        <Text style={styles.subtitle}>
          Toggle each card to preview animated `borderRadius` and `backgroundColor` directly in
          `app/testwidget.tsx`.
        </Text>

        <View style={styles.section}>
          <View style={styles.copyBlock}>
            <Text style={styles.sectionTitle}>Border Radius</Text>
            <Text style={styles.sectionBody}>
              This card animates the native corner radius. The decorative layers inside make the
              clipping easy to see when it changes from rounded to square.
            </Text>
          </View>

          <Pressable onPress={() => setExpanded((current) => !current)} style={styles.button}>
            <Text style={styles.buttonText}>
              {expanded ? 'Collapse to rounded corners' : 'Expand to square corners'}
            </Text>
          </Pressable>

          <EaseView
            animate={{ borderRadius: expanded ? 0 : 24 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.radiusCard}
          >
            <View style={styles.heroBlock}>
              <View style={styles.heroOrbLarge} />
              <View style={styles.heroOrbSmall} />
              <Text style={styles.heroLabel}>{expanded ? 'Expanded' : 'Rounded'}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Children stay clipped</Text>
              <Text style={styles.cardText}>
                `EaseView` strips any conflicting `borderRadius` from `style` and applies the
                animated value natively instead.
              </Text>
            </View>
          </EaseView>
        </View>

        <View style={styles.section}>
          <View style={styles.copyBlock}>
            <Text style={styles.sectionTitle}>Background Color</Text>
            <Text style={styles.sectionBody}>
              This card animates between a neutral and active fill. The text outside the animated
              value stays normal React Native content while the container color transitions natively.
            </Text>
          </View>

          <Pressable onPress={() => setIsActive((current) => !current)} style={styles.button}>
            <Text style={styles.buttonText}>
              {isActive ? 'Set inactive color' : 'Set active color'}
            </Text>
          </Pressable>

          <EaseView
            animate={{ backgroundColor: isActive ? '#3B82F6' : '#E5E7EB' }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.colorCard}
          >
            <Text style={[styles.cardTitle, { color: isActive ? '#ffffff' : '#0f172a' }]}>
              {isActive ? 'Active state' : 'Idle state'}
            </Text>
            <Text style={[styles.cardText, { color: isActive ? 'rgba(255,255,255,0.88)' : '#475569' }]}>
              Colors are converted from React Native color values to native color integers before
              the platform animation runs.
            </Text>
          </EaseView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Widget Preview</Text>
          <WidgetPreview renderWidget={() => <HelloWidget />} width={320} height={200} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  section: {
    gap: 14,
  },
  copyBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  radiusCard: {
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4f0',
  },
  heroBlock: {
    height: 150,
    backgroundColor: '#0f172a',
    justifyContent: 'flex-end',
    padding: 18,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#38bdf8',
    top: -28,
    right: -30,
    opacity: 0.92,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f97316',
    bottom: -22,
    left: -12,
    opacity: 0.9,
  },
  heroLabel: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  cardBody: {
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  colorCard: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
});

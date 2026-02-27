import React from 'react';
import { Platform, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';
import { spacing } from '../../shared/theme/tokens';

type VoiceCardProps = {
  top: React.ReactNode;
  center: React.ReactNode;
  bottom: React.ReactNode;
};

export function VoiceCard({ top, center, bottom }: VoiceCardProps) {
  const { height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const cardHeight = React.useMemo(() => Math.round(height * 0.78), [height]);
  const gradientColors = colorScheme === 'dark'
    ? ['rgba(39,73,58,0.84)', 'rgba(31,58,47,0.80)', 'rgba(24,46,38,0.84)']
    : ['rgba(191,224,204,0.86)', 'rgba(150,201,170,0.78)', 'rgba(104,166,133,0.82)'];

  const LinearGradient = React.useMemo(() => {
    try {
      return require('expo-linear-gradient').LinearGradient;
    } catch {
      return null;
    }
  }, []);

  const BlurView = React.useMemo(() => {
    try {
      return require('expo-blur').BlurView;
    } catch {
      return null;
    }
  }, []);

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      {LinearGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        />
      ) : (
        <View
          style={[
            styles.gradientFallback,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(31,58,47,0.82)' : 'rgba(150,201,170,0.82)' }
          ]}
        />
      )}

      {BlurView ? <BlurView intensity={28} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.blur} /> : null}
      <View pointerEvents="none" style={styles.glassOverlay} />
      <View pointerEvents="none" style={styles.tintBlend} />

      <View pointerEvents="none" style={[styles.bgCircle, styles.circleA]} />
      <View pointerEvents="none" style={[styles.bgCircle, styles.circleB]} />
      <View pointerEvents="none" style={[styles.bgCircle, styles.circleC]} />
      <View pointerEvents="none" style={[styles.bgCircle, styles.circleD]} />

      <View style={styles.topZone}>{top}</View>
      <View style={styles.centerZone}>{center}</View>
      <View style={styles.bottomZone}>{bottom}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 36,
    overflow: 'hidden',
    padding: spacing.xl,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  },
  gradient: {
    ...StyleSheet.absoluteFillObject
  },
  gradientFallback: {
    ...StyleSheet.absoluteFillObject
  },
  blur: {
    ...StyleSheet.absoluteFillObject
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  tintBlend: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  circleA: {
    top: 72,
    right: -44,
    width: 150,
    height: 150,
    opacity: 0.1
  },
  circleB: {
    top: '38%',
    left: -48,
    width: 128,
    height: 128,
    opacity: 0.08
  },
  circleC: {
    bottom: 108,
    right: 28,
    width: 84,
    height: 84,
    opacity: 0.09
  },
  circleD: {
    bottom: -34,
    left: 52,
    width: 112,
    height: 112,
    opacity: Platform.OS === 'android' ? 0.07 : 0.09
  },
  topZone: {
    width: '100%'
  },
  centerZone: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bottomZone: {
    width: '100%',
    alignItems: 'center'
  }
});

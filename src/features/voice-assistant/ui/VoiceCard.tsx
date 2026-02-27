import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

type VoiceCardProps = {
  top: React.ReactNode;
  center: React.ReactNode;
  bottom: React.ReactNode;
};

export function VoiceCard({ top, center, bottom }: VoiceCardProps) {
  const { height: viewportHeight } = useWindowDimensions();
  const cardHeightStyle = React.useMemo(
    () => ({
      height: Math.round(viewportHeight * 0.7)
    }),
    [viewportHeight]
  );
  const LinearGradient = React.useMemo(() => {
    try {
      return require('expo-linear-gradient').LinearGradient;
    } catch {
      return null;
    }
  }, []);
  const skia = React.useMemo(() => {
    try {
      return require('@shopify/react-native-skia');
    } catch {
      return null;
    }
  }, []);

  return (
    <View style={[styles.card, cardHeightStyle]}>
      {LinearGradient ? (
        <LinearGradient
          colors={['#CFE2D9', '#E8CDA8', '#D8C2D9']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        />
      ) : skia ? (
        <SkiaGradientBackground skia={skia} />
      ) : (
        <View style={styles.gradientFallback} />
      )}

      <View style={styles.atmosphereCircleTop} />
      <View style={styles.atmosphereCircleMid} />
      <View style={styles.atmosphereCircleBottom} />

      <View style={styles.topZone}>{top}</View>
      <View style={styles.centerZone}>{center}</View>
      <View style={styles.bottomZone}>{bottom}</View>
    </View>
  );
}

function SkiaGradientBackground({ skia }: { skia: any }) {
  const { Canvas, RoundedRect, LinearGradient, vec, Circle } = skia;

  return React.createElement(
    Canvas,
    { style: styles.gradient },
    React.createElement(
      RoundedRect,
      { x: 0, y: 0, width: 1000, height: 2200, r: 36 },
      React.createElement(LinearGradient, {
        start: vec(0, 0),
        end: vec(0, 2200),
        colors: ['#CFE2D9', '#E8CDA8', '#D8C2D9']
      })
    ),
    React.createElement(Circle, { cx: 820, cy: 200, r: 170, color: 'rgba(255,255,255,0.18)' }),
    React.createElement(Circle, { cx: 180, cy: 1080, r: 210, color: 'rgba(255,255,255,0.12)' }),
    React.createElement(Circle, { cx: 760, cy: 1720, r: 230, color: 'rgba(255,255,255,0.14)' })
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 36,
    overflow: 'hidden',
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12
  },
  gradient: {
    ...StyleSheet.absoluteFillObject
  },
  gradientFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E4D6C0'
  },
  atmosphereCircleTop: {
    position: 'absolute',
    top: 52,
    right: -48,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.16)'
  },
  atmosphereCircleMid: {
    position: 'absolute',
    top: '42%',
    left: -72,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  atmosphereCircleBottom: {
    position: 'absolute',
    bottom: -84,
    right: -32,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.14)'
  },
  topZone: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bottomZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 22,
    width: '100%'
  }
});

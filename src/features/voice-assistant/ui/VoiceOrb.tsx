import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';

type VoiceOrbProps = {
  size?: number;
  status: VoiceAssistantStatus;
  voiceEnergy: SharedValue<number>;
  reduceMotion?: boolean;
};

function speedForStatus(status: VoiceAssistantStatus): number {
  if (status === 'listening') return 4200;
  if (status === 'processing') return 7600;
  return 9800;
}

export function VoiceOrb({ size = 260, status, voiceEnergy, reduceMotion = false }: VoiceOrbProps) {
  const swirl = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const hasSkia = React.useMemo(() => {
    try {
      return Boolean(require('@shopify/react-native-skia'));
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    if (reduceMotion) {
      swirl.value = withTiming(0, { duration: 0 });
      shimmer.value = withTiming(status === 'processing' ? 1 : 0, { duration: 220 });
      return;
    }

    swirl.value = withRepeat(
      withTiming(1, {
        duration: speedForStatus(status),
        easing: Easing.linear
      }),
      -1,
      false
    );

    shimmer.value = status === 'processing'
      ? withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0, { duration: 220 });
  }, [reduceMotion, shimmer, status, swirl]);

  const orbStyle = useAnimatedStyle(() => {
    const pulse = interpolate(voiceEnergy.value, [0, 1], [1, reduceMotion ? 1.02 : 1.08]);
    return {
      transform: [{ scale: pulse }]
    };
  });

  const blobAStyle = useAnimatedStyle(() => {
    const angle = swirl.value * Math.PI * 2;
    const radius = interpolate(voiceEnergy.value, [0, 1], [14, 26]);
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle * 1.2) * radius },
        { scale: interpolate(voiceEnergy.value, [0, 1], [0.95, 1.18]) }
      ],
      opacity: interpolate(voiceEnergy.value, [0, 1], [0.5, 0.9])
    };
  });

  const blobBStyle = useAnimatedStyle(() => {
    const angle = swirl.value * Math.PI * 2;
    const radius = interpolate(voiceEnergy.value, [0, 1], [10, 24]);
    return {
      transform: [
        { translateX: Math.cos(angle + 1.7) * radius },
        { translateY: Math.sin(angle * 0.9 + 1.3) * radius },
        { scale: interpolate(voiceEnergy.value, [0, 1], [0.92, 1.14]) }
      ],
      opacity: interpolate(voiceEnergy.value, [0, 1], [0.46, 0.84])
    };
  });

  const blobCStyle = useAnimatedStyle(() => {
    const angle = swirl.value * Math.PI * 2;
    const radius = interpolate(voiceEnergy.value, [0, 1], [12, 22]);
    return {
      transform: [
        { translateX: Math.cos(angle + 3.1) * radius },
        { translateY: Math.sin(angle * 1.1 + 3.8) * radius },
        { scale: interpolate(voiceEnergy.value, [0, 1], [0.88, 1.1]) }
      ],
      opacity: interpolate(voiceEnergy.value, [0, 1], [0.42, 0.72])
    };
  });

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.24
  }));

  const orbDimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Animated.View style={[styles.orbWrap, orbDimension, orbStyle]}>
      {hasSkia ? (
        <SkiaBackdrop size={size} />
      ) : (
        <View style={[styles.glassFallback, orbDimension]} />
      )}

      <View style={[styles.clip, orbDimension]}>
        <Animated.View style={[styles.blob, styles.blobA, blobAStyle]} />
        <Animated.View style={[styles.blob, styles.blobB, blobBStyle]} />
        <Animated.View style={[styles.blob, styles.blobC, blobCStyle]} />
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
      </View>

      <View style={[styles.glassHighlight, orbDimension]} />
      <View style={[styles.glassEdge, orbDimension]} />
    </Animated.View>
  );
}

function SkiaBackdrop({ size }: { size: number }) {
  const skia = React.useMemo(() => {
    try {
      return require('@shopify/react-native-skia');
    } catch {
      return null;
    }
  }, []);

  if (!skia) return null;

  const { Canvas, Circle, Group, LinearGradient, vec } = skia;

  return React.createElement(
    Canvas,
    { style: [StyleSheet.absoluteFill, { width: size, height: size, borderRadius: size / 2 }] },
    React.createElement(
      Group,
      null,
      React.createElement(Circle, {
        cx: size / 2,
        cy: size / 2,
        r: size / 2,
        color: '#0f2f24'
      }),
      React.createElement(Circle, {
        cx: size * 0.36,
        cy: size * 0.3,
        r: size * 0.64,
        children: React.createElement(LinearGradient, {
          start: vec(0, 0),
          end: vec(size, size),
          colors: ['rgba(186,244,221,0.52)', 'rgba(74,173,135,0.1)']
        })
      })
    )
  );
}

const styles = StyleSheet.create({
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  clip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  glassFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120, 186, 157, 0.14)'
  },
  blob: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70
  },
  blobA: {
    backgroundColor: 'rgba(107, 219, 168, 0.62)'
  },
  blobB: {
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: 'rgba(78, 156, 248, 0.52)'
  },
  blobC: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(225, 141, 243, 0.44)'
  },
  shimmer: {
    position: 'absolute',
    width: '82%',
    height: '82%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)'
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)'
  },
  glassEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  }
});

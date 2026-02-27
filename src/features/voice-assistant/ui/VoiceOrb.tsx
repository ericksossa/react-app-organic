import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';

type VoiceOrbProps = {
  status: VoiceAssistantStatus;
  voiceEnergy: SharedValue<number>;
  active?: boolean;
  reduceMotion?: boolean;
};

export function VoiceOrb({ status, voiceEnergy, active = true, reduceMotion = false }: VoiceOrbProps) {
  const breathe = useSharedValue(1);
  const spin = useSharedValue(0);
  const blobFloat = useSharedValue(0);

  React.useEffect(() => {
    if (!active || reduceMotion) {
      breathe.value = withTiming(1, { duration: 300 });
      spin.value = withTiming(0, { duration: 300 });
      blobFloat.value = withTiming(0, { duration: 300 });
      return;
    }

    breathe.value = withRepeat(
      withTiming(status === 'listening' ? 1.05 : 1.03, {
        duration: status === 'listening' ? 1400 : 3200,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );

    if (status === 'processing') {
      spin.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1, false);
    } else {
      spin.value = withTiming(0, { duration: 300 });
    }

    blobFloat.value = withRepeat(
      withTiming(1, {
        duration: status === 'listening' ? 1200 : 2400,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );
  }, [active, blobFloat, breathe, reduceMotion, spin, status]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }, { rotate: `${spin.value}deg` }]
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: status === 'listening' ? Math.min(0.32 + voiceEnergy.value * 0.4, 0.72) : 0.2
  }));
  const blobOneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blobFloat.value * 8 - 4 }, { translateY: blobFloat.value * -10 + 5 }, { rotate: `${blobFloat.value * 22 - 11}deg` }]
  }));
  const blobTwoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blobFloat.value * -9 + 4 }, { translateY: blobFloat.value * 8 - 4 }, { rotate: `${blobFloat.value * -20 + 10}deg` }]
  }));
  const blobThreeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blobFloat.value * 6 - 3 }, { translateY: blobFloat.value * 6 - 3 }, { rotate: `${blobFloat.value * 18 - 9}deg` }]
  }));

  const hasSkia = React.useMemo(() => {
    try {
      return Boolean(require('@shopify/react-native-skia'));
    } catch {
      return false;
    }
  }, []);

  return (
    <Animated.View style={[styles.root, orbStyle]}>
      <View style={styles.outer}>
        {hasSkia ? <SkiaMiddle /> : <View style={styles.middleFallback} />}
        {!hasSkia ? (
          <>
            <Animated.View style={[styles.blob, styles.blobCyan, blobOneStyle]} />
            <Animated.View style={[styles.blob, styles.blobMagenta, blobTwoStyle]} />
            <Animated.View style={[styles.blob, styles.blobViolet, blobThreeStyle]} />
          </>
        ) : null}

        <Animated.View style={[styles.middleOverlay, pulseStyle]} />

        <View style={styles.inner} />
        <View style={styles.highlightTop} />
      </View>
    </Animated.View>
  );
}

function SkiaMiddle() {
  const skia = React.useMemo(() => {
    try {
      return require('@shopify/react-native-skia');
    } catch {
      return null;
    }
  }, []);

  if (!skia) return null;

  const { Canvas, Circle, RadialGradient, vec, Group } = skia;

  return React.createElement(
    Canvas,
    { style: styles.middleSkia },
    React.createElement(
      Group,
      null,
      React.createElement(Circle, {
        cx: 90,
        cy: 90,
        r: 90,
        children: React.createElement(RadialGradient, {
          c: vec(76, 66),
          r: 94,
          colors: ['rgba(54,219,221,0.95)', 'rgba(35,169,230,0.72)', 'rgba(30,124,208,0.45)']
        })
      })
    )
  );
}

const styles = StyleSheet.create({
  root: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center'
  },
  outer: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  middleSkia: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'absolute'
  },
  middleFallback: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'absolute',
    backgroundColor: 'rgba(101,202,230,0.58)'
  },
  middleOverlay: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'absolute',
    backgroundColor: 'rgba(19,157,224,0.34)'
  },
  blob: {
    position: 'absolute',
    width: 78,
    height: 58,
    borderRadius: 42,
    opacity: 0.72
  },
  blobCyan: {
    top: 72,
    left: 62,
    backgroundColor: 'rgba(38,197,232,0.88)'
  },
  blobMagenta: {
    top: 50,
    right: 58,
    backgroundColor: 'rgba(227,120,199,0.52)'
  },
  blobViolet: {
    bottom: 54,
    right: 68,
    backgroundColor: 'rgba(138,95,255,0.46)'
  },
  inner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(40,76,160,0.62)'
  },
  highlightTop: {
    position: 'absolute',
    top: 22,
    left: 38,
    width: 120,
    height: 52,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '-16deg' }]
  }
});

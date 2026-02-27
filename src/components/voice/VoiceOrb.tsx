import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../../features/voice-assistant/state/useVoiceAssistant';

type VoiceOrbProps = {
  status: VoiceAssistantStatus;
  voiceEnergy: SharedValue<number>;
  active?: boolean;
  reduceMotion?: boolean;
};

const BASE_SIZE = 230;
const RING_SIZE = 190;

export function VoiceOrb({ status, voiceEnergy, active = true, reduceMotion = false }: VoiceOrbProps) {
  const rotate = useSharedValue(0);
  const breath = useSharedValue(1);
  const wobble = useSharedValue(0);
  const innerPulse = useSharedValue(0.28);
  const { width } = Dimensions.get('window');
  const sizeScale = width < 360 ? 0.88 : width < 390 ? 0.94 : 1;

  React.useEffect(() => {
    if (!active || reduceMotion) {
      rotate.value = withTiming(0, { duration: 220 });
      breath.value = withTiming(1, { duration: 220 });
      wobble.value = withTiming(0, { duration: 220 });
      innerPulse.value = withTiming(0.26, { duration: 220 });
      return;
    }

    const idle = status === 'idle' || status === 'success' || status === 'review' || status === 'error';
    const listening = status === 'listening';
    const processing = status === 'processing';

    breath.value = withRepeat(
      withTiming(listening ? 1.07 : processing ? 1.02 : 1.03, {
        duration: listening ? 1200 : processing ? 2200 : 2500,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );

    if (processing) {
      rotate.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false);
      wobble.value = withTiming(0, { duration: 300 });
    } else if (listening) {
      rotate.value = withTiming(0, { duration: 300 });
      wobble.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else if (idle) {
      rotate.value = withTiming(0, { duration: 300 });
      wobble.value = withTiming(0, { duration: 300 });
    }

    innerPulse.value = withRepeat(
      withTiming(listening ? 0.62 : processing ? 0.4 : 0.3, {
        duration: listening ? 980 : 1900,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );
  }, [active, breath, innerPulse, reduceMotion, rotate, status, wobble]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: breath.value * sizeScale },
      { rotate: `${rotate.value}deg` },
      { rotateZ: `${-1.6 + wobble.value * 3.2}deg` }
    ]
  }));

  const energyGlowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(innerPulse.value + voiceEnergy.value * 0.26, 0.82)
  }));

  const cyanBlobStyle = useAnimatedStyle(() => ({
    opacity: 0.76 + voiceEnergy.value * 0.14
  }));

  return (
    <Animated.View style={[styles.root, orbStyle]}>
      <View style={styles.outerGlass}>
        <View style={styles.innerCream} />
        <Animated.View style={[styles.innerGlow, energyGlowStyle]} />

        <View style={[styles.blob, styles.blobPink]} />
        <Animated.View style={[styles.blob, styles.blobCyan, cyanBlobStyle]} />
        <View style={[styles.blob, styles.blobPurple]} />
        <View style={[styles.blob, styles.blobSand]} />

        <View style={styles.glassSliceBottomLeft} />
        <View style={styles.glassSliceTopRight} />
        <View style={styles.specArc} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    alignItems: 'center',
    justifyContent: 'center'
  },
  outerGlass: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)'
  },
  innerCream: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(241,222,184,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)'
  },
  innerGlow: {
    position: 'absolute',
    width: 162,
    height: 162,
    borderRadius: 81,
    backgroundColor: 'rgba(107,210,228,0.2)'
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.72
  },
  blobPink: {
    width: 44,
    height: 78,
    top: 48,
    left: 102,
    transform: [{ rotate: '8deg' }],
    backgroundColor: 'rgba(231,143,201,0.72)'
  },
  blobCyan: {
    width: 114,
    height: 88,
    top: 96,
    left: 68,
    transform: [{ rotate: '-18deg' }],
    backgroundColor: 'rgba(70,187,230,0.9)'
  },
  blobPurple: {
    width: 42,
    height: 68,
    top: 136,
    left: 132,
    transform: [{ rotate: '26deg' }],
    backgroundColor: 'rgba(138,93,225,0.8)'
  },
  blobSand: {
    width: 106,
    height: 64,
    top: 76,
    left: 52,
    transform: [{ rotate: '26deg' }],
    backgroundColor: 'rgba(233,210,160,0.56)'
  },
  glassSliceBottomLeft: {
    position: 'absolute',
    width: 130,
    height: 108,
    left: 28,
    bottom: 24,
    borderRadius: 54,
    transform: [{ rotate: '-16deg' }],
    backgroundColor: 'rgba(255,255,255,0.22)'
  },
  glassSliceTopRight: {
    position: 'absolute',
    width: 124,
    height: 82,
    right: 28,
    top: 44,
    borderRadius: 46,
    transform: [{ rotate: '20deg' }],
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  specArc: {
    position: 'absolute',
    top: 26,
    left: 40,
    width: 118,
    height: 46,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 44,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.24)',
    transform: [{ rotate: '-24deg' }]
  }
});

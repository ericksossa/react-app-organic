import React from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

type VoiceWaveformProps = {
  active: boolean;
  color: string;
};

export function VoiceWaveform({ active, color }: VoiceWaveformProps) {
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!active || reduceMotion) {
      progress.value = withTiming(0, { duration: 120 });
      return;
    }

    progress.value = withRepeat(withTiming(1, { duration: 780, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [active, progress, reduceMotion]);

  const b1 = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [6, 16]),
    opacity: interpolate(progress.value, [0, 1], [0.6, 1])
  }));

  const b2 = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [8, 24]),
    opacity: interpolate(progress.value, [0, 1], [0.6, 1])
  }));

  const b3 = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [10, 32]),
    opacity: interpolate(progress.value, [0, 1], [0.6, 1])
  }));

  const b4 = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [8, 24]),
    opacity: interpolate(progress.value, [0, 1], [0.6, 1])
  }));

  const b5 = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [6, 16]),
    opacity: interpolate(progress.value, [0, 1], [0.6, 1])
  }));

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.bar, { backgroundColor: color }, b1]} />
      <Animated.View style={[styles.bar, { backgroundColor: color }, b2]} />
      <Animated.View style={[styles.bar, { backgroundColor: color }, b3]} />
      <Animated.View style={[styles.bar, { backgroundColor: color }, b4]} />
      <Animated.View style={[styles.bar, { backgroundColor: color }, b5]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24
  },
  bar: {
    width: 4,
    borderRadius: 999
  }
});

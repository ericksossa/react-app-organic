import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { motionDuration, motionEasings } from './tokens';
import { useReducedMotionSetting } from './useReducedMotionSetting';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotionSetting();
  const progress = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, {
      duration: motionDuration('base', reduceMotion),
      easing: motionEasings.organic
    });
  }, [isFocused, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [reduceMotion ? 0.96 : 0.88, 1]),
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
          { scale: interpolate(progress.value, [0, 1], [0.985, 1]) }
        ]
  }));

  return <Animated.View style={[styles.scene, animatedStyle]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  scene: {
    flex: 1
  }
});

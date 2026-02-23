import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated';
import { motionDuration, motionEasings } from './tokens';
import { useReducedMotionSetting } from './useReducedMotionSetting';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delayMs?: number;
  y?: number;
  scaleFrom?: number;
};

export function Reveal({
  children,
  style,
  delayMs = 0,
  y = 12,
  scaleFrom = 0.985
}: Props) {
  const reduceMotion = useReducedMotionSetting();
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const animation = withTiming(1, {
      duration: motionDuration('base', reduceMotion),
      easing: motionEasings.enter
    });

    const maybeWithDelay = withDelay as unknown as
      | ((ms: number, anim: typeof animation) => typeof animation)
      | undefined;

    progress.value =
      typeof maybeWithDelay === 'function'
        ? maybeWithDelay(reduceMotion ? 0 : delayMs, animation)
        : animation;
  }, [delayMs, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion
      ? []
      : [
          { translateY: interpolate(progress.value, [0, 1], [y, 0]) },
          { scale: interpolate(progress.value, [0, 1], [scaleFrom, 1]) }
        ]
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

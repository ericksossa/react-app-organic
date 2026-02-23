import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { motionDuration, motionSpring } from './tokens';
import { useReducedMotionSetting } from './useReducedMotionSetting';

type Props = PressableProps & {
  children: React.ReactNode;
  pressedScale?: number;
};

export function MotionPressable({
  children,
  style,
  pressedScale = 0.98,
  onPressIn,
  onPressOut,
  ...props
}: Props) {
  const reduceMotion = useReducedMotionSetting();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: pressed.value ? pressedScale : 1 }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(e) => {
          if (!reduceMotion) {
            pressed.value = withTiming(1, { duration: motionDuration('micro', reduceMotion) });
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          if (!reduceMotion) {
            pressed.value = withSpring(0, motionSpring);
          }
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

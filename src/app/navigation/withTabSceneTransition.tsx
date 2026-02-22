import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const CREME_TAB_TRANSITION_MS = 320;

function CremeTabScene({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, {
      duration: CREME_TAB_TRANSITION_MS,
      easing: Easing.out(Easing.cubic)
    });
  }, [isFocused, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.88, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [10, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.985, 1]) }
    ]
  }));

  return <Animated.View style={[styles.scene, animatedStyle]}>{children}</Animated.View>;
}

export function withTabSceneTransition<P extends object>(
  Component: React.ComponentType<P>
) {
  return function CremeTransitionComponent(props: P) {
    return (
      <CremeTabScene>
        <Component {...props} />
      </CremeTabScene>
    );
  };
}

const styles = StyleSheet.create({
  scene: {
    flex: 1
  }
});

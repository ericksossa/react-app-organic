import React from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppSkeleton({ width = '100%', height = 14, radius = 10, style }: Props) {
  const { isDark } = useTheme();
  const opacity = React.useRef(new Animated.Value(0.45)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.82, duration: 620, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 620, useNativeDriver: true })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radius,
          opacity,
          backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
        },
        style
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden'
  }
});

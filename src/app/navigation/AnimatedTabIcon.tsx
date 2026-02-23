import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '../../shared/ui/AppText';

type IconName = 'home' | 'explore' | 'cart';

type Props = {
  focused: boolean;
  label: string;
  icon: IconName;
  activeColor: string;
  inactiveColor: string;
};

const ANIM_DURATION = 220;

export function AnimatedTabIcon({
  focused,
  label,
  icon,
  activeColor,
  inactiveColor
}: Props) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: ANIM_DURATION });
  }, [focused, progress]);

  const activePillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }]
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }]
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.92, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -1]) }]
  }));

  const tone = focused ? activeColor : inactiveColor;

  return (
    <View style={styles.pressable}>
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.activePill,
            { backgroundColor: '#27B37F' },
            activePillStyle
          ]}
        />
        <Animated.View style={[styles.iconCenter, iconStyle]}>
          <TabGlyph icon={icon} color={tone} size={22} focused={focused} />
        </Animated.View>
      </View>
      <Animated.View style={labelStyle}>
        <AppText style={[styles.label, { color: tone }]}>{label}</AppText>
      </Animated.View>
    </View>
  );
}

function TabGlyph({
  icon,
  color,
  size,
  focused
}: {
  icon: IconName;
  color: string;
  size: number;
  focused: boolean;
}) {
  if (icon === 'home') {
    return (
      <Ionicons
        name={focused ? 'leaf' : 'leaf-outline'}
        color={color}
        size={size}
      />
    );
  }

  if (icon === 'explore') {
    return <Feather name="search" color={color} size={size} />;
  }

  return (
    <Ionicons
      name="basket-outline"
      color={color}
      size={Math.max(18, size - 1)}
    />
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2
  },
  iconWrap: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activePill: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '500'
  }
});

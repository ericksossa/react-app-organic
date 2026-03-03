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
import { motionDuration, motionEasings } from '../../design/motion/tokens';
import { useReducedMotionSetting } from '../../design/motion/useReducedMotionSetting';

type IconName = 'home' | 'explore' | 'voice' | 'cart';

type Props = {
  focused: boolean;
  label: string;
  icon: IconName;
  activeColor: string;
  inactiveColor: string;
  badgeCount?: number;
};

export function AnimatedTabIcon({
  focused,
  label,
  icon,
  activeColor,
  inactiveColor,
  badgeCount = 0
}: Props) {
  const reduceMotion = useReducedMotionSetting();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: motionDuration('short', reduceMotion),
      easing: motionEasings.organic
    });
  }, [focused, progress, reduceMotion]);

  const activePillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion ? [] : [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }]
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }]
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.92, 1]),
    transform: reduceMotion ? [] : [{ translateY: interpolate(progress.value, [0, 1], [0, -1]) }]
  }));

  const tone = focused ? activeColor : inactiveColor;
  const showBadge = icon === 'cart' && badgeCount > 0;
  const badgeLabel = badgeCount > 99 ? '99+' : String(Math.trunc(badgeCount));

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
        {showBadge ? (
          <View style={styles.badge} accessibilityLabel={`Productos en canasta: ${badgeLabel}`}>
            <AppText style={styles.badgeText}>{badgeLabel}</AppText>
          </View>
        ) : null}
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

  if (icon === 'voice') {
    return (
      <Ionicons
        name={focused ? 'moon' : 'moon-outline'}
        color={color}
        size={size}
      />
    );
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
  badge: {
    position: 'absolute',
    top: 3,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E75555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12
  },
  label: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '500'
  }
});

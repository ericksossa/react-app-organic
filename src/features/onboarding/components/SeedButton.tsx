import React from 'react';
import { Pressable, StyleSheet, View, type Insets } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { motionDuration, motionEasings } from '../../../design/motion/tokens';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  label?: string;
};

const DEFAULT_SIZE = 100;
const HIT_SLOP: Insets = { top: 14, bottom: 14, left: 14, right: 14 };

// Tweak these to tune the feel/scale of germination without touching call sites.
const GERMINATION_MS = {
  pressA: 110,
  pressB: 90,
  crack: 180,
  leafGrow: 320,
  settle: 160,
  halo: 180
} as const;

export function SeedButton({
  onPress,
  disabled = false,
  size = DEFAULT_SIZE,
  label = 'Entrar al mercado'
}: Props) {
  const reduceMotion = useReducedMotionSetting();
  const [isAnimating, setIsAnimating] = React.useState(false);

  const press = useSharedValue(0);
  const crack = useSharedValue(0);
  const split = useSharedValue(0);
  const stem = useSharedValue(0);
  const leaf = useSharedValue(0);
  const halo = useSharedValue(0);
  const glow = useSharedValue(0);

  const locked = disabled || isAnimating;

  const triggerNavigation = React.useCallback(() => {
    setIsAnimating(false);
    onPress();
  }, [onPress]);

  const animateReduceMotion = React.useCallback(() => {
    press.value = withSequence(
      withTiming(1, { duration: motionDuration('micro', true) }),
      withTiming(0, { duration: motionDuration('short', true) }, (finished) => {
        if (!finished) return;
        runOnJS(triggerNavigation)();
      })
    );
  }, [press, triggerNavigation]);

  const animateGermination = React.useCallback(() => {
    // Stage 1: micro press
    press.value = withSequence(
      withTiming(1, { duration: GERMINATION_MS.pressA, easing: motionEasings.enter }),
      withTiming(0, { duration: GERMINATION_MS.pressB, easing: motionEasings.organic })
    );

    // Stage 2: crack + shell suggestion
    crack.value = withTiming(1, {
      duration: GERMINATION_MS.crack,
      easing: motionEasings.enter
    });
    split.value = withTiming(1, {
      duration: GERMINATION_MS.crack + 40,
      easing: motionEasings.enter
    });

    // Stage 3 + 4: sprout + settle + halo
    stem.value = withTiming(1, {
      duration: GERMINATION_MS.leafGrow,
      easing: motionEasings.organic
    });
    leaf.value = withSequence(
      withTiming(1, {
        duration: GERMINATION_MS.leafGrow,
        easing: motionEasings.organic
      }),
      withTiming(1.04, {
        duration: GERMINATION_MS.settle / 2,
        easing: Easing.out(Easing.quad)
      }),
      withTiming(1, {
        duration: GERMINATION_MS.settle / 2,
        easing: motionEasings.organic
      }, (finished) => {
        if (!finished) return;
        runOnJS(triggerNavigation)();
      })
    );
    halo.value = withSequence(
      withTiming(1, { duration: GERMINATION_MS.halo, easing: motionEasings.enter }),
      withTiming(0, { duration: GERMINATION_MS.leafGrow + GERMINATION_MS.settle, easing: motionEasings.exit })
    );
    glow.value = withTiming(1, {
      duration: GERMINATION_MS.leafGrow + GERMINATION_MS.settle,
      easing: motionEasings.organic
    });
  }, [crack, glow, halo, leaf, press, split, stem, triggerNavigation]);

  const handlePress = React.useCallback(() => {
    if (locked) return;
    setIsAnimating(true);

    if (reduceMotion) {
      animateReduceMotion();
      return;
    }

    animateGermination();
  }, [animateGermination, animateReduceMotion, locked, reduceMotion]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(press.value, [0, 1], [1, 0.96], Extrapolation.CLAMP)
      }
    ]
  }));

  const shellLeftStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: '-18deg' },
      {
        translateX: interpolate(split.value, [0, 1], [0, -2.2], Extrapolation.CLAMP)
      },
      {
        translateY: interpolate(split.value, [0, 1], [0, 0.8], Extrapolation.CLAMP)
      }
    ]
  }));

  const shellRightStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: '18deg' },
      {
        translateX: interpolate(split.value, [0, 1], [0, 2.2], Extrapolation.CLAMP)
      },
      {
        translateY: interpolate(split.value, [0, 1], [0, 0.8], Extrapolation.CLAMP)
      }
    ]
  }));

  const crackLineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(crack.value, [0, 1], [0, 0.9], Extrapolation.CLAMP),
    transform: [
      { rotate: '-8deg' },
      { scaleY: interpolate(crack.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) }
    ]
  }));

  const stemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stem.value, [0, 0.2, 1], [0, 0.6, 0.9], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(stem.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
      { scaleY: interpolate(stem.value, [0, 1], [0.2, 1], Extrapolation.CLAMP) }
    ]
  }));

  const leafClusterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(leaf.value, [0, 0.15, 1], [0, 0.4, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(leaf.value, [0, 1], [10, 0], Extrapolation.CLAMP) },
      { scaleY: interpolate(leaf.value, [0, 1], [0, 1], Extrapolation.CLAMP) },
      { scale: interpolate(leaf.value, [0, 1, 1.04], [0.9, 1, 1.04], Extrapolation.CLAMP) }
    ]
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.value, [0, 1], [0, 0.22], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(halo.value, [0, 1], [0.85, 1.15], Extrapolation.CLAMP) }
    ]
  }));

  const seedBodyStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.24, 0.34], Extrapolation.CLAMP)
  }));

  const containerSize = size;
  const seedWidth = Math.round(size * 0.54);
  const seedHeight = Math.round(size * 0.72);
  const seedRadius = Math.round(seedWidth * 0.44);

  return (
    <Animated.View style={[styles.rootWrap, { width: containerSize, height: containerSize }, rootStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2
          },
          haloStyle
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Abre la app y entra al mercado"
        hitSlop={HIT_SLOP}
        onPress={handlePress}
        disabled={locked}
        style={styles.pressableArea}
      >
        <Animated.View
          style={[
            styles.seedBody,
            seedBodyStyle,
            {
              width: seedWidth,
              height: seedHeight,
              borderRadius: seedRadius
            }
          ]}
        >
          <Animated.View style={[styles.shellHalf, styles.shellLeft, shellLeftStyle]} />
          <Animated.View style={[styles.shellHalf, styles.shellRight, shellRightStyle]} />
          <View style={styles.seedHighlight} />
          <View style={styles.seedShade} />
          <Animated.View style={[styles.crackLine, crackLineStyle]} />
          <Animated.View style={[styles.stem, stemStyle]} />
          <Animated.View style={[styles.leafCluster, leafClusterStyle]}>
            <View style={[styles.leaf, styles.leafMain]} />
            <View style={[styles.leaf, styles.leafSecondary]} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootWrap: {
    marginTop: -50,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible'
  },
  halo: {
    position: 'absolute',
    backgroundColor: '#6bd69f'
  },
  pressableArea: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  seedBody: {
    backgroundColor: '#8a5a38',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#1d120c',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
    elevation: 5
  },
  shellHalf: {
    position: 'absolute',
    width: '54%',
    height: '78%',
    top: '11%',
    backgroundColor: 'rgba(68, 39, 23, 0.18)',
    borderRadius: 999
  },
  shellLeft: {
    left: '18%'
  },
  shellRight: {
    right: '18%'
  },
  seedHighlight: {
    position: 'absolute',
    top: '10%',
    left: '28%',
    width: '28%',
    height: '26%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 230, 201, 0.22)',
    transform: [{ rotate: '-18deg' }]
  },
  seedShade: {
    position: 'absolute',
    bottom: '9%',
    right: '20%',
    width: '34%',
    height: '22%',
    borderRadius: 999,
    backgroundColor: 'rgba(61, 34, 20, 0.2)',
    transform: [{ rotate: '16deg' }]
  },
  crackLine: {
    position: 'absolute',
    width: 2,
    height: '34%',
    backgroundColor: 'rgba(248, 233, 216, 0.95)',
    borderRadius: 999,
    top: '40%'
  },
  stem: {
    position: 'absolute',
    width: 2,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#67bf7f',
    top: -8
  },
  leafCluster: {
    position: 'absolute',
    top: -22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible'
  },
  leaf: {
    position: 'absolute',
    backgroundColor: '#5bd384',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 255, 247, 0.25)'
  },
  leafMain: {
    width: 18,
    height: 12,
    transform: [{ rotate: '-26deg' }, { translateX: -4 }, { translateY: -2 }]
  },
  leafSecondary: {
    width: 14,
    height: 10,
    backgroundColor: '#47bf6f',
    transform: [{ rotate: '28deg' }, { translateX: 5 }, { translateY: -1 }]
  }
});

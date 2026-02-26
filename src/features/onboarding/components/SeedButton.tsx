import React from 'react';
import { Pressable, StyleSheet, View, type Insets } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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
  const slide = useSharedValue(0);
  const crack = useSharedValue(0);
  const split = useSharedValue(0);
  const stem = useSharedValue(0);
  const leaf = useSharedValue(0);
  const root = useSharedValue(0);
  const soil = useSharedValue(0);
  const halo = useSharedValue(0);
  const glow = useSharedValue(0);
  const idle = useSharedValue(0);

  const locked = disabled || isAnimating;

  const triggerNavigation = React.useCallback(() => {
    setIsAnimating(false);
    onPress();
  }, [onPress]);

  const animateReduceMotion = React.useCallback(() => {
    slide.value = withSequence(
      withTiming(1, { duration: motionDuration('micro', true) }),
      withTiming(0.18, { duration: motionDuration('micro', true) }),
      withTiming(0, { duration: motionDuration('short', true) })
    );
    press.value = withSequence(
      withTiming(1, { duration: motionDuration('micro', true) }),
      withTiming(0, { duration: motionDuration('short', true) }, (finished) => {
        if (!finished) return;
        runOnJS(triggerNavigation)();
      })
    );
  }, [press, slide, triggerNavigation]);

  const animateGermination = React.useCallback(() => {
    // Stage 1: micro press
    slide.value = withSequence(
      withTiming(1, { duration: GERMINATION_MS.pressA, easing: motionEasings.enter }),
      withTiming(0.2, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 150, easing: motionEasings.organic })
    );
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
    root.value = withTiming(1, {
      duration: GERMINATION_MS.leafGrow + 80,
      easing: motionEasings.organic
    });
    soil.value = withSequence(
      withTiming(1, {
        duration: GERMINATION_MS.crack + 80,
        easing: motionEasings.enter
      }),
      withTiming(0.35, {
        duration: GERMINATION_MS.leafGrow,
        easing: motionEasings.organic
      })
    );
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
  }, [crack, glow, halo, leaf, press, root, slide, soil, split, stem, triggerNavigation]);

  React.useEffect(() => {
        if (reduceMotion || isAnimating) {
      cancelAnimation(idle);
      cancelAnimation(slide);
      idle.value = 0;
      slide.value = 0;
      return;
    }

    idle.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 2400,
          easing: motionEasings.organic
        }),
        withTiming(0, {
          duration: 2400,
          easing: motionEasings.organic
        })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(idle);
      cancelAnimation(slide);
      idle.value = 0;
      slide.value = 0;
    };
  }, [idle, isAnimating, reduceMotion, slide]);

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
        translateX: interpolate(slide.value, [0, 1], [0, 22], Extrapolation.CLAMP)
      },
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

  const hookStemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stem.value, [0, 0.25, 1], [0, 0.5, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(stem.value, [0, 1], [14, 0], Extrapolation.CLAMP) },
      { rotate: `${interpolate(stem.value, [0, 1], [28, 0], Extrapolation.CLAMP)}deg` },
      { scale: interpolate(stem.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) }
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

  const idleBudStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(idle.value, [0, 1], [0, -0.9], Extrapolation.CLAMP)
      },
      {
        rotate: `${interpolate(idle.value, [0, 1], [-3.2, -2.7], Extrapolation.CLAMP)}deg`
      },
      {
        scale: interpolate(idle.value, [0, 1], [1, 1.012], Extrapolation.CLAMP)
      }
    ]
  }));

  const soilCapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(soil.value, [0, 1], [0, 0.92], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(soil.value, [0, 1], [0, -2.5], Extrapolation.CLAMP) },
      { scaleX: interpolate(soil.value, [0, 1], [0.7, 1], Extrapolation.CLAMP) }
    ]
  }));

  const rootMainStyle = useAnimatedStyle(() => ({
    opacity: interpolate(root.value, [0, 0.2, 1], [0, 0.3, 0.8], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(root.value, [0, 1], [2, 0], Extrapolation.CLAMP) },
      { scaleY: interpolate(root.value, [0, 1], [0.3, 1], Extrapolation.CLAMP) }
    ]
  }));

  const rootLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(root.value, [0, 0.35, 1], [0, 0.2, 0.7], Extrapolation.CLAMP),
    transform: [{ scaleX: interpolate(root.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) }]
  }));

  const rootRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(root.value, [0, 0.4, 1], [0, 0.2, 0.7], Extrapolation.CLAMP),
    transform: [{ scaleX: interpolate(root.value, [0, 1], [0.35, 1], Extrapolation.CLAMP) }]
  }));

  const containerSize = size;
  const buttonDiameter = Math.round(size * 0.62);

  const premiumRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.9, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.03], Extrapolation.CLAMP) }]
  }));

  const premiumCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(leaf.value, [0, 1, 1.04], [1, 1.02, 1], Extrapolation.CLAMP) }]
  }));

  const premiumIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(leaf.value, [0, 1], [1, 0.98], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(leaf.value, [0, 1], [0, -1], Extrapolation.CLAMP) },
      { scale: interpolate(leaf.value, [0, 1], [1, 1.03], Extrapolation.CLAMP) }
    ]
  }));

  const ctaShineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(press.value, [0, 0.15, 0.7, 1], [0, 0.12, 0.18, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '-18deg' },
      { translateX: interpolate(press.value, [0, 1], [-8, 8], Extrapolation.CLAMP) }
    ]
  }));

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
            styles.buttonShell,
            idleBudStyle,
            seedBodyStyle,
            {
              width: buttonDiameter,
              height: buttonDiameter,
              borderRadius: buttonDiameter / 2
            }
          ]}
        >
          <Animated.View style={[styles.premiumRing, premiumRingStyle]} />
          <View style={styles.premiumShadowInset} />
          <Animated.View style={[styles.innerGlow, haloStyle]} />
          <Animated.View style={[styles.premiumCore, premiumCoreStyle]} />
          <View style={styles.premiumGloss} />
          <View style={styles.premiumSpecular} />
          <Animated.View style={[styles.premiumIconWrap, premiumIconStyle]}>
            <View style={styles.continueChip}>
              <Animated.View style={[styles.continueShineSweep, ctaShineStyle]} />
              <View style={styles.continueIconWrap}>
                <Feather name="chevron-right" size={14} color="#ecf7ef" />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootWrap: {
    marginTop: 0,
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
  buttonShell: {
    backgroundColor: 'rgba(15, 34, 24, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 1,
    borderColor: 'rgba(231, 247, 238, 0.08)',
    shadowColor: '#040a07',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
    elevation: 5
  },
  premiumRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(228, 250, 237, 0.16)',
    backgroundColor: 'rgba(198, 255, 219, 0.05)'
  },
  premiumShadowInset: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(5, 14, 10, 0.22)'
  },
  premiumCore: {
    position: 'absolute',
    width: '74%',
    height: '74%',
    borderRadius: 999,
    backgroundColor: 'rgba(203, 244, 219, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 254, 245, 0.09)'
  },
  premiumGloss: {
    position: 'absolute',
    width: '42%',
    height: '20%',
    top: '22%',
    left: '31%',
    borderRadius: 999,
    backgroundColor: 'rgba(228, 255, 238, 0.16)',
    transform: [{ rotate: '-16deg' }]
  },
  premiumSpecular: {
    position: 'absolute',
    width: '16%',
    height: '46%',
    top: '18%',
    right: '23%',
    borderRadius: 999,
    backgroundColor: 'rgba(12, 37, 25, 0.14)'
  },
  innerGlow: {
    position: 'absolute',
    width: '72%',
    height: '72%',
    borderRadius: 999,
    backgroundColor: '#79e8a8'
  },
  premiumIconWrap: {
    width: '58%',
    height: '58%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 255, 238, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(236, 255, 244, 0.08)',
    overflow: 'hidden'
  },
  continueChip: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 251, 239, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(243, 255, 248, 0.08)',
    overflow: 'hidden'
  },
  continueShineSweep: {
    position: 'absolute',
    width: 10,
    height: '180%',
    left: 6,
    top: '-35%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)'
  },
  continueIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233, 252, 241, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(244, 255, 249, 0.08)'
  },
  stem: {
    position: 'absolute',
    width: 2,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#67bf7f',
    top: -8
  },
  hookStem: {
    position: 'absolute',
    width: 14,
    height: 18,
    top: -18,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderColor: '#8fe07f',
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent'
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

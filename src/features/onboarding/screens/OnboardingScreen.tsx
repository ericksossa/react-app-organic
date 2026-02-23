import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { RootStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../shared/ui/AppText';
import { motionDuration, motionEasings } from '../../../design/motion/tokens';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';
import { SeedButton } from '../components/SeedButton';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroOnboarding'>;

const PRIMARY_HERO_VIDEO =
  'https://assets.mixkit.co/videos/preview/mixkit-farmer-holding-fresh-vegetables-5173-large.mp4';
const FALLBACK_HERO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const HERO_SCALE_TO = 1.08;

function useOnboardingTransition(onEnd: () => void, reduceMotion: boolean) {
  const progress = useSharedValue(0);
  const [isLocked, setIsLocked] = useState(false);

  const start = useCallback(() => {
    if (isLocked) return;

    setIsLocked(true);
    progress.value = withTiming(
      1,
      {
        duration: motionDuration('narrative', reduceMotion),
        easing: motionEasings.organic
      },
      (finished) => {
        if (!finished) return;
        runOnJS(onEnd)();
      }
    );
  }, [isLocked, onEnd, progress, reduceMotion]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [
          { scale: interpolate(progress.value, [0, 1], [1, HERO_SCALE_TO]) },
          { translateY: interpolate(progress.value, [0, 1], [0, -14]) }
        ]
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.34])
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: interpolate(progress.value, [0, 1], [1, 0.92]) }],
    opacity: interpolate(progress.value, [0, 1], [1, 0.6])
  }));

  return {
    isLocked,
    start,
    heroStyle,
    fadeStyle,
    ctaStyle
  } as const;
}

export function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotionSetting();
  const [videoSource, setVideoSource] = useState(PRIMARY_HERO_VIDEO);
  const breath = useSharedValue(0);
  const intro = useSharedValue(0);
  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (status !== 'error') return;
    if (videoSource === FALLBACK_HERO_VIDEO) return;
    setVideoSource(FALLBACK_HERO_VIDEO);
  }, [status, videoSource]);

  const { isLocked, start, heroStyle, fadeStyle, ctaStyle } =
    useOnboardingTransition(() => {
      navigation.replace('MainTabs');
    }, reduceMotion);

  useEffect(() => {
    intro.value = withTiming(1, {
      duration: motionDuration('base', reduceMotion),
      easing: motionEasings.enter
    });
  }, [intro, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }

    breath.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: motionDuration('narrative', reduceMotion),
          easing: motionEasings.organic
        }),
        withTiming(0, {
          duration: motionDuration('narrative', reduceMotion),
          easing: motionEasings.organic
        })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(breath);
    };
  }, [breath, reduceMotion]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: reduceMotion
      ? []
      : [
          { scale: interpolate(breath.value, [0, 1], [1, 1.03]) },
          { translateY: interpolate(breath.value, [0, 1], [0, -4]) }
        ]
  }));

  const introTextStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: reduceMotion ? [] : [{ translateY: interpolate(intro.value, [0, 1], [10, 0]) }]
  }));

  const introCtaStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: reduceMotion ? [] : [{ translateY: interpolate(intro.value, [0, 1], [12, 0]) }]
  }));

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.heroCard,
          {
            marginTop: insets.top + 10,
            marginBottom: Math.max(insets.bottom, 16)
          },
          heroStyle
        ]}
      >
        <Animated.View style={[styles.heroImage, breathStyle]}>
          <VideoView
            player={player}
            style={styles.heroVideo}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
          <View style={styles.heroMask} />
          <Animated.View style={[styles.heroFade, fadeStyle]} />

          <Animated.View style={[styles.copyWrap, introTextStyle]}>
            <AppText style={styles.title}>Explora tu mercado orgánico</AppText>
            <AppText style={styles.subtitle}>
              Hagamos nuestra vida mejor con alimentos reales.
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.ctaBlock, ctaStyle, introCtaStyle]}>
            <View style={styles.decorativeHandle}>
              <Feather name="chevrons-up" size={18} color="rgba(245,250,246,0.92)" />
            </View>
            <SeedButton
              disabled={isLocked}
              onPress={start}
              size={100}
              label="Entrar al mercado"
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#355f34',
    paddingHorizontal: 16
  },
  heroCard: {
    flex: 1,
    borderRadius: 36,
    overflow: 'hidden'
  },
  heroImage: {
    flex: 1,
    justifyContent: 'space-between'
  },
  heroVideo: {
    ...StyleSheet.absoluteFillObject
  },
  heroMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 16, 9, 0.28)'
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000'
  },
  copyWrap: {
    marginTop: 84,
    paddingHorizontal: 28,
    alignItems: 'center'
  },
  title: {
    fontSize: 52,
    lineHeight: 54,
    fontWeight: '800',
    color: '#f3f7f5',
    textAlign: 'center',
    maxWidth: 320
  },
  subtitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 23,
    color: 'rgba(238,245,240,0.92)',
    textAlign: 'center',
    maxWidth: 300
  },
  ctaBlock: {
    alignItems: 'center',
    paddingBottom: 22
  },
  decorativeHandle: {
    width: 76,
    height: 152,
    borderRadius: 38,
    backgroundColor: 'rgba(240,246,241,0.26)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
    overflow: 'visible'
  }
});

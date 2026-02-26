import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { RootStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../shared/ui/AppText';
import { motionDuration, motionEasings } from '../../../design/motion/tokens';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';
import { SeedButton } from '../components/SeedButton';
import { getVideoTransitionStepSeconds } from './onboardingVideoTransition';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroOnboarding'>;

const PRIMARY_HERO_VIDEO = require('../../../../assets/videos/onboarding-seed-hero.mp4');
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
  const [videoSource, setVideoSource] = useState<string | number>(PRIMARY_HERO_VIDEO);
  const [segmentTargetTime, setSegmentTargetTime] = useState<number | null>(null);
  const segmentTargetRef = useRef<number | null>(null);
  const segmentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intro = useSharedValue(0);
  const segmentMood = useSharedValue(0);
  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.timeUpdateEventInterval = 0.05;
    instance.pause();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0
  });

  useEffect(() => {
    if (status !== 'error') return;
    if (videoSource === FALLBACK_HERO_VIDEO) return;
    setVideoSource(FALLBACK_HERO_VIDEO);
  }, [status, videoSource]);

  const { isLocked, start, heroStyle, fadeStyle, ctaStyle } = useOnboardingTransition(() => {
    navigation.replace('MainTabs');
  }, reduceMotion);

  useEffect(() => {
    intro.value = withTiming(1, {
      duration: motionDuration('base', reduceMotion),
      easing: motionEasings.enter
    });
  }, [intro, reduceMotion]);

  useEffect(() => {
    segmentMood.value = withTiming(segmentTargetTime == null ? 0 : 1, {
      duration: segmentTargetTime == null ? 260 : 180,
      easing: motionEasings.organic
    });
  }, [segmentMood, segmentTargetTime]);

  useEffect(() => {
    segmentTargetRef.current = segmentTargetTime;
  }, [segmentTargetTime]);

  const stopSegmentAtTarget = useCallback(
    (target: number) => {
      player.pause();
      player.currentTime = target;
      player.playbackRate = 1;
      segmentTargetRef.current = null;
      setSegmentTargetTime(null);
      if (segmentTimeoutRef.current) {
        clearTimeout(segmentTimeoutRef.current);
        segmentTimeoutRef.current = null;
      }
    },
    [player]
  );

  useEffect(() => {
    return () => {
      if (segmentTimeoutRef.current) clearTimeout(segmentTimeoutRef.current);
    };
  }, []);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const target = segmentTargetRef.current;
    if (target == null) return;
    if (currentTime + 0.015 < target) return;
    stopSegmentAtTarget(target);
  });

  const introTextStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: reduceMotion ? [] : [{ translateY: interpolate(intro.value, [0, 1], [10, 0]) }]
  }));

  const introCtaStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: reduceMotion ? [] : [{ translateY: interpolate(intro.value, [0, 1], [12, 0]) }]
  }));

  const segmentMoodStyle = useAnimatedStyle(() => ({
    opacity: interpolate(segmentMood.value, [0, 1], [0, reduceMotion ? 0.03 : 0.08])
  }));

  const dropletGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(segmentMood.value, [0, 1], [1, reduceMotion ? 1.04 : 1.1]) }],
    shadowOpacity: interpolate(segmentMood.value, [0, 1], [0.1, reduceMotion ? 0.2 : 0.36]),
    borderColor:
      segmentMood.value > 0.5 ? 'rgba(215, 248, 228, 0.34)' : 'rgba(215, 248, 228, 0.12)',
    backgroundColor:
      segmentMood.value > 0.5 ? 'rgba(113, 196, 144, 0.36)' : 'rgba(113, 196, 144, 0.18)'
  }));

  const dropletInnerShineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(segmentMood.value, [0, 1], [0.16, reduceMotion ? 0.28 : 0.46]),
    transform: [
      { scale: interpolate(segmentMood.value, [0, 1], [0.9, reduceMotion ? 1 : 1.08]) },
      { translateY: interpolate(segmentMood.value, [0, 1], [0, -1], Extrapolation.CLAMP) }
    ]
  }));

  const advanceVideoTransition = useCallback(() => {
    if (isLocked || segmentTargetTime != null) return;
    const duration = player.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    // Clamp the segment size so long fallback videos don't play for minutes on one tap.
    const stepSeconds = getVideoTransitionStepSeconds(duration);
    const current = Number.isFinite(player.currentTime) ? player.currentTime : 0;
    const next =
      current >= duration - stepSeconds * 0.8 ? 0 : Math.min(duration, current + stepSeconds);
    if (next === 0) {
      player.currentTime = 0;
      player.pause();
      player.playbackRate = 1;
      segmentTargetRef.current = null;
      setSegmentTargetTime(null);
      if (segmentTimeoutRef.current) {
        clearTimeout(segmentTimeoutRef.current);
        segmentTimeoutRef.current = null;
      }
      return;
    }

    // Smooth growth-like advance: play a short segment slowly, then auto-pause.
    const playbackRate = reduceMotion ? 1 : 0.56;
    player.playbackRate = playbackRate;
    segmentTargetRef.current = next;
    setSegmentTargetTime(next);
    if (segmentTimeoutRef.current) clearTimeout(segmentTimeoutRef.current);
    const remaining = Math.max(0.1, next - current);
    const segmentMs = (remaining / playbackRate) * 1000;
    segmentTimeoutRef.current = setTimeout(() => {
      if (segmentTargetRef.current == null) return;
      stopSegmentAtTarget(next);
    }, segmentMs + 120);
    player.play();
  }, [isLocked, player, reduceMotion, segmentTargetTime, stopSegmentAtTarget]);

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
        <Animated.View style={styles.heroImage}>
          <VideoView
            player={player}
            style={styles.heroVideo}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
          />
          <View style={styles.heroMask} />
          <Animated.View pointerEvents="none" style={[styles.segmentMoodOverlay, segmentMoodStyle]} />
          <Animated.View style={[styles.heroFade, fadeStyle]} />

          <Animated.View style={[styles.copyWrap, introTextStyle]}>
            <AppText style={styles.title}>Explora tu mercado orgánico</AppText>
            <AppText style={styles.subtitle}>
              Hagamos nuestra vida mejor con alimentos reales.
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.videoControlWrap, introTextStyle]}>
            <Pressable
              onPress={advanceVideoTransition}
              disabled={isLocked || segmentTargetTime != null}
              accessibilityRole="button"
              accessibilityLabel="Dale vida a la cosecha y avanza el video"
              style={styles.videoControlButton}
            >
              <View style={styles.videoControlTextBlock}>
                <AppText style={styles.videoControlLabel}>Dale vida a la cosecha</AppText>
                <AppText style={styles.videoControlHint}>
                  Un toque más y verás como todo empieza a florecer.
                </AppText>
              </View>
              <Animated.View style={[styles.videoControlIconOrb, dropletGlowStyle]}>
                <Animated.View pointerEvents="none" style={[styles.videoControlIconOrbShine, dropletInnerShineStyle]} />
                <Feather name="droplet" size={16} color="rgba(246,252,248,0.96)" />
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.ctaBlock, ctaStyle, introCtaStyle]}>
            <View style={styles.decorativeHandle}>
              <AppText style={styles.ctaHandleText}></AppText>
              <Feather name="chevrons-right" size={16} color="rgba(245,250,246,0.82)" />
            </View>
            <View style={styles.ctaKnob}>
              <SeedButton disabled={isLocked} onPress={start} size={92} label="Entrar al mercado" />
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
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
  segmentMoodOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a160f'
  },
  heroFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000'
  },
  copyWrap: {
    marginTop: 84,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: 10
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
  videoControlWrap: {
    alignSelf: 'center',
    width: '86%',
    maxWidth: 320,
    marginBottom: 12
  },
  videoControlButton: {
    minHeight: 74,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(8, 16, 12, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(235, 246, 239, 0.14)'
  },
  videoControlTextBlock: {
    flex: 1,
    paddingRight: 10
  },
  videoControlLabel: {
    color: '#eef5f0',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '800'
  },
  videoControlHint: {
    marginTop: 4,
    color: 'rgba(232, 242, 236, 0.84)',
    fontSize: 12,
    lineHeight: 15
  },
  videoControlIconOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113, 196, 144, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(215, 248, 228, 0.12)',
    shadowColor: '#8ee6ae',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    overflow: 'hidden'
  },
  videoControlIconOrbShine: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 6,
    left: 8,
    backgroundColor: 'rgba(231, 255, 239, 0.32)'
  },
  ctaBlock: {
    position: 'relative',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 270,
    height: 90,
    marginBottom: 22
  },
  decorativeHandle: {
    width: '100%',
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(240,246,241,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(243,250,246,0.12)',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingLeft: 112,
    paddingRight: 24,
    overflow: 'visible'
  },
  ctaHandleText: {
    color: '#ecf6ef',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  ctaKnob: {
    position: 'absolute',
    left: 7,
    top: -1
  }
});

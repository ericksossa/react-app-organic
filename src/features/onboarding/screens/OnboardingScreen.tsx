import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { RootStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../shared/ui/AppText';
import { getVideoTransitionStepSeconds } from './onboardingVideoTransition';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroOnboarding'>;

const PRIMARY_HERO_VIDEO = require('../../../../assets/videos/onboarding-seed-hero.mp4');
const FALLBACK_HERO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [videoSource, setVideoSource] = useState<string | number>(PRIMARY_HERO_VIDEO);
  const [segmentTargetTime, setSegmentTargetTime] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const dragX = useSharedValue(0);
  const dragStartRef = useRef(0);
  const segmentTargetRef = useRef<number | null>(null);
  const segmentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sliderWidth = Math.min(width - 40, 360);
  const sliderKnobSize = 64;
  const sliderInset = 8;
  const maxDrag = sliderWidth - sliderKnobSize - sliderInset * 2;

  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = false;
    instance.muted = true;
    instance.playbackRate = 1;
    instance.timeUpdateEventInterval = 0.05;
    instance.pause();
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    if (status !== 'error') return;
    if (videoSource === FALLBACK_HERO_VIDEO) return;
    setVideoSource(FALLBACK_HERO_VIDEO);
  }, [status, videoSource]);

  useEffect(() => {
    segmentTargetRef.current = segmentTargetTime;
  }, [segmentTargetTime]);

  useEffect(() => {
    return () => {
      if (segmentTimeoutRef.current) clearTimeout(segmentTimeoutRef.current);
    };
  }, []);

  const completeOnboarding = useCallback(() => {
    if (isCompleting) return;
    setIsCompleting(true);
    navigation.replace('MainTabs');
  }, [isCompleting, navigation]);

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

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const target = segmentTargetRef.current;
    if (target == null) return;
    if (currentTime + 0.015 < target) return;
    stopSegmentAtTarget(target);
  });

  const advanceVideo = useCallback(() => {
    if (segmentTargetRef.current != null) return;
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    const current = Number.isFinite(player.currentTime) ? player.currentTime : 0;
    if (duration <= 0) return;
    const stepSeconds = getVideoTransitionStepSeconds(duration);
    const next = current >= duration - stepSeconds * 0.8 ? 0 : Math.min(duration, current + stepSeconds);
    if (next === 0) {
      player.currentTime = 0;
      player.pause();
      return;
    }
    segmentTargetRef.current = next;
    setSegmentTargetTime(next);
    if (segmentTimeoutRef.current) clearTimeout(segmentTimeoutRef.current);
    const remaining = Math.max(0.1, next - current);
    const segmentMs = remaining * 1000;
    segmentTimeoutRef.current = setTimeout(() => {
      if (segmentTargetRef.current == null) return;
      stopSegmentAtTarget(next);
    }, segmentMs + 120);
    player.play();
  }, [player, stopSegmentAtTarget]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }]
  }));

  const hintStyle = useAnimatedStyle(() => {
    const opacity = 1 - dragX.value / Math.max(maxDrag, 1) * 0.75;
    return {
      opacity: Math.max(0.2, opacity)
    };
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isCompleting,
        onMoveShouldSetPanResponder: (_, g) => !isCompleting && Math.abs(g.dx) > 2,
        onPanResponderGrant: () => {
          dragStartRef.current = dragX.value;
        },
        onPanResponderMove: (_, g) => {
          dragX.value = clamp(dragStartRef.current + g.dx, 0, maxDrag);
        },
        onPanResponderRelease: (_, g) => {
          const shouldComplete = dragX.value >= maxDrag * 0.9 || (g.vx > 0.75 && dragX.value > maxDrag * 0.55);
          if (shouldComplete) {
            dragX.value = withTiming(maxDrag, { duration: 120 }, (done) => {
              if (done) runOnJS(completeOnboarding)();
            });
            return;
          }
          dragX.value = withTiming(0, { duration: 180 });
        },
        onPanResponderTerminate: () => {
          dragX.value = withTiming(0, { duration: 180 });
        }
      }),
    [completeOnboarding, dragX, isCompleting, maxDrag]
  );

  return (
    <View style={styles.screen}>
      <VideoView
        player={player}
        style={styles.heroVideo}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom + 28, 36) }]}>
        <View style={styles.copyWrap}>
          <AppText style={styles.title}>Explora tu mercado orgánico</AppText>
          <AppText style={styles.subtitle}>Hagamos nuestra vida mejor con alimentos reales.</AppText>
        </View>

        <View style={styles.videoControlWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Avanzar video"
            style={styles.videoControlButton}
            disabled={segmentTargetTime != null}
            onPress={advanceVideo}
          >
            <View style={styles.videoControlTextBlock}>
              <AppText style={styles.videoControlLabel}>Dale vida a la cosecha</AppText>
              <AppText style={styles.videoControlHint}>
                Un toque más y verás como todo empieza a florecer.
              </AppText>
            </View>
            <View style={styles.videoControlIconOrb}>
              <View pointerEvents="none" style={styles.videoControlIconOrbShine} />
              <Feather name="droplet" size={16} color="rgba(246,252,248,0.96)" />
            </View>
          </Pressable>
        </View>

        <View style={[styles.sliderTrack, { width: sliderWidth }]}>
          <Animated.View style={[styles.sliderHintWrap, hintStyle]}>
            <AppText style={styles.sliderHintText}>Comienza tu experiencia</AppText>
          </Animated.View>
          <Animated.View style={[styles.sliderKnob, knobStyle]} {...panResponder.panHandlers}>
            <Feather name="chevron-right" size={28} color="#1f1f1f" />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090e18'
  },
  heroVideo: {
    ...StyleSheet.absoluteFillObject
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  copyWrap: {
    marginTop: 84,
    alignItems: 'center',
    marginBottom: 10
  },
  title: {
    fontSize: 52,
    lineHeight: 54,
    fontWeight: '800',
    color: '#121712',
    textAlign: 'center',
    maxWidth: 320,
    textShadowColor: 'rgba(255,255,255,0.32)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  subtitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 23,
    color: 'rgba(18, 23, 18, 0.9)',
    textAlign: 'center',
    maxWidth: 300,
    textShadowColor: 'rgba(255,255,255,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
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
  sliderTrack: {
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(8, 16, 12, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(235, 246, 239, 0.14)',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  sliderHintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sliderHintText: {
    color: '#eef5f0',
    fontSize: 35 / 2,
    lineHeight: 42 / 2,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  sliderKnob: {
    position: 'absolute',
    left: 8,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f4f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5
  }
});

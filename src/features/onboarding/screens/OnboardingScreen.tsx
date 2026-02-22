import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { RootStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../shared/ui/AppText';

type Props = NativeStackScreenProps<RootStackParamList, 'IntroOnboarding'>;

const PRIMARY_HERO_VIDEO =
  'https://assets.mixkit.co/videos/preview/mixkit-farmer-holding-fresh-vegetables-5173-large.mp4';
const FALLBACK_HERO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const TRANSITION_DURATION = 560;
const HERO_SCALE_TO = 1.08;

function useOnboardingTransition(onEnd: () => void) {
  const progress = useSharedValue(0);
  const [isLocked, setIsLocked] = useState(false);

  const start = useCallback(() => {
    if (isLocked) return;

    setIsLocked(true);
    progress.value = withTiming(
      1,
      {
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.cubic)
      },
      (finished) => {
        if (!finished) return;
        runOnJS(onEnd)();
      }
    );
  }, [isLocked, onEnd, progress]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, HERO_SCALE_TO]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -14]) }
    ]
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.34])
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.92]) }],
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
  const [videoSource, setVideoSource] = useState(PRIMARY_HERO_VIDEO);
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
    });

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
        <View style={styles.heroImage}>
          <VideoView
            player={player}
            style={styles.heroVideo}
            contentFit="cover"
            surfaceType="textureView"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
          <View style={styles.heroMask} />
          <Animated.View style={[styles.heroFade, fadeStyle]} />

          <View style={styles.copyWrap}>
            <AppText style={styles.title}>Explora tu mercado orgánico</AppText>
            <AppText style={styles.subtitle}>
              Hagamos nuestra vida mejor con alimentos reales.
            </AppText>
          </View>

          <Animated.View style={[styles.ctaBlock, ctaStyle]}>
            <View style={styles.decorativeHandle}>
              <Feather name="chevrons-up" size={18} color="rgba(245,250,246,0.92)" />
            </View>
            <Pressable
              disabled={isLocked}
              onPress={start}
              style={({ pressed }) => [
                styles.goButton,
                isLocked && styles.goButtonDisabled,
                pressed && !isLocked && styles.goButtonPressed
              ]}
            >
              <AppText style={styles.goLabel}>{isLocked ? '...' : 'Go'}</AppText>
            </Pressable>
          </Animated.View>
        </View>
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
    paddingTop: 16
  },
  goButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: -50,
    backgroundColor: '#F7FAF8',
    borderWidth: 1,
    borderColor: 'rgba(21,32,24,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  goButtonPressed: {
    transform: [{ scale: 0.97 }]
  },
  goButtonDisabled: {
    opacity: 0.85
  },
  goLabel: {
    color: '#121d16',
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '700'
  }
});

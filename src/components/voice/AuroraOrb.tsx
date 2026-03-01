import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type AuroraOrbState = 'idle' | 'listening' | 'processing';

type AuroraOrbProps = {
  state: AuroraOrbState;
  size?: number;
  energy?: SharedValue<number>;
  withVideo?: boolean;
};

const ORB_VIDEO_SOURCE = require('../../../assets/videos/lunaverde.mp4');

const OrbVideoLayer = React.memo(function OrbVideoLayer() {
  const videoPlayer = useVideoPlayer(ORB_VIDEO_SOURCE, (instance) => {
    // Keep orb video fully silent.
    instance.loop = true;
    instance.muted = true;
    instance.volume = 0;
    instance.playbackRate = 1;
    instance.play();
  });

  React.useEffect(() => {
    videoPlayer.play();
  }, [videoPlayer]);

  return (
    <VideoView
      player={videoPlayer}
      style={styles.videoFill}
      pointerEvents="none"
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
});

export const AuroraOrb = React.memo(function AuroraOrb({ state, size = 230, energy, withVideo = true }: AuroraOrbProps) {
  const breath = useSharedValue(0);
  const pulse = useSharedValue(0);
  const speakingMix = useSharedValue(state === 'listening' ? 1 : 0);
  const processingMix = useSharedValue(state === 'processing' ? 1 : 0);

  React.useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, {
        duration: 2600,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );
  }, [breath]);

  React.useEffect(() => {
    speakingMix.value = withTiming(state === 'listening' ? 1 : 0, { duration: 180 });
    processingMix.value = withTiming(state === 'processing' ? 1 : 0, { duration: 220 });

    cancelAnimation(pulse);
    pulse.value = withRepeat(
      withTiming(1, {
        duration: state === 'listening' ? 780 : state === 'processing' ? 1900 : 2600,
        easing: Easing.inOut(Easing.quad)
      }),
      -1,
      true
    );
  }, [processingMix, pulse, speakingMix, state]);

  const shellStyle = useAnimatedStyle(() => {
    const baseBreath = interpolate(breath.value, [0, 1], [0.993, 1.007]);
    const pulseAmp =
      interpolate(speakingMix.value, [0, 1], [0.005, 0.03]) +
      interpolate(processingMix.value, [0, 1], [0, 0.012]);
    const pulseScale = 1 + interpolate(pulse.value, [0, 1], [-pulseAmp * 0.45, pulseAmp]);
    const liveEnergy = energy ? Math.max(0, Math.min(1, energy.value ?? 0)) : 0;
    const energyScale = 1 + liveEnergy * speakingMix.value * 0.018;
    const scale = Math.min(1.13, baseBreath * pulseScale * energyScale);

    return {
      transform: [{ scale }]
    };
  });

  const neonHaloStyle = useAnimatedStyle(() => {
    const active = Math.max(speakingMix.value, processingMix.value * 0.7);
    const opacity = interpolate(active, [0, 1], [0.24, 0.74]);
    const pulseScale = interpolate(pulse.value, [0, 1], [0.98, 1.05]);

    return {
      opacity,
      transform: [{ scale: pulseScale }]
    };
  });

  const coverOpacity = state === 'listening' ? 0.08 : state === 'processing' ? 0.14 : 0.28;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.neonHalo,
          { width: size * 1.34, height: size * 1.34, borderRadius: (size * 1.34) / 2 },
          neonHaloStyle
        ]}
      />
      <Animated.View style={[styles.shell, { width: size, height: size, borderRadius: size / 2 }, shellStyle]}>
        {withVideo ? <OrbVideoLayer /> : null}
        <View style={[styles.coverTint, { opacity: coverOpacity }]} />
        <View style={styles.whiteVeil} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  neonHalo: {
    position: 'absolute',
    backgroundColor: 'rgba(115,245,230,0.38)',
    shadowColor: '#7af7e7',
    shadowOpacity: 0.55,
    shadowRadius: 64,
    shadowOffset: { width: 0, height: 0 }
  },
  shell: {
    overflow: 'hidden',
    backgroundColor: '#0a0f11',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  videoFill: {
    ...StyleSheet.absoluteFillObject
  },
  coverTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.22)'
  },
  whiteVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)'
  }
});

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../../features/voice-assistant/state/useVoiceAssistant';

type VoiceDockProps = {
  status: VoiceAssistantStatus;
  disabled: boolean;
  onPause: () => void;
  onMicPress: () => void;
};

export function VoiceDock({ status, disabled, onPause, onMicPress }: VoiceDockProps) {
  const micScale = useSharedValue(1);
  const ringPulse = useSharedValue(1);
  const ringOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    if (status === 'listening') {
      ringPulse.value = withRepeat(withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
      ringOpacity.value = withRepeat(withTiming(0.46, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
      return;
    }

    ringPulse.value = withTiming(1, { duration: 200 });
    ringOpacity.value = withTiming(0.2, { duration: 200 });
  }, [ringOpacity, ringPulse, status]);

  const micAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }]
  }));

  const ringAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: ringPulse.value }],
    opacity: ringOpacity.value
  }));

  const micNeonAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ringPulse.value, [1, 1.04], [1, 1.025]) }],
    opacity: interpolate(ringOpacity.value, [0.2, 0.46], [0.34, 0.9])
  }));

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Pausar escucha" onPress={onPause} style={styles.secondaryButton}>
        <Feather name="pause" size={18} color="rgba(28,28,30,0.7)" />
      </Pressable>

      <Animated.View style={[styles.micRing, ringAnimated]}>
        <Animated.View style={micAnimated}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={status === 'listening' ? 'Detener escucha' : 'Iniciar escucha'}
            onPressIn={() => {
              micScale.value = withTiming(0.96, { duration: 100 });
              onMicPress();
            }}
            onPressOut={() => {
              micScale.value = withTiming(1, { duration: 120 });
            }}
            disabled={disabled}
            style={[styles.micButton, disabled && styles.micDisabled]}
          >
            <Animated.View pointerEvents="none" style={[styles.micNeonOuter, micNeonAnimated]} />
            <Animated.View pointerEvents="none" style={[styles.micNeonInner, micNeonAnimated]} />
            <Feather name={status === 'processing' ? 'loader' : 'mic'} size={31} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </Animated.View>

      <View style={styles.secondaryButtonPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#1d2430',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  secondaryButtonPlaceholder: {
    width: 52,
    height: 52
  },
  micRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent'
  },
  micButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C3240',
    borderWidth: 1,
    borderColor: 'rgba(132,248,236,0.46)',
    shadowColor: '#7af7e7',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  micNeonOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 39,
    borderWidth: 1.2,
    borderColor: 'rgba(132,248,236,0.72)'
  },
  micNeonInner: {
    ...StyleSheet.absoluteFillObject,
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 32,
    borderWidth: 0.9,
    borderColor: 'rgba(186,255,248,0.32)'
  },
  micDisabled: {
    opacity: 0.5
  }
});

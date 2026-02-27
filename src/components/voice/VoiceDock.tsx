import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  Easing,
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
  onMicPressIn: () => void;
  onMicPressOut: () => void;
};

export function VoiceDock({ status, disabled, onPause, onMicPressIn, onMicPressOut }: VoiceDockProps) {
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

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Pausar escucha" onPress={onPause} style={styles.secondaryButton}>
        <Feather name="pause" size={18} color="rgba(28,28,30,0.7)" />
      </Pressable>

      <Animated.View style={[styles.micRing, ringAnimated]}>
        <Animated.View style={micAnimated}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mantén presionado para hablar"
            onPressIn={() => {
              micScale.value = withTiming(0.96, { duration: 100 });
              onMicPressIn();
            }}
            onPressOut={() => {
              micScale.value = withTiming(1, { duration: 120 });
              onMicPressOut();
            }}
            disabled={disabled}
            style={[styles.micButton, disabled && styles.micDisabled]}
          >
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
    borderWidth: 6,
    borderColor: '#E9A9B6',
    backgroundColor: 'rgba(233,169,182,0.05)'
  },
  micButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C3240',
    shadowColor: '#2C3240',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  micDisabled: {
    opacity: 0.5
  }
});

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';

type VoiceDockProps = {
  status: VoiceAssistantStatus;
  disabled: boolean;
  onPause: () => void;
  onMicPressIn: () => void;
  onMicPressOut: () => void;
};

export function VoiceDock({ status, disabled, onPause, onMicPressIn, onMicPressOut }: VoiceDockProps) {
  const micScale = useSharedValue(1);

  React.useEffect(() => {
    micScale.value = withTiming(status === 'listening' ? 1.1 : 1, { duration: 300 });
  }, [micScale, status]);

  const micAnimated = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }]
  }));

  const micListening = status === 'listening';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pausar escucha"
        onPress={onPause}
        style={styles.secondaryButton}
      >
        <Feather name="pause" size={18} color="#222733" />
      </Pressable>

      <Animated.View style={micAnimated}>
        <View style={[styles.micRing, micListening && styles.micRingActive]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mantén presionado para hablar"
            onPressIn={onMicPressIn}
            onPressOut={onMicPressOut}
            disabled={disabled}
            style={[styles.micButton, micListening ? styles.micButtonActive : styles.micButtonIdle, disabled && styles.micDisabled]}
          >
            <Feather name={status === 'processing' ? 'loader' : 'mic'} size={30} color="#FFFFFF" />
          </Pressable>
        </View>
      </Animated.View>

      <View style={styles.secondaryButtonPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 40
  },
  secondaryButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.52)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonPlaceholder: {
    width: 52,
    height: 52
  },
  micRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(229,171,194,0.65)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  micRingActive: {
    backgroundColor: 'rgba(94,211,166,0.4)'
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2C3240',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 8
  },
  micButtonIdle: {
    backgroundColor: '#2C3240'
  },
  micButtonActive: {
    backgroundColor: '#2CB67D'
  },
  micDisabled: {
    opacity: 0.52
  }
});

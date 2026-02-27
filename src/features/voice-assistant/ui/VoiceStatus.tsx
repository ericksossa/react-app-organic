import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';

type VoiceStatusProps = {
  status: VoiceAssistantStatus;
};

function copyFor(status: VoiceAssistantStatus): string {
  switch (status) {
    case 'listening':
      return 'Escuchando...';
    case 'processing':
      return 'Procesando...';
    case 'review':
      return 'Confirma tu pedido';
    case 'error':
      return 'No te escuché bien, intenta de nuevo';
    default:
      return 'Toca para hablar';
  }
}

export function VoiceStatus({ status }: VoiceStatusProps) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity, status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.Text style={[styles.text, animatedStyle]} numberOfLines={2}>
      {copyFor(status)}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 32,
    minHeight: 56
  }
});

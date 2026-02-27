import React from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';

const ATTACK_MS = 120;
const RELEASE_MS = 720;

function baseForStatus(status: VoiceAssistantStatus): number {
  switch (status) {
    case 'listening':
      return 0.22;
    case 'processing':
      return 0.12;
    case 'success':
      return 0.16;
    default:
      return 0.08;
  }
}

export function useVoiceEnergy(status: VoiceAssistantStatus, transcript: string, reduceMotion = false) {
  const energy = useSharedValue(baseForStatus(status));
  const lastTranscriptRef = React.useRef('');

  React.useEffect(() => {
    const base = baseForStatus(status);
    const duration = status === 'listening' ? 180 : 320;
    energy.value = withTiming(base, { duration });
  }, [energy, status]);

  React.useEffect(() => {
    if (status !== 'listening') {
      lastTranscriptRef.current = transcript;
      return;
    }

    const changed = transcript !== lastTranscriptRef.current;
    lastTranscriptRef.current = transcript;
    if (!changed || reduceMotion) return;

    energy.value = withTiming(1, { duration: ATTACK_MS }, () => {
      energy.value = withTiming(baseForStatus(status), { duration: RELEASE_MS });
    });
  }, [energy, reduceMotion, status, transcript]);

  return energy;
}

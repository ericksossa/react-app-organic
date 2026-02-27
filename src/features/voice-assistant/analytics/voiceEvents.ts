import { Platform } from 'react-native';
import { ConfidenceBucket } from '../domain/intents';

export type VoiceEventName =
  | 'voice_permission_prompted'
  | 'voice_permission_denied'
  | 'voice_listen_started'
  | 'voice_listen_cancelled'
  | 'voice_processed'
  | 'voice_failed'
  | 'voice_intent_not_supported'
  | 'voice_rhino_compared';

export type VoiceEventPayload = {
  intentType?: string;
  success?: boolean;
  latencyMs?: number;
  confidenceBucket?: ConfidenceBucket;
  platform?: string;
  reason?: string;
  rhinoUsed?: boolean;
  rhinoSuccess?: boolean;
};

export type VoiceEventTracker = (name: VoiceEventName, payload?: VoiceEventPayload) => void;

export const noopVoiceTracker: VoiceEventTracker = () => undefined;

export function buildSafeVoicePayload(payload: VoiceEventPayload): VoiceEventPayload {
  return {
    intentType: payload.intentType,
    success: payload.success,
    latencyMs: payload.latencyMs,
    confidenceBucket: payload.confidenceBucket,
    platform: payload.platform ?? Platform.OS,
    reason: payload.reason,
    rhinoUsed: payload.rhinoUsed,
    rhinoSuccess: payload.rhinoSuccess
  };
}

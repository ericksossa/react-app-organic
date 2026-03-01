import { requestMicPermission } from './permissions';
import { SttProvider, SttResult } from './stt/types';
import { TtsService } from './tts/TtsService';
import { Platform } from 'react-native';

export type VoiceStartResult = { ok: true } | { ok: false; reason: 'permission_denied' | 'init_error' | 'no_input_frames' };
export type VoiceStopOptions = {
  rhinoFirst?: boolean;
};
export type RhinoHint = {
  used: boolean;
  success: boolean;
  intent?: string;
  slots?: Record<string, string>;
};
export type VoiceStopResult = SttResult & {
  rhinoHint: RhinoHint;
};

export class VoiceClient {
  private startInFlight = false;
  private readonly shouldConfigureExpoAudioMode = false;

  constructor(
    private readonly stt: SttProvider,
    private readonly tts: TtsService,
    private readonly permissionProbe?: { hasRecordAudioPermission?: () => Promise<boolean> | boolean }
  ) {}

  private debugLog(message: string, payload?: Record<string, unknown>) {
    if (!__DEV__) return;
    if (payload) {
      console.debug('[voice-debug][client]', message, payload);
      return;
    }
    console.debug('[voice-debug][client]', message);
  }

  private logRuntimeContext() {
    if (!__DEV__) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const constants = require('expo-constants').default;
      const appOwnership = constants?.appOwnership ?? 'unknown';
      this.debugLog('runtime_context', {
        platform: Platform.OS,
        appOwnership,
        isExpoGo: appOwnership === 'expo'
      });
    } catch {
      this.debugLog('runtime_context', { platform: Platform.OS, appOwnership: 'unknown' });
    }
  }

  private async configureIosAudioModeIfAvailable(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    if (!this.shouldConfigureExpoAudioMode) {
      this.debugLog('expo_audio_mode_skipped_native_session_owner');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const expoAv = require('expo-av');
      const Audio = expoAv?.Audio;
      if (!Audio?.setAudioModeAsync) {
        this.debugLog('expo_audio_mode_unavailable');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS
      });
      this.debugLog('expo_audio_mode_configured', { allowsRecordingIOS: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Cannot find module 'expo-av'")) {
        this.debugLog('expo_audio_mode_unavailable');
        return;
      }
      this.debugLog('expo_audio_mode_error', { message });
    }
  }

  async startListening(onPartial?: (text: string) => void): Promise<VoiceStartResult> {
    if (this.startInFlight || this.stt.isListening()) {
      return { ok: true };
    }

    this.startInFlight = true;
    try {
      this.logRuntimeContext();
      const permitted = await requestMicPermission(this.permissionProbe);
      if (!permitted) {
        return { ok: false, reason: 'permission_denied' };
      }

      await this.configureIosAudioModeIfAvailable();

      // Keep startup responsive while allowing brief iOS session settle.
      await new Promise<void>((resolve) => setTimeout(resolve, Platform.OS === 'ios' ? 60 : 20));
      await this.stt.start({ onPartial });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('no_input_frames')) {
        return { ok: false, reason: 'no_input_frames' };
      }
      if (__DEV__) {
        console.debug('[voice-debug][client] startListening_error', { message });
      }
      return { ok: false, reason: 'init_error' };
    } finally {
      this.startInFlight = false;
    }
  }

  async stopListening(options?: VoiceStopOptions): Promise<VoiceStopResult> {
    const result = await this.stt.stop();
    this.startInFlight = false;
    const rhinoUsed = Boolean(options?.rhinoFirst);
    const rhinoSuccess = Boolean(options?.rhinoFirst && result.finalRhinoUnderstood && result.finalRhinoIntent);

    return {
      ...result,
      rhinoHint: {
        used: rhinoUsed,
        success: rhinoSuccess,
        intent: result.finalRhinoIntent,
        slots: result.finalRhinoSlots
      }
    };
  }

  async cancel(): Promise<void> {
    await this.stt.cancel();
    this.startInFlight = false;
  }

  isListening(): boolean {
    return this.stt.isListening();
  }

  async speak(text: string): Promise<void> {
    await this.tts.speak(text);
  }

  async stopSpeaking(): Promise<void> {
    await this.tts.stop();
  }

  async dispose(): Promise<void> {
    this.startInFlight = false;
    await this.stt.dispose();
    await this.tts.stop();
  }
}

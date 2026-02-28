import { requestMicPermission } from './permissions';
import { SttProvider, SttResult } from './stt/types';
import { TtsService } from './tts/TtsService';

export type VoiceStartResult = { ok: true } | { ok: false; reason: 'permission_denied' | 'init_error' };
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

  constructor(
    private readonly stt: SttProvider,
    private readonly tts: TtsService,
    private readonly permissionProbe?: { hasRecordAudioPermission?: () => Promise<boolean> | boolean }
  ) {}

  async startListening(onPartial?: (text: string) => void): Promise<VoiceStartResult> {
    if (this.startInFlight || this.stt.isListening()) {
      return { ok: true };
    }

    this.startInFlight = true;
    try {
      const permitted = await requestMicPermission(this.permissionProbe);
      if (!permitted) {
        return { ok: false, reason: 'permission_denied' };
      }

      await this.stt.start({ onPartial });
      return { ok: true };
    } catch (error) {
      if (__DEV__) {
        const message = error instanceof Error ? error.message : String(error);
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

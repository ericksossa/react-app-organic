import { requestMicPermission } from './permissions';
import { SttProvider, SttResult } from './stt/types';
import { TtsService } from './tts/TtsService';

export type VoiceStartResult = { ok: true } | { ok: false; reason: 'permission_denied' | 'init_error' };

export class VoiceClient {
  constructor(
    private readonly stt: SttProvider,
    private readonly tts: TtsService,
    private readonly permissionProbe?: { hasRecordAudioPermission?: () => Promise<boolean> | boolean }
  ) {}

  async startListening(onPartial?: (text: string) => void): Promise<VoiceStartResult> {
    const permitted = await requestMicPermission(this.permissionProbe);
    if (!permitted) return { ok: false, reason: 'permission_denied' };

    try {
      await this.stt.start({ onPartial });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'init_error' };
    }
  }

  async stopListening(): Promise<SttResult> {
    return this.stt.stop();
  }

  async cancel(): Promise<void> {
    await this.stt.cancel();
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
    await this.stt.dispose();
    await this.tts.stop();
  }
}

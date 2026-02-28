import { SttProvider, SttResult, SttStartOptions } from './types';

type CheetahInstance = {
  process: (pcm: number[]) => Promise<{ transcript?: string; isEndpoint?: boolean } | string>;
  flush: () => Promise<{ transcript?: string } | string>;
  frameLength: number;
  sampleRate: number;
  delete?: () => Promise<void> | void;
};

type RhinoInference = {
  isFinalized?: boolean;
  isUnderstood?: boolean;
  intent?: string;
  slots?: Record<string, string>;
};

type RhinoInstance = {
  process: (pcm: number[]) => Promise<RhinoInference>;
  reset?: () => Promise<void> | void;
  frameLength: number;
  sampleRate: number;
  delete?: () => Promise<void> | void;
};

type VoiceProcessorInstance = {
  addFrameListener: (listener: (frame: number[]) => void) => void;
  removeFrameListener: (listener: (frame: number[]) => void) => void;
  start: (frameLength: number, sampleRate: number) => Promise<void>;
  stop: () => Promise<void>;
  isRecording?: () => Promise<boolean>;
  hasRecordAudioPermission?: () => Promise<boolean>;
};

type PicovoiceModules = {
  Cheetah: {
    create: (
      accessKey: string,
      modelPath: string,
      options?: { endpointDuration?: number; enableAutomaticPunctuation?: boolean; device?: string }
    ) => Promise<CheetahInstance>;
  };
  Rhino?: {
    create: (accessKey: string, contextPath: string, modelPath?: string) => Promise<RhinoInstance>;
  };
  VoiceProcessor: {
    instance: VoiceProcessorInstance;
  };
};

export type PicovoiceSttConfig = {
  accessKey: string;
  cheetahModelPath: string;
  rhinoContextPath?: string;
  rhinoModelPath?: string;
  endpointDurationSec?: number;
  organicTerms?: string[];
  disableRhino?: boolean;
};

function normalizeFsPath(path?: string): string | undefined {
  if (!path) return undefined;
  if (!path.startsWith('file://')) return path;
  const withoutScheme = path.replace(/^file:\/\//, '');
  try {
    return decodeURIComponent(withoutScheme);
  } catch {
    return withoutScheme;
  }
}

function cleanTranscript(value: string, terms: string[]): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '';

  let next = compact;
  for (const term of terms) {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) continue;

    const parts = normalizedTerm.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;

    const permissive = parts.join('\\s+');
    const rgx = new RegExp(permissive, 'i');
    if (!rgx.test(next)) continue;

    next = next.replace(rgx, normalizedTerm);
  }

  return next;
}

async function loadModules(): Promise<PicovoiceModules> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cheetahPkg = require('@picovoice/cheetah-react-native');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rhinoPkg = require('@picovoice/rhino-react-native');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const voiceProcessorPkg = require('@picovoice/react-native-voice-processor');

  const Cheetah = cheetahPkg?.Cheetah ?? cheetahPkg?.default?.Cheetah ?? cheetahPkg?.default;
  const Rhino = rhinoPkg?.Rhino ?? rhinoPkg?.default?.Rhino ?? rhinoPkg?.default;
  const VoiceProcessor =
    voiceProcessorPkg?.VoiceProcessor ?? voiceProcessorPkg?.default?.VoiceProcessor ?? voiceProcessorPkg?.default;

  if (!Cheetah || !VoiceProcessor?.instance) {
    throw new Error('SDK de voz no disponible en runtime.');
  }

  return {
    Cheetah,
    Rhino,
    VoiceProcessor
  };
}

export class PicovoiceSttProvider implements SttProvider {
  private readonly config: PicovoiceSttConfig;

  private modules: PicovoiceModules | null = null;
  private cheetah: CheetahInstance | null = null;
  private rhino: RhinoInstance | null = null;
  private frameListener: ((frame: number[]) => void) | null = null;
  private partialTranscript = '';
  private latestInference: RhinoInference | null = null;
  private startOptions: SttStartOptions = {};
  private busy = false;
  private listening = false;
  private frameCount = 0;
  private partialCount = 0;
  private sessionStartedAt = 0;
  private startRetryCount = 0;

  constructor(config: PicovoiceSttConfig) {
    this.config = config;
  }

  private debugLog(message: string, payload?: Record<string, unknown>) {
    if (!__DEV__) return;
    if (payload) {
      console.debug('[voice-debug][stt]', message, payload);
      return;
    }
    console.debug('[voice-debug][stt]', message);
  }

  private async waitForIdle(maxWaitMs = 1200): Promise<void> {
    const started = Date.now();
    while (this.busy && Date.now() - started < maxWaitMs) {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
  }

  private async waitForFrames(maxWaitMs = 700): Promise<boolean> {
    const started = Date.now();
    while (Date.now() - started < maxWaitMs) {
      if (this.frameCount > 0) return true;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
    return this.frameCount > 0;
  }

  private async createCheetahWithFallback(
    accessKey: string,
    candidates: string[],
    endpointDuration: number
  ): Promise<CheetahInstance> {
    let lastError: unknown;
    for (const path of candidates) {
      try {
        this.debugLog('cheetah_create_attempt', { path });
        const instance = await this.modules!.Cheetah.create(accessKey, path, {
          endpointDuration,
          enableAutomaticPunctuation: true
        });
        this.debugLog('cheetah_create_ok', { path });
        return instance;
      } catch (error) {
        lastError = error;
        this.debugLog('cheetah_create_fail', {
          path,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No se pudo inicializar Cheetah.');
  }

  async start(options?: SttStartOptions): Promise<void> {
    this.startOptions = options ?? {};
    await this.ensureReady();

    if (this.listening) return;
    const vp = this.modules?.VoiceProcessor.instance;
    if (!vp || !this.cheetah) throw new Error('Motor de transcripción no inicializado.');

    // Defensive reset in case a previous session left processing state stuck.
    this.busy = false;
    this.partialTranscript = '';
    this.latestInference = null;
    this.frameCount = 0;
    this.partialCount = 0;
    this.sessionStartedAt = Date.now();
    this.startRetryCount = 0;
    this.debugLog('start', {
      disableRhino: Boolean(this.config.disableRhino),
      hasRhino: Boolean(this.rhino),
      sampleRate: this.cheetah.sampleRate,
      frameLength: this.cheetah.frameLength
    });

    if (this.rhino?.reset) await this.rhino.reset();

    this.frameListener = (frame: number[]) => {
      if (this.busy || !this.cheetah) return;
      this.frameCount += 1;
      if (this.frameCount <= 5 || this.frameCount % 25 === 0) {
        this.debugLog('frame', {
          count: this.frameCount,
          size: frame.length
        });
      }

      this.busy = true;
      void (async () => {
        try {
          const cheetahChunk = await this.cheetah!.process(frame);
          const chunkText =
            typeof cheetahChunk === 'string'
              ? cheetahChunk
              : typeof cheetahChunk?.transcript === 'string'
                ? cheetahChunk.transcript
                : '';

          if (chunkText.trim()) {
            const terms = this.config.organicTerms ?? [];
            this.partialTranscript = cleanTranscript(
              [this.partialTranscript, chunkText].filter(Boolean).join(' '),
              terms
            );
            this.partialCount += 1;
            this.debugLog('partial', {
              count: this.partialCount,
              chunkLen: chunkText.trim().length,
              transcriptLen: this.partialTranscript.length,
              transcriptPreview: this.partialTranscript.slice(-80)
            });
            this.startOptions.onPartial?.(this.partialTranscript);
          }

          if (this.rhino) {
            const inference = await this.rhino.process(frame);
            if (inference?.isFinalized) {
              this.latestInference = inference;
            }
          }
        } catch {
          // Ignore per-frame failures to keep stream alive.
        } finally {
          this.busy = false;
        }
      })();
    };

    vp.addFrameListener(this.frameListener);
    await vp.start(this.cheetah.frameLength, this.cheetah.sampleRate);
    this.listening = true;
    this.debugLog('recording_started');

    const gotFrames = await this.waitForFrames();
    if (!gotFrames && this.listening && this.startRetryCount < 1) {
      this.startRetryCount += 1;
      this.debugLog('startup_no_frames_retry', { retry: this.startRetryCount });
      try {
        await vp.stop();
      } catch {
        // Ignore stop errors in retry path.
      }
      await vp.start(this.cheetah.frameLength, this.cheetah.sampleRate);
      this.debugLog('recording_restarted');
    }
  }

  async stop(): Promise<SttResult> {
    if (!this.modules || !this.cheetah) {
      return { transcript: '' };
    }

    const vp = this.modules.VoiceProcessor.instance;
    if (this.listening) {
      try {
        await vp.stop();
      } finally {
        if (this.frameListener) vp.removeFrameListener(this.frameListener);
      }
      this.listening = false;
      this.frameListener = null;
      await this.waitForIdle();
      this.busy = false;
      this.debugLog('recording_stopped', {
        durationMs: Date.now() - this.sessionStartedAt,
        frames: this.frameCount,
        partials: this.partialCount
      });
    }

    const flushResult = await this.cheetah.flush();
    const flushText =
      typeof flushResult === 'string'
        ? flushResult
        : typeof flushResult?.transcript === 'string'
          ? flushResult.transcript
          : '';

    const transcript = cleanTranscript(
      [this.partialTranscript, flushText].filter(Boolean).join(' '),
      this.config.organicTerms ?? []
    );
    if (this.frameCount === 0) {
      this.debugLog('no_audio_frames', {
        durationMs: Date.now() - this.sessionStartedAt
      });
    }
    this.debugLog('flush', {
      flushLen: flushText.trim().length,
      partialLen: this.partialTranscript.length,
      transcriptLen: transcript.length,
      transcriptPreview: transcript.slice(-100),
      rhinoFinalized: Boolean(this.latestInference?.isFinalized),
      rhinoUnderstood: Boolean(this.latestInference?.isUnderstood),
      rhinoIntent: this.latestInference?.intent
    });

    return {
      transcript,
      finalRhinoIntent: this.latestInference?.intent,
      finalRhinoUnderstood: this.latestInference?.isUnderstood,
      finalRhinoSlots: this.latestInference?.slots ?? {}
    };
  }

  async cancel(): Promise<void> {
    if (!this.modules) return;

    const vp = this.modules.VoiceProcessor.instance;
    if (this.listening) {
      try {
        await vp.stop();
      } finally {
        if (this.frameListener) vp.removeFrameListener(this.frameListener);
      }
      this.listening = false;
    }

    this.frameListener = null;
    this.busy = false;
    this.partialTranscript = '';
    this.latestInference = null;
    this.debugLog('cancelled', {
      durationMs: this.sessionStartedAt ? Date.now() - this.sessionStartedAt : 0,
      frames: this.frameCount,
      partials: this.partialCount
    });
  }

  isListening(): boolean {
    return this.listening;
  }

  async dispose(): Promise<void> {
    await this.cancel();

    if (this.cheetah?.delete) await this.cheetah.delete();
    if (this.rhino?.delete) await this.rhino.delete();

    this.cheetah = null;
    this.rhino = null;
    this.modules = null;
    this.frameListener = null;
  }

  async hasPermission(): Promise<boolean> {
    await this.ensureReady();
    return (await this.modules?.VoiceProcessor.instance.hasRecordAudioPermission?.()) ?? true;
  }

  private async ensureReady(): Promise<void> {
    if (this.modules && this.cheetah && (this.config.disableRhino || this.rhino)) return;

    const accessKey = this.config.accessKey.trim();
    const cheetahModelPath = normalizeFsPath(this.config.cheetahModelPath);
    const rhinoContextPath = normalizeFsPath(this.config.rhinoContextPath);
    const rhinoModelPath = normalizeFsPath(this.config.rhinoModelPath);
    const rawCheetahPath = this.config.cheetahModelPath;

    if (!accessKey || !cheetahModelPath) {
      throw new Error('Faltan AccessKey/modelos para transcripción por voz.');
    }

    this.modules = await loadModules();

    const cheetahCandidates = Array.from(new Set([cheetahModelPath, rawCheetahPath].filter(Boolean)));
    this.cheetah = await this.createCheetahWithFallback(accessKey, cheetahCandidates as string[], this.config.endpointDurationSec ?? 1);

    const useRhino = !this.config.disableRhino && Boolean(rhinoContextPath) && Boolean(this.modules.Rhino);
    if (useRhino) {
      this.rhino = await this.modules.Rhino!.create(accessKey, rhinoContextPath!, rhinoModelPath);
    } else {
      this.rhino = null;
    }
  }
}

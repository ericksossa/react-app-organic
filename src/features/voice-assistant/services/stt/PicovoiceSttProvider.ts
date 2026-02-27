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
  Rhino: {
    create: (accessKey: string, contextPath: string, modelPath?: string) => Promise<RhinoInstance>;
  };
  VoiceProcessor: {
    instance: VoiceProcessorInstance;
  };
};

export type PicovoiceSttConfig = {
  accessKey: string;
  cheetahModelPath: string;
  rhinoContextPath: string;
  rhinoModelPath?: string;
  endpointDurationSec?: number;
  organicTerms?: string[];
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

  if (!Cheetah || !Rhino || !VoiceProcessor?.instance) {
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

  constructor(config: PicovoiceSttConfig) {
    this.config = config;
  }

  async start(options?: SttStartOptions): Promise<void> {
    this.startOptions = options ?? {};
    await this.ensureReady();

    if (this.listening) return;
    const vp = this.modules?.VoiceProcessor.instance;
    if (!vp || !this.cheetah || !this.rhino) throw new Error('Motores de voz no inicializados.');

    // Defensive reset in case a previous session left processing state stuck.
    this.busy = false;
    this.partialTranscript = '';
    this.latestInference = null;

    if (this.rhino.reset) await this.rhino.reset();

    this.frameListener = (frame: number[]) => {
      if (this.busy || !this.cheetah || !this.rhino) return;

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
            this.startOptions.onPartial?.(this.partialTranscript);
          }

          const inference = await this.rhino!.process(frame);
          if (inference?.isFinalized) {
            this.latestInference = inference;
          }
        } finally {
          this.busy = false;
        }
      })();
    };

    const recording = await vp.isRecording?.();
    if (recording) await vp.stop();

    vp.addFrameListener(this.frameListener);
    await vp.start(this.cheetah.frameLength ?? this.rhino.frameLength, this.cheetah.sampleRate ?? this.rhino.sampleRate);
    this.listening = true;
  }

  async stop(): Promise<SttResult> {
    if (!this.modules || !this.cheetah || !this.rhino) {
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
      this.busy = false;
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
    if (this.modules && this.cheetah && this.rhino) return;

    const accessKey = this.config.accessKey.trim();
    const cheetahModelPath = normalizeFsPath(this.config.cheetahModelPath);
    const rhinoContextPath = normalizeFsPath(this.config.rhinoContextPath);
    const rhinoModelPath = normalizeFsPath(this.config.rhinoModelPath);

    if (!accessKey || !cheetahModelPath || !rhinoContextPath) {
      throw new Error('Faltan AccessKey/modelos para voz.');
    }

    this.modules = await loadModules();

    this.cheetah = await this.modules.Cheetah.create(accessKey, cheetahModelPath, {
      endpointDuration: this.config.endpointDurationSec ?? 1,
      enableAutomaticPunctuation: true
    });

    this.rhino = await this.modules.Rhino.create(accessKey, rhinoContextPath, rhinoModelPath);
  }
}

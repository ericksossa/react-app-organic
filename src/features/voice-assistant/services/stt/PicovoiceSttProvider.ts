import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
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
  addErrorListener?: (listener: (error: unknown) => void) => void;
  removeErrorListener?: (listener: (error: unknown) => void) => void;
  start: (frameLength: number, sampleRate: number) => Promise<void>;
  stop: () => Promise<void>;
  isRecording?: () => Promise<boolean>;
  hasRecordAudioPermission?: () => Promise<boolean>;
};

type NativeVoiceProcessorBridge = {
  getAudioDiagnostics?: () => Promise<Record<string, unknown>>;
  restartAudio?: () => Promise<void>;
  configureNativeCheetah?: (
    accessKey: string,
    modelPath: string,
    endpointDuration: number,
    enableAutomaticPunctuation: boolean
  ) => Promise<void>;
  clearNativeCheetah?: () => Promise<void>;
  PARTIAL_TEXT_EMITTER_KEY?: string;
  FINAL_TEXT_EMITTER_KEY?: string;
  DIAGNOSTIC_EMITTER_KEY?: string;
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
  private errorListener: ((error: unknown) => void) | null = null;
  private partialTranscript = '';
  private latestInference: RhinoInference | null = null;
  private lastVoiceProcessorError: string | null = null;
  private startOptions: SttStartOptions = {};
  private busy = false;
  private processingLoopActive = false;
  private frameQueue: number[][] = [];
  private frameQueueHead = 0;
  private listening = false;
  private frameCount = 0;
  private partialCount = 0;
  private sessionStartedAt = 0;
  private startRetryCount = 0;
  private readonly nativeBridge: NativeVoiceProcessorBridge | null =
    Platform.OS === 'ios' ? ((NativeModules.PvVoiceProcessor as NativeVoiceProcessorBridge) ?? null) : null;
  private nativeEventEmitter: NativeEventEmitter | null =
    Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.PvVoiceProcessor) : null;
  private nativePartialSubscription: { remove: () => void } | null = null;
  private nativeFinalSubscription: { remove: () => void } | null = null;
  private nativeDiagnosticSubscription: { remove: () => void } | null = null;
  private nativeFinalTranscript = '';
  private useNativeIosCheetah = false;
  private partialLastUiEmitMs = 0;
  private micSilentFramesCount = 0;

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

  private removeNativeTextSubscriptions() {
    this.nativePartialSubscription?.remove();
    this.nativeFinalSubscription?.remove();
    this.nativeDiagnosticSubscription?.remove();
    this.nativePartialSubscription = null;
    this.nativeFinalSubscription = null;
    this.nativeDiagnosticSubscription = null;
  }

  private setupNativeTextSubscriptions() {
    if (!this.nativeEventEmitter) return;
    this.removeNativeTextSubscriptions();

    const partialKey = this.nativeBridge?.PARTIAL_TEXT_EMITTER_KEY ?? 'partial_text';
    const finalKey = this.nativeBridge?.FINAL_TEXT_EMITTER_KEY ?? 'final_text';
    const diagnosticKey = this.nativeBridge?.DIAGNOSTIC_EMITTER_KEY ?? 'diagnostic';

    this.nativePartialSubscription = this.nativeEventEmitter.addListener(partialKey, (payload: unknown) => {
      const text =
        typeof payload === 'string'
          ? payload
          : typeof (payload as { text?: unknown })?.text === 'string'
            ? ((payload as { text: string }).text ?? '')
            : '';
      if (!text) return;

      this.partialTranscript = text;
      const now = Date.now();
      if (now - this.partialLastUiEmitMs >= 100) {
        this.partialLastUiEmitMs = now;
        this.startOptions.onPartial?.(this.partialTranscript);
      }

      const obj = (payload as Record<string, unknown>) ?? {};
      this.debugLog('native_partial', {
        transcriptLen: text.length,
        time_to_first_partial_ms: obj.time_to_first_partial_ms,
        partial_event_rate: obj.partial_event_rate,
        frames_emitted_native: obj.frames_emitted_native
      });
    });

    this.nativeFinalSubscription = this.nativeEventEmitter.addListener(finalKey, (payload: unknown) => {
      const text =
        typeof payload === 'string'
          ? payload
          : typeof (payload as { text?: unknown })?.text === 'string'
            ? ((payload as { text: string }).text ?? '')
            : '';
      this.nativeFinalTranscript = text || this.partialTranscript;
      const obj = (payload as Record<string, unknown>) ?? {};
      this.debugLog('native_final', {
        transcriptLen: this.nativeFinalTranscript.length,
        session_duration_ms: obj.session_duration_ms,
        partial_event_rate: obj.partial_event_rate,
        frames_emitted_native: obj.frames_emitted_native,
        time_to_first_partial_ms: obj.time_to_first_partial_ms
      });
    });

    this.nativeDiagnosticSubscription = this.nativeEventEmitter.addListener(diagnosticKey, (payload: unknown) => {
      const obj = (payload as Record<string, unknown>) ?? {};
      const eventName = String(obj.event ?? '');
      if (!eventName) return;
      this.debugLog('native_diagnostic', { event: eventName });
      if (eventName === 'mic_silent_frames') {
        this.lastVoiceProcessorError = 'mic_silent_frames';
        this.micSilentFramesCount += 1;
      }
    });
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

  private async waitForNativeFinal(maxWaitMs = 250): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < maxWaitMs) {
      if (this.nativeFinalTranscript.trim()) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 15));
    }
  }

  private async getNativeAudioDiagnostics(): Promise<Record<string, unknown> | undefined> {
    if (Platform.OS !== 'ios') return undefined;
    try {
      return (await this.nativeBridge?.getAudioDiagnostics?.()) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private formatNoInputFramesReason(
    diagnostics: Record<string, unknown> | undefined,
    engineRunning: boolean | null
  ): string {
    const routeOutputs = Array.isArray(diagnostics?.currentRouteOutputs)
      ? (diagnostics?.currentRouteOutputs as unknown[]).join(',')
      : 'unknown';
    const routeInputs = Array.isArray(diagnostics?.currentRouteInputs)
      ? (diagnostics?.currentRouteInputs as unknown[]).join(',')
      : 'unknown';
    const permission = String(diagnostics?.recordPermission ?? 'unknown');
    const inputAvailable = String(diagnostics?.isInputAvailable ?? 'unknown');
    const engine = engineRunning ?? diagnostics?.engineRunning ?? 'unknown';
    return `no_input_frames (routeOut=${routeOutputs}; routeIn=${routeInputs}; isInputAvailable=${inputAvailable}; permission=${permission}; engineRunning=${String(
      engine
    )})`;
  }

  private async restartNativeAudio(vp: VoiceProcessorInstance): Promise<void> {
    if (Platform.OS === 'ios' && this.nativeBridge?.restartAudio) {
      await this.nativeBridge.restartAudio();
      return;
    }
    await vp.stop();
    await vp.start(this.cheetah!.frameLength, this.cheetah!.sampleRate);
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
    if (!vp) throw new Error('Motor de transcripción no inicializado.');
    if (!this.useNativeIosCheetah && !this.cheetah) throw new Error('Motor de transcripción no inicializado.');
    const hasPermission = (await vp.hasRecordAudioPermission?.()) ?? true;
    this.debugLog('permission_before_start', { hasPermission });
    if (!hasPermission) {
      throw new Error('record_audio_permission_denied');
    }

    // Defensive reset in case a previous session left processing state stuck.
    this.busy = false;
    this.partialTranscript = '';
    this.latestInference = null;
    this.lastVoiceProcessorError = null;
    this.micSilentFramesCount = 0;
    this.frameCount = 0;
    this.partialCount = 0;
    this.processingLoopActive = false;
    this.frameQueue = [];
    this.frameQueueHead = 0;
    this.sessionStartedAt = Date.now();
    this.startRetryCount = 0;
    this.nativeFinalTranscript = '';
    this.partialLastUiEmitMs = 0;
    this.debugLog('start', {
      disableRhino: Boolean(this.config.disableRhino),
      hasRhino: Boolean(this.rhino),
      sampleRate: this.useNativeIosCheetah ? 16000 : this.cheetah?.sampleRate,
      frameLength: this.useNativeIosCheetah ? 512 : this.cheetah?.frameLength,
      nativeCheetah: this.useNativeIosCheetah
    });

    if (this.rhino?.reset) await this.rhino.reset();
    this.errorListener = (error: unknown) => {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : String(error);
      this.lastVoiceProcessorError = message;
      if (message.includes('mic_silent_frames')) {
        this.micSilentFramesCount += 1;
      }
      this.debugLog('voice_processor_error', { message });
    };
    vp.addErrorListener?.(this.errorListener);

    if (this.useNativeIosCheetah) {
      this.setupNativeTextSubscriptions();
      await vp.start(512, 16000);
      this.listening = true;
      const recordingState = (await vp.isRecording?.()) ?? null;
      const nativeDiagnostics = await this.getNativeAudioDiagnostics();
      this.debugLog('recording_started', {
        isRecording: recordingState,
        engineRunning: recordingState,
        nativeDiagnostics,
        mode: 'native_cheetah'
      });
      return;
    }

    this.frameListener = (frame: number[]) => {
      if (!this.cheetah) return;
      this.frameCount += 1;
      if (this.frameCount <= 5 || this.frameCount % 25 === 0) {
        this.debugLog('frame', {
          count: this.frameCount,
          size: frame.length
        });
      }

      this.frameQueue.push(frame);
      if (this.frameQueue.length - this.frameQueueHead > 120) {
        // Keep bounded memory while still prioritizing recent speech context.
        const keepFrom = Math.max(this.frameQueueHead, this.frameQueue.length - 120);
        this.frameQueue = this.frameQueue.slice(keepFrom);
        this.frameQueueHead = 0;
      }
      if (this.processingLoopActive) return;

      this.processingLoopActive = true;
      this.busy = true;
      void this.drainFrameQueue();
    };

    vp.addFrameListener(this.frameListener);
    await vp.start(this.cheetah.frameLength, this.cheetah.sampleRate);
    this.listening = true;
    const recordingState = (await vp.isRecording?.()) ?? null;
    const nativeDiagnostics = await this.getNativeAudioDiagnostics();
    this.debugLog('recording_started', {
      isRecording: recordingState,
      engineRunning: recordingState,
      nativeDiagnostics
    });

    const gotFrames = await this.waitForFrames(700);
    if (gotFrames || !this.listening) return;

    this.startRetryCount += 1;
    const diagnosticsBeforeRetry = await this.getNativeAudioDiagnostics();
    this.debugLog('startup_no_frames_reinit', {
      retry: this.startRetryCount,
      diagnosticsBeforeRetry
    });

    await this.restartNativeAudio(vp);
    const restartedState = (await vp.isRecording?.()) ?? null;
    const diagnosticsAfterRetry = await this.getNativeAudioDiagnostics();
    this.debugLog('recording_restarted', {
      isRecording: restartedState,
      engineRunning: restartedState,
      diagnosticsAfterRetry
    });

    const elapsedSinceStart = Date.now() - this.sessionStartedAt;
    const remainingBudgetMs = Math.max(0, 2000 - elapsedSinceStart);
    const gotFramesAfterRetry = await this.waitForFrames(remainingBudgetMs);
    if (gotFramesAfterRetry || !this.listening) return;

    const diagnosticsAtFailure = await this.getNativeAudioDiagnostics();
    const finalEngineRunning = (await vp.isRecording?.()) ?? null;
    const noFramesReason = this.formatNoInputFramesReason(diagnosticsAtFailure, finalEngineRunning);
    this.lastVoiceProcessorError = noFramesReason;
    this.debugLog('startup_no_frames_fail', {
      noFramesReason,
      diagnosticsAtFailure,
      engineRunning: finalEngineRunning
    });

    try {
      await vp.stop();
    } finally {
      if (this.frameListener) vp.removeFrameListener(this.frameListener);
      if (this.errorListener) vp.removeErrorListener?.(this.errorListener);
      this.listening = false;
      this.frameListener = null;
      this.errorListener = null;
    }

    throw new Error(noFramesReason);
  }

  async stop(): Promise<SttResult> {
    if (!this.modules || (!this.cheetah && !this.useNativeIosCheetah)) {
      return { transcript: '' };
    }

    const vp = this.modules.VoiceProcessor.instance;
    const isNativeMode = this.useNativeIosCheetah;
    if (this.listening) {
      try {
        await vp.stop();
      } finally {
        if (this.frameListener) vp.removeFrameListener(this.frameListener);
        if (this.errorListener) vp.removeErrorListener?.(this.errorListener);
      }
      this.listening = false;
      this.frameListener = null;
      this.errorListener = null;
      // Keep native text subscriptions alive until final_text is received.
      if (!isNativeMode) {
        this.removeNativeTextSubscriptions();
      }
      await this.waitForIdle();
      this.busy = false;
      this.debugLog('recording_stopped', {
        durationMs: Date.now() - this.sessionStartedAt,
        frames: this.frameCount,
        partials: this.partialCount
      });
    }

    if (isNativeMode) {
      await this.waitForNativeFinal(250);
      const transcript = cleanTranscript((this.nativeFinalTranscript || this.partialTranscript || '').trim(), this.config.organicTerms ?? []);
      this.removeNativeTextSubscriptions();
      this.debugLog('flush_native', {
        transcriptLen: transcript.length,
        partialLen: this.partialTranscript.length,
        finalLen: this.nativeFinalTranscript.length,
        durationMs: Date.now() - this.sessionStartedAt,
        voiceProcessorError: this.lastVoiceProcessorError,
        mic_silent_frames_occurrences: this.micSilentFramesCount
      });
      return {
        transcript,
        noFrames: false,
        noFramesReason: this.lastVoiceProcessorError ?? undefined,
        finalRhinoIntent: undefined,
        finalRhinoUnderstood: undefined,
        finalRhinoSlots: {}
      };
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
      const nativeDiagnostics = await this.getNativeAudioDiagnostics();
      this.debugLog('no_audio_frames', {
        durationMs: Date.now() - this.sessionStartedAt,
        voiceProcessorError: this.lastVoiceProcessorError,
        nativeDiagnostics
      });
    }
    this.debugLog('flush', {
      flushLen: flushText.trim().length,
      partialLen: this.partialTranscript.length,
      transcriptLen: transcript.length,
      transcriptPreview: transcript.slice(-100),
      voiceProcessorError: this.lastVoiceProcessorError,
      mic_silent_frames_occurrences: this.micSilentFramesCount,
      rhinoFinalized: Boolean(this.latestInference?.isFinalized),
      rhinoUnderstood: Boolean(this.latestInference?.isUnderstood),
      rhinoIntent: this.latestInference?.intent
    });

    return {
      transcript,
      noFrames: this.frameCount === 0,
      noFramesReason: this.lastVoiceProcessorError ?? undefined,
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
        if (this.errorListener) vp.removeErrorListener?.(this.errorListener);
      }
      this.listening = false;
    }

    this.frameListener = null;
    this.errorListener = null;
    this.removeNativeTextSubscriptions();
    this.busy = false;
    this.processingLoopActive = false;
    this.frameQueue = [];
    this.frameQueueHead = 0;
    this.partialTranscript = '';
    this.nativeFinalTranscript = '';
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

    if (this.useNativeIosCheetah) {
      await this.nativeBridge?.clearNativeCheetah?.();
    }
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
    if (this.modules) {
      if (this.useNativeIosCheetah && (this.config.disableRhino || this.rhino || !this.config.rhinoContextPath)) return;
      if (!this.useNativeIosCheetah && this.cheetah && (this.config.disableRhino || this.rhino || !this.config.rhinoContextPath)) return;
    }

    const accessKey = this.config.accessKey.trim();
    const cheetahModelPath = normalizeFsPath(this.config.cheetahModelPath);
    const rhinoContextPath = normalizeFsPath(this.config.rhinoContextPath);
    const rhinoModelPath = normalizeFsPath(this.config.rhinoModelPath);
    const rawCheetahPath = this.config.cheetahModelPath;

    if (!accessKey || !cheetahModelPath) {
      throw new Error('Faltan AccessKey/modelos para transcripción por voz.');
    }

    this.modules = await loadModules();

    if (Platform.OS === 'ios' && this.nativeBridge?.configureNativeCheetah) {
      const endpointDuration = this.config.endpointDurationSec ?? 1;
      await this.nativeBridge.configureNativeCheetah(accessKey, cheetahModelPath, endpointDuration, true);
      this.useNativeIosCheetah = true;
      this.cheetah = null;
      this.debugLog('native_cheetah_mode_enabled', { sampleRate: 16000, frameLength: 512 });
    } else {
      const cheetahCandidates = Array.from(new Set([cheetahModelPath, rawCheetahPath].filter(Boolean)));
      this.cheetah = await this.createCheetahWithFallback(accessKey, cheetahCandidates as string[], this.config.endpointDurationSec ?? 1);
      this.useNativeIosCheetah = false;
    }

    const useRhino = !this.config.disableRhino && Boolean(rhinoContextPath) && Boolean(this.modules.Rhino);
    if (useRhino && !this.useNativeIosCheetah) {
      this.rhino = await this.modules.Rhino!.create(accessKey, rhinoContextPath!, rhinoModelPath);
    } else {
      this.rhino = null;
    }
  }

  private async drainFrameQueue(): Promise<void> {
    try {
      while (this.frameQueue.length > 0 && this.cheetah) {
        if (this.frameQueueHead >= this.frameQueue.length) break;
        const frame = this.frameQueue[this.frameQueueHead++];
        if (this.frameQueueHead > 64 && this.frameQueueHead * 2 >= this.frameQueue.length) {
          this.frameQueue = this.frameQueue.slice(this.frameQueueHead);
          this.frameQueueHead = 0;
        }
        const pcmFrame = frame;
        let maxAbsRaw = 0;
        let meanAbsRaw = 0;
        if (__DEV__ && (this.frameCount <= 5 || this.frameCount % 100 === 0)) {
          maxAbsRaw = frame.reduce((acc, sample) => {
            const abs = Math.abs(sample);
            return abs > acc ? abs : acc;
          }, 0);
          meanAbsRaw = frame.reduce((acc, sample) => acc + Math.abs(sample), 0) / Math.max(1, frame.length);
          this.debugLog('frame_signal', {
            frameCount: this.frameCount,
            maxAbsRaw,
            meanAbsRaw
          });
        }

        try {
          const cheetahChunk = await this.cheetah.process(pcmFrame);
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
            const inference = await this.rhino.process(pcmFrame);
            if (inference?.isFinalized) {
              this.latestInference = inference;
            }
          }
        } catch (error) {
          this.debugLog('frame_process_error', {
            message: error instanceof Error ? error.message : String(error),
            frameLen: pcmFrame.length,
            firstSample: pcmFrame[0],
            maxAbsRaw,
            meanAbsRaw
          });
        }
      }
    } finally {
      this.processingLoopActive = false;
      this.busy = false;
      if (this.frameQueueHead < this.frameQueue.length && this.cheetah) {
        this.processingLoopActive = true;
        this.busy = true;
        void this.drainFrameQueue();
      }
    }
  }
}

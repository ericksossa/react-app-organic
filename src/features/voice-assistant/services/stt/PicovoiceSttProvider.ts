import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { SttProvider, SttResult, SttStartOptions } from './types';
import { createRhino, releaseRhino, RhinoInference, RhinoInstance } from './rhinoEngine';

type CheetahInstance = {
  process: (pcm: number[]) => Promise<{ transcript?: string; isEndpoint?: boolean } | string>;
  flush: () => Promise<{ transcript?: string } | string>;
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
    create: (
      accessKey: string,
      contextPath: string,
      modelPath?: string,
      device?: string,
      sensitivity?: number,
      endpointDurationSec?: number,
      requireEndpoint?: boolean
    ) => Promise<RhinoInstance>;
  };
  VoiceProcessor: {
    instance: VoiceProcessorInstance;
  };
};

const PARTIAL_THROTTLE_MS = 150;
const UI_PARTIAL_THROTTLE_MS_NATIVE = 150;
const BATCH_SAMPLES = 4096;
const MAX_QUEUE_FRAMES = 80;
const KEEP_LAST_FRAMES = 40;
const FAST_MODE_QUEUE_THRESHOLD = 50;
const ENERGY_SILENCE_TIMEOUT_MS = 1500;
const AUDIO_RESTART_DEBOUNCE_MS = 800;
const SIGNAL_SAMPLE_EVERY_N_FRAMES = 25;
const NO_FRAMES_FIRST_WAIT_MS = 700;
const NO_FRAMES_TOTAL_BUDGET_MS = 2000;

type SessionDebugMetrics = {
  sessionId: number;
  framesReceived: number;
  batchesProcessed: number;
  queueDrops: number;
  partialEmits: number;
  avgBatchProcessMs: number;
  fastMode: boolean;
  silentInputSuspected: boolean;
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
  private rhinoEngineKey: string | null = null;
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
  private sessionId = 0;
  private activeSessionId = 0;
  private fastMode = false;
  private latestPartialForUi = '';
  private partialLastUiEmitMs = 0;
  private partialEmitTimer: ReturnType<typeof setTimeout> | null = null;
  private micSilentFramesCount = 0;
  private firstFrameAt = 0;
  private lastNonSilentFrameAt = 0;
  private silentInputSuspected = false;
  private silentRecoveryAttempted = false;
  private isRestartingAudio = false;
  private lastAudioRestartAt = 0;
  private rhinoTailSamples: number[] = [];
  private rhinoBatchSupported: boolean | null = null;
  private debugMetrics: SessionDebugMetrics = {
    sessionId: 0,
    framesReceived: 0,
    batchesProcessed: 0,
    queueDrops: 0,
    partialEmits: 0,
    avgBatchProcessMs: 0,
    fastMode: false,
    silentInputSuspected: false
  };

  private readonly nativeBridge: NativeVoiceProcessorBridge | null =
    Platform.OS === 'ios' ? ((NativeModules.PvVoiceProcessor as NativeVoiceProcessorBridge) ?? null) : null;
  private nativeEventEmitter: NativeEventEmitter | null =
    Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.PvVoiceProcessor) : null;
  private nativePartialSubscription: { remove: () => void } | null = null;
  private nativeFinalSubscription: { remove: () => void } | null = null;
  private nativeDiagnosticSubscription: { remove: () => void } | null = null;
  private nativeFinalTranscript = '';
  private useNativeIosCheetah = false;

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

  private getQueueSize(): number {
    return Math.max(0, this.frameQueue.length - this.frameQueueHead);
  }

  private resetSessionRuntime(sessionId: number) {
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
    this.latestPartialForUi = '';
    this.partialLastUiEmitMs = 0;
    this.firstFrameAt = 0;
    this.lastNonSilentFrameAt = 0;
    this.silentInputSuspected = false;
    this.silentRecoveryAttempted = false;
    this.isRestartingAudio = false;
    this.lastAudioRestartAt = 0;
    this.fastMode = false;
    this.rhinoTailSamples = [];
    this.rhinoBatchSupported = null;
    if (this.partialEmitTimer) {
      clearTimeout(this.partialEmitTimer);
      this.partialEmitTimer = null;
    }

    this.debugMetrics = {
      sessionId,
      framesReceived: 0,
      batchesProcessed: 0,
      queueDrops: 0,
      partialEmits: 0,
      avgBatchProcessMs: 0,
      fastMode: false,
      silentInputSuspected: false
    };
  }

  private removeNativeTextSubscriptions() {
    this.nativePartialSubscription?.remove();
    this.nativeFinalSubscription?.remove();
    this.nativeDiagnosticSubscription?.remove();
    this.nativePartialSubscription = null;
    this.nativeFinalSubscription = null;
    this.nativeDiagnosticSubscription = null;
  }

  private setupNativeTextSubscriptions(sessionId: number) {
    if (!this.nativeEventEmitter) return;
    this.removeNativeTextSubscriptions();

    const partialKey = this.nativeBridge?.PARTIAL_TEXT_EMITTER_KEY ?? 'partial_text';
    const finalKey = this.nativeBridge?.FINAL_TEXT_EMITTER_KEY ?? 'final_text';
    const diagnosticKey = this.nativeBridge?.DIAGNOSTIC_EMITTER_KEY ?? 'diagnostic';

    this.nativePartialSubscription = this.nativeEventEmitter.addListener(partialKey, (payload: unknown) => {
      if (sessionId !== this.activeSessionId || !this.listening) return;

      const text =
        typeof payload === 'string'
          ? payload
          : typeof (payload as { text?: unknown })?.text === 'string'
            ? ((payload as { text: string }).text ?? '')
            : '';
      if (!text) return;

      this.partialTranscript = text;
      const now = Date.now();
      if (now - this.partialLastUiEmitMs >= UI_PARTIAL_THROTTLE_MS_NATIVE) {
        this.partialLastUiEmitMs = now;
        this.startOptions.onPartial?.(this.partialTranscript);
        this.debugMetrics.partialEmits += 1;
      }

      if (!this.fastMode) {
        const obj = (payload as Record<string, unknown>) ?? {};
        this.debugLog('native_partial', {
          transcriptLen: text.length,
          time_to_first_partial_ms: obj.time_to_first_partial_ms,
          partial_event_rate: obj.partial_event_rate,
          frames_emitted_native: obj.frames_emitted_native
        });
      }
    });

    this.nativeFinalSubscription = this.nativeEventEmitter.addListener(finalKey, (payload: unknown) => {
      if (sessionId !== this.activeSessionId) return;
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
      if (sessionId !== this.activeSessionId) return;
      const obj = (payload as Record<string, unknown>) ?? {};
      const eventName = String(obj.event ?? '');
      if (!eventName) return;
      if (!this.fastMode) {
        this.debugLog('native_diagnostic', { event: eventName });
      }
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

  private async waitForFrames(maxWaitMs = NO_FRAMES_FIRST_WAIT_MS): Promise<boolean> {
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
    if (!this.cheetah) return;
    await vp.stop();
    await vp.start(this.cheetah.frameLength, this.cheetah.sampleRate);
  }

  private async restartAudioWithGuard(
    vp: VoiceProcessorInstance,
    sessionId: number,
    reason: 'startup_no_frames' | 'silent_input'
  ): Promise<void> {
    if (sessionId !== this.activeSessionId || !this.listening) return;
    const now = Date.now();
    if (this.isRestartingAudio) return;
    if (now - this.lastAudioRestartAt < AUDIO_RESTART_DEBOUNCE_MS) return;

    this.isRestartingAudio = true;
    this.lastAudioRestartAt = now;
    try {
      this.debugLog('audio_restart', { reason, sessionId, queueSize: this.getQueueSize() });
      await this.restartNativeAudio(vp);
      this.debugLog('audio_restart_done', { reason, sessionId });
    } catch (error) {
      this.debugLog('audio_restart_error', {
        reason,
        sessionId,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.isRestartingAudio = false;
    }
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

  private setFastMode(next: boolean) {
    if (this.fastMode === next) return;
    this.fastMode = next;
    this.debugMetrics.fastMode = next;
    this.debugLog(next ? 'fastMode_on' : 'fastMode_off', { queueSize: this.getQueueSize() });
  }

  private compactQueueIfNeeded() {
    if (this.frameQueueHead > 64 && this.frameQueueHead * 2 >= this.frameQueue.length) {
      this.frameQueue = this.frameQueue.slice(this.frameQueueHead);
      this.frameQueueHead = 0;
    }
  }

  private sanitizePcmBatch(samples: number[]): number[] {
    // Cheetah (RN) requires 16-bit integer PCM samples.
    const normalized = new Array<number>(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const value = Math.round(samples[i]);
      normalized[i] = value > 32767 ? 32767 : value < -32768 ? -32768 : value;
    }
    return normalized;
  }

  private schedulePartialEmit(force = false) {
    if (!this.latestPartialForUi.trim()) return;

    const emit = () => {
      this.partialEmitTimer = null;
      this.partialLastUiEmitMs = Date.now();
      const cleaned = cleanTranscript(this.latestPartialForUi, this.config.organicTerms ?? []);
      if (!cleaned || cleaned === this.partialTranscript) return;
      this.partialTranscript = cleaned;
      this.startOptions.onPartial?.(cleaned);
      this.debugMetrics.partialEmits += 1;
      this.partialCount += 1;
    };

    const now = Date.now();
    const elapsed = now - this.partialLastUiEmitMs;
    if (force || elapsed >= PARTIAL_THROTTLE_MS || this.fastMode) {
      if (this.partialEmitTimer) {
        clearTimeout(this.partialEmitTimer);
        this.partialEmitTimer = null;
      }
      emit();
      return;
    }

    if (this.partialEmitTimer) return;
    this.partialEmitTimer = setTimeout(() => {
      emit();
    }, PARTIAL_THROTTLE_MS - elapsed);
  }

  private emitLatestPartialBeforeStop() {
    if (!this.latestPartialForUi.trim()) return;
    this.schedulePartialEmit(true);
  }

  private handleSilentInputWatchdog(
    framePeak: number,
    vp: VoiceProcessorInstance,
    sessionId: number
  ) {
    const now = Date.now();
    if (!this.firstFrameAt) {
      this.firstFrameAt = now;
      this.debugLog('first_frame_received', { sessionId });
    }

    if (framePeak > 0) {
      this.lastNonSilentFrameAt = now;
      return;
    }

    if (this.silentRecoveryAttempted) return;
    if (now - this.firstFrameAt < ENERGY_SILENCE_TIMEOUT_MS) return;
    if (this.lastNonSilentFrameAt > 0) return;

    this.silentInputSuspected = true;
    this.silentRecoveryAttempted = true;
    this.debugMetrics.silentInputSuspected = true;
    this.debugLog('silent_input_suspected', {
      sessionId,
      msSinceFirstFrame: now - this.firstFrameAt,
      frames: this.frameCount
    });
    void this.restartAudioWithGuard(vp, sessionId, 'silent_input');
  }

  private enqueueFrame(frame: number[], vp: VoiceProcessorInstance, sessionId: number) {
    if (sessionId !== this.activeSessionId || !this.listening || !this.cheetah) return;

    this.frameCount += 1;
    this.debugMetrics.framesReceived += 1;

    let framePeak = 0;
    for (let i = 0; i < frame.length; i += 1) {
      const abs = Math.abs(frame[i]);
      if (abs > framePeak) framePeak = abs;
      if (framePeak > 0) break;
    }

    if (__DEV__ && !this.fastMode && this.frameCount % SIGNAL_SAMPLE_EVERY_N_FRAMES === 0) {
      this.debugLog('frame_signal', {
        frameCount: this.frameCount,
        framePeak,
        queueSize: this.getQueueSize()
      });
    }

    this.handleSilentInputWatchdog(framePeak, vp, sessionId);

    this.frameQueue.push(frame);

    const queueSize = this.getQueueSize();
    if (queueSize > MAX_QUEUE_FRAMES) {
      const keepFrom = Math.max(this.frameQueueHead, this.frameQueue.length - KEEP_LAST_FRAMES);
      const dropped = keepFrom - this.frameQueueHead;
      this.frameQueue = this.frameQueue.slice(keepFrom);
      this.frameQueueHead = 0;
      this.debugMetrics.queueDrops += dropped;
      this.debugLog('queue_overflow_drop', {
        dropped,
        queueSizeBeforeDrop: queueSize,
        queueSizeAfterDrop: this.getQueueSize()
      });
    }

    this.setFastMode(this.getQueueSize() > FAST_MODE_QUEUE_THRESHOLD);

    if (this.processingLoopActive) return;
    this.processingLoopActive = true;
    this.busy = true;
    void this.drainFrameQueue(sessionId);
  }

  private takeBatchSamples(): number[] {
    const batch: number[] = [];

    while (this.frameQueueHead < this.frameQueue.length && batch.length < BATCH_SAMPLES) {
      const frame = this.frameQueue[this.frameQueueHead++];
      for (let i = 0; i < frame.length; i += 1) {
        batch.push(frame[i]);
      }
    }

    this.compactQueueIfNeeded();
    return batch;
  }

  private async processRhinoBatch(samples: number[]): Promise<void> {
    if (!this.rhino || samples.length === 0) return;

    for (let i = 0; i < samples.length; i += 1) {
      this.rhinoTailSamples.push(samples[i]);
    }

    const frameLength = this.rhino.frameLength;
    const usableSamples = this.rhinoTailSamples.length - (this.rhinoTailSamples.length % frameLength);
    if (usableSamples <= 0) return;

    const rhinoChunk = this.rhinoTailSamples.slice(0, usableSamples);
    this.rhinoTailSamples = this.rhinoTailSamples.slice(usableSamples);

    if (this.rhinoBatchSupported !== false) {
      try {
        const inference = await this.rhino.process(rhinoChunk);
        this.rhinoBatchSupported = true;
        if (inference?.isFinalized) {
          this.latestInference = inference;
        }
        return;
      } catch (error) {
        if (this.rhinoBatchSupported === null) {
          this.rhinoBatchSupported = false;
          this.debugLog('rhino_batch_not_supported', {
            message: error instanceof Error ? error.message : String(error)
          });
        } else {
          throw error;
        }
      }
    }

    for (let offset = 0; offset < rhinoChunk.length; offset += frameLength) {
      const frame = rhinoChunk.slice(offset, offset + frameLength);
      const inference = await this.rhino.process(frame);
      if (inference?.isFinalized) {
        this.latestInference = inference;
      }
    }
  }

  private async handleCheetahBatch(batch: number[]): Promise<void> {
    const normalized = this.sanitizePcmBatch(batch);
    const cheetahChunk = await this.cheetah!.process(normalized);
    const chunkText =
      typeof cheetahChunk === 'string'
        ? cheetahChunk
        : typeof cheetahChunk?.transcript === 'string'
          ? cheetahChunk.transcript
          : '';

    if (chunkText.trim()) {
      const merged = [this.latestPartialForUi, chunkText].filter(Boolean).join(' ');
      this.latestPartialForUi = merged;
      this.schedulePartialEmit(false);
      if (!this.fastMode) {
        this.debugLog('partial', {
          chunkLen: chunkText.trim().length,
          transcriptLen: this.latestPartialForUi.length
        });
      }
    }

    await this.processRhinoBatch(normalized);
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

    this.sessionId += 1;
    const localSessionId = this.sessionId;
    this.activeSessionId = localSessionId;
    this.resetSessionRuntime(localSessionId);

    this.debugLog('start', {
      sessionId: localSessionId,
      disableRhino: Boolean(this.config.disableRhino),
      hasRhino: Boolean(this.rhino),
      sampleRate: this.useNativeIosCheetah ? 16000 : this.cheetah?.sampleRate,
      frameLength: this.useNativeIosCheetah ? 512 : this.cheetah?.frameLength,
      nativeCheetah: this.useNativeIosCheetah
    });

    if (this.rhino?.reset) await this.rhino.reset();
    this.errorListener = (error: unknown) => {
      if (localSessionId !== this.activeSessionId) return;
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
      if (!this.fastMode) {
        this.debugLog('voice_processor_error', { message, sessionId: localSessionId });
      }
    };
    vp.addErrorListener?.(this.errorListener);

    if (this.useNativeIosCheetah) {
      this.setupNativeTextSubscriptions(localSessionId);
      await vp.start(512, 16000);
      this.listening = true;
      const recordingState = (await vp.isRecording?.()) ?? null;
      const nativeDiagnostics = await this.getNativeAudioDiagnostics();
      this.debugLog('recording_started', {
        sessionId: localSessionId,
        isRecording: recordingState,
        engineRunning: recordingState,
        nativeDiagnostics,
        mode: 'native_cheetah'
      });
      return;
    }

    this.frameListener = (frame: number[]) => {
      this.enqueueFrame(frame, vp, localSessionId);
    };

    vp.addFrameListener(this.frameListener);
    await vp.start(this.cheetah!.frameLength, this.cheetah!.sampleRate);
    this.listening = true;
    const recordingState = (await vp.isRecording?.()) ?? null;
    const nativeDiagnostics = await this.getNativeAudioDiagnostics();
    this.debugLog('recording_started', {
      sessionId: localSessionId,
      isRecording: recordingState,
      engineRunning: recordingState,
      nativeDiagnostics
    });

    const gotFrames = await this.waitForFrames(NO_FRAMES_FIRST_WAIT_MS);
    if (gotFrames || !this.listening || localSessionId !== this.activeSessionId) return;

    this.startRetryCount += 1;
    const diagnosticsBeforeRetry = await this.getNativeAudioDiagnostics();
    this.debugLog('startup_no_frames_reinit', {
      sessionId: localSessionId,
      retry: this.startRetryCount,
      diagnosticsBeforeRetry
    });

    await this.restartAudioWithGuard(vp, localSessionId, 'startup_no_frames');
    const restartedState = (await vp.isRecording?.()) ?? null;
    const diagnosticsAfterRetry = await this.getNativeAudioDiagnostics();
    this.debugLog('recording_restarted', {
      sessionId: localSessionId,
      isRecording: restartedState,
      engineRunning: restartedState,
      diagnosticsAfterRetry
    });

    const elapsedSinceStart = Date.now() - this.sessionStartedAt;
    const remainingBudgetMs = Math.max(0, NO_FRAMES_TOTAL_BUDGET_MS - elapsedSinceStart);
    const gotFramesAfterRetry = await this.waitForFrames(remainingBudgetMs);
    if (gotFramesAfterRetry || !this.listening || localSessionId !== this.activeSessionId) return;

    const diagnosticsAtFailure = await this.getNativeAudioDiagnostics();
    const finalEngineRunning = (await vp.isRecording?.()) ?? null;
    const noFramesReason = this.formatNoInputFramesReason(diagnosticsAtFailure, finalEngineRunning);
    this.lastVoiceProcessorError = noFramesReason;
    this.debugLog('startup_no_frames_fail', {
      sessionId: localSessionId,
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
      this.activeSessionId = 0;
    }

    throw new Error(noFramesReason);
  }

  async stop(): Promise<SttResult> {
    if (!this.modules || (!this.cheetah && !this.useNativeIosCheetah)) {
      return { transcript: '' };
    }

    if (!this.listening) {
      return { transcript: '' };
    }

    const vp = this.modules.VoiceProcessor.instance;
    const isNativeMode = this.useNativeIosCheetah;
    const localSessionId = this.activeSessionId;

    try {
      await vp.stop();
    } finally {
      if (this.frameListener) vp.removeFrameListener(this.frameListener);
      if (this.errorListener) vp.removeErrorListener?.(this.errorListener);
    }
    this.listening = false;
    this.frameListener = null;
    this.errorListener = null;
    this.setFastMode(false);

    if (!isNativeMode) {
      this.removeNativeTextSubscriptions();
      await this.waitForIdle();
      this.busy = false;
    }

    this.debugLog('stop', {
      sessionId: localSessionId,
      durationMs: Date.now() - this.sessionStartedAt,
      frames: this.frameCount,
      partials: this.partialCount,
      batches: this.debugMetrics.batchesProcessed
    });

    this.emitLatestPartialBeforeStop();

    if (isNativeMode) {
      await this.waitForNativeFinal(250);
      const transcript = cleanTranscript(
        (this.nativeFinalTranscript || this.partialTranscript || '').trim(),
        this.config.organicTerms ?? []
      );
      this.removeNativeTextSubscriptions();
      this.debugLog('flush_native', {
        sessionId: localSessionId,
        transcriptLen: transcript.length,
        partialLen: this.partialTranscript.length,
        finalLen: this.nativeFinalTranscript.length,
        durationMs: Date.now() - this.sessionStartedAt,
        voiceProcessorError: this.lastVoiceProcessorError,
        mic_silent_frames_occurrences: this.micSilentFramesCount
      });
      this.activeSessionId = 0;

      return {
        transcript,
        noFrames: false,
        noFramesReason: this.lastVoiceProcessorError ?? undefined,
        finalRhinoIntent: undefined,
        finalRhinoUnderstood: undefined,
        finalRhinoSlots: {},
        debug: __DEV__ ? { ...this.debugMetrics } : undefined
      };
    }

    const flushResult = await this.cheetah!.flush();
    const flushText =
      typeof flushResult === 'string'
        ? flushResult
        : typeof flushResult?.transcript === 'string'
          ? flushResult.transcript
          : '';

    const transcript = cleanTranscript([this.latestPartialForUi, flushText].filter(Boolean).join(' '), this.config.organicTerms ?? []);

    if (this.frameCount === 0) {
      const nativeDiagnostics = await this.getNativeAudioDiagnostics();
      this.debugLog('no_audio_frames', {
        sessionId: localSessionId,
        durationMs: Date.now() - this.sessionStartedAt,
        voiceProcessorError: this.lastVoiceProcessorError,
        nativeDiagnostics
      });
    }

    this.debugLog('flush', {
      sessionId: localSessionId,
      flushLen: flushText.trim().length,
      partialLen: this.latestPartialForUi.length,
      transcriptLen: transcript.length,
      voiceProcessorError: this.lastVoiceProcessorError,
      mic_silent_frames_occurrences: this.micSilentFramesCount,
      rhinoFinalized: Boolean(this.latestInference?.isFinalized),
      rhinoUnderstood: Boolean(this.latestInference?.isUnderstood),
      rhinoIntent: this.latestInference?.intent,
      metrics: this.debugMetrics
    });

    this.activeSessionId = 0;

    return {
      transcript,
      noFrames: this.frameCount === 0,
      noFramesReason: this.lastVoiceProcessorError ?? undefined,
      finalRhinoIntent: this.latestInference?.intent,
      finalRhinoUnderstood: this.latestInference?.isUnderstood,
      finalRhinoSlots: this.latestInference?.slots ?? {},
      debug: __DEV__ ? { ...this.debugMetrics } : undefined
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

    this.activeSessionId = 0;
    this.frameListener = null;
    this.errorListener = null;
    this.removeNativeTextSubscriptions();
    this.busy = false;
    this.processingLoopActive = false;
    this.frameQueue = [];
    this.frameQueueHead = 0;
    this.partialTranscript = '';
    this.latestPartialForUi = '';
    this.nativeFinalTranscript = '';
    this.latestInference = null;
    if (this.partialEmitTimer) {
      clearTimeout(this.partialEmitTimer);
      this.partialEmitTimer = null;
    }
    this.debugLog('cancelled', {
      durationMs: this.sessionStartedAt ? Date.now() - this.sessionStartedAt : 0,
      frames: this.frameCount,
      partials: this.partialCount,
      metrics: this.debugMetrics
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
    await releaseRhino(this.rhinoEngineKey);
    this.rhinoEngineKey = null;

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
      this.cheetah = await this.createCheetahWithFallback(
        accessKey,
        cheetahCandidates as string[],
        this.config.endpointDurationSec ?? 1
      );
      this.useNativeIosCheetah = false;
    }

    const useRhino = !this.config.disableRhino && Boolean(rhinoContextPath) && Boolean(this.modules.Rhino);
    if (useRhino && !this.useNativeIosCheetah) {
      try {
        const created = await createRhino(this.modules.Rhino!, {
          accessKey,
          contextPath: rhinoContextPath!,
          modelPath: rhinoModelPath,
          sensitivity: 0.6,
          endpointDurationSec: 1.0
        });
        this.rhino = created.instance;
        this.rhinoEngineKey = created.key;
        this.debugLog('rhino_ready', {
          sensitivity: 0.6,
          endpointDurationSec: 1.0,
          hasModelPath: Boolean(rhinoModelPath)
        });
      } catch (error) {
        // Fallback gracefully to STT-only if Rhino fails to initialize.
        this.rhino = null;
        this.rhinoEngineKey = null;
        this.debugLog('rhino_init_failed_fallback', {
          message: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      await releaseRhino(this.rhinoEngineKey);
      this.rhinoEngineKey = null;
      this.rhino = null;
    }
  }

  private async drainFrameQueue(sessionId: number): Promise<void> {
    try {
      while (this.cheetah && this.listening && sessionId === this.activeSessionId) {
        const queueSize = this.getQueueSize();
        if (queueSize <= 0) break;

        const batch = this.takeBatchSamples();
        if (batch.length === 0) break;

        const startedAt = Date.now();
        try {
          await this.handleCheetahBatch(batch);
          const batchMs = Date.now() - startedAt;
          this.debugMetrics.batchesProcessed += 1;
          const count = this.debugMetrics.batchesProcessed;
          this.debugMetrics.avgBatchProcessMs =
            this.debugMetrics.avgBatchProcessMs + (batchMs - this.debugMetrics.avgBatchProcessMs) / count;
        } catch (error) {
          this.lastVoiceProcessorError = error instanceof Error ? error.message : String(error);
          this.debugLog('batch_process_error', {
            sessionId,
            batchLen: batch.length,
            queueSize: this.getQueueSize(),
            message: this.lastVoiceProcessorError
          });
        }

        this.setFastMode(this.getQueueSize() > FAST_MODE_QUEUE_THRESHOLD);
      }
    } finally {
      this.processingLoopActive = false;
      this.busy = false;
      if (this.getQueueSize() > 0 && this.cheetah && this.listening && sessionId === this.activeSessionId) {
        this.processingLoopActive = true;
        this.busy = true;
        void this.drainFrameQueue(sessionId);
      }
    }
  }
}

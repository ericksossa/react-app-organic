import React from 'react';
import { AppState } from 'react-native';
import { buildSafeVoicePayload, noopVoiceTracker, VoiceEventTracker } from '../analytics/voiceEvents';
import { scoreConfidence, VoiceScreenContext } from '../domain/confidence';
import { ParsedIntent, VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { parseIntent } from '../domain/parseIntent';
import { executeRhinoAction } from '../services/executeRhinoAction';
import { VoiceClient } from '../services/VoiceClient';
import { disambiguationReducer, initialDisambiguationState } from './disambiguation';

const PARTIAL_UI_THROTTLE_MS = 150;

function triggerHaptic(kind: 'start' | 'stop' | 'error') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const haptics = require('expo-haptics');
    if (kind === 'error') {
      void haptics.notificationAsync?.(haptics.NotificationFeedbackType?.Error);
      return;
    }
    void haptics.impactAsync?.(
      kind === 'start' ? haptics.ImpactFeedbackStyle?.Light : haptics.ImpactFeedbackStyle?.Soft
    );
  } catch {
    // optional dependency
  }
}

const EARCON_ENABLED =
  (process.env.EXPO_PUBLIC_VOICE_EARCON ?? process.env.VOICE_EARCON ?? 'false').toLowerCase() === 'true';

function triggerEarcon(kind: 'start' | 'success' | 'error') {
  if (!EARCON_ENABLED) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tts = require('react-native-tts');
    const Tts = tts?.default ?? tts;
    if (!Tts?.speak) return;

    const text = kind === 'error' ? 'Ups' : kind === 'success' ? 'Listo' : 'Ok';
    Tts.speak(text, {
      iosVoiceId: undefined,
      rate: 0.5,
      androidParams: {
        KEY_PARAM_STREAM: 'STREAM_NOTIFICATION'
      }
    });
  } catch {
    // optional dependency
  }
}

function triggerFeedback(kind: 'start' | 'success' | 'error') {
  if (kind === 'start') {
    triggerHaptic('start');
    triggerEarcon('start');
    return;
  }

  if (kind === 'success') {
    triggerHaptic('stop');
    triggerEarcon('success');
    return;
  }

  triggerHaptic('error');
  triggerEarcon('error');
}

function mapRhinoIntent(intent?: string): VoiceIntentType | null {
  const safe = (intent ?? '').toLowerCase();
  if (!safe) return null;

  if (safe.includes('agregarcarrito') || safe.includes('agregar_carrito')) return 'ADD_TO_CART';
  if (safe.includes('buscarproducto') || safe.includes('buscar_producto')) return 'SEARCH_PRODUCTS';
  if (safe.includes('add') || safe.includes('cart') || safe.includes('canasta')) return 'ADD_TO_CART';
  if (safe.includes('track') || safe.includes('pedido') || safe.includes('order_status')) return 'TRACK_ORDER';
  if (safe.includes('repeat') || safe.includes('reorder')) return 'REPEAT_LAST_ORDER';
  if (safe.includes('search') || safe.includes('find') || safe.includes('catalog')) return 'SEARCH_PRODUCTS';
  return null;
}

function fromRhinoSlot(slots: Record<string, string>, names: string[]): string | undefined {
  for (const key of names) {
    const value = slots[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function applyRhinoHint(parsed: ParsedIntent, rhinoHint: { used: boolean; success: boolean; intent?: string; slots?: Record<string, string> }) {
  if (!rhinoHint.used || !rhinoHint.success) return parsed;

  const mappedType = mapRhinoIntent(rhinoHint.intent);
  const slots = rhinoHint.slots ?? {};
  const slotProduct = fromRhinoSlot(slots, ['producto', 'product', 'item', 'query']);
  const slotQtyRaw = fromRhinoSlot(slots, ['cantidad', 'quantity', 'qty', 'amount']);
  const slotQty = slotQtyRaw ? Number(slotQtyRaw.replace(',', '.')) : undefined;

  return {
    ...parsed,
    type: mappedType ?? parsed.type,
    entities: {
      ...parsed.entities,
      productQuery: slotProduct ?? parsed.entities.productQuery,
      quantity: Number.isFinite(slotQty) ? slotQty : parsed.entities.quantity
    }
  };
}

export type VoiceAssistantStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'review'
  | 'success'
  | 'permission_denied'
  | 'error';

export type VoiceAssistantActions = {
  onSearchProducts: (params: {
    query: string;
    categorySlug?: string;
    attributes?: string[];
    sort?: 'price_asc' | 'rating_desc';
    delivery?: 'hoy' | 'manana';
  }) => Promise<void> | void;
  onAddToCart: (params: { query: string; qty: number }) => Promise<void> | void;
  onRepeatLastOrder?: () => Promise<void> | void;
  onTrackOrder?: () => Promise<void> | void;
  onOpenOrders?: () => Promise<void> | void;
  onOpenCart?: () => Promise<void> | void;
  onRemoveFromCart?: (params: { query: string; qty?: number }) => Promise<void> | void;
  onClearCart?: () => Promise<void> | void;
};

export type UseVoiceAssistantArgs = {
  client: VoiceClient;
  actions: VoiceAssistantActions;
  timeoutMs?: number;
  tracker?: VoiceEventTracker;
  screenContext?: VoiceScreenContext;
  rhinoFirst?: boolean;
  resolveCandidates?: (params: { query: string; intentType: VoiceIntentType }) => Promise<VoiceCandidate[]>;
};

export function useVoiceAssistant({
  client,
  actions,
  timeoutMs = 10_000,
  tracker = noopVoiceTracker,
  screenContext = 'voice',
  rhinoFirst = false,
  resolveCandidates
}: UseVoiceAssistantArgs) {
  const debugLog = React.useCallback((message: string, payload?: Record<string, unknown>) => {
    if (!__DEV__) return;
    if (payload) {
      console.debug('[voice-debug][state]', message, payload);
      return;
    }
    console.debug('[voice-debug][state]', message);
  }, []);

  const [status, setStatus] = React.useState<VoiceAssistantStatus>('idle');
  const [transcript, setTranscript] = React.useState('');
  const transcriptRef = React.useRef('');
  const [error, setError] = React.useState<string | null>(null);
  const [parsedIntent, setParsedIntent] = React.useState<ParsedIntent | null>(null);
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [unsupportedIntent, setUnsupportedIntent] = React.useState<VoiceIntentType | null>(null);
  const [disambiguation, dispatchDisambiguation] = React.useReducer(
    disambiguationReducer,
    initialDisambiguationState
  );

  const startTsRef = React.useRef<number>(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowIdRef = React.useRef(0);
  const partialUiRafRef = React.useRef<number | null>(null);
  const pendingPartialRef = React.useRef('');
  const lastPartialUiEmitRef = React.useRef(0);
  const reviewRequestIdRef = React.useRef(0);
  const lastResolvedReviewDraftRef = React.useRef('');
  const appStateCancelInFlightRef = React.useRef(false);

  const clearTimeoutRef = React.useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const newFlowId = React.useCallback(() => {
    flowIdRef.current += 1;
    return flowIdRef.current;
  }, []);

  const isFlowActive = React.useCallback((flowId: number) => flowId === flowIdRef.current, []);

  const setLiveTranscript = React.useCallback((value: string) => {
    transcriptRef.current = value;
    setTranscript(value);
  }, []);

  const resolveTopCandidates = React.useCallback(
    async (intent: ParsedIntent): Promise<VoiceCandidate[]> => {
      const raw = intent.entities.productQuery ?? '';
      const query = raw.trim();
      const isProductIntent = intent.type === 'SEARCH_PRODUCTS' || intent.type === 'ADD_TO_CART';
      if (!resolveCandidates || !isProductIntent || !query) return [];

      try {
        const candidates = await resolveCandidates({ query, intentType: intent.type });
        return candidates.slice(0, 3);
      } catch {
        return [];
      }
    },
    [resolveCandidates]
  );

  const executeIntent = React.useCallback(
    async (intent: ParsedIntent, rawText: string, candidate?: VoiceCandidate): Promise<'ok' | 'unsupported'> => {
      const candidateQuery = candidate?.name?.trim() || candidate?.slug?.trim();
      const resolvedQuery = candidateQuery || intent.entities.productQuery || rawText;

      switch (intent.type) {
        case 'ADD_TO_CART':
          await actions.onAddToCart({
            query: resolvedQuery,
            qty: Math.max(1, intent.entities.quantity ?? 1)
          });
          return 'ok';
        case 'REPEAT_LAST_ORDER':
          if (!actions.onRepeatLastOrder) return 'unsupported';
          await actions.onRepeatLastOrder();
          return 'ok';
        case 'TRACK_ORDER':
          if (!actions.onTrackOrder) return 'unsupported';
          await actions.onTrackOrder();
          return 'ok';
        case 'SEARCH_PRODUCTS':
        default:
          await actions.onSearchProducts({
            query: resolvedQuery,
            attributes: intent.entities.attributes,
            sort: intent.entities.sort,
            delivery: intent.entities.delivery
          });
          return 'ok';
      }
    },
    [actions]
  );

  const beginListening = React.useCallback(async () => {
    if (status === 'listening' || status === 'processing') {
      debugLog('begin_skipped', { status });
      return;
    }

    const flowId = newFlowId();
    setSheetVisible(true);
    setError(null);
    setLiveTranscript('');
    setParsedIntent(null);
    setUnsupportedIntent(null);
    dispatchDisambiguation({ type: 'RESET' });

    tracker('voice_permission_prompted', buildSafeVoicePayload({}));
    debugLog('begin_listening');
    pendingPartialRef.current = '';
    lastPartialUiEmitRef.current = 0;
    if (partialUiRafRef.current !== null) {
      cancelAnimationFrame(partialUiRafRef.current);
      partialUiRafRef.current = null;
    }

    const started = await client.startListening((partial) => {
      if (!isFlowActive(flowId)) return;
      pendingPartialRef.current = partial;
      if (partialUiRafRef.current !== null) return;

      // PERF: Coalesce partial updates into RAF ticks with a minimum cadence window.
      const flushPartial = () => {
        partialUiRafRef.current = null;
        const now = Date.now();
        const elapsed = now - lastPartialUiEmitRef.current;
        if (elapsed < PARTIAL_UI_THROTTLE_MS) {
          partialUiRafRef.current = requestAnimationFrame(flushPartial);
          return;
        }

        const nextPartial = pendingPartialRef.current;
        if (nextPartial === transcriptRef.current) return;
        lastPartialUiEmitRef.current = now;
        debugLog('on_partial', { len: nextPartial.length, preview: nextPartial.slice(-80) });
        setLiveTranscript(nextPartial);
      };

      partialUiRafRef.current = requestAnimationFrame(flushPartial);
    });

    if (!isFlowActive(flowId)) return;

    if (started.ok === false) {
      if (started.reason === 'permission_denied') {
        setStatus('permission_denied');
        debugLog('start_denied');
        tracker('voice_permission_denied', buildSafeVoicePayload({ reason: 'denied' }));
      } else if (started.reason === 'no_input_frames') {
        setStatus('error');
        setError(
          'No recibimos frames de entrada del micrófono (no_input_frames). Revisa ruta de audio (speaker/Bluetooth) y permisos, e intenta de nuevo.'
        );
        debugLog('start_error_no_input_frames');
        tracker('voice_failed', buildSafeVoicePayload({ success: false, reason: 'no_input_frames' }));
      } else {
        setStatus('error');
        setError('No pudimos iniciar el audio. Intenta nuevamente.');
        debugLog('start_error_init');
        tracker('voice_failed', buildSafeVoicePayload({ success: false, reason: 'init_error' }));
      }
      return;
    }

    startTsRef.current = Date.now();
    setStatus('listening');
    debugLog('listening_started');
    // PERF: Keep start path non-blocking; feedback should not delay listening UX.
    queueMicrotask(() => {
      triggerFeedback('start');
    });
    tracker('voice_listen_started', buildSafeVoicePayload({}));

    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      void cancelListening('timeout');
    }, timeoutMs);
  }, [clearTimeoutRef, client, debugLog, isFlowActive, newFlowId, setLiveTranscript, status, timeoutMs, tracker]);

  const setReviewState = React.useCallback((intent: ParsedIntent, draft: string, candidates: VoiceCandidate[]) => {
    setParsedIntent(intent);
    dispatchDisambiguation({ type: 'SET_DRAFT', draft });
    dispatchDisambiguation({ type: 'RESOLVE_DONE', candidates });
    setStatus('review');
  }, []);

  const stopListeningAndProcess = React.useCallback(async () => {
    if (!client.isListening()) return;

    const flowId = flowIdRef.current;
    clearTimeoutRef();
    setStatus('processing');
    setError(null);

    try {
      const result = await client.stopListening({ rhinoFirst });
      if (!isFlowActive(flowId)) return;

      const finalTranscript = (result.transcript || transcriptRef.current).trim();
      debugLog('stop_result', {
        resultLen: (result.transcript ?? '').length,
        refLen: transcriptRef.current.length,
        finalLen: finalTranscript.length
      });
      if (!finalTranscript) {
        setStatus('error');
        if (result.noFrames) {
          const reason = result.noFramesReason?.trim();
          setError(
            reason
              ? `No recibimos señal del micrófono (${reason}). Revisa permisos y dispositivos de audio en iOS.`
              : 'No recibimos señal del micrófono. Revisa permisos de micrófono en iOS y vuelve a intentar.'
          );
        } else {
          setError('No detecté voz. Intenta hablar más cerca del micrófono y vuelve a intentar.');
        }
        debugLog('empty_transcript');
        tracker(
          'voice_failed',
          buildSafeVoicePayload({ success: false, reason: result.noFrames ? 'no_audio_frames' : 'empty_transcript' })
        );
        return;
      }

      const parsed = applyRhinoHint(parseIntent(finalTranscript), result.rhinoHint);
      const latencyMs = Date.now() - startTsRef.current;
      const confidenceBreakdown = scoreConfidence(parsed, screenContext);
      const normalizedQuery = (parsed.entities.productQuery ?? finalTranscript).trim();
      const isProductIntent = parsed.type === 'SEARCH_PRODUCTS' || parsed.type === 'ADD_TO_CART';
      const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
      const isLikelyAmbiguousQuery =
        normalizedQuery.length > 32 || queryTokens.length >= 4 || /\b(o|u|\/)\b/i.test(normalizedQuery);
      const shouldResolveCandidates =
        parsed.requiresConfirmation || confidenceBreakdown.bucket !== 'high' || (isProductIntent && isLikelyAmbiguousQuery);

      setLiveTranscript(finalTranscript);
      setParsedIntent(parsed);
      setUnsupportedIntent(null);

      tracker(
        'voice_rhino_compared',
        buildSafeVoicePayload({
          rhinoUsed: Boolean(result.finalRhinoIntent),
          rhinoSuccess: Boolean(result.finalRhinoUnderstood && result.finalRhinoIntent),
          success: Boolean(result.finalRhinoUnderstood && result.finalRhinoIntent)
        })
      );

      const rhinoActionResult = await executeRhinoAction(
        {
          isUnderstood: result.finalRhinoUnderstood,
          intent: result.finalRhinoIntent,
          slots: result.finalRhinoSlots
        },
        {
          onSearchProducts: async (query) => {
            await actions.onSearchProducts({ query });
          },
          onAddToCart: async (query, qty) => {
            await actions.onAddToCart({ query, qty });
          },
          onOpenCart: actions.onOpenCart,
          onRemoveFromCart: actions.onRemoveFromCart
            ? async (query, qty) => actions.onRemoveFromCart?.({ query, qty })
            : undefined,
          onClearCart: actions.onClearCart
        }
      );

      if (rhinoActionResult.ok) {
        setStatus('success');
        triggerFeedback('success');
        tracker(
          'voice_processed',
          buildSafeVoicePayload({
            intentType: result.finalRhinoIntent ?? parsed.type,
            success: true,
            latencyMs,
            confidenceBucket: confidenceBreakdown.bucket,
            rhinoUsed: true,
            rhinoSuccess: true
          })
        );
        return;
      }

      if (rhinoActionResult.reason === 'product_not_found' || rhinoActionResult.reason === 'missing_product_slot') {
        const fallbackText = (
          rhinoActionResult.normalizedSlots?.producto ??
          rhinoActionResult.normalizedSlots?.product ??
          finalTranscript
        ).trim();
        const reviewParsed = parseIntent(fallbackText);
        const reviewCandidates = await resolveTopCandidates(reviewParsed);
        if (!isFlowActive(flowId)) return;
        setReviewState(reviewParsed, fallbackText, reviewCandidates);
        tracker(
          'voice_processed',
          buildSafeVoicePayload({
            intentType: result.finalRhinoIntent ?? reviewParsed.type,
            success: false,
            reason: rhinoActionResult.reason,
            latencyMs,
            confidenceBucket: reviewParsed.confidence,
            rhinoUsed: true,
            rhinoSuccess: false
          })
        );
        return;
      }

      // PERF: Fast-path high-confidence intents; skip candidate resolution on hot path.
      if (!shouldResolveCandidates) {
        const execution = await executeIntent(parsed, finalTranscript);
        if (!isFlowActive(flowId)) return;

        if (execution === 'unsupported') {
          setUnsupportedIntent(parsed.type);
          setStatus('review');
          tracker(
            'voice_intent_not_supported',
            buildSafeVoicePayload({ intentType: parsed.type, success: false, confidenceBucket: confidenceBreakdown.bucket })
          );
          return;
        }

        setStatus('success');
        triggerFeedback('success');
        tracker(
          'voice_processed',
          buildSafeVoicePayload({
            intentType: parsed.type,
            success: true,
            latencyMs,
            confidenceBucket: confidenceBreakdown.bucket,
            rhinoUsed: result.rhinoHint.used,
            rhinoSuccess: result.rhinoHint.success
          })
        );
        return;
      }

      const candidates = await resolveTopCandidates(parsed);
      if (!isFlowActive(flowId)) return;
      const ambiguousByCandidates = candidates.length > 1;
      const needsReview = parsed.requiresConfirmation || confidenceBreakdown.bucket !== 'high' || ambiguousByCandidates;

      if (needsReview) {
        setReviewState(parsed, finalTranscript, candidates);
        tracker(
          'voice_processed',
          buildSafeVoicePayload({
            intentType: parsed.type,
            success: true,
            latencyMs,
            confidenceBucket: confidenceBreakdown.bucket,
            rhinoUsed: result.rhinoHint.used,
            rhinoSuccess: result.rhinoHint.success
          })
        );
        return;
      }

      const execution = await executeIntent(parsed, finalTranscript, candidates[0]);
      if (!isFlowActive(flowId)) return;

      if (execution === 'unsupported') {
        setUnsupportedIntent(parsed.type);
        setStatus('review');
        tracker(
          'voice_intent_not_supported',
          buildSafeVoicePayload({ intentType: parsed.type, success: false, confidenceBucket: confidenceBreakdown.bucket })
        );
        return;
      }

      setStatus('success');
      triggerFeedback('success');
      tracker(
        'voice_processed',
        buildSafeVoicePayload({
          intentType: parsed.type,
          success: true,
          latencyMs,
          confidenceBucket: confidenceBreakdown.bucket,
          rhinoUsed: result.rhinoHint.used,
          rhinoSuccess: result.rhinoHint.success
        })
      );
    } catch {
      if (!isFlowActive(flowId)) return;
      setStatus('error');
      triggerFeedback('error');
      setError('No entendimos el audio. Puedes intentar de nuevo o escribir tu búsqueda.');
      tracker('voice_failed', buildSafeVoicePayload({ success: false, reason: 'stt_error' }));
    }
  }, [
    clearTimeoutRef,
    client,
    executeIntent,
    isFlowActive,
    resolveTopCandidates,
    rhinoFirst,
    screenContext,
    setReviewState,
    debugLog,
    tracker,
    setLiveTranscript
  ]);

  const confirmDraftAndRun = React.useCallback(async () => {
    const finalText = disambiguation.draft.trim();
    if (!finalText) {
      setStatus('error');
      setError('La transcripción está vacía. Intenta hablar de nuevo o escribe tu solicitud.');
      return;
    }

    const parsed = parseIntent(finalText);

    setStatus('processing');
    setParsedIntent(parsed);
    setUnsupportedIntent(null);

    try {
      const candidates = await resolveTopCandidates(parsed);
      // "Confirmar" should execute the current draft directly.
      const execution = await executeIntent(parsed, finalText, candidates[0]);
      if (execution === 'unsupported') {
        setUnsupportedIntent(parsed.type);
        setStatus('review');
        tracker(
          'voice_intent_not_supported',
          buildSafeVoicePayload({ intentType: parsed.type, success: false, confidenceBucket: 'med' })
        );
        return;
      }

      setLiveTranscript(finalText);
      setStatus('success');
      triggerFeedback('success');
    } catch {
      setStatus('error');
      triggerFeedback('error');
      setError('No pudimos ejecutar la acción por voz en este momento.');
    }
  }, [disambiguation.draft, executeIntent, resolveTopCandidates, setLiveTranscript, tracker]);

  const selectCandidateAndRun = React.useCallback(
    async (candidate: VoiceCandidate) => {
      if (!parsedIntent) return;
      const sourceText = disambiguation.draft || transcript;
      setStatus('processing');
      setUnsupportedIntent(null);

      try {
        const execution = await executeIntent(parsedIntent, sourceText, candidate);
        if (execution === 'unsupported') {
          setUnsupportedIntent(parsedIntent.type);
          setStatus('review');
          tracker(
            'voice_intent_not_supported',
            buildSafeVoicePayload({ intentType: parsedIntent.type, success: false, confidenceBucket: 'med' })
          );
          return;
        }

        setLiveTranscript(sourceText);
        setStatus('success');
        triggerFeedback('success');
      } catch {
        setStatus('error');
        setError('No pudimos ejecutar la acción por voz en este momento.');
        triggerFeedback('error');
      }
    },
    [disambiguation.draft, executeIntent, parsedIntent, setLiveTranscript, tracker, transcript]
  );

  const cancelListening = React.useCallback(
    async (reason: 'user_cancel' | 'timeout' = 'user_cancel') => {
      newFlowId();
      clearTimeoutRef();
      if (partialUiRafRef.current !== null) {
        cancelAnimationFrame(partialUiRafRef.current);
        partialUiRafRef.current = null;
      }
      await client.cancel();
      setStatus('idle');
      tracker('voice_listen_cancelled', buildSafeVoicePayload({ reason }));
    },
    [clearTimeoutRef, client, newFlowId, tracker]
  );

  const closeSheet = React.useCallback(async () => {
    newFlowId();
    clearTimeoutRef();
    if (client.isListening()) {
      await client.cancel();
    }
    setSheetVisible(false);
    setStatus('idle');
    setError(null);
    setUnsupportedIntent(null);
    setParsedIntent(null);
    dispatchDisambiguation({ type: 'RESET' });
  }, [clearTimeoutRef, client, newFlowId]);

  const openOrdersFallback = React.useCallback(async () => {
    await actions.onOpenOrders?.();
  }, [actions]);

  React.useEffect(() => {
    if (status !== 'review') return;

    const rawDraft = disambiguation.draft;
    const normalizedDraft = rawDraft.replace(/\s+/g, ' ').trim();
    if (!normalizedDraft) {
      dispatchDisambiguation({ type: 'RESOLVE_DONE', candidates: [] });
      lastResolvedReviewDraftRef.current = '';
      return;
    }
    if (normalizedDraft === lastResolvedReviewDraftRef.current) return;

    dispatchDisambiguation({ type: 'RESOLVE_START' });
    const requestId = ++reviewRequestIdRef.current;
    const isUserEditingDraft = normalizedDraft !== transcriptRef.current.trim();
    const debounceMs = isUserEditingDraft ? 350 : 0;

    const timer = setTimeout(() => {
      void (async () => {
        const nextParsed = parseIntent(normalizedDraft);
        setParsedIntent(nextParsed);
        const candidates = await resolveTopCandidates(nextParsed);
        if (requestId !== reviewRequestIdRef.current) return;
        lastResolvedReviewDraftRef.current = normalizedDraft;
        dispatchDisambiguation({ type: 'RESOLVE_DONE', candidates });
      })();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [disambiguation.draft, resolveTopCandidates, status]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // iOS permission prompts can temporarily move app to 'inactive'; avoid cancelling capture there.
      if (state !== 'background') return;
      if (!sheetVisible) return;
      if (status === 'processing' || status === 'review') return;
      if (!client.isListening()) return;
      if (appStateCancelInFlightRef.current) return;

      appStateCancelInFlightRef.current = true;
      debugLog('appstate_background_cancel', { status, sheetVisible });
      void cancelListening('user_cancel').finally(() => {
        appStateCancelInFlightRef.current = false;
      });
    });

    return () => {
      subscription.remove();
    };
  }, [cancelListening, client, debugLog, sheetVisible, status]);

  React.useEffect(() => {
    return () => {
      clearTimeoutRef();
      if (partialUiRafRef.current !== null) {
        cancelAnimationFrame(partialUiRafRef.current);
        partialUiRafRef.current = null;
      }
      void client.dispose();
    };
  }, [clearTimeoutRef, client]);

  return {
    status,
    transcript,
    draftTranscript: disambiguation.draft,
    parsedIntent,
    candidates: disambiguation.candidates,
    candidatesLoading: disambiguation.loading,
    unsupportedIntent,
    error,
    sheetVisible,
    setSheetVisible,
    setDraftTranscript: (value: string) => {
      dispatchDisambiguation({ type: 'SET_DRAFT', draft: value });
      setUnsupportedIntent(null);
    },
    beginListening,
    stopListeningAndProcess,
    confirmDraftAndRun,
    selectCandidateAndRun,
    cancelListening,
    closeSheet,
    openOrdersFallback
  };
}

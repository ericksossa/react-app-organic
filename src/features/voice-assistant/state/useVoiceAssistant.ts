import React from 'react';
import { AppState } from 'react-native';
import { buildSafeVoicePayload, noopVoiceTracker, VoiceEventTracker } from '../analytics/voiceEvents';
import { scoreConfidence, VoiceScreenContext } from '../domain/confidence';
import { ParsedIntent, VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { parseIntent } from '../domain/parseIntent';
import { VoiceClient } from '../services/VoiceClient';
import { disambiguationReducer, initialDisambiguationState } from './disambiguation';

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
  const slotProduct = fromRhinoSlot(slots, ['product', 'item', 'query']);
  const slotQtyRaw = fromRhinoSlot(slots, ['quantity', 'qty', 'amount']);
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
  const [status, setStatus] = React.useState<VoiceAssistantStatus>('idle');
  const [transcript, setTranscript] = React.useState('');
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
    const flowId = newFlowId();
    setSheetVisible(true);
    setError(null);
    setTranscript('');
    setParsedIntent(null);
    setUnsupportedIntent(null);
    dispatchDisambiguation({ type: 'RESET' });

    tracker('voice_permission_prompted', buildSafeVoicePayload({}));

    const started = await client.startListening((partial) => {
      if (!isFlowActive(flowId)) return;
      setTranscript(partial);
    });

    if (!isFlowActive(flowId)) return;

    if (started.ok === false) {
      if (started.reason === 'permission_denied') {
        setStatus('permission_denied');
        tracker('voice_permission_denied', buildSafeVoicePayload({ reason: 'denied' }));
      } else {
        setStatus('error');
        setError('No pudimos iniciar el audio. Intenta nuevamente.');
        tracker('voice_failed', buildSafeVoicePayload({ success: false, reason: 'init_error' }));
      }
      return;
    }

    startTsRef.current = Date.now();
    setStatus('listening');
    triggerFeedback('start');
    tracker('voice_listen_started', buildSafeVoicePayload({}));

    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      void cancelListening('timeout');
    }, timeoutMs);
  }, [clearTimeoutRef, client, isFlowActive, newFlowId, timeoutMs, tracker]);

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

      const finalTranscript = (result.transcript || transcript).trim();
      const parsed = applyRhinoHint(parseIntent(finalTranscript), result.rhinoHint);
      const latencyMs = Date.now() - startTsRef.current;
      const confidenceBreakdown = scoreConfidence(parsed, screenContext);

      setTranscript(finalTranscript);
      setParsedIntent(parsed);
      setUnsupportedIntent(null);

      tracker(
        'voice_rhino_compared',
        buildSafeVoicePayload({
          rhinoUsed: result.rhinoHint.used,
          rhinoSuccess: result.rhinoHint.success,
          success: result.rhinoHint.success
        })
      );

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
    tracker,
    transcript
  ]);

  const confirmDraftAndRun = React.useCallback(async () => {
    const finalText = disambiguation.draft.trim();
    const parsed = parseIntent(finalText);
    const confidence = scoreConfidence(parsed, screenContext);

    setStatus('processing');
    setParsedIntent(parsed);
    setUnsupportedIntent(null);

    try {
      const candidates = await resolveTopCandidates(parsed);
      const ambiguousByCandidates = candidates.length > 1;

      if (parsed.requiresConfirmation || confidence.bucket !== 'high' || ambiguousByCandidates) {
        setReviewState(parsed, finalText, candidates);
        return;
      }

      const execution = await executeIntent(parsed, finalText, candidates[0]);
      if (execution === 'unsupported') {
        setUnsupportedIntent(parsed.type);
        setStatus('review');
        tracker(
          'voice_intent_not_supported',
          buildSafeVoicePayload({ intentType: parsed.type, success: false, confidenceBucket: confidence.bucket })
        );
        return;
      }

      setTranscript(finalText);
      setStatus('success');
      triggerFeedback('success');
    } catch {
      setStatus('error');
      triggerFeedback('error');
      setError('No pudimos ejecutar la acción por voz en este momento.');
    }
  }, [disambiguation.draft, executeIntent, resolveTopCandidates, screenContext, setReviewState, tracker]);

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

        setTranscript(sourceText);
        setStatus('success');
        triggerFeedback('success');
      } catch {
        setStatus('error');
        setError('No pudimos ejecutar la acción por voz en este momento.');
        triggerFeedback('error');
      }
    },
    [disambiguation.draft, executeIntent, parsedIntent, tracker, transcript]
  );

  const cancelListening = React.useCallback(
    async (reason: 'user_cancel' | 'timeout' = 'user_cancel') => {
      newFlowId();
      clearTimeoutRef();
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

    const draft = disambiguation.draft.trim();
    if (!draft) {
      dispatchDisambiguation({ type: 'RESOLVE_DONE', candidates: [] });
      return;
    }

    dispatchDisambiguation({ type: 'RESOLVE_START' });

    const timer = setTimeout(() => {
      void (async () => {
        const nextParsed = parseIntent(draft);
        setParsedIntent(nextParsed);
        const candidates = await resolveTopCandidates(nextParsed);
        dispatchDisambiguation({ type: 'RESOLVE_DONE', candidates });
      })();
    }, 250);

    return () => clearTimeout(timer);
  }, [disambiguation.draft, resolveTopCandidates, status]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void cancelListening('user_cancel');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [cancelListening]);

  React.useEffect(() => {
    return () => {
      clearTimeoutRef();
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

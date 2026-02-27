import React from 'react';
import { parseIntent } from '../domain/parseIntent';
import { ParsedIntent } from '../domain/intents';
import { buildSafeVoicePayload, noopVoiceTracker, VoiceEventTracker } from '../analytics/voiceEvents';
import { VoiceClient } from '../services/VoiceClient';

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
};

export type UseVoiceAssistantArgs = {
  client: VoiceClient;
  actions: VoiceAssistantActions;
  timeoutMs?: number;
  tracker?: VoiceEventTracker;
};

export function useVoiceAssistant({
  client,
  actions,
  timeoutMs = 10_000,
  tracker = noopVoiceTracker
}: UseVoiceAssistantArgs) {
  const [status, setStatus] = React.useState<VoiceAssistantStatus>('idle');
  const [transcript, setTranscript] = React.useState('');
  const [draftTranscript, setDraftTranscript] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [parsedIntent, setParsedIntent] = React.useState<ParsedIntent | null>(null);
  const [sheetVisible, setSheetVisible] = React.useState(false);

  const startTsRef = React.useRef<number>(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = React.useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const executeIntent = React.useCallback(
    async (intent: ParsedIntent, rawText: string) => {
      switch (intent.type) {
        case 'ADD_TO_CART':
          await actions.onAddToCart({
            query: intent.entities.productQuery || rawText,
            qty: Math.max(1, intent.entities.quantity ?? 1)
          });
          return;
        case 'REPEAT_LAST_ORDER':
          await actions.onRepeatLastOrder?.();
          return;
        case 'TRACK_ORDER':
          await actions.onTrackOrder?.();
          return;
        case 'SEARCH_PRODUCTS':
        default:
          await actions.onSearchProducts({
            query: intent.entities.productQuery || rawText,
            attributes: intent.entities.attributes,
            sort: intent.entities.sort,
            delivery: intent.entities.delivery
          });
      }
    },
    [actions]
  );

  const beginListening = React.useCallback(async () => {
    setSheetVisible(true);
    setError(null);
    setTranscript('');
    setDraftTranscript('');
    setParsedIntent(null);

    tracker('voice_permission_prompted', buildSafeVoicePayload({}));

    const started = await client.startListening((partial) => {
      setTranscript(partial);
    });

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
    triggerHaptic('start');
    tracker('voice_listen_started', buildSafeVoicePayload({}));

    clearTimeoutRef();
    timeoutRef.current = setTimeout(() => {
      void cancelListening('timeout');
    }, timeoutMs);
  }, [clearTimeoutRef, client, timeoutMs, tracker]);

  const stopListeningAndProcess = React.useCallback(async () => {
    if (!client.isListening()) return;

    clearTimeoutRef();
    setStatus('processing');

    try {
      const result = await client.stopListening();
      const finalTranscript = (result.transcript || transcript).trim();
      const parsed = parseIntent(finalTranscript);
      const latencyMs = Date.now() - startTsRef.current;

      setTranscript(finalTranscript);
      setDraftTranscript(finalTranscript);
      setParsedIntent(parsed);

      if (parsed.requiresConfirmation) {
        setStatus('review');
        tracker(
          'voice_processed',
          buildSafeVoicePayload({
            intentType: parsed.type,
            success: true,
            latencyMs,
            confidenceBucket: parsed.confidence
          })
        );
        return;
      }

      await executeIntent(parsed, finalTranscript);
      setStatus('success');
      triggerHaptic('stop');
      tracker(
        'voice_processed',
        buildSafeVoicePayload({
          intentType: parsed.type,
          success: true,
          latencyMs,
          confidenceBucket: parsed.confidence
        })
      );
    } catch {
      setStatus('error');
      triggerHaptic('error');
      setError('No entendimos el audio. Puedes intentar de nuevo o escribir tu búsqueda.');
      tracker('voice_failed', buildSafeVoicePayload({ success: false, reason: 'stt_error' }));
    }
  }, [clearTimeoutRef, client, executeIntent, tracker, transcript]);

  const confirmDraftAndRun = React.useCallback(async () => {
    const finalText = draftTranscript.trim();
    const parsed = parseIntent(finalText);

    setStatus('processing');
    setParsedIntent(parsed);

    try {
      await executeIntent(parsed, finalText);
      setTranscript(finalText);
      setStatus('success');
      triggerHaptic('stop');
    } catch {
      setStatus('error');
      triggerHaptic('error');
      setError('No pudimos ejecutar la acción por voz en este momento.');
    }
  }, [draftTranscript, executeIntent]);

  const cancelListening = React.useCallback(
    async (reason: 'user_cancel' | 'timeout' = 'user_cancel') => {
      clearTimeoutRef();
      await client.cancel();
      setStatus('idle');
      tracker('voice_listen_cancelled', buildSafeVoicePayload({ reason }));
    },
    [clearTimeoutRef, client, tracker]
  );

  const closeSheet = React.useCallback(async () => {
    clearTimeoutRef();
    if (client.isListening()) {
      await client.cancel();
    }
    setSheetVisible(false);
    setStatus('idle');
    setError(null);
  }, [clearTimeoutRef, client]);

  React.useEffect(() => {
    return () => {
      clearTimeoutRef();
      void client.dispose();
    };
  }, [clearTimeoutRef, client]);

  return {
    status,
    transcript,
    draftTranscript,
    parsedIntent,
    error,
    sheetVisible,
    setSheetVisible,
    setDraftTranscript,
    beginListening,
    stopListeningAndProcess,
    confirmDraftAndRun,
    cancelListening,
    closeSheet
  };
}

import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';
import { getCatalog, getProductBySlug } from '../../../services/api/catalogApi';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useCartStore } from '../../../state/cartStore';
import { buildSafeVoicePayload } from '../analytics/voiceEvents';
import { VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { VoiceClient } from '../services/VoiceClient';
import { PicovoiceSttProvider } from '../services/stt/PicovoiceSttProvider';
import { NoopTtsService } from '../services/tts/TtsService';
import { useVoiceAssistant } from '../state/useVoiceAssistant';
import { VoiceCard } from './VoiceCard';
import { VoiceDock } from './VoiceDock';
import { VoiceOrb } from './VoiceOrb';
import { VoiceStatus } from './VoiceStatus';
import { useVoiceEnergy } from './useVoiceEnergy';

type VoiceOrbScreenProps = {
  accessKey: string;
  cheetahModelPath: string;
  rhinoContextPath: string;
  rhinoModelPath?: string;
  enabled?: boolean;
  onOpenCatalog?: (params: { query?: string; categorySlug?: string }) => void;
  onOpenOrders?: () => void;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function topCopy(status: ReturnType<typeof useVoiceAssistant>['status']): string {
  switch (status) {
    case 'listening':
      return 'Escuchando…';
    case 'processing':
      return 'Procesando…';
    case 'review':
      return 'Revisa lo que entendí';
    case 'error':
      return 'No te escuché bien, intenta de nuevo';
    default:
      return 'Toca el micrófono para hablar';
  }
}

function resolveTranscriptPreview({
  status,
  transcript,
  draftTranscript
}: {
  status: ReturnType<typeof useVoiceAssistant>['status'];
  transcript: string;
  draftTranscript: string;
}): string {
  if (status === 'review' && draftTranscript.trim()) return draftTranscript.trim();
  if (transcript.trim()) return transcript.trim();
  if (status === 'listening') return 'Te escucho...';
  return '';
}

function unsupportedCopy(intent: VoiceIntentType | null): string {
  if (intent === 'REPEAT_LAST_ORDER') return 'Aún no disponible: repetir última compra.';
  if (intent === 'TRACK_ORDER') return 'Aún no disponible: seguimiento de pedido.';
  return 'Aún no disponible.';
}

export function VoiceOrbScreen({
  accessKey,
  cheetahModelPath,
  rhinoContextPath,
  rhinoModelPath,
  enabled = true,
  onOpenCatalog,
  onOpenOrders
}: VoiceOrbScreenProps) {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotionSetting();
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const addItem = useCartStore((s) => s.addItem);
  const wasFocusedRef = React.useRef(isFocused);
  const [animationsActive, setAnimationsActive] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setAnimationsActive(true);
      return () => setAnimationsActive(false);
    }, [])
  );

  const inactiveClient = React.useMemo(
    () =>
      new VoiceClient(
        {
          start: async () => undefined,
          stop: async () => ({ transcript: '' }),
          cancel: async () => undefined,
          isListening: () => false,
          dispose: async () => undefined
        },
        new NoopTtsService()
      ),
    []
  );

  const voiceClient = React.useMemo(() => {
    if (!enabled) return null;
    if (!accessKey || !cheetahModelPath || !rhinoContextPath) return null;

    const stt = new PicovoiceSttProvider({
      accessKey,
      cheetahModelPath,
      rhinoContextPath,
      rhinoModelPath,
      endpointDurationSec: 1.1,
      organicTerms: ['aguacate hass', 'tomates organicos', 'lechuga', 'finca', 'sin quimicos']
    });

    return new VoiceClient(stt, new NoopTtsService(), {
      hasRecordAudioPermission: () => stt.hasPermission()
    });
  }, [accessKey, cheetahModelPath, enabled, rhinoContextPath, rhinoModelPath]);

  const resolveCandidates = React.useCallback(
    async ({ query, intentType }: { query: string; intentType: VoiceIntentType }): Promise<VoiceCandidate[]> => {
      if (!query.trim()) return [];
      if (intentType !== 'SEARCH_PRODUCTS' && intentType !== 'ADD_TO_CART') return [];

      const response = await getCatalog({
        page: 1,
        limit: 8,
        zoneId: zoneId ?? undefined,
        q: query
      });

      const normalized = normalizeSearchText(query);
      const seen = new Set<string>();
      const candidates: VoiceCandidate[] = [];

      response.data.forEach((item, idx) => {
        if (seen.has(item.slug)) return;
        const normalizedName = normalizeSearchText(item.name);
        if (!normalizedName.includes(normalized) && candidates.length >= 3) return;
        seen.add(item.slug);
        candidates.push({ id: `${item.id}-${idx}`, name: item.name, slug: item.slug });
      });

      return candidates.slice(0, 3);
    },
    [zoneId]
  );

  const resolveProduct = React.useCallback(
    async (query: string) => {
      const normalized = normalizeSearchText(query);
      if (!normalized) return null;

      const response = await getCatalog({
        page: 1,
        limit: 8,
        zoneId: zoneId ?? undefined,
        q: query
      });

      return (
        response.data.find((item) => normalizeSearchText(item.name) === normalized) ??
        response.data.find((item) => normalizeSearchText(item.name).includes(normalized)) ??
        response.data[0] ??
        null
      );
    },
    [zoneId]
  );

  const trackVoiceEvent = React.useCallback((name: string, payload?: Record<string, unknown>) => {
    if (!__DEV__) return;
    console.debug('[voice-event]', name, buildSafeVoicePayload(payload as any));
  }, []);

  const voice = useVoiceAssistant({
    client: voiceClient ?? inactiveClient,
    timeoutMs: 9_500,
    tracker: trackVoiceEvent,
    screenContext: 'voice',
    rhinoFirst: (process.env.EXPO_PUBLIC_VOICE_RHINO_FIRST ?? '0') === '1',
    resolveCandidates,
    actions: {
      onSearchProducts: async ({ query }) => {
        onOpenCatalog?.({ query });
      },
      onAddToCart: async ({ query, qty }) => {
        const product = await resolveProduct(query);
        if (!product) return;

        let variantId = product.defaultVariantId;
        if (!variantId) {
          const detail = await getProductBySlug(product.slug, zoneId ?? undefined);
          variantId = detail?.variants?.[0]?.id;
        }

        if (!variantId) return;
        await addItem({ variantId, qty: Math.max(1, qty) });
      },
      onOpenOrders: async () => {
        onOpenOrders?.();
      }
    }
  });

  React.useEffect(() => {
    if (wasFocusedRef.current && !isFocused) {
      void voice.closeSheet();
    }
    wasFocusedRef.current = isFocused;
  }, [isFocused, voice.closeSheet]);

  const energy = useVoiceEnergy(voice.status, voice.transcript, reduceMotion);
  const disabled = !enabled || !voiceClient;
  const transcriptPreview = resolveTranscriptPreview({
    status: voice.status,
    transcript: voice.transcript,
    draftTranscript: voice.draftTranscript
  });
  const showReviewEditor = voice.status === 'review';
  const showTopMatches = showReviewEditor && voice.candidates.length > 1;
  const showUnsupported = Boolean(voice.unsupportedIntent);
  const showError = voice.status === 'error' && Boolean(voice.error);
  const showOpenOrders = voice.unsupportedIntent === 'REPEAT_LAST_ORDER' || voice.unsupportedIntent === 'TRACK_ORDER';

  return (
    <View style={styles.container}>
      <VoiceCard
        top={
          <Text numberOfLines={1} style={styles.topLabel}>
            {topCopy(voice.status)}
          </Text>
        }
        center={<VoiceOrb status={voice.status} voiceEnergy={energy} reduceMotion={reduceMotion} active={animationsActive} />}
        bottom={
          <View style={styles.bottomArea}>
            <VoiceStatus status={voice.status} />
            {transcriptPreview ? (
              <Text style={styles.transcript} numberOfLines={2} ellipsizeMode="tail">
                {transcriptPreview}
              </Text>
            ) : (
              <View style={styles.transcriptSpacer} />
            )}

            {showReviewEditor ? (
              <View style={styles.reviewPanel}>
                <TextInput
                  value={voice.draftTranscript}
                  onChangeText={voice.setDraftTranscript}
                  placeholder="Edita lo que entendí"
                  placeholderTextColor="rgba(28,28,30,0.45)"
                  style={styles.reviewInput}
                  autoCapitalize="sentences"
                  autoCorrect
                />

                {showTopMatches ? (
                  <View style={styles.candidatesRow}>
                    {voice.candidates.slice(0, 3).map((candidate) => (
                      <Pressable
                        key={candidate.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Seleccionar ${candidate.name}`}
                        style={styles.candidatePill}
                        onPress={() => {
                          void voice.selectCandidateAndRun(candidate);
                        }}
                      >
                        <Text numberOfLines={1} style={styles.candidateText}>
                          {candidate.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar transcripción"
                  onPress={() => {
                    void voice.confirmDraftAndRun();
                  }}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </Pressable>
              </View>
            ) : null}

            {showUnsupported ? (
              <View style={styles.unsupportedBox}>
                <Text style={styles.unsupportedText}>{unsupportedCopy(voice.unsupportedIntent)}</Text>
                {showOpenOrders ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir pedidos"
                    style={styles.ordersButton}
                    onPress={() => {
                      void voice.openOrdersFallback();
                    }}
                  >
                    <Text style={styles.ordersButtonText}>Abrir pedidos</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {showError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{voice.error}</Text>
              </View>
            ) : null}

            <VoiceDock
            status={voice.status}
            disabled={disabled}
            onPause={() => {
              void voice.cancelListening();
            }}
            onMicPressIn={() => {
              void voice.beginListening();
            }}
            onMicPressOut={() => {
              void voice.stopListeningAndProcess();
            }}
          />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center'
  },
  topLabel: {
    textAlign: 'center',
    color: 'rgba(43,43,43,0.7)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 14
  },
  bottomArea: {
    width: '100%',
    alignItems: 'center'
  },
  transcript: {
    marginTop: 10,
    color: '#1C1C1E',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '84%',
    minHeight: 48
  },
  transcriptSpacer: {
    height: 48
  },
  reviewPanel: {
    marginTop: 12,
    width: '100%',
    gap: 10
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.14)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    color: '#1C1C1E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  candidatesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center'
  },
  candidatePill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.12)'
  },
  candidateText: {
    color: '#1C1C1E',
    fontSize: 13,
    fontWeight: '500'
  },
  confirmButton: {
    alignSelf: 'center',
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C3240'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  unsupportedBox: {
    marginTop: 10,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.12)',
    backgroundColor: 'rgba(255,255,255,0.46)',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  unsupportedText: {
    color: '#1C1C1E',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  ordersButton: {
    marginTop: 8,
    alignSelf: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(44,50,64,0.9)'
  },
  ordersButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  errorBox: {
    marginTop: 10,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(177,67,67,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(177,67,67,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  errorText: {
    color: '#7A1E1E',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18
  }
});

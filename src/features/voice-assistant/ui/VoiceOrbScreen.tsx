import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getCatalog, getProductBySlug } from '../../../services/api/catalogApi';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useCartStore } from '../../../state/cartStore';
import { VoiceCard } from '../../../components/voice/VoiceCard';
import { VoiceCopy } from '../../../components/voice/VoiceCopy';
import { VoiceDock } from '../../../components/voice/VoiceDock';
import { VoiceHeader } from '../../../components/voice/VoiceHeader';
import { AuroraOrb } from '../../../components/voice/AuroraOrb';
import { buildSafeVoicePayload } from '../analytics/voiceEvents';
import { VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { VoiceClient } from '../services/VoiceClient';
import { PicovoiceSttProvider } from '../services/stt/PicovoiceSttProvider';
import { NoopTtsService } from '../services/tts/TtsService';
import { useVoiceAssistant } from '../state/useVoiceAssistant';
import { useTheme } from '../../../shared/theme/useTheme';

type VoiceOrbScreenProps = {
  accessKey: string;
  cheetahModelPath: string;
  rhinoContextPath: string;
  rhinoModelPath?: string;
  enabled?: boolean;
  prewarmToken?: number;
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

export function statusLabelCopy(status: ReturnType<typeof useVoiceAssistant>['status']): string {
  switch (status) {
    case 'listening':
      return 'Escuchando...';
    case 'processing':
      return 'Procesando...';
    case 'review':
      return 'Revisa la transcripción';
    case 'error':
      return 'Ocurrió un error';
    default:
      return 'Listo para escucharte';
  }
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
  prewarmToken = 0,
  onOpenCatalog,
  onOpenOrders
}: VoiceOrbScreenProps) {
  const { isDark } = useTheme();
  const isFocused = useIsFocused();
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const addItem = useCartStore((s) => s.addItem);
  const wasFocusedRef = React.useRef(isFocused);
  const [isVoiceStarting, setIsVoiceStarting] = React.useState(false);
  const [isOrbVideoPlaying, setIsOrbVideoPlaying] = React.useState(false);
  const sttRef = React.useRef<PicovoiceSttProvider | null>(null);
  const clientRef = React.useRef<VoiceClient | null>(null);
  const clientConfigKeyRef = React.useRef('');
  const prewarmedConfigRef = React.useRef('');
  const [clientReady, setClientReady] = React.useState(false);

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

  const desiredConfigKey = React.useMemo(() => {
    if (!enabled) return '';
    if (!accessKey || !cheetahModelPath) return '';
    return JSON.stringify({
      accessKey,
      cheetahModelPath,
      rhinoContextPath,
      rhinoModelPath: rhinoModelPath ?? '',
      enabled
    });
  }, [accessKey, cheetahModelPath, enabled, rhinoContextPath, rhinoModelPath]);

  React.useEffect(() => {
    let cancelled = false;
    const syncVoiceClient = async () => {
      if (!desiredConfigKey) {
        const oldClient = clientRef.current;
        clientRef.current = null;
        sttRef.current = null;
        clientConfigKeyRef.current = '';
        setClientReady(false);
        if (oldClient) {
          try {
            await oldClient.dispose();
          } catch {
            // noop
          }
        }
        return;
      }

      if (clientConfigKeyRef.current === desiredConfigKey && clientRef.current) {
        if (!clientReady) setClientReady(true);
        return;
      }

      // PERF: Keep one client/provider instance per effective config to avoid cold starts.
      const oldClient = clientRef.current;
      clientRef.current = null;
      sttRef.current = null;
      clientConfigKeyRef.current = '';
      setClientReady(false);
      if (oldClient) {
        try {
          await oldClient.dispose();
        } catch {
          // noop
        }
      }
      if (cancelled) return;

      const nextStt = new PicovoiceSttProvider({
        accessKey,
        cheetahModelPath,
        rhinoContextPath,
        rhinoModelPath,
        disableRhino: false,
        endpointDurationSec: 1.0,
        organicTerms: ['aguacate hass', 'tomates organicos', 'lechuga', 'finca', 'sin quimicos']
      });
      const nextClient = new VoiceClient(nextStt, new NoopTtsService(), {
        hasRecordAudioPermission: () => nextStt.hasPermission()
      });

      sttRef.current = nextStt;
      clientRef.current = nextClient;
      clientConfigKeyRef.current = desiredConfigKey;
      setClientReady(true);
      if (__DEV__) {
        console.debug('[voice-debug][ui] client_singleton_created', { configKey: desiredConfigKey });
      }
    };

    void syncVoiceClient();
    return () => {
      cancelled = true;
    };
  }, [accessKey, cheetahModelPath, clientReady, desiredConfigKey, rhinoContextPath, rhinoModelPath]);

  React.useEffect(() => {
    return () => {
      const oldClient = clientRef.current;
      clientRef.current = null;
      sttRef.current = null;
      clientConfigKeyRef.current = '';
      if (!oldClient) return;
      void oldClient.dispose();
    };
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    if (!clientReady || !clientRef.current || !sttRef.current) return;
    const configKey = clientConfigKeyRef.current;
    if (!configKey) return;
    if (prewarmedConfigRef.current === `${configKey}:${prewarmToken}`) return;
    prewarmedConfigRef.current = `${configKey}:${prewarmToken}`;

    // PERF: lightweight prewarm to reduce first tap-to-partial latency.
    queueMicrotask(() => {
      void sttRef.current?.hasPermission?.();
      void clientRef.current?.isListening();
    });
  }, [clientReady, enabled, prewarmToken]);

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
    client: clientReady && clientRef.current ? clientRef.current : inactiveClient,
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
      },
      onOpenCart: async () => {
        // TODO: wire cart navigator route if voice context should open cart directly.
      },
      onRemoveFromCart: async () => {
        // TODO: implement remove-from-cart flow based on product resolution strategy.
      },
      onClearCart: async () => {
        // TODO: implement clear-cart action in cart store if exposed.
      }
    }
  });

  React.useEffect(() => {
    if (wasFocusedRef.current && !isFocused) {
      void voice.closeSheet();
    }
    wasFocusedRef.current = isFocused;
  }, [isFocused, voice.closeSheet]);

  const disabled = !enabled || !clientReady || !clientRef.current;
  const showReviewEditor = voice.status === 'review';
  const showTopMatches = showReviewEditor && voice.candidates.length > 1;
  const showUnsupported = Boolean(voice.unsupportedIntent);
  const showError = voice.status === 'error' && Boolean(voice.error);
  const showOpenOrders = voice.unsupportedIntent === 'REPEAT_LAST_ORDER' || voice.unsupportedIntent === 'TRACK_ORDER';
  const liveSubtitle =
    voice.status === 'listening' || voice.status === 'processing' ? voice.transcript.trim() : '';
  const copyTitle = voice.status === 'listening' ? 'Te escucho...' : 'Toca para hablar';
  const copySubtitle = liveSubtitle;
  const auroraState = voice.status === 'listening' ? 'listening' : voice.status === 'processing' ? 'processing' : 'idle';
  const shouldPlayOrbVideo = isOrbVideoPlaying;

  React.useEffect(() => {
    if (voice.status !== 'idle') {
      setIsVoiceStarting(false);
      return;
    }
    // Pause the orb video whenever flow returns to idle.
    setIsOrbVideoPlaying(false);
  }, [voice.status]);

  const beginListeningWithVideoPause = React.useCallback(async () => {
    // Start video playback on explicit user interaction with the mic button.
    setIsOrbVideoPlaying(true);
    setIsVoiceStarting(true);
    try {
      await voice.beginListening();
    } finally {
      setIsVoiceStarting(false);
    }
  }, [voice]);

  return (
    <View style={styles.container}>
      <VoiceCard
        top={<VoiceHeader />}
        center={
          <View style={styles.centerContent}>
            <Text numberOfLines={1} style={[styles.statusLabel, isDark && styles.statusLabelDark]}>
              {statusLabelCopy(voice.status)}
            </Text>

            <AuroraOrb state={auroraState} size={230} withVideo={shouldPlayOrbVideo} />

            <View style={styles.copyWrap}>
              <VoiceCopy title={copyTitle} subtitle={copySubtitle} />
            </View>

            {showReviewEditor ? (
              <View style={styles.reviewPanel}>
                <TextInput
                  value={voice.draftTranscript}
                  onChangeText={voice.setDraftTranscript}
                  placeholder="Edita lo que entendí"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.72)' : 'rgba(28,28,30,0.45)'}
                  style={[styles.reviewInput, isDark && styles.reviewInputDark]}
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
                        style={[styles.candidatePill, isDark && styles.candidatePillDark]}
                        onPress={() => {
                          void voice.selectCandidateAndRun(candidate);
                        }}
                      >
                        <Text numberOfLines={1} style={[styles.candidateText, isDark && styles.candidateTextDark]}>
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
              <View style={[styles.unsupportedBox, isDark && styles.unsupportedBoxDark]}>
                <Text style={[styles.unsupportedText, isDark && styles.unsupportedTextDark]}>
                  {unsupportedCopy(voice.unsupportedIntent)}
                </Text>
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
              <View style={[styles.errorBox, isDark && styles.errorBoxDark]}>
                <Text style={[styles.errorText, isDark && styles.errorTextDark]}>{voice.error}</Text>
              </View>
            ) : null}
          </View>
        }
        bottom={
          <View style={styles.bottomArea}>
            <VoiceDock
              status={voice.status}
              disabled={disabled}
              onPause={() => {
                if (voice.status === 'listening') {
                  void voice.stopListeningAndProcess();
                  return;
                }
                void voice.cancelListening();
              }}
              onMicPress={() => {
                if (voice.status === 'listening') {
                  void voice.stopListeningAndProcess();
                  return;
                }
                void beginListeningWithVideoPause();
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
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  centerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusLabel: {
    marginTop: 18,
    marginBottom: 24,
    color: 'rgba(28,28,30,0.55)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center'
  },
  statusLabelDark: {
    color: '#FFFFFF'
  },
  copyWrap: {
    marginTop: 30,
    width: '100%'
  },
  bottomArea: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18
  },
  reviewPanel: {
    marginTop: 16,
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
    fontSize: 15
  },
  reviewInputDark: {
    borderColor: 'rgba(220,236,228,0.22)',
    backgroundColor: 'rgba(8,20,16,0.46)',
    color: '#FFFFFF'
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
  candidatePillDark: {
    backgroundColor: 'rgba(10,24,19,0.44)',
    borderColor: 'rgba(215,236,225,0.20)'
  },
  candidateText: {
    color: '#1C1C1E',
    fontSize: 13,
    fontWeight: '500'
  },
  candidateTextDark: {
    color: '#FFFFFF'
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
    marginTop: 14,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(28,28,30,0.12)',
    backgroundColor: 'rgba(255,255,255,0.46)',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  unsupportedBoxDark: {
    borderColor: 'rgba(207,228,217,0.18)',
    backgroundColor: 'rgba(10,24,19,0.42)'
  },
  unsupportedText: {
    color: '#1C1C1E',
    fontSize: 14,
    lineHeight: 19,
    textAlign: 'center'
  },
  unsupportedTextDark: {
    color: '#FFFFFF'
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
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(177,67,67,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(177,67,67,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  errorBoxDark: {
    backgroundColor: 'rgba(177,67,67,0.24)',
    borderColor: 'rgba(235,140,140,0.34)'
  },
  errorText: {
    color: '#7A1E1E',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18
  },
  errorTextDark: {
    color: '#FFFFFF'
  }
});

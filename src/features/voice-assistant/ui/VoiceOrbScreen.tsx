import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useReducedMotionSetting } from '../../../design/motion/useReducedMotionSetting';
import { getCatalog, getProductBySlug } from '../../../services/api/catalogApi';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useCartStore } from '../../../state/cartStore';
import { useTheme } from '../../../shared/theme/useTheme';
import { AppText } from '../../../shared/ui/AppText';
import { buildSafeVoicePayload } from '../analytics/voiceEvents';
import { VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { VoiceClient } from '../services/VoiceClient';
import { PicovoiceSttProvider } from '../services/stt/PicovoiceSttProvider';
import { NoopTtsService } from '../services/tts/TtsService';
import { useVoiceAssistant } from '../state/useVoiceAssistant';
import { VoiceOrb } from './VoiceOrb';
import { VoiceSeedButton } from './VoiceSeedButton';
import { VoiceSheet } from './VoiceSheet';
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

function statusCopy(status: ReturnType<typeof useVoiceAssistant>['status']): string {
  switch (status) {
    case 'listening':
      return 'Listening…';
    case 'processing':
      return 'Procesando…';
    case 'review':
      return 'Revisa antes de ejecutar';
    case 'error':
      return 'No te escuché bien';
    case 'success':
      return 'Listo';
    default:
      return 'Toca el micrófono para hablar';
  }
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
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotionSetting();
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const addItem = useCartStore((s) => s.addItem);
  const wasFocusedRef = React.useRef(isFocused);

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

  return (
    <View style={styles.container}>
      <View style={[styles.bgLayer, styles.bgA, { backgroundColor: isDark ? '#0f1f1a' : '#e9f6ee' }]} />
      <View style={[styles.bgLayer, styles.bgB, { backgroundColor: isDark ? 'rgba(49,129,101,0.24)' : 'rgba(77,214,152,0.27)' }]} />
      <View style={[styles.bgLayer, styles.bgC, { backgroundColor: isDark ? 'rgba(88,118,229,0.16)' : 'rgba(120,170,255,0.18)' }]} />

      <View style={styles.topState}>
        <AppText style={[styles.stateText, { color: colors.text2 }]}>{statusCopy(voice.status)}</AppText>
      </View>

      <View style={styles.orbWrap}>
        <VoiceOrb size={264} status={voice.status} voiceEnergy={energy} reduceMotion={reduceMotion} />
      </View>

      <View style={styles.transcriptWrap}>
        <AppText
          style={[styles.transcript, { color: colors.text1 }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {voice.transcript || 'Te escucho…'}
        </AppText>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar voz"
          onPress={() => {
            void voice.cancelListening();
          }}
          style={[styles.pauseButton, { borderColor: colors.border1, backgroundColor: isDark ? 'rgba(13,24,19,0.7)' : 'rgba(255,255,255,0.68)' }]}
        >
          <Feather name="pause" size={18} color={colors.text1} />
        </Pressable>

        <VoiceSeedButton
          status={voice.status}
          disabled={disabled}
          onPressIn={() => {
            void voice.beginListening();
          }}
          onPressOut={() => {
            void voice.stopListeningAndProcess();
          }}
          onPress={() => voice.setSheetVisible(true)}
          backgroundColor={isDark ? 'rgba(111,168,138,0.22)' : 'rgba(40,179,130,0.19)'}
          iconColor={isDark ? '#d6ece0' : '#135b42'}
          borderColor={isDark ? 'rgba(111,168,138,0.4)' : 'rgba(40,179,130,0.36)'}
        />
      </View>

      <VoiceSheet
        visible={voice.sheetVisible}
        status={voice.status}
        transcript={voice.transcript}
        draftTranscript={voice.draftTranscript}
        error={voice.error}
        candidates={voice.candidates}
        candidatesLoading={voice.candidatesLoading}
        unsupportedIntent={voice.unsupportedIntent}
        onClose={() => {
          void voice.closeSheet();
        }}
        onRetry={() => {
          void voice.beginListening();
        }}
        onConfirm={() => {
          void voice.confirmDraftAndRun();
        }}
        onDraftChange={voice.setDraftTranscript}
        onSelectCandidate={(candidate) => {
          void voice.selectCandidateAndRun(candidate);
        }}
        onOpenOrders={() => {
          void voice.openOrdersFallback();
        }}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18
  },
  bgLayer: {
    position: 'absolute',
    borderRadius: 999
  },
  bgA: {
    width: 390,
    height: 390,
    top: -120,
    right: -120,
    opacity: 0.9
  },
  bgB: {
    width: 300,
    height: 300,
    left: -70,
    top: 150
  },
  bgC: {
    width: 220,
    height: 220,
    right: -20,
    bottom: 30
  },
  topState: {
    alignItems: 'center',
    marginTop: 8
  },
  stateText: {
    fontSize: 14,
    fontWeight: '600'
  },
  orbWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  transcriptWrap: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 6
  },
  transcript: {
    textAlign: 'center',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700'
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8
  },
  pauseButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

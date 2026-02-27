import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { buildSafeVoicePayload } from '../analytics/voiceEvents';
import { VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { VoiceClient } from '../services/VoiceClient';
import { PicovoiceSttProvider } from '../services/stt/PicovoiceSttProvider';
import { NoopTtsService } from '../services/tts/TtsService';
import { useVoiceAssistant } from '../state/useVoiceAssistant';
import { useTheme } from '../../../shared/theme/useTheme';
import { AppText } from '../../../shared/ui/AppText';
import { getCatalog, getProductBySlug } from '../../../services/api/catalogApi';
import { useAvailabilityStore } from '../../../state/availabilityStore';
import { useCartStore } from '../../../state/cartStore';
import { VoiceSeedButton } from './VoiceSeedButton';
import { VoiceSheet } from './VoiceSheet';

type VoiceAssistantDockProps = {
  accessKey: string;
  cheetahModelPath: string;
  rhinoContextPath: string;
  rhinoModelPath?: string;
  enabled?: boolean;
  style?: object;
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

function toCandidate(item: { id: string; name: string; slug: string }, idx: number): VoiceCandidate {
  return {
    id: `${item.id}-${idx}`,
    name: item.name,
    slug: item.slug
  };
}

export function VoiceAssistantDock({
  accessKey,
  cheetahModelPath,
  rhinoContextPath,
  rhinoModelPath,
  enabled = true,
  style,
  onOpenCatalog,
  onOpenOrders
}: VoiceAssistantDockProps) {
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();
  const wasFocusedRef = React.useRef(isFocused);
  const zoneId = useAvailabilityStore((s) => s.selectedZoneId);
  const addItem = useCartStore((s) => s.addItem);
  const [hint, setHint] = React.useState<string | null>(null);

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

  const resolveCandidates = React.useCallback(
    async ({ query, intentType }: { query: string; intentType: VoiceIntentType }) => {
      if (!query.trim()) return [];
      if (intentType !== 'SEARCH_PRODUCTS' && intentType !== 'ADD_TO_CART') return [];

      const response = await getCatalog({
        page: 1,
        limit: 8,
        zoneId: zoneId ?? undefined,
        q: query
      });

      const normalized = normalizeSearchText(query);
      const unique = new Map<string, VoiceCandidate>();

      response.data
        .filter((item) => normalizeSearchText(item.name).includes(normalized) || normalizeSearchText(item.slug).includes(normalized))
        .forEach((item, idx) => {
          const candidate = toCandidate(item, idx);
          if (!unique.has(item.slug)) unique.set(item.slug, candidate);
        });

      if (unique.size === 0) {
        response.data.slice(0, 3).forEach((item, idx) => {
          const candidate = toCandidate(item, idx);
          if (!unique.has(item.slug)) unique.set(item.slug, candidate);
        });
      }

      return Array.from(unique.values()).slice(0, 3);
    },
    [zoneId]
  );

  const trackVoiceEvent = React.useCallback((name: string, payload?: Record<string, unknown>) => {
    if (!__DEV__) return;
    console.debug('[voice-event]', name, buildSafeVoicePayload(payload as any));
  }, []);

  const rhinoFirstEnabled = (process.env.EXPO_PUBLIC_VOICE_RHINO_FIRST ?? '0') === '1';

  const voice = useVoiceAssistant({
    client: voiceClient ?? inactiveClient,
    timeoutMs: 9_500,
    tracker: trackVoiceEvent,
    screenContext: 'voice',
    rhinoFirst: rhinoFirstEnabled,
    resolveCandidates,
    actions: {
      onSearchProducts: async ({ query }) => {
        setHint(null);
        onOpenCatalog?.({ query });
      },
      onAddToCart: async ({ query, qty }) => {
        setHint(null);
        const product = await resolveProduct(query);
        if (!product) {
          setHint('No encontré ese producto. Intenta otra búsqueda por voz.');
          return;
        }

        let variantId = product.defaultVariantId;
        if (!variantId) {
          const detail = await getProductBySlug(product.slug, zoneId ?? undefined);
          variantId = detail?.variants?.[0]?.id;
        }

        if (!variantId) {
          setHint('No pude resolver la variante del producto.');
          return;
        }

        await addItem({ variantId, qty: Math.max(1, qty) });
        setHint(`Agregado: ${product.name}`);
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

  const disabled = !enabled || !voiceClient;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, style]}>
      {hint ? (
        <Pressable
          onPress={() => setHint(null)}
          style={[
            styles.hint,
            {
              backgroundColor: isDark ? 'rgba(16,26,21,0.94)' : 'rgba(240,247,243,0.95)',
              borderColor: colors.border1
            }
          ]}
        >
          <AppText style={{ color: colors.text2 }}>{hint}</AppText>
        </Pressable>
      ) : null}

      <View style={styles.fabRow}>
        <VoiceSeedButton
          status={voice.status}
          disabled={disabled}
          onPressIn={() => {
            setHint(null);
            void voice.beginListening();
          }}
          onPressOut={() => {
            void voice.stopListeningAndProcess();
          }}
          onPress={() => voice.setSheetVisible(true)}
          backgroundColor={isDark ? 'rgba(111,168,138,0.18)' : 'rgba(40,179,130,0.16)'}
          iconColor={isDark ? '#cfe7d9' : '#1f6f52'}
          borderColor={isDark ? 'rgba(111,168,138,0.36)' : 'rgba(40,179,130,0.34)'}
        />

        <View style={[styles.micBadge, { borderColor: colors.border1, backgroundColor: isDark ? '#0e1813' : '#f2f8f4' }]}>
          <Feather name="mic" size={13} color={colors.text1} />
          <AppText style={[styles.micLabel, { color: colors.text1 }]}>{disabled ? 'Voice setup' : 'Hablar ahora'}</AppText>
        </View>
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
  wrapper: {
    alignItems: 'flex-end',
    gap: 8
  },
  hint: {
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  fabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  micBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  micLabel: {
    fontSize: 12,
    fontWeight: '600'
  }
});

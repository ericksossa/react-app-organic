import React from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VoiceCandidate, VoiceIntentType } from '../domain/intents';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';
import { AppButton } from '../../../shared/ui/AppButton';
import { AppText } from '../../../shared/ui/AppText';
import { VoiceWaveform } from './VoiceWaveform';

type VoiceSheetProps = {
  visible: boolean;
  status: VoiceAssistantStatus;
  transcript: string;
  draftTranscript: string;
  error: string | null;
  candidates: VoiceCandidate[];
  candidatesLoading: boolean;
  unsupportedIntent: VoiceIntentType | null;
  onClose: () => void;
  onRetry: () => void;
  onConfirm: () => void;
  onDraftChange: (value: string) => void;
  onSelectCandidate: (candidate: VoiceCandidate) => void;
  onOpenOrders: () => void;
  colors: {
    bg: string;
    text1: string;
    text2: string;
    border1: string;
    cta: string;
    ctaText: string;
    danger: string;
  };
  isDark: boolean;
};

function statusLabel(status: VoiceAssistantStatus): string {
  switch (status) {
    case 'listening':
      return 'Escuchando';
    case 'processing':
      return 'Procesando';
    case 'review':
      return 'Revisa la transcripción';
    case 'permission_denied':
      return 'Micrófono deshabilitado';
    case 'error':
      return 'Error de audio';
    case 'success':
      return 'Listo';
    default:
      return 'Asistente de voz';
  }
}

export function VoiceSheet({
  visible,
  status,
  transcript,
  draftTranscript,
  error,
  candidates,
  candidatesLoading,
  unsupportedIntent,
  onClose,
  onRetry,
  onConfirm,
  onDraftChange,
  onSelectCandidate,
  onOpenOrders,
  colors,
  isDark
}: VoiceSheetProps) {
  const showEditable = status === 'review';
  const showTopMatches = showEditable && (candidates.length > 0 || candidatesLoading);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(10,16,13,0.98)' : 'rgba(249,252,250,0.98)',
              borderColor: colors.border1
            }
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <AppText style={[styles.title, { color: colors.text1 }]}>{statusLabel(status)}</AppText>
            <Pressable onPress={onClose} style={[styles.close, { borderColor: colors.border1 }]}>
              <Feather name="x" size={16} color={colors.text1} />
            </Pressable>
          </View>

          <View
            style={[
              styles.waveCard,
              {
                borderColor: colors.border1,
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
              }
            ]}
          >
            <VoiceWaveform active={status === 'listening' || status === 'processing'} color={isDark ? '#9dd1b7' : '#1e7253'} />
            {status === 'listening' ? (
              <AppText style={[styles.partialLabel, { color: colors.text2 }]}>Transcripción parcial</AppText>
            ) : null}
            <AppText style={[styles.transcript, { color: colors.text1 }]}>{transcript || 'Te escucho...'}</AppText>
          </View>

          {showEditable ? (
            <TextInput
              value={draftTranscript}
              onChangeText={onDraftChange}
              style={[
                styles.input,
                {
                  color: colors.text1,
                  borderColor: colors.border1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                }
              ]}
              placeholder="Corrige la transcripción antes de ejecutar"
              placeholderTextColor={colors.text2}
              multiline
            />
          ) : null}

          {showTopMatches ? (
            <View
              style={[
                styles.matchesCard,
                {
                  borderColor: colors.border1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                }
              ]}
            >
              <AppText style={[styles.matchesTitle, { color: colors.text1 }]}>Top matches</AppText>
              {candidatesLoading ? <AppText style={{ color: colors.text2 }}>Buscando opciones...</AppText> : null}
              {candidates.map((candidate) => (
                <Pressable
                  key={candidate.id}
                  onPress={() => onSelectCandidate(candidate)}
                  style={[styles.matchItem, { borderColor: colors.border1 }]}
                >
                  <AppText style={[styles.matchText, { color: colors.text1 }]} numberOfLines={1}>
                    {candidate.name}
                  </AppText>
                  <Feather name="arrow-up-right" size={14} color={colors.text2} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {unsupportedIntent ? (
            <View
              style={[
                styles.unsupportedCard,
                {
                  borderColor: colors.border1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                }
              ]}
            >
              <AppText style={[styles.unsupportedTitle, { color: colors.text1 }]}>Aún no disponible</AppText>
              <AppText style={{ color: colors.text2 }}>
                {unsupportedIntent === 'REPEAT_LAST_ORDER'
                  ? 'Repetir última compra por voz aún no está habilitado.'
                  : 'Seguimiento de pedido por voz aún no está habilitado.'}
              </AppText>
              <AppButton
                title="Open Orders"
                onPress={onOpenOrders}
                style={{ alignSelf: 'flex-start', backgroundColor: colors.cta }}
                titleStyle={{ color: colors.ctaText }}
              />
            </View>
          ) : null}

          {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

          <View style={styles.actions}>
            {showEditable ? <AppButton title="Confirmar" onPress={onConfirm} style={{ flex: 1 }} /> : null}
            {status === 'permission_denied' || status === 'error' ? (
              <AppButton
                title="Reintentar"
                onPress={onRetry}
                style={{ flex: showEditable ? 0 : 1, backgroundColor: colors.cta }}
                titleStyle={{ color: colors.ctaText }}
              />
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.34)',
    justifyContent: 'flex-end',
    padding: 14
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 12
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700'
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  waveCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 8
  },
  partialLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  transcript: {
    fontSize: 15,
    lineHeight: 20
  },
  input: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top'
  },
  matchesCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8
  },
  matchesTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  matchItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  matchText: {
    flex: 1,
    fontSize: 14,
    marginRight: 8
  },
  unsupportedCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8
  },
  unsupportedTitle: {
    fontSize: 15,
    fontWeight: '700'
  },
  actions: {
    flexDirection: 'row',
    gap: 10
  }
});

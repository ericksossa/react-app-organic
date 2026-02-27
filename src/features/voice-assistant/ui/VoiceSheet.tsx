import React from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '../../../shared/ui/AppText';
import { AppButton } from '../../../shared/ui/AppButton';
import { VoiceAssistantStatus } from '../state/useVoiceAssistant';
import { VoiceWaveform } from './VoiceWaveform';

type VoiceSheetProps = {
  visible: boolean;
  status: VoiceAssistantStatus;
  transcript: string;
  draftTranscript: string;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onConfirm: () => void;
  onDraftChange: (value: string) => void;
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
  onClose,
  onRetry,
  onConfirm,
  onDraftChange,
  colors,
  isDark
}: VoiceSheetProps) {
  const showEditable = status === 'review';

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

          {error ? <AppText style={{ color: colors.danger }}>{error}</AppText> : null}

          <View style={styles.actions}>
            {showEditable ? (
              <AppButton title="Confirmar" onPress={onConfirm} style={{ flex: 1 }} />
            ) : null}
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
  actions: {
    flexDirection: 'row',
    gap: 10
  }
});

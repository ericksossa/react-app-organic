import { PermissionsAndroid, Platform } from 'react-native';

type VoiceProcessorPermissionProbe = {
  hasRecordAudioPermission?: () => Promise<boolean> | boolean;
};

export async function requestMicPermission(probe?: VoiceProcessorPermissionProbe): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Micrófono para asistente de voz',
      message: 'GreenCart usa voz en el dispositivo para buscar y gestionar tu canasta.',
      buttonPositive: 'Permitir',
      buttonNegative: 'Cancelar'
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const result = await probe?.hasRecordAudioPermission?.();
  if (typeof result === 'boolean') return result;

  return true;
}

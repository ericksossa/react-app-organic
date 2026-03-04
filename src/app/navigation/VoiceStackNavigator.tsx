import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VoiceStackParamList } from './types';
import { VoiceAssistantScreen } from '../../features/voice/screens/VoiceAssistantScreen';
import { isFeatureEnabled } from '../../shared/feature-flags/featureFlags';
import { FeatureDisabledScreen } from '../../shared/ui/FeatureDisabledScreen';

const Stack = createNativeStackNavigator<VoiceStackParamList>();

export function VoiceStackNavigator() {
  const voiceEnabled = isFeatureEnabled('tabVoice');

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="VoiceMain"
        component={
          voiceEnabled
            ? VoiceAssistantScreen
            : () => (
                <FeatureDisabledScreen
                  title="Asistente de voz desactivado"
                  description="Activa EXPO_PUBLIC_FF_TAB_VOICE para habilitar la funcionalidad."
                />
              )
        }
      />
    </Stack.Navigator>
  );
}

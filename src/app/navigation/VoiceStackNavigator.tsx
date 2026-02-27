import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VoiceStackParamList } from './types';
import { VoiceAssistantScreen } from '../../features/voice/screens/VoiceAssistantScreen';

const Stack = createNativeStackNavigator<VoiceStackParamList>();

export function VoiceStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VoiceMain" component={VoiceAssistantScreen} />
    </Stack.Navigator>
  );
}


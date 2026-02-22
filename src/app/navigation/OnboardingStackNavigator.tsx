import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { AddressOnboardingScreen } from '../../features/onboarding/screens/AddressOnboardingScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AddressOnboarding"
        component={AddressOnboardingScreen}
        options={{ title: 'Primera dirección' }}
      />
    </Stack.Navigator>
  );
}

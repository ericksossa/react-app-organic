import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import { AddressOnboardingScreen } from '../../features/onboarding/screens/AddressOnboardingScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddressOnboarding" component={AddressOnboardingScreen} />
    </Stack.Navigator>
  );
}

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthStackNavigator } from './AuthStackNavigator';
import { AppTabsNavigator } from './AppTabsNavigator';
import { OnboardingStackNavigator } from './OnboardingStackNavigator';
import { linking } from './linking';
import { useAuthStore } from '../../state/authStore';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresAddressOnboarding = useAuthStore((s) => s.requiresAddressOnboarding);

  if (!isBootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        ) : requiresAddressOnboarding ? (
          <RootStack.Screen name="Onboarding" component={OnboardingStackNavigator} />
        ) : (
          <RootStack.Screen name="App" component={AppTabsNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthStackNavigator } from './AuthStackNavigator';
import { AppTabsNavigator } from './AppTabsNavigator';
import { OnboardingStackNavigator } from './OnboardingStackNavigator';
import { linking } from './linking';
import { useAuthStore } from '../../state/authStore';
import { useTheme } from '../../shared/theme/useTheme';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresAddressOnboarding = useAuthStore((s) => s.requiresAddressOnboarding);
  const { isDark, colors } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.surface1,
      text: colors.text1,
      border: colors.border1,
      primary: colors.accent,
      notification: colors.accent
    }
  };

  if (!isBootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
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

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainFlowStackParamList, RootStackParamList } from './types';
import { AuthStackNavigator } from './AuthStackNavigator';
import { MainTabs } from './MainTabs';
import { OnboardingStackNavigator } from './OnboardingStackNavigator';
import { OnboardingScreen } from '../../features/onboarding/screens/OnboardingScreen';
import { linking } from './linking';
import { useAuthStore } from '../../state/authStore';
import { useTheme } from '../../shared/theme/useTheme';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainFlowStack = createNativeStackNavigator<MainFlowStackParamList>();

function MainFlowNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresAddressOnboarding = useAuthStore((s) => s.requiresAddressOnboarding);

  return (
    <MainFlowStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <MainFlowStack.Screen name="Auth" component={AuthStackNavigator} />
      ) : requiresAddressOnboarding ? (
        <MainFlowStack.Screen
          name="Onboarding"
          component={OnboardingStackNavigator}
        />
      ) : (
        <MainFlowStack.Screen name="App" component={MainTabs} />
      )}
    </MainFlowStack.Navigator>
  );
}

export function AppNavigator() {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
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
      <RootStack.Navigator
        initialRouteName="IntroOnboarding"
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen
          name="IntroOnboarding"
          component={OnboardingScreen}
        />
        <RootStack.Screen name="MainTabs" component={MainFlowNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

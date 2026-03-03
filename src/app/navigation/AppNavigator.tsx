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
import { HamburgerDrawer, HamburgerDrawerProvider } from './HamburgerDrawer';
import { navigationRef } from './navigationRef';
import { isFeatureEnabled } from '../../shared/feature-flags/featureFlags';
import { FeatureDisabledScreen } from '../../shared/ui/FeatureDisabledScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainFlowStack = createNativeStackNavigator<MainFlowStackParamList>();

function AppShellNavigator() {
  const drawerEnabled = isFeatureEnabled('drawer');

  if (!drawerEnabled) {
    return <MainTabs />;
  }

  return (
    <HamburgerDrawerProvider>
      <MainTabs />
      <HamburgerDrawer />
    </HamburgerDrawerProvider>
  );
}

function MainFlowNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requiresAddressOnboarding = useAuthStore((s) => s.requiresAddressOnboarding);
  const authEnabled = isFeatureEnabled('auth');
  const onboardingEnabled = isFeatureEnabled('onboarding');

  return (
    <MainFlowStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        authEnabled ? (
          <MainFlowStack.Screen name="Auth" component={AuthStackNavigator} />
        ) : (
          <MainFlowStack.Screen
            name="Auth"
            component={() => (
              <FeatureDisabledScreen
                title="Autenticacion desactivada"
                description="Activa EXPO_PUBLIC_FF_AUTH para habilitar login y registro."
              />
            )}
          />
        )
      ) : requiresAddressOnboarding ? (
        onboardingEnabled ? (
          <MainFlowStack.Screen
            name="Onboarding"
            component={OnboardingStackNavigator}
          />
        ) : (
          <MainFlowStack.Screen name="App" component={AppShellNavigator} />
        )
      ) : (
        <MainFlowStack.Screen name="App" component={AppShellNavigator} />
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
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
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

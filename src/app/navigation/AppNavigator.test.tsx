const mockUseAuthStore = jest.fn();
const mockUseTheme = jest.fn();

const rootScreens: any[] = [];
const mainFlowScreens: any[] = [];
const navigatorCalls: any[] = [];
const navigationContainerCalls: any[] = [];

jest.mock('../../state/authStore', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector)
}));

jest.mock('../../shared/theme/useTheme', () => ({
  useTheme: () => mockUseTheme()
}));

jest.mock('./linking', () => ({ linking: { prefixes: ['organicapp://'] } }));
jest.mock('../../features/onboarding/screens/OnboardingScreen', () => ({ OnboardingScreen: () => null }));
jest.mock('./AuthStackNavigator', () => ({ AuthStackNavigator: () => null }));
jest.mock('./MainTabs', () => ({ MainTabs: () => null }));
jest.mock('./OnboardingStackNavigator', () => ({ OnboardingStackNavigator: () => null }));

jest.mock('@react-navigation/native', () => ({
  DarkTheme: { colors: { background: '#000', card: '#111', text: '#fff', border: '#333', primary: '#0f0', notification: '#0f0' } },
  DefaultTheme: { colors: { background: '#fff', card: '#eee', text: '#111', border: '#ddd', primary: '#090', notification: '#090' } },
  NavigationContainer: ({ children, ...props }: any) => {
    navigationContainerCalls.push(props);
    return children;
  }
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => {
    const callIndex = navigatorCalls.length;
    navigatorCalls.push(callIndex);
    return {
      Navigator: ({ children, ...props }: any) => {
        return children;
      },
      Screen: (props: any) => {
        if (callIndex === 0) {
          rootScreens.push(props);
        } else {
          mainFlowScreens.push(props);
        }
        return null;
      }
    };
  })
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { AppNavigator } from './AppNavigator';

describe('AppNavigator', () => {
  beforeEach(() => {
    rootScreens.length = 0;
    mainFlowScreens.length = 0;
    navigatorCalls.length = 0;
    navigationContainerCalls.length = 0;

    mockUseTheme.mockReturnValue({
      isDark: true,
      colors: {
        bg: '#010',
        surface1: '#020',
        text1: '#fff',
        border1: '#333',
        accent: '#0f0'
      }
    });
  });

  function setAuthState(state: any) {
    mockUseAuthStore.mockImplementation((selector: any) => selector(state));
  }

  it('shows loading state before bootstrap', () => {
    setAuthState({ isBootstrapped: false, isAuthenticated: false, requiresAddressOnboarding: false });
    const { UNSAFE_getByType } = render(<AppNavigator />);

    expect(() => UNSAFE_getByType(require('react-native').ActivityIndicator)).not.toThrow();
    expect(navigationContainerCalls).toHaveLength(0);
  });

  it('configures root navigator after bootstrap', () => {
    setAuthState({ isBootstrapped: true, isAuthenticated: false, requiresAddressOnboarding: false });
    render(<AppNavigator />);

    expect(navigationContainerCalls).toHaveLength(1);
    expect(rootScreens.map((s) => s.name)).toEqual(['IntroOnboarding', 'MainTabs']);
  });

  it('routes main flow to auth/onboarding/app based on auth store', () => {
    setAuthState({ isBootstrapped: true, isAuthenticated: false, requiresAddressOnboarding: false });
    render(<AppNavigator />);
    const mainFlowNavigator = rootScreens.find((s) => s.name === 'MainTabs').component;

    mainFlowScreens.length = 0;
    setAuthState({ isBootstrapped: true, isAuthenticated: false, requiresAddressOnboarding: false });
    render(React.createElement(mainFlowNavigator));
    expect(mainFlowScreens.map((s) => s.name)).toContain('Auth');

    mainFlowScreens.length = 0;
    setAuthState({ isBootstrapped: true, isAuthenticated: true, requiresAddressOnboarding: true });
    render(React.createElement(mainFlowNavigator));
    expect(mainFlowScreens.map((s) => s.name)).toContain('Onboarding');

    mainFlowScreens.length = 0;
    setAuthState({ isBootstrapped: true, isAuthenticated: true, requiresAddressOnboarding: false });
    render(React.createElement(mainFlowNavigator));
    expect(mainFlowScreens.map((s) => s.name)).toContain('App');
  });
});

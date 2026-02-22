const mockUseTheme = jest.fn();
const mockUseSafeAreaInsets = jest.fn();
const iconRenderProps: any[] = [];
const screenCalls: Array<any> = [];
let navigatorProps: any = null;

jest.mock('../../shared/theme/useTheme', () => ({
  useTheme: () => mockUseTheme()
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockUseSafeAreaInsets()
}));

jest.mock('./AnimatedTabIcon', () => ({
  AnimatedTabIcon: (props: any) => {
    iconRenderProps.push(props);
    return null;
  }
}));

jest.mock('./withTabSceneTransition', () => ({
  withTabSceneTransition: (comp: any) => comp
}));

jest.mock('./HomeStackNavigator', () => ({ HomeStackNavigator: () => null }));
jest.mock('./CatalogStackNavigator', () => ({ CatalogStackNavigator: () => null }));
jest.mock('./CartStackNavigator', () => ({ CartStackNavigator: () => null }));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children, ...props }: any) => {
      navigatorProps = props;
      return children;
    },
    Screen: (props: any) => {
      screenCalls.push(props);
      if (typeof props.options?.tabBarIcon === 'function') {
        const blurEl = props.options.tabBarIcon({ focused: false });
        const focusEl = props.options.tabBarIcon({ focused: true });
        if (blurEl?.props) iconRenderProps.push(blurEl.props);
        if (focusEl?.props) iconRenderProps.push(focusEl.props);
      }
      return null;
    }
  })
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { MainTabs } from './MainTabs';

describe('MainTabs', () => {
  beforeEach(() => {
    screenCalls.length = 0;
    navigatorProps = null;
    iconRenderProps.length = 0;
    mockUseSafeAreaInsets.mockReturnValue({ top: 0, right: 0, bottom: 12, left: 0 });
    mockUseTheme.mockReturnValue({
      isDark: true,
      colors: { surface1: '#111', border1: '#222', text1: '#fff', text2: '#aaa' }
    });
  });

  it('configures tab navigator and localized labels', () => {
    render(<MainTabs />);

    expect(navigatorProps.screenOptions.headerShown).toBe(false);
    expect(navigatorProps.screenOptions.tabBarShowLabel).toBe(false);
    expect(navigatorProps.screenOptions.tabBarStyle.height).toBe(80);
    expect(screenCalls.map((s) => s.name)).toEqual(['HomeTab', 'CatalogTab', 'CartTab']);

    const labels = iconRenderProps.map((props) => props.label);
    expect(labels).toContain('Inicio');
    expect(labels).toContain('Mercado');
    expect(labels).toContain('Canasta');
  });

  it('uses light-mode tab colors when theme is light', () => {
    mockUseTheme.mockReturnValue({
      isDark: false,
      colors: { surface1: '#eee', border1: '#ddd', text1: '#111', text2: '#666' }
    });

    render(<MainTabs />);

    const firstIconCall = iconRenderProps[0];
    expect(firstIconCall.activeColor).toBe('#0B1712');
    expect(firstIconCall.inactiveColor).toBe('rgba(16,24,20,0.62)');
    expect(navigatorProps.screenOptions.tabBarStyle.backgroundColor).toBe('#FFFFFF');
  });
});

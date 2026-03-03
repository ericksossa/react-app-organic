import React from 'react';
import {
  BottomTabBarButtonProps,
  createBottomTabNavigator
} from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { CatalogStackNavigator } from './CatalogStackNavigator';
import { CartStackNavigator } from './CartStackNavigator';
import { VoiceStackNavigator } from './VoiceStackNavigator';
import { useTheme } from '../../shared/theme/useTheme';
import { AnimatedTabIcon } from './AnimatedTabIcon';
import { withTabSceneTransition } from './withTabSceneTransition';
import { useCartStore } from '../../state/cartStore';

const Tab = createBottomTabNavigator<AppTabsParamList>();

const TAB_BAR_BASE_HEIGHT = 68;
const HomeScene = withTabSceneTransition(HomeStackNavigator);
const CatalogScene = withTabSceneTransition(CatalogStackNavigator);
const VoiceScene = withTabSceneTransition(VoiceStackNavigator);
const CartScene = withTabSceneTransition(CartStackNavigator);

export function MainTabs() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const cartBadgeCount = useCartStore((s) =>
    (s.snapshot?.items ?? []).reduce((sum, item) => {
      const qty = Number.isFinite(item.qty) ? item.qty : 0;
      return sum + Math.max(0, Math.trunc(qty));
    }, 0)
  );
  const loadCart = useCartStore((s) => s.load);

  React.useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const tabBackground = isDark ? '#060A08' : '#FFFFFF';
  const tabBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const inactiveTone = isDark ? 'rgba(237,245,241,0.72)' : 'rgba(16,24,20,0.62)';
  const activeTone = isDark ? '#F6F8F7' : '#0B1712';
  const renderTabButton = React.useCallback(
    ({ children, ...rest }: BottomTabBarButtonProps) => (
      <Pressable hitSlop={10} {...(rest as any)}>
        {children}
      </Pressable>
    ),
    []
  );

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: tabBackground,
          borderTopColor: tabBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 5,
          paddingBottom: Math.max(insets.bottom, 10)
        },
        tabBarHideOnKeyboard: true,
        tabBarButton: renderTabButton
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScene}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              label="Inicio"
              icon="home"
              activeColor={activeTone}
              inactiveColor={inactiveTone}
            />
          )
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogScene}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              label="Cosecha"
              icon="explore"
              activeColor={activeTone}
              inactiveColor={inactiveTone}
            />
          )
        }}
      />
      <Tab.Screen
        name="VoiceTab"
        component={VoiceScene}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              label="Luna Verde"
              icon="voice"
              activeColor={activeTone}
              inactiveColor={inactiveTone}
            />
          )
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScene}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              label="Canasta"
              icon="cart"
              activeColor={activeTone}
              inactiveColor={inactiveTone}
              badgeCount={cartBadgeCount}
            />
          )
        }}
      />
    </Tab.Navigator>
  );
}

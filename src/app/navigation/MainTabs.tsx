import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { CatalogStackNavigator } from './CatalogStackNavigator';
import { CartStackNavigator } from './CartStackNavigator';
import { useTheme } from '../../shared/theme/useTheme';
import { AnimatedTabIcon } from './AnimatedTabIcon';
import { withTabSceneTransition } from './withTabSceneTransition';

const Tab = createBottomTabNavigator<AppTabsParamList>();

const TAB_BAR_BASE_HEIGHT = 68;
const HomeScene = withTabSceneTransition(HomeStackNavigator);
const CatalogScene = withTabSceneTransition(CatalogStackNavigator);
const CartScene = withTabSceneTransition(CartStackNavigator);

export function MainTabs() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const tabBackground = isDark ? '#060A08' : '#FFFFFF';
  const tabBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const inactiveTone = isDark ? 'rgba(237,245,241,0.72)' : 'rgba(16,24,20,0.62)';
  const activeTone = isDark ? '#F6F8F7' : '#0B1712';

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
        tabBarButton: (props) => <Pressable {...props} hitSlop={10} />
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScene}
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              label="Home"
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
              label="Explorar"
              icon="explore"
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
              label="Carrito"
              icon="cart"
              activeColor={activeTone}
              inactiveColor={inactiveTone}
            />
          )
        }}
      />
    </Tab.Navigator>
  );
}

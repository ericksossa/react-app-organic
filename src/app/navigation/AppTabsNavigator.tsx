import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AppTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { CatalogStackNavigator } from './CatalogStackNavigator';
import { CartStackNavigator } from './CartStackNavigator';
import { colors } from '../../shared/theme/tokens';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  const icon = (glyph: string, color: string, size: number) => (
    <Text style={{ color, fontSize: size }}>{glyph}</Text>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text1,
        tabBarInactiveTintColor: colors.text2,
        tabBarStyle: {
          backgroundColor: colors.surface1,
          borderTopColor: colors.border1,
          borderTopWidth: 1,
          height: 64
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700'
        }
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => icon('⌂', color, size)
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStackNavigator}
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, size }) => icon('⌕', color, size)
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStackNavigator}
        options={{
          title: 'Carrito',
          tabBarIcon: ({ color, size }) => icon('🛒', color, size - 1)
        }}
      />
    </Tab.Navigator>
  );
}

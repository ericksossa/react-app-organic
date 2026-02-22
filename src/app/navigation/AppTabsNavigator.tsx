import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { CatalogStackNavigator } from './CatalogStackNavigator';
import { CartStackNavigator } from './CartStackNavigator';
import { useTheme } from '../../shared/theme/useTheme';
import { AppIcon } from '../../shared/ui/AppIcon';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  const { colors } = useTheme();

  const icon = (name: 'leaf' | 'search' | 'bag', color: string, size: number) => (
    <AppIcon name={name} color={color} size={size} />
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
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => icon('leaf', color, size)
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStackNavigator}
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color, size }) => icon('search', color, size)
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStackNavigator}
        options={{
          title: 'Canasta',
          tabBarIcon: ({ color, size }) => icon('bag', color, size)
        }}
      />
    </Tab.Navigator>
  );
}

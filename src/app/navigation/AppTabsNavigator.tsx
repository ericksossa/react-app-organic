import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { AppTabsParamList } from './types';
import { HomeStackNavigator } from './HomeStackNavigator';
import { CatalogStackNavigator } from './CatalogStackNavigator';
import { CartStackNavigator } from './CartStackNavigator';
import { useTheme } from '../../shared/theme/useTheme';

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  const { colors } = useTheme();

  const renderHomeIcon = (color: string) => <Ionicons name="leaf-outline" color={color} size={24} />;
  const renderSearchIcon = (color: string) => <Feather name="search" color={color} size={24} />;
  const renderCartIcon = (color: string) => <Feather name="shopping-cart" color={color} size={24} />;

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
          height: 74,
          paddingTop: 6,
          paddingBottom: 8
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 1
        }
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => renderHomeIcon(color)
        }}
      />
      <Tab.Screen
        name="CatalogTab"
        component={CatalogStackNavigator}
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color }) => renderSearchIcon(color)
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStackNavigator}
        options={{
          title: 'Carrito',
          tabBarIcon: ({ color }) => renderCartIcon(color)
        }}
      />
    </Tab.Navigator>
  );
}

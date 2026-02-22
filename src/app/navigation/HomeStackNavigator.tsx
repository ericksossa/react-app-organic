import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { OrdersScreen } from '../../features/orders/screens/OrdersScreen';
import { OrderDetailScreen } from '../../features/orders/screens/OrderDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OrdersMain" component={OrdersScreen} options={{ title: 'Pedidos' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Detalle del pedido' }} />
    </Stack.Navigator>
  );
}

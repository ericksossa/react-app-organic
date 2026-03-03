import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
import { HomeScreen } from '../../features/home/screens/HomeScreen';
import { OrdersScreen } from '../../features/orders/screens/OrdersScreen';
import { OrderDetailScreen } from '../../features/orders/screens/OrderDetailScreen';
import { isFeatureEnabled } from '../../shared/feature-flags/featureFlags';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  const ordersEnabled = isFeatureEnabled('orders');

  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      {ordersEnabled ? <Stack.Screen name="OrdersMain" component={OrdersScreen} options={{ title: 'Pedidos' }} /> : null}
      {ordersEnabled ? <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Detalle del pedido' }} /> : null}
    </Stack.Navigator>
  );
}

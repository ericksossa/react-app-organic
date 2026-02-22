import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrdersScreen } from '../../features/orders/screens/OrdersScreen';
import { OrderDetailScreen } from '../../features/orders/screens/OrderDetailScreen';
import { OrdersFlowParamList } from '../../features/orders/types';

const Stack = createNativeStackNavigator<OrdersFlowParamList>();

export function OrdersStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="OrdersMain" component={OrdersScreen} options={{ title: 'Pedidos' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Detalle del pedido' }} />
    </Stack.Navigator>
  );
}

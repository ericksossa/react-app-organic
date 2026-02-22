import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CartStackParamList } from './types';
import { CartScreen } from '../../features/cart/screens/CartScreen';
import { CheckoutScreen } from '../../features/cart/screens/CheckoutScreen';

const Stack = createNativeStackNavigator<CartStackParamList>();

export function CartStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CartMain" component={CartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Confirma tu pedido' }} />
    </Stack.Navigator>
  );
}

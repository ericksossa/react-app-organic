import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CartStackParamList } from './types';
import { CartScreen } from '../../features/cart/screens/CartScreen';
import { CheckoutScreen } from '../../features/cart/screens/CheckoutScreen';
import { brandMicrocopy } from '../../shared/copy/brand-microcopy';
import { isFeatureEnabled } from '../../shared/feature-flags/featureFlags';

const Stack = createNativeStackNavigator<CartStackParamList>();

export function CartStackNavigator() {
  const checkoutEnabled = isFeatureEnabled('checkout');

  return (
    <Stack.Navigator>
      <Stack.Screen name="CartMain" component={CartScreen} options={{ headerShown: false }} />
      {checkoutEnabled ? (
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: brandMicrocopy.buttons.checkout }} />
      ) : null}
    </Stack.Navigator>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CatalogStackParamList } from './types';
import { CatalogScreen } from '../../features/catalog/screens/CatalogScreen';
import { ProductDetailScreen } from '../../features/catalog/screens/ProductDetailScreen';
import { isFeatureEnabled } from '../../shared/feature-flags/featureFlags';

const Stack = createNativeStackNavigator<CatalogStackParamList>();

export function CatalogStackNavigator() {
  const productDetailEnabled = isFeatureEnabled('productDetail');

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CatalogMain" component={CatalogScreen} />
      {productDetailEnabled ? <Stack.Screen name="ProductDetail" component={ProductDetailScreen} /> : null}
    </Stack.Navigator>
  );
}

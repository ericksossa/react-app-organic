import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CatalogStackParamList } from './types';
import { CatalogScreen } from '../../features/catalog/screens/CatalogScreen';
import { ProductDetailScreen } from '../../features/catalog/screens/ProductDetailScreen';

const Stack = createNativeStackNavigator<CatalogStackParamList>();

export function CatalogStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CatalogMain" component={CatalogScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

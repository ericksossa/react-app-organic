import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'organicApp RN',
  slug: 'organicapp-rn',
  scheme: 'organicapp',
  version: '1.0.0',
  orientation: 'portrait',
  ios: {
    bundleIdentifier: 'io.organicapp.mobile',
    supportsTablet: true
  },
  android: {
    package: 'io.organicapp.mobile'
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/green-cart/v1'
  },
  plugins: ['expo-secure-store']
};

export default config;

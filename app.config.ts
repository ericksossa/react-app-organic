import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'organicApp RN',
  slug: 'organicapp-rn',
  scheme: 'organicapp',
  version: '1.0.0',
  orientation: 'portrait',
  ios: {
    bundleIdentifier: 'io.organicapp.mobile',
    supportsTablet: true,
    deploymentTarget: '16.0',
    infoPlist: {
      NSMicrophoneUsageDescription: 'GreenCart usa el micrófono para búsqueda y asistente de voz on-device.'
    }
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

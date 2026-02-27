import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'organicApp RN',
  slug: 'organicapp-rn',
  scheme: 'organicapp',
  version: '1.0.0',
  orientation: 'portrait',

  // (si usas Reanimated 4) deja newArchEnabled en root
  newArchEnabled: true,

  ios: {
    bundleIdentifier: 'io.organicapp.mobile',
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription:
        'GreenCart usa el micrófono para búsqueda y asistente de voz on-device.'
    }
  },

 android: { package: 'io.organicapp.mobile' },
 extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/green-cart/v1',
    picovoiceAccessKey: process.env.PICOVOICE_ACCESS_KEY ?? process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY ?? ''
  },
  plugins: [
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '16.0' // ⚠️ cambia a lo que pida el podspec de Cheetah
        }
      }
    ]
  ]
};

export default config;

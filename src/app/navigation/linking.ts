import * as Linking from 'expo-linking';
import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'organicapp://'],
  config: {
    screens: {
      App: {
        screens: {
          HomeTab: {
            screens: {
              OrdersMain: 'orders',
              OrderDetail: 'orders/:id'
            }
          },
          CatalogTab: {
            screens: {
              ProductDetail: 'p/:slug'
            }
          },
          CartTab: {
            screens: {
              Checkout: 'checkout'
            }
          }
        }
      },
      Auth: {
        screens: {
          Login: 'auth/login',
          Register: 'auth/register'
        }
      },
      Onboarding: {
        screens: {
          AddressOnboarding: 'onboarding/address'
        }
      }
    }
  }
};

import * as SecureStore from 'expo-secure-store';
import { storageKeys } from '../../config/storageKeys';

export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(storageKeys.accessToken);
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(storageKeys.accessToken, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(storageKeys.refreshToken);
  },

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(storageKeys.refreshToken, token);
  },

  async clearAccessToken(): Promise<void> {
    await SecureStore.deleteItemAsync(storageKeys.accessToken);
  },

  async clearRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(storageKeys.refreshToken);
  },

  async clearSession(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(storageKeys.accessToken),
      SecureStore.deleteItemAsync(storageKeys.refreshToken)
    ]);
  }
};

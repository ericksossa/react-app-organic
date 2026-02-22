jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

import * as SecureStore from 'expo-secure-store';
import { secureStorage } from './secureStorage';
import { storageKeys } from '../../config/storageKeys';

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets and sets access token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('token-1');

    await expect(secureStorage.getAccessToken()).resolves.toBe('token-1');
    await secureStorage.setAccessToken('token-2');

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(storageKeys.accessToken);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(storageKeys.accessToken, 'token-2');
  });

  it('clears full session', async () => {
    await secureStorage.clearSession();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(storageKeys.accessToken);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(storageKeys.refreshToken);
  });
});

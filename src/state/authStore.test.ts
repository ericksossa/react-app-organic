jest.mock('../services/auth/authService', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  me: jest.fn()
}));

jest.mock('../services/storage/secureStorage', () => ({
  secureStorage: {
    getAccessToken: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    clearSession: jest.fn()
  }
}));

jest.mock('../services/api/addressesApi', () => ({
  listMyAddresses: jest.fn()
}));

jest.mock('../services/storage/kvStorage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

import { storageKeys } from '../config/storageKeys';
import { listMyAddresses } from '../services/api/addressesApi';
import { login as loginRequest, logout as logoutRequest, me } from '../services/auth/authService';
import { removeItem, setItem } from '../services/storage/kvStorage';
import { secureStorage } from '../services/storage/secureStorage';
import { useAuthStore } from './authStore';

const mockedMe = me as jest.Mock;
const mockedLogin = loginRequest as jest.Mock;
const mockedLogout = logoutRequest as jest.Mock;
const mockedListMyAddresses = listMyAddresses as jest.Mock;
const mockedSetItem = setItem as jest.Mock;
const mockedRemoveItem = removeItem as jest.Mock;
const mockedSecureStorage = secureStorage as unknown as {
  getAccessToken: jest.Mock;
  setAccessToken: jest.Mock;
  setRefreshToken: jest.Mock;
  clearSession: jest.Mock;
};

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      isBootstrapped: false,
      isAuthenticated: false,
      requiresAddressOnboarding: false,
      accessToken: null,
      user: null,
      error: null
    });
  });

  it('bootstrap clears auth when token is missing', async () => {
    mockedSecureStorage.getAccessToken.mockResolvedValueOnce(null);

    await useAuthStore.getState().bootstrap();

    expect(mockedRemoveItem).toHaveBeenCalledWith(storageKeys.userId);
    expect(useAuthStore.getState()).toMatchObject({
      isBootstrapped: true,
      isAuthenticated: false,
      accessToken: null
    });
  });

  it('bootstrap restores session and onboarding requirement', async () => {
    mockedSecureStorage.getAccessToken.mockResolvedValueOnce('token-1');
    mockedMe.mockResolvedValueOnce({ id: 'u1', email: 'u@e.com' });
    mockedListMyAddresses.mockResolvedValueOnce([]);

    await useAuthStore.getState().bootstrap();

    expect(mockedSetItem).toHaveBeenCalledWith(storageKeys.userId, 'u1');
    expect(useAuthStore.getState()).toMatchObject({
      isBootstrapped: true,
      isAuthenticated: true,
      requiresAddressOnboarding: true,
      accessToken: 'token-1'
    });
  });

  it('login stores tokens and user', async () => {
    mockedLogin.mockResolvedValueOnce({ accessToken: 'jwt-1', refreshToken: 'r-1' });
    mockedMe.mockResolvedValueOnce({ id: 'u9', email: 'x@y.com' });
    mockedListMyAddresses.mockResolvedValueOnce([{ id: 'a1' }]);

    await useAuthStore.getState().login('x@y.com', '123');

    expect(mockedSecureStorage.setAccessToken).toHaveBeenCalledWith('jwt-1');
    expect(mockedSecureStorage.setRefreshToken).toHaveBeenCalledWith('r-1');
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, requiresAddressOnboarding: false });
  });

  it('login sets friendly error and rethrows', async () => {
    mockedLogin.mockRejectedValueOnce(new Error('invalid_credentials'));

    await expect(useAuthStore.getState().login('x@y.com', 'bad')).rejects.toThrow('invalid_credentials');
    expect(useAuthStore.getState().error).toBe('invalid_credentials');
  });

  it('logout performs local cleanup even when API logout fails', async () => {
    mockedLogout.mockRejectedValueOnce(new Error('network'));

    await useAuthStore.getState().logout();

    expect(mockedSecureStorage.clearSession).toHaveBeenCalled();
    expect(mockedRemoveItem).toHaveBeenCalledWith(storageKeys.userId);
    expect(mockedRemoveItem).toHaveBeenCalledWith(storageKeys.selectedZoneId);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

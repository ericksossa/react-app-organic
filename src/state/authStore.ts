import { create } from 'zustand';
import { login as loginRequest, logout as logoutRequest, me } from '../services/auth/authService';
import { secureStorage } from '../services/storage/secureStorage';
import { listMyAddresses } from '../services/api/addressesApi';
import { removeItem, setItem } from '../services/storage/kvStorage';
import { storageKeys } from '../config/storageKeys';
import { getErrorMessage } from '../shared/errors/apiError';

type AuthState = {
  isBootstrapped: boolean;
  isAuthenticated: boolean;
  requiresAddressOnboarding: boolean;
  accessToken: string | null;
  user: { id: string; email: string; fullName?: string } | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeAddressOnboarding: () => void;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timeoutId));
  });
}

async function resolveAddressOnboardingRequirement(): Promise<boolean> {
  try {
    const addresses = await listMyAddresses();
    return addresses.length === 0;
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  isBootstrapped: false,
  isAuthenticated: false,
  requiresAddressOnboarding: false,
  accessToken: null,
  user: null,
  error: null,

  bootstrap: async () => {
    try {
      const token = await withTimeout(secureStorage.getAccessToken(), 4000);
      if (!token) {
        await removeItem(storageKeys.userId);
        set({
          isAuthenticated: false,
          requiresAddressOnboarding: false,
          accessToken: null,
          user: null
        });
        return;
      }

      const user = await withTimeout(me(), 12000);
      if (!user) {
        await Promise.all([secureStorage.clearSession(), removeItem(storageKeys.userId)]);
        set({
          isAuthenticated: false,
          requiresAddressOnboarding: false,
          accessToken: null,
          user: null
        });
        return;
      }

      await setItem(storageKeys.userId, user.id);
      const requiresAddressOnboarding = await withTimeout(resolveAddressOnboardingRequirement(), 8000);

      set({
        isAuthenticated: true,
        requiresAddressOnboarding,
        accessToken: token,
        user,
        error: null
      });
    } catch {
      set({
        isAuthenticated: false,
        requiresAddressOnboarding: false,
        accessToken: null,
        user: null,
        error: null
      });
    } finally {
      set({ isBootstrapped: true });
    }
  },

  login: async (email, password) => {
    try {
      const tokens = await loginRequest({ email, password });
      await secureStorage.setAccessToken(tokens.accessToken);
      if (tokens.refreshToken) {
        await secureStorage.setRefreshToken(tokens.refreshToken);
      }

      const user = await me();
      if (!user) {
        throw new Error('auth_user_not_found');
      }

      await setItem(storageKeys.userId, user.id);
      const requiresAddressOnboarding = await resolveAddressOnboardingRequirement();

      set({
        isBootstrapped: true,
        isAuthenticated: true,
        requiresAddressOnboarding,
        accessToken: tokens.accessToken,
        user,
        error: null
      });
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudo iniciar sesion.') });
      throw error;
    }
  },

  logout: async () => {
    try {
      await logoutRequest();
    } catch {
      // noop: local cleanup still required
    }

    await Promise.all([
      secureStorage.clearSession(),
      removeItem(storageKeys.userId),
      removeItem(storageKeys.selectedZoneId)
    ]);

    set({
      isAuthenticated: false,
      requiresAddressOnboarding: false,
      accessToken: null,
      user: null,
      error: null
    });
  },

  completeAddressOnboarding: () => {
    set({ requiresAddressOnboarding: false });
  }
}));

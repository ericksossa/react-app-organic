import { env } from '../../config/env';
import { ApiError, ApiRequestConfig } from './types';
import { secureStorage } from '../storage/secureStorage';
import { getItem } from '../storage/kvStorage';
import { storageKeys } from '../../config/storageKeys';

const AUTH_EXCLUDED_PATHS = new Set(['auth/login', 'auth/register', 'auth/refresh', 'auth/logout']);
let refreshInFlight: Promise<boolean> | null = null;
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

async function toApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  let details: unknown;
  try {
    details = await response.json();
  } catch {
    details = undefined;
  }

  return {
    status: response.status,
    message: (details as { message?: string })?.message ?? fallbackMessage,
    details
  };
}

async function withAuthHeader(headers: Record<string, string> = {}) {
  const token = await secureStorage.getAccessToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`
  };
}

function normalizePath(path: string): string {
  return path.replace(/^\//, '').split('?')[0] ?? '';
}

function shouldAttachUserId(path: string): boolean {
  return (
    path.startsWith('cart') ||
    path.startsWith('orders') ||
    path.startsWith('payments') ||
    path.startsWith('me/addresses')
  );
}

async function withUserHeader(path: string, headers: Record<string, string>) {
  if (!shouldAttachUserId(path)) return headers;
  if (headers['x-user-id']) return headers;

  const userId = await getItem<string>(storageKeys.userId);
  if (!userId) return headers;

  return { ...headers, 'x-user-id': userId };
}

function parseAuthTokens(payload: unknown): { accessToken?: string; refreshToken?: string } {
  const source = payload as
    | {
        accessToken?: string;
        refreshToken?: string;
        token?: string;
        data?: { accessToken?: string; refreshToken?: string; token?: string };
      }
    | undefined;

  return {
    accessToken: source?.accessToken ?? source?.token ?? source?.data?.accessToken ?? source?.data?.token,
    refreshToken: source?.refreshToken ?? source?.data?.refreshToken
  };
}

async function runRefreshTokenFlow(): Promise<boolean> {
  const refreshToken = await secureStorage.getRefreshToken();
  const refreshPath = 'auth/refresh';
  const refreshUrl = `${env.apiBaseUrl.replace(/\/$/, '')}/${refreshPath}`;

  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(refreshToken ? { refreshToken } : {})
  });

  if (!response.ok) {
    await secureStorage.clearSession();
    return false;
  }

  const payload = response.status === 204 ? null : await response.json();
  const tokens = parseAuthTokens(payload);
  if (!tokens.accessToken) {
    await secureStorage.clearSession();
    return false;
  }

  await secureStorage.setAccessToken(tokens.accessToken);
  if (tokens.refreshToken) {
    await secureStorage.setRefreshToken(tokens.refreshToken);
  }

  return true;
}

async function refreshTokenWithLock(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = runRefreshTokenFlow().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function makeRequest(path: string, config: ApiRequestConfig = {}): Promise<Response> {
  const url = `${env.apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const normalizedPath = normalizePath(path);

  const authHeaders = await withAuthHeader({
    'Content-Type': 'application/json',
    ...(config.headers ?? {})
  });
  const headers = await withUserHeader(normalizedPath, authHeaders);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  if (config.signal) {
    if (config.signal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      config.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    return await fetch(url, {
      method: config.method ?? 'GET',
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T>(path: string, config: ApiRequestConfig = {}): Promise<T> {
  const normalizedPath = normalizePath(path);
  let response = await makeRequest(path, config);

  const canTryRefresh =
    response.status === 401 && !config.skipAuthRefresh && !AUTH_EXCLUDED_PATHS.has(normalizedPath);

  if (canTryRefresh) {
    const refreshed = await refreshTokenWithLock();
    if (refreshed) {
      response = await makeRequest(path, config);
    }
  }

  if (!response.ok) {
    throw await toApiError(response, 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

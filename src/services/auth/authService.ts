import { apiRequest } from '../api/client';

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  };
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

function extractTokens(response: LoginResponse): AuthTokens {
  const accessToken =
    response.accessToken ?? response.token ?? response.data?.accessToken ?? response.data?.token;
  const refreshToken = response.refreshToken ?? response.data?.refreshToken;

  if (!accessToken) {
    throw new Error('auth_invalid_response');
  }

  return { accessToken, refreshToken };
}

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const response = await apiRequest<LoginResponse>('auth/login', {
    method: 'POST',
    body: payload
  });

  return extractTokens(response);
}

export async function register(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<void> {
  await apiRequest<void>('auth/register', {
    method: 'POST',
    body: payload
  });
}

export async function me(): Promise<{ id: string; email: string; fullName?: string } | null> {
  try {
    return await apiRequest<{ id: string; email: string; fullName?: string }>('auth/me');
  } catch {
    return null;
  }
}

type RefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  };
};

export async function refresh(payload?: { refreshToken?: string }): Promise<AuthTokens> {
  const response = await apiRequest<RefreshResponse>('auth/refresh', {
    method: 'POST',
    body: payload ?? {},
    skipAuthRefresh: true
  });

  return extractTokens(response);
}

export async function logout(): Promise<void> {
  await apiRequest<void>('auth/logout', {
    method: 'POST',
    skipAuthRefresh: true
  });
}

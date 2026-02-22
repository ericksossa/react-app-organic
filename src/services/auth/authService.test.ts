jest.mock('../api/client', () => ({
  apiRequest: jest.fn()
}));

import { apiRequest } from '../api/client';
import { login, logout, me, refresh, register } from './authService';

const mockedApiRequest = apiRequest as jest.Mock;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts tokens from login response', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { token: 'jwt-1', refreshToken: 'r-1' } });

    await expect(login({ email: 'a@a.com', password: '1234' })).resolves.toEqual({
      accessToken: 'jwt-1',
      refreshToken: 'r-1'
    });
  });

  it('throws when login response has no token', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: {} });

    await expect(login({ email: 'a@a.com', password: '1234' })).rejects.toThrow('auth_invalid_response');
  });

  it('register calls auth/register endpoint', async () => {
    mockedApiRequest.mockResolvedValueOnce(undefined);

    await register({ fullName: 'User', email: 'u@e.com', password: 'x' });

    expect(mockedApiRequest).toHaveBeenCalledWith('auth/register', {
      method: 'POST',
      body: { fullName: 'User', email: 'u@e.com', password: 'x' }
    });
  });

  it('returns null on me() failure', async () => {
    mockedApiRequest.mockRejectedValueOnce(new Error('401'));

    await expect(me()).resolves.toBeNull();
  });

  it('refresh uses skipAuthRefresh and extracts tokens', async () => {
    mockedApiRequest.mockResolvedValueOnce({ accessToken: 'jwt-2' });

    await expect(refresh({ refreshToken: 'r-1' })).resolves.toEqual({ accessToken: 'jwt-2', refreshToken: undefined });
    expect(mockedApiRequest).toHaveBeenCalledWith('auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'r-1' },
      skipAuthRefresh: true
    });
  });

  it('logout calls auth/logout with skipAuthRefresh', async () => {
    mockedApiRequest.mockResolvedValueOnce(undefined);
    await logout();

    expect(mockedApiRequest).toHaveBeenCalledWith('auth/logout', {
      method: 'POST',
      skipAuthRefresh: true
    });
  });
});

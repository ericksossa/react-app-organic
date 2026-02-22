const mockSecureStorage = {
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  setAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
  clearSession: jest.fn()
};

const mockGetItem = jest.fn();

type MockResponse = {
  ok: boolean;
  status: number;
  json: jest.Mock;
};

function response(status: number, body?: unknown): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body)
  };
}

describe('apiRequest', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    (global.fetch as unknown as jest.Mock) = jest.fn();

    jest.doMock('../storage/secureStorage', () => ({ secureStorage: mockSecureStorage }));
    jest.doMock('../storage/kvStorage', () => ({ getItem: mockGetItem }));
  });

  it('attaches auth and user headers for cart endpoints', async () => {
    mockSecureStorage.getAccessToken.mockResolvedValueOnce('token-1');
    mockGetItem.mockResolvedValueOnce('user-1');
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(200, { ok: true }));

    const { apiRequest } = await import('./client');

    await apiRequest('cart/active');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer token-1');
    expect(options.headers['x-user-id']).toBe('user-1');
  });

  it('does not attach user header for non-user-scoped endpoints', async () => {
    mockSecureStorage.getAccessToken.mockResolvedValueOnce('token-1');
    mockGetItem.mockResolvedValueOnce('user-1');
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(200, []));

    const { apiRequest } = await import('./client');

    await apiRequest('categories');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['x-user-id']).toBeUndefined();
  });

  it('refreshes token and retries once on 401', async () => {
    mockSecureStorage.getAccessToken.mockResolvedValueOnce('old-token').mockResolvedValueOnce('new-token');
    mockSecureStorage.getRefreshToken.mockResolvedValueOnce('refresh-1');
    mockGetItem.mockResolvedValue('user-1');

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(response(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(response(200, { accessToken: 'new-token', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(response(200, { id: 'ok' }));

    const { apiRequest } = await import('./client');

    await expect(apiRequest('orders')).resolves.toEqual({ id: 'ok' });
    expect(mockSecureStorage.setAccessToken).toHaveBeenCalledWith('new-token');
    expect(mockSecureStorage.setRefreshToken).toHaveBeenCalledWith('refresh-2');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(3);
  });

  it('does not refresh for excluded auth paths', async () => {
    mockSecureStorage.getAccessToken.mockResolvedValueOnce('old-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(401, { message: 'bad credentials' }));

    const { apiRequest } = await import('./client');

    await expect(apiRequest('auth/login', { method: 'POST', body: { email: 'a', password: 'b' } })).rejects.toMatchObject({
      status: 401,
      message: 'bad credentials'
    });

    expect(mockSecureStorage.getRefreshToken).not.toHaveBeenCalled();
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });

  it('returns undefined for 204 responses', async () => {
    mockSecureStorage.getAccessToken.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(204));

    const { apiRequest } = await import('./client');

    await expect(apiRequest('cart/zone', { method: 'PUT', body: { zoneId: 'z1' } })).resolves.toBeUndefined();
  });

  it('throws parsed api error on non-ok response', async () => {
    mockSecureStorage.getAccessToken.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce(response(500, { message: 'server failed' }));

    const { apiRequest } = await import('./client');

    await expect(apiRequest('products')).rejects.toMatchObject({ status: 500, message: 'server failed' });
  });
});

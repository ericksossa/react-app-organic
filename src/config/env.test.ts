describe('env', () => {
  const original = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_BASE_URL = original;
  });

  it('uses EXPO_PUBLIC_API_BASE_URL when provided', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/v1';
    const { env } = await import('./env');

    expect(env.apiBaseUrl).toBe('https://api.example.com/v1');
  });

  it('falls back to localhost base url', async () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { env } = await import('./env');

    expect(env.apiBaseUrl).toBe('http://localhost:3000/green-cart/v1');
  });
});

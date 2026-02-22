describe('env', () => {
  const original = process.env.EXPO_PUBLIC_API_BASE_URL;
  const loadEnv = () => {
    let mod: typeof import('./env');
    jest.isolateModules(() => {
      mod = require('./env');
    });
    return mod!;
  };

  afterEach(() => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_BASE_URL = original;
  });

  it('uses EXPO_PUBLIC_API_BASE_URL when provided', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/v1';
    const { env } = loadEnv();

    expect(env.apiBaseUrl).toBe('https://api.example.com/v1');
  });

  it('falls back to localhost base url', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { env } = loadEnv();

    expect(env.apiBaseUrl).toBe('http://localhost:3000/green-cart/v1');
  });
});

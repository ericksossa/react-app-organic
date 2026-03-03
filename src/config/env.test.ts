describe('env', () => {
  const original = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalFlags = {
    tabHome: process.env.EXPO_PUBLIC_FF_TAB_HOME,
    tabVoice: process.env.EXPO_PUBLIC_FF_TAB_VOICE
  };
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
    process.env.EXPO_PUBLIC_FF_TAB_HOME = originalFlags.tabHome;
    process.env.EXPO_PUBLIC_FF_TAB_VOICE = originalFlags.tabVoice;
  });

  it('uses EXPO_PUBLIC_API_BASE_URL when provided', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com/v1';
    const { env } = loadEnv();

    expect(env.apiBaseUrl).toBe('https://api.example.com/v1');
  });

  it('falls back to default base url', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const { env } = loadEnv();

    expect(env.apiBaseUrl).toBe('https://greencart-api-1029864321739.us-central1.run.app/green-cart/v1');
  });

  it('parses feature flags from env', () => {
    process.env.EXPO_PUBLIC_FF_TAB_HOME = '0';
    process.env.EXPO_PUBLIC_FF_TAB_VOICE = 'false';

    const { env } = loadEnv();

    expect(env.featureFlags.tabHome).toBe(false);
    expect(env.featureFlags.tabVoice).toBe(false);
  });
});

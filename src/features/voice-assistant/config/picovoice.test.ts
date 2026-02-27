describe('getPicovoiceAccessKey', () => {
  const originalPublicKey = process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    if (originalPublicKey === undefined) {
      delete process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY;
    } else {
      process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY = originalPublicKey;
    }
  });

  it('prefers access key from Expo extra config', () => {
    process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY = 'public-fallback-key';

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            picovoiceAccessKey: 'secure-extra-key'
          }
        }
      }
    }));

    const { getPicovoiceAccessKey } = require('./picovoice');
    expect(getPicovoiceAccessKey()).toBe('secure-extra-key');
  });

  it('uses EXPO_PUBLIC fallback when Expo extra is missing', () => {
    process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY = 'public-only-key';

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {}
        }
      }
    }));

    const { getPicovoiceAccessKey } = require('./picovoice');
    expect(getPicovoiceAccessKey()).toBe('public-only-key');
  });
});


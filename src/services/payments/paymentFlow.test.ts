import { Linking, Platform } from 'react-native';
import { launchPaymentRedirect } from './paymentFlow';

describe('paymentFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails when redirect url is missing', async () => {
    await expect(launchPaymentRedirect({ status: 'pending' })).resolves.toEqual({
      opened: false,
      mode: 'web',
      reason: 'missing_redirect_url'
    });
  });

  it('fails when url cannot be opened', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      launchPaymentRedirect({ status: 'pending', redirectUrl: 'https://pay.example.com', redirectMode: 'in_app' })
    ).resolves.toEqual({
      opened: false,
      mode: 'in_app',
      reason: 'cannot_open_url'
    });
  });

  it('opens url and normalizes mode for web platform', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(true);
    (Linking.openURL as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(
      launchPaymentRedirect({ status: 'ok', redirectUrl: 'https://pay.example.com', redirectMode: 'in_app' })
    ).resolves.toEqual({ opened: true, mode: 'web' });
  });
});

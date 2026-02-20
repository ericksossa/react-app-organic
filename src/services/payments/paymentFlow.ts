import { Linking, Platform } from 'react-native';
import { PaymentInitResult } from '../api/paymentsApi';

export type PaymentLaunchResult = {
  opened: boolean;
  mode: 'web' | 'in_app';
  reason?: string;
};

// Expo Go / bare RN baseline: both redirect modes use URL launch. "in_app" is treated as intent.
export async function launchPaymentRedirect(payload: PaymentInitResult): Promise<PaymentLaunchResult> {
  const redirectUrl = payload.redirectUrl?.trim();
  if (!redirectUrl) {
    return { opened: false, mode: payload.redirectMode ?? 'web', reason: 'missing_redirect_url' };
  }

  const mode = payload.redirectMode ?? 'web';
  const canOpen = await Linking.canOpenURL(redirectUrl);
  if (!canOpen) {
    return { opened: false, mode, reason: 'cannot_open_url' };
  }

  await Linking.openURL(redirectUrl);
  return {
    opened: true,
    mode: mode === 'in_app' && Platform.OS !== 'web' ? 'in_app' : 'web'
  };
}

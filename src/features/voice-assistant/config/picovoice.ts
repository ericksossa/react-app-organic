import Constants from 'expo-constants';

type ExpoExtra = {
  picovoiceAccessKey?: string;
};

const missingKeyWarning = {
  shown: false
};

function readExpoExtraAccessKey(): string {
  const extra = ((Constants.expoConfig?.extra ??
    (Constants as any).manifest2?.extra ??
    (Constants as any).manifest?.extra ??
    {}) as ExpoExtra) ?? { picovoiceAccessKey: '' };

  return (extra.picovoiceAccessKey ?? '').trim();
}

export function getPicovoiceAccessKey(): string {
  const accessKey = readExpoExtraAccessKey() || (process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY ?? '').trim();

  if (!accessKey && __DEV__ && !missingKeyWarning.shown) {
    missingKeyWarning.shown = true;
    console.warn(
      '[voice] Missing PicoVoice access key. Configure PICOVOICE_ACCESS_KEY (preferred) or EXPO_PUBLIC_PICOVOICE_ACCESS_KEY for local development.'
    );
  }

  return accessKey;
}


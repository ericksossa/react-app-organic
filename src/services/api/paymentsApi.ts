import { apiRequest } from './client';

export type PaymentProvider = 'wompi' | 'mercadopago';

export type InitPaymentDto = {
  provider: PaymentProvider;
  providerReference?: string;
};

export type PaymentRedirectMode = 'web' | 'in_app';

export type PaymentInitResult = {
  status: string;
  provider?: PaymentProvider;
  providerReference?: string;
  paymentId?: string;
  message?: string;
  redirectUrl?: string;
  redirectMode?: PaymentRedirectMode;
};

export async function initPayment(orderId: string, payload: InitPaymentDto): Promise<PaymentInitResult> {
  const response = await apiRequest<unknown>(`payments/${orderId}/init`, {
    method: 'POST',
    body: payload
  });

  return normalizeInitResponse(response, payload.provider);
}

function normalizeInitResponse(response: unknown, fallbackProvider: PaymentProvider): PaymentInitResult {
  const raw = unwrap(response);
  if (!raw || typeof raw !== 'object') {
    return { status: 'pending', provider: fallbackProvider };
  }

  const data = raw as Record<string, unknown>;
  const redirectUrl = readFirstString(
    data,
    ['redirectUrl', 'checkoutUrl', 'paymentUrl', 'url'],
    [
      ['redirect', 'url'],
      ['checkout', 'url'],
      ['payment', 'url'],
      ['links', 'checkout'],
      ['links', 'payment']
    ]
  );

  const rawMode = readFirstString(data, ['redirectMode', 'mode', 'openMode', 'channel']);
  return {
    status: asString(data.status) ?? asString(data.state) ?? 'pending',
    provider: asProvider(data.provider) ?? fallbackProvider,
    providerReference:
      asString(data.providerReference) ?? asString(data.reference) ?? asString(data.externalReference),
    paymentId: asString(data.paymentId) ?? asString(data.id),
    message: asString(data.message) ?? asString(data.description),
    redirectUrl,
    redirectMode: asRedirectMode(rawMode)
  };
}

function unwrap(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const data = (raw as Record<string, unknown>).data;
  return data ?? raw;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const next = value.trim();
  return next ? next : undefined;
}

function asProvider(value: unknown): PaymentProvider | undefined {
  if (value !== 'wompi' && value !== 'mercadopago') return undefined;
  return value;
}

function asRedirectMode(value: string | undefined): PaymentRedirectMode | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes('in_app') || normalized.includes('in-app') || normalized.includes('inapp')) {
    return 'in_app';
  }
  if (normalized.includes('web') || normalized.includes('external')) {
    return 'web';
  }
  return undefined;
}

function readFirstString(
  data: Record<string, unknown>,
  directKeys: string[],
  nestedPaths: string[][] = []
): string | undefined {
  for (const key of directKeys) {
    const value = asString(data[key]);
    if (value) return value;
  }

  for (const path of nestedPaths) {
    const value = asString(readPath(data, path));
    if (value) return value;
  }

  return undefined;
}

function readPath(data: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = data;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

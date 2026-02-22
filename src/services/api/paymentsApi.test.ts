jest.mock('./client', () => ({ apiRequest: jest.fn() }));

import { apiRequest } from './client';
import { initPayment } from './paymentsApi';

const mockedApiRequest = apiRequest as jest.Mock;

describe('paymentsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes provider response', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        state: 'created',
        provider: 'wompi',
        externalReference: 'ext-1',
        links: { checkout: 'https://pay.example.com/checkout' },
        channel: 'EXTERNAL_WEB'
      }
    });

    const result = await initPayment('order-1', { provider: 'mercadopago' });

    expect(result).toMatchObject({
      status: 'created',
      provider: 'wompi',
      providerReference: 'ext-1',
      redirectUrl: 'https://pay.example.com/checkout',
      redirectMode: 'web'
    });
  });

  it('falls back to pending with fallback provider for malformed payload', async () => {
    mockedApiRequest.mockResolvedValueOnce(null);

    await expect(initPayment('order-2', { provider: 'wompi' })).resolves.toEqual({
      status: 'pending',
      provider: 'wompi'
    });
  });
});

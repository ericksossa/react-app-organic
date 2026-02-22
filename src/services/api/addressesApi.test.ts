jest.mock('./client', () => ({ apiRequest: jest.fn() }));

import { apiRequest } from './client';
import { createMyAddress, listMyAddresses } from './addressesApi';

const mockedApiRequest = apiRequest as jest.Mock;

describe('addressesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes list responses', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: [{ id: 'a1' }] });

    await expect(listMyAddresses()).resolves.toEqual([{ id: 'a1' }]);
  });

  it('creates address with POST payload', async () => {
    const address = { id: 'a2', line1: 'street 1' };
    mockedApiRequest.mockResolvedValueOnce(address);

    await expect(createMyAddress({ label: 'home' } as any)).resolves.toEqual(address);
    expect(mockedApiRequest).toHaveBeenCalledWith('me/addresses', {
      method: 'POST',
      body: { label: 'home' }
    });
  });
});

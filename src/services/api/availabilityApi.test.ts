jest.mock('./client', () => ({ apiRequest: jest.fn() }));

import { apiRequest } from './client';
import { listDeliveryZones } from './availabilityApi';

const mockedApiRequest = apiRequest as jest.Mock;

describe('availabilityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns array payload', async () => {
    mockedApiRequest.mockResolvedValueOnce([{ id: 'z1', city: 'Bogota', name: 'Norte' }]);

    await expect(listDeliveryZones()).resolves.toEqual([{ id: 'z1', city: 'Bogota', name: 'Norte' }]);
  });

  it('returns envelope payload and encodes query', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: [{ id: 'z2', city: 'Medellin', name: 'Centro' }] });

    await expect(listDeliveryZones('Medellín')).resolves.toHaveLength(1);
    expect(mockedApiRequest).toHaveBeenCalledWith('delivery-zones?city=Medell%C3%ADn');
  });
});

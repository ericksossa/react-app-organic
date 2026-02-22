jest.mock('./client', () => ({ apiRequest: jest.fn() }));

import { apiRequest } from './client';
import { createOrder, getOrderDetail, listOrders } from './ordersApi';

const mockedApiRequest = apiRequest as jest.Mock;

describe('ordersApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates order and normalizes response', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { id: 'o1', status: 'created', items: [] } });

    await expect(createOrder({ addressId: 'a1', deliveryMode: 'pickup' })).resolves.toMatchObject({ id: 'o1' });
  });

  it('lists orders with normalized pagination', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        page: '2',
        limit: '1',
        total: '1',
        data: [{ id: 'o2', status: 'paid', items: [{ name: 'x', qty: '1', price: '200' }] }]
      }
    });

    const result = await listOrders(2, 1);

    expect(result).toMatchObject({ page: 2, limit: 1, total: 1 });
    expect(result.data[0].items[0]).toMatchObject({ name: 'x', qty: 1, unitPrice: 200 });
  });

  it('returns null for missing order id', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { status: 'x' } });

    await expect(getOrderDetail('o-x')).resolves.toBeNull();
  });
});

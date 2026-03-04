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

  it('supports root pagination shape with data array (green-cart orders)', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      page: 1,
      limit: 20,
      total: 1,
      data: [
        {
          id: 'o-root-1',
          orderNumber: 'ORD-20260304-71557',
          status: 'created',
          itemCount: 1,
          totals: {
            subtotal: '8100.00',
            deliveryFee: '5000.00',
            discountTotal: '0.00',
            total: '13100.00'
          },
          createdAt: '2026-03-04T01:16:01.041Z'
        }
      ]
    });

    const result = await listOrders(1, 20);

    expect(result).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(result.data[0]).toMatchObject({
      id: 'o-root-1',
      status: 'created',
      subtotal: 8100,
      total: 13100,
      createdAt: '2026-03-04T01:16:01.041Z'
    });
  });

  it('supports nested response shape with orders array', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        data: {
          meta: { page: 1, limit: 20, total: 1 },
          orders: [
            {
              order_id: 'o3',
              orderStatus: 'created',
              amountTotal: '9800.00',
              creationDate: '2026-03-03T10:00:00.000Z',
              orderItems: [{ productName: 'Mandarina', quantity: '2', price: '4900' }]
            }
          ]
        }
      }
    });

    const result = await listOrders(1, 20);

    expect(result).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(result.data[0]).toMatchObject({ id: 'o3', status: 'created', total: 9800 });
    expect(result.data[0].items[0]).toMatchObject({ name: 'Mandarina', qty: 2, unitPrice: 4900 });
  });

  it('returns null for missing order id', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { status: 'x' } });

    await expect(getOrderDetail('o-x')).resolves.toBeNull();
  });
});

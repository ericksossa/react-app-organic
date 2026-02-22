jest.mock('./client', () => ({ apiRequest: jest.fn() }));

import { apiRequest } from './client';
import { addCartItem, getActiveCart, removeCartItem, setCartZone, updateCartItemQty } from './cartApi';

const mockedApiRequest = apiRequest as jest.Mock;

describe('cartApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes active cart with envelope', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        id: 'c1',
        userId: 'u1',
        zoneId: 'z1',
        status: 'active',
        totals: { subtotal: '1000', total: '1200' },
        items: [{ id: 'i1', productId: 'p1', variantId: 'v1', quantity: '2', unitPrice: '500', name: 'Tomate' }]
      }
    });

    const snapshot = await getActiveCart();

    expect(snapshot.totals.total).toBe(1200);
    expect(snapshot.items[0]).toMatchObject({ id: 'i1', qty: 2, unitPrice: 500, name: 'Tomate' });
  });

  it('calls mutation endpoints with expected payloads', async () => {
    mockedApiRequest.mockResolvedValue(undefined);

    await setCartZone('z1');
    await addCartItem({ variantId: 'v1', qty: 3, note: 'ripe' });
    await updateCartItemQty('i1', 4);
    await removeCartItem('i1');

    expect(mockedApiRequest).toHaveBeenCalledWith('cart/zone', { method: 'PUT', body: { zoneId: 'z1' } });
    expect(mockedApiRequest).toHaveBeenCalledWith('cart/items', {
      method: 'POST',
      body: { variantId: 'v1', qty: 3, note: 'ripe' }
    });
    expect(mockedApiRequest).toHaveBeenCalledWith('cart/items/i1', { method: 'PATCH', body: { qty: 4 } });
    expect(mockedApiRequest).toHaveBeenCalledWith('cart/items/i1', { method: 'DELETE' });
  });
});

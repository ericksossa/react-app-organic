jest.mock('../services/api/cartApi', () => ({
  addCartItem: jest.fn(),
  getActiveCart: jest.fn(),
  removeCartItem: jest.fn(),
  setCartZone: jest.fn(),
  updateCartItemQty: jest.fn()
}));

const availabilityState = { selectedZoneId: null as string | null };

jest.mock('./availabilityStore', () => ({
  useAvailabilityStore: {
    getState: () => availabilityState
  }
}));

import { addCartItem, getActiveCart, removeCartItem, setCartZone, updateCartItemQty } from '../services/api/cartApi';
import { useCartStore } from './cartStore';

const mockedGetActiveCart = getActiveCart as jest.Mock;
const mockedSetCartZone = setCartZone as jest.Mock;
const mockedAddCartItem = addCartItem as jest.Mock;
const mockedRemoveCartItem = removeCartItem as jest.Mock;
const mockedUpdateCartItemQty = updateCartItemQty as jest.Mock;

const snapshot = {
  id: 'c1',
  userId: 'u1',
  zoneId: 'z1',
  status: 'active',
  totals: { subtotal: 1000, total: 1200 },
  items: []
};

describe('cartStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    availabilityState.selectedZoneId = null;
    useCartStore.setState({ snapshot: null, loading: false, error: null });
  });

  it('loads cart snapshot', async () => {
    mockedGetActiveCart.mockResolvedValueOnce(snapshot);

    await useCartStore.getState().load();

    expect(useCartStore.getState().snapshot).toEqual(snapshot);
    expect(useCartStore.getState().loading).toBe(false);
  });

  it('syncs cart zone when selected zone differs', async () => {
    availabilityState.selectedZoneId = 'z2';
    useCartStore.setState({ snapshot });
    mockedSetCartZone.mockResolvedValueOnce(undefined);
    mockedGetActiveCart.mockResolvedValueOnce({ ...snapshot, zoneId: 'z2' });

    await useCartStore.getState().ensureZoneSynced();

    expect(mockedSetCartZone).toHaveBeenCalledWith('z2');
    expect(useCartStore.getState().snapshot?.zoneId).toBe('z2');
  });

  it('throws stable error code when add item fails', async () => {
    mockedAddCartItem.mockRejectedValueOnce(new Error('boom'));

    await expect(useCartStore.getState().addItem({ variantId: 'v1', qty: 1 })).rejects.toThrow('add_item_failed');
    expect(useCartStore.getState().error).toBe('boom');
  });

  it('removes item when qty is <= 0', async () => {
    mockedRemoveCartItem.mockResolvedValueOnce(undefined);
    mockedGetActiveCart.mockResolvedValueOnce(snapshot);

    await useCartStore.getState().updateItemQty('i1', 0);

    expect(mockedRemoveCartItem).toHaveBeenCalledWith('i1');
    expect(mockedUpdateCartItemQty).not.toHaveBeenCalled();
  });

  it('updates item qty and refreshes snapshot', async () => {
    mockedUpdateCartItemQty.mockResolvedValueOnce(undefined);
    mockedGetActiveCart.mockResolvedValueOnce(snapshot);

    await useCartStore.getState().updateItemQty('i1', 2);

    expect(mockedUpdateCartItemQty).toHaveBeenCalledWith('i1', 2);
    expect(useCartStore.getState().snapshot).toEqual(snapshot);
  });
});

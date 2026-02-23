import { create } from 'zustand';
import { CartSnapshot } from '../features/cart/types';
import { addCartItem, getActiveCart, removeCartItem, setCartZone, updateCartItemQty } from '../services/api/cartApi';
import { useAvailabilityStore } from './availabilityStore';
import { getErrorMessage } from '../shared/errors/apiError';
import { brandMicrocopy } from '../shared/copy/brand-microcopy';

type CartState = {
  snapshot: CartSnapshot | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  ensureZoneSynced: () => Promise<void>;
  addItem: (payload: { variantId: string; qty: number; note?: string }) => Promise<void>;
  updateItemQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  snapshot: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await getActiveCart();
      set({ snapshot, loading: false });
      await get().ensureZoneSynced();
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error, brandMicrocopy.errors.cartLoad) });
    }
  },

  ensureZoneSynced: async () => {
    const selectedZoneId = useAvailabilityStore.getState().selectedZoneId;
    const snapshot = get().snapshot;

    if (!selectedZoneId) return;
    if (snapshot?.zoneId === selectedZoneId) return;

    try {
      await setCartZone(selectedZoneId);
      const refreshed = await getActiveCart();
      set({ snapshot: refreshed });
    } catch (error) {
      set({ error: getErrorMessage(error, brandMicrocopy.errors.cartZoneSync) });
    }
  },

  addItem: async ({ variantId, qty, note }) => {
    try {
      await addCartItem({ variantId, qty, note });
      const refreshed = await getActiveCart();
      set({ snapshot: refreshed, error: null });
    } catch (error) {
      set({ error: getErrorMessage(error, brandMicrocopy.errors.cartAdd) });
      throw new Error('add_item_failed');
    }
  },

  updateItemQty: async (itemId, qty) => {
    try {
      if (qty <= 0) {
        await removeCartItem(itemId);
      } else {
        await updateCartItemQty(itemId, qty);
      }
      const refreshed = await getActiveCart();
      set({ snapshot: refreshed, error: null });
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudo actualizar la cantidad.') });
    }
  },

  removeItem: async (itemId) => {
    try {
      await removeCartItem(itemId);
      const refreshed = await getActiveCart();
      set({ snapshot: refreshed, error: null });
    } catch (error) {
      set({ error: getErrorMessage(error, 'No se pudo remover el item.') });
    }
  },

  clear: () => {
    set({ snapshot: null, loading: false, error: null });
  }
}));

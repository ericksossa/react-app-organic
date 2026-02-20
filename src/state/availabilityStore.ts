import { create } from 'zustand';
import { DeliveryZone } from '../features/onboarding/types';
import { storageKeys } from '../config/storageKeys';
import { getItem, removeItem, setItem } from '../services/storage/kvStorage';

type AvailabilityState = {
  selectedZoneId: string | null;
  selectedZone: Pick<DeliveryZone, 'id' | 'name' | 'city'> | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  selectZone: (zone: Pick<DeliveryZone, 'id' | 'name' | 'city'> | null) => Promise<void>;
};

export const useAvailabilityStore = create<AvailabilityState>((set) => ({
  selectedZoneId: null,
  selectedZone: null,
  isHydrated: false,

  hydrate: async () => {
    const selectedZoneId = await getItem<string>(storageKeys.selectedZoneId);
    set({
      selectedZoneId: selectedZoneId ?? null,
      isHydrated: true
    });
  },

  selectZone: async (zone) => {
    if (!zone) {
      await removeItem(storageKeys.selectedZoneId);
      set({ selectedZoneId: null, selectedZone: null });
      return;
    }

    await setItem(storageKeys.selectedZoneId, zone.id);
    set({ selectedZoneId: zone.id, selectedZone: zone });
  }
}));

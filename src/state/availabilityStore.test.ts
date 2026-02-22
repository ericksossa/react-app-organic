jest.mock('../services/storage/kvStorage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

import { storageKeys } from '../config/storageKeys';
import { getItem, removeItem, setItem } from '../services/storage/kvStorage';
import { useAvailabilityStore } from './availabilityStore';

const mockedGetItem = getItem as jest.Mock;
const mockedSetItem = setItem as jest.Mock;
const mockedRemoveItem = removeItem as jest.Mock;

describe('availabilityStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAvailabilityStore.setState({ selectedZoneId: null, selectedZone: null, isHydrated: false });
  });

  it('hydrates selected zone from storage', async () => {
    mockedGetItem.mockResolvedValueOnce('z1');

    await useAvailabilityStore.getState().hydrate();

    expect(mockedGetItem).toHaveBeenCalledWith(storageKeys.selectedZoneId);
    expect(useAvailabilityStore.getState()).toMatchObject({ selectedZoneId: 'z1', isHydrated: true });
  });

  it('selects a zone and persists it', async () => {
    await useAvailabilityStore.getState().selectZone({ id: 'z2', name: 'Norte', city: 'Bogota' });

    expect(mockedSetItem).toHaveBeenCalledWith(storageKeys.selectedZoneId, 'z2');
    expect(useAvailabilityStore.getState().selectedZoneId).toBe('z2');
  });

  it('clears selected zone and storage', async () => {
    useAvailabilityStore.setState({ selectedZoneId: 'z3', selectedZone: { id: 'z3', name: 'X', city: 'Y' } });

    await useAvailabilityStore.getState().selectZone(null);

    expect(mockedRemoveItem).toHaveBeenCalledWith(storageKeys.selectedZoneId);
    expect(useAvailabilityStore.getState()).toMatchObject({ selectedZoneId: null, selectedZone: null });
  });
});

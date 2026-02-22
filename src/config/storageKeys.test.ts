import { storageKeys } from './storageKeys';

describe('storageKeys', () => {
  it('exposes stable key names', () => {
    expect(storageKeys).toEqual({
      accessToken: 'gc_accessToken',
      refreshToken: 'gc_refreshToken',
      userId: 'gc_userId',
      selectedZoneId: 'gc_selectedZoneId',
      homeSearchMemory: 'gc_homeSearchMemory'
    });
  });
});

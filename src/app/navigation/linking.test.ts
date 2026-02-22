jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://127.0.0.1:8081/--/')
}));

import { linking } from './linking';

describe('linking config', () => {
  it('contains expected route mappings', () => {
    expect(linking.prefixes).toContain('organicapp://');
    expect(linking.config?.screens?.MainTabs?.screens?.Auth?.screens?.Login).toBe('auth/login');
    expect(linking.config?.screens?.MainTabs?.screens?.App?.screens?.CatalogTab?.screens?.ProductDetail).toBe('p/:slug');
  });
});

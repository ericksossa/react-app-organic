import { linking } from './linking';

describe('linking config', () => {
  it('contains expected route mappings', () => {
    expect(linking.prefixes).toContain('organicapp://');
    expect(linking.config?.screens?.Auth?.screens?.Login).toBe('auth/login');
    expect(linking.config?.screens?.App?.screens?.CatalogTab?.screens?.ProductDetail).toBe('p/:slug');
  });
});

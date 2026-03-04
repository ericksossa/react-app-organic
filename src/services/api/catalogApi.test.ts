jest.mock('./client', () => ({ apiRequest: jest.fn() }));

import { apiRequest } from './client';
import { getCatalog, getCategories, getProductBySlug } from './catalogApi';

const mockedApiRequest = apiRequest as jest.Mock;

describe('catalogApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds catalog query and normalizes products', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      page: 2,
      limit: 10,
      total: 1,
      data: [{ id: 'p1', name: 'Tomate', price: '1000', media: [{ url: '/img.png' }] }]
    });

    const result = await getCatalog({ page: 2, limit: 10, q: 'tom' });

    expect(mockedApiRequest).toHaveBeenCalledWith('products?page=2&limit=10&q=tom');
    expect(result.data[0]).toMatchObject({ id: 'p1', name: 'Tomate', priceFrom: 1000 });
  });

  it('normalizes categories envelope', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: [{ id: 'c1', name: 'Frutas', slug: 'frutas' }] });

    await expect(getCategories()).resolves.toEqual([{ id: 'c1', name: 'Frutas', slug: 'frutas' }]);
  });

  it('returns null for malformed product detail', async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { slug: 'x' } });

    await expect(getProductBySlug('x')).resolves.toBeNull();
  });

  it('normalizes product detail variant stock from inStock and availableQty', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        id: 'p2',
        name: 'Mandarina',
        slug: 'mandarina',
        variants: [
          {
            id: 'v1',
            name: '1kg',
            inStock: true,
            availableQty: '0'
          }
        ]
      }
    });

    const result = await getProductBySlug('mandarina');

    expect(result?.variants[0]).toMatchObject({ id: 'v1', inStock: true, availableQty: 0 });
  });

  it('treats null stock detail as unavailable', async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        id: 'p3',
        name: 'Apio',
        slug: 'apio',
        variants: [
          {
            id: 'v2',
            name: '200 gr',
            inStock: null,
            availableQty: null
          }
        ]
      }
    });

    const result = await getProductBySlug('apio');

    expect(result?.variants[0]).toMatchObject({ id: 'v2', inStock: false });
  });
});

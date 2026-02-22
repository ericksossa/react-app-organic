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
});

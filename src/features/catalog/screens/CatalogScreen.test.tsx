const mockUseTheme = jest.fn();
const mockUseAvailabilityStore = jest.fn();
const mockUseCartStore = jest.fn();
const mockUseQuery = jest.fn();
const mockGetProductBySlug = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const createIcon = (setName: string) =>
    ({ name }: { name?: string }) => React.createElement(Text, null, `${setName}:${name ?? 'icon'}`);

  return new Proxy(
    {},
    {
      get: (_target, prop) => createIcon(String(prop))
    }
  );
});

jest.mock('@tanstack/react-query', () => ({
  useQuery: (args: any) => mockUseQuery(args)
}));

jest.mock('../../../state/availabilityStore', () => ({
  useAvailabilityStore: (selector: any) => mockUseAvailabilityStore(selector)
}));

jest.mock('../../../state/cartStore', () => ({
  useCartStore: (selector: any) => mockUseCartStore(selector)
}));

jest.mock('../../../shared/theme/useTheme', () => ({
  useTheme: () => mockUseTheme()
}));

jest.mock('../../../services/api/catalogApi', () => ({
  getCatalog: jest.fn(),
  getCategories: jest.fn(),
  getProductBySlug: (...args: any[]) => mockGetProductBySlug(...args)
}));

jest.mock('../../../services/api/availabilityApi', () => ({
  listDeliveryZones: jest.fn()
}));

jest.mock('../../../services/storage/kvStorage', () => ({
  getItem: (...args: any[]) => mockGetItem(...args),
  setItem: (...args: any[]) => mockSetItem(...args)
}));

jest.mock('../../../shared/utils/media', () => ({
  toCachedImageSource: (uri?: string) => (uri ? { uri } : undefined)
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { CatalogScreen } from './CatalogScreen';

describe('CatalogScreen', () => {
  const addItem = jest.fn();
  const selectZone = jest.fn();
  const navigation = { navigate: jest.fn(), setParams: jest.fn() } as any;

  function setupStores() {
    const availabilityState = {
      selectedZoneId: 'z1',
      selectedZone: { id: 'z1', city: 'Medellín', name: 'Laureles' },
      selectZone
    };
    const cartState = { addItem };

    mockUseAvailabilityStore.mockImplementation((selector: any) => selector(availabilityState));
    mockUseCartStore.mockImplementation((selector: any) => selector(cartState));
  }

  function setupTheme() {
    mockUseTheme.mockReturnValue({
      isDark: true,
      colors: {
        bg: '#000',
        surface1: '#111',
        surface2: '#222',
        text1: '#fff',
        text2: '#aaa',
        border1: '#333',
        danger: '#f33'
      }
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    setupStores();
    setupTheme();
    mockGetItem.mockResolvedValue(null);
  });

  it('shows loading state copy for catalog query', () => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0];
      if (key === 'delivery-zones-catalog') return { data: [], isLoading: false, isError: false };
      if (key === 'catalog-categories') return { data: [], isLoading: false, isError: false };
      if (key === 'catalog') return { data: undefined, isLoading: true, isError: false };
      return { data: undefined, isLoading: false, isError: false };
    });

    const { getByText } = render(<CatalogScreen navigation={navigation} route={{ key: 'k', name: 'CatalogMain', params: {} } as any} />);

    expect(getByText('Cargando productos frescos...')).toBeTruthy();
  });

  it('shows empty state copy when no products match', () => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0];
      if (key === 'delivery-zones-catalog') return { data: [], isLoading: false, isError: false };
      if (key === 'catalog-categories') return { data: [], isLoading: false, isError: false };
      if (key === 'catalog') return { data: { data: [] }, isLoading: false, isError: false };
      return { data: undefined, isLoading: false, isError: false };
    });

    const { getByText } = render(<CatalogScreen navigation={navigation} route={{ key: 'k', name: 'CatalogMain', params: {} } as any} />);

    expect(getByText('Esta zona está descansando hoy. Algo nuevo está creciendo.')).toBeTruthy();
  });

  it('adds featured product to cart using fallback product detail variant', async () => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      const key = queryKey[0];
      if (key === 'delivery-zones-catalog') {
        return {
          data: [{ id: 'z1', city: 'Medellín', name: 'Laureles', isActive: true }],
          isLoading: false,
          isError: false
        };
      }
      if (key === 'catalog-categories') return { data: [], isLoading: false, isError: false };
      if (key === 'catalog') {
        return {
          data: {
            data: [
              { id: 'p1', slug: 'tomate', name: 'Tomate orgánico', imageUrl: 'https://img', priceFrom: 1000 },
              { id: 'p2', slug: 'cebolla', name: 'Cebolla', imageUrl: 'https://img2', priceFrom: 2000 }
            ]
          },
          isLoading: false,
          isError: false
        };
      }
      return { data: undefined, isLoading: false, isError: false };
    });

    addItem.mockResolvedValue(undefined);
    mockGetProductBySlug.mockResolvedValue({ variants: [{ id: 'v-1' }] });

    const { getAllByText } = render(<CatalogScreen navigation={navigation} route={{ key: 'k', name: 'CatalogMain', params: {} } as any} />);

    fireEvent.press(getAllByText('Llévalo a mi canasta')[0]);

    await waitFor(() => {
      expect(mockGetProductBySlug).toHaveBeenCalledWith('tomate', 'z1');
      expect(addItem).toHaveBeenCalledWith({ variantId: 'v-1', qty: 1 });
    });
  });
});

const mockUseAuthStore = jest.fn();
const mockUseAvailabilityStore = jest.fn();
const mockUseTheme = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockUseFocusEffect = jest.fn();
const mockGetCatalog = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Feather: () => null
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => mockUseFocusEffect(cb)
}));

jest.mock('../../../state/authStore', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector)
}));

jest.mock('../../../state/availabilityStore', () => ({
  useAvailabilityStore: (selector: any) => mockUseAvailabilityStore(selector)
}));

jest.mock('../../../shared/theme/useTheme', () => ({
  useTheme: () => mockUseTheme()
}));

jest.mock('../../../services/storage/kvStorage', () => ({
  getItem: (...args: any[]) => mockGetItem(...args),
  setItem: (...args: any[]) => mockSetItem(...args)
}));

jest.mock('../../../services/api/catalogApi', () => ({
  getCatalog: (...args: any[]) => mockGetCatalog(...args)
}));

jest.mock('../../../app/navigation/HamburgerDrawer', () => ({
  useHamburgerDrawer: () => ({
    isOpen: false,
    openDrawer: jest.fn(),
    closeDrawer: jest.fn(),
    toggleDrawer: jest.fn()
  })
}));

jest.mock('../../../shared/utils/media', () => ({
  toCachedImageSource: (uri: string) => ({ uri })
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';

describe('HomeScreen', () => {
  const logout = jest.fn();
  const toggleMode = jest.fn();
  const parentNavigate = jest.fn();

  const navigation = {
    getParent: () => ({ navigate: parentNavigate })
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockGetCatalog.mockResolvedValue({ page: 1, limit: 1, total: 24, data: [] });
    mockUseFocusEffect.mockImplementation((cb: any) => {
      const cleanup = cb();
      if (typeof cleanup === 'function') cleanup();
    });

    const authState = { logout };
    const availabilityState = { selectedZone: { id: 'z1', name: 'Laureles', city: 'Medellín' } };

    mockUseAuthStore.mockImplementation((selector: any) => selector(authState));
    mockUseAvailabilityStore.mockImplementation((selector: any) => selector(availabilityState));
    mockUseTheme.mockReturnValue({
      mode: 'dark',
      toggleMode,
      colors: {
        bg: '#000',
        text1: '#fff',
        text2: '#bbb',
        border1: '#333',
        cta: '#2a2',
        ctaText: '#000'
      }
    });
  });

  it('renders refreshed hero copy and selected zone', async () => {
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'HomeMain' } as any} />);

    expect(getByText('GreenCart')).toBeTruthy();
    expect(getByText('Entregando en Laureles 🌿')).toBeTruthy();
    expect(getByText('Hoy cosechamos algo especial para ti.')).toBeTruthy();
    expect(getByText('Compra directo a quienes cultivan con cuidado.')).toBeTruthy();

    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalled();
      expect(mockGetCatalog).toHaveBeenCalled();
    });
  });

  it('opens catalog from hero CTA', async () => {
    const { getByText } = render(<HomeScreen navigation={navigation} route={{ key: 'k', name: 'HomeMain' } as any} />);

    await waitFor(() => expect(mockGetCatalog).toHaveBeenCalled());
    fireEvent.press(getByText('Ver lo que llegó hoy'));
    expect(parentNavigate).toHaveBeenCalledWith('CatalogTab');
  });
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCreateMyAddress = jest.fn();
const mockListDeliveryZones = jest.fn();
const mockUseTheme = jest.fn();
const mockUseAvailabilityStore = jest.fn();
const mockUseAuthStore = jest.fn();

jest.mock('../../../services/api/addressesApi', () => ({
  createMyAddress: (...args: any[]) => mockCreateMyAddress(...args)
}));

jest.mock('../../../services/api/availabilityApi', () => ({
  listDeliveryZones: (...args: any[]) => mockListDeliveryZones(...args)
}));

jest.mock('../../../shared/theme/useTheme', () => ({
  useTheme: () => mockUseTheme()
}));

jest.mock('../../../state/availabilityStore', () => ({
  useAvailabilityStore: (selector: any) => mockUseAvailabilityStore(selector)
}));

jest.mock('../../../state/authStore', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector)
}));

import { AddressOnboardingScreen } from './AddressOnboardingScreen';

describe('AddressOnboardingScreen', () => {
  const selectZone = jest.fn();
  const completeAddressOnboarding = jest.fn();

  const zones = [
    { id: 'z1', city: 'Medellín', name: 'Laureles', isActive: true },
    { id: 'z2', city: 'Bogotá', name: 'Chapinero', isActive: true }
  ];

  function renderScreen() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <AddressOnboardingScreen />
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockListDeliveryZones.mockResolvedValue(zones);
    mockCreateMyAddress.mockResolvedValue({ id: 'a1' });

    mockUseTheme.mockReturnValue({
      isDark: true,
      colors: { text1: '#fff', text2: '#aaa', accent: '#0f0', bg: '#000' }
    });

    const authState = {
      user: { id: 'u1', fullName: 'Erick Sossa' },
      completeAddressOnboarding
    };
    const availabilityState = { selectZone };

    mockUseAuthStore.mockImplementation((selector: any) => selector(authState));
    mockUseAvailabilityStore.mockImplementation((selector: any) => selector(availabilityState));
  });

  it('does not advance while zones are loading and selection is incomplete', async () => {
    const { getByText, queryByText } = renderScreen();

    expect(getByText('Buscando zonas disponibles...')).toBeTruthy();
    fireEvent.press(getByText('Guardar y continuar'));
    expect(queryByText('Ahora agrega tu dirección para dejar tu entrega lista en segundos.')).toBeNull();
    expect(queryByText('Elige ciudad y zona para continuar.')).toBeNull();
  });

  it('advances to address step after selecting city and zone', async () => {
    const { findByText, getByText, queryByText } = renderScreen();

    await findByText('Medellín');
    fireEvent.press(getByText('Medellín'));
    fireEvent.press(getByText('Laureles'));
    fireEvent.press(getByText('Guardar y continuar'));

    await findByText('Guardar y finalizar');
    expect(queryByText('Elige ciudad y zona para continuar.')).toBeNull();
  });

  it('submits address and completes onboarding', async () => {
    const { findByText, getByText, getByPlaceholderText } = renderScreen();

    await findByText('Medellín');
    fireEvent.press(getByText('Medellín'));
    fireEvent.press(getByText('Laureles'));
    fireEvent.press(getByText('Guardar y continuar'));

    await findByText('Guardar y finalizar');
    fireEvent.changeText(getByPlaceholderText('Ej: Calle 84 #12-33'), 'Calle 10 #20-30');
    fireEvent.changeText(getByPlaceholderText('Apto, torre, portería...'), 'Portería 24h');
    fireEvent.press(getByText('Guardar y finalizar'));

    await waitFor(() => {
      expect(mockCreateMyAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Erick Sossa',
          city: 'Medellín',
          line1: 'Calle 10 #20-30',
          instructions: 'Portería 24h',
          isDefault: true
        })
      );
      expect(selectZone).toHaveBeenCalledWith({ id: 'z1', name: 'Laureles', city: 'Medellín' });
      expect(completeAddressOnboarding).toHaveBeenCalled();
    });
  });
});

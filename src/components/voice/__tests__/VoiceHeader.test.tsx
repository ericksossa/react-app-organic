import React from 'react';
import { render } from '@testing-library/react-native';
import { useTheme } from '../../../shared/theme/useTheme';
import { VoiceHeader } from '../VoiceHeader';

jest.mock('../../../shared/theme/useTheme', () => ({
  useTheme: jest.fn()
}));

const useThemeMock = useTheme as jest.MockedFunction<typeof useTheme>;

describe('VoiceHeader', () => {
  beforeEach(() => {
    useThemeMock.mockReturnValue({
      mode: 'dark',
      isDark: true,
      colors: {} as any,
      toggleMode: jest.fn()
    });
  });

  it('muestra título en español por defecto', () => {
    const { getByText } = render(<VoiceHeader />);
    expect(getByText('Luna Verde')).toBeTruthy();
  });

  it('usa texto blanco en modo dark', () => {
    const { getByText } = render(<VoiceHeader />);
    expect(getByText('Luna Verde')).toHaveStyle({ color: '#FFFFFF' });
  });
});

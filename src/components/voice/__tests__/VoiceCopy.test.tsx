import React from 'react';
import { render } from '@testing-library/react-native';
import { useTheme } from '../../../shared/theme/useTheme';
import { VoiceCopy } from '../VoiceCopy';

jest.mock('../../../shared/theme/useTheme', () => ({
  useTheme: jest.fn()
}));

const useThemeMock = useTheme as jest.MockedFunction<typeof useTheme>;

describe('VoiceCopy', () => {
  beforeEach(() => {
    useThemeMock.mockReturnValue({
      mode: 'dark',
      isDark: true,
      colors: {} as any,
      toggleMode: jest.fn()
    });
  });

  it('mantiene los copys en español por defecto', () => {
    const { getByText } = render(<VoiceCopy />);
    expect(getByText('Toca para hablar')).toBeTruthy();
    expect(getByText('Busca tomate.')).toBeTruthy();
  });

  it('pinta título y subtítulo en blanco en dark', () => {
    const { getByText } = render(<VoiceCopy />);
    expect(getByText('Toca para hablar')).toHaveStyle({ color: '#FFFFFF' });
    expect(getByText('Busca tomate.')).toHaveStyle({ color: '#FFFFFF' });
  });
});

import { renderHook } from '@testing-library/react-native';
import { useThemeStore } from '../../state/themeStore';
import { darkColors, lightColors } from './tokens';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'dark', hydrated: true });
  });

  it('returns dark theme by default', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toEqual(darkColors);
  });

  it('exposes toggleMode and switches to light palette', () => {
    const { result } = renderHook(() => useTheme());

    result.current.toggleMode();

    expect(useThemeStore.getState().mode).toBe('light');
    expect(result.current.colors).toEqual(lightColors);
  });
});

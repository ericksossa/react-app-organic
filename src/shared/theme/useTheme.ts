import { useMemo } from 'react';
import { darkColors, lightColors } from './tokens';
import { useThemeStore } from '../../state/themeStore';

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  const colors = useMemo(() => (mode === 'light' ? lightColors : darkColors), [mode]);

  return {
    mode,
    isDark: mode === 'dark',
    colors,
    toggleMode
  } as const;
}

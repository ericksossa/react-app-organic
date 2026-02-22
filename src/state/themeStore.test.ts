import { useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'dark', hydrated: false });
  });

  it('sets specific mode', () => {
    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('toggles mode between dark and light', () => {
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');

    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
  });

  it('updates hydrated flag', () => {
    useThemeStore.getState().setHydrated(true);
    expect(useThemeStore.getState().hydrated).toBe(true);
  });
});

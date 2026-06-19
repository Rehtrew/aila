// src/theme/ThemeContext.tsx
// Theme provider: resolves light/dark/system into a Palette and persists the
// user's choice. Every component reads colors via useTheme()/useThemedStyles().
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { getThemeMode, setThemeMode as persistThemeMode } from '../lib/settings';
import { darkColors, lightColors, type Palette, type ResolvedScheme, type ThemeMode } from './index';

interface ThemeState {
  colors: Palette;
  /** The stored preference: 'light' | 'dark' | 'system'. */
  mode: ThemeMode;
  /** What is actually rendered right now. */
  scheme: ResolvedScheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getThemeMode().then(setModeState);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    persistThemeMode(m);
  }, []);

  const scheme: ResolvedScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo<ThemeState>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      mode,
      scheme,
      setMode,
    }),
    [scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Scheme-aware StyleSheet factory:
 *   const styles = useThemedStyles(makeStyles);
 *   ...
 *   const makeStyles = (c: Palette) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(make: (c: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => make(colors), [colors, make]);
}

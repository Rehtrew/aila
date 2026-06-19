// src/lib/settings.ts — persisted app preferences (SecureStore-backed).
import * as SecureStore from 'expo-secure-store';
import type { ThemeMode } from '../theme';

const THEME_KEY = 'aila_theme_mode';

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const v = await SecureStore.getItemAsync(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // first launch / store unavailable
  }
  return 'system';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_KEY, mode);
  } catch {
    // non-fatal — preference just won't survive restart
  }
}

// src/theme/index.ts
// Design tokens for Aila — Scandinavian minimalism: Apple clarity, Polestar
// restraint, a touch of warmth. System font (SF Pro), generous whitespace,
// one confident accent, full light/dark support.
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

export interface Palette {
  scheme: ResolvedScheme;
  /** Canvas behind everything — warm off-white / near-black. */
  bg: string;
  /** Elevated surface (cards, sheets, headers). */
  card: string;
  /** Secondary surface — input fields, chips, inactive segments. */
  groupedBg: string;
  fill: string;
  fillStrong: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  separator: string;
  /** The one accent. Interactive elements only — never decoration. */
  tint: string;
  onTint: string;
  green: string;
  orange: string;
  red: string;
  white: string;
}

export const lightColors: Palette = {
  scheme: 'light',
  bg: '#F6F6F4',
  card: '#FFFFFF',
  groupedBg: '#ECECEA',
  fill: '#ECECEA',
  fillStrong: '#E0E0DD',
  label: '#151517',
  secondaryLabel: '#6E6E75',
  tertiaryLabel: '#A7A7AE',
  separator: 'rgba(0,0,0,0.08)',
  tint: '#0A6BE0',
  onTint: '#FFFFFF',
  green: '#2E9E63',
  orange: '#D9821B',
  red: '#D6453D',
  white: '#FFFFFF',
};

export const darkColors: Palette = {
  scheme: 'dark',
  bg: '#0C0C0E',
  card: '#17171A',
  groupedBg: '#202024',
  fill: '#222227',
  fillStrong: '#2E2E33',
  label: '#F2F2F0',
  secondaryLabel: '#9B9BA2',
  tertiaryLabel: '#606068',
  separator: 'rgba(255,255,255,0.09)',
  tint: '#4C95FF',
  onTint: '#FFFFFF',
  green: '#41C07E',
  orange: '#E8A33D',
  red: '#FF6058',
  white: '#FFFFFF',
};

/** @deprecated Static palette — use useTheme()/useThemedStyles() instead. */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
  /** Standard action button corner radius. */
  button: 8,
} as const;

export const font = {
  /** Hero numerals & greetings. */
  display: { fontSize: 40, fontWeight: '700', letterSpacing: -0.8 },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  title2: { fontSize: 22, fontWeight: '600', letterSpacing: -0.2 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.1 },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  callout: { fontSize: 15, fontWeight: '500' },
  subhead: { fontSize: 14, fontWeight: '500' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' },
  /** Small section label. */
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
  },
} satisfies Record<string, TextStyle>;

// Mix a hex color toward white. amount 0 = unchanged, 1 = white.
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return '#' + ((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, '0');
}

// Mix a hex color toward black. amount 0 = unchanged, 1 = black.
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c * (1 - amount));
  return '#' + ((mix(r) << 16) | (mix(g) << 8) | mix(b)).toString(16).padStart(6, '0');
}

/**
 * Card surface treatment per scheme: soft shadow in light, hairline border in
 * dark (shadows are invisible on near-black).
 */
export function cardSurface(c: Palette): ViewStyle {
  if (c.scheme === 'light') {
    return {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    };
  }
  return {
    backgroundColor: c.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.separator,
  };
}

/** @deprecated Use cardSurface(colors) for scheme-aware elevation. */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
} satisfies Record<string, ViewStyle>;

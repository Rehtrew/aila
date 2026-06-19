// src/theme/childColors.ts
// Stable per-user avatar colors. Non-parent users (teachers/pædagoger) and
// children get a palette color derived deterministically from their id, so the
// same person maps to the same color on every device. Parents without a picture
// get one neutral "parent" color.

// Medium-dark, readable hues — used as avatar text over a light tint (see Avatar).
const PALETTE = [
  '#2563EB', // blue
  '#059669', // green
  '#D97706', // amber
  '#7C3AED', // violet
  '#DB2777', // pink
  '#0891B2', // cyan
  '#DC2626', // red
  '#0D9488', // teal
  '#9333EA', // purple
  '#CA8A04', // gold
];

const PARENT_COLOR = '#64748B'; // slate — the standard color for parents

function hash(key: number | string): number {
  if (typeof key === 'number') return Math.abs(Math.trunc(key));
  return [...key].reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function avatarColorByKey(key: number | string): string {
  return PALETTE[hash(key) % PALETTE.length];
}

// Children always get a palette color (by profileId).
export function childColor(id: number | string): string {
  return avatarColorByKey(id);
}

// Color for any person's avatar: parents → slate; everyone else → palette by id.
export function personColor(role?: string, key?: number | string | null): string {
  const r = (role ?? '').toLowerCase();
  if (r === 'guardian' || r === 'parent' || r === 'otp') return PARENT_COLOR;
  return key != null ? avatarColorByKey(key) : PARENT_COLOR;
}

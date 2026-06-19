// src/lib/bookmarks.ts — local post bookmarks (persisted in SecureStore).
// Aula's server-side bookmark API isn't captured yet, so these are app-local.
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY = 'aula_bookmarked_posts';
let ids = new Set<number>();
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw) ids = new Set(JSON.parse(raw) as number[]);
  } catch {
    // ignore
  }
  emit();
}

async function persist() {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function isBookmarked(id: number): boolean {
  return ids.has(id);
}

export async function toggleBookmark(id: number): Promise<void> {
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  emit();
  await persist();
}

// Re-renders the caller whenever bookmarks change; returns current helpers.
export function useBookmarks() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    ensureLoaded();
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { isBookmarked, toggleBookmark, bookmarks: [...ids] };
}

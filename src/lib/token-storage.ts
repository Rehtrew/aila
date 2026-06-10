import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'aula_access_token',
  refreshToken: 'aula_refresh_token',
} as const;

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function storeTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(KEYS.accessToken, tokens.accessToken);
  await SecureStore.setItemAsync(KEYS.refreshToken, tokens.refreshToken);
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const accessToken = await SecureStore.getItemAsync(KEYS.accessToken);
  const refreshToken = await SecureStore.getItemAsync(KEYS.refreshToken);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.accessToken);
  await SecureStore.deleteItemAsync(KEYS.refreshToken);
}

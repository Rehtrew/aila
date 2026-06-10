// src/lib/aula-api.ts
import { AULA_API_BASE, AULA_METHODS } from '../constants/aula';
import { getStoredTokens } from './token-storage';
import { refreshTokens } from './auth';
import type {
  ProfilesByLoginResponse,
  ProfileContextResponse,
} from './aula-types';

async function aulaFetch<T>(
  method: string,
  params: Record<string, string> = {},
  accessToken?: string,
  isRetry = false,
): Promise<T> {
  const token = accessToken ?? (await getStoredTokens())?.accessToken;
  if (!token) throw new Error('Ikke logget ind');

  const query = new URLSearchParams({ method, access_token: token, ...params });
  const response = await fetch(`${AULA_API_BASE}?${query}`);

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshTokens();
    return aulaFetch<T>(method, params, refreshed.accessToken, true);
  }

  if (!response.ok) throw new Error(`Aula API fejl: ${response.status}`);
  return response.json() as Promise<T>;
}

export function getProfilesByLogin(): Promise<ProfilesByLoginResponse> {
  return aulaFetch<ProfilesByLoginResponse>(AULA_METHODS.profilesByLogin);
}

export function getProfileContext(): Promise<ProfileContextResponse> {
  return aulaFetch<ProfileContextResponse>(AULA_METHODS.profileContext, {
    portalrole: 'guardian',
  });
}

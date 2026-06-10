import * as WebBrowser from 'expo-web-browser';
import { AULA_OAUTH } from '../constants/aula';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';
import {
  storeTokens,
  getStoredTokens,
  clearTokens,
  StoredTokens,
} from './token-storage';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export async function startMitIdLogin(): Promise<StoredTokens> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: AULA_OAUTH.clientId,
    scope: AULA_OAUTH.scope,
    redirect_uri: AULA_OAUTH.redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: generateCodeVerifier(),
  });

  const authUrl = `${AULA_OAUTH.authorizationUrl}?${params}`;
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    AULA_OAUTH.redirectUri,
  );

  if (result.type !== 'success') {
    throw new Error('Login annulleret');
  }

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Intet autoriseringskode i svar');

  return exchangeCodeForTokens(code, codeVerifier);
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: AULA_OAUTH.clientId,
    redirect_uri: AULA_OAUTH.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(AULA_OAUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token-udveksling fejlede: ${response.status}`);
  }

  const data: TokenResponse = await response.json();
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
  await storeTokens(tokens);
  return tokens;
}

export async function refreshTokens(): Promise<StoredTokens> {
  const stored = await getStoredTokens();
  if (!stored) throw new Error('Ingen gemte tokens');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: stored.refreshToken,
    client_id: AULA_OAUTH.clientId,
  });

  const response = await fetch(AULA_OAUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    await clearTokens();
    throw new Error('Session udløbet — log ind igen');
  }

  const data: TokenResponse = await response.json();
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
  await storeTokens(tokens);
  return tokens;
}

import { generateCodeVerifier, generateCodeChallenge } from '../src/lib/pkce';

jest.mock('expo-crypto', () => ({
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) array[i] = i % 256;
    return array;
  },
  digestStringAsync: jest.fn().mockResolvedValue('abc+def/ghi='),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
}));

describe('generateCodeVerifier', () => {
  it('returns at least 43 characters', () => {
    expect(generateCodeVerifier().length).toBeGreaterThanOrEqual(43);
  });

  it('contains only base64url characters (no +, /, =)', () => {
    expect(generateCodeVerifier()).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe('generateCodeChallenge', () => {
  it('transforms base64 to base64url (replaces +, /, =)', async () => {
    const challenge = await generateCodeChallenge('any-verifier');
    // mock returns 'abc+def/ghi=' — all special chars must be replaced
    expect(challenge).toBe('abc-def_ghi');
  });

  it('returns a non-empty string', async () => {
    const challenge = await generateCodeChallenge('verifier');
    expect(challenge.length).toBeGreaterThan(0);
  });
});

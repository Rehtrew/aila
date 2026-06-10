import {
  storeTokens,
  getStoredTokens,
  clearTokens,
} from '../src/lib/token-storage';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore with in-memory storage
let mockStorage: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStorage[key] = value;
  }),
  getItemAsync: jest.fn(async (key: string) => {
    return mockStorage[key] || null;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockStorage[key];
  }),
}));

describe('token-storage', () => {
  beforeEach(async () => {
    mockStorage = {};
  });

  it('returns null when no tokens are stored', async () => {
    const result = await getStoredTokens();
    expect(result).toBeNull();
  });

  it('stores and retrieves tokens', async () => {
    await storeTokens({ accessToken: 'acc-123', refreshToken: 'ref-456' });
    const result = await getStoredTokens();
    expect(result).toEqual({ accessToken: 'acc-123', refreshToken: 'ref-456' });
  });

  it('clears tokens', async () => {
    await storeTokens({ accessToken: 'acc-123', refreshToken: 'ref-456' });
    await clearTokens();
    const result = await getStoredTokens();
    expect(result).toBeNull();
  });
});

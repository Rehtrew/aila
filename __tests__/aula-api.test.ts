// __tests__/aula-api.test.ts
import { getProfilesByLogin, getProfileContext } from '../src/lib/aula-api';
import * as tokenStorage from '../src/lib/token-storage';
import * as auth from '../src/lib/auth';

jest.mock('../src/lib/token-storage');
jest.mock('../src/lib/auth');

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

const mockTokens = { accessToken: 'test-token', refreshToken: 'test-refresh' };
const mockProfile = { data: { profiles: [{ profileId: 1, displayName: 'Test', institutionProfiles: [] }] } };
const mockContext = { data: { children: [] } };

beforeEach(() => {
  jest.clearAllMocks();
  (tokenStorage.getStoredTokens as jest.Mock).mockResolvedValue(mockTokens);
});

describe('getProfilesByLogin', () => {
  it('calls the correct API method', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockProfile });

    await getProfilesByLogin();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('method=profiles.getProfilesByLogin'),
    );
  });

  it('includes access_token in request URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockProfile });

    await getProfilesByLogin();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('access_token=test-token'),
    );
  });

  it('refreshes token on 401 and retries with new token', async () => {
    (auth.refreshTokens as jest.Mock).mockResolvedValueOnce({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
    });
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockProfile });

    await getProfilesByLogin();

    expect(auth.refreshTokens).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('access_token=new-token'),
    );
  });

  it('does not retry more than once on 401', async () => {
    (auth.refreshTokens as jest.Mock).mockResolvedValueOnce({
      accessToken: 'new-token',
      refreshToken: 'new-refresh',
    });
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    await expect(getProfilesByLogin()).rejects.toThrow('Aula API fejl: 401');
  });

  it('throws on non-401 errors without retrying', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getProfilesByLogin()).rejects.toThrow('Aula API fejl: 500');
    expect(auth.refreshTokens).not.toHaveBeenCalled();
  });
});

describe('getProfileContext', () => {
  it('includes portalrole=guardian in request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockContext });

    await getProfileContext();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('portalrole=guardian'),
    );
  });
});

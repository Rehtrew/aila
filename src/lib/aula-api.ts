// src/lib/aula-api.ts
import { AULA_API_BASE, AULA_METHODS } from '../constants/aula';
import { getStoredTokens } from './token-storage';
import { refreshTokens } from './auth';
import type {
  ProfilesByLoginResponse,
  ProfileContextResponse,
  DailyOverviewResponse,
  ThreadsResponse,
  ThreadMessagesResponse,
  AlbumsResponse,
  GetMediaResponse,
  PresenceTemplatesResponse,
  PostsResponse,
  NotificationsResponse,
  AulaPost,
} from './aula-types';

type Params = Record<string, string | string[]>;

// Aula uses double-submit CSRF: the server sets a `Csrfp-Token` cookie on the
// bootstrap calls (profiles.*), and every other method must echo it back in a
// `csrfp-token` header. RN's fetch (unlike a browser) exposes Set-Cookie, so we
// scrape the token from responses and replay it. NSURLSession sends the cookie
// itself automatically on subsequent requests.
let csrfToken: string | null = null;

function captureCsrf(response: Response): void {
  try {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) return;
    const m = setCookie.match(/Csrfp-Token=([^;,\s]+)/i);
    if (m) csrfToken = m[1];
  } catch {
    // ignore — header not available on this platform
  }
}

// iOS RN doesn't expose Set-Cookie to fetch, but NSURLSession still stores the
// cookie. Read the Csrfp-Token from the native cookie store so we can echo it
// in the csrfp-token header (required for writes / double-submit CSRF).
async function ensureCsrf(): Promise<void> {
  if (csrfToken) return;
  try {
    // Lazy require: the native module isn't in the binary until the next build,
    // so importing eagerly would crash startup. Loaded only when first needed.
    const CookieManager = require('@react-native-cookies/cookies').default;
    const cookies = await CookieManager.get(AULA_API_BASE);
    for (const [name, cookie] of Object.entries(cookies ?? {}) as [string, { value?: string }][]) {
      if (name.toLowerCase() === 'csrfp-token' && cookie?.value) {
        csrfToken = cookie.value;
        return;
      }
    }
  } catch {
    // native module not linked yet (needs a rebuild) — falls back to no header
  }
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

function buildQuery(method: string, token: string, params: Params): string {
  const q = new URLSearchParams();
  q.set('method', method);
  q.set('access_token', token);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => q.append(key, v));
    else q.append(key, value);
  }
  return q.toString();
}

function statusCode(body: string): { code?: number; subCode?: number } {
  try {
    const json = JSON.parse(body);
    return { code: json?.status?.code, subCode: json?.status?.subCode };
  } catch {
    return {};
  }
}

interface FetchOpts {
  token?: string;
  retriedAuth?: boolean;
  retriedCsrf?: boolean;
  body?: unknown; // when set, the request is a POST with a JSON body
}

async function aulaFetch<T>(method: string, params: Params = {}, opts: FetchOpts = {}): Promise<T> {
  const token = opts.token ?? (await getStoredTokens())?.accessToken;
  if (!token) throw new Error('Ikke logget ind');

  await ensureCsrf();
  const isPost = opts.body !== undefined;
  const sentCsrf = csrfToken;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (sentCsrf) headers['csrfp-token'] = sentCsrf;
  if (isPost) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${AULA_API_BASE}?${buildQuery(method, token, params)}`, {
    method: isPost ? 'POST' : 'GET',
    headers,
    body: isPost ? JSON.stringify(opts.body) : undefined,
  });
  captureCsrf(response);

  if (response.ok) return response.json() as Promise<T>;

  const body = await response.text().catch(() => '');
  const { code } = statusCode(body);

  // Token expired/invalid → refresh once. Aula signals this with several codes
  // (HTTP 401, code:448, code:20), so treat them all as "needs a fresh token".
  if ((response.status === 401 || code === 448 || code === 20) && !opts.retriedAuth) {
    try {
      const refreshed = await refreshTokens();
      return aulaFetch<T>(method, params, { ...opts, token: refreshed.accessToken, retriedAuth: true });
    } catch {
      throw new Error('Session udløbet — log ind igen');
    }
  }

  // Missing/invalid CSRF (code:10/subCode:23). If we just captured a token we
  // hadn't sent yet, retry once with it.
  if (!opts.retriedCsrf && csrfToken && csrfToken !== sentCsrf) {
    return aulaFetch<T>(method, params, { ...opts, retriedCsrf: true });
  }

  // 403 with no CSRF sent: do a fresh bootstrap GET to prime the native
  // cookie store, read the token, then retry the original request once.
  if (response.status === 403 && !sentCsrf && !opts.retriedCsrf) {
    try {
      const r = await fetch(
        `${AULA_API_BASE}?${buildQuery('profiles.getProfilesByLogin', token, {
          'portalRoles[]': 'guardian',
        })}`,
        { headers: { Accept: 'application/json' } },
      );
      captureCsrf(r);
      await ensureCsrf();
    } catch { /* best effort */ }
    if (csrfToken) {
      return aulaFetch<T>(method, params, { ...opts, retriedCsrf: true });
    }
  }

  throw new Error(
    `Aula API fejl: ${response.status} — ${body.slice(0, 140)} [csrf:${sentCsrf ? 'sent' : 'none'}]`,
  );
}

// ── Profiles (bootstrap — these establish the session + CSRF cookie) ──────────

export function getProfilesByLogin(): Promise<ProfilesByLoginResponse> {
  return aulaFetch<ProfilesByLoginResponse>(AULA_METHODS.profilesByLogin, {
    'portalRoles[]': 'guardian',
  });
}

export function getProfileContext(): Promise<ProfileContextResponse> {
  return aulaFetch<ProfileContextResponse>(AULA_METHODS.profileContext, {
    portalrole: 'guardian',
  });
}

/**
 * Runs the two bootstrap calls in order so the server issues the session +
 * Csrfp-Token cookie before any other method is used. Returns the profiles.
 */
export async function bootstrapSession(): Promise<ProfilesByLoginResponse> {
  const profiles = await getProfilesByLogin();
  try {
    await getProfileContext();
  } catch {
    // best-effort — getProfilesByLogin already establishes the cookie
  }
  return profiles;
}

// ── Presence ────────────────────────────────────────────────────────────────

export function getDailyOverview(childIds: number[]): Promise<DailyOverviewResponse> {
  return aulaFetch<DailyOverviewResponse>(AULA_METHODS.dailyOverview, {
    'childIds[]': childIds.map(String),
  });
}

// Planned entry/exit/pickup per day (incl. who collects the child).
export function getPresenceTemplates(
  childIds: number[],
  fromDate: string,
  toDate: string,
): Promise<PresenceTemplatesResponse> {
  return aulaFetch<PresenceTemplatesResponse>(AULA_METHODS.presenceTemplates, {
    'filterInstitutionProfileIds[]': childIds.map(String),
    fromDate,
    toDate,
  });
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export function getThreads(page = 0): Promise<ThreadsResponse> {
  return aulaFetch<ThreadsResponse>(AULA_METHODS.threads, {
    sortOn: 'date',
    orderDirection: 'desc',
    page: String(page),
  });
}

export function getMessagesForThread(
  threadId: number | string,
  page = 0,
): Promise<ThreadMessagesResponse> {
  return aulaFetch<ThreadMessagesResponse>(AULA_METHODS.messagesForThread, {
    threadId: String(threadId),
    page: String(page),
  });
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export function getAlbums(
  filterInstProfileIds: number[],
  index = 0,
  limit = 24,
): Promise<AlbumsResponse> {
  return aulaFetch<AlbumsResponse>(AULA_METHODS.albums, {
    index: String(index),
    limit: String(limit),
    sortOn: 'mediaCreatedAt',
    orderDirection: 'desc',
    filterBy: 'all',
    'filterInstProfileIds[]': filterInstProfileIds.map(String),
  });
}

export function getMedia(
  albumId: number | string,
  filterInstProfileIds: number[],
  index = 0,
  limit = 60,
): Promise<GetMediaResponse> {
  return aulaFetch<GetMediaResponse>(AULA_METHODS.media, {
    albumId: String(albumId),
    index: String(index),
    limit: String(limit),
    sortOn: 'uploadedAt',
    orderDirection: 'desc',
    filterBy: 'all',
    'filterInstProfileIds[]': filterInstProfileIds.map(String),
  });
}

// ── Posts (the "Overblik" group feed / opslag) ────────────────────────────────
// institutionProfileIds must include the guardian's own institutionProfile id
// AND the children's, per the web client.

const postCache = new Map<number, AulaPost>();
export function getCachedPost(id: number): AulaPost | undefined {
  return postCache.get(id);
}

export async function getPosts(
  institutionProfileIds: number[],
  limit = 14,
): Promise<PostsResponse> {
  const res = await aulaFetch<PostsResponse>(AULA_METHODS.posts, {
    parent: 'profile',
    index: '0',
    limit: String(limit),
    'institutionProfileIds[]': institutionProfileIds.map(String),
  });
  for (const p of res.data?.posts ?? []) postCache.set(p.id, p);
  return res;
}

// ── Notifications (drives the per-area tab badges) ────────────────────────────

export function getNotifications(
  childInstitutionProfileIds: number[],
  institutionCodes: string[],
): Promise<NotificationsResponse> {
  return aulaFetch<NotificationsResponse>(AULA_METHODS.notifications, {
    'activeChildrenIds[]': childInstitutionProfileIds.map(String),
    'activeInstitutionCodes[]': institutionCodes,
  });
}

// Reply / send in an existing message thread.
export function sendMessageToThread(
  threadId: number | string,
  text: string,
): Promise<{ status: { code: number } }> {
  return aulaFetch(
    AULA_METHODS.createMessage,
    { threadId: String(threadId) },
    { body: { text: { html: `<p>${text.replace(/\n/g, '</p><p>')}</p>` } } },
  );
}

// First write: marks notifications as seen (e.g. when a post is opened).
export interface DeleteNotificationItem {
  notificationId: string;
  institutionProfileId: number;
}

export function deleteNotifications(
  notifications: DeleteNotificationItem[],
): Promise<{ status: { code: number } }> {
  return aulaFetch(AULA_METHODS.deleteNotifications, {}, { body: { notifications } });
}

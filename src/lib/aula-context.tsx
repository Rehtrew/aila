// src/lib/aula-context.tsx
// Loads the guardian profile + children once and shares it across the app,
// plus notification state (counts, unread posts) and a mark-as-read write.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { bootstrapSession, deleteNotifications, getNotifications, getPosts } from './aula-api';
import { childColor } from './../theme/childColors';
import type { AulaNotification, AulaProfile } from './aula-types';

export interface Kid {
  id: number; // institutionProfile id — used for presence/gallery/notifications
  profileId: number;
  name: string;
  firstName: string;
  groupName: string;
  institutionName: string;
  institutionCode: string;
  birthday?: string | null;
  pictureUrl?: string | null;
  color: string;
}

export interface Guardian {
  name: string;
  firstName: string;
  pictureUrl?: string | null;
  institutionName: string;
}

export interface NotificationCounts {
  posts: number;
  messages: number;
  presence: number;
  gallery: number;
  calendar: number;
  total: number;
}

const EMPTY_COUNTS: NotificationCounts = {
  posts: 0,
  messages: 0,
  presence: 0,
  gallery: 0,
  calendar: 0,
  total: 0,
};

interface AulaState {
  loading: boolean;
  error: string | null;
  guardian: Guardian | null;
  kids: Kid[];
  institutionProfileIds: number[];
  notifications: NotificationCounts;
  notificationList: AulaNotification[];
  unreadPostIds: number[];
  guardianProfileId: number | null;
  // Marks a post seen: clears its unread dot + badge and tells Aula (write).
  markPostRead: (postId: number) => void;
  // Dismisses all current notifications at once.
  markAllRead: () => void;
  reload: () => void;
}

const AulaContext = createContext<AulaState | null>(null);

function normalizeKids(profiles: AulaProfile[]): Kid[] {
  const map = new Map<number, Kid>();
  for (const p of profiles) {
    for (const c of p.children ?? []) {
      if (map.has(c.id)) continue;
      map.set(c.id, {
        id: c.id,
        profileId: c.profileId,
        name: c.name,
        firstName: c.name?.split(' ')[0] ?? c.name,
        groupName: c.institutionProfile?.metadata ?? '',
        institutionName: c.institutionProfile?.institutionName ?? '',
        institutionCode: c.institutionCode ?? c.institutionProfile?.institutionCode ?? '',
        birthday: c.institutionProfile?.birthday ?? null,
        pictureUrl: c.profilePicture?.url ?? c.institutionProfile?.profilePicture?.url ?? null,
        color: childColor(c.profileId ?? c.id),
      });
    }
  }
  return [...map.values()];
}

function normalizeGuardian(profiles: AulaProfile[]): Guardian | null {
  const gp = profiles[0];
  if (!gp) return null;
  const ip = gp.institutionProfiles?.[0];
  return {
    name: gp.displayName,
    firstName: gp.displayName?.split(' ')[0] ?? gp.displayName,
    pictureUrl: ip?.profilePicture?.url ?? null,
    institutionName: ip?.institutionName ?? '',
  };
}

function collectInstitutionProfileIds(profiles: AulaProfile[]): number[] {
  const ids = new Set<number>();
  for (const p of profiles) {
    for (const ip of p.institutionProfiles ?? []) if (ip.id != null) ids.add(ip.id);
    for (const c of p.children ?? []) if (c.id != null) ids.add(c.id);
  }
  return [...ids];
}

function areaKey(area?: string): keyof NotificationCounts | null {
  switch ((area ?? '').toLowerCase()) {
    case 'posts':
      return 'posts';
    case 'messages':
      return 'messages';
    case 'presence':
      return 'presence';
    case 'gallery':
      return 'gallery';
    case 'calendar':
      return 'calendar';
    default:
      return null;
  }
}

export function AulaProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [kids, setKids] = useState<Kid[]>([]);
  const [institutionProfileIds, setInstitutionProfileIds] = useState<number[]>([]);
  const [guardianProfileId, setGuardianProfileId] = useState<number | null>(null);
  const [notifs, setNotifs] = useState<AulaNotification[]>([]);

  const notifsRef = useRef(notifs);
  notifsRef.current = notifs;

  const notifications = useMemo(() => {
    const c: NotificationCounts = { ...EMPTY_COUNTS };
    for (const n of notifs) {
      const k = areaKey(n.notificationArea);
      if (k) {
        c[k] += 1;
        c.total += 1;
      }
    }
    return c;
  }, [notifs]);

  const unreadPostIds = useMemo(
    () =>
      notifs
        .filter((n) => areaKey(n.notificationArea) === 'posts' && n.postId != null)
        .map((n) => n.postId as number),
    [notifs],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await bootstrapSession();
      const profiles = res.data.profiles ?? [];
      const kidList = normalizeKids(profiles);
      const allIds = collectInstitutionProfileIds(profiles);
      setGuardian(normalizeGuardian(profiles));
      setKids(kidList);
      setInstitutionProfileIds(allIds);
      setGuardianProfileId(profiles[0]?.profileId ?? null);
      setLoading(false); // render immediately; badges fill in below

      try {
        const codes = [...new Set(kidList.map((k) => k.institutionCode).filter(Boolean))];
        const notifRes = await getNotifications(kidList.map((k) => k.id), codes);
        setNotifs(notifRes.data ?? []);
        // Prefetch posts so notification thumbnails are available immediately.
        getPosts(allIds, 50).catch(() => {});
      } catch {
        setNotifs([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente profil');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markPostRead = useCallback((postId: number) => {
    const matching = notifsRef.current.filter(
      (n) => n.postId === postId && n.notificationId && n.institutionProfileId != null,
    );
    if (matching.length === 0) return;
    // Optimistic: drop the notification locally (clears dot + badge instantly).
    setNotifs((prev) => prev.filter((n) => n.postId !== postId));
    deleteNotifications(
      matching.map((n) => ({
        notificationId: n.notificationId,
        institutionProfileId: n.institutionProfileId as number,
      })),
    )
      .then((res) => {
        if (__DEV__ && res?.status?.code !== 0) {
          console.warn('markPostRead response:', JSON.stringify(res?.status));
        }
      })
      .catch((e) => {
        if (__DEV__) console.warn('markPostRead failed:', e instanceof Error ? e.message : e);
      });
  }, []);

  const markAllRead = useCallback(() => {
    const all = notifsRef.current;
    if (all.length === 0) return;
    const deletable = all.filter((n) => n.notificationId && n.institutionProfileId != null);
    setNotifs([]);
    if (deletable.length === 0) return;
    deleteNotifications(
      deletable.map((n) => ({
        notificationId: n.notificationId,
        institutionProfileId: n.institutionProfileId as number,
      })),
    ).catch((e) => {
      if (__DEV__) console.warn('markAllRead failed:', e instanceof Error ? e.message : e);
    });
  }, []);

  return (
    <AulaContext.Provider
      value={{
        loading,
        error,
        guardian,
        kids,
        institutionProfileIds,
        notifications,
        notificationList: notifs,
        unreadPostIds,
        guardianProfileId,
        markPostRead,
        markAllRead,
        reload: load,
      }}
    >
      {children}
    </AulaContext.Provider>
  );
}

export function useAula(): AulaState {
  const ctx = useContext(AulaContext);
  if (!ctx) throw new Error('useAula must be used within AulaProvider');
  return ctx;
}

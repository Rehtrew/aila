// src/constants/aula.ts
export const AULA_OAUTH = {
  authorizationUrl:
    'https://login.aula.dk/simplesaml/module.php/oidc/authorize.php',
  tokenUrl:
    'https://login.aula.dk/simplesaml/module.php/oidc/token.php',
  clientId: '_99949a54b8b65423862aac1bf629599ed64231607a',
  redirectUri: 'https://app-private.aula.dk',
  scope: 'aula-sensitive',
} as const;

// app-private.aula.dk is only the OAuth redirect URI (an S3 static site).
// The actual API lives on www.aula.dk. The version is bumped periodically and
// old versions are decommissioned: they return HTTP 410 / code:10 ("Gone") for
// everyone, authenticated or not. As of 2026-06 the live version is v23; v22 and
// below are dead. v23 unauthenticated returns 403 / code:448.
export const AULA_API_BASE = 'https://www.aula.dk/api/v23/';

export const AULA_METHODS = {
  profilesByLogin: 'profiles.getProfilesByLogin',
  profileContext: 'profiles.getProfileContext',
  dailyOverview: 'presence.getDailyOverview',
  threads: 'messaging.getThreads',
  messagesForThread: 'messaging.getMessagesForThread',
  albums: 'gallery.getAlbums',
  media: 'gallery.getMedia',
  presenceTemplates: 'presence.getPresenceTemplates',
  posts: 'posts.getAllPosts',
  notifications: 'notifications.getNotificationsForActiveProfile',
  // Note the capital N — Aula is case-sensitive here (matches the web client).
  deleteNotifications: 'Notifications.deleteNotifications',
  createMessage: 'messaging.createMessage',
} as const;

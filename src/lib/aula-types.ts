// src/lib/aula-types.ts
// Types model the live Aula API v23 responses. They are intentionally partial —
// only fields we use (or expect to use soon) are typed; the API returns much more.

// Every Aula API response is wrapped in this envelope. code:0 / message:"OK"
// means success; anything else is an error (e.g. code:448 = not authenticated,
// code:10 = API version gone).
export interface AulaStatus {
  code: number;
  message?: string;
}

export interface AulaProfilePicture {
  id: number;
  url: string;
  bucket?: string;
  scanningStatus?: string;
}

export interface AulaInstitutionProfile {
  id?: number;
  profileId?: number;
  institutionCode?: string;
  institutionName: string;
  municipalityName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string; // "guardian" | "child" | ...
  shortName?: string;
  // For a child's institutionProfile this is the group name, e.g. "Rumpenisserne".
  metadata?: string;
  birthday?: string | null;
  profilePicture?: AulaProfilePicture | null;
}

// ── profiles.getProfilesByLogin ───────────────────────────────────────────────

export interface AulaChild {
  id: number;
  profileId: number;
  userId?: string;
  name: string;
  shortName?: string;
  institutionCode?: string;
  hasCustodyOrExtendedAccess?: boolean;
  profilePicture?: AulaProfilePicture | null;
  institutionProfile?: AulaInstitutionProfile;
}

export interface AulaProfile {
  profileId: number;
  displayName: string;
  portalRole?: string; // "guardian"
  institutionProfiles: AulaInstitutionProfile[];
  children: AulaChild[];
}

export interface ProfilesByLoginResponse {
  status: AulaStatus;
  data: {
    profiles: AulaProfile[];
  };
}

// ── profiles.getProfileContext ────────────────────────────────────────────────
// The rich "who am I + what can I access" bootstrap call.

export interface AulaModule {
  id: number;
  name: string; // "OVERBLIK", "KOMME/GÅ", ...
  type: string; // "overview" | "calendar" | "messages" | "presence" | "gallery" | "contacts"
  url: string; // "/overblik", "/kommegaa", ...
  icon?: string;
}

export interface AulaModuleConfiguration {
  module: AulaModule;
  order: number;
  placement: string;
  institutionRole: string;
}

export interface AulaGroup {
  id: number;
  uniGroupId: string | null;
  name: string;
  groupType: string; // "uni" | "institutional" | "municipal"
  membershipType: string;
  role: string;
  dashboardEnabled: boolean;
}

export interface AulaContextChild {
  id: number;
  profileId: number;
  userId?: string;
  name: string;
  shortName?: string;
  institutionCode?: string;
  hasCustodyOrExtendedAccess?: boolean;
  profilePicture?: AulaProfilePicture | null;
}

export interface AulaContextInstitution {
  institutionProfileId: number;
  name: string;
  shortName?: string;
  institutionCode: string;
  institutionType: string; // "Daycare", "School", ...
  municipalityCode: string;
  children: AulaContextChild[];
  groups: AulaGroup[];
  mailboxId?: number;
}

export interface AulaRelation {
  id: number; // institutionProfile id
  profileId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  shortName: string;
  role: string; // "child"
  mailBoxId?: number;
  mainGroupName?: string; // e.g. "Rumpenisserne"
  gender?: string;
  profilePicture?: AulaProfilePicture | null;
}

export interface ProfileContextResponse {
  status: AulaStatus;
  data: {
    id: number; // guardian profileId
    userId: string;
    portalRole: string;
    isSteppedUp: boolean;
    institutionProfile: {
      id: number;
      profileId: number;
      mailBoxId?: number;
      fullName: string;
      relations: AulaRelation[];
    };
    institutions: AulaContextInstitution[];
    pageConfiguration: {
      moduleConfigurations: AulaModuleConfiguration[];
      widgetConfigurations: unknown[];
    };
  };
}

// ── presence.getDailyOverview ─────────────────────────────────────────────────
// One entry per child for a given day. `status` is a numeric enum, but we mostly
// derive display state from checkIn/checkOut times (concrete + reliable).

export interface PresenceDailyOverview {
  id?: number;
  institutionProfileId?: number;
  date?: string;
  status?: number;
  checkInTime?: string | null; // "09:23:00"
  checkOutTime?: string | null; // "15:44:00"
  entryTime?: string | null; // planned arrival
  exitTime?: string | null; // planned pickup
  exitWith?: string | null; // who collects the child
  comment?: string | null;
  isDefaultEntryTime?: boolean;
  isDefaultExitTime?: boolean;
}

export interface DailyOverviewResponse {
  status: AulaStatus;
  data: PresenceDailyOverview[];
}

// ── messaging.getThreads / getMessagesForThread ───────────────────────────────

export interface AulaMessageText {
  html?: string;
}

export interface AulaSender {
  fullName?: string;
  mailBoxOwner?: { fullName?: string };
}

export interface AulaThreadLatestMessage {
  id?: string | number;
  sendDateTime?: string;
  text?: AulaMessageText | string;
}

export interface MessageThread {
  id: number;
  subject: string;
  read?: boolean;
  muted?: boolean;
  sensitive?: boolean;
  latestMessage?: AulaThreadLatestMessage;
  mostRecentMessage?: AulaThreadLatestMessage;
  lastMessageDateTime?: string;
  recipients?: { fullName?: string }[];
}

export interface ThreadsResponse {
  status: AulaStatus;
  data: {
    threads: MessageThread[];
    moreMessagesExist?: boolean;
    page?: number;
  };
}

export interface AulaMessage {
  id: string | number;
  sendDateTime?: string;
  messageType?: string; // "Message" | "Header" | ...
  text?: AulaMessageText | string;
  sender?: AulaSender;
  hasAttachments?: boolean;
}

export interface ThreadMessagesResponse {
  status: AulaStatus;
  data: {
    subject?: string;
    messages: AulaMessage[];
    recipients?: { fullName?: string }[];
  };
}

// ── gallery.getAlbums / gallery.getMedia (v23) ────────────────────────────────

export interface AulaMediaCreator {
  profileId?: number;
  name?: string;
  metadata?: string; // role/position, e.g. "Pædagog - Kastelsgården"
}

export interface AulaMediaItem {
  id?: number;
  title?: string | null;
  created?: string;
  mediaType?: string; // "image" | "video"
  file?: { url?: string; name?: string };
  thumbnailUrl?: string; // works for images AND video posters
  largeThumbnailUrl?: string;
  duration?: number | null;
  creator?: AulaMediaCreator;
}

export interface AulaAlbum {
  id: number;
  title?: string;
  description?: string;
  creationDate?: string;
  mediaCount?: number;
  thumbnailsUrls?: string[]; // album cover candidates
  regardingInstitutionProfileId?: number | null;
  creator?: AulaMediaCreator;
}

// gallery.getAlbums → data is a bare array of albums.
export interface AlbumsResponse {
  status: AulaStatus;
  data: AulaAlbum[];
}

// gallery.getMedia → data.results holds the media items.
export interface GetMediaResponse {
  status: AulaStatus;
  data: {
    album?: AulaAlbum;
    mediaCount?: number;
    results: AulaMediaItem[];
  };
}

// ── presence.getPresenceTemplates (planned entry/exit/pickup per day) ──────────

export interface PresenceDayTemplate {
  dayOfWeek?: number;
  byDate?: string; // "2026-06-10"
  isOnVacation?: boolean;
  isDefaultEntryTime?: boolean;
  isDefaultExitTime?: boolean;
  activityType?: number | null;
  entryTime?: string | null; // "09:30:00"
  exitTime?: string | null; // "15:30:00"
  exitWith?: string | null; // "Christian Hasseldam Werther (Far)"
  comment?: string | null;
}

export interface PresenceWeekTemplate {
  institutionProfile?: { id?: number; profileId?: number; name?: string };
  dayTemplates?: PresenceDayTemplate[];
}

export interface PresenceTemplatesResponse {
  status: AulaStatus;
  data: {
    currentDate?: string;
    presenceWeekTemplates?: PresenceWeekTemplate[];
  };
}

// ── posts.getAllPosts (the "Overblik" group feed / opslag) ────────────────────

export interface AulaPostProfile {
  id: number;
  profileId: number;
  fullName: string;
  shortName?: string;
  role?: string; // "employee" | "child" | ...
  metadata?: string; // e.g. "Pædagog - Kastelsgården"
  profilePicture?: AulaProfilePicture | null;
  institution?: { institutionName?: string };
}

export interface AulaPostGroup {
  id: number;
  name: string; // e.g. "Rumpenisserne"
  shortName?: string;
  institutionName?: string;
  mainGroup?: boolean;
}

export interface AulaPost {
  id: number;
  title: string;
  content?: { html?: string };
  timestamp?: string;
  ownerProfile?: AulaPostProfile;
  sharedWithGroups?: AulaPostGroup[];
  relatedProfiles?: AulaPostProfile[]; // which children the post is about
  attachments?: unknown[];
  commentCount?: number;
  isImportant?: boolean;
}

export interface PostsResponse {
  status: AulaStatus;
  data: { posts: AulaPost[] };
}

// ── notifications.getNotificationsForActiveProfile ────────────────────────────

export interface AulaNotification {
  notificationId: string;
  notificationArea?: string; // "Posts" | "Messages" | "Presence" | "Gallery" | "Calendar"
  notificationType?: string; // "Badge" | "Alert"
  notificationEventType?: string;
  postId?: number;
  postTitle?: string;
  institutionProfileId?: number;
  relatedChildInstitutionProfileId?: number | null;
  triggered?: string;
}

export interface NotificationsResponse {
  status: AulaStatus;
  data: AulaNotification[];
}

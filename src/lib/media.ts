// src/lib/media.ts — accessors for gallery media + post attachments (v23).
import type { AulaAlbum, AulaMediaItem, AulaPost } from './aula-types';

// Grid/preview thumbnail — prefers large thumbnail for better quality.
export function mediaThumb(m?: AulaMediaItem): string | undefined {
  if (!m) return undefined;
  return (
    m.largeThumbnailUrl ??
    m.thumbnailUrl ??
    (m.mediaType === 'image' ? m.file?.url : undefined)
  );
}

// Full-resolution source for the viewer (mp4 for video, large image otherwise).
export function mediaFull(m?: AulaMediaItem): string | undefined {
  if (!m) return undefined;
  if (m.mediaType === 'video') return m.file?.url ?? m.largeThumbnailUrl;
  return m.largeThumbnailUrl ?? m.file?.url ?? m.thumbnailUrl;
}

export function albumThumb(a: AulaAlbum): string | undefined {
  // Last element tends to be the largest size Aula provides.
  const urls = (a.thumbnailsUrls ?? []).filter(Boolean);
  return urls[urls.length - 1] ?? urls[0];
}

// Image/video attachments on a post share the gallery media shape; documents
// carry `media: null`, so we keep only real media items.
export function postMediaItems(post: AulaPost): AulaMediaItem[] {
  const items: AulaMediaItem[] = [];
  for (const a of (post.attachments ?? []) as Array<Record<string, any>>) {
    const m = a?.media;
    if (m && typeof m === 'object' && (m.mediaType === 'image' || m.mediaType === 'video')) {
      items.push(m as AulaMediaItem);
    }
  }
  return items;
}

// src/lib/download.ts — download media to device via share sheet.
// Uses expo-file-system v56's new File/Directory API to fetch media into the
// app cache, then opens the native share sheet (iOS: includes "Save Image").
import { Share } from 'react-native';
import { Directory, File as FSFile, Paths } from 'expo-file-system';
import type { AulaMediaItem } from './aula-types';
import { mediaFull } from './media';

export const DOWNLOAD_ENABLED = true;

export interface DownloadResult {
  saved: number;
  failed: number;
}

export async function downloadMedia(items: AulaMediaItem[]): Promise<DownloadResult> {
  const dir = new Directory(Paths.cache, 'aila-dl');
  dir.create({ intermediates: true, idempotent: true });

  let saved = 0;
  let failed = 0;

  for (const item of items) {
    const url = mediaFull(item);
    if (!url) {
      failed++;
      continue;
    }

    const ext = item.mediaType === 'video' ? 'mp4' : 'jpg';
    const dest = new FSFile(dir, `media_${item.id ?? `${saved}${failed}`}.${ext}`);

    try {
      const downloaded = await FSFile.downloadFileAsync(url, dest, { idempotent: true });
      await Share.share({ url: downloaded.uri });
      saved++;
    } catch {
      failed++;
    }
  }

  return { saved, failed };
}

// src/lib/format.ts — small display helpers (Danish locale).

export function capitalizeFirst(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function timeOfDay(t?: string | null): string {
  if (!t) return '';
  const m = t.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}.${m[2]}` : '';
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const day = Math.floor(h / 24);
  if (min < 1) return 'nu';
  if (min < 60) return `${min} min`;
  if (h < 24) return `${h} t`;
  if (day === 1) return 'i går';
  if (day < 7) return `${day} d`;
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

export function dateValue(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function messageText(text?: { html?: string } | string): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return stripHtml(text.html);
}

// Like stripHtml but preserves line breaks (for full post/message bodies).
export function htmlToText(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

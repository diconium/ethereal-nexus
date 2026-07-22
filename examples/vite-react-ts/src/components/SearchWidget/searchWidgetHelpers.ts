/**
 * Pure utility functions for the SearchWidget.
 * No React imports — safe to use in any context.
 */

export type LinkKind = 'web' | 'gcs' | 'none';

/** Classifies a URL as a web link, GCS path, or unknown. */
export function classifyLink(link: string | null): LinkKind {
  if (!link) return 'none';
  if (/^https?:\/\//i.test(link)) return 'web';
  if (link.startsWith('gs://')) return 'gcs';
  return 'none';
}

/** Extracts the hostname from a URL, stripping "www.". */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/** Returns a short file-type badge label for a GCS URI. */
export function extBadge(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'docx' || ext === 'doc') return 'Word';
  if (ext === 'xlsx' || ext === 'xls') return 'Excel';
  if (ext === 'pptx' || ext === 'ppt') return 'Slides';
  return 'File';
}

/**
 * Strips HTML tags and decodes HTML entities (&nbsp; &#39; &amp; …).
 * Uses a textarea in browser environments for reliable entity decoding.
 */
export function stripHtml(html: string): string {
  let withoutTags = html;
  let previous: string;
  do {
    previous = withoutTags;
    withoutTags = withoutTags.replace(/<[^>]+>/g, '');
  } while (withoutTags !== previous);

  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = withoutTags;
    return el.value;
  }

  // SSR / non-browser fallback
  return withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

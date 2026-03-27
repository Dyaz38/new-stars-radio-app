/**
 * Decode HTML entities from Airtime / web metadata (same behavior as useMetadata).
 * Safe to call from the browser; uses textarea fallback for remaining entities.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  let decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ');

  decoded = decoded
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8230;/g, '...')
    .replace(/&#169;/g, '©')
    .replace(/&#174;/g, '®')
    .replace(/&#8482;/g, '™');

  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.innerHTML = decoded;
      decoded = textArea.value;
    }
  } catch {
    // keep decoded as-is
  }

  return decoded.trim();
}

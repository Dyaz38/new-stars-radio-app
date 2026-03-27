/**
 * Airtime Pro live-info (v1) exposes current/next/previous at the root.
 * live-info-v2 nests the same under `tracks`. Normalize so both work everywhere.
 */

import { API_ENDPOINTS } from '../constants';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';

export type AirtimeTrackBlock = {
  name?: string;
  metadata?: {
    artist_name?: string;
    track_title?: string;
    title?: string;
    genre?: string;
  };
};

export interface NormalizedAirtimeLiveInfo {
  current?: AirtimeTrackBlock;
  next?: AirtimeTrackBlock;
  previous?: AirtimeTrackBlock;
}

export function normalizeAirtimeLiveInfo(data: unknown): NormalizedAirtimeLiveInfo {
  if (!data || typeof data !== 'object') return {};
  const d = data as Record<string, unknown>;

  if (d.current && typeof d.current === 'object') {
    return {
      current: d.current as AirtimeTrackBlock,
      next: d.next as AirtimeTrackBlock | undefined,
      previous: d.previous as AirtimeTrackBlock | undefined,
    };
  }

  const tracks = d.tracks;
  if (tracks && typeof tracks === 'object') {
    const t = tracks as Record<string, unknown>;
    return {
      current: t.current as AirtimeTrackBlock | undefined,
      next: t.next as AirtimeTrackBlock | undefined,
      previous: t.previous as AirtimeTrackBlock | undefined,
    };
  }

  return {};
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/** Same Airtime JSON sources as the metadata hook (excludes Icecast / dead embed). */
const LIVE_INFO_URLS = API_ENDPOINTS.METADATA.filter((u) => u.includes('/api/live-info'));

/**
 * When the UI state has no genre, fetch live-info and return genre only if
 * we find a matching track. We check current, then previous, then next — the
 * scheduler often advances between "now playing" in the UI and this request,
 * so the liked song may appear under `previous` while `current` is already
 * the next track.
 *
 * Airtime often returns HTML entities in strings (e.g. Boo&#039;d Up); we decode
 * before matching so keys align with the decoded UI strings.
 */
export async function fetchGenreForCurrentTrackIfMatch(
  artist: string,
  title: string
): Promise<string | undefined> {
  const wantA = normKey(decodeHtmlEntities(artist));
  const wantT = normKey(decodeHtmlEntities(title));
  if (!wantA || !wantT) return undefined;

  for (const url of LIVE_INFO_URLS) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const json: unknown = await res.json();
      const { current, previous, next } = normalizeAirtimeLiveInfo(json);

      /** Order: current first, then previous (common race when liking near a transition), then next */
      const candidates: AirtimeTrackBlock[] = [current, previous, next].filter(
        (b): b is AirtimeTrackBlock => b != null && typeof b === 'object'
      );

      for (const block of candidates) {
        const m = block.metadata;
        if (!m) continue;

        const rawArtist = m.artist_name != null ? String(m.artist_name) : '';
        const rawTitle =
          m.track_title != null ? String(m.track_title) : m.title != null ? String(m.title) : '';

        const a = rawArtist ? normKey(decodeHtmlEntities(rawArtist)) : '';
        const t = rawTitle ? normKey(decodeHtmlEntities(rawTitle)) : '';
        const gRaw = m.genre != null && String(m.genre).trim() !== '' ? String(m.genre).trim() : '';

        if (!a || !t || !gRaw) continue;

        if (a === wantA && t === wantT) {
          const g = decodeHtmlEntities(gRaw);
          const trimmed = g.trim();
          if (!trimmed) continue;
          return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
        }
      }
    } catch {
      // try next URL
    }
  }
  return undefined;
}

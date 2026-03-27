/**
 * Airtime Pro live-info (v1) exposes current/next at the root.
 * live-info-v2 nests the same under `tracks`. Normalize so both work everywhere.
 */

import { API_ENDPOINTS } from '../constants';

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
}

export function normalizeAirtimeLiveInfo(data: unknown): NormalizedAirtimeLiveInfo {
  if (!data || typeof data !== 'object') return {};
  const d = data as Record<string, unknown>;

  if (d.current && typeof d.current === 'object') {
    return {
      current: d.current as AirtimeTrackBlock,
      next: d.next as AirtimeTrackBlock | undefined,
    };
  }

  const tracks = d.tracks;
  if (tracks && typeof tracks === 'object') {
    const t = tracks as Record<string, unknown>;
    return {
      current: t.current as AirtimeTrackBlock | undefined,
      next: t.next as AirtimeTrackBlock | undefined,
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
 * the now-playing track matches the liked song (artist + title).
 */
export async function fetchGenreForCurrentTrackIfMatch(
  artist: string,
  title: string
): Promise<string | undefined> {
  const wantA = normKey(artist);
  const wantT = normKey(title);
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
      const { current } = normalizeAirtimeLiveInfo(json);
      const m = current?.metadata;
      if (!m) continue;

      const a = m.artist_name ? normKey(String(m.artist_name)) : '';
      const t = m.track_title
        ? normKey(String(m.track_title))
        : m.title
          ? normKey(String(m.title))
          : '';
      const g = m.genre != null && String(m.genre).trim() !== '' ? String(m.genre).trim() : '';

      if (a && t && a === wantA && t === wantT && g) {
        return g.length > 200 ? g.slice(0, 200) : g;
      }
    } catch {
      // try next URL
    }
  }
  return undefined;
}

import { API_ENDPOINTS } from '../constants';
import { getOrCreateListenerId } from '../utils/listenerId';

export type SongLikeAction = 'like' | 'unlike';

export interface SyncSongLikePayload {
  song_key: string;
  artist: string;
  title: string;
  action: SongLikeAction;
  /** From Airtime metadata when available */
  genre?: string;
}

/**
 * POST like/unlike to ad server (PostgreSQL catalog). Fire-and-forget; failures are logged only.
 */
export async function syncSongLikeToServer(payload: SyncSongLikePayload): Promise<void> {
  const base = API_ENDPOINTS.AD_SERVER.replace(/\/$/, '');
  const url = `${base}/likes/`;
  const body = {
    ...payload,
    listener_id: getOrCreateListenerId(),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!res.ok) {
      console.warn('[songLikes] sync failed', res.status, await res.text().catch(() => ''));
    }
  } catch (e) {
    console.warn('[songLikes] sync error', e);
  }
}

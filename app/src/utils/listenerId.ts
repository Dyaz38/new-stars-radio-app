import { STORAGE_KEYS } from '../constants';

/**
 * Stable anonymous id per browser (for cataloging likes server-side).
 */
export function getOrCreateListenerId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.LISTENER_ID);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `nsr-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(STORAGE_KEYS.LISTENER_ID, id);
    }
    return id;
  } catch {
    return `nsr-fallback-${Date.now()}`;
  }
}

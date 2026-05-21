import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../constants';

export type ListenerGeo = {
  country: string | null;
  city: string | null;
  state: string | null;
  loading: boolean;
};

const STORAGE_KEY = 'newstarsradio-listener-geo';

function readCachedGeo(): Pick<ListenerGeo, 'country' | 'city' | 'state'> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { country?: string; city?: string; state?: string };
    return {
      country: parsed.country?.trim() || null,
      city: parsed.city?.trim() || null,
      state: parsed.state?.trim() || null,
    };
  } catch {
    return null;
  }
}

function writeCachedGeo(geo: Pick<ListenerGeo, 'country' | 'city' | 'state'>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(geo));
  } catch {
    /* ignore */
  }
}

/**
 * Resolves listener country from the ad server (IP / CDN headers).
 * Used for country-specific ad campaigns.
 */
export function useListenerGeo(): ListenerGeo {
  const cached = readCachedGeo();
  const [country, setCountry] = useState<string | null>(cached?.country ?? null);
  const [city, setCity] = useState<string | null>(cached?.city ?? null);
  const [state, setState] = useState<string | null>(cached?.state ?? null);
  const [loading, setLoading] = useState(!cached?.country);

  useEffect(() => {
    if (cached?.country) return;

    let cancelled = false;
    void fetch(`${API_ENDPOINTS.AD_SERVER}/geo/`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          country?: string | null;
          city?: string | null;
          state?: string | null;
        };
        if (cancelled) return;
        const next = {
          country: data.country?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state?.trim() || null,
        };
        setCountry(next.country);
        setCity(next.city);
        setState(next.state);
        if (next.country) writeCachedGeo(next);
      })
      .catch(() => {
        /* ads/request still resolves geo server-side */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { country, city, state, loading };
}

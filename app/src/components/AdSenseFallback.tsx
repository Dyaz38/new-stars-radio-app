import { useEffect, useRef } from 'react';
import { AD_PLACEMENTS, type AdPlacement } from '../constants/adPlacements';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdSensePlacementKey = 'banner' | 'events';

function readAdSenseEnv(placementKey: AdSensePlacementKey): { client: string; slot: string } | null {
  const client = (import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined)?.trim();
  const bannerSlot = (import.meta.env.VITE_ADSENSE_BANNER_SLOT as string | undefined)?.trim();
  const eventsSlot = (import.meta.env.VITE_ADSENSE_EVENTS_SLOT as string | undefined)?.trim();
  const slot = placementKey === 'events' ? eventsSlot || bannerSlot : bannerSlot;

  if (!client || !slot || !client.startsWith('ca-pub-')) return null;
  return { client, slot };
}

export function getAdSensePlacementKey(placement: AdPlacement): AdSensePlacementKey {
  return placement === AD_PLACEMENTS.EVENTS_MODAL ? 'events' : 'banner';
}

export function isAdSenseFallbackConfigured(placement: AdPlacement = AD_PLACEMENTS.BANNER_TOP): boolean {
  return readAdSenseEnv(getAdSensePlacementKey(placement)) !== null;
}

interface AdSenseFallbackProps {
  className?: string;
  style?: React.CSSProperties;
  width: number;
  height: number;
  placement: AdPlacement;
  /** Fixed-size slot (Events modal / mobile banner) vs responsive leaderboard */
  compact?: boolean;
}

/**
 * Loads Google AdSense only when mounted — fallback when the ad-server has no paid creative.
 * Set VITE_ADSENSE_PUBLISHER_ID plus VITE_ADSENSE_BANNER_SLOT (and optional VITE_ADSENSE_EVENTS_SLOT).
 */
export function AdSenseFallback({
  className = '',
  style,
  width,
  height,
  placement,
  compact = false,
}: AdSenseFallbackProps) {
  const placementKey = getAdSensePlacementKey(placement);
  const env = readAdSenseEnv(placementKey);
  const client = env?.client ?? '';
  const slot = env?.slot ?? '';
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!client || !slot || !insRef.current || pushedRef.current) return;

    const pushAd = () => {
      const el = insRef.current;
      if (!el || pushedRef.current) return;
      pushedRef.current = true;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (e) {
        console.error('AdSense: push failed', e);
        pushedRef.current = false;
      }
    };

    const existingScript = document.querySelector(
      'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.adsbygoogle) {
        pushAd();
      } else {
        existingScript.addEventListener('load', pushAd, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.addEventListener('load', pushAd, { once: true });
    script.addEventListener('error', () => console.error('AdSense: failed to load script'));
    document.head.appendChild(script);
  }, [client, slot]);

  if (!env) return null;

  const minHeight = Math.max(height, 50);

  return (
    <div
      className={`promo-banner-slot mb-4 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100/95 ${className}`}
      style={{ minHeight, ...style }}
      data-promo-placement={placement}
      data-ad-placement={placement}
      data-adsense-fallback="true"
      data-testid="ad-banner-adsense-fallback"
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={
          compact
            ? {
                display: 'inline-block',
                width: `${width}px`,
                height: `${height}px`,
                maxWidth: '100%',
              }
            : {
                display: 'block',
                width: `${width}px`,
                minHeight: `${minHeight}px`,
                maxWidth: '100%',
              }
        }
        data-ad-client={env.client}
        data-ad-slot={env.slot}
        {...(compact
          ? {}
          : {
              'data-ad-format': 'horizontal',
              'data-full-width-responsive': 'true',
            })}
      />
    </div>
  );
}

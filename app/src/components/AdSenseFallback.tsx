import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function readAdSenseEnv(): { client: string; slot: string } | null {
  const client = (import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined)?.trim();
  const slot = (import.meta.env.VITE_ADSENSE_BANNER_SLOT as string | undefined)?.trim();
  if (!client || !slot || !client.startsWith('ca-pub-')) return null;
  return { client, slot };
}

export function isAdSenseFallbackConfigured(): boolean {
  return readAdSenseEnv() !== null;
}

interface AdSenseFallbackProps {
  className?: string;
  style?: React.CSSProperties;
  width: number;
  height: number;
}

/**
 * Loads Google AdSense only when mounted (fallback when primary ad-server banner fails).
 * Set VITE_ADSENSE_PUBLISHER_ID (e.g. ca-pub-1234567890) and VITE_ADSENSE_BANNER_SLOT (ad unit slot id).
 */
export function AdSenseFallback({ className = '', style, width, height }: AdSenseFallbackProps) {
  const env = readAdSenseEnv();
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

  return (
    <div
      className={`mb-4 flex items-center justify-center overflow-hidden rounded-lg bg-gray-100/95 ${className}`}
      style={{ minHeight: Math.max(height, 50), ...style }}
      data-testid="ad-banner-adsense-fallback"
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: `${width}px`,
          minHeight: `${Math.max(height, 50)}px`,
          maxWidth: '100%',
        }}
        data-ad-client={env.client}
        data-ad-slot={env.slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

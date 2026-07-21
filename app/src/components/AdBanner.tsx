import { useEffect, useState, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../constants';
import { AD_PLACEMENTS, type AdPlacement } from '../constants/adPlacements';
import { getLocalHouseAd, HOUSE_AD } from '../constants/houseAd';
import { AdSenseFallback } from './AdSenseFallback';
import { shouldTryAdSenseForHouseAd } from '../utils/adSenseEligibility';

interface AdData {
  ad_id: string;
  campaign_id: string;
  image_url: string;
  image_width: number;
  image_height: number;
  click_url: string;
  alt_text?: string;
  impression_tracking_token: string;
  click_tracking_token: string;
  is_house_ad?: boolean;
}

interface AdBannerProps {
  style?: React.CSSProperties;
  className?: string;
  placement?: AdPlacement;
  /** Smaller slot for in-modal placements */
  compact?: boolean;
  /** Hide the slot entirely when no paid ad is available (house promo still shows by default) */
  hideWhenEmpty?: boolean;
  country?: string;
  city?: string;
  state?: string;
}

const getAdDimensions = (compact: boolean): { width: number; height: number } => {
  if (compact) {
    return { width: 320, height: 50 };
  }
  const screenWidth = window.innerWidth;
  if (screenWidth < 768) {
    return { width: 320, height: 50 };
  }
  return { width: 728, height: 90 };
};

const getUserId = (): string => {
  const storageKey = 'ad-server-user-id';
  let userId = localStorage.getItem(storageKey);

  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, userId);
  }

  return userId;
};

function buildLocalHouseAdData(compact: boolean, viewportWidth: number): AdData {
  const asset = getLocalHouseAd(compact, viewportWidth);
  return {
    ad_id: 'house-local',
    campaign_id: 'house-local',
    image_url: asset.url,
    image_width: asset.width,
    image_height: asset.height,
    click_url: HOUSE_AD.CLICK_URL,
    alt_text: HOUSE_AD.ALT,
    impression_tracking_token: '',
    click_tracking_token: '',
    is_house_ad: true,
  };
}

/** Legacy house campaigns in production DB may still reference ads@ until seed sync runs. */
function normalizeClickUrl(url: string): string {
  return url.replace('ads@newstarsradio.com', 'sales@newstarsradio.com');
}

function isHousePromoAd(ad: AdData): boolean {
  return Boolean(
    ad.is_house_ad ||
    ad.ad_id === 'house-local' ||
    ad.image_url.includes('newstars-house') ||
    ad.image_url.includes('/static/promo/'),
  );
}

function normalizeDisplayAd(ad: AdData, compact: boolean, viewportWidth: number): AdData {
  if (!isHousePromoAd(ad)) return ad;
  const local = getLocalHouseAd(compact, viewportWidth);
  return {
    ...ad,
    image_url: local.url,
    image_width: local.width,
    image_height: local.height,
    is_house_ad: true,
  };
}
function resolveAdImageUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const parsed = new URL(imageUrl);
      if (parsed.pathname.includes(' ')) {
        parsed.pathname = parsed.pathname.replace(/ /g, '-');
      }
      return parsed.href;
    } catch {
      return imageUrl.replace(/ /g, '-');
    }
  }
  if (imageUrl.startsWith('/promo/')) return imageUrl;
  // Legacy house paths from older API responses — serve from listener app /promo/
  if (imageUrl.includes('newstars-house-320x50')) return '/promo/newstars-house-320x50.png';
  if (imageUrl.includes('newstars-house-728x90')) return '/promo/newstars-house-728x90.png';
  const origin = API_ENDPOINTS.AD_SERVER.replace('/api/v1', '');
  return `${origin}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

export const AdBanner = ({
  style,
  className = '',
  placement = AD_PLACEMENTS.BANNER_TOP,
  compact = false,
  hideWhenEmpty = false,
  country,
  city,
  state,
}: AdBannerProps) => {
  const [adData, setAdData] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [dimensions, setDimensions] = useState(getAdDimensions(compact));
  const [adSenseUnfilled, setAdSenseUnfilled] = useState(false);
  const adRef = useRef<HTMLAnchorElement>(null);
  const hasLoadedOnceRef = useRef(false);
  const usingLocalFallbackRef = useRef(false);

  const applyLocalHouseAd = useCallback(() => {
    usingLocalFallbackRef.current = true;
    setAdData(buildLocalHouseAdData(compact, dimensions.width));
    setImpressionTracked(false);
  }, [compact, dimensions.width]);

  useEffect(() => {
    setAdSenseUnfilled(false);
  }, [adData?.ad_id, adData?.image_url, placement, dimensions.width, dimensions.height]);

  useEffect(() => {
    if (compact) return;
    const handleResize = () => {
      const newDimensions = getAdDimensions(false);
      if (newDimensions.width !== dimensions.width || newDimensions.height !== dimensions.height) {
        setDimensions(newDimensions);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [compact, dimensions.width, dimensions.height]);

  useEffect(() => {
    setDimensions(getAdDimensions(compact));
  }, [compact]);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        if (!hasLoadedOnceRef.current) {
          setLoading(true);
        }
        setImpressionTracked(false);

        const userId = getUserId();

        const requestBody = {
          user_id: userId,
          placement,
          location: country || city || state ? { country, city, state } : undefined,
        };

        const response = await fetch(`${API_ENDPOINTS.AD_SERVER}/ads/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          applyLocalHouseAd();
          return;
        }

        const data = await response.json();

        if ('fallback' in data) {
          applyLocalHouseAd();
          return;
        }

        setAdData(data as AdData);
        usingLocalFallbackRef.current = false;
      } catch (err) {
        console.error('Error fetching ad:', err);
        applyLocalHouseAd();
      } finally {
        hasLoadedOnceRef.current = true;
        setLoading(false);
      }
    };

    void fetchAd();

    const interval = setInterval(fetchAd, 30000);
    return () => clearInterval(interval);
  }, [dimensions.width, dimensions.height, country, city, state, placement, applyLocalHouseAd]);

  useEffect(() => {
    const trackImpression = async () => {
      if (
        !adData ||
        impressionTracked ||
        adData.is_house_ad ||
        !adData.impression_tracking_token
      ) {
        return;
      }

      try {
        await fetch(`${API_ENDPOINTS.AD_SERVER}/ads/tracking/impression`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ad_id: adData.ad_id,
            campaign_id: adData.campaign_id,
            user_id: getUserId(),
            tracking_token: adData.impression_tracking_token,
            timestamp: new Date().toISOString(),
            location: country || city || state ? { country, city, state } : undefined,
          }),
        });
        setImpressionTracked(true);
      } catch (err) {
        console.error('Error tracking impression:', err);
      }
    };

    void trackImpression();
  }, [adData, impressionTracked, city, state, country]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const activeAd = normalizeDisplayAd(
      adData ?? buildLocalHouseAdData(compact, dimensions.width),
      compact,
      dimensions.width,
    );
    if (!activeAd) return;

    if (activeAd.is_house_ad || !activeAd.click_tracking_token) {
      window.open(normalizeClickUrl(activeAd.click_url), '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await fetch(`${API_ENDPOINTS.AD_SERVER}/ads/tracking/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: activeAd.ad_id,
          campaign_id: activeAd.campaign_id,
          user_id: getUserId(),
          tracking_token: activeAd.click_tracking_token,
          timestamp: new Date().toISOString(),
        }),
      });

      window.open(normalizeClickUrl(activeAd.click_url), '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error tracking click:', err);
      window.open(normalizeClickUrl(activeAd.click_url), '_blank', 'noopener,noreferrer');
    }
  };

  if (hideWhenEmpty && loading && !adData) {
    return null;
  }

  const displayAd = normalizeDisplayAd(
    adData ?? buildLocalHouseAdData(compact, dimensions.width),
    compact,
    dimensions.width,
  );
  const clickUrl = normalizeClickUrl(displayAd.click_url);

  if (hideWhenEmpty && displayAd.is_house_ad) {
    return null;
  }

  if (
    displayAd.is_house_ad &&
    shouldTryAdSenseForHouseAd(placement) &&
    !adSenseUnfilled
  ) {
    return (
      <AdSenseFallback
        className={className}
        style={style}
        width={dimensions.width}
        height={dimensions.height}
        placement={placement}
        compact={compact || dimensions.height <= 50}
        onUnfilled={() => setAdSenseUnfilled(true)}
      />
    );
  }

  const imageUrl = resolveAdImageUrl(displayAd.image_url);
  const isMobileLeaderboard = !compact && dimensions.height <= 50;
  const isNativeCompactCreative =
    (compact || isMobileLeaderboard) &&
    displayAd.image_width <= 400 &&
    displayAd.image_height <= 60;

  return (
    <div
      className={`promo-banner-slot mb-4 flex items-center justify-center ${className}`}
      style={{
        minHeight: dimensions.height,
        ...style,
      }}
      data-promo-placement={placement}
      data-ad-placement={placement}
      data-house-promo={displayAd.is_house_ad ? 'true' : 'false'}
      data-ad-size={`${displayAd.image_width}x${displayAd.image_height}`}
    >
      <a
        ref={adRef}
        href={clickUrl}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer hover:opacity-90 transition-opacity"
        style={{
          display: 'block',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        <img
          src={imageUrl}
          alt={displayAd.alt_text || 'Advertisement'}
          width={displayAd.image_width}
          height={displayAd.image_height}
          className={
            isNativeCompactCreative
              ? 'rounded-lg shadow-md sm:shadow-lg'
              : 'w-full h-auto rounded-lg shadow-md sm:shadow-lg'
          }
          style={
            isNativeCompactCreative
              ? {
                  display: 'block',
                  width: `${Math.min(displayAd.image_width, dimensions.width)}px`,
                  height: `${Math.min(displayAd.image_height, dimensions.height)}px`,
                  maxWidth: '100%',
                  objectFit: 'contain',
                }
              : {
                  maxWidth: dimensions.width,
                  maxHeight: dimensions.height,
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                }
          }
          onError={() => {
            console.error('Failed to load promo image:', imageUrl);
            if (!usingLocalFallbackRef.current) {
              applyLocalHouseAd();
            }
          }}
        />
      </a>
    </div>
  );
};

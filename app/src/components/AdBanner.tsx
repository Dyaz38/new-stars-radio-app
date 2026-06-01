import { useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS } from '../constants';
import {
  AD_PLACEMENTS,
  PLACEMENT_SLOT_SIZES,
  type AdPlacement,
} from '../constants/adPlacements';

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
}

interface AdBannerProps {
  style?: React.CSSProperties;
  className?: string;
  placement?: AdPlacement;
  /** Smaller slot for in-modal placements */
  compact?: boolean;
  /** Hide the yellow placeholder when no ad is available */
  hideWhenEmpty?: boolean;
  country?: string;
  city?: string;
  state?: string;
}

const getAdDimensions = (
  placement: AdPlacement,
  compact: boolean,
): { width: number; height: number } => {
  const fixedSlot = PLACEMENT_SLOT_SIZES[placement];
  if (fixedSlot) {
    return fixedSlot;
  }
  if (compact) {
    return { width: 320, height: 50 };
  }
  const screenWidth = window.innerWidth;
  if (screenWidth < 768) {
    return { width: 320, height: 50 };
  }
  return { width: 728, height: 90 };
};

const isFixedSlotPlacement = (placement: AdPlacement): boolean =>
  placement in PLACEMENT_SLOT_SIZES;

const getUserId = (): string => {
  const storageKey = 'ad-server-user-id';
  let userId = localStorage.getItem(storageKey);

  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, userId);
  }

  return userId;
};

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
  const [error, setError] = useState<string | null>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [dimensions, setDimensions] = useState(getAdDimensions(placement, compact));
  const adRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (compact || isFixedSlotPlacement(placement)) return;
    const handleResize = () => {
      const newDimensions = getAdDimensions(placement, false);
      if (newDimensions.width !== dimensions.width || newDimensions.height !== dimensions.height) {
        setDimensions(newDimensions);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [compact, dimensions.width, dimensions.height, placement]);

  useEffect(() => {
    setDimensions(getAdDimensions(placement, compact));
  }, [compact, placement]);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true);
        setError(null);
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
          setAdData(null);
          if (response.status === 404) {
            setError('No ads available');
          } else {
            throw new Error(`Failed to fetch ad: ${response.statusText}`);
          }
          return;
        }

        const data = await response.json();

        if ('fallback' in data) {
          setAdData(null);
          setError('No ads available');
          return;
        }

        setAdData(data as AdData);
        setError(null);
      } catch (err) {
        console.error('Error fetching ad:', err);
        setAdData(null);
        setError(err instanceof Error ? err.message : 'Failed to load ad');
      } finally {
        setLoading(false);
      }
    };

    void fetchAd();

    const interval = setInterval(fetchAd, 30000);
    return () => clearInterval(interval);
  }, [dimensions.width, dimensions.height, country, city, state, placement]);

  useEffect(() => {
    const trackImpression = async () => {
      if (!adData || impressionTracked) return;

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

  const handleClick = async () => {
    if (!adData) return;

    try {
      await fetch(`${API_ENDPOINTS.AD_SERVER}/ads/tracking/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ad_id: adData.ad_id,
          campaign_id: adData.campaign_id,
          user_id: getUserId(),
          tracking_token: adData.click_tracking_token,
          timestamp: new Date().toISOString(),
        }),
      });

      window.open(adData.click_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error tracking click:', err);
      window.open(adData.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    if (hideWhenEmpty) return null;
    return (
      <div
        className={`bg-gray-200/90 border-2 border-gray-400 rounded-lg p-2 mb-4 flex items-center justify-center ${className}`}
        style={{ minHeight: Math.max(dimensions.height, 50), ...style }}
        data-testid="ad-banner-loading"
      >
        <div className="text-gray-700 text-xs sm:text-sm font-medium">Loading ad...</div>
      </div>
    );
  }

  if (error || !adData) {
    if (hideWhenEmpty) return null;
    return (
      <div
        className={`bg-yellow-400/90 border-2 sm:border-4 border-yellow-600 rounded-lg p-2 sm:p-6 mb-4 shadow-lg sm:shadow-2xl ${className}`}
        style={{
          backgroundColor: 'rgba(250, 204, 21, 0.95)',
          minHeight: Math.max(dimensions.height, 50),
          ...style,
        }}
        data-testid="ad-banner-empty"
      >
        <div className="text-center">
          <div className="text-gray-900 font-bold text-sm sm:text-lg mb-1 sm:mb-2">🎯 ADVERTISEMENT 🎯</div>
          <div className="text-gray-800 text-xs sm:text-sm font-semibold">
            {error || 'No ads available'}
            <br className="hidden sm:block" />
            <span className="text-blue-900 text-xs">Ad space available!</span>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = adData.image_url.startsWith('http')
    ? adData.image_url
    : `${API_ENDPOINTS.AD_SERVER.replace('/api/v1', '')}${adData.image_url}`;

  return (
    <div
      className={`ad-banner-container mb-4 flex items-center justify-center ${className}`}
      style={{
        minHeight: dimensions.height,
        ...style,
      }}
      data-ad-placement={placement}
    >
      <a
        ref={adRef}
        href={adData.click_url}
        onClick={(e) => {
          e.preventDefault();
          void handleClick();
        }}
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
          alt={adData.alt_text || 'Advertisement'}
          width={adData.image_width}
          height={adData.image_height}
          className="w-full h-auto rounded-lg shadow-md sm:shadow-lg"
          style={{
            maxWidth: dimensions.width,
            maxHeight: dimensions.height,
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
          onError={() => {
            console.error('Failed to load ad image:', imageUrl);
            setAdData(null);
            setError('Failed to load ad image');
          }}
        />
      </a>
    </div>
  );
};

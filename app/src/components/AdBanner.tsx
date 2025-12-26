import { useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS } from '../constants';

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
  country?: string; // User's country (ISO 3166-1 alpha-2 code, e.g., 'NA' for Namibia)
  city?: string;    // User's city for targeting
  state?: string;   // User's state for targeting
}

// Get responsive ad dimensions based on screen width
const getAdDimensions = (): { width: number; height: number } => {
  const screenWidth = window.innerWidth;
  
  if (screenWidth < 768) {
    // Mobile: 320x50 (Standard Mobile Banner)
    return { width: 320, height: 50 };
  } else {
    // Tablet & Desktop: 728x90 (Leaderboard)
    return { width: 728, height: 90 };
  }
};

// Generate or retrieve a unique user ID
const getUserId = (): string => {
  const storageKey = 'ad-server-user-id';
  let userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    // Generate a simple user ID (in production, use a more robust method)
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, userId);
  }
  
  return userId;
};

export const AdBanner = ({ 
  style,
  className = '',
  country,
  city,
  state
}: AdBannerProps) => {
  const [adData, setAdData] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [dimensions, setDimensions] = useState(getAdDimensions());
  const adRef = useRef<HTMLAnchorElement>(null);

  // Handle window resize to update ad dimensions
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = getAdDimensions();
      if (newDimensions.width !== dimensions.width || newDimensions.height !== dimensions.height) {
        setDimensions(newDimensions);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dimensions]);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true);
        setError(null);
        setImpressionTracked(false);
        
        const userId = getUserId();
        
        const requestBody = {
          user_id: userId,
          placement: 'banner_top',
          location: (country || city || state) ? { country, city, state } : undefined
        };
        
        const response = await fetch(
          `${API_ENDPOINTS.AD_SERVER}/ads/request`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          }
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('No ads available');
          } else {
            throw new Error(`Failed to fetch ad: ${response.statusText}`);
          }
          return;
        }
        
        const data = await response.json();
        
        // Check if it's a fallback response
        if ('fallback' in data) {
          setError('No ads available');
          return;
        }
        
        setAdData(data as AdData);
      } catch (err) {
        console.error('Error fetching ad:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ad');
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
    
    // Refresh ad every 30 seconds (optional)
    const interval = setInterval(fetchAd, 30000);
    return () => clearInterval(interval);
  }, [dimensions.width, dimensions.height, city, state]);

  // Track impression when ad is loaded
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
            location: (city || state) ? { city, state } : undefined
          }),
        });
        setImpressionTracked(true);
      } catch (err) {
        console.error('Error tracking impression:', err);
      }
    };

    trackImpression();
  }, [adData, impressionTracked, city, state]);

  const handleClick = async () => {
    if (!adData) return;
    
    try {
      // Track click
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
      
      // Open click URL in new tab
      window.open(adData.click_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error tracking click:', err);
      // Still open the URL even if tracking fails
      window.open(adData.click_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div 
        className={`bg-gray-100 border-2 border-gray-300 rounded-lg p-2 mb-4 flex items-center justify-center ${className}`}
        style={{ minHeight: dimensions.height, ...style }}
      >
        <div className="text-gray-500 text-xs sm:text-sm">Loading ad...</div>
      </div>
    );
  }

  if (error || !adData) {
    return (
      <div 
        className={`bg-yellow-400/90 border-2 sm:border-4 border-yellow-600 rounded-lg p-2 sm:p-6 mb-4 shadow-lg sm:shadow-2xl ${className}`}
        style={{
          backgroundColor: 'rgba(250, 204, 21, 0.95)',
          minHeight: dimensions.height,
          ...style
        }}
      >
        <div className="text-center">
          <div className="text-gray-900 font-bold text-sm sm:text-lg mb-1 sm:mb-2">🎯 ADVERTISEMENT 🎯</div>
          <div className="text-gray-800 text-xs sm:text-sm font-semibold">
            {error || 'No ads available'}
            <br className="hidden sm:block" />
            <span className="text-blue-900 text-xs">
              Ad space available!
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Build image URL - handle both absolute and relative URLs
  const imageUrl = adData.image_url.startsWith('http') 
    ? adData.image_url 
    : `${API_ENDPOINTS.AD_SERVER.replace('/api/v1', '')}${adData.image_url}`;

  return (
    <div 
      className={`ad-banner-container mb-4 flex items-center justify-center ${className}`}
      style={{
        minHeight: dimensions.height,
        ...style
      }}
    >
      <a
        ref={adRef}
        href={adData.click_url}
        onClick={(e) => {
          e.preventDefault();
          handleClick();
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
            setError('Failed to load ad image');
          }}
        />
      </a>
    </div>
  );
};

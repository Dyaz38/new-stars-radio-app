import { useEffect, useState, useRef } from 'react';
import { API_ENDPOINTS } from '../constants';

interface AdData {
  creative_id: string;
  campaign_id: string;
  image_url: string;
  click_url: string;
  alt_text?: string;
  width: number;
  height: number;
  impression_id: string;
}

interface AdBannerProps {
  style?: React.CSSProperties;
  className?: string;
  width?: number;  // Desired banner width
  height?: number; // Desired banner height
  city?: string;   // User's city for targeting
  state?: string;  // User's state for targeting
}

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
  width = 728,  // Standard banner width
  height = 90,  // Standard banner height
  city,
  state
}: AdBannerProps) => {
  const [adData, setAdData] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const adRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userId = getUserId();
        const params = new URLSearchParams({
          user_id: userId,
          width: width.toString(),
          height: height.toString(),
        });
        
        if (city) params.append('city', city);
        if (state) params.append('state', state);
        
        const response = await fetch(
          `${API_ENDPOINTS.AD_SERVER}/ads/serve?${params.toString()}`
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('No ads available');
          } else {
            throw new Error(`Failed to fetch ad: ${response.statusText}`);
          }
          return;
        }
        
        const data: AdData = await response.json();
        setAdData(data);
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
  }, [width, height, city, state]);

  const handleClick = async () => {
    if (!adData) return;
    
    try {
      // Track click
      await fetch(`${API_ENDPOINTS.AD_SERVER}/ads/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: getUserId(),
          creative_id: adData.creative_id,
          campaign_id: adData.campaign_id,
          impression_id: adData.impression_id,
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
        className={`bg-gray-100 border-2 border-gray-300 rounded-lg p-4 mb-4 flex items-center justify-center ${className}`}
        style={{ minHeight: height, ...style }}
      >
        <div className="text-gray-500 text-sm">Loading ad...</div>
      </div>
    );
  }

  if (error || !adData) {
    return (
      <div 
        className={`bg-yellow-400/90 border-4 border-yellow-600 rounded-lg p-6 mb-4 shadow-2xl ${className}`}
        style={{
          backgroundColor: 'rgba(250, 204, 21, 0.95)',
          minHeight: height,
          ...style
        }}
      >
        <div className="text-center">
          <div className="text-gray-900 font-bold text-lg mb-2">🎯 ADVERTISEMENT BANNER HERE 🎯</div>
          <div className="text-gray-800 text-sm font-semibold">
            {error || 'No ads available at this time'}
            <br />
            <span className="text-blue-900 text-xs">
              Ad space available - contact us to advertise!
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
      className={`ad-banner-container mb-4 ${className}`}
      style={style}
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
          width: adData.width || width,
          height: adData.height || height,
          margin: '0 auto',
        }}
      >
        <img
          src={imageUrl}
          alt={adData.alt_text || 'Advertisement'}
          width={adData.width}
          height={adData.height}
          className="w-full h-auto rounded-lg"
          style={{
            maxWidth: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
          onError={(e) => {
            console.error('Failed to load ad image:', imageUrl);
            setError('Failed to load ad image');
          }}
        />
      </a>
    </div>
  );
};

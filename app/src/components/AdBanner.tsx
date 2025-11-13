import { useEffect, useRef } from 'react';

interface AdBannerProps {
  adClient?: string; // Your Google AdSense client ID
  adSlot?: string;   // Your ad slot ID
  style?: React.CSSProperties;
  className?: string;
}

export const AdBanner = ({ 
  adClient = 'ca-pub-XXXXXXXXXXXXXXXX', // Replace with your AdSense ID
  adSlot = '0000000000',                 // Replace with your ad slot
  style,
  className = ''
}: AdBannerProps) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Push ad to AdSense when component mounts
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // If no ad client is set, show a placeholder
  if (adClient === 'ca-pub-XXXXXXXXXXXXXXXX') {
    return (
      <div 
        className={`bg-yellow-400/90 border-4 border-yellow-600 rounded-lg p-6 mb-4 shadow-2xl ${className}`}
        style={{
          backgroundColor: 'rgba(250, 204, 21, 0.95)',
          ...style
        }}
      >
        <div className="text-center">
          <div className="text-gray-900 font-bold text-lg mb-2">🎯 ADVERTISEMENT BANNER HERE 🎯</div>
          <div className="text-gray-800 text-sm font-semibold">
            📢 This space is ready for Google AdSense ads
            <br />
            <span className="text-blue-900">
              Add your AdSense ID to start earning!
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={adRef}
      className={`ad-banner-container mb-4 ${className}`}
      style={style}
    >
      <ins 
        className="adsbygoogle"
        style={{ 
          display: 'block',
          textAlign: 'center',
          ...style 
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

// TypeScript declaration for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}


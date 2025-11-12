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
        className={`bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 rounded-lg p-4 mb-4 ${className}`}
        style={style}
      >
        <div className="text-center">
          <div className="text-white/60 text-sm mb-2">📢 Advertisement Space</div>
          <div className="text-white/40 text-xs">
            Configure AdSense to show ads here
            <br />
            <span className="text-blue-400">
              Add your ad client ID in AdBanner.tsx
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


import React, { useState, memo } from 'react';
import { Download, X, Smartphone, Wifi, WifiOff } from 'lucide-react';

interface PWAPromptProps {
  isInstallable: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  onInstall: () => Promise<boolean>;
  onUpdate: () => void;
}

const PWAPromptComponent: React.FC<PWAPromptProps> = ({
  isInstallable,
  isOffline,
  updateAvailable,
  onInstall,
  onUpdate,
}) => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const installed = await onInstall();
    setInstalling(false);
    
    if (installed) {
      setShowInstallPrompt(false);
    }
  };

  return (
    <>
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="w-4 h-4" />
            <span>You're offline - Some features may be limited</span>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center space-x-4">
            <span>A new version of New Stars Radio is available!</span>
            <button
              onClick={onUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-50 transition-colors"
            >
              Update Now
            </button>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {isInstallable && showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Install New Stars Radio</h3>
                  <p className="text-sm opacity-90">Get the full app experience!</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close install prompt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center space-x-2 opacity-90">
                <span>✓</span>
                <span>Listen offline with cached content</span>
              </div>
              <div className="flex items-center space-x-2 opacity-90">
                <span>✓</span>
                <span>Get notifications for new songs</span>
              </div>
              <div className="flex items-center space-x-2 opacity-90">
                <span>✓</span>
                <span>Quick access from home screen</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 bg-white text-purple-600 px-4 py-2 rounded-xl font-semibold hover:bg-purple-50 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {installing ? (
                  <div className="w-4 h-4 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="px-4 py-2 text-white/80 hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-30">
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
          isOffline 
            ? 'bg-red-500/90 text-white' 
            : 'bg-green-500/90 text-white'
        }`}>
          {isOffline ? (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3" />
              <span>Live</span>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// Memoize PWAPrompt to prevent unnecessary re-renders
export const PWAPrompt = memo(PWAPromptComponent, (prevProps, nextProps) => {
  return (
    prevProps.isInstallable === nextProps.isInstallable &&
    prevProps.isOffline === nextProps.isOffline &&
    prevProps.updateAvailable === nextProps.updateAvailable &&
    prevProps.onInstall === nextProps.onInstall &&
    prevProps.onUpdate === nextProps.onUpdate
  );
});


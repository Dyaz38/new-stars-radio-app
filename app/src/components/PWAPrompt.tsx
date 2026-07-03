import React, { useState, memo, useEffect } from 'react';
import { Download, X, Smartphone, WifiOff } from 'lucide-react';
import { dismissInstallPrompt, isIosSafari, shouldShowInstallPrompt } from '../utils/pwa';
import { PWAInstallPanel } from './PWAInstallPanel';

interface PWAPromptProps {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  onInstall: () => Promise<boolean>;
  onUpdate: () => void;
}

const PWAPromptComponent: React.FC<PWAPromptProps> = ({
  isInstallable,
  isInstalled,
  isOffline,
  updateAvailable,
  onInstall,
  onUpdate,
}) => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInstalled) {
      setShowInstallPrompt(false);
      return;
    }
    const canPrompt = isInstallable || isIosSafari();
    setShowInstallPrompt(canPrompt && shouldShowInstallPrompt());
  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    dismissInstallPrompt();
    setShowInstallPrompt(false);
  };

  const handleInstall = async () => {
    setInstalling(true);
    const installed = await onInstall();
    setInstalling(false);

    if (installed) {
      setShowInstallPrompt(false);
    }
  };

  const showFloatingInstall =
    showInstallPrompt && !isInstalled && (isInstallable || isIosSafari());

  return (
    <>
      {isOffline ? (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-orange-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
            <span>You&apos;re offline — live stream needs a connection</span>
          </div>
        </div>
      ) : null}

      {updateAvailable ? (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-blue-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>A new version of New Stars Radio is available</span>
            <button
              type="button"
              onClick={onUpdate}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Update now
            </button>
          </div>
        </div>
      ) : null}

      {showFloatingInstall ? (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40">
          <div className="rounded-2xl border border-white/10 bg-gray-900/95 p-4 text-white shadow-2xl backdrop-blur-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="rounded-lg bg-pink-500/20 p-2 shrink-0">
                  <Smartphone className="w-5 h-5 text-pink-200" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg leading-snug">Install New Stars Radio</h3>
                  <p className="text-xs sm:text-sm text-gray-400">Home-screen access in one tap</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                aria-label="Dismiss install prompt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PWAInstallPanel
              compact
              isInstallable={isInstallable}
              isInstalled={isInstalled}
              updateAvailable={false}
              onInstall={onInstall}
              onUpdate={onUpdate}
            />

            {isInstallable ? (
              <button
                type="button"
                onClick={() => void handleInstall()}
                disabled={installing}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                {installing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600/30 border-t-purple-600" />
                ) : (
                  <>
                    <Download className="w-4 h-4" aria-hidden />
                    <span>Install now</span>
                  </>
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-2 w-full py-1 text-center text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export const PWAPrompt = memo(PWAPromptComponent, (prevProps, nextProps) => {
  return (
    prevProps.isInstallable === nextProps.isInstallable &&
    prevProps.isInstalled === nextProps.isInstalled &&
    prevProps.isOffline === nextProps.isOffline &&
    prevProps.updateAvailable === nextProps.updateAvailable &&
    prevProps.onInstall === nextProps.onInstall &&
    prevProps.onUpdate === nextProps.onUpdate
  );
});

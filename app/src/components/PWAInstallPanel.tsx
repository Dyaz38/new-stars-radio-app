import { Download, Share, Smartphone, CheckCircle2 } from 'lucide-react';
import { isIosSafari } from '../utils/pwa';

interface PWAInstallPanelProps {
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  onInstall: () => Promise<boolean>;
  onUpdate: () => void;
  compact?: boolean;
}

export function PWAInstallPanel({
  isInstallable,
  isInstalled,
  updateAvailable,
  onInstall,
  onUpdate,
  compact = false,
}: PWAInstallPanelProps) {
  const showIosGuide = !isInstalled && isIosSafari();

  if (isInstalled && !updateAvailable) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-300 ${compact ? '' : 'bg-white/5 rounded-xl p-3 sm:p-4'}`}>
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
        <span>App installed — open from your home screen anytime.</span>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'bg-white/5 rounded-xl p-3 sm:p-4 space-y-3'}>
      {!compact ? (
        <h4 className="text-xs sm:text-sm font-semibold text-pink-300 flex items-center gap-2">
          <Smartphone className="w-4 h-4 shrink-0" />
          Install app
        </h4>
      ) : null}

      {updateAvailable ? (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
          <p className="text-sm text-blue-100 mb-2">A new version is ready.</p>
          <button
            type="button"
            onClick={onUpdate}
            className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400 transition-colors"
          >
            Update now
          </button>
        </div>
      ) : null}

      {isInstallable && !compact ? (
        <button
          type="button"
          onClick={() => void onInstall()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white hover:from-pink-600 hover:to-purple-600 transition-colors"
        >
          <Download className="w-4 h-4" aria-hidden />
          Install New Stars Radio
        </button>
      ) : null}

      {showIosGuide ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
          <p className="font-medium text-white mb-2 flex items-center gap-2">
            <Share className="w-4 h-4 shrink-0" aria-hidden />
            Add to Home Screen (iPhone / iPad)
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm text-gray-400">
            <li>Tap the <strong className="text-gray-300">Share</strong> button in Safari (square with arrow)</li>
            <li>Scroll down and tap <strong className="text-gray-300">Add to Home Screen</strong></li>
            <li>Tap <strong className="text-gray-300">Add</strong></li>
          </ol>
        </div>
      ) : null}

      {!isInstallable && !showIosGuide && !isInstalled ? (
        <p className="text-xs sm:text-sm text-gray-400">
          In Chrome or Edge, open the browser menu and choose <strong className="text-gray-300">Install New Stars Radio</strong> or <strong className="text-gray-300">Install app</strong>.
        </p>
      ) : null}

      {!compact ? (
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• One-tap access from your home screen</li>
          <li>• Full-screen experience without the browser bar</li>
          <li>• Show and event reminders while installed</li>
        </ul>
      ) : null}
    </div>
  );
}

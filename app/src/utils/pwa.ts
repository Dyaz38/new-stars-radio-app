const INSTALL_DISMISS_KEY = 'nsr-pwa-install-dismissed-at';
const INSTALL_DISMISS_DAYS = 7;

/** Production listener domain only — not Vercel previews or localhost. */
export function isProductionListenerHost(): boolean {
  const host = window.location.hostname.toLowerCase();
  return host === 'newstarsradio.com' || host === 'www.newstarsradio.com';
}

/** Dev server, Vercel preview URLs, etc. — service worker must not run here. */
export function isPreviewOrDevHost(): boolean {
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app')
  );
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/** iPhone/iPad Safari — no beforeinstallprompt; show manual steps. */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  // Exclude Chrome/Firefox/Edge on iOS — they use WebKit but may differ
  return !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function shouldShowInstallPrompt(): boolean {
  if (isStandalonePwa()) return false;
  const dismissedAt = localStorage.getItem(INSTALL_DISMISS_KEY);
  if (!dismissedAt) return true;
  const elapsed = Date.now() - Number(dismissedAt);
  return Number.isNaN(elapsed) || elapsed > INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
}

export function clearInstallPromptDismiss(): void {
  localStorage.removeItem(INSTALL_DISMISS_KEY);
}

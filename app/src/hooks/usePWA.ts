import { useState, useEffect, useCallback, useRef } from 'react';
import { isProductionListenerHost, isStandalonePwa } from '../utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  swRegistration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
}

export const usePWA = () => {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    swRegistration: null,
    updateAvailable: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const pendingReloadRef = useRef(false);

  const refreshInstalledState = useCallback(() => {
    setPWAState(prev => ({ ...prev, isInstalled: isStandalonePwa() }));
  }, []);

  // Register service worker only on the production listener domain
  useEffect(() => {
    if (
      import.meta.env.DEV ||
      !isProductionListenerHost() ||
      (window as Window & { __NSR_DISABLE_SW__?: boolean }).__NSR_DISABLE_SW__
    ) {
      console.log('[PWA] Skipping service worker registration outside production host');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration);
          setPWAState(prev => ({ ...prev, swRegistration: registration }));

          void registration.update();

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New service worker available');
                  setPWAState(prev => ({ ...prev, updateAvailable: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'METADATA_UPDATED') {
          console.log('[PWA] Metadata updated from background sync');
          // You can dispatch a custom event here to refresh metadata
          window.dispatchEvent(new CustomEvent('pwa-metadata-updated'));
        }
      });
    }
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setPWAState(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setPWAState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setDeferredPrompt(null);
    };

    const handleDisplayModeChange = () => refreshInstalledState();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    refreshInstalledState();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, [refreshInstalledState]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setPWAState(prev => ({ ...prev, isOffline: false }));
      console.log('[PWA] Back online');
      
      // Trigger background sync when back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            return (registration as any).sync.register('metadata-sync');
          }
        }).catch((error) => {
          console.error('[PWA] Background sync registration failed:', error);
        });
      }
    };

    const handleOffline = () => {
      setPWAState(prev => ({ ...prev, isOffline: true }));
      console.log('[PWA] Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkForUpdates = () => {
      pwaState.swRegistration?.update().catch((error) => {
        console.error('[PWA] Update check failed:', error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
        refreshInstalledState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pwaState.swRegistration, refreshInstalledState]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      if (!pendingReloadRef.current) return;
      pendingReloadRef.current = false;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  // Install the app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] User choice:', outcome);
      
      if (outcome === 'accepted') {
        setPWAState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      }
      
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update the service worker
  const updateServiceWorker = useCallback(() => {
    if (pwaState.swRegistration?.waiting) {
      pendingReloadRef.current = true;
      pwaState.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setPWAState(prev => ({ ...prev, updateAvailable: false }));
      return;
    }

    void pwaState.swRegistration?.update();
    window.location.reload();
  }, [pwaState.swRegistration]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('[PWA] Notification permission:', permission);
      return permission === 'granted';
    }
    return false;
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!pwaState.swRegistration) {
      console.log('[PWA] No service worker registration available');
      return null;
    }

    try {
      const subscription = await pwaState.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          'YOUR_VAPID_PUBLIC_KEY_HERE' // You'll need to generate this
        ),
      });

      console.log('[PWA] Push subscription:', subscription);
      
      // Send subscription to your server
      // await fetch('/api/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(subscription),
      // });

      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }, [pwaState.swRegistration]);

  return {
    ...pwaState,
    installApp,
    updateServiceWorker,
    requestNotificationPermission,
    subscribeToPush,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

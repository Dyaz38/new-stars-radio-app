const CACHE_NAME = 'new-stars-radio-v6';
const urlsToCache = [
  '/manifest.json',
  '/station-icon-192.png',
  '/station-icon-512.png',
  '/apple-touch-icon.png',
  '/promo/newstars-house-320x50.png',
  '/promo/newstars-house-728x90.png',
];

function shouldBypassServiceWorker(url) {
  return (
    url.hostname.includes('railway.app') ||
    url.hostname.includes('airtime.pro') ||
    url.hostname.includes('musicbrainz.org') ||
    url.hostname.includes('coverartarchive.org') ||
    url.hostname.includes('itunes.apple.com') ||
    url.hostname.includes('genius.com') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.endsWith('.vercel.app') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('vite') ||
    url.pathname.includes('react-refresh')
  );
}

function canCacheResponse(request, response) {
  return (
    response &&
    response.status === 200 &&
    response.type === 'basic' &&
    (request.url.startsWith('http://') || request.url.startsWith('https://'))
  );
}

function isHtmlRequest(request) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html')
  );
}

// Install service worker and cache static icons only (not index.html)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first for HTML and build assets so deploys never serve stale bundles
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (shouldBypassServiceWorker(url)) return;

  if (isHtmlRequest(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (canCacheResponse(event.request, response)) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return response;
        })
        .catch((error) => {
          console.error('Service Worker fetch error:', error);
          if (cached) return cached;
          throw error;
        });

      return cached || networkFetch;
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  if (action === 'play' || action === 'like' || !action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(data?.url || '/') && 'focus' in client) {
              return client.focus();
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(data?.url || '/');
          }
        })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event.notification.data);
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title || 'New Stars Radio', {
        body: data.body || 'New update available',
        icon: data.icon || '/vite.svg',
        badge: '/vite.svg',
        tag: data.tag || 'push-notification',
        data: data.data || {},
        actions: data.actions || [{ action: 'open', title: 'Open App' }],
      })
    );
  } catch (error) {
    console.error('Service Worker: Push message error:', error);
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
  }
});

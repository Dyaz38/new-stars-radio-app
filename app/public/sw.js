const CACHE_NAME = 'new-stars-radio-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/vite.svg'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All resources cached');
        return self.skipWaiting();
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Handle fetch requests (cache-first strategy)
self.addEventListener('fetch', (event) => {
  // Skip service worker for Vite dev server requests (localhost in development)
  const url = new URL(event.request.url);
  if (url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1' ||
      url.pathname.startsWith('/@') ||
      url.pathname.includes('vite') ||
      url.pathname.includes('react-refresh')) {
    // Let Vite dev server handle these requests directly
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached resource if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response for cache
          const responseToCache = response.clone();
          
          // Cache static resources only
          if (event.request.url.includes('static') || 
              event.request.url.includes('assets') ||
              event.request.url.includes('vite.svg')) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        }).catch((error) => {
          // If fetch fails, return error response
          console.error('Service Worker fetch error:', error);
          throw error;
        });
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.notification.data);
  
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  // Handle different actions
  if (action === 'play' || action === 'like' || !action) {
    // Focus or open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes(data?.url || '/') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Otherwise open new window
          if (clients.openWindow) {
            return clients.openWindow(data?.url || '/');
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event.notification.data);
});

// Handle push messages (for future implementation)
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
        actions: data.actions || [
          { action: 'open', title: 'Open App' }
        ]
      })
    );
  } catch (error) {
    console.error('Service Worker: Push message error:', error);
  }
});

// Handle background sync (for future implementation)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    // Could be used for syncing liked songs, preferences, etc.
  }
});


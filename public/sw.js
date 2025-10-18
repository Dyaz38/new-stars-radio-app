const CACHE_NAME = 'new-stars-radio-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .catch((error) => {
        console.error('[SW] Failed to cache resources:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and non-GET requests
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/') || event.request.url.includes('/embed/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If online, return the response and cache it
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to get from cache
          return caches.match(event.request).then((response) => {
            if (response) {
              return response;
            }
            // Return a default response for API calls when offline
            return new Response(JSON.stringify({
              current: {
                name: 'New Stars Radio - Offline',
                metadata: {
                  artist_name: 'New Stars Radio',
                  track_title: 'Please connect to the internet'
                }
              },
              next: null,
              listeners: 0
            }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
            });
          });
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page for HTML requests
        if (event.request.destination === 'document') {
          return caches.match('/').then((response) => {
            return response || new Response('Offline - Please check your connection', {
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': 'text/html'
              })
            });
          });
        }
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'metadata-sync') {
    event.waitUntil(
      // Fetch fresh metadata when connection is restored
      fetch('/api/live-info').then((response) => {
        if (response.ok) {
          console.log('[SW] Metadata synced in background');
          // Send message to all clients that metadata is updated
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'METADATA_UPDATED',
                data: 'Fresh metadata available'
              });
            });
          });
        }
      }).catch((error) => {
        console.log('[SW] Background sync failed:', error);
      })
    );
  }
});

// Push notifications for new songs/shows
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  const options = {
    body: event.data ? event.data.text() : 'New song playing on New Stars Radio!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'listen',
        title: 'Listen Now',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('New Stars Radio', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received');
  
  event.notification.close();

  if (event.action === 'listen') {
    // Open the radio app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification (already done above)
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


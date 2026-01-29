/**
 * Service Worker for offline-first PWA
 * Handles caching, offline support, and background sync
 */

const CACHE_NAME = 'shopping-list-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Files to cache immediately
const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/src/main.ts',
  '/src/styles.css',
  '/src/state.ts',
  '/src/storage.ts',
  '/src/sync.ts',
  '/src/crypto.ts',
  '/src/ui.ts'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(PRECACHE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip WebSocket and other non-HTTP requests
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          event.waitUntil(
            fetch(event.request)
              .then((response) => {
                if (response && response.status === 200) {
                  caches.open(RUNTIME_CACHE)
                    .then((cache) => cache.put(event.request, response));
                }
              })
              .catch(() => {
                // Network error, but we have cache
              })
          );
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            
            // Return offline page if available
            return caches.match('/index.html');
          });
      })
  );
});

/**
 * Background Sync event - sync data when connection is restored
 */
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-shopping-list') {
    event.waitUntil(
      syncData()
        .then(() => {
          console.log('Background sync completed');
          return self.registration.showNotification('Shopping List', {
            body: 'Your list has been synced',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png'
          });
        })
        .catch((error) => {
          console.error('Background sync failed:', error);
        })
    );
  }
});

/**
 * Push event - handle push notifications
 */
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Shopping list updated',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Shopping List', options)
  );
});

/**
 * Notification click event
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

/**
 * Sync data function
 */
async function syncData() {
  // This would trigger the sync manager in the main app
  const allClients = await clients.matchAll({
    includeUncontrolled: true,
    type: 'window'
  });
  
  allClients.forEach((client) => {
    client.postMessage({
      type: 'sync-request'
    });
  });
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

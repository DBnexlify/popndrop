// =============================================================================
// ADMIN SERVICE WORKER - SIMPLIFIED & ROBUST
// /public/admin/sw.js
// =============================================================================

const CACHE_NAME = 'popndrop-admin-v1';

// Only cache actual static files that we know exist
const STATIC_ASSETS = [
  '/admin/icon-192.png',
  '/admin/icon-512.png',
  '/admin/badge-72.png',
  '/admin/manifest.json',
];

// =============================================================================
// INSTALL - Cache static assets only
// =============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Use addAll but catch errors so install doesn't fail
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some assets failed to cache:', err);
          // Don't throw - let install succeed anyway
        });
      })
      .then(() => {
        console.log('[SW] Install complete, skipping waiting');
        return self.skipWaiting();
      })
  );
});

// =============================================================================
// ACTIVATE - Take control immediately
// =============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((names) => {
        return Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all pages
      self.clients.claim(),
    ]).then(() => {
      console.log('[SW] Activated and controlling all clients');
    })
  );
});

// =============================================================================
// FETCH - Network first, don't cache HTML
// =============================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;
  
  // Only handle admin routes
  if (!url.pathname.startsWith('/admin')) return;
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // For static assets, try cache first
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset.split('/').pop()))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
    return;
  }
  
  // For everything else (HTML pages, API calls), use network only
  // Don't try to cache auth-protected pages
});

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Pop & Drop Admin',
    body: 'You have a new notification',
    icon: '/admin/icon-192.png',
    badge: '/admin/badge-72.png',
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
      console.log('[SW] Push payload:', data);
    } catch (e) {
      console.error('[SW] Push parse error:', e);
      data.body = event.data.text() || data.body;
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag || 'default',
      data: data.data || { url: '/admin' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// =============================================================================
// NOTIFICATION CLICK
// =============================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  const url = event.notification.data?.url || '/admin';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if found
        for (const client of windowClients) {
          if (client.url.includes('/admin') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(url);
      })
  );
});

// =============================================================================
// MESSAGE HANDLER
// =============================================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Respond to ping for health check
  if (event.data?.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', status: 'active' });
  }
});

console.log('[SW] Service worker script loaded');

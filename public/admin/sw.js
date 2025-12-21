// =============================================================================
// ADMIN SERVICE WORKER - ROBUST & FEATURE-RICH
// /public/admin/sw.js
// =============================================================================

const CACHE_NAME = 'popndrop-admin-v2';

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
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some assets failed to cache:', err);
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
// FETCH - Network first for pages, cache first for static assets
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
  const isStaticAsset = STATIC_ASSETS.some(asset => 
    url.pathname === asset || url.pathname.endsWith(asset.split('/').pop())
  );
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
  // For everything else, use network (don't cache auth-protected pages)
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
    tag: 'default',
    data: { url: '/admin' },
    actions: [],
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
      console.log('[SW] Push payload:', data.title);
    } catch (e) {
      console.error('[SW] Push parse error:', e);
      data.body = event.data.text() || data.body;
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/admin/icon-192.png',
    badge: data.badge || '/admin/badge-72.png',
    tag: data.tag || 'default',
    data: data.data || { url: '/admin' },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// =============================================================================
// NOTIFICATION CLICK - Handle actions
// =============================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked, action:', event.action);
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  
  // Handle "Add to Calendar" action
  if (event.action === 'calendar' && notificationData.calendarEvent) {
    const cal = notificationData.calendarEvent;
    const calendarUrl = `/api/calendar?` + new URLSearchParams({
      title: cal.title,
      start: cal.start,
      end: cal.end || cal.start,
      location: cal.location || '',
      description: cal.description || '',
    }).toString();
    
    event.waitUntil(
      clients.openWindow(calendarUrl)
    );
    return;
  }
  
  // Default: open the URL from notification data
  const urlToOpen = notificationData.url || '/admin';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing admin window if found
        for (const client of windowClients) {
          if (client.url.includes('/admin') && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              // Navigate to the specific URL
              if (focusedClient && 'navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        // Open new window
        return clients.openWindow(urlToOpen);
      })
  );
});

// =============================================================================
// NOTIFICATION CLOSE
// =============================================================================
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
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

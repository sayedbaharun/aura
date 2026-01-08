// SB-OS Service Worker
const CACHE_NAME = 'sb-os-v4';
const STATIC_CACHE = 'sbos-static-v4';
const DYNAMIC_CACHE = 'sbos-dynamic-v4';

// Assets to cache immediately on install (static assets only, NOT HTML routes)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.log('[SW] Cache install failed:', err))
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => !currentCaches.includes(key))
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first for HTML and API, cache first for static assets only
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip external font requests (Google Fonts) - let browser handle directly
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return;

  // API requests - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // HTML navigation requests - ALWAYS network first to get latest app version
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // JS/CSS bundles with hash in filename - cache forever (immutable)
  if (url.pathname.match(/\.[a-f0-9]{8,}\.(js|css)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Other static assets - network first with cache fallback
  event.respondWith(networkFirst(request));
});

// Network first strategy (for API calls)
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Fallback to cache if network fails
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return offline response for API
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No network connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache first strategy (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Return offline page if available
    const offlinePage = await caches.match('/');
    if (offlinePage) return offlinePage;

    return new Response('Offline', { status: 503 });
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

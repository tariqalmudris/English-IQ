// sw.js — منصة دروسي العراقية — English IQ Iraq Service Worker
// Strategy: Cache-First for static assets, Network-First for pages

const CACHE_NAME = 'englishiq-v10';
const OFFLINE_PAGE = './offline.html';

// Only core system files are pre-cached perfectly on install.
// Lessons and other dynamic content will be CACHED AUTOMATICALLY on first visit.
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './middle-stage.html',
  './secondary-stage.html',
  './grade-template.html',
  './favorites.html',
  './about.html',
  './terms.html',
  './offline.html',
  './style.css',
  './script.js',
  './favorites.js',
  './nav.js',
  './pwa.js',
  './manifest.json',
  './data/lessons.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
];

// ─── Install: pre-cache all static assets ───────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ─── Activate: clean up old caches ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // take control of all open pages
  );
});

// ─── Fetch: smart routing strategy ──────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin (except Google Fonts), chrome-extension
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com') &&
      !url.hostname.includes('cdn.jsdelivr.net')) return;

  // Google Fonts — Cache-First (they rarely change)
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(cacheFirst(request, 'englishiq-external-v1'));
    return;
  }

  // HTML pages — Network-First with aggressive caching
  if (request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    // For anything in the /lessons/ folder, use Stale-While-Revalidate for better offline UX
    if (url.pathname.includes('/lessons/')) {
      event.respondWith(staleWhileRevalidate(request));
    } else {
      event.respondWith(networkFirstWithFallback(request));
    }
    return;
  }

  // Static assets (CSS, JS, images) — Cache-First
  event.respondWith(cacheFirst(request, CACHE_NAME));
});

// ─── Strategy: Cache-First ───────────────────────────────────────────────────
async function cacheFirst(request, cacheName = CACHE_NAME) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // No cache hit, no network — nothing we can do for non-pages
    return new Response('Offline', { status: 503 });
  }
}

// ─── Strategy: Network-First with offline fallback ──────────────────────────
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline — serve cached page if available
    const cached = await caches.match(request);
    if (cached) return cached;

    // Try the exact URL without query string (useful for grade-template.html?grade=...)
    const urlWithoutQuery = request.url.split('?')[0];
    const cachedPlain = await caches.match(urlWithoutQuery);
    if (cachedPlain) return cachedPlain;

    // Final fallback: offline page
    return caches.match(OFFLINE_PAGE);
  }
}

// ─── Strategy: Stale-While-Revalidate (Auto-cache lessons) ────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // If network fails and we have no cache, return the offline page instead of 'undefined'
    return caches.match(OFFLINE_PAGE);
  });

  // Return cached version immediately, or wait for network if not in cache
  return cachedResponse || fetchPromise;
}

// ─── Background Sync (placeholder for future use) ────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-favorites') {
    // Future: sync favorites to a backend
    console.log('[SW] Background sync triggered:', event.tag);
  }
});

// ─── Push Notifications (placeholder) ────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'English IQ Iraq', body: 'درس جديد متاح!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
    })
  );
});

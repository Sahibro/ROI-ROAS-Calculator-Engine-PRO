/* ═══════════════════════════════════════════════════════════════════
   MarketIQ Pro — sw.js
   Production Service Worker (PWA Offline Support)
   Version: 1.0.0
   Strategy: Cache First for assets, Network First for HTML
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Cache Configuration ── */
const CACHE_NAME         = 'marketiq-pro-v1.0.0';
const STATIC_CACHE_NAME  = 'marketiq-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'marketiq-dynamic-v1.0.0';

/** Files to pre-cache on install */
const PRECACHE_URLS = [
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
];

/** CDN resources to cache on first fetch */
const CDN_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js',
];

/** Max items in dynamic cache */
const DYNAMIC_CACHE_LIMIT = 30;

/* ══════════════════════════════════════════════════════════════════
   INSTALL EVENT — Pre-cache static assets
   ══════════════════════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        /* Cache core app files */
        await staticCache.addAll(PRECACHE_URLS);

        /* Cache CDN files individually (don't fail if one is unavailable) */
        const cdnCache = await caches.open(DYNAMIC_CACHE_NAME);
        await Promise.allSettled(
          CDN_URLS.map(url =>
            fetch(url, { mode: 'cors' })
              .then(res => {
                if (res.ok) return cdnCache.put(url, res);
              })
              .catch(() => { /* CDN fetch failed silently */ })
          )
        );

      } catch (_) {
        /* Pre-cache failure is non-fatal */
      }
    })()
  );

  /* Force activate immediately without waiting for old SW */
  self.skipWaiting();
});

/* ══════════════════════════════════════════════════════════════════
   ACTIVATE EVENT — Clean up old caches
   ══════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      /* Remove all old caches not matching current version */
      const validCaches = new Set([
        CACHE_NAME,
        STATIC_CACHE_NAME,
        DYNAMIC_CACHE_NAME,
      ]);

      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => !validCaches.has(name))
          .map(name => caches.delete(name))
      );

      /* Take control of all clients immediately */
      await self.clients.claim();
    })()
  );
});

/* ══════════════════════════════════════════════════════════════════
   FETCH EVENT — Intercept network requests
   ══════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url         = new URL(request.url);

  /* Only handle GET requests */
  if (request.method !== 'GET') return;

  /* Skip chrome-extension and non-http(s) schemes */
  if (!url.protocol.startsWith('http')) return;

  /* ── Strategy Router ── */

  /* HTML files: Network First (always fresh) */
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* Static app assets: Cache First */
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')  ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /* Google Fonts & CDN: Cache First with fallback */
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')    ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /* All other requests: Network First */
  event.respondWith(networkFirst(request));
});

/* ══════════════════════════════════════════════════════════════════
   CACHE STRATEGIES
   ══════════════════════════════════════════════════════════════════ */

/**
 * Cache First strategy:
 * Return from cache if available, otherwise fetch and cache.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
const cacheFirst = async (request) => {
  try {
    /* Check static cache first */
    const staticCache  = await caches.open(STATIC_CACHE_NAME);
    const staticMatch  = await staticCache.match(request);
    if (staticMatch) return staticMatch;

    /* Check dynamic cache */
    const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);
    const dynamicMatch = await dynamicCache.match(request);
    if (dynamicMatch) return dynamicMatch;

    /* Not in cache — fetch from network */
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      /* Cache the new response */
      const responseClone = networkResponse.clone();
      await dynamicCache.put(request, responseClone);
      await trimCache(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
    }
    return networkResponse;

  } catch (_) {
    /* Network failed — return offline fallback */
    return offlineFallback(request);
  }
};

/**
 * Network First strategy:
 * Try network first; on failure return from cache.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
const networkFirst = async (request) => {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      /* Update cache with fresh response */
      const dynamicCache  = await caches.open(DYNAMIC_CACHE_NAME);
      const responseClone = networkResponse.clone();
      await dynamicCache.put(request, responseClone);
      await trimCache(DYNAMIC_CACHE_NAME, DYNAMIC_CACHE_LIMIT);
    }

    return networkResponse;

  } catch (_) {
    /* Network failed — try cache */
    const cached = await caches.match(request);
    if (cached) return cached;

    /* Nothing in cache either — offline fallback */
    return offlineFallback(request);
  }
};

/**
 * Offline fallback response
 * @param {Request} request
 * @returns {Response}
 */
const offlineFallback = (request) => {
  const accept = request.headers.get('Accept') || '';

  if (accept.includes('text/html')) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>Offline — MarketIQ Pro</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{
            font-family:'Inter',sans-serif;
            background:#0A0A0F;color:#F0F0FF;
            min-height:100vh;display:flex;
            align-items:center;justify-content:center;
            text-align:center;padding:2rem;
          }
          .wrap{max-width:480px}
          .icon{font-size:4rem;margin-bottom:1.5rem}
          h1{font-size:1.75rem;font-weight:800;margin-bottom:1rem;
             background:linear-gradient(135deg,#6C63FF,#00D4AA);
             -webkit-background-clip:text;-webkit-text-fill-color:transparent;
             background-clip:text}
          p{color:#A0A0C0;line-height:1.7;margin-bottom:1.5rem}
          button{
            padding:.75rem 2rem;
            background:linear-gradient(135deg,#6C63FF,#8B85FF);
            color:#fff;border:none;border-radius:12px;
            font-size:1rem;font-weight:600;cursor:pointer
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="icon">📡</div>
          <h1>You're Offline</h1>
          <p>MarketIQ Pro requires an internet connection for the first load. Please check your connection and try again.</p>
          <button onclick="window.location.reload()">🔄 Try Again</button>
        </div>
      </body>
      </html>`,
      {
        status:  503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  /* For non-HTML requests, return empty 503 */
  return new Response('Service Unavailable', { status: 503 });
};

/* ══════════════════════════════════════════════════════════════════
   CACHE MANAGEMENT
   ══════════════════════════════════════════════════════════════════ */

/**
 * Trim a cache to a maximum number of entries (FIFO)
 * @param {string} cacheName
 * @param {number} maxItems
 */
const trimCache = async (cacheName, maxItems) => {
  try {
    const cache   = await caches.open(cacheName);
    const keys    = await cache.keys();
    if (keys.length > maxItems) {
      const toDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  } catch (_) { /* trim failed silently */ }
};

/* ══════════════════════════════════════════════════════════════════
   MESSAGE HANDLER — Communication with main thread
   ══════════════════════════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  switch (event.data.type) {
    /* Force skip waiting and activate new SW */
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    /* Clear all caches on demand */
    case 'CLEAR_CACHE':
      caches.keys().then(names =>
        Promise.all(names.map(name => caches.delete(name)))
      ).then(() => {
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    /* Get cache status */
    case 'GET_VERSION':
      event.source?.postMessage({
        type:    'VERSION_INFO',
        version: CACHE_NAME,
      });
      break;
  }
});

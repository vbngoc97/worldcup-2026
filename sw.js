const CACHE_NAME = 'wc2026-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/styles.css',
  './src/main.js',
  './src/services/dataService.js',
  './src/utils/time.js',
  './src/utils/standings.js',
  './src/data/worldcup-2026.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request.url, fetchRes.clone());
            return fetchRes;
          });
        });
      }).catch(() => {
        // Fallback for offline if not in cache
        return new Response('Offline content not available');
      })
  );
});

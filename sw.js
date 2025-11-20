const CACHE_NAME = 'bsclab-v3';
const ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './scripts/auth.js',
  './scripts/mixer-ui.js',
  './scripts/structures.js',
  './scripts/structures-loader.js',
  './scripts/nso-navigator.js',
  './nso-navigator.html',
  './manifest.json',
  './scripts/tracks/Track.js',
  './scripts/tracks/TrackManager.js',
  './scripts/tracks/AudioTrack.js',
  './scripts/tracks/VisualTrack.js',
  './scripts/tracks/HapticTrack.js',
  './scripts/engines/AudioEngine.js',
  './scripts/engines/VideoEngine.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force new SW to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(), // Take control of all clients immediately
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Hack to fix stale manifest requests for old icon name
  if (event.request.url.includes('icon-192.png')) {
    event.respondWith(
      caches.match('./external/biosyncare/icons/icon-192x192.png').then(response => {
        return response || fetch('./external/biosyncare/icons/icon-192x192.png');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Return 404 or offline page if fetch fails
        return new Response('Offline', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});

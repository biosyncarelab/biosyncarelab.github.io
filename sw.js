const CACHE_NAME = 'bsclab-v2';
const ASSETS = [
  './',
  './index.html',
  './styles/main.css',
  './scripts/auth.js',
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

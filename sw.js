const CACHE = 'villa-matanza-v1';
const ASSETS = [
  '/el-asesino-de-villa-matanza/',
  '/el-asesino-de-villa-matanza/index.html',
  '/el-asesino-de-villa-matanza/style.css',
  '/el-asesino-de-villa-matanza/js/game.js',
  '/el-asesino-de-villa-matanza/js/roles.js',
  '/el-asesino-de-villa-matanza/instrucciones.html',
  '/el-asesino-de-villa-matanza/favicon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

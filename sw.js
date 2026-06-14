// Eenvoudige service worker: maakt de app installeerbaar en offline-bruikbaar.
const CACHE = 'bazar-bizarre-v15';
const ASSETS = ['./','./index.html','./home.html','./manifest.json',
  './inventaris-data.js','./inventaris.js','./assets/icon-192.png','./assets/icon-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
// Netwerk eerst: altijd de nieuwste versie tonen, en de cache bijwerken.
// Geen internet? Dan valt hij terug op de laatst bewaarde versie (offline).
self.addEventListener('fetch', e=>{
  e.respondWith(
    fetch(e.request).then(r=>{
      const copy = r.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy));
      return r;
    }).catch(()=>caches.match(e.request))
  );
});

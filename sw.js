// Service worker: installeerbaar + offline, maar ALTIJD de nieuwste versie tonen als er internet is.
const CACHE = 'bazar-bizarre-v52';
const ASSETS = ['./','./index.html','./home.html','./manifest.json',
  './inventaris-data.js','./inventaris.js','./assets/icon-192.png','./assets/icon-512.png'];

// Bij installatie: alles vers ophalen (geen browser-cache) en bewaren.
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>
    Promise.all(ASSETS.map(u=>
      fetch(new Request(u,{cache:'no-store'})).then(r=>{ if(r.ok) return c.put(u,r); }).catch(()=>{})
    ))
  ));
  self.skipWaiting();
});

// Bij activatie: alle OUDE caches wissen en meteen de controle overnemen.
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

// Netwerk eerst, en ALTIJD langs de browser-cache heen (no-store), zodat een
// oude/kapotte versie nooit blijft plakken. Geen internet? Dan de laatst bewaarde versie.
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request,{cache:'no-store'}).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return r;
    }).catch(()=>caches.match(e.request))
  );
});

// Service worker: installeerbaar + offline, maar ALTIJD de nieuwste versie tonen als er internet is.
const CACHE = 'bazar-bizarre-v3.6';
// De foto's van Ronde 1 (Super Deals) meteen mee opslaan, zodat ze ook offline werken
// zonder dat je ze eerst online moet hebben geopend.
const DEALS = Array.from({length:30},(_,i)=>`./deals/deal-${String(i+1).padStart(2,'0')}.png`);
const ASSETS = ['./','./index.html','./entertainment.html','./bazar-bizarre-spel.html','./projecten.html','./ratings.html','./manifest.json',
  './js/inventaris-data.js','./js/inventaris.js','./js/projecten.js','./js/ratings.js','./js/supabase.min.js',
  './assets/icon-192.png','./assets/icon-512.png','./assets/Logo_kleine_tekst.png']
  .concat(DEALS);

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

// Twee snelheden, want niet alles is even gevoelig voor "oud":
//
//  • PAGINA'S (html) — netwerk eerst, zodat je nooit met verouderde code werkt. Maar mét
//    een tijdslimiet van 1,5 s: op een trage wifi kreeg je vroeger een wit scherm tot het
//    verzoek klaar was. Nu tonen we na die limiet de bewaarde versie, en de app haalt
//    zichzelf even later stil bij (zie checkForUpdate in entertainment.html).
//    (Stond op 2,5 s — dat was net die paar tellen wachten die je op de wifi ter plaatse voelde.)
//  • DE REST (js, afbeeldingen, manifest) — bewaarde versie eerst, dus meteen op het
//    scherm, en ondertussen op de achtergrond verversen. Dit scheelt het meest:
//    supabase.min.js alleen al is ruim 200 kB, en die verandert bijna nooit.
const PAGINA_LIMIET = 1500;

function isPagina(req){
  if(req.mode==='navigate') return true;
  const u=new URL(req.url);
  return /\.html?$/.test(u.pathname) || u.pathname==='/' || u.pathname.endsWith('/');
}
// Ophalen én bewaren. Geeft null terug als het niet lukt.
function haalEnBewaar(req){
  return fetch(req,{cache:'no-store'}).then(r=>{
    if(r && r.ok){ const kopie=r.clone(); caches.open(CACHE).then(c=>c.put(req,kopie)).catch(()=>{}); }
    return r;
  }).catch(()=>null);
}

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  // De versiecontrole van de app gebruikt ?_v=… — die moet altijd vers zijn en hoort
  // niet in de cache thuis (anders groeit die aan met één kopie per controle).
  if(new URL(req.url).searchParams.has('_v')) return;

  if(isPagina(req)){
    e.respondWith((async()=>{
      const vers=haalEnBewaar(req);
      const opTijd=await Promise.race([vers, new Promise(r=>setTimeout(()=>r(null),PAGINA_LIMIET))]);
      if(opTijd) return opTijd;
      e.waitUntil(vers);                       // laat het ophalen gerust doorlopen
      return (await caches.match(req)) || vers.then(r=>r||Response.error());
    })());
    return;
  }

  // Bewaarde versie eerst, ondertussen verversen voor de volgende keer.
  e.respondWith((async()=>{
    const bewaard=await caches.match(req);
    if(bewaard){ e.waitUntil(haalEnBewaar(req)); return bewaard; }
    return (await haalEnBewaar(req)) || Response.error();
  })());
});

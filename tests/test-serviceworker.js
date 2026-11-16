// Test: de service worker (sw.js) mag gegevens uit de database NOOIT uit zijn bewaarde
// kopie geven. Tot v9.47 deed hij dat wel: wie een lijst ophaalde, kreeg de stand van de
// vorige keer. Gevolg: een wijziging van een ander toestel kwam niet op het scherm, en iets
// wat je verwijderde kwam terug tot je het nóg eens verwijderde (of de pagina herlaadde).
//
// We laden het echte sw.js met een nagemaakte `self`, `caches` en `fetch`, en sturen er
// verzoeken door. Laat de worker een verzoek ongemoeid (geen respondWith), dan gaat de
// browser gewoon naar het netwerk — dat willen we voor de database.
//
// Draaien:  jsc tests/test-serviceworker.js
let fouten=0;
function ok(c,m){ if(c) print('  ok  '+m); else { fouten++; print('  FOUT '+m); } }

// Minimale URL (jsc heeft er geen).
if(typeof URL==='undefined'){
  globalThis.URL=function(s){
    const m=String(s).match(/^(https?:)\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?/);
    this.protocol=m[1]; this.hostname=m[2].split(':')[0]; this.pathname=m[3]||'/';
    const q=(m[4]||'').slice(1);
    const sleutels=q?q.split('&').map(x=>decodeURIComponent(x.split('=')[0])):[];
    this.searchParams={has:k=>sleutels.indexOf(k)>=0};
  };
}
globalThis.Request=function(u,o){ this.url=u; Object.assign(this,o||{}); };
globalThis.Response={error:()=>({ok:false,fout:true})};

// Nagemaakte netwerk + cache: de "database" telt op bij elk verzoek.
let stand=0;
const bewaard={};
globalThis.fetch=(req)=>{ const url=req.url||req; stand++;
  const r={ok:true,url,stand,clone(){ return r; }}; return Promise.resolve(r); };
globalThis.caches={
  open:()=>Promise.resolve({put:(req,r)=>{ bewaard[req.url||req]=r; return Promise.resolve(); }}),
  match:(req)=>Promise.resolve(bewaard[req.url||req]),
  keys:()=>Promise.resolve([]), delete:()=>Promise.resolve(true)
};
const luisteraars={};
globalThis.self={ addEventListener:(t,f)=>{ luisteraars[t]=f; }, skipWaiting(){},
  clients:{claim:()=>Promise.resolve()}, location:{origin:'https://voorbeeld.app'} };
globalThis.setTimeout=globalThis.setTimeout||((f)=>f());

load('./sw.js');
ok(typeof luisteraars.fetch==='function','sw.js registreert een fetch-afhandeling');

// Eén verzoek door de worker. Geeft het antwoord terug, of null als hij het ongemoeid laat.
async function vraag(url,method){
  let antwoord=null, opgepakt=false;
  const e={ request:{url,method:method||'GET',mode:'cors'},
    respondWith(p){ opgepakt=true; antwoord=p; }, waitUntil(){} };
  luisteraars.fetch(e);
  return opgepakt ? await antwoord : null;
}

const DB='https://tbromtomzglqtuyezoav.supabase.co';
(async()=>{
  print('— De database gaat altijd naar het netwerk');
  for(const pad of ['/rest/v1/prijzen?select=*','/rest/v1/appconfig?select=data&id=eq.1',
                    '/rest/v1/activiteit?select=*&order=ts.desc&limit=500','/auth/v1/user']){
    ok(await vraag(DB+pad)===null,'ongemoeid: '+pad);
  }
  ok(Object.keys(bewaard).every(k=>k.indexOf('/rest/v1/')<0 && k.indexOf('/auth/v1/')<0),
     'niets van de database in de bewaarde kopie');

  print('— Wat bewaard mag blijven, blijft bewaard (offline)');
  const pdf=DB+'/storage/v1/object/public/manuals/handleiding.pdf';
  const a=await vraag(pdf), b=await vraag(pdf);
  ok(a && b && a.stand===b.stand,'een manual komt de tweede keer uit de bewaarde kopie (ook offline te openen)');
  const js='https://voorbeeld.app/js/kern.js';
  const c=await vraag(js), d=await vraag(js);
  ok(c && d && c.stand===d.stand,'app-bestanden (js) komen meteen uit de bewaarde kopie');

  print('— Verder ongewijzigd');
  ok(await vraag(DB+'/rest/v1/prijzen?id=eq.1','DELETE')===null,'verwijderen/bewaren gaat nooit via de worker');
  ok(await vraag('https://voorbeeld.app/index.html?_v=123')===null,'de versiecontrole (?_v=) blijft vers');

  print(fouten?('RESULTAAT: '+fouten+' fout(en)'):'RESULTAAT: alles in orde');
})().catch(e=>{ print('FOUT '+e+'\n'+(e.stack||'')); });

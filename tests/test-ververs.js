// Wat een collega — of jijzelf op je ander toestel — intussen invulde, moet op dit scherm
// komen zonder de pagina te herladen. Normaal brengt de live-verbinding dat binnen, maar op
// een wifi zonder echt internet (of achter een adblocker) valt die weg. Daarom haalt een
// pagina haar tabel opnieuw op zodra ze weer in beeld komt: BBInv.ververs(tabel). Dat moet:
//   - de nieuwe rijen van de database binnenhalen,
//   - de pagina een seintje geven (onChange) zodat ze zich opnieuw tekent,
//   - je eigen, nog niet verstuurde werk laten staan (niet wegvegen met de serverlijst),
//   - en niet vaker lopen dan één keer per paar seconden ('focus' en 'visibilitychange'
//     komen vlak na elkaar).
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
var timers=[];
globalThis.setTimeout=function(fn,ms){ timers.push({fn:fn,ms:ms||0,af:false}); return timers.length-1; };
globalThis.clearTimeout=function(id){ if(timers[id]) timers[id].af=true; };
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
globalThis.navigator={onLine:true};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./tests/nep-supabase.js');
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,projecten:true,projecttaken:true,
  projectberichten:true,projectagenda:true,projectdocs:true};
var db={prijzen:[],boekjes:[{id:1,stock:0}],formulieren:[],leveringen:[],
  gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}], werkuren:[], logboek:[]};
// Schrijven naar werkuren kan "vastlopen" (slechte wifi): dan blijft je wijziging in de wachtrij.
var schrijvenLukt=true;
var nep=maakNepSupabase(db,ONTBREEKT);
var echtFrom=nep.client.from;
nep.client.from=function(tabel){
  var q=echtFrom.call(nep.client,tabel);
  if(tabel!=='werkuren') return q;
  ['insert','upsert','update','delete'].forEach(function(soort){
    var echt=q[soort];
    q[soort]=function(p){ echt.call(q,p); if(!schrijvenLukt) q.then=function(res,rej){ return Promise.reject(new Error('netwerk weg')).then(res,rej); }; return q; };
  });
  return q;
};
globalThis.supabase={createClient:function(){ return nep.client; }};
load('./js/inventaris.js');
var seintjes=0; BBInv.setOnChange(function(){ seintjes++; });
// De klok in de hand houden: de rem van een paar seconden testen zonder echt te wachten.
var echtNow=Date.now, verschuif=0; Date.now=function(){ return echtNow()+verschuif; };
function dag(id,datum,soort){ return {id:id,gebruiker:'u1',naam:'Matthew',datum:datum,soort:soort||'gewerkt',start:'09:00',einde:'17:00',pauze:true,minuten:450,opmerking:'',ts:2}; }

(async function(){
  await BBInv.init();
  print('— Een dag die je op je gsm invulde —');
  ok(BBInv.isWerkurenGedeeld(),'de tabel werkuren bestaat in de database');
  ok(BBInv.getWerkuren('u1').length===0,'op de tablet staat nog niets');
  db.werkuren.push(dag('gsm-1','2026-09-14'));
  var voor=seintjes;
  ok((await BBInv.ververs('werkuren'))===true,'het scherm komt weer in beeld → verversen');
  ok(BBInv.getWerkuren('u1').length===1,'de dag van je gsm staat er nu, zonder herladen');
  ok(seintjes>voor,'en de pagina kreeg een seintje om zich opnieuw te tekenen');

  print('\n— Niet vaker dan nodig —');
  db.werkuren.push(dag('gsm-2','2026-09-15'));
  ok((await BBInv.ververs('werkuren'))===false,'meteen nog eens (focus ná visibilitychange) wordt overgeslagen');
  ok(BBInv.getWerkuren('u1').length===1,'die tweede dag wacht op de volgende verversing');
  verschuif=5000;
  ok((await BBInv.ververs('werkuren'))===true,'een paar seconden later wél');
  ok(BBInv.getWerkuren('u1').length===2,'en nu staan beide dagen er');

  print('\n— Je eigen werk dat nog moet vertrekken, blijft staan —');
  schrijvenLukt=false;
  BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-16',soort:'jv',minuten:480});
  ok(BBInv.pendingCount()>0,'de JV staat te wachten om verstuurd te worden');
  db.werkuren.push(dag('gsm-3','2026-09-17'));
  verschuif=10000;
  ok((await BBInv.ververs('werkuren'))===true,'verversen terwijl er nog iets te versturen staat');
  var mijn=BBInv.getWerkuren('u1');
  ok(mijn.length===4,'alles staat op het scherm: 3 van je gsm + je JV ('+mijn.length+')');
  ok(mijn.some(function(w){ return w.soort==='jv'; }),'de JV is niet weggeveegd door de serverlijst');
  ok(BBInv.pendingCount()>0,'en staat nog steeds te wachten');

  print('\n— Niet verversen wat we niet veilig kunnen samenvoegen —');
  verschuif=20000;
  ok((await BBInv.ververs('prijzen'))===false,'een andere tabel wordt geweigerd');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

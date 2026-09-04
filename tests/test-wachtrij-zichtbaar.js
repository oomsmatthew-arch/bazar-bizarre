// Wat nog verstuurd moet worden, moet ondertussen wél op je scherm blijven staan.
//
// Het scenario: je vult iets in terwijl er geen internet is (of terwijl de wachtrij nog
// niet leeg is), en daarna herstart de app — wat op deze site bij ELKE paginawissel
// gebeurt, want elke kaart is een eigen pagina.
//
// Het opstarten haalt dan de lijst uit de database op en zet die over de cache heen.
// Jouw rij staat daar nog niet in, dus verdween ze van het scherm. De wachtrij bleef wel
// intact en vertrok even later, maar niemand haalde de lijst daarna nog eens op — dus
// bleef ze de rest van die sessie onzichtbaar.
//
// Bij Mijn werkuren was dat extra vervelend: je contracturen vielen zo terug op de
// standaard van 38u, en dus rekende de app een verkeerde BF uit.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
// Timers bijhouden maar niet vanzelf laten lopen: anders loopt de tijdslimiet van
// withTimeout() af en denkt de app dat het netwerk weg is.
var timers=[];
globalThis.setTimeout=function(fn,ms){ timers.push({fn:fn,ms:ms||0,af:false}); return timers.length-1; };
globalThis.clearTimeout=function(id){ if(timers[id]) timers[id].af=true; };
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
globalThis.navigator={onLine:true};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./tests/nep-supabase.js');

// Enkel de tabellen die deze test nodig heeft; de rest "bestaat nog niet".
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,projecten:true,projecttaken:true,
  projectberichten:true,projectagenda:true,projectdocs:true};
function verseDB(){
  return {prijzen:[],boekjes:[{id:1,stock:0}],formulieren:[],leveringen:[],
    gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}],
    werkuren:[], logboek:[]};
}
// Zolang deze schakelaar uitstaat, MISLUKT elke schrijfactie naar werkuren met een
// netwerkfout — je wijziging blijft dan netjes in de wachtrij staan. LEZEN blijft wel
// werken, en dat is precies de situatie die we willen nabootsen: het opstarten haalt de
// lijst op terwijl jouw wijziging er nog niet is. Zonder deze schakelaar wint het
// versturen altijd van het laden (in een test gaat alles onmiddellijk) en zouden we het
// probleem nooit zien.
var schrijvenLukt=true;
function maakClient(db){
  var nep=maakNepSupabase(db,ONTBREEKT);
  var echtFrom=nep.client.from;
  nep.client.from=function(tabel){
    var q=echtFrom.call(nep.client,tabel);
    if(tabel!=='werkuren') return q;
    ['insert','upsert','update','delete'].forEach(function(soort){
      var echt=q[soort];
      q[soort]=function(p){
        echt.call(q,p);
        if(!schrijvenLukt) q.then=function(res,rej){ return Promise.reject(new Error('netwerk weg')).then(res,rej); };
        return q;
      };
    });
    return q;
  };
  return nep;
}
// Eén "app-sessie": inventaris.js opnieuw laden en opstarten, zoals bij elke paginawissel.
async function sessie(db){
  var nep=maakClient(db);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load('./js/inventaris.js');
  await BBInv.init();
  return nep;
}

(async function(){
  print('— Invullen zonder internet, daarna de app herstarten —');
  var db=verseDB();
  await sessie(db);
  ok(BBInv.isWerkurenGedeeld(),'de tabel werkuren bestaat in de database');

  schrijvenLukt=false;                          // versturen mislukt (slechte wifi)
  BBInv.setContractMinuten('u1',32*60);         // contracturen op 32u
  var dag=BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-04',
    soort:'gewerkt',start:'12:00',einde:'18:00',pauze:false,minuten:360});
  ok(BBInv.getContractMinuten('u1')===1920,'contracturen staan meteen op 32u');
  ok(BBInv.getWerkuren('u1').length===1,'de ingevulde dag staat er');
  ok((db.werkuren||[]).length===0,'in de database staat nog niets (versturen mislukt)');
  ok(BBInv.pendingCount()>0,'ze staan te wachten om verstuurd te worden');

  // Herstarten. Het opstarten haalt de werkuren op uit de database — en die is leeg.
  // Precies hier ging het mis: die lege lijst mag je eigen rijen niet wegvegen.
  await sessie(db);
  ok((db.werkuren||[]).length===0,'de database weet nog steeds van niets');
  ok(BBInv.getContractMinuten('u1')===1920,'na het herstarten staan de contracturen nog op 32u');
  ok(BBInv.getWerkuren('u1').length===1,'en je ingevulde dag staat er nog');
  ok((BBInv.getWerkuren('u1')[0]||{}).id===dag.id,'het is dezelfde dag, geen dubbel');
  ok((BBInv.getWerkuren('u1')[0]||{}).minuten===360,'met de juiste uren erbij');

  print('\n— En zodra het versturen weer lukt, vertrekt alles alsnog —');
  schrijvenLukt=true;
  for(var r=0;r<12 && BBInv.pendingCount();r++){
    await BBInv.flushOutbox();
    timers.filter(function(t){return !t.af;}).forEach(function(t){ t.af=true; try{t.fn();}catch(e){} });
    await Promise.resolve();
  }
  ok(BBInv.pendingCount()===0,'de wachtrij is leeg');
  ok((db.werkuren||[]).length===2,'de dag én de contracturen staan in de database');
  ok(BBInv.getContractMinuten('u1')===1920,'en op het scherm klopt het nog altijd');

  print('\n— Ook een collega die ondertussen iets invulde, blijft staan —');
  var db2=verseDB();
  db2.werkuren=[{id:'van-laura',gebruiker:'u2',naam:'Laura',datum:'2026-09-03',soort:'jv',
    start:'',einde:'',pauze:true,minuten:480,opmerking:'',ts:5}];
  await sessie(db2);
  schrijvenLukt=false;
  BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-05',soort:'overuren',minuten:90});
  await sessie(db2);
  ok(BBInv.getWerkuren('u1').length===1,'mijn nog-niet-verstuurde overuren staan er');
  ok(BBInv.getWerkuren('u2').length===1,'en de JV van Laura uit de database ook');
  schrijvenLukt=true;

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

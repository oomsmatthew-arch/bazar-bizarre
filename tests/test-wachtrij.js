// Controleert het seintje over de wachtrij (BBInv.setOnWachtrij). Daar hangt de ⏳-melding
// in de balk aan vast: die keek vroeger elke 3 seconden zélf, wat op een tablet die de hele
// dag openstaat gewoon batterij kost. Nu moet de gegevenslaag het zeggen — en dan moet ze
// het ook écht zeggen, precies één keer per verandering, anders staat er een verkeerd
// getal in de balk of blijft de melding hangen terwijl alles al verstuurd is.
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
globalThis.draaiTimers=function(tot){
  timers.forEach(function(t){ if(!t.af && t.ms<=(tot===undefined?1000:tot)){ t.af=true; try{t.fn();}catch(e){} } });
};
globalThis.navigator={onLine:true};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';

function basisDB(){
  return {prijzen:[{id:'p1',cat:'klein',naam:'Knuffel',stock:10,in_gebruik:true,foto:''}],
          boekjes:[{id:1,stock:100}], formulieren:[], leveringen:[],
          gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}]};
}
var ONTBREEKT={contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,projecten:true,projecttaken:true,
  projectberichten:true,projectagenda:true,projectdocs:true,bestellingen:true};

async function sessie(db){
  var nep=maakNepSupabase(db,Object.assign({},ONTBREEKT));
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  return nep;
}

(async function(){
  print('— Het seintje bestaat en zegt meteen hoe het ervoor staat —');
  var nep=await sessie(basisDB());
  ok(typeof BBInv.setOnWachtrij==='function','BBInv.setOnWachtrij bestaat');
  // Het opstarten zelf zet soms al iets klaar (bv. het gedeelde account "ENT algemeen").
  // We beginnen bewust met een lege wachtrij, zodat we de getallen hieronder kunnen tellen.
  BBInv.wisWachtrij();
  var gemeld=[];
  BBInv.setOnWachtrij(function(n){ gemeld.push(n); });
  ok(gemeld.length===1 && gemeld[0]===0,'bij aanmelden meteen de stand van nu (0)');

  print('\n— Offline: elke wijziging laat het getal oplopen —');
  navigator.onLine=false;                 // niets vertrekt, dus de wachtrij groeit
  gemeld.length=0;
  BBInv.removePrijs('p1');
  ok(BBInv.pendingCount()===1,'er wacht één wijziging');
  ok(gemeld.length===1 && gemeld[0]===1,'en dat is precies één keer gemeld (1)');

  BBInv.addPrijs('klein','Beker',3,'');
  draaiTimers();                          // addPrijs schrijft met een kleine vertraging weg
  ok(gemeld[gemeld.length-1]===BBInv.pendingCount(),'het gemelde getal volgt de wachtrij ('+BBInv.pendingCount()+')');
  var naTwee=gemeld.length;

  print('\n— Niets veranderd? Dan ook geen seintje —');
  await BBInv.flushOutbox();              // offline: stopt meteen, wachtrij blijft gelijk
  ok(gemeld.length===naTwee,'een mislukte poging meldt niets nieuws');

  print('\n— Weer online: alles vertrekt en de melding gaat naar 0 —');
  navigator.onLine=true;
  await BBInv.flushOutbox();
  // Er kan al een verzending bezig zijn die halverwege op de database staat te wachten;
  // even doorlaten tot de wachtrij echt leeg is (of we het opgeven).
  for(var t=0;t<50 && BBInv.pendingCount();t++){ await BBInv.flushOutbox(); await null; }
  ok(BBInv.pendingCount()===0,'de wachtrij is leeg');
  ok(gemeld[gemeld.length-1]===0,'en dat is gemeld (0), dus de ⏳-melding verdwijnt');

  print('\n— Wachtrij met de hand wissen meldt het ook —');
  navigator.onLine=false;
  BBInv.addPrijs('klein','Bal',1,'');
  ok(BBInv.pendingCount()>0,'er staat weer iets te wachten');
  gemeld.length=0;
  BBInv.wisWachtrij();
  ok(BBInv.pendingCount()===0,'de wachtrij is gewist');
  ok(gemeld[gemeld.length-1]===0,'en de melding staat op 0');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

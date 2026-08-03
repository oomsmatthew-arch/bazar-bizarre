// Test het scenario van de gebruiker: een project lokaal aangemaakt terwijl de tabellen
// nog niet bestonden. Nadat de tabellen zijn aangemaakt, moet het alsnog gedeeld worden.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
// Timers worden bijgehouden maar draaien niet vanzelf — zo loopt de tijdslimiet van
// withTimeout() niet meteen af (dat zou een "geen internet"-situatie nabootsen).
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
// tabellen die "nog niet bestaan" in de database van de app
var ONTBREEKT_BASIS={bestellingen:true,contacten:true,checklisten:true,logboek:true,
  activiteit:true,manualsdoc:true,appconfig:true,spelarchief:true};
function ontbreekt(extra){
  var o={}; Object.keys(ONTBREEKT_BASIS).forEach(function(k){o[k]=true;});
  (extra||[]).forEach(function(k){o[k]=true;});
  return o;
}
// Eén "app-sessie": laadt inventaris.js opnieuw met een gegeven database.
async function sessie(db,ontbrekend){
  var nep=maakNepSupabase(db,ontbrekend);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  return nep;
}

(async function(){
  print('— Ronde 0: een project van vóór deze versie (geen wachtlijst bekend) —');
  // Zo zag het toestel eruit vóór deze versie: wel lokale gegevens, geen boekhouding
  // van wat er nog moest vertrekken. De eenmalige inhaalslag moet dit alsnog delen.
  store['bb_projecten']=JSON.stringify([{id:'oud1',naam:'Halloween',doel:'',status:'Lopend',kleur:'#4a63c0',
    start:'',deadline:'2026-10-31',verantwoordelijke:'Matthew',kolommen:['Te doen','Bezig','Klaar'],
    pos:1,archief:false,ts:1000}]);
  store['bb_projecttaken']=JSON.stringify([{id:'oudt1',projectId:'oud1',kolom:'Te doen',titel:'Decor bestellen',
    omschrijving:'',wie:[],deadline:'',labels:[],subtaken:[],pos:1,klaar:false,klaarDoor:'',klaarTs:0,door:'Matthew',ts:1001}]);
  var db0=basisDB();
  var nep0=await sessie(db0,ontbreekt());
  ok((nep0.db.projecten||[]).length===1,'het oude project is alsnog naar de database gegaan');
  ok(((nep0.db.projecten||[])[0]||{}).naam==='Halloween','het is Halloween');
  ok((nep0.db.projecttaken||[]).length===1,'de taak ging mee');
  ok(BBInv.getProjecten().length===1,'de app toont het één keer');
  // schoon beginnen voor de rest van de test
  Object.keys(store).forEach(function(k){ delete store[k]; });

  print('\n— Ronde 1: de projecttabellen bestaan nog niet —');
  var db1=basisDB();
  await sessie(db1,ontbreekt(['projecten','projecttaken','projectberichten','projectagenda','projectdocs']));
  BBInv.setActor('Matthew');
  var p=BBInv.addProject({naam:'Halloween',deadline:'2026-10-31'});
  BBInv.addTaak({projectId:p.id,kolom:'Te doen',titel:'Decor bestellen'});
  BBInv.addBericht({projectId:p.id,auteur:'Matthew',tekst:'Eerste idee'});
  ok(BBInv.getProjecten().length===1,'project staat lokaal in de app');
  ok(!db1.projecten,'er ging niets naar de database (de tabel bestond niet)');
  // Sinds v2.9 staat alles in één momentopname (bb_cache_v1) i.p.v. een kopie per tabel.
  var snap0={}; try{ snap0=JSON.parse(store['bb_cache_v1']||'{}')||{}; }catch(e){}
  ok((snap0.projecten||[]).length===1,'het project zit in de lokale reservekopie');
  ok(BBInv.isProjectenGedeeld()===false,'de app weet dat het nog niet gedeeld is');

  print('\n— Ronde 2: SQL uitgevoerd, tabellen bestaan, app opnieuw geopend —');
  var nep2=await sessie(basisDB(),ontbreekt());
  ok(BBInv.isProjectenGedeeld()===true,'de app ziet nu dat de tabellen bestaan');
  ok((nep2.db.projecten||[]).length===1,'het project is alsnog naar de database gestuurd');
  ok(((nep2.db.projecten||[])[0]||{}).naam==='Halloween','en het is echt Halloween');
  ok((nep2.db.projecttaken||[]).length===1,'de taak ging mee');
  ok((nep2.db.projectberichten||[]).length===1,'het bericht ging mee');
  ok(BBInv.getProjecten().length===1,'in de app staat het project één keer (niet dubbel)');
  ok(BBInv.getTaken(p.id).length===1,'de taak staat er ook één keer');

  print('\n— Ronde 3: nog eens openen mag niets dubbel zetten —');
  var db3=basisDB();
  db3.projecten=(nep2.db.projecten||[]).slice();
  db3.projecttaken=(nep2.db.projecttaken||[]).slice();
  db3.projectberichten=(nep2.db.projectberichten||[]).slice();
  var nep3=await sessie(db3,ontbreekt());
  ok(nep3.db.projecten.length===1,'nog steeds één project in de database');
  ok(BBInv.getProjecten().length===1,'en één in de app');

  print('\n— Ronde 4: zonder internet nog een project maken —');
  // Geen verbinding: het laden van de basistabellen mislukt, dus de app werkt lokaal verder.
  await sessie(basisDB(),ontbreekt(['prijzen','boekjes','formulieren','leveringen']));
  var p2=BBInv.addProject({naam:'Nieuwjaarsfeest'});
  BBInv.addTaak({projectId:p2.id,kolom:'Te doen',titel:'Zaal reserveren'});
  ok(BBInv.getProjecten().length===2,'de app toont beide projecten offline');

  print('\n— Ronde 5: terug online, en een collega maakte ondertussen ook een project —');
  var db5=basisDB();
  db5.projecten=[{id:'ander1',naam:'Kerstmarkt',status:'Lopend',kolommen:[],pos:1,archief:false,ts:5},
                 {id:p.id,naam:'Halloween',status:'Lopend',kolommen:[],pos:1,archief:false,ts:1}];
  db5.projecttaken=(nep3.db.projecttaken||[]).slice();
  db5.projectberichten=(nep3.db.projectberichten||[]).slice();
  var nep5=await sessie(db5,ontbreekt());
  var namen5=nep5.db.projecten.map(function(x){return x.naam;}).sort();
  ok(nep5.db.projecten.length===3,'alle drie de projecten staan in de database: '+namen5.join(', '));
  ok(namen5.indexOf('Nieuwjaarsfeest')>=0,'het offline gemaakte project is niet verloren gegaan');
  ok(BBInv.getProjecten().length===3,'de app toont er drie');
  ok(nep5.db.projecttaken.length===2,'de offline gemaakte taak ging mee ('+nep5.db.projecttaken.length+' taken)');

  print('\n— Ronde 6: wat een collega verwijdert, mag niet terugkomen —');
  var db6=basisDB();
  db6.projecten=(nep5.db.projecten||[]).filter(function(x){return x.id!=='ander1';});
  db6.projecttaken=(nep5.db.projecttaken||[]).slice();
  db6.projectberichten=(nep5.db.projectberichten||[]).slice();
  var nep6=await sessie(db6,ontbreekt());
  var namen6=nep6.db.projecten.map(function(x){return x.naam;});
  ok(namen6.indexOf('Kerstmarkt')<0,'Kerstmarkt blijft weg (in de database: '+namen6.join(', ')+')');
  ok(namen6.length===2,'de twee eigen projecten staan er nog');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

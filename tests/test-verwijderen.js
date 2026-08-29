// Waar deze test over gaat: een prijs verwijderen die daarna gewoon terugkwam.
//
// Sinds de database op slot staat (docs/beveiliging-supabase.sql) mag een toestel dat niet
// aangemeld is, niets meer wijzigen. Bij toevoegen zegt de database dat met een foutmelding,
// maar bij VERWIJDEREN niet: die komt terug als "gelukt — 0 rijen". De app streepte de
// opdracht dan af als verstuurd, de prijs was van het scherm, maar ze stond nog in de
// database — en bij de volgende synchronisatie stond ze er weer.
//
// Twee dingen moeten dus kloppen:
//   1. niet aangemeld = niets versturen (alles blijft netjes in de wachtrij staan);
//   2. een verwijdering die de database stil weigert, mag NIET uit de wachtrij verdwijnen.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
// Timers worden bijgehouden maar draaien niet vanzelf — anders loopt de tijdslimiet van
// withTimeout() meteen af en lijkt het alsof er geen internet is.
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
  return {prijzen:[{id:'p1',cat:'groot',naam:'18pcs glazen set',stock:0,in_gebruik:false,foto:''},
                   {id:'p2',cat:'groot',naam:'Blender',stock:4,in_gebruik:true,foto:''}],
          boekjes:[{id:1,stock:100}], formulieren:[], leveringen:[],
          gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}]};
}
var ONTBREEKT={contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,projecten:true,projecttaken:true,
  projectberichten:true,projectagenda:true,projectdocs:true,bestellingen:true};

// Eén sessie = één keer de app opstarten. 'weiger' en 'aangemeld' bepalen hoe streng de
// nagemaakte database doet.
async function sessie(db,weiger,aangemeld,onbereikbaar){
  var nep=maakNepSupabase(db,Object.assign({},ONTBREEKT,onbereikbaar||{}),null,weiger);
  if(aangemeld===false) nep.zetSessie(false);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  return nep;
}
function heeft(db,id){ return (db.prijzen||[]).some(function(r){ return r.id===id; }); }
async function leegmaken(){ for(var i=0;i<40 && BBInv.pendingCount();i++){ await BBInv.flushOutbox(); await null; } }
// Het opstarten stuurt zelf al iets weg (het gedeelde account "ENT algemeen"). Die
// verzending is nog onderweg, en zolang ze bezig is doet een tweede oproep niets. Even
// laten uitrazen, anders meten we straks de verkeerde opdracht.
async function rust(){ for(var i=0;i<30;i++){ await null; if(BBInv.pendingCount()) await BBInv.flushOutbox(); } }

(async function(){
  print('— Gewoon geval: aangemeld, database werkt mee —');
  var db=basisDB();
  await sessie(db);
  await rust();
  BBInv.wisWachtrij();
  BBInv.removePrijs('p1');
  await leegmaken();
  ok(!heeft(db,'p1'),'de prijs is écht uit de database');
  ok(BBInv.pendingCount()===0,'en de wachtrij is leeg');
  ok(BBInv.getPrijzen().every(function(p){return p.id!=='p1';}),'ook uit de lijst op het scherm');

  print('\n— De database weigert het stil (toestel niet meer welkom) —');
  db=basisDB();
  await sessie(db,{prijzen:['delete']});
  await rust();
  BBInv.wisWachtrij();
  BBInv.removePrijs('p2');
  // removePrijs stuurt zelf al meteen; die poging is nog onderweg (versturen → nakijken of
  // de rij er nog staat → melden). Even laten aflopen vóór we kijken wat ervan komt.
  await BBInv.flushOutbox();
  for(var y=0;y<10;y++) await null;
  ok(heeft(db,'p2'),'de rij staat nog in de database (dat is het punt)');
  ok(BBInv.pendingCount()===1,'de opdracht blijft in de wachtrij staan i.p.v. te verdwijnen');
  var s=BBInv.getSysteem();
  ok(!!s.laatsteFout && /erwijderen/.test(s.laatsteFout),'en er staat een foutmelding klaar: '+s.laatsteFout);

  print('\n— Blijft het weigeren, dan geeft de app het luid op (niet stil) —');
  for(var i=0;i<12 && BBInv.pendingCount();i++){ await BBInv.flushOutbox(); await null; await null; }
  ok(BBInv.pendingCount()===0,'na enkele pogingen is de wachtrij vrijgemaakt');
  ok(/[Nn]iet doorgekomen/.test(BBInv.getSysteem().laatsteFout),'met een melding die op het Systeem-scherm te zien is');

  print('\n— Niet aangemeld: er vertrekt niets, alles blijft wachten —');
  db=basisDB();
  navigator.onLine=false;                       // zonder internet vraagt de app geen code
  await sessie(db,null,false);
  navigator.onLine=true;                        // internet is er weer, maar aangemeld zijn we niet
  BBInv.wisWachtrij();
  BBInv.removePrijs('p1');
  await BBInv.flushOutbox();
  await null;
  ok(heeft(db,'p1'),'de database is niet aangeraakt');
  ok(BBInv.pendingCount()===1,'de verwijdering wacht op de aanmelding');

  print('\n— En zodra het toestel wél aangemeld is, vertrekt ze alsnog —');
  await sessie(db);                             // opnieuw opstarten, nu mét aanmelding
  // Meteen na het inladen: de database geeft p1 nog terug (de verwijdering is nog niet
  // vertrokken), maar op het scherm hoort ze niet meer te staan. Anders knippert een prijs
  // die je net verwijderd hebt terug — precies wat het gevoel geeft dat verwijderen niet werkt.
  ok(BBInv.getPrijzen().every(function(p){return p.id!=='p1';}),'ze knippert niet terug op het scherm terwijl ze nog in de wachtrij staat');
  await leegmaken();
  await rust();                                 // de lijst wordt na een verwijdering nog eens opgehaald
  ok(!heeft(db,'p1'),'de prijs is nu echt weg uit de database');
  ok(BBInv.getPrijzen().every(function(p){return p.id!=='p1';}),'en ze staat ook niet meer op het scherm');

  print('\n— Zonder verbinding opstarten zet een verwijderde prijs niet terug —');
  // Het opschonen bij de start ("voorraad 0 mag niet 'in gebruik' staan") schrijft rijen
  // terug naar de database. Draait dat op de offline kopie, dan wordt een prijs die een
  // collega intussen verwijderd heeft opnieuw aangemaakt.
  db=basisDB();
  await sessie(db); await rust();                         // eerste keer: offline kopie opbouwen
  // Zo staat het op een tablet die zonder wifi gewerkt heeft: de voorraad ging naar 0
  // (formulieren afgeboekt) terwijl "in gebruik" nog aan stond. Precies het geval dat het
  // opschonen bij de start wil rechtzetten — en dus terugschrijft naar de database.
  var snap=JSON.parse(store['bb_cache_v1']||'{}');
  (snap.prijzen||[]).forEach(function(p){ if(p.id==='p1'){ p.inGebruik=true; p.stock=0; } });
  store['bb_cache_v1']=JSON.stringify(snap);
  db.prijzen=db.prijzen.filter(function(r){ return r.id!=='p1'; });  // collega verwijdert p1
  // Opstarten zoals in een zaal zonder wifi: de lijst kan niet opgehaald worden, dus draait
  // de app op de offline kopie. Wat ze wil wegschrijven blijft in de wachtrij staan.
  navigator.onLine=false;
  await sessie(db,null,true,{prijzen:true});
  await rust();
  navigator.onLine=true;
  await sessie(db);                                       // en later weer met verbinding
  await leegmaken(); await rust();
  ok(!heeft(db,'p1'),'de verwijderde prijs blijft weg uit de database');
  ok(BBInv.getPrijzen().every(function(p){return p.id!=='p1';}),'en staat ook niet op het scherm');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

// De gedeelde vragenbank voor het finalespel.
// Kern van de functie: bovenaan staat altijd de vraag die het MINST gespeeld is, en bij
// gelijke stand degene die het LANGST geleden aan bod kwam. Zo krijg je nooit twee keer
// kort na elkaar dezelfde vraag.
// Tweede gevoelige punt: de bank leeft in het gedeelde instellingen-document. Een scherm
// dat zijn eigen instellingen bewaart mag de vragen niet wegvagen.
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
async function rust(){ for(var i=0;i<80;i++) await Promise.resolve(); }

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';

// De startlijst zoals js/inventaris-data.js die aanlevert.
globalThis.FINALEVRAGEN_DEFAULT=[
  {vraag:'Gewicht van een banaan?',antwoord:'150 gram'},
  {vraag:'Wanneer valt Black Friday?',antwoord:'27 november'},
  {vraag:'Oprichting ALDI?',antwoord:'1946'}
];

function basisDB(){
  return {prijzen:[], boekjes:[{id:1,stock:0}], formulieren:[], leveringen:[], gebruikers:[], appconfig:[]};
}
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true};

async function sessie(db){
  var nep=maakNepSupabase(db,ONTBREEKT);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  await rust();
  return nep;
}
function namen(lijst){ return lijst.map(function(v){return v.vraag;}); }

(async function(){
  print('— De startlijst wordt één keer geplaatst —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db=basisDB();
  await sessie(db);
  ok(BBInv.getFinalevragen().length===3,'drie vragen ingelezen');
  ok((db.appconfig[0]||{}).data.finalevragen.length===3,'ze staan in het gedeelde document');
  var eersteId=BBInv.getFinalevragen()[0].id;
  // Nog eens opstarten mag niet opnieuw zaaien.
  await sessie(db);
  ok(BBInv.getFinalevragen().length===3,'een tweede start zaait niet opnieuw');
  ok(BBInv.getFinalevragen()[0].id===eersteId,'en de bestaande vragen blijven dezelfde');

  print('\n— Minst gespeeld bovenaan, dan het langst geleden —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  db=basisDB();
  await sessie(db);
  var alle=BBInv.getFinalevragen();
  ok(namen(BBInv.gesorteerdeFinalevragen()).length===3,'alles komt in de volgorde terug');
  // Vraag 1 twee keer gespeeld, vraag 2 één keer, vraag 3 nooit.
  BBInv.markeerFinalevraagGebruikt([alle[0].id]);
  BBInv.markeerFinalevraagGebruikt([alle[0].id]);
  BBInv.markeerFinalevraagGebruikt([alle[1].id]);
  var volg=BBInv.gesorteerdeFinalevragen();
  ok(volg[0].id===alle[2].id,'de nooit gespeelde staat bovenaan');
  ok(volg[1].id===alle[1].id,'daarna die één keer gespeeld is');
  ok(volg[2].id===alle[0].id,'en de vaakst gespeelde staat onderaan');

  print('\n— Bij gelijke stand telt hoe lang geleden —');
  // Beide één keer, maar met een verschillend tijdstip.
  BBInv.updateFinalevraag(alle[0].id,{keer:1,laatst:1000});
  BBInv.updateFinalevraag(alle[1].id,{keer:1,laatst:5000});
  BBInv.updateFinalevraag(alle[2].id,{keer:1,laatst:3000});
  var volg2=BBInv.gesorteerdeFinalevragen();
  ok(volg2[0].id===alle[0].id,'de oudste eerst (1000)');
  ok(volg2[1].id===alle[2].id,'dan 3000');
  ok(volg2[2].id===alle[1].id,'en de recentste laatst (5000)');

  print('\n— Toevoegen, aanpassen en verwijderen —');
  var nieuw=BBInv.addFinalevraag({vraag:'Hoeveel ballonnen?',antwoord:'42'});
  ok(BBInv.getFinalevragen().length===4,'een vraag erbij');
  ok(BBInv.gesorteerdeFinalevragen()[0].id===nieuw.id,'de nieuwe staat meteen bovenaan (nooit gespeeld)');
  BBInv.updateFinalevraag(nieuw.id,{antwoord:'43'});
  ok(BBInv.getFinalevragen().find(function(v){return v.id===nieuw.id;}).antwoord==='43','antwoord aangepast');
  BBInv.removeFinalevraag(nieuw.id);
  ok(BBInv.getFinalevragen().length===3,'en weer verwijderd');

  print('\n— Een ander scherm dat instellingen bewaart, wist de vragen niet —');
  // Zo doet pushConfig() in js/kern.js het: die schrijft zijn eigen sleutels weg.
  BBInv.saveConfig({mededeling:'Test',drempel:16,pin:'3920'});
  await rust();
  ok(BBInv.getFinalevragen().length===3,'de vragen staan er nog');
  ok(BBInv.getConfig().mededeling==='Test','en de mededeling is bewaard');
  var bewaard=(db.appconfig[0]||{}).data||{};
  ok((bewaard.finalevragen||[]).length===3,'ook in de database staan ze er allebei');

  print('\n— De tellers overleven een herstart —');
  var idNu=BBInv.gesorteerdeFinalevragen()[0].id;
  BBInv.markeerFinalevraagGebruikt([idNu]);
  await rust(); draaiTimers(); await rust();
  await sessie(db);
  var na=BBInv.getFinalevragen().find(function(v){return v.id===idNu;});
  ok(na && (na.keer||0)>=1,'de teller staat na het opnieuw opstarten nog op '+((na&&na.keer)||0));
  ok(BBInv.gesorteerdeFinalevragen()[0].id!==idNu,'en die vraag staat niet meer bovenaan');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

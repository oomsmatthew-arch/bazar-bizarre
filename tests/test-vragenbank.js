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
// De echte startlijst, om de handmatig doorgegeven speelbeurten te kunnen nakijken.
var ECHTE_LIJST=[
  {vraag:'Wanneer valt Black Friday?',antwoord:'27 november'},
  {vraag:'Volgens Wikipedia: wat is het gemiddelde gewicht van 1 banaan?',antwoord:'150 gram'},
  {vraag:'Hoeveel tijd brengt een Amerikaan gemiddeld door per supermarktbezoek volgens het Time Use Institute? Onderzoek uit 2023.',antwoord:'41 minuten'},
  {vraag:'Hoe groot is de grootste supermarkt van Frankrijk? In vierkante meter…',antwoord:'25.000 vierkante meter'},
  {vraag:'Wanneer werd winkelketen ALDI opgericht volgens Wikipedia?',antwoord:'1946, in Essen (Duitsland)'},
  {vraag:'De eerste aardappelen kwamen vanuit Zuid-Amerika naar Europa, maar wanneer was dat volgens Wikipedia?',antwoord:'1536'}
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

  print('\n— Nooit gespeeld staat altijd bovenaan —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  db=basisDB();
  await sessie(db);
  var alle=BBInv.getFinalevragen();
  ok(namen(BBInv.gesorteerdeFinalevragen()).length===3,'alles komt in de volgorde terug');
  BBInv.updateFinalevraag(alle[0].id,{keer:2,laatst:9000});
  BBInv.updateFinalevraag(alle[1].id,{keer:1,laatst:8000});
  BBInv.updateFinalevraag(alle[2].id,{keer:0,laatst:0});
  var volg=BBInv.gesorteerdeFinalevragen();
  ok(volg[0].id===alle[2].id,'de nooit gespeelde staat bovenaan');
  ok(volg[1].id===alle[1].id,'daarna die één keer gespeeld is');
  ok(volg[2].id===alle[0].id,'en de vaakst gespeelde staat onderaan');

  print('\n— Bij een gelijk aantal telt hoe lang geleden —');
  BBInv.updateFinalevraag(alle[0].id,{keer:1,laatst:1000});
  BBInv.updateFinalevraag(alle[1].id,{keer:1,laatst:5000});
  BBInv.updateFinalevraag(alle[2].id,{keer:1,laatst:3000});
  var volg2=BBInv.gesorteerdeFinalevragen();
  ok(volg2[0].id===alle[0].id,'de oudste eerst (1000)');
  ok(volg2[1].id===alle[2].id,'dan 3000');
  ok(volg2[2].id===alle[1].id,'en de recentste laatst (5000)');

  print('\n— Dubbel criterium: hoe lang geleden telt echt mee, niet enkel als scheidsrechter —');
  // Dit is waar het om draait. Zou de app enkel op aantal sorteren met de tijd als
  // scheidsrechter, dan telde de tijd alléén mee bij een exact gelijk aantal — en stond
  // een vraag die de gasten vorige week nog hoorden bovenaan.
  //   A: 3× gespeeld, heel lang geleden
  //   D: 2× gespeeld, gisteren
  // A is vaker gespeeld, maar D hoorden ze net. A hoort dus vóór D te staan.
  var D=BBInv.addFinalevraag({vraag:'Vierde vraag',antwoord:'x'});
  BBInv.updateFinalevraag(alle[0].id,{keer:3,laatst:1000});   // A — vaakst, maar oudst
  BBInv.updateFinalevraag(alle[1].id,{keer:2,laatst:9000});   // B
  BBInv.updateFinalevraag(alle[2].id,{keer:3,laatst:9500});   // C — vaakst én recent
  BBInv.updateFinalevraag(D.id,      {keer:2,laatst:9800});   // D — minder vaak, maar recentst
  var volg3=BBInv.gesorteerdeFinalevragen();
  var pos=function(id){ return volg3.findIndex(function(v){return v.id===id;}); };
  ok(pos(alle[0].id)<pos(D.id),
     '3× van heel lang geleden gaat vóór 2× van gisteren (A op '+pos(alle[0].id)+', D op '+pos(D.id)+')');
  ok(pos(alle[2].id)===3,'vaakst gespeeld én recent staat helemaal onderaan');
  ok(pos(alle[1].id)===0,'en het beste van beide werelden staat bovenaan');
  BBInv.removeFinalevraag(D.id);

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

  print('\n— De handmatig doorgegeven speelbeurten worden ingevuld —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  globalThis.FINALEVRAGEN_DEFAULT=ECHTE_LIJST;
  db=basisDB();
  await sessie(db);
  function zoek(stuk){
    return BBInv.getFinalevragen().find(function(v){
      return (v.vraag||'').toLowerCase().indexOf(stuk)>=0;
    });
  }
  var tijd=zoek('time use institute'), sup=zoek('grootste supermarkt'),
      ban=zoek('banaan'), aldi=zoek('aldi'), aard=zoek('aardappelen');
  ok(tijd && tijd.keer===1,'de Time Use-vraag staat op 1× gespeeld');
  ok(sup && sup.keer===1,'de supermarkt-vraag ook');
  ok(ban && ban.keer===1,'de banaan-vraag ook');
  ok(aldi && aldi.keer===1,'de ALDI-vraag ook');
  ok(aard && (aard.keer||0)===0,'de aardappel-vraag is nog nooit gespeeld');
  var d=new Date(tijd.laatst);
  ok(d.getFullYear()===2026 && d.getMonth()===7 && d.getDate()===8 && d.getHours()===22 && d.getMinutes()===36,
     'met de juiste datum en tijd (08/08/2026 22:36 → '+d.toString().slice(0,24)+')');

  print('\n— En de volgorde klopt met die geschiedenis —');
  var volg5=BBInv.gesorteerdeFinalevragen();
  ok(volg5[0].id===aard.id,'de nooit gespeelde aardappel-vraag staat bovenaan');
  var posBF=volg5.findIndex(function(v){return (v.vraag||'').toLowerCase().indexOf('black friday')>=0;});
  ok(posBF===1,'Black Friday (ook nooit gespeeld) staat tweede');
  ok(volg5[volg5.length-1].id===tijd.id,'de vraag van gisteren staat helemaal onderaan');
  var posAldi=volg5.findIndex(function(v){return v.id===aldi.id;});
  ok(posAldi===2,'ALDI, het langst geleden van de gespeelde, komt daarna');

  print('\n— Een tweede start telt ze niet nog eens mee —');
  await sessie(db);
  var tijd2=zoek('time use institute');
  ok(tijd2 && tijd2.keer===1,'nog steeds 1× gespeeld');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

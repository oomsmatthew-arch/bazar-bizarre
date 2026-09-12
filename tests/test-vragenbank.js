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
// De wachtrij helemaal laten leeglopen (elke opdracht kost een paar beurten).
async function verwerk(){ for(var i=0;i<60 && BBInv.pendingCount()>0;i++){ await rust(); draaiTimers(); } await rust(); }

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
  await verwerk();
  ok(BBInv.getFinalevragen().length===3,'de vragen staan er nog');
  ok(BBInv.getConfig().mededeling==='Test','en de mededeling is bewaard');
  var bewaard=(db.appconfig[0]||{}).data||{};
  ok((bewaard.finalevragen||[]).length===3,'ook in de database staan ze er allebei');

  print('\n— Een doorgestuurd formulier telt de speelbeurt bij, en die overleeft een herstart —');
  // Het spel geeft geen id van de vraag meer door: het formulier zelf is de bron.
  var bovenaan=BBInv.gesorteerdeFinalevragen()[0]; var idNu=bovenaan.id, keerVoor=bovenaan.keer||0;
  var tsVoor=Date.now();
  BBInv.submitFormulier({namen:'Test',kleine:[],groot:[],boekjes:{gereserveerd:0,extra:0,gratis:0},
    finale:'',finalevraag:'V1: '+bovenaan.vraag+' → '+bovenaan.antwoord+'\nV2: Backup? → nee',opmerking:''});
  var direct=BBInv.getFinalevragen().find(function(v){return v.id===idNu;});
  ok(direct && direct.keer===keerVoor+1,'meteen na het doorsturen staat de teller één hoger ('+(keerVoor+1)+')');
  ok(direct && direct.laatst>=tsVoor,'met de datum van het formulier');
  await verwerk();
  await sessie(db);
  var na=BBInv.getFinalevragen().find(function(v){return v.id===idNu;});
  ok(na && (na.keer||0)===keerVoor+1,'na het opnieuw opstarten staat ze daar nog — niet dubbel geteld');
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

  print('\n— Alleen vraag 1 uit een formulier telt mee, niet de backup —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db2=basisDB();
  // Eén ingezonden formulier met twee vragen: V1 is gesteld, V2 was de backup.
  db2.formulieren=[{id:'f1',ts:new Date(2026,7,9,22,0).getTime(),namen:'Test',
    kleine:[],groot:[],boekjes:{},opmerking:'',finale:'',
    finalevraag:'V1: Vraag A? → antwoord A\nV2: Vraag B? → antwoord B'}];
  globalThis.FINALEVRAGEN_DEFAULT=[
    {vraag:'Vraag A?',antwoord:'antwoord A'},
    {vraag:'Vraag B?',antwoord:'antwoord B'}
  ];
  await sessie(db2);
  var aldi2=BBInv.getFinalevragen().find(function(v){return (v.vraag||'').indexOf('Vraag A')>=0;});
  var ban2=BBInv.getFinalevragen().find(function(v){return (v.vraag||'').indexOf('Vraag B')>=0;});
  ok(aldi2 && aldi2.keer===1,'de gestelde vraag (V1) staat op 1×');
  ok(ban2 && (ban2.keer||0)===0,'de backup (V2) telt niet mee');
  ok(BBInv.gesorteerdeFinalevragen()[0].id===ban2.id,'de backup staat dus nog steeds bovenaan');
  globalThis.FINALEVRAGEN_DEFAULT=ECHTE_LIJST;

  print('\n— Een formulier verwijderen draait de telling terug —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db3=basisDB();
  var t1=new Date(2026,7,1,20,0).getTime(), t2=new Date(2026,7,9,20,0).getTime();
  db3.formulieren=[
    {id:'f1',ts:t1,namen:'A',kleine:[],groot:[],boekjes:{},opmerking:'',finale:'',
     finalevraag:'V1: Vraag A? → antwoord A'},
    {id:'f2',ts:t2,namen:'B',kleine:[],groot:[],boekjes:{},opmerking:'',finale:'',
     finalevraag:'V1: Vraag A? → antwoord A'}
  ];
  globalThis.FINALEVRAGEN_DEFAULT=[
    {vraag:'Vraag A?',antwoord:'antwoord A'},
    {vraag:'Vraag B?',antwoord:'antwoord B'}
  ];
  await sessie(db3);
  var vA=function(){ return BBInv.getFinalevragen().find(function(v){return (v.vraag||'').indexOf('Vraag A')>=0;}); };
  ok(vA().keer===2,'twee formulieren → 2× gespeeld');
  ok(vA().laatst===t2,'met de datum van het recentste');
  // Het recentste formulier verwijderen.
  BBInv.setFormulieren(BBInv.getFormulieren().filter(function(f){return f.id!=='f2';}));
  ok(vA().keer===1,'na verwijderen nog 1× gespeeld');
  ok(vA().laatst===t1,'en de datum valt terug op het formulier dat er nog is');
  // En het laatste ook.
  BBInv.setFormulieren([]);
  ok(vA().keer===0,'geen formulieren meer → nog nooit gespeeld');
  ok(vA().laatst===0,'en geen datum meer');
  ok(BBInv.gesorteerdeFinalevragen()[0].id===vA().id,'ze staat dus weer bovenaan');
  globalThis.FINALEVRAGEN_DEFAULT=ECHTE_LIJST;

  print('\n— Een tweede start telt ze niet nog eens mee —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  db=basisDB();
  await sessie(db);
  zoek('aldi');
  await sessie(db);
  var tijd2=zoek('time use institute');
  ok(tijd2 && tijd2.keer===1,'nog steeds 1× gespeeld');

  print('\n— Zet een toestel met een oude kopie de teller terug, dan herstelt de volgende start ze —');
  // Dit is wat er in september 2026 gebeurde: een formulier van 05/09 met de aardappel-vraag,
  // maar de vraag bleef op "1× gespeeld, laatst 10/08" staan.
  Object.keys(store).forEach(function(k){ delete store[k]; });
  globalThis.FINALEVRAGEN_DEFAULT=[{vraag:'Vraag A?',antwoord:'a'},{vraag:'Vraag B?',antwoord:'b'}];
  var db5=basisDB();
  await sessie(db5);
  var fA=BBInv.submitFormulier({namen:'X',kleine:[],groot:[],boekjes:{},finale:'',finalevraag:'V1: Vraag A? → a',opmerking:''});
  await verwerk();
  var vraagA=function(){ return BBInv.getFinalevragen().find(function(v){return v.vraag==='Vraag A?';}); };
  ok(vraagA().keer===1,'na het doorsturen: 1× gespeeld');
  // Een ander toestel, met een kopie van vóór dit spel, schreef het hele document weg.
  var doc=db5.appconfig[0].data;
  doc.finalevragen.forEach(function(v){ v.keer=0; v.laatst=0; });
  delete doc.finalevragenGeteld[fA.id];
  await sessie(db5);
  ok(vraagA().keer===1,'na een nieuwe start staat de teller weer op 1');
  ok(vraagA().laatst===fA.ts,'met de datum van het formulier');
  await verwerk();
  await sessie(db5);
  ok(vraagA().keer===1,'en nog een start telt niet dubbel');

  print('\n— Instellingen bewaren vanaf een toestel met een oude kopie wist de tellers niet —');
  // Dit toestel is gestart; daarna telt een ANDERE tablet een spel bij (rechtstreeks in de database).
  var docB=db5.appconfig[0].data;
  docB.finalevragen.forEach(function(v){ if(v.vraag==='Vraag B?'){ v.keer=7; v.laatst=123456; } });
  docB.finalevragenGeteld['f-ander']=1;
  BBInv.saveConfig({mededeling:'Hallo'});   // zoals pushConfig() in kern.js dat doet
  await verwerk();
  var bewaardB=db5.appconfig[0].data;
  var bB=bewaardB.finalevragen.find(function(v){return v.vraag==='Vraag B?';});
  ok(bB && bB.keer===7 && bB.laatst===123456,'de teller van de andere tablet staat er nog (7×)');
  ok(bewaardB.finalevragenGeteld['f-ander']===1,'net als haar teloverzicht');
  ok(bewaardB.mededeling==='Hallo','en de mededeling is wél bewaard');

  print('\n— De tellers kunnen niet achterlopen op de formulieren (herstel bij het opstarten) —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db6=basisDB();
  var tAug=new Date(2026,7,10,22,0).getTime(), tSep=new Date(2026,8,5,22,41).getTime();
  var AARD='De eerste aardappelen kwamen vanuit Zuid-Amerika naar Europa, maar wanneer was dat volgens Wikipedia?';
  db6.formulieren=[{id:'f-sep',ts:tSep,namen:'Billy en Lien',kleine:[],groot:[],boekjes:{},opmerking:'',finale:'',
    finalevraag:'V1: '+AARD+' → 1536'}];
  // Het document zoals het in de database stond: al "geleerd", maar de speelbeurt van 05/09 ontbreekt.
  db6.appconfig=[{id:1,data:{finalevragenGeleerd:true,finalevragenBeurten:true,finalevragen:[
    {id:'q-aard',vraag:AARD,antwoord:'1536',keer:1,laatst:tAug},
    {id:'q-bf',vraag:'Wanneer valt Black Friday?',antwoord:'27 november',keer:0,laatst:0}]}}];
  await sessie(db6);
  var aardR=function(){ return BBInv.getFinalevragen().find(function(v){return v.id==='q-aard';}); };
  ok(aardR().laatst===tSep,'de aardappel-vraag staat op laatst 05/09/2026 (was 10/08)');
  ok(aardR().keer===1,'en blijft op 1× — één formulier bewijst niet meer dan dat');
  ok(BBInv.gesorteerdeFinalevragen()[0].id==='q-bf','Black Friday (nooit gespeeld) staat bovenaan');
  await verwerk();
  ok((db6.appconfig[0].data.finalevragenGeteld||{})['f-sep']===1,'het formulier staat als geteld in de database');
  // Een later formulier met dezelfde vraag, van een tablet die de telling niet haalde.
  db6.formulieren.push({id:'f-sep2',ts:tSep+7*86400000,namen:'Z',kleine:[],groot:[],boekjes:{},opmerking:'',finale:'',
    finalevraag:'V1: '+AARD+' → 1536'});
  await sessie(db6);
  ok(aardR().keer===2,'een formulier dat nog niet geteld was, telt bij de volgende start alsnog mee (2×)');
  ok(aardR().laatst===tSep+7*86400000,'met de nieuwste datum');

  print('\n— Een vraag over meerdere regels wordt herkend —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db7=basisDB();
  db7.appconfig=[{id:1,data:{finalevragenGeleerd:true,finalevragenBeurten:true,finalevragen:[
    {id:'q-2r',vraag:'Regel één,\nregel twee?',antwoord:'ja',keer:0,laatst:0}]}}];
  db7.formulieren=[{id:'f-2r',ts:5000,namen:'Q',kleine:[],groot:[],boekjes:{},opmerking:'',finale:'',
    finalevraag:'V1: Regel één,\nregel twee? → ja\nV2: Backup? → nee'}];
  await sessie(db7);
  var q2=BBInv.getFinalevragen().find(function(v){return v.id==='q-2r';});
  ok(q2 && q2.keer===1 && q2.laatst===5000,'de vraag met een regelovergang telt gewoon mee');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

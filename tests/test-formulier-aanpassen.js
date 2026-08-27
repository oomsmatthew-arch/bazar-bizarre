// Een ingezonden formulier achteraf aanpassen (BBInv.updateFormulier).
// Het gevoelige punt: een formulier heeft de voorraad AL afgeboekt. Wie hier een aantal
// wijzigt, wijzigt dus ook wat er ooit is afgeboekt — en dan moet het verschil terug op
// de voorraad. Loopt dat mis, dan vertellen de stock en de formulieren een ander verhaal
// en is er achteraf geen manier meer om te zien waar het verschil vandaan komt.
// De sterkste controle staat onderaan: aanpassen moet exact hetzelfde opleveren als
// meteen het juiste formulier insturen.
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

function basisDB(){
  return {prijzen:[{id:'p1',cat:'klein',naam:'Knuffel',stock:10,in_gebruik:true},
                   {id:'p2',cat:'groot',naam:'Fiets',stock:4,in_gebruik:true},
                   {id:'p3',cat:'klein',naam:'Sleutelhanger',stock:1,in_gebruik:true}],
          boekjes:[{id:1,stock:100}], formulieren:[], leveringen:[], gebruikers:[]};
}
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true};

async function sessie(db,kolomWeg){
  var nep=maakNepSupabase(db,ONTBREEKT,kolomWeg);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  return nep;
}
function stockVan(id){ var p=BBInv.getPrijzen().find(function(x){return x.id===id;}); return p?p.stock:null; }
function inGebruik(id){ var p=BBInv.getPrijzen().find(function(x){return x.id===id;}); return p?!!p.inGebruik:null; }
async function verwerk(){ await rust(); draaiTimers(); await rust(); }

(async function(){

  print('— Alleen tekst aanpassen laat de voorraad met rust —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db1=basisDB();
  await sessie(db1);
  var f1=BBInv.submitFormulier({namen:'Lien',kleine:[{id:'p1',n:2}],groot:[{id:'p2',n:1}],
    boekjes:{gereserveerd:3,extra:1,gratis:0},finale:'Reeks 3',finalevraag:'',opmerking:''});
  await verwerk();
  ok(stockVan('p1')===8,'na inzenden staat Knuffel op 8 (10 − 2)');
  ok(stockVan('p2')===3,'en Fiets op 3');
  BBInv.updateFormulier(f1.id,{namen:'Lien en Isa',opmerking:'naam gecorrigeerd'});
  await verwerk();
  ok(stockVan('p1')===8,'Knuffel staat nog steeds op 8');
  ok(stockVan('p2')===3,'Fiets staat nog steeds op 3');
  ok(BBInv.getBoekjes().stock===96,'de boekjes bleven op 96 (100 − 4)');
  ok(BBInv.getFormulieren()[0].namen==='Lien en Isa','de naam is aangepast');
  ok((db1.formulieren[0]||{}).namen==='Lien en Isa','en staat ook zo in de database');

  print('\n— Een aantal verhogen boekt extra af —');
  BBInv.updateFormulier(f1.id,{kleine:[{id:'p1',n:5}]});
  await verwerk();
  ok(stockVan('p1')===5,'Knuffel zakt van 8 naar 5 (drie stuks extra weggegeven)');
  ok(BBInv.getFormulieren()[0].kleine[0].n===5,'het formulier toont er nu 5');

  print('\n— Een aantal verlagen geeft voorraad terug —');
  BBInv.updateFormulier(f1.id,{kleine:[{id:'p1',n:1}]});
  await verwerk();
  ok(stockVan('p1')===9,'Knuffel klimt van 5 naar 9 (vier stuks terug)');

  print('\n— Een prijs helemaal weghalen geeft alles terug —');
  BBInv.updateFormulier(f1.id,{kleine:[]});
  await verwerk();
  ok(stockVan('p1')===10,'Knuffel staat weer op de oorspronkelijke 10');
  ok(BBInv.getFormulieren()[0].kleine.length===0,'en er staan geen kleine prijzen meer op');

  print('\n— Een prijs toevoegen boekt af —');
  BBInv.updateFormulier(f1.id,{kleine:[{id:'p1',n:2}]});
  await verwerk();
  ok(stockVan('p1')===8,'Knuffel staat opnieuw op 8');

  print('\n— Boekjes aanpassen corrigeert de boekjesvoorraad —');
  BBInv.updateFormulier(f1.id,{boekjes:{gereserveerd:10,extra:0,gratis:2}});
  await verwerk();
  ok(BBInv.getBoekjes().stock===88,'de boekjes zakken naar 88 (100 − 12)');
  BBInv.updateFormulier(f1.id,{boekjes:{gereserveerd:0,extra:0,gratis:0}});
  await verwerk();
  ok(BBInv.getBoekjes().stock===100,'en staan weer op 100 als je alles op nul zet');

  print('\n— Een prijs die op nul stond doet weer mee zodra er voorraad terugkomt —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db2=basisDB();
  await sessie(db2);
  var f2=BBInv.submitFormulier({namen:'Test',kleine:[{id:'p3',n:1}],groot:[],
    boekjes:{gereserveerd:0,extra:0,gratis:0},finale:'',finalevraag:'',opmerking:''});
  await verwerk();
  ok(stockVan('p3')===0,'Sleutelhanger staat op 0');
  ok(inGebruik('p3')===false,'en is uit gebruik gehaald');
  BBInv.updateFormulier(f2.id,{kleine:[]});
  await verwerk();
  ok(stockVan('p3')===1,'na het weghalen staat ze weer op 1');
  ok(inGebruik('p3')===true,'en doet ze weer mee');

  print('\n— De finalevraag verhuist mee in de gedeelde vragenbank —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db3=basisDB();
  await sessie(db3);
  BBInv.saveConfig({finalevragen:[
    {id:'v1',vraag:'Hoeveel ballonnen?',antwoord:'42',keer:1,laatst:1000},
    {id:'v2',vraag:'Hoofdstad van Frankrijk?',antwoord:'Parijs',keer:0,laatst:0}]});
  var f3=BBInv.submitFormulier({namen:'Test',kleine:[],groot:[],
    boekjes:{gereserveerd:0,extra:0,gratis:0},finale:'',finalevraag:'V1: Hoeveel ballonnen? → 42',opmerking:''});
  await verwerk();
  BBInv.updateFormulier(f3.id,{finalevraag:'V1: Hoofdstad van Frankrijk? → Parijs'});
  await verwerk();
  var bank=BBInv.getFinalevragen();
  var v1=bank.find(function(x){return x.id==='v1';}), v2=bank.find(function(x){return x.id==='v2';});
  ok(v1 && v1.keer===0,'de oude vraag telt een speelbeurt minder');
  ok(v2 && v2.keer===1,'de nieuwe vraag telt er een bij');

  print('\n— Zonder de kolom finalevraag gaat de vraag achter de reeks —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db4=basisDB();
  await sessie(db4,{formulieren:['finalevraag']});
  var f4=BBInv.submitFormulier({namen:'Test',kleine:[],groot:[],
    boekjes:{gereserveerd:0,extra:0,gratis:0},finale:'Reeks 1',finalevraag:'',opmerking:''});
  await verwerk();
  BBInv.updateFormulier(f4.id,{finale:'Reeks 2',finalevraag:'V1: Nieuwe vraag? → ja'});
  await verwerk();
  var rij4=db4.formulieren[0]||{};
  ok(rij4.finalevraag===undefined,'de onbekende kolom is niet meegestuurd');
  ok((rij4.finale||'').indexOf('Reeks 2')===0,'de finalereeks staat vooraan');
  ok((rij4.finale||'').indexOf('Nieuwe vraag')>0,'en de vraag is erachter bewaard');
  ok(BBInv.getFormulieren()[0].finalevraag==='V1: Nieuwe vraag? → ja','op dit toestel blijft ze apart zichtbaar');
  ok(BBInv.pendingCount()===0,'er blijft niets in de wachtrij hangen');

  print('\n— De kroontest: aanpassen == meteen juist inzenden —');
  // Twee sessies met dezelfde startvoorraad. In de ene sturen we een fout formulier in en
  // verbeteren het; in de andere sturen we meteen het juiste in. De voorraad moet daarna
  // in beide gevallen exact gelijk zijn — anders lekt er ergens een stuk weg.
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var dbA=basisDB();
  await sessie(dbA);
  var fa=BBInv.submitFormulier({namen:'A',kleine:[{id:'p1',n:7}],groot:[{id:'p2',n:3}],
    boekjes:{gereserveerd:20,extra:5,gratis:1},finale:'',finalevraag:'',opmerking:''});
  await verwerk();
  BBInv.updateFormulier(fa.id,{kleine:[{id:'p1',n:2}],groot:[{id:'p2',n:1}],
    boekjes:{gereserveerd:3,extra:1,gratis:0}});
  await verwerk();
  var naAanpassen={p1:stockVan('p1'),p2:stockVan('p2'),bk:BBInv.getBoekjes().stock};

  Object.keys(store).forEach(function(k){ delete store[k]; });
  var dbB=basisDB();
  await sessie(dbB);
  BBInv.submitFormulier({namen:'B',kleine:[{id:'p1',n:2}],groot:[{id:'p2',n:1}],
    boekjes:{gereserveerd:3,extra:1,gratis:0},finale:'',finalevraag:'',opmerking:''});
  await verwerk();
  var naDirect={p1:stockVan('p1'),p2:stockVan('p2'),bk:BBInv.getBoekjes().stock};

  ok(naAanpassen.p1===naDirect.p1,'Knuffel: '+naAanpassen.p1+' == '+naDirect.p1);
  ok(naAanpassen.p2===naDirect.p2,'Fiets: '+naAanpassen.p2+' == '+naDirect.p2);
  ok(naAanpassen.bk===naDirect.bk,'Boekjes: '+naAanpassen.bk+' == '+naDirect.bk);

  print('');
  print(fouten? ('RESULTAAT: '+fouten+' fout(en)') : 'RESULTAAT: alles in orde');
})();

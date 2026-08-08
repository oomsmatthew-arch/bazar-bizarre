// De finalevraag bij een ingezonden formulier.
// Het gevoelige punt: de kolom 'finalevraag' kwam er later bij. Zolang die nog niet in
// Supabase staat, mag ze NIET meegestuurd worden — een onbekende kolom laat de hele
// inzending mislukken, en dan was het net afgesloten spel weg. Deze test speelt beide
// situaties na: met en zonder de kolom.
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
// Alleen de korte timers laten afgaan. De tijdslimiet van withTimeout() staat op 12 s;
// die mee laten afgaan zou een "geen internet"-situatie nabootsen en elke inzending
// in de wachtrij houden.
globalThis.draaiTimers=function(tot){
  timers.forEach(function(t){ if(!t.af && t.ms<=(tot===undefined?1000:tot)){ t.af=true; try{t.fn();}catch(e){} } });
};
globalThis.navigator={onLine:true};
// De wachtrij verstuurt via promises; even de microtaken laten leeglopen.
async function rust(){ for(var i=0;i<80;i++) await Promise.resolve(); }

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';

function basisDB(){
  return {prijzen:[{id:'p1',cat:'klein',naam:'Knuffel',stock:10,in_gebruik:true},
                   {id:'p2',cat:'groot',naam:'Fiets',stock:4,in_gebruik:true}],
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
var VRAAG='V1: Hoeveel ballonnen hangen er? → 42\nV2: Hoofdstad van Frankrijk? → Parijs';

(async function(){
  print('— Mét de kolom: de vraag krijgt een eigen veld —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db1=basisDB();
  await sessie(db1);
  ok(BBInv.isFinalevraagGedeeld()===true,'de app ziet dat de kolom bestaat');
  BBInv.submitFormulier({namen:'Matthew',kleine:[{id:'p1',n:2}],groot:[],
    boekjes:{gereserveerd:3,extra:0,gratis:0},finale:'Reeks 3',finalevraag:VRAAG,opmerking:''});
  await rust(); draaiTimers(); await rust();
  var rij1=(db1.formulieren||[])[0]||{};
  ok((db1.formulieren||[]).length===1,'het formulier staat in de database');
  ok(rij1.finalevraag===VRAAG,'de vraag staat in de eigen kolom');
  ok(rij1.finale==='Reeks 3','en de finalereeks bleef ongemoeid');
  ok(BBInv.getFormulieren()[0].finalevraag===VRAAG,'de app toont ze ook los');

  print('\n— Zónder de kolom: niets gaat verloren —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db2=basisDB();
  await sessie(db2,{formulieren:['finalevraag']});
  ok(BBInv.isFinalevraagGedeeld()===false,'de app ziet dat de kolom ontbreekt');
  var rec=BBInv.submitFormulier({namen:'Matthew',kleine:[{id:'p1',n:2}],groot:[],
    boekjes:{gereserveerd:3,extra:0,gratis:0},finale:'Reeks 3',finalevraag:VRAAG,opmerking:''});
  await rust(); draaiTimers(); await rust();
  var rij2=(db2.formulieren||[])[0]||{};
  ok((db2.formulieren||[]).length===1,'het formulier is tóch aangekomen (niet geweigerd)');
  ok(rij2.finalevraag===undefined,'de onbekende kolom is niet meegestuurd');
  ok((rij2.finale||'').indexOf('Reeks 3')===0,'de finalereeks staat vooraan');
  ok((rij2.finale||'').indexOf('Hoofdstad van Frankrijk')>0,'en de vraag is erachter bewaard');
  ok(rec.finalevraag===VRAAG,'op dit toestel blijft ze wél apart zichtbaar');
  ok(BBInv.pendingCount()===0,'er blijft niets in de wachtrij hangen');

  print('\n— Zonder finalevraag verandert er niets aan het oude gedrag —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var db3=basisDB();
  await sessie(db3,{formulieren:['finalevraag']});
  BBInv.submitFormulier({namen:'Lien',kleine:[],groot:[{id:'p2',n:1}],
    boekjes:{gereserveerd:0,extra:0,gratis:0},finale:'Reeks 1',finalevraag:'',opmerking:'niets'});
  await rust(); draaiTimers(); await rust();
  var rij3=(db3.formulieren||[])[0]||{};
  ok(rij3.finale==='Reeks 1','de finalereeks krijgt geen aanhangsel');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

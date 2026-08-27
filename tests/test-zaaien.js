// Het zaaien van een lege database (migrateIfEmpty).
// Het gevoelige punt: niet elke pagina laadt js/inventaris-data.js. Kwam je op zo'n
// pagina binnen terwijl de database nog leeg was, dan viel er niets te zaaien — maar
// zette de app wél de vlag 'bb_migrated_v1'. Die vlag houdt elke volgende poging tegen,
// dus daarna kwam de standaardlijst op dát toestel NOOIT meer aan, ook niet als je
// vervolgens de inventarispagina opende. Stil en pas veel later merkbaar.
// Deze test bewaakt drie dingen: dat zo'n pagina niets kapotmaakt en de deur openlaat,
// dat een pagina mét de lijst daarna gewoon zaait, en dat oude lokale gegevens ook
// zonder die lijst nog altijd meeverhuizen.
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

// Een LEGE database: geen prijzen, en boekjes met een echte voorraad die niet
// weggevaagd mag worden.
function legeDB(){
  return {prijzen:[], boekjes:[{id:1,stock:5760}], formulieren:[], leveringen:[], gebruikers:[]};
}
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true};

async function sessie(db){
  var nep=maakNepSupabase(db,ONTBREEKT);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  await rust(); draaiTimers(); await rust();
  return nep;
}

(async function(){

  print('— Pagina ZONDER de standaardlijst: niets aanraken —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  delete globalThis.INVENTARIS_DEFAULT;
  var db1=legeDB();
  await sessie(db1);
  ok((db1.boekjes[0]||{}).stock===5760,'de boekjesvoorraad is NIET op 0 gezet');
  ok(db1.prijzen.length===0,'er zijn geen lege prijzen geschreven');
  ok(store['bb_migrated_v1']===undefined,'de migratievlag staat nog niet, dus een andere pagina mag het later nog doen');

  print('\n— Daarna een pagina MET de standaardlijst: die zaait wél —');
  // Zelfde toestel (store blijft staan), maar nu is de lijst wel ingeladen.
  globalThis.INVENTARIS_DEFAULT={boekjesStock:5760,
    klein:[{naam:'Knuffel',stock:3},{naam:'Sleutelhanger',stock:0}],
    groot:[{naam:'Fiets',stock:1}]};
  var db2=legeDB();
  await sessie(db2);
  ok(db2.prijzen.length===3,'de drie standaardprijzen zijn geplaatst');
  ok((db2.boekjes[0]||{}).stock===5760,'de boekjesvoorraad is intact gebleven');
  ok(store['bb_migrated_v1']==='1','nu staat de migratievlag wel');

  print('\n— Een tweede keer zaait niet opnieuw —');
  var db3=legeDB();
  await sessie(db3);
  ok(db3.prijzen.length===0,'de vlag houdt een tweede ronde tegen');

  print('\n— Lokale gegevens van vroeger gaan mee, óók zonder de standaardlijst —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  delete globalThis.INVENTARIS_DEFAULT;
  store['bb_inv_prijzen']=JSON.stringify([{id:'oud1',cat:'klein',naam:'Oude prijs',stock:7,inGebruik:true}]);
  var db4=legeDB();
  await sessie(db4);
  ok(db4.prijzen.length===1,'de bewaarde prijs van dit toestel is alsnog geupload');
  ok((db4.prijzen[0]||{}).naam==='Oude prijs','en het is de juiste');
  ok(store['bb_migrated_v1']==='1','met de vlag erbij, want er viel wél iets te doen');

  print('');
  print(fouten? ('RESULTAAT: '+fouten+' fout(en)') : 'RESULTAAT: alles in orde');
})();

// Controleert het gelijkzetten van de bestellingen met het bijgewerkte Excel-overzicht.
// Het gevoelige punt: de rijen die uit de oude startlijst kwamen moeten vervangen worden,
// maar wat iemand zélf in de app toevoegde moet blijven staan — en niets mag dubbel komen,
// ook niet als een tweede toestel de synchronisatie nog een keer uitvoert.
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
globalThis.navigator={onLine:true};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./tests/nep-supabase.js');
load('./js/inventaris-data.js');
var PAD='./js/inventaris.js';

function sleutel(b){ return (b.datum||'')+'|'+(b.info||'').trim().toLowerCase()+'|'+(b.leverancier||'').trim().toLowerCase(); }
function rijSleutel(r){ return (r.besteldatum||'')+'|'+(r.info||'').trim().toLowerCase()+'|'+(r.leverancier||'').trim().toLowerCase(); }
function dubbels(sleutels){
  var gezien={}, dub=[];
  sleutels.forEach(function(k){ if(gezien[k]) dub.push(k); gezien[k]=1; });
  return dub;
}

function basisDB(){
  return {prijzen:[], boekjes:[{id:1,stock:0}], formulieren:[], leveringen:[],
          gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}]};
}
var ONTBREEKT={contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,projecten:true,projecttaken:true,
  projectberichten:true,projectagenda:true,projectdocs:true};

async function sessie(db){
  var nep=maakNepSupabase(db,Object.assign({},ONTBREEKT));
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  return nep;
}
// De gedeelde tabel zoals ze eruitzag ná de vórige startlijst: we bouwen ze op uit de
// bewaarde sleutels, want meer dan datum + omschrijving + leverancier heeft het
// gelijkzetten niet nodig om een oude rij te herkennen.
function oudeTabel(){
  return (window.BESTELLINGEN_OUDE_SLEUTELS||[]).map(function(k,i){
    var d=k.split('|');
    return {id:'oud'+i, ts:1000+i, besteldatum:d[0], categorie:'Onbekend', info:d[1],
            status:'Besteld', aantal:'', kost_ent:0, kost_bay:0, kost_hsb:0,
            leverancier:d[2], leverdatum:'', door:'', opmerking:''};
  });
}

(async function(){
  var DEF=window.BESTELLINGEN_DEFAULT;

  print('— De startlijst zelf —');
  ok(DEF.length===72,'72 bestellingen uit het Excel (nu: '+DEF.length+')');
  ok(dubbels(DEF.map(sleutel)).length===0,'geen twee keer dezelfde bestelling');
  var kw=function(d){ var m=+d.slice(5,7); return m>=10?1:(m<=3?2:(m<=6?3:4)); };
  var som={1:[0,0],2:[0,0],3:[0,0],4:[0,0]};
  DEF.forEach(function(b){ var k=kw(b.datum); som[k][0]+=b.ent; som[k][1]+=b.bay; });
  var excel={1:[2727.93,2212.68],2:[6519.83,913.68],3:[3474.36,2128.70],4:[1290.48,2247.65]};
  [1,2,3,4].forEach(function(k){
    ok(+som[k][0].toFixed(2)===excel[k][0] && +som[k][1].toFixed(2)===excel[k][1],
       'kwartaal '+k+' telt op tot hetzelfde als het tabblad Financieel');
  });

  print('\n— Een nieuw toestel: lege gedeelde tabel —');
  var db1=basisDB(); db1.bestellingen=[];
  var nep1=await sessie(db1);
  ok(BBInv.getBestellingen().length===72,'de volledige startlijst staat er (nu: '+BBInv.getBestellingen().length+')');
  ok(nep1.db.bestellingen.length===72,'en ook in de gedeelde tabel');
  ok(dubbels(nep1.db.bestellingen.map(rijSleutel)).length===0,'niets dubbel');

  print('\n— Een bestaand toestel: de oude startlijst + een eigen bestelling —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  store['bb_bestel_seed_v1']='1';
  store['bb_bestel_seed_ver']='2';           // stond op de vorige versie
  var db2=basisDB();
  db2.bestellingen=oudeTabel().concat([{id:'eigen1',ts:9000,besteldatum:'2026-07-20',
    categorie:'Techniek',info:'Zelf toegevoegde bestelling',status:'Besteld',aantal:'1',
    kost_ent:12.50,kost_bay:0,kost_hsb:0,leverancier:'Thomann',leverdatum:'',door:'Matthew',opmerking:''}]);
  ok(db2.bestellingen.length===61,'we starten met 60 oude rijen + 1 eigen');
  var nep2=await sessie(db2);
  var na=BBInv.getBestellingen();
  ok(na.length===73,'73 bestellingen na het gelijkzetten: 72 uit het Excel + 1 eigen (nu: '+na.length+')');
  ok(dubbels(na.map(sleutel)).length===0,'geen dubbels');
  ok(na.some(function(b){ return b.info==='Zelf toegevoegde bestelling'; }),'de eigen bestelling staat er nog');
  ok(!na.some(function(b){ return b.datum==='2026-05-28' && /noddies/i.test(b.leverancier); }),
     'de schmink van Noddies staat niet meer op 28/05 (in het Excel verhuisd naar juli)');
  ok(na.filter(function(b){ return /noddies/i.test(b.leverancier); }).length===1,
     'en staat maar één keer in de lijst');
  ok(na.some(function(b){ return b.datum==='2026-07-15' && b.status==='Uitgepakt' && b.bay===301.75; }),
     'op 15/07 met de nieuwe status en het bedrag uit het Excel');
  ok(na.filter(function(b){ return b.datum>='2026-07-01' && b.info!=='Zelf toegevoegde bestelling'; }).length===10,
     'kwartaal 4 (juli t/m september) is toegevoegd');
  var prijzen0601=na.filter(function(b){ return b.datum==='2026-06-01'; });
  ok(prijzen0601.length===1 && prijzen0601[0].status==='Uitgepakt' && prijzen0601[0].ent===1280,
     'de prijzen van 01/06 staan nu op Uitgepakt met € 1280');
  ok(nep2.db.bestellingen.length===73,'de gedeelde tabel telt er ook 73 (nu: '+nep2.db.bestellingen.length+')');
  ok(dubbels(nep2.db.bestellingen.map(rijSleutel)).length===0,'ook daar geen dubbels');
  ok(store['bb_bestel_seed_ver']==='3','de versie staat op 3, dus dit gebeurt niet nog eens');

  print('\n— Hetzelfde toestel nog eens opstarten —');
  var nep3=await sessie(nep2.db);
  ok(BBInv.getBestellingen().length===73,'nog altijd 73 bestellingen');
  ok(nep3.db.bestellingen.length===73,'en niets bijgemaakt in de database');

  print('\n— Een tweede toestel dat nog op de vorige versie stond —');
  // Collega opent de app ná de synchronisatie van toestel 1: die vindt de nieuwe lijst
  // al in de gedeelde tabel en mag ze niet nog een keer toevoegen.
  Object.keys(store).forEach(function(k){ delete store[k]; });
  store['bb_bestel_seed_v1']='1';
  store['bb_bestel_seed_ver']='2';
  var nep4=await sessie(nep3.db);
  ok(BBInv.getBestellingen().length===73,'nog altijd 73 bestellingen (nu: '+BBInv.getBestellingen().length+')');
  ok(dubbels(nep4.db.bestellingen.map(rijSleutel)).length===0,'de collega maakt geen dubbels');
  ok(nep4.db.bestellingen.some(function(r){ return r.info==='Zelf toegevoegde bestelling'; }),
     'de eigen bestelling van het andere toestel blijft staan');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

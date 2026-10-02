// Foto bij een product (Quiz/O&F/Algemeen), zie docs/producten-foto-kolom.sql.
// Twee dingen mogen hier nooit misgaan:
//  1. Zolang de kolom 'foto' nog niet in Supabase bestaat, moet "Product toevoegen" met
//     een foto gewoon blijven werken — lokaal zichtbaar, alleen niet meegestuurd (anders
//     mislukt de hele rij, net als vroeger bij de kolom 'finalevraag').
//  2. Een gewone voorraad-update (de +/- knoppen) mag de foto niet telkens opnieuw
//     versturen — zelfde reden als toRowKaal bij de prijzen van Prizenight.
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
// Fire-and-forget schrijfacties (enqueue→flushOutbox) lossen op via echte microtaken
// (Promise.then), niet via setTimeout — enkel de retry-backoff gebruikt een timer.
// Een paar microtaak-beurten laten die keten uitlopen, zonder op een echte klok te wachten.
async function vlot(n){ for(var i=0;i<(n||25);i++) await Promise.resolve(); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';

function basisDB(){
  return {prijzen:[],boekjes:[{id:1,stock:0}],formulieren:[],leveringen:[],
    gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}],
    producten:[]};
}
var ONTBREEKT_BASIS={bestellingen:true,contacten:true,checklisten:true,logboek:true,
  activiteit:true,manualsdoc:true,appconfig:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true,werkuren:true};
function ontbreekt(extra){
  var o={}; Object.keys(ONTBREEKT_BASIS).forEach(function(k){o[k]=true;});
  (extra||[]).forEach(function(k){o[k]=true;});
  return o;
}
async function sessie(db,ontbrekendExtra,kolomWeg){
  var nep=maakNepSupabase(db,ontbreekt(ontbrekendExtra),kolomWeg);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  await vlot();
  return nep;
}

(async function(){
  print('— De kolom "foto" bestaat nog niet op de tabel producten —');
  var db1=basisDB();
  db1.producten=[{id:'x1',hoofdstuk:'quiz',naam:'Bestaand product',stock:5}];
  var nep1=await sessie(db1,[],{producten:['foto']});
  ok(BBInv.isProductenFotoGedeeld()===false,'de app herkent dat de kolom ontbreekt');

  var rec=BBInv.addProduct('quiz','Nieuw met foto',3,'data:image/png;base64,AAA');
  await vlot();
  ok(rec.foto==='data:image/png;base64,AAA','de foto staat meteen lokaal op het nieuwe product');
  ok(BBInv.getProducten().find(function(p){return p.id===rec.id;}).foto==='data:image/png;base64,AAA','en blijft in de lijst staan');
  var rij=nep1.db.producten.find(function(r){return r.id===rec.id;});
  ok(!!rij,'het product ging wel naar de database');
  ok(rij&&rij.foto===undefined,'…maar zonder het veld foto (de kolom bestaat niet)');
  ok(rij&&rij.naam==='Nieuw met foto'&&rij.stock===3,'naam en aantal gingen gewoon mee');

  BBInv.setProductStock(rec.id,9);
  await vlot();
  var rij2=nep1.db.producten.find(function(r){return r.id===rec.id;});
  ok(rij2.stock===9,'een voorraad-update komt aan');
  ok(rij2.foto===undefined,'…en stuurt ook geen foto mee (kaal, zoals bij de prijzen)');

  print('\n— De kolom bestaat wél (SQL-scriptje al uitgevoerd) —');
  var db2=basisDB();
  var nep2=await sessie(db2,[]);
  ok(BBInv.isProductenFotoGedeeld()===true,'de app herkent dat de kolom er nu is');
  var rec2=BBInv.addProduct('of','Met foto, kolom bestaat',1,'data:image/png;base64,BBB');
  await vlot();
  var rij3=nep2.db.producten.find(function(r){return r.id===rec2.id;});
  ok(rij3&&rij3.foto==='data:image/png;base64,BBB','de foto gaat nu wél mee naar de database');

  ok(BBInv.setProductFoto(rec2.id,'data:image/png;base64,CCC')===true,'setProductFoto werkt op een bestaand product');
  await vlot();
  var rij4=nep2.db.producten.find(function(r){return r.id===rec2.id;});
  ok(rij4.foto==='data:image/png;base64,CCC','de gewijzigde foto staat in de database');
  ok(BBInv.getProducten().find(function(p){return p.id===rec2.id;}).foto==='data:image/png;base64,CCC','en lokaal ook');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

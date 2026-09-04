// Mijn werkuren: de rekenregels én de opslag.
//
// Waarom deze test: een fout hier zie je niet meteen op het scherm, maar wel op het eind
// van de maand — als je totaal niet klopt met je loonfiche. En de twee dingen die het
// snelst mislopen (de pauze die er vanaf gaat, en een shift die over middernacht loopt)
// zijn precies de twee die je het minst opmerkt.
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

// ---------------------------------------------------------------------------
// DEEL 1 — de rekenregels, rechtstreeks uit paginas/werkuren.html
// ---------------------------------------------------------------------------
// We knippen het rekenblok uit de pagina en voeren dat uit, net zoals test-toegangen.js
// dat met kern.js doet. Zo test dit de échte code en niet een kopie die uit de pas loopt.
function laadRekenregels(){
  var src=readFile('./paginas/werkuren.html');
  var start=src.indexOf('const PAUZE_VANAF=390;');
  var eind=src.indexOf('// ---- wie ben ik, en welke maand bekijk ik ----');
  if(start<0||eind<0||eind<start){ print('KON HET REKENBLOK NIET VINDEN'); return false; }
  eval(src.slice(start,eind)+'\n'+
    'globalThis.brutoMinuten=brutoMinuten;'+
    'globalThis.nettoMinuten=nettoMinuten;'+
    'globalThis.bfUitContract=bfUitContract;'+
    'globalThis.parseUren=parseUren;'+
    'globalThis.fmtDuur=fmtDuur;'+
    'globalThis.fmtDecimaal=fmtDecimaal;'+
    'globalThis.weekNr=weekNr;'+
    'globalThis.maandagVan=maandagVan;'+
    'globalThis.datumVan=datumVan;'+
    'globalThis.isoVan=isoVan;'+
    'globalThis.JV_MIN=JV_MIN;'+
    'globalThis.PAUZE_VANAF=PAUZE_VANAF;');
  return true;
}
if(!laadRekenregels()){ print('\nRESULTAAT: 1 fout'); throw new Error('rekenblok'); }

print('— De pauzeregel: vanaf 6u30 gaat er een half uur af —');
ok(nettoMinuten('09:00','15:30',true)===360,'6u30 aanwezig → 6u00 (net over de grens, pauze gaat eraf)');
ok(nettoMinuten('09:00','15:29',true)===389,'6u29 aanwezig → 6u29 (nog geen pauze)');
ok(nettoMinuten('09:00','17:30',true)===480,'8u30 aanwezig → 8u00');
ok(nettoMinuten('09:00','17:30',false)===510,'8u30 aanwezig zonder pauze genomen → 8u30');
ok(nettoMinuten('09:00','12:00',false)===180,'korte shift zonder pauze → 3u00');
ok(nettoMinuten('09:00','12:00',true)===180,'korte shift mét pauzevinkje → nog steeds 3u00');

print('\n— Een shift die over middernacht loopt —');
ok(brutoMinuten('20:00','00:30')===270,'20:00 tot 00:30 = 4u30 (niet negatief)');
ok(nettoMinuten('17:00','01:00',true)===450,'17:00 tot 01:00 = 8u00 aanwezig → 7u30');
ok(brutoMinuten('09:00','09:00')===0,'zelfde uur = 0 (het formulier weigert dit)');
ok(brutoMinuten('','17:00')===null,'zonder startuur geen uitkomst');
ok(brutoMinuten('09:00','25:00')===null,'een onmogelijk uur geeft geen uitkomst');

print('\n— BF: contracturen ÷ 5, afgerond op een half uur —');
// De twee gevallen die de regel vastleggen: 7u36 hoort naar 7u30 (niet naar 8u00),
// 6u24 hoort naar 6u30. Het is dus het DICHTSTBIJZIJNDE halfuur, niet "altijd omhoog".
ok(bfUitContract(38*60)===450,'38u/week → 7u36 → BF van 7u30');
ok(bfUitContract(32*60)===390,'32u/week → 6u24 → BF van 6u30');
ok(bfUitContract(24*60)===300,'24u/week → 4u48 → BF van 5u00');
ok(bfUitContract(30*60)===360,'30u/week → 6u00 blijft 6u00');
ok(bfUitContract(35*60)===420,'35u/week → 7u00 blijft 7u00');
ok(bfUitContract(37*60)===450,'37u/week → 7u24 → BF van 7u30');
ok(bfUitContract(20*60)===240,'20u/week → 4u00 blijft 4u00');
ok(bfUitContract(19*60)===240,'19u/week → 3u48 → BF van 4u00');
ok(bfUitContract(0)===0,'niets ingesteld → 0 (de pagina neemt dan 38u)');
ok(JV_MIN===480,'een JV telt als 8u00');

print('\n— Contracturen intypen: vier schrijfwijzen —');
ok(parseUren('38')===2280,'"38" → 38u00');
ok(parseUren('38:30')===2310,'"38:30" → 38u30');
ok(parseUren('38u30')===2310,'"38u30" → 38u30');
ok(parseUren('38,5')===2310,'"38,5" → 38u30');
ok(parseUren('38u')===2280,'"38u" → 38u00');
ok(parseUren('acht')===null,'onzin wordt geweigerd');

print('\n— Tonen: uren voor het scherm, honderdsten voor de loonfiche —');
ok(fmtDuur(456)==='7u36','456 min → 7u36');
ok(fmtDuur(480)==='8u00','480 min → 8u00');
ok(fmtDuur(0)==='0u00','0 min → 0u00');
ok(fmtDecimaal(456)==='7,60','456 min → 7,60 (zo staat het op je loonfiche)');
ok(fmtDecimaal(2280)==='38,00','38 uur → 38,00');

print('\n— Weken beginnen op maandag —');
ok(isoVan(maandagVan(datumVan('2026-01-04')))==='2025-12-29','zondag 4 jan hoort bij de week van 29 dec');
ok(isoVan(maandagVan(datumVan('2026-01-05')))==='2026-01-05','maandag 5 jan is zelf het begin');
ok(weekNr(datumVan('2026-01-01'))===1,'1 januari 2026 valt in week 1');
ok(weekNr(datumVan('2025-12-29'))===1,'29 december 2025 hoort al bij week 1 van 2026');
ok(weekNr(datumVan('2026-09-03'))===36,'3 september 2026 is week 36');
ok(datumVan('2026-03-01').getDate()===1,'een datum wordt lokaal gelezen, niet in wereldtijd');

// ---------------------------------------------------------------------------
// DEEL 2 — de opslag (js/inventaris.js), zonder database: alles lokaal
// ---------------------------------------------------------------------------
load('./js/inventaris.js');
BBInv.init();

print('\n— Je uren zijn van jou —');
BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-01',soort:'gewerkt',start:'09:00',einde:'17:30',pauze:true,minuten:480});
BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-02',soort:'jv',minuten:480});
var vanLaura=BBInv.addWerkuur({gebruiker:'u2',naam:'Laura',datum:'2026-09-01',soort:'gewerkt',start:'10:00',einde:'18:00',pauze:true,minuten:450});
ok(BBInv.getWerkuren('u1').length===2,'Matthew ziet zijn twee dagen');
ok(BBInv.getWerkuren('u2').length===1,'Laura ziet enkel haar eigen dag');
ok(BBInv.getWerkuren('u1').every(function(w){return w.gebruiker==='u1';}),'er zit geen rij van een collega tussen');
ok(BBInv.getWerkuren('u1')[0].datum==='2026-09-02','nieuwste dag staat vooraan');

print('\n— Contracturen horen bij jou, niet bij dit toestel —');
BBInv.setContractMinuten('u1',2280);
BBInv.setContractMinuten('u2',1800);
ok(BBInv.getContractMinuten('u1')===2280,'Matthew staat op 38u00');
ok(BBInv.getContractMinuten('u2')===1800,'Laura staat op 30u00');
ok(BBInv.getWerkuren('u1').length===2,'de instelling duikt niet op als een ingevulde dag');
BBInv.setContractMinuten('u1',2310);
ok(BBInv.getContractMinuten('u1')===2310,'aanpassen overschrijft, het maakt geen tweede instelling');
ok(BBInv.getContractMinuten('u3')===0,'wie niets instelde, heeft niets staan (de pagina neemt dan 38u)');

print('\n— Aanpassen en verwijderen —');
var eigen=BBInv.getWerkuren('u1').find(function(w){return w.datum==='2026-09-01';});
BBInv.updateWerkuur(eigen.id,{einde:'18:00',minuten:510});
ok(BBInv.getWerkuren('u1').find(function(w){return w.id===eigen.id;}).minuten===510,'het nieuwe aantal minuten staat er');
BBInv.removeWerkuur(eigen.id);
ok(BBInv.getWerkuren('u1').length===1,'de dag is weg');
ok(BBInv.getWerkuren('u2').length===1,'de dag van Laura bleef staan');
ok(BBInv.getWerkuren('u2')[0].id===vanLaura.id,'en het is nog steeds dezelfde rij');

print('\n— Zonder database blijft alles bewaard op dit toestel —');
var snap={}; try{ snap=JSON.parse(store['bb_cache_v1']||'{}')||{}; }catch(e){}
ok((snap.werkuren||[]).length===4,'de werkuren staan in de offline momentopname (3 dagen + 2 instellingen − 1 verwijderd = 4)');
var wacht={}; try{ wacht=JSON.parse(store['bb_proj_wacht']||'{}')||{}; }catch(e){}
ok((wacht.werkuren||[]).length===4,'ze staan ook in de wachtlijst, zodat ze later alsnog naar de database gaan');
ok((wacht.werkuren||[]).indexOf(eigen.id)<0,'wat je weer verwijderde, hoeft niet meer verstuurd te worden');

print('\n— Het activiteitenlogboek blijft er buiten (je uren zijn privé) —');
ok(BBInv.getActiviteit().every(function(a){ return String(a.actie||'').toLowerCase().indexOf('werkuur')<0
  && String(a.actie||'').toLowerCase().indexOf('werkuren')<0; }),'er staat niets over werkuren in het logboek');

print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));

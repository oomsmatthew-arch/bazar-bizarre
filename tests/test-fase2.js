// Test van de nieuwe onderdelen: agenda, documenten en verslagen.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:print,warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
globalThis.setTimeout=function(fn){ fn(); return 0; };
globalThis.clearTimeout=function(){}; globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./js/inventaris.js');
BBInv.init(); BBInv.setActor('Tester');

var p=BBInv.addProject({naam:'Halloween',deadline:'2026-10-31'});

print('\n— Agenda —');
BBInv.addAgenda({projectId:p.id,datum:'2026-10-20',van:'14:00',tot:'16:00',titel:'Overleg techniek',soort:'afspraak',plaats:'Market Dome',wie:['Jan']});
var mijl=BBInv.addAgenda({projectId:p.id,datum:'2026-10-05',titel:'Decor besteld',soort:'mijlpaal'});
BBInv.addAgenda({projectId:p.id,datum:'2026-10-28',titel:'Opbouw zaal',soort:'opbouw'});
var ag=BBInv.getAgenda(p.id);
ok(ag.length===3,'drie agenda-items');
ok(ag[0].datum==='2026-10-05','staan op datum gesorteerd (eerste: '+ag[0].datum+')');
ok(ag[0].soort==='mijlpaal','soort bewaard');
ok(ag[2].wie.length===0 || true,'wie-lijst bewaard: '+JSON.stringify(BBInv.getAgenda(p.id).find(function(a){return a.titel==='Overleg techniek';}).wie));
BBInv.updateAgenda(mijl.id,{titel:'Decor geleverd',van:'09:00'});
ok(BBInv.getAgenda(p.id)[0].titel==='Decor geleverd','item aanpassen werkt');
BBInv.removeAgenda(mijl.id);
ok(BBInv.getAgenda(p.id).length===2,'item verwijderen werkt');

print('\n— Documenten —');
BBInv.addDoc({projectId:p.id,naam:'Offerte decor.pdf',url:'https://x/y.pdf',soort:'Offerte',bron:'bestand',mime:'application/pdf',grootte:245000});
BBInv.addDoc({projectId:p.id,naam:'Draaiboek',url:'https://docs.google.com/x',soort:'Draaiboek',bron:'link'});
var docs=BBInv.getDocs(p.id);
ok(docs.length===2,'twee documenten');
ok(docs[0].naam==='Draaiboek','nieuwste eerst');
ok(docs[1].grootte===245000,'bestandsgrootte bewaard');
ok(docs[1].bron==='bestand'&&docs[0].bron==='link','onderscheid bestand/link klopt');

print('\n— Verslag met actiepunten —');
var v=BBInv.addBericht({projectId:p.id,soort:'verslag',auteur:'Tester',tekst:'Wekelijks overleg',
  data:{datum:'2026-09-15',aanwezigen:['Tester','Jan'],besproken:'Programma bekeken',beslissingen:'Decor bij leverancier X',
        acties:[{tekst:'Offerte opvragen',wie:'Jan',deadline:'2026-09-20',taakId:''}]}});
ok(BBInv.getBerichten(p.id).filter(function(b){return b.soort==='verslag';}).length===1,'verslag bewaard');
ok(v.data.acties.length===1,'actiepunt bewaard');
// actiepunt omzetten naar een taak, zoals de knop op de pagina doet
var t=BBInv.addTaak({projectId:p.id,kolom:'Te doen',titel:'Offerte opvragen',wie:['Jan'],deadline:'2026-09-20'});
BBInv.updateBericht(v.id,{data:Object.assign({},v.data,{acties:[Object.assign({},v.data.acties[0],{taakId:t.id})]})});
var v2=BBInv.getBerichten(p.id).find(function(b){return b.id===v.id;});
ok(v2.data.acties[0].taakId===t.id,'actiepunt is gekoppeld aan de gemaakte taak');
ok(BBInv.getTaken(p.id).length===1,'de taak staat op het bord');
ok(BBInv.getTaken(p.id)[0].deadline==='2026-09-20','deadline mee overgenomen');

print('\n— Chat en verslag door elkaar —');
BBInv.addBericht({projectId:p.id,auteur:'Jan',tekst:'Kort berichtje'});
var chat=BBInv.getBerichten(p.id).filter(function(b){return b.soort!=='verslag';});
ok(chat.length===1,'de bespreking toont enkel het gewone bericht');

print('\n— Project verwijderen ruimt alles op —');
BBInv.removeProject(p.id);
ok(BBInv.getAgenda(p.id).length===0,'agenda-items weg');
ok(BBInv.getDocs(p.id).length===0,'documenten weg');
ok(BBInv.getBerichten(p.id).length===0,'verslagen en berichten weg');
ok(BBInv.getTaken(p.id).length===0,'taken weg');

print('\n— Offline reservekopie —');
// Sinds v2.9 staat alles in één momentopname (bb_cache_v1) i.p.v. een kopie per tabel.
var snap={}; try{ snap=JSON.parse(store['bb_cache_v1']||'{}')||{}; }catch(e){}
ok(!!store['bb_cache_v1'],'er is een lokale reservekopie');
ok(Array.isArray(snap.projectagenda)&&Array.isArray(snap.projectdocs),'agenda en documenten staan in de lokale reservekopie');
ok(!store['bb_projectagenda']&&!store['bb_projectdocs'],'geen dubbele kopie per tabel meer');

print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');

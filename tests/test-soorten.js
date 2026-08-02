// Ideeën, materiaal, draaiboek, verslagen, evaluatie en chat delen één tabel.
// Deze test bewaakt dat ze elkaar niet in de weg zitten.
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
globalThis.setTimeout=function(fn,ms){ timers.push({fn:fn,ms:ms||0}); return timers.length-1; };
globalThis.clearTimeout=function(){}; globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./js/inventaris.js');
BBInv.init(); BBInv.setActor('Matthew');
var p=BBInv.addProject({naam:'Halloween 2026'});

// Dezelfde filter als in projecten.js
function isChat(b){ return !b.soort || b.soort==='bericht'; }
function van(soort){ return BBInv.getBerichten(p.id).filter(function(b){return b.soort===soort;}); }

print('— Zes soorten in dezelfde opslag —');
BBInv.addBericht({projectId:p.id,auteur:'Matthew',tekst:'Gewoon berichtje'});
BBInv.addBericht({projectId:p.id,soort:'idee',auteur:'Jan',tekst:'Spookhuis in de kelder',data:{taakId:''}});
BBInv.addBericht({projectId:p.id,soort:'materiaal',auteur:'Matthew',tekst:'Pompoenen',data:{aantal:30,eenheid:'stuks',status:'Nodig',prijsId:'',opmerking:'bij de tuinwinkel'}});
BBInv.addBericht({projectId:p.id,soort:'draaiboek',auteur:'Matthew',tekst:'Deuren open',data:{datum:'2026-10-31',van:'18:00',tot:'',plaats:'Market Dome',wie:['Jan'],opmerking:''}});
BBInv.addBericht({projectId:p.id,soort:'draaiboek',auteur:'Matthew',tekst:'Opbouw start',data:{datum:'2026-10-31',van:'14:00',tot:'17:00',plaats:'',wie:[],opmerking:''}});
BBInv.addBericht({projectId:p.id,soort:'verslag',auteur:'Matthew',tekst:'Overleg',data:{datum:'2026-09-01',aanwezigen:['Matthew'],besproken:'x',beslissingen:'y',acties:[]}});
BBInv.addBericht({projectId:p.id,soort:'evaluatie',auteur:'Matthew',tekst:'Evaluatie',data:{score:4,goed:'sfeer',minder:'te weinig volk',onthouden:'vroeger aankondigen'}});

var alles=BBInv.getBerichten(p.id);
ok(alles.length===7,'zeven items in de gedeelde tabel');
ok(alles.filter(isChat).length===1,'de Bespreking toont er maar één (het echte bericht)');
ok(van('idee').length===1,'één idee');
ok(van('materiaal').length===1,'één materiaallijn');
ok(van('draaiboek').length===2,'twee draaiboekregels');
ok(van('verslag').length===1,'één verslag');
ok(van('evaluatie').length===1,'één evaluatie');

print('\n— Volgorde van het draaiboek —');
var db=van('draaiboek').slice().sort(function(a,b){
  return (a.data.datum||'').localeCompare(b.data.datum||'')||(a.data.van||'').localeCompare(b.data.van||'');
});
ok(db[0].tekst==='Opbouw start','14:00 komt vóór 18:00 (eerste: '+db[0].tekst+')');

print('\n— Gegevens blijven heel —');
var mat=van('materiaal')[0];
ok(mat.data.aantal===30 && mat.data.eenheid==='stuks','aantal en eenheid bewaard');
ok(mat.data.status==='Nodig','status bewaard');
var ev=van('evaluatie')[0];
ok(ev.data.score===4,'sterrenscore bewaard');
ok(ev.data.onthouden==='vroeger aankondigen','tekst van de evaluatie bewaard');

print('\n— Status wijzigen raakt de rest niet —');
BBInv.updateBericht(mat.id,{data:Object.assign({},mat.data,{status:'Besteld'})});
ok(van('materiaal')[0].data.status==='Besteld','status is nu Besteld');
ok(van('materiaal')[0].data.aantal===30,'aantal is niet verloren gegaan');
ok(BBInv.getBerichten(p.id).filter(isChat).length===1,'de chat is nog steeds één bericht');

print('\n— Idee omzetten naar een taak —');
var idee=van('idee')[0];
var t=BBInv.addTaak({projectId:p.id,kolom:'Te doen',titel:idee.tekst});
BBInv.updateBericht(idee.id,{data:{taakId:t.id}});
ok(van('idee')[0].data.taakId===t.id,'het idee wijst naar de taak');
ok(BBInv.getTaken(p.id).length===1,'de taak staat op het bord');

print('\n— Project kopiëren (zoals de knop bij Evaluatie doet) —');
function volgendeNaam(naam){ var m=String(naam).match(/^(.*?)(\d{4})(\D*)$/); return m?(m[1]+(parseInt(m[2],10)+1)+m[3]):(naam+' (kopie)'); }
ok(volgendeNaam('Halloween 2026')==='Halloween 2027','jaartal telt op: '+volgendeNaam('Halloween 2026'));
ok(volgendeNaam('Zomerbar')==='Zomerbar (kopie)','zonder jaartal: '+volgendeNaam('Zomerbar'));
var nieuw=BBInv.addProject({naam:volgendeNaam('Halloween 2026'),kolommen:['Te doen','Bezig','Klaar']});
van('materiaal').forEach(function(b){
  BBInv.addBericht({projectId:nieuw.id,soort:'materiaal',auteur:'Matthew',tekst:b.tekst,
    data:Object.assign({},b.data,{status:'Nodig'})});
});
var kopieMat=BBInv.getBerichten(nieuw.id).filter(function(b){return b.soort==='materiaal';});
ok(kopieMat.length===1,'de materiaallijst ging mee');
ok(kopieMat[0].data.status==='Nodig','en staat terug op Nodig');
ok(BBInv.getBerichten(p.id).length===7,'het oude project is onaangeroerd gebleven');
ok(BBInv.getBerichten(nieuw.id).length===1,'in de kopie staat enkel wat we kopieerden');

print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');

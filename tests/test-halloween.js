// Halloween · The Outbreak: de inhoud (js/halloween-data.js + js/halloween-bron.js) moet
// zichzelf kloppen. Een kapotte fotolink of een rol die in geen enkele zone voorkomt, valt
// anders pas op als iemand om 19u op de tablet staat te zoeken.
//
//   node tests/_node-runner.js tests/test-halloween.js
//
// (de controle op bestaande fotobestanden werkt enkel met node)
globalThis.window=globalThis;
load('js/halloween-bron.js');
load('js/halloween-data.js');
load('js/halloween-kind-bron.js');
load('js/halloween-kind.js');
load('js/halloween-of.js');
load('js/halloween-markt.js');
load('js/halloween-overzicht.js');

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }
var HW=globalThis.HW, NACHTEN=globalThis.HW_NACHTEN, SCRIPTS=globalThis.HW_SCRIPTS;

print('— Planning —');
ok(HW.info.data.length===7,'zeven speelavonden');
ok(HW.info.data.every(function(d){ return NACHTEN[d]; }),'elke speelavond heeft een planning');
var rollen={}; HW.zones.forEach(function(z){ z.rollen.forEach(function(r){ rollen[r]=(rollen[r]||0)+1; }); });
ok(Object.keys(rollen).every(function(r){ return rollen[r]===1; }),'elke rol hoort bij precies één zone');
var onbekend=[];
HW.info.data.forEach(function(d){ NACHTEN[d].draaiboek.forEach(function(r){ if(!rollen[r.karakter]) onbekend.push(d+' '+r.karakter); }); });
ok(onbekend.length===0,'elke rol uit het draaiboek hoort bij een zone'+(onbekend.length?' — '+onbekend.join(', '):''));
var leeg=[];
HW.info.data.forEach(function(d){ NACHTEN[d].draaiboek.forEach(function(r){ if(!r.naam) leeg.push(d+' '+r.karakter); }); });
ok(leeg.length===0,'geen rol zonder naam'+(leeg.length?' — '+leeg.join(', '):''));
ok(HW.info.data.filter(function(d){ return !NACHTEN[d].voorlopig; }).every(function(d){ return NACHTEN[d].afbouw.length>0; }),'elke uitgewerkte avond heeft afbouwtaken');

print('— Scripts —');
var sleutels={};
HW.zones.forEach(function(z){ z.personages.forEach(function(p){ if(p.script) sleutels[p.script]=1; if(p.scriptExtra) sleutels[p.scriptExtra]=1; }); });
ok(Object.keys(sleutels).every(function(k){ return SCRIPTS[k]&&SCRIPTS[k].nl&&SCRIPTS[k].nl.length&&SCRIPTS[k].en&&SCRIPTS[k].en.length; }),'elk script bestaat in het Nederlands en het Engels');
ok(['czc1','overlever1','overlever2','overlever3'].every(function(k){ return SCRIPTS[k].fr.length&&SCRIPTS[k].de.length; }),'de vier gesproken rollen hebben ook Frans en Duits');
ok(!JSON.stringify(SCRIPTS).match(/^uten Abend|"uten Abend/),'geen afgesneden eerste letter in de Duitse tekst');

print('— Checklist —');
var ids={}, dubbel=[];
HW.checklist.forEach(function(f){ f.groepen.forEach(function(g){ g.items.forEach(function(it){ var k=f.id+'|'+it; if(ids[k]) dubbel.push(k); ids[k]=1; }); }); });
ok(dubbel.length===0,'geen twee identieke punten in dezelfde fase'+(dubbel.length?' — '+dubbel.join(', '):''));
ok(HW.checklist.length===4,'vier fasen');
ok(HW.checklist.filter(function(f){ return f.info; }).length===1,'enkel de fase "tijdens de tocht" is zonder vinkjes');

print('— De andere onderdelen —');
var ACT=globalThis.HW_ACT;
ok(HW.activiteiten.length===6,'zes onderdelen met een eigen kop (overzicht + vijf)');
ok(HW.activiteiten.filter(function(a){ return a.id!=='outbreak'; }).every(function(a){ return ACT[a.id]&&ACT[a.id].tabs&&ACT[a.id].tabs.length; }),'elk onderdeel heeft tabbladen');
var K=ACT['zeven-zeeen'], KS=globalThis.HW_KIND_SCRIPTS, KR={};
K.zones.forEach(function(z){ z.rollen.forEach(function(r){ KR[r]=(KR[r]||0)+1; }); });
ok(Object.keys(KR).every(function(r){ return KR[r]===1; }),'kindertocht: elke rol hoort bij precies één post');
ok(K.data.every(function(d){ return K.nachten[d]&&K.nachten[d].draaiboek.length>=9; }),'kindertocht: elke avond heeft een draaiboek');
ok(K.data.every(function(d){ return K.nachten[d].afbouw.length>=7; }),'kindertocht: elke avond heeft afbouwtaken');
var onbekendK=[]; K.data.forEach(function(d){ K.nachten[d].draaiboek.forEach(function(r){ if(!KR[r.karakter]&&r.karakter!=='Reserve') onbekendK.push(d+' '+r.karakter); }); });
ok(onbekendK.length===0,'kindertocht: elke rol uit het draaiboek hoort bij een post'+(onbekendK.length?' — '+onbekendK.join(', '):''));
var kk={}; K.zones.forEach(function(z){ z.personages.forEach(function(p){ (p.scripts||[]).forEach(function(s){ kk[s.key]=1; }); }); });
ok(Object.keys(kk).every(function(k){ return K.scripts[k]&&['nl','de','fr','en'].every(function(t){ return K.scripts[k][t]&&K.scripts[k][t].length; }); }),'kindertocht: elk script bestaat in vier talen');
ok(K.zones.every(function(z){ return z.opbouw.length&&z.materiaal.length&&z.fotos.length; }),'kindertocht: elke post heeft opbouw, materiaal en foto’s');
ok(K.zones.every(function(z){ return z.opbouw.some(function(s){ return typeof s!=='string'&&s.fotos&&s.fotos.length; }); }),'kindertocht: elke post heeft foto’s bij de opbouw');
ok(globalThis.HW.zones.every(function(z){ return z.opbouw.some(function(s){ return s.fotos&&s.fotos.length; }); }),'volwassentocht: elke zone heeft foto’s bij de opbouw');
ok(K.fiets&&Object.keys(K.fiets).length===6&&K.zones.every(function(z){ return ['schutter','kok','dronkaard','heks','dief'].indexOf(z.id)<0||z.aandacht.some(function(x){ return /fiets/i.test(x); }); }),'kindertocht: bij elke post met een fiets staat welke fiets en waar je hem haalt');
ok(K.data.every(function(d){ var n=K.nachten[d]; var arr=K.nachtExtra(n,d); return Array.isArray(arr)&&arr.some(function(k){ return /Fietsen/.test(k.titel)&&k.rijen.length>=4; }); }),'kindertocht: elke avond toont wie een fiets ophaalt');
ok(K.startKaartenVoor.some(function(k){ return /Fietsen/.test(k.titel)&&k.fietsMatrix&&k.fietsMatrix.length===6; }),'kindertocht: de startpagina zegt wie een fiets ophaalt');
ok([HW,K,ACT.marktje].every(function(a){ return JSON.stringify(a.praktisch).indexOf('Evergreens')>=0; }),'eten in de Evergreens staat bij beide tochten en het marktje');
var OF=ACT.of; ok(['disco','bedtime'].every(function(id){ var t=OF.tabs.find(function(x){ return x.id===id; }); return t&&t.kaarten&&t.kaarten.length; }),'O&F: disco en bedtime hebben inhoud');
var bt=OF.tabs.find(function(x){ return x.id==='bedtime'; }).kaarten.filter(function(k){ return k.talen; });
ok(bt.length===2&&bt.every(function(k){ return ['nl','de','fr','en'].every(function(t){ return k.talen[t].length===k.talen.nl.length; }); }),'O&F: beide verhalen hebben in elke taal evenveel alinea’s');
ok(ACT.show.tabs.find(function(x){ return x.id==='cast'; }).kaarten[0].tabel.rijen.length===7,'show: de bezetting staat er voor alle zeven avonden');

var Z=ACT.overzicht;
ok(Z&&Z.dagschema.length>=12&&Z.tabs.some(function(x){ return x.type==='ombouw'; })&&Z.tabs.some(function(x){ return x.type==='dagplanning'; }),'overzicht: dagschema, planning per dag en ombouw per dag');
ok(ACT['zeven-zeeen'].data.every(function(d){ return ACT['zeven-zeeen'].nachten[d].afbouw.some(function(r){ return /inkom/i.test(r.waar); })&&ACT['zeven-zeeen'].nachten[d].afbouw.some(function(r){ return /techniek|buiten|sector/i.test(r.waar); }); }),'overzicht: elke avond heeft ombouwtaken per zone');
var M=ACT.marktje;
ok(M.data.every(function(d){ return M.nachten[d]&&M.nachten[d].opbouw.length>=5&&M.nachten[d].draaiboek.length>=5&&M.nachten[d].afbouw.length>=5; }),'marktje: elke avond heeft opbouw, draaiboek en afbouw');
ok(M.data.every(function(d){ return M.nachten[d].draaiboek.every(function(r){ return r.naam&&r.karakter&&r.tijd; }); }),'marktje: elke rij heeft naam, activiteit en uren');
ok(M.checklist.length===3&&M.tabs.find(function(x){ return x.id==='activiteiten'; }).kaarten.length>=6,'marktje: checklist en activiteiten staan erin');

print('— Afspraken na de eerste avond (17/10) —');
// Twee identieke punten in dezelfde fase delen één vinkje (de id is fase + tekst).
var dubbelAlle=[];
[['volwassentocht',HW],['kindertocht',K],['marktje',M]].forEach(function(x){ x[1].checklist.forEach(function(f){ var gezien={}; f.groepen.forEach(function(g){ g.items.forEach(function(it){ if(gezien[it]) dubbelAlle.push(x[0]+' '+f.id+': '+it); gezien[it]=1; }); }); }); });
ok(dubbelAlle.length===0,'geen twee identieke checklistpunten in dezelfde fase, in geen enkel onderdeel'+(dubbelAlle.length?' — '+dubbelAlle.join(', '):''));
var dief=K.zones.find(function(z){ return z.id==='dief'; });
ok(!/door de groep heen/.test(JSON.stringify(dief))&&dief.aandacht.some(function(x){ return /van achteren/.test(x); }),'kindertocht: dieven benaderen de groep van achteren, niet erdoor');
var heks=K.zones.find(function(z){ return z.id==='heks'; });
ok(heks.personages[0].scripts.some(function(s){ return s.key==='heks-einde'; }),'kindertocht: de heks heeft een slotzin die zegt dat de tocht stopt');
ok(/E-car/.test(JSON.stringify(dief))&&/E-car/.test(JSON.stringify(K.zones.find(function(z){ return z.id==='schutter'; }))),'kindertocht: het bord van de schutter gaat met de E-car (dief 1)');
ok(JSON.stringify(M).indexOf('heks met boek buiten')<0&&/Berta/.test(JSON.stringify(M.nachten)),'marktje: Berta de heks komt in de grot, niet meer buiten');
ok(/platform van Janneke/.test(JSON.stringify(K.zones[0]))&&/ingang van de Bay/.test(JSON.stringify(HW.zones[0])),'start van beide tochten staat juist');

print('— Drive 16/10 en de wissel van 17/10 (Laura ziek) —');
var K17=K.nachten['17/10'], O17=NACHTEN['17/10'];
var naamVan=function(n,kar){ var r=n.draaiboek.find(function(x){ return x.karakter===kar; }); return r&&r.naam; };
ok(naamVan(K17,'Dief 2')==='Nick'&&/te bepalen/i.test(naamVan(K17,'Kapitein'))&&/^Matthew/.test(K17.orry),'kindertocht 17/10: Nick is dief 2, de kapitein is nog te bepalen, Matthew speelt Orry');
ok(naamVan(O17,'Overlever 3')==='Nick'&&/te bepalen/i.test(naamVan(O17,'CZC mutant 4'))&&O17.afbouw.some(function(r){ return r.karakter==='Overlever 3'&&r.naam==='Nick'; }),'volwassentocht 17/10: Nick is Overlever 3 (ook bij de afbouw), CZC-mutant 4 is nog te bepalen');
var namen17=[]; [K17.draaiboek,K17.afbouw,O17.draaiboek,O17.afbouw].forEach(function(l){ l.forEach(function(r){ namen17=namen17.concat(r.namen&&r.namen.length?r.namen:[r.naam]); }); });
ok(!namen17.some(function(x){ return /Laura/.test(String(x).replace(/\(.*?\)/g,'')); })&&K17.wijziging.length&&O17.wijziging.length,'17/10: Laura staat nergens meer ingepland en er is een melding');
ok(K17.opbouw&&K17.opbouw.some(function(r){ return r.karakter==='Dief 1'&&r.naam==='Nick'&&/E-car/.test(r.taken.join(' ')); }),'kindertocht 17/10: de opbouw uit het draaiboek staat erin (Nick doet dief 1, bord met de E-car)');
ok(['nl','de','fr','en'].every(function(t){ return /soep maken|Suppe kochen|faire de la soupe|make soup/.test(KS.kok[t][0]); }),'kindertocht: het intro van de kok is dat van de manual van 16/10');
ok(!NACHTEN['24/10'].afbouw.some(function(r){ return r.taken[0]==='En'; }),'volwassentocht 24/10: geen losse "En" bij de afbouwtaken');

print('— Drive 19/10: opbouw van elke kinderavond en het O&F-rooster —');
ok(K.data.every(function(d){ var o=K.nachten[d].opbouw; return o&&o.length>=6&&o.every(function(r){ return r.karakter&&r.naam&&r.tijd; }); }),'kindertocht: elke avond heeft een opbouwtabel (niet enkel 15/10 en 17/10)');
ok(K.data.every(function(d){ var o=K.nachten[d].opbouw; return ['Kapitein','Schutter','Dronkaard','Kok','Dief 1','Ontvangst'].every(function(rol){ return o.some(function(r){ return r.karakter.indexOf(rol)===0; }); }); }),'kindertocht: in elke opbouw staan de zes posten');
var roosterKaart=OF.startKaarten.find(function(k){ return k.titel==='Rooster per dag'; });
ok(roosterKaart&&roosterKaart.tabel.rijen.length===28,'O&F: het rooster per dag dekt 12/10 t/m 8/11 (28 dagen)');
ok(roosterKaart.tabel.rijen.filter(function(r){ return r[1]!=='—'; }).length===9&&roosterKaart.tabel.rijen.filter(function(r){ return r[2]!=='—'; }).length===8,'O&F: 9 discodagen en 8 bedtime-dagen, zoals in het overzichtsdraaiboek');
ok(roosterKaart.tabel.rijen.filter(function(r){ return /^(do|za) /.test(r[0])&&HW.info.data.indexOf(r[0].slice(3))>=0; }).every(function(r){ return r[1]==='—'&&r[2]==='—'; }),'O&F: op de tochtdagen staat geen disco of bedtime');

print('— Gevoelige gegevens —');
var alles=JSON.stringify(HW)+JSON.stringify(ACT);
ok(alles.indexOf('BVMOPE')<0,'geen PC-aanmeldgegevens in de pagina');
ok(alles.indexOf('11968477')<0,'geen lichtpaneelcode in de pagina');
ok(!/\+\s?3[12]\s?\d/.test(alles),'geen telefoonnummers in de pagina');

print('— Foto’s —');
var fotos=[];
(function loop(o){ if(!o||typeof o!=='object') return; if(typeof o.src==='string'&&o.src.indexOf('assets/halloween/')>=0) fotos.push(o.src); Object.keys(o).forEach(function(k){ loop(o[k]); }); })(HW);
(function loop2(o){ if(!o||typeof o!=='object') return; if(typeof o.src==='string'&&o.src.indexOf('assets/halloween/')>=0) fotos.push(o.src); Object.keys(o).forEach(function(k){ loop2(o[k]); }); })(ACT);
ok(fotos.length>40,'er zijn foto’s ('+fotos.length+' verwijzingen)');
if(typeof require==='function'){
  var fs=require('fs'), path=require('path');
  var ontbreekt=fotos.filter(function(s){ return !fs.existsSync(path.join('paginas',s)); });
  ok(ontbreekt.length===0,'elke fotolink wijst naar een bestaand bestand'+(ontbreekt.length?' — '+ontbreekt.join(', '):''));
  var map=fs.readdirSync('assets/halloween'), gebruikt={}; fotos.forEach(function(s){ gebruikt[s.split('/').pop()]=1; });
  var ongebruikt=map.filter(function(f){ return !gebruikt[f]; });
  ok(ongebruikt.length===0,'elk foto-bestand wordt ergens getoond'+(ongebruikt.length?' — '+ongebruikt.join(', '):''));
}

print('');
print(fouten===0?'RESULTAAT: alles in orde':'RESULTAAT: '+fouten+' fout(en)');

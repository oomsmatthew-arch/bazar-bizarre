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
ok(HW.activiteiten.length===5,'vijf onderdelen met een eigen kop');
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

var M=ACT.marktje;
ok(M.data.every(function(d){ return M.nachten[d]&&M.nachten[d].opbouw.length>=5&&M.nachten[d].draaiboek.length>=5&&M.nachten[d].afbouw.length>=5; }),'marktje: elke avond heeft opbouw, draaiboek en afbouw');
ok(M.data.every(function(d){ return M.nachten[d].draaiboek.every(function(r){ return r.naam&&r.karakter&&r.tijd; }); }),'marktje: elke rij heeft naam, activiteit en uren');
ok(M.checklist.length===3&&M.tabs.find(function(x){ return x.id==='activiteiten'; }).kaarten.length>=6,'marktje: checklist en activiteiten staan erin');

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

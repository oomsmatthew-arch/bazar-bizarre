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

print('— Gevoelige gegevens —');
var alles=JSON.stringify(HW);
ok(alles.indexOf('BVMOPE')<0,'geen PC-aanmeldgegevens in de pagina');
ok(alles.indexOf('11968477')<0,'geen lichtpaneelcode in de pagina');
ok(!/\+\s?3[12]\s?\d/.test(alles),'geen telefoonnummers in de pagina');

print('— Foto’s —');
var fotos=[];
(function loop(o){ if(!o||typeof o!=='object') return; if(typeof o.src==='string'&&o.src.indexOf('assets/halloween/')>=0) fotos.push(o.src); Object.keys(o).forEach(function(k){ loop(o[k]); }); })(HW);
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

// Kleine testomgeving: draait inventaris.js zonder browser (offline-modus, dus lokale opslag).
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
globalThis.clearTimeout=function(){};
globalThis.setInterval=function(){ return 0; };
globalThis.clearInterval=function(){};

var fouten=0;
function ok(voorwaarde,wat){ if(!voorwaarde){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

load('./js/inventaris.js');

BBInv.init();
BBInv.setActor('Tester');

print('\n— Project aanmaken —');
var p=BBInv.addProject({naam:'Kerstmarkt 2026',doel:'Markt opzetten',deadline:'2026-12-01'});
ok(!!p.id,'project krijgt een id');
ok(p.kolommen.length===4,'standaardkolommen: '+p.kolommen.join(' / '));
ok(BBInv.getProjecten().length===1,'staat in de lijst');
ok(BBInv.getProject(p.id).naam==='Kerstmarkt 2026','terugvinden op id');

print('\n— Taken —');
var t1=BBInv.addTaak({projectId:p.id,kolom:'Te doen',titel:'Kraampjes bestellen'});
var t2=BBInv.addTaak({projectId:p.id,kolom:'Te doen',titel:'Muziek regelen',wie:['Jan'],deadline:'2026-11-20'});
var t3=BBInv.addTaak({projectId:p.id,kolom:'Bezig',titel:'Vergunning aanvragen'});
ok(BBInv.getTaken(p.id).length===3,'drie taken in het project');
ok(t2.pos>t1.pos,'tweede taak komt onder de eerste (pos '+t1.pos+' → '+t2.pos+')');

print('\n— Verslepen (volgorde + andere kolom) —');
BBInv.reorderTaken([t2.id,t1.id],'Te doen');
var teDoen=BBInv.getTaken(p.id).filter(function(t){return t.kolom==='Te doen';});
ok(teDoen[0].id===t2.id,'volgorde omgedraaid binnen de kolom');
BBInv.reorderTaken([t3.id,t1.id],'Bezig');
ok(BBInv.getTaken(p.id).filter(function(t){return t.kolom==='Bezig';}).length===2,'taak verhuisde naar kolom Bezig');

print('\n— Afvinken —');
BBInv.updateTaak(t1.id,{klaar:true});
var na=BBInv.getTaken(p.id).find(function(t){return t.id===t1.id;});
ok(na.klaar===true,'taak staat op klaar');
ok(na.klaarDoor==='Tester','naam van wie afvinkte bewaard: '+na.klaarDoor);
ok(na.klaarTs>0,'tijdstip van afvinken bewaard');
BBInv.updateTaak(t1.id,{klaar:false});
ok(BBInv.getTaken(p.id).find(function(t){return t.id===t1.id;}).klaarDoor==='','heropenen wist de afvinker weer');

print('\n— Subtaken en labels bewaren —');
BBInv.updateTaak(t2.id,{subtaken:[{text:'Offerte vragen',done:true},{text:'Bevestigen',done:false}],labels:['Techniek','Budget']});
var t2b=BBInv.getTaken(p.id).find(function(t){return t.id===t2.id;});
ok(t2b.subtaken.length===2 && t2b.subtaken[0].done===true,'subtaken blijven staan');
ok(t2b.labels.join(',')==='Techniek,Budget','labels blijven staan');

print('\n— Kolom hernoemen: taken verhuizen mee —');
BBInv.verplaatsTaken(p.id,'Bezig','Aan het werk');
ok(BBInv.getTaken(p.id).filter(function(t){return t.kolom==='Aan het werk';}).length===2,'beide taken kregen de nieuwe kolomnaam');

print('\n— Bespreking —');
BBInv.addBericht({projectId:p.id,auteur:'Tester',tekst:'Eerste bericht'});
BBInv.addBericht({projectId:p.id,auteur:'Jan',tekst:'Tweede bericht'});
ok(BBInv.getBerichten(p.id).length===2,'twee berichten');
ok(BBInv.getBerichten(p.id)[0].tekst==='Eerste bericht','oudste bericht staat vooraan');

print('\n— Tweede project blijft gescheiden —');
var p2=BBInv.addProject({naam:'Zaal opknappen'});
BBInv.addTaak({projectId:p2.id,kolom:'Te doen',titel:'Verf kopen'});
ok(BBInv.getTaken(p.id).length===3,'project 1 heeft nog steeds 3 taken');
ok(BBInv.getTaken(p2.id).length===1,'project 2 heeft 1 taak');

print('\n— Verwijderen ruimt taken en berichten mee op —');
BBInv.removeProject(p.id);
ok(BBInv.getProjecten().length===1,'project weg uit de lijst');
ok(BBInv.getTaken(p.id).length===0,'taken van dat project weg');
ok(BBInv.getBerichten(p.id).length===0,'berichten van dat project weg');
ok(BBInv.getTaken(p2.id).length===1,'het andere project bleef ongemoeid');

print('\n— Offline bewaard op het toestel —');
ok(!!store['bb_projecten'],'projecten staan in de lokale reservekopie');
ok(!!store['bb_projecttaken'],'taken staan in de lokale reservekopie');
var bewaard=JSON.parse(store['bb_projecten']);
ok(bewaard.length===1 && bewaard[0].naam==='Zaal opknappen','reservekopie klopt met de cache');

print('\n— Activiteitenlog —');
var acts=BBInv.getActiviteit().map(function(a){return a.actie;});
ok(acts.some(function(a){return a.indexOf('Project aangemaakt')===0;}),'aanmaken staat in het logboek');
ok(acts.some(function(a){return a.indexOf('Taak toegevoegd')===0;}),'taak toevoegen staat in het logboek');
ok(acts.some(function(a){return a.indexOf('Project verwijderd')===0;}),'verwijderen staat in het logboek');
ok(BBInv.getActiviteit()[0].wie==='Tester','naam van de gebruiker wordt meegeschreven');

print(fouten? ('\nRESULTAAT: '+fouten+' fout(en)') : '\nRESULTAAT: alles in orde');

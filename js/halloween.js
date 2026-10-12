// =====================================================================
//  HALLOWEEN · THE OUTBREAK — de pagina zelf (paginas/halloween.html).
//
//  Dit bestand tekent alleen. De inhoud staat in js/halloween-data.js (zones, techniek,
//  checklist) en js/halloween-bron.js (planning per avond + gesproken teksten).
//
//  Onthouden op dit toestel (localStorage, nergens gedeeld):
//    bb_hw_datum   de gekozen avond
//    bb_hw_wie     de gekozen collega bij "Planning → Wie ben jij?"
//    bb_hw_check   de checklist: per avond de vinkjes, notities en het rapport
//
//  Navigatie zit in het adres (#planning, #zones/sector1/rollen, #techniek/rook,
//  #checklist …), zodat de terugknop en een doorgestuurde link werken.
// =====================================================================
(function(){
'use strict';

const HW=window.HW, NACHTEN=window.HW_NACHTEN||{}, SCRIPTS=window.HW_SCRIPTS||{};
if(!HW){ return; }

const K_DATUM='bb_hw_datum', K_WIE='bb_hw_wie', K_CHECK='bb_hw_check';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const lsGet=k=>{ try{return localStorage.getItem(k);}catch(e){return null;} };
const lsSet=(k,v)=>{ try{localStorage.setItem(k,v);}catch(e){} };

const DAGEN=['zo','ma','di','wo','do','vr','za'];
const TABS=[
  {id:'start',ic:'🎃',t:'Start'},
  {id:'planning',ic:'📅',t:'Planning'},
  {id:'tijd',ic:'⏱️',t:'Tijdsloten'},
  {id:'zones',ic:'🗺️',t:'Zones'},
  {id:'techniek',ic:'🔧',t:'Techniek'},
  {id:'checklist',ic:'✅',t:'Checklist'},
  {id:'praktisch',ic:'⚠️',t:'Praktisch'},
  {id:'docs',ic:'📎',t:'Documenten'}
];

// ---------------------------------------------------------------- hulpjes
function datumObj(d){ const [dd,mm]=d.split('/').map(Number); return new Date(HW.info.jaar,mm-1,dd); }
function dagnaam(d){ return DAGEN[datumObj(d).getDay()]; }
function vandaagStr(){ const n=new Date(); return String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0'); }
function dagenTot(d){
  const n=new Date(); n.setHours(0,0,0,0);
  return Math.round((datumObj(d)-n)/86400000);
}
// De eerstvolgende speelavond (vandaag telt mee). Is de laatste voorbij: de laatste.
function volgendeAvond(){
  const lijst=HW.info.data;
  return lijst.find(d=>dagenTot(d)>=0)||lijst[lijst.length-1];
}
function voornaam(n){ return String(n||'').replace(/\(.*?\)/g,'').trim().replace(/^Laurant$/,'Laurent'); }
function zoneVoorRol(karakter){ return HW.zones.find(z=>z.rollen.indexOf(karakter)>=0)||null; }
function kleurVoorRol(karakter){ const z=zoneVoorRol(karakter); return z?z.kleur:'var(--line)'; }
function alleNamen(){
  const s=new Set();
  Object.values(NACHTEN).forEach(n=>(n.draaiboek||[]).forEach(r=>{ const v=voornaam(r.naam); if(v) s.add(v); }));
  return [...s].sort((a,b)=>a.localeCompare(b,'nl'));
}
function tijdTxt(t){ return String(t||'').replace(/(\d+)\.(\d+)/g,'$1u$2').replace('-',' – '); }
function hash(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
function bevestig(opties){ return (typeof bbBevestig==='function') ? bbBevestig(opties) : Promise.resolve(confirm(opties.titel||'Zeker?')); }

// ---------------------------------------------------------------- toestand
const state={tab:'start',sub:'',sub2:'',datum:null,wie:''};
(function init(){
  const lijst=HW.info.data;
  const opgeslagen=lsGet(K_DATUM);
  state.datum=(opgeslagen&&lijst.indexOf(opgeslagen)>=0)?opgeslagen:volgendeAvond();
  let wie=lsGet(K_WIE);
  if(wie===null){
    // Eerste keer: de ingelogde collega voorinvullen als de voornaam in de planning staat.
    try{
      const eerste=((typeof currentUserName==='function'?currentUserName():'')||'').trim().split(/\s+/)[0].toLowerCase();
      wie=alleNamen().find(n=>n.toLowerCase()===eerste)||'';
    }catch(e){ wie=''; }
  }
  state.wie=wie||'';
})();

function parseHash(){
  const p=(location.hash||'').replace(/^#/,'').split('/').map(decodeURIComponent);
  state.tab=TABS.some(t=>t.id===p[0])?p[0]:'start';
  state.sub=p[1]||''; state.sub2=p[2]||'';
}
function ga(pad){
  if(location.hash==='#'+pad) render(true); else location.hash=pad;
}
function kiesDatum(d){ state.datum=d; lsSet(K_DATUM,d); render(); }

// ---------------------------------------------------------------- onderdelen
function datumKnoppen(){
  const vandaag=vandaagStr();
  return '<div class="hw-datums" role="group" aria-label="Kies een avond">'+HW.info.data.map(d=>{
    const n=NACHTEN[d]; const aant=n?new Set((n.draaiboek||[]).map(r=>voornaam(r.naam))).size:0;
    return '<button type="button" class="hw-datum'+(d===state.datum?' actief':'')+(d===vandaag?' vandaag':'')+'" data-datum="'+d+'">'
      +'<small>'+dagnaam(d)+(d===vandaag?' · vandaag':'')+'</small><b>'+d+'</b><small>'+aant+' mdw</small></button>';
  }).join('')+'</div>';
}
function fotoKnop(f,klasse){
  return '<figure class="hw-foto" data-foto="'+esc(f.src)+'"><img loading="lazy" src="'+esc(f.src)+'" alt="'+esc(f.tekst)+'">'
    +(f.tekst?'<figcaption>'+esc(f.tekst)+'</figcaption>':'')+'</figure>';
}
function fotoGalerij(lijst){
  if(!lijst||!lijst.length) return '<p class="hw-muted">Geen foto’s voor dit onderdeel.</p>';
  return '<div class="hw-fotos">'+lijst.map(fotoKnop).join('')+'</div>';
}
function lijst(items,klasse){ return '<ul class="'+(klasse||'hw-lijst')+'">'+items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>'; }
function paragrafen(arr){ return arr.map(p=>'<p>'+esc(p)+'</p>').join(''); }

// ---------------------------------------------------------------- START
function viewStart(){
  const volgende=volgendeAvond(), nog=dagenTot(volgende);
  const wanneer=nog===0?'Vandaag!':nog===1?'Morgen':nog>1?'Over '+nog+' dagen':'Afgelopen';
  let h='';
  h+='<div class="hw-kaart hw-volgende"><div class="dag">'+volgende+'</div><div class="wanneer"><b>'+(nog>=0?'Eerstvolgende avond':'Laatste avond')+'</b><br>'
    +'<span class="hw-muted">'+dagnaam(volgende)+' · '+wanneer+'</span></div>'
    +'<div class="hw-knoppen" style="margin:0"><button class="btn primary" data-kies="'+volgende+'" data-ga="planning">📅 Planning</button>'
    +'<button class="btn" data-kies="'+volgende+'" data-ga="checklist">✅ Checklist</button></div></div>';

  h+='<div class="hw-kaart"><h3>Het verhaal</h3>'+paragrafen(HW.verhaal)+'</div>';

  h+='<div class="hw-kaart"><h3>Zo verloopt de tocht</h3><ol class="hw-stappen">'+HW.stappen.map(s=>{
    const z=HW.zones.find(x=>x.id===s.zone);
    return '<li class="hw-stap" style="--zk:'+(z?z.kleur:'var(--hw)')+'" data-ga="zones/'+s.zone+'"><span class="nr">'+s.nr+'</span><div><b>'+esc(s.titel)+'</b>'
      +'<small>'+esc(z?z.naam:'')+'</small><p>'+esc(s.tekst)+'</p></div></li>';
  }).join('')+'</ol></div>';

  h+='<div class="hw-kaart"><h3>De code: '+esc(HW.code.volledig)+'</h3>'
    +'<p class="hw-muted">Vier cijfers, verspreid over de tocht. Zonder de juiste code gaat de kist in de Safezone niet open.</p>'
    +'<div class="hw-code">'+HW.code.cijfers.map(c=>{
      const ps=(HW.code.posters[c.c]||[]);
      return '<div class="hw-cijfer"><div class="c">'+esc(c.c)+'</div><div><p>'+esc(c.waar)+'</p>'
        +(ps.length?'<div class="hw-posters">'+ps.map(f=>'<img loading="lazy" data-foto="'+esc(f.src)+'" src="'+esc(f.src)+'" alt="'+esc(f.tekst)+'">').join('')+'</div>':'')+'</div></div>';
    }).join('')+'</div><div class="hw-nota">'+esc(HW.code.nota)+'</div></div>';

  h+='<div class="hw-grid">'
    +snelkaart('zones','🗺️','Zones','Inkom, locker, sector 1 & 2, bos en Safezone: rollen, scripts, opbouw en foto’s.')
    +snelkaart('techniek','🔧','Techniek','PC, muziek, licht, rook en portofoons — stap voor stap met foto’s.')
    +snelkaart('tijd','⏱️','Tijdsloten & uren','Het uurschema van de avond en de tijdsloten voor de gasten.')
    +snelkaart('praktisch','⚠️','Veiligheid & praktisch','Code 10, pauzes, water, omkleden, ombouw en afbouw.')
    +'</div>';
  return h;
}
function snelkaart(pad,ic,titel,tekst){
  return '<a class="hw-kaart" href="#'+pad+'" style="text-decoration:none;color:inherit;display:block"><h3>'+ic+' '+esc(titel)+'</h3><p class="hw-muted" style="margin:0">'+esc(tekst)+'</p></a>';
}

// ---------------------------------------------------------------- PLANNING
function rijIk(naam){ return state.wie && voornaam(naam)===state.wie; }
function viewPlanning(){
  const d=state.datum, n=NACHTEN[d]||{draaiboek:[],afbouw:[]};
  let h='';
  h+=datumKnoppen();
  h+='<div class="hw-wie"><label for="hwWie"><b>Wie ben jij?</b></label><select id="hwWie"><option value="">— niemand (toon iedereen) —</option>'
    +alleNamen().map(x=>'<option'+(x===state.wie?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>'
    +'<span class="hw-muted">Dan lichten jouw rijen op en zie je al je avonden.</span></div>';

  if(state.wie) h+=mijnAvonden();

  h+='<div class="hw-kaart"><h3>Draaiboek · '+dagnaam(d)+' '+d+'</h3>';
  if(n.voorlopig) h+='<div class="hw-nota">Voorlopig: het draaiboek van deze avond is nog niet uitgewerkt. Dit is de rolverdeling uit de manual. Zo ziet de planning er nu uit; de afbouwtaken volgen.</div>';
  h+='<p class="hw-muted">'+(n.draaiboek[0]?esc(tijdTxt(n.draaiboek[0].tijd)):'')+' · tik een rij om naar de zone te gaan</p>';
  h+='<table class="hw-tabel"><thead><tr><th>Karakter</th><th>Naam</th><th>Waar</th></tr></thead><tbody>'
    +n.draaiboek.map(r=>{
      const z=zoneVoorRol(r.karakter);
      return '<tr style="--zk:'+kleurVoorRol(r.karakter)+';cursor:pointer" class="'+(rijIk(r.naam)?'ik':'')+'"'+(z?' data-ga="zones/'+z.id+'"':'')+'>'
        +'<td>'+esc(r.karakter)+'</td><td>'+esc(r.naam)+(rijIk(r.naam)?'<span class="hw-ikbadge">jij</span>':'')+'</td><td>'+esc(r.waar)+'</td></tr>';
    }).join('')+'</tbody></table></div>';

  h+='<div class="hw-kaart"><h3>Afbouw · 22u30 – 23u30</h3>';
  if(!n.afbouw.length){
    h+='<p class="hw-muted">'+(n.voorlopig?'De afbouwtaken van deze avond staan nog niet in het draaiboek.':'Geen afbouwtaken gevonden.')+'</p>';
  }else{
    h+='<p class="hw-muted">Wie iets afbouwt, heeft het ook opgezet.</p><div class="hw-afbouw">'+n.afbouw.map(r=>{
      return '<div class="hw-afb'+(rijIk(r.naam)?' ik':'')+'" style="--zk:'+kleurVoorRol(r.karakter)+'"><b>'+esc(r.naam)+(rijIk(r.naam)?'<span class="hw-ikbadge">jij</span>':'')+'</b>'
        +'<div class="waar">'+esc(r.karakter)+' · '+esc(r.waar)+'</div>'
        +(r.taken&&r.taken.length?'<ul>'+r.taken.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'')+'</div>';
    }).join('')+'</div>';
  }
  h+='</div>';
  h+='<p class="hw-muted">Stand van de Drive-documenten: '+esc(window.HW_STAND||'')+'. Is er iets gewijzigd in het draaiboek? Dan moet deze pagina bijgewerkt worden.</p>';
  return h;
}
function mijnAvonden(){
  // Eén regel per avond: wie op één avond meerdere rollen heeft (bv. scanner én mutant)
  // krijgt ze samen te zien, met de kleur van de eerste.
  const rijen=[];
  HW.info.data.forEach(d=>{
    const n=NACHTEN[d]; if(!n) return;
    const mijn=(n.draaiboek||[]).filter(r=>voornaam(r.naam)===state.wie);
    if(mijn.length) rijen.push({d,mijn});
  });
  let h='<div class="hw-kaart"><h3>Jouw avonden, '+esc(state.wie)+'</h3>';
  if(!rijen.length) return h+'<p class="hw-muted">Je staat nog op geen enkele avond.</p></div>';
  h+='<div class="hw-mijn">'+rijen.map(({d,mijn})=>{
    const zones=[...new Set(mijn.map(r=>{ const z=zoneVoorRol(r.karakter); return z?z.naam:r.waar; }))];
    return '<div class="rij'+(d===state.datum?' actief':'')+'" style="--zk:'+kleurVoorRol(mijn[0].karakter)+'" data-datum="'+d+'"><b>'+dagnaam(d)+' '+d+'</b><span>'+mijn.map(r=>esc(r.karakter)).join(' · ')+'</span>'
      +'<span class="hw-muted">'+esc(zones.join(' · '))+'</span></div>';
  }).join('')+'</div></div>';
  return h;
}

// ---------------------------------------------------------------- TIJDSLOTEN
function viewTijd(){
  const T=HW.tijdsloten;
  const segs=[
    ['Ombouw',19*60,19*60+30,'#8a5cc7'],['Pauze',19*60+30,20*60,'#8a9a8e'],['Opbouw',20*60,20*60+25,'#d98a2b'],
    ['',20*60+25,20*60+30,'#7a5a3a'],['Tocht',20*60+30,22*60+20,'#e8772e'],['',22*60+20,22*60+30,'#c0392b'],['Afbouw',22*60+30,23*60+30,'#2f8f9d']
  ];
  const start=19*60, eind=23*60+30, tot=eind-start;
  const nu=new Date(), nuMin=nu.getHours()*60+nu.getMinutes();
  const toon=(state.datum===vandaagStr()) && nuMin>=start && nuMin<=eind;
  let h='<div class="hw-kaart"><h3>De avond in één oogopslag</h3>'
    +'<div class="hw-balk">'+segs.map(s=>'<div style="width:'+((s[2]-s[1])/tot*100).toFixed(2)+'%;background:'+s[3]+'" title="'+s[0]+'">'+esc(s[0])+'</div>').join('')
    +(toon?'<span class="hw-nu" style="left:'+((nuMin-start)/tot*100).toFixed(2)+'%" title="Nu"></span>':'')+'</div>'
    +'<div class="hw-balkuren"><span>19u00</span><span>20u00</span><span>20u30</span><span>22u20</span><span>23u30</span></div>'
    +'<ul class="hw-schema">'+HW.uurschema.map(r=>'<li><span class="u">'+esc(r[0])+'</span><span class="t"><b>'+esc(r[1])+'</b>'+(r[2]?'<small>'+esc(r[2])+'</small>':'')+'</span></li>').join('')+'</ul></div>';

  // tijdsloten: van 20:30 tot het laatste vertrek, per 10 minuten
  const [sh,sm]=T.start.split(':').map(Number), [lh,lm]=T.laatste.split(':').map(Number);
  const slots=[]; for(let m=sh*60+sm;m<=lh*60+lm;m+=T.stapMin) slots.push(m);
  const f=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  h+='<div class="hw-kaart"><h3>Tijdsloten voor de gasten</h3><p class="hw-muted">Gasten schrijven in per tijdslot van '+T.stapMin+' minuten, met '+T.perSlot+' personen per tijdslot. De inkom heeft de lijst van vanavond.</p>'
    +'<div class="hw-slots">'+slots.map((m,i)=>'<div class="hw-slot'+(i===slots.length-1?' laatste':'')+'"><b>'+f(m)+'</b><small>'+(i===slots.length-1?'laatste vertrek':'tot '+T.perSlot+' pers.')+'</small></div>').join('')+'</div></div>';

  h+='<div class="hw-kaart"><h3>Regels voor de doorstroom</h3><dl class="hw-deflijst">'+T.regels.map(r=>'<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>').join('')+'</dl></div>';
  return h;
}

// ---------------------------------------------------------------- ZONES
function matrixHtml(z){
  const data=HW.info.data;
  let h='<div style="overflow-x:auto"><table class="hw-matrix"><thead><tr><th>Rol</th>'
    +data.map(d=>'<th'+(d===state.datum?' style="color:var(--hw)"':'')+'>'+d+'</th>').join('')+'</tr></thead><tbody>';
  z.rollen.forEach(rol=>{
    h+='<tr><td>'+esc(rol)+'</td>'+data.map(d=>{
      const n=NACHTEN[d]; const r=n&&(n.draaiboek||[]).find(x=>x.karakter===rol);
      const ik=r&&rijIk(r.naam);
      return '<td'+(ik?' style="background:var(--hw-bg);font-weight:700"':'')+'>'+(r?esc(voornaam(r.naam)):'<span class="hw-muted">–</span>')+'</td>';
    }).join('')+'</tr>';
  });
  return h+'</tbody></table></div>';
}
function viewZones(){
  const z=HW.zones.find(x=>x.id===state.sub)||HW.zones[0];
  const sub=['overzicht','rollen','opbouw','fotos'].indexOf(state.sub2)>=0?state.sub2:'overzicht';
  let h='<div class="hw-zonekeuze">'+HW.zones.map(x=>'<button type="button" class="hw-zbtn'+(x.id===z.id?' actief':'')+'" style="--zk:'+x.kleur+'" data-ga="zones/'+x.id+'/'+sub+'">'+esc(x.naam)+'<small>'+esc(x.kort)+'</small></button>').join('')+'</div>';
  h+='<div class="hw-sub">'+[['overzicht','Overzicht'],['rollen','Rollen & scripts'],['opbouw','Opbouw & materiaal'],['fotos','Foto’s ('+(z.fotos.length)+')']].map(s=>
    '<button type="button" class="hw-subtab'+(s[0]===sub?' actief':'')+'" data-ga="zones/'+z.id+'/'+s[0]+'">'+s[1]+'</button>').join('')+'</div>';
  h+='<h3 style="margin:0 0 10px;border-left:6px solid '+z.kleur+';padding-left:10px">'+esc(z.naam)+'</h3>';

  if(sub==='overzicht'){
    h+='<div class="hw-kaart"><h3>Wie staat hier</h3>'+matrixHtml(z)+'</div>';
    h+='<div class="hw-kaart"><h3>Wat gebeurt hier</h3>'+paragrafen(z.wat)+'</div>';
    h+='<div class="hw-kaart hw-nood"><h3>Aandachtspunten</h3>'+lijst(z.aandacht)+'</div>';
    if(z.plattegrond) h+='<div class="hw-kaart"><h3>Plattegrond</h3><img class="hw-plan" loading="lazy" data-foto="'+esc(z.plattegrond.src)+'" src="'+esc(z.plattegrond.src)+'" alt="'+esc(z.plattegrond.tekst)+'"><p class="hw-muted" style="text-align:center;margin-top:6px">Tik om te vergroten</p></div>';
  }else if(sub==='rollen'){
    h+=z.personages.map((p,i)=>personageHtml(z,p,i)).join('');
  }else if(sub==='opbouw'){
    h+=datumKnoppen();
    const n=NACHTEN[state.datum]; const afb=n?(n.afbouw||[]).filter(r=>z.rollen.indexOf(r.karakter)>=0):[];
    h+='<div class="hw-kaart"><h3>Materiaal & afbouw</h3><p class="hw-muted">Wie iets afbouwt, heeft het ook opgezet. Het materiaal zit in de doos van de zone.</p>'
      +'<div class="hw-mat">'+z.materiaal.map(g=>'<div><h5>'+esc(g.groep)+'</h5>'+lijst(g.items,'')+'</div>').join('')+'</div></div>';
    h+='<div class="hw-kaart"><h3>Opbouw (ombouw 19u)</h3><ol class="hw-stappenlijst">'+z.opbouw.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol></div>';
    h+='<div class="hw-kaart"><h3>Afbouw op '+dagnaam(state.datum)+' '+state.datum+'</h3>'
      +(afb.length?'<div class="hw-afbouw">'+afb.map(r=>'<div class="hw-afb'+(rijIk(r.naam)?' ik':'')+'" style="--zk:'+z.kleur+'"><b>'+esc(r.naam)+'</b><div class="waar">'+esc(r.karakter)+' · '+esc(r.waar)+'</div>'
        +(r.taken&&r.taken.length?'<ul>'+r.taken.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'')+'</div>').join('')+'</div>'
        :'<p class="hw-muted">'+(n&&n.voorlopig?'De afbouwtaken van deze avond staan nog niet in het draaiboek.':'Voor deze zone staan er die avond geen eigen afbouwtaken in het draaiboek (kijk bij Planning voor alle taken).')+'</p>')+'</div>';
  }else{
    h+='<div class="hw-kaart"><h3>Foto’s van '+esc(z.naam)+'</h3>'+fotoGalerij(z.fotos)+'</div>';
  }
  return h;
}
function personageHtml(z,p,i){
  const open=z.personages.length===1||i===0;
  let h='<details class="hw-det"'+(open?' open':'')+'><summary><span>'+esc(p.naam)+'</span><span class="hw-pill">'+esc(p.sub)+'</span></summary><div class="inh">';
  h+='<h4 style="margin:6px 0">Wie ben je en wat doe je</h4>'+paragrafen(p.wie);
  if(p.tip) h+='<div class="hw-tip">'+esc(p.tip)+'</div>';
  h+='<h4 style="margin:12px 0 4px">Wat draag je</h4><div class="hw-kleding">'
    +'<div><h5>Zelf voorzien</h5>'+lijst(p.zelf,'')+'</div>'
    +'<div><h5>Voorzien door CP</h5>'+lijst(p.cp,'')+'</div>'
    +(p.attr&&p.attr.length?'<div><h5>Attributen</h5>'+lijst(p.attr,'')+'</div>':'')+'</div>';
  if(p.fotos&&p.fotos.length) h+='<div class="hw-fotos" style="margin-top:10px">'+p.fotos.map(fotoKnop).join('')+'</div>';
  if(p.script) h+='<h4 style="margin:14px 0 4px">Script</h4>'+scriptHtml(p.script,z.id+i+'a');
  if(p.scriptExtra) h+='<h4 style="margin:14px 0 4px">Roepteksten als CZC</h4>'+scriptHtml(p.scriptExtra,z.id+i+'b');
  return h+'</div></details>';
}
const TAALNAAM={nl:'Nederlands',en:'English',fr:'Français',de:'Deutsch'};
function regel(l){
  if(/^\(.*\)$/.test(l)) return '<p class="regie">'+esc(l)+'</p>';
  const m=l.match(/^(\([^)]*\))\s*(.*)$/);
  if(m) return '<p><span class="regie-in">'+esc(m[1])+'</span> '+esc(m[2])+'</p>';
  return '<p>'+esc(l)+'</p>';
}
function scriptHtml(key,uid){
  const s=SCRIPTS[key]; if(!s) return '<p class="hw-muted">Geen script.</p>';
  const talen=['nl','en','fr','de'].filter(t=>s[t]&&s[t].length);
  let h='<div class="hw-script" data-script="'+uid+'"><div class="hw-taal">'+talen.map((t,i)=>'<button type="button" data-taal="'+uid+'|'+t+'" class="'+(i===0?'actief':'')+'">'+TAALNAAM[t]+'</button>').join('')+'</div>';
  talen.forEach((t,i)=>{ h+='<div data-paneel="'+uid+'|'+t+'"'+(i===0?'':' hidden')+'>'+s[t].map(regel).join('')+'</div>'; });
  return h+'</div>';
}

// ---------------------------------------------------------------- TECHNIEK
function viewTechniek(){
  const T=HW.techniek;
  let h='<div class="hw-kaart"><h3>Overzicht</h3><p class="hw-muted">'+esc(T.intro)+'</p><table class="hw-ttabel"><thead><tr>'+T.kop.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>'
    +T.overzicht.map(r=>'<tr>'+r.map((c,i)=>'<td data-k="'+esc(T.kop[i])+'">'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  h+='<div class="hw-sub">'+T.blokken.map(b=>'<button type="button" class="hw-subtab'+(b.id===state.sub?' actief':'')+'" data-ga="techniek/'+b.id+'">'+esc(b.titel)+'</button>').join('')+'</div>';
  h+=T.blokken.map(b=>{
    const open=b.id===state.sub;
    return '<details class="hw-det" id="tk-'+b.id+'"'+(open?' open':'')+'><summary>'+esc(b.titel)+(b.fotos.length?'<span class="hw-pill">'+b.fotos.length+' foto’s</span>':'')+'</summary><div class="inh">'
      +'<ol class="hw-stappenlijst">'+b.stappen.map(s=>'<li'+(/^!!/.test(s)?' class="waarschuwing"':'')+'>'+esc(s)+'</li>').join('')+'</ol>'
      +(b.fotos.length?fotoGalerij(b.fotos):'')+'</div></details>';
  }).join('');
  return h;
}

// ---------------------------------------------------------------- CHECKLIST
function leesCheck(){ try{return JSON.parse(lsGet(K_CHECK))||{};}catch(e){return {};} }
function avond(d){ const a=leesCheck()[d]||{}; return {v:a.v||'',c:a.c||{},o:a.o||{},r:a.r||{}}; }
function bewaar(d,a){ const o=leesCheck(); o[d]=a; lsSet(K_CHECK,JSON.stringify(o)); }
function itemId(f,it){ return f.id+':'+hash(it); }
function faseTelling(f,a){
  if(f.info) return {klaar:0,totaal:0};
  let klaar=0,totaal=0;
  f.groepen.forEach(g=>g.items.forEach(it=>{ totaal++; if(a.c[itemId(f,it)]) klaar++; }));
  return {klaar,totaal};
}
function totaalTelling(a){
  let klaar=0,totaal=0;
  HW.checklist.forEach(f=>{ const t=faseTelling(f,a); klaar+=t.klaar; totaal+=t.totaal; });
  return {klaar,totaal};
}
let actieveFase=null;
function viewChecklist(){
  const d=state.datum, a=avond(d);
  if(!actieveFase||!HW.checklist.some(f=>f.id===actieveFase)) actieveFase=state.sub&&HW.checklist.some(f=>f.id===state.sub)?state.sub:HW.checklist[0].id;
  let h='<div class="hw-geenprint">'+datumKnoppen()+'</div>';
  h+='<div class="hw-kaart hw-geenprint"><div class="hw-cl-kop"><div><label for="hwVerantw">Verantwoordelijke van de avond</label><input class="hw-inp" id="hwVerantw" data-verantw type="text" placeholder="Naam" value="'+esc(a.v)+'"></div>'
    +'<div class="hw-knoppen" style="margin:0"><button class="btn" id="hwPrint">🖨️ Afdrukken</button><button class="btn gevaar" id="hwWis">Alles wissen</button></div></div>'
    +'<div class="hw-totaal"><b id="hwTotTxt"></b><span class="vb"><i id="hwTotBalk"></i></span></div>'
    +'<div class="hw-fasen">'+HW.checklist.map(f=>{
      return '<button type="button" class="hw-fase'+(f.id===actieveFase?' actief':'')+'" data-fase="'+f.id+'" id="hwF-'+f.id+'"><b>Fase '+f.nr+' · '+esc(f.titel)+'</b><small>'+esc(f.tijd)+'</small><span class="vb"><i></i></span></button>';
    }).join('')+'</div></div>';
  h+='<div class="hw-printkop" style="display:none"></div>';
  h+=HW.checklist.map(f=>{
    let p='<section class="hw-kaart hw-fasepaneel" data-paneel-fase="'+f.id+'"'+(f.id===actieveFase?'':' hidden')+'>'
      +'<h3>Fase '+f.nr+' · '+esc(f.titel)+' <span class="hw-pill">'+esc(f.tijd)+'</span></h3><p class="hw-muted">Protocol: '+esc(f.protocol)+'</p>';
    f.groepen.forEach(g=>{
      p+='<div class="hw-cgroep"><h4>'+esc(g.naam)+'</h4>'+g.items.map(it=>{
        const id=itemId(f,it);
        return f.info
          ? '<div class="hw-item info"><span class="box"></span><span class="tx">'+esc(it)+'</span></div>'
          : '<div class="hw-item'+(a.c[id]?' klaar':'')+'" data-vink="'+id+'" role="checkbox" aria-checked="'+(a.c[id]?'true':'false')+'" tabindex="0"><span class="box">'+(a.c[id]?'✓':'')+'</span><span class="tx">'+esc(it)+'</span></div>';
      }).join('')+'</div>';
    });
    if(f.kader) p+='<div class="hw-tip">'+esc(f.kader)+'</div>';
    p+='<label class="hw-opm-l" for="hwO-'+f.id+'">Opmerkingen</label><textarea class="hw-opm" id="hwO-'+f.id+'" data-opm="'+f.id+'" placeholder="Opmerkingen bij deze fase…">'+esc(a.o[f.id]||'')+'</textarea>';
    if(f.id===HW.checklist[HW.checklist.length-1].id){
      p+='<h4 style="margin:16px 0 0">Rapport van de avond</h4><p class="hw-muted">Na afloop in de map in de hut.</p>'
        +HW.rapport.map((r,i)=>'<label class="hw-opm-l" for="hwR-'+i+'">'+esc(r)+'</label><textarea class="hw-opm" id="hwR-'+i+'" data-rap="'+i+'">'+esc(a.r[i]||'')+'</textarea>').join('');
    }
    if(!f.info) p+='<div class="hw-knoppen hw-geenprint"><button class="btn" data-volgende="'+f.id+'">'+(f.id===HW.checklist[HW.checklist.length-1].id?'Klaar ✔':'Naar de volgende fase →')+'</button></div>';
    else p+='<div class="hw-knoppen hw-geenprint"><button class="btn" data-volgende="'+f.id+'">Naar de volgende fase →</button></div>';
    return p+'</section>';
  }).join('');
  h+='<p class="hw-muted hw-geenprint">Vinkjes, notities en rapport worden op dit toestel bewaard, per avond. Een andere tablet ziet ze niet: gebruik één toestel per avond, of druk de checklist af.</p>';
  return h;
}
function updateChecklistVoortgang(){
  const a=avond(state.datum), tot=totaalTelling(a);
  const t=$('hwTotTxt'); if(t) t.textContent=tot.klaar+' / '+tot.totaal+' klaar';
  const b=$('hwTotBalk'); if(b) b.style.width=(tot.totaal?tot.klaar/tot.totaal*100:0)+'%';
  HW.checklist.forEach(f=>{
    const el=$('hwF-'+f.id); if(!el) return;
    if(f.info){ el.querySelector('.vb').style.display='none'; return; }
    const tl=faseTelling(f,a);
    el.querySelector('.vb i').style.width=(tl.totaal?tl.klaar/tl.totaal*100:0)+'%';
    el.classList.toggle('klaar',tl.totaal>0&&tl.klaar===tl.totaal);
  });
  const tab=document.querySelector('.hw-tab[data-ga="checklist"] .tel'); if(tab) tab.textContent=tot.klaar+'/'+tot.totaal;
}
function toonFase(id){
  actieveFase=id;
  document.querySelectorAll('[data-paneel-fase]').forEach(p=>{ p.hidden=p.getAttribute('data-paneel-fase')!==id; });
  document.querySelectorAll('.hw-fase').forEach(b=>b.classList.toggle('actief',b.getAttribute('data-fase')===id));
}
function vinkOm(el){
  const id=el.getAttribute('data-vink'), a=avond(state.datum);
  if(a.c[id]) delete a.c[id]; else a.c[id]=1;
  bewaar(state.datum,a);
  const aan=!!a.c[id];
  el.classList.toggle('klaar',aan); el.setAttribute('aria-checked',aan?'true':'false'); el.querySelector('.box').textContent=aan?'✓':'';
  updateChecklistVoortgang();
}

// ---------------------------------------------------------------- PRAKTISCH
function viewPraktisch(){
  let h='<div class="hw-kaart hw-nood"><h3>🚨 Code 10</h3><p><b>Raakt iemand in paniek, valt die of wil hij/zij stoppen?</b> Meld het via de portofoon met “Code 10” en je locatie. Speel niet verder en blijf bij de persoon tot er hulp is. De verantwoordelijke of mdw 2 gaat ter plaatse.</p>'
    +'<p class="hw-muted" style="margin:0">Vaste oproepen: “Groep vertrokken” · “Laatste groep” · “Pauze”. Telefoonnummers staan in <a href="contacten.html">Contacten</a>.</p></div>';
  h+=HW.praktisch.map(s=>'<div class="hw-kaart"><h3>'+esc(s.titel)+'</h3><dl class="hw-deflijst">'+s.rijen.map(r=>'<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>').join('')+'</dl></div>').join('');
  return h;
}

// ---------------------------------------------------------------- DOCUMENTEN
function viewDocs(){
  const bestand=id=>'https://drive.google.com/file/d/'+id+'/view';
  const map=id=>'https://drive.google.com/drive/folders/'+id;
  let h='<div class="hw-kaart"><h3>Documenten</h3><p class="hw-muted">De originele Word-bestanden staan in de gedeelde Drive. Je opent ze in een nieuw tabblad; je hebt daarvoor toegang tot de map nodig.</p>'
    +HW.documenten.map(d=>'<div class="hw-kaart hw-doc"><div class="tx"><b>📄 '+esc(d.titel)+'</b><p class="hw-muted" style="margin:2px 0 0">'+esc(d.tekst)+'</p></div><a class="btn" href="'+bestand(d.id)+'" target="_blank" rel="noopener">Openen in Drive</a></div>').join('')+'</div>';
  h+='<div class="hw-kaart"><h3>Mappen in Drive</h3><div class="hw-grid">'+HW.mappen.map(m=>'<a class="btn'+(m.hoofd?' primary':'')+'" style="text-align:left;text-decoration:none" href="'+map(m.id)+'" target="_blank" rel="noopener">📁 '+esc(m.titel)+'</a>').join('')+'</div></div>';
  h+='<div class="hw-nota">Alles op deze pagina komt uit die documenten (stand '+esc(window.HW_STAND||'')+'). Wijzigt het draaiboek, dan moet deze pagina bijgewerkt worden — de Drive-bestanden blijven de bron.</div>';
  return h;
}

// ---------------------------------------------------------------- tekenen
const VIEWS={start:viewStart,planning:viewPlanning,tijd:viewTijd,zones:viewZones,techniek:viewTechniek,checklist:viewChecklist,praktisch:viewPraktisch,docs:viewDocs};

function tekenTabs(){
  const a=avond(state.datum), tot=totaalTelling(a);
  $('hwTabs').innerHTML=TABS.map(t=>'<button type="button" class="hw-tab'+(t.id===state.tab?' actief':'')+'" data-ga="'+t.id+'"><span class="ic">'+t.ic+'</span>'+t.t
    +(t.id==='checklist'?'<span class="tel">'+tot.klaar+'/'+tot.totaal+'</span>':'')+'</button>').join('');
}
let vorigeTab=null;
function render(scroll){
  tekenTabs();
  const hero=document.querySelector('.hw-hero'); if(hero) hero.classList.toggle('compact',state.tab!=='start');
  const act=document.querySelector('.hw-tab.actief'), balk=$('hwTabs');
  if(act&&balk) balk.scrollLeft=act.offsetLeft-balk.clientWidth/2+act.clientWidth/2;
  $('hwInhoud').innerHTML=VIEWS[state.tab]();
  if(state.tab==='checklist') updateChecklistVoortgang();
  if(state.tab==='techniek'&&state.sub){ const el=$('tk-'+state.sub); if(el&&scroll!==false) el.scrollIntoView({block:'start'}); }
  const wijzigde=vorigeTab!==null&&vorigeTab!==state.tab; vorigeTab=state.tab;
  if(scroll!==false&&(wijzigde||scroll===true)){
    const r=$('hwInhoud').getBoundingClientRect();
    if(r.top<0){ $('hwInhoud').scrollIntoView({block:'start'}); }
  }
}

// ---------------------------------------------------------------- events
document.addEventListener('click',e=>{
  const t=e.target;
  const kies=t.closest('[data-kies]'); if(kies){ state.datum=kies.getAttribute('data-kies'); lsSet(K_DATUM,state.datum); }
  const fotoEl=t.closest('[data-foto]'); if(fotoEl&&$('hwInhoud').contains(fotoEl)){ if(typeof viewFoto==='function') viewFoto(fotoEl.getAttribute('data-foto')); else window.open(fotoEl.getAttribute('data-foto')); return; }
  const taal=t.closest('[data-taal]'); if(taal){
    const [uid,tl]=taal.getAttribute('data-taal').split('|'); const wrap=taal.closest('.hw-script');
    wrap.querySelectorAll('[data-taal]').forEach(b=>b.classList.toggle('actief',b===taal));
    wrap.querySelectorAll('[data-paneel]').forEach(p=>{ p.hidden=p.getAttribute('data-paneel')!==uid+'|'+tl; });
    return;
  }
  const vink=t.closest('[data-vink]'); if(vink){ vinkOm(vink); return; }
  const fase=t.closest('[data-fase]'); if(fase){ toonFase(fase.getAttribute('data-fase')); return; }
  const volg=t.closest('[data-volgende]'); if(volg){
    const i=HW.checklist.findIndex(f=>f.id===volg.getAttribute('data-volgende')); const nxt=HW.checklist[i+1];
    if(nxt){ toonFase(nxt.id); $('hwInhoud').scrollIntoView({block:'start'}); } else { window.scrollTo({top:0,behavior:'smooth'}); }
    return;
  }
  const dat=t.closest('[data-datum]'); if(dat){ kiesDatum(dat.getAttribute('data-datum')); return; }
  const g=t.closest('[data-ga]'); if(g&&!g.closest('a')){ ga(g.getAttribute('data-ga')); return; }
  if(t.closest('#hwPrint')){
    document.body.classList.add('hw-print-checklist');
    const kop=document.querySelector('.hw-printkop'); const a=avond(state.datum);
    if(kop){ kop.style.display='block'; kop.innerHTML='<h2>The Outbreak · Checklist verantwoordelijke</h2><p>Datum: '+esc(state.datum)+'/'+HW.info.jaar+' · Verantwoordelijke: '+esc(a.v||'……………………')+'</p>'; }
    const klaar=()=>{ document.body.classList.remove('hw-print-checklist'); if(kop) kop.style.display='none'; window.removeEventListener('afterprint',klaar); };
    window.addEventListener('afterprint',klaar); window.print(); return;
  }
  if(t.closest('#hwWis')){
    bevestig({titel:'Alle vinkjes, notities en het rapport van '+state.datum+' wissen?',okTekst:'Ja, wissen',gevaar:true}).then(ok=>{
      if(!ok) return; const o=leesCheck(); delete o[state.datum]; lsSet(K_CHECK,JSON.stringify(o)); render(false);
    });
  }
});
document.addEventListener('keydown',e=>{
  if((e.key===' '||e.key==='Enter')&&e.target.matches&&e.target.matches('[data-vink]')){ e.preventDefault(); vinkOm(e.target); }
});
document.addEventListener('input',e=>{
  const t=e.target; if(!t.matches) return;
  if(t.matches('[data-verantw]')){ const a=avond(state.datum); a.v=t.value; bewaar(state.datum,a); }
  else if(t.matches('[data-opm]')){ const a=avond(state.datum); a.o[t.getAttribute('data-opm')]=t.value; bewaar(state.datum,a); }
  else if(t.matches('[data-rap]')){ const a=avond(state.datum); a.r[t.getAttribute('data-rap')]=t.value; bewaar(state.datum,a); }
});
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='hwWie'){ state.wie=e.target.value; lsSet(K_WIE,state.wie); render(false); }
});
window.addEventListener('hashchange',()=>{ parseHash(); render(true); });

// ---------------------------------------------------------------- start
$('hwTitel').textContent=HW.info.titel;
$('hwOndertitel').textContent=HW.info.ondertitel;
$('hwFeiten').innerHTML=HW.info.feiten.map(f=>'<div class="hw-feit"><b>'+esc(f[1])+'</b><span>'+esc(f[0])+'</span></div>').join('');
parseHash();
render(false);
})();

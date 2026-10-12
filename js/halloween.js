// =====================================================================
//  HALLOWEEN — de pagina zelf (paginas/halloween.html).
//
//  Dit bestand tekent alleen. De inhoud staat per onderdeel in:
//    The Outbreak     js/halloween-data.js  + js/halloween-bron.js (gegenereerd)
//    Zeven zeeën      js/halloween-kind.js  + js/halloween-kind-bron.js (gegenereerd)
//    O&F, Show, Markt js/halloween-of.js
//  Elk onderdeel is een "activiteit" met dezelfde vorm: een lijst tabbladen (start, planning,
//  tijd, zones, techniek, checklist, praktisch, docs, of vrije 'kaarten'-tabbladen) en de
//  gegevens die die tabbladen tekenen.
//
//  Onthouden op dit toestel (localStorage, nergens gedeeld):
//    bb_hw_datum   de gekozen avond
//    bb_hw_wie     de gekozen collega bij "Planning → Wie ben jij?"
//    bb_hw_check   de checklists: per onderdeel en avond de vinkjes, notities en het rapport
//
//  Navigatie zit in het adres: #planning, #zones/sector1/rollen, #techniek/rook (The Outbreak)
//  of #zeven-zeeen/zones/kok/opbouw (de andere onderdelen).
// =====================================================================
(function(){
'use strict';

const HW=window.HW;
if(!HW){ return; }

const K_DATUM='bb_hw_datum', K_WIE='bb_hw_wie', K_CHECK='bb_hw_check';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const lsGet=k=>{ try{return localStorage.getItem(k);}catch(e){return null;} };
const lsSet=(k,v)=>{ try{localStorage.setItem(k,v);}catch(e){} };

const DAGEN=['zo','ma','di','wo','do','vr','za'];
const STD_TABS=[
  {id:'start',ic:'🎃',t:'Start'},
  {id:'planning',ic:'📅',t:'Planning'},
  {id:'tijd',ic:'⏱️',t:'Tijdsloten'},
  {id:'zones',ic:'🗺️',t:'Zones'},
  {id:'techniek',ic:'🔧',t:'Techniek'},
  {id:'checklist',ic:'✅',t:'Checklist'},
  {id:'praktisch',ic:'⚠️',t:'Praktisch'},
  {id:'docs',ic:'📎',t:'Documenten'}
];
const UITLEG={
  planning:'Wie staat op welke avond waar, met de taken bij opbouw en afbouw. Kies bovenaan je avond; kies daaronder je naam om je eigen rijen te zien.',
  tijd:'Het uurschema van de avond en de tijdsloten van de gasten.',
  zones:'Kies bovenaan een zone of post en daaronder wat je wil zien: het overzicht, je rol en scripts, de opbouw met foto’s of alle foto’s.',
  techniek:'Stap voor stap hoe je PC, muziek, licht, rook en portofoons opzet, met foto’s.',
  checklist:'Vink af per avond. Alles wordt op dit toestel bewaard; je kan de checklist ook afdrukken.',
  praktisch:'Afspraken en veiligheid: pauzes, nood, kleding en wat je nog moet weten.',
  docs:'De originele bestanden in de gedeelde Drive.'
};
const STD_BALK={start:19*60,eind:23*60+30,segs:[
  ['Ombouw',19*60,19*60+30,'#8a5cc7'],['Pauze',19*60+30,20*60,'#8a9a8e'],['Opbouw',20*60,20*60+25,'#d98a2b'],
  ['',20*60+25,20*60+30,'#7a5a3a'],['Tocht',20*60+30,22*60+20,'#e8772e'],['',22*60+20,22*60+30,'#c0392b'],['Afbouw',22*60+30,23*60+30,'#2f8f9d']],
  uren:['19u00','20u00','20u30','22u20','23u30']};

// ---------------------------------------------------------------- de onderdelen
// De volwassentocht staat in HW zelf; de andere komen uit window.HW_ACT.
const ACT={};
(function bouw(){
  const extra=window.HW_ACT||{};
  HW.activiteiten.forEach(meta=>{
    const a=Object.assign({},meta);
    if(meta.id==='outbreak'){
      Object.assign(a,{
        data:HW.info.data,jaar:HW.info.jaar,feiten:HW.info.feiten,verhaal:HW.verhaal,stappen:HW.stappen,code:HW.code,
        uurschema:HW.uurschema,tijdsloten:HW.tijdsloten,zones:HW.zones,techniek:HW.techniek,checklist:HW.checklist,
        rapport:HW.rapport,praktisch:HW.praktisch,documenten:HW.documenten,mappen:HW.mappen,
        nachten:window.HW_NACHTEN||{},scripts:window.HW_SCRIPTS||{},balk:STD_BALK,tabs:STD_TABS,
        planning:{kolommen:[['karakter','Karakter'],['naam','Naam'],['waar','Waar']],tijdKop:true},
        noodkaart:{titel:'🚨 Code 10',p:['Raakt iemand in paniek, valt die of wil hij/zij stoppen? Meld het via de portofoon met “Code 10” en je locatie. Speel niet verder en blijf bij de persoon tot er hulp is. De verantwoordelijke of mdw 2 gaat ter plaatse.'],
          klein:'Vaste oproepen: “Groep vertrokken” · “Laatste groep” · “Pauze”. Telefoonnummers staan in <a href="contacten.html">Contacten</a>.'}
      });
    }else{
      Object.assign(a,extra[meta.id]||{});
    }
    a.jaar=a.jaar||HW.info.jaar;
    a.tabs=a.tabs||[{id:'start',ic:'🎃',t:'Start'}];
    ACT[meta.id]=a;
  });
})();

const state={act:'outbreak',tab:'start',sub:'',sub2:'',datum:null,wie:''};
function A(){ return ACT[state.act]||ACT.outbreak; }

// ---------------------------------------------------------------- hulpjes
function datumObj(d){ const [dd,mm]=d.split('/').map(Number); return new Date(A().jaar,mm-1,dd); }
function dagnaam(d){ return DAGEN[datumObj(d).getDay()]; }
function vandaagStr(){ const n=new Date(); return String(n.getDate()).padStart(2,'0')+'/'+String(n.getMonth()+1).padStart(2,'0'); }
function dagenTot(d){ const n=new Date(); n.setHours(0,0,0,0); return Math.round((datumObj(d)-n)/86400000); }
function volgendeAvond(){ const l=A().data||[]; return l.find(d=>dagenTot(d)>=0)||l[l.length-1]; }
function voornaam(n){ return String(n||'').replace(/\(.*?\)/g,'').trim().replace(/^Laurant$/,'Laurent'); }
// Eén cel kan meerdere namen bevatten ("Isabelle en Nick", "Sarah + Noortje").
function namenIn(s){ return String(s||'').split(/\s*(?:\+|,|\ben\b|\/)\s*/).map(voornaam).filter(Boolean); }
function isIk(s){ return !!state.wie && namenIn(s).indexOf(state.wie)>=0; }
function zoneVoorRol(karakter){ return (A().zones||[]).find(z=>z.rollen.indexOf(karakter)>=0)||null; }
function kleurVoorRol(karakter){ const z=zoneVoorRol(karakter); return z?z.kleur:'var(--line)'; }
function alleNamen(){
  const s=new Set(); const n=A().nachten||{};
  Object.values(n).forEach(x=>{ (x.draaiboek||[]).forEach(r=>namenIn(r.naam).forEach(v=>s.add(v)));
    (x.opbouw||[]).concat(x.afbouw||[]).forEach(r=>namenIn(r.naam||(r.namen||[]).join(',')).forEach(v=>s.add(v))); });
  return [...s].sort((a,b)=>a.localeCompare(b,'nl'));
}
function tijdTxt(t){ return String(t||'').replace(/(\d+)\.(\d+)/g,'$1u$2').replace('-',' – '); }
function hash(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
function bevestig(opties){ return (typeof bbBevestig==='function') ? bbBevestig(opties) : Promise.resolve(confirm(opties.titel||'Zeker?')); }
function heeft(id){ return A().tabs.some(t=>t.id===id); }
let uidTeller=0; const nieuwUid=()=>'u'+(++uidTeller);

// ---------------------------------------------------------------- toestand
(function init(){
  const lijst=ACT.outbreak.data;
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
  const andere=HW.activiteiten.find(a=>a.id!=='outbreak'&&a.id===p[0]);
  state.act=andere?andere.id:'outbreak';
  const rest=andere?p.slice(1):p;
  const tabs=A().tabs;
  state.tab=tabs.some(t=>t.id===rest[0])?rest[0]:tabs[0].id;
  state.sub=rest[1]||''; state.sub2=rest[2]||'';
  const l=A().data;
  if(l&&l.indexOf(state.datum)<0) state.datum=volgendeAvond();
}
function pad(rel){ return (state.act==='outbreak'?'':state.act+'/')+rel; }
function ga(rel){ const p=pad(rel); if(location.hash==='#'+p) render(true); else location.hash=p; }
function kiesDatum(d){ state.datum=d; lsSet(K_DATUM,d); render(); }

// ---------------------------------------------------------------- bouwstenen
function datumKnoppen(){
  const a=A(); if(!a.data) return '';
  const vandaag=vandaagStr();
  return '<div class="hw-datums" role="group" aria-label="Kies een avond">'+a.data.map(d=>{
    const n=(a.nachten||{})[d]; const aant=n?new Set((n.draaiboek||[]).flatMap(r=>namenIn(r.naam))).size:0;
    return '<button type="button" class="hw-datum'+(d===state.datum?' actief':'')+(d===vandaag?' vandaag':'')+'" data-datum="'+d+'">'
      +'<small>'+dagnaam(d)+(d===vandaag?' · vandaag':'')+'</small><b>'+d+'</b><small>'+(aant?aant+' mdw':'&nbsp;')+'</small></button>';
  }).join('')+'</div>';
}
function fotoKnop(f){
  return '<figure class="hw-foto" data-foto="'+esc(f.src)+'"><img loading="lazy" src="'+esc(f.src)+'" alt="'+esc(f.tekst)+'">'
    +(f.tekst?'<figcaption>'+esc(f.tekst)+'</figcaption>':'')+'</figure>';
}
function fotoGalerij(lijst){
  if(!lijst||!lijst.length) return '<p class="hw-muted">Geen foto’s voor dit onderdeel.</p>';
  return '<div class="hw-fotos">'+lijst.map(fotoKnop).join('')+'</div>';
}
function lijst(items,klasse){ return '<ul class="'+(klasse===undefined?'hw-lijst':klasse)+'">'+items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>'; }
function paragrafen(arr){ return arr.map(p=>'<p>'+esc(p)+'</p>').join(''); }
function deflijst(rijen){ return '<dl class="hw-deflijst">'+rijen.map(r=>'<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>').join('')+'</dl>'; }
const TAALNAAM={nl:'Nederlands',en:'English',fr:'Français',de:'Deutsch'};
function regel(l){
  if(/^\(.*\)$/.test(l)) return '<p class="regie">'+esc(l)+'</p>';
  const m=l.match(/^(\([^)]*\))\s*(.*)$/);
  if(m) return '<p><span class="regie-in">'+esc(m[1])+'</span> '+esc(m[2])+'</p>';
  return '<p>'+esc(l)+'</p>';
}
// Tekst in meerdere talen met knoppen om te wisselen. talen = {nl:[regels],en:[…],…}
function talenHtml(talen,uid){
  const ts=['nl','en','fr','de'].filter(t=>talen[t]&&talen[t].length);
  if(!ts.length) return '<p class="hw-muted">Geen tekst.</p>';
  let h='<div class="hw-script" data-script="'+uid+'"><div class="hw-taal">'+ts.map((t,i)=>'<button type="button" data-taal="'+uid+'|'+t+'" class="'+(i===0?'actief':'')+'">'+TAALNAAM[t]+'</button>').join('')+'</div>';
  ts.forEach((t,i)=>{ h+='<div data-paneel="'+uid+'|'+t+'"'+(i===0?'':' hidden')+'>'+talen[t].map(regel).join('')+'</div>'; });
  return h+'</div>';
}
function scriptHtml(key,uid){
  const s=(A().scripts||{})[key]; if(!s) return '<p class="hw-muted">Geen script.</p>';
  return talenHtml(s,uid);
}
// Een vrije kaart: titel + (tekst | lijst | rijen | stappen | tabel | foto's | tekst in talen | links | nota)
function kaartHtml(k){
  let h='<div class="hw-kaart'+(k.nood?' hw-nood':'')+'">'+(k.titel?'<h3>'+esc(k.titel)+'</h3>':'');
  if(k.sub) h+='<p class="hw-muted">'+esc(k.sub)+'</p>';
  if(k.p) h+=paragrafen(k.p);
  if(k.html) h+='<p class="hw-muted" style="margin:0">'+k.html+'</p>';
  if(k.l) h+=lijst(k.l);
  if(k.rijen) h+=deflijst(k.rijen);
  if(k.tabel) h+='<div style="overflow-x:auto"><table class="hw-matrix" style="min-width:0"><thead><tr>'+k.tabel.kop.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'
    +k.tabel.rijen.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  if(k.stappen) h+='<ol class="hw-stappenlijst">'+k.stappen.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>';
  if(k.talen) h+=talenHtml(k.talen,nieuwUid());
  if(k.fotos) h+=fotoGalerij(k.fotos);
  if(k.links&&k.links.length) h+='<div class="hw-knoppen">'+k.links.map(l=>'<a class="btn'+(l.hoofd?' primary':'')+'" href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.t)+'</a>').join('')+'</div>';
  if(k.nota) h+='<div class="hw-nota">'+esc(k.nota)+'</div>';
  return h+'</div>';
}
const drive=id=>'https://drive.google.com/drive/folders/'+id;
const driveFile=id=>'https://drive.google.com/file/d/'+id+'/view';

// ---------------------------------------------------------------- START
function viewStart(){
  const a=A(); let h='';
  if(a.data){
    const volgende=volgendeAvond(), nog=dagenTot(volgende);
    const wanneer=nog===0?'Vandaag!':nog===1?'Morgen':nog>1?'Over '+nog+' dagen':'Afgelopen';
    h+='<div class="hw-kaart hw-volgende"><div class="dag">'+volgende+'</div><div class="wanneer"><b>'+(nog>=0?'Eerstvolgende avond':'Laatste avond')+'</b><br>'
      +'<span class="hw-muted">'+dagnaam(volgende)+' · '+wanneer+'</span></div>'
      +'<div class="hw-knoppen" style="margin:0">'+(heeft('planning')?'<button class="btn primary" data-kies="'+volgende+'" data-ga="planning">📅 Planning</button>':'')
      +(heeft('checklist')?'<button class="btn" data-kies="'+volgende+'" data-ga="checklist">✅ Checklist</button>':'')+'</div></div>';
  }
  (a.startKaartenVoor||[]).forEach(k=>{ h+=kaartHtml(k); });
  if(a.verhaal) h+='<div class="hw-kaart"><h3>'+esc(a.verhaalTitel||'Het verhaal')+'</h3>'+paragrafen(a.verhaal)+'</div>';
  if(a.stappen) h+='<div class="hw-kaart"><h3>'+esc(a.stappenTitel||'Zo verloopt de tocht')+'</h3><ol class="hw-stappen">'+a.stappen.map(s=>{
    const z=(a.zones||[]).find(x=>x.id===s.zone);
    return '<li class="hw-stap" style="--zk:'+(z?z.kleur:'var(--hw)')+'"'+(z?' data-ga="zones/'+s.zone+'"':'')+'><span class="nr">'+s.nr+'</span><div><b>'+esc(s.titel)+'</b>'
      +'<small>'+esc(z?z.naam:(s.waar||''))+'</small><p>'+esc(s.tekst)+'</p></div></li>';
  }).join('')+'</ol></div>';
  if(a.code){
    h+='<div class="hw-kaart"><h3>De code: '+esc(a.code.volledig)+'</h3>'
      +'<p class="hw-muted">Vier cijfers, verspreid over de tocht. Zonder de juiste code gaat de kist in de Safezone niet open.</p>'
      +'<div class="hw-code">'+a.code.cijfers.map(c=>{
        const ps=(a.code.posters[c.c]||[]);
        return '<div class="hw-cijfer"><div class="c">'+esc(c.c)+'</div><div><p>'+esc(c.waar)+'</p>'
          +(ps.length?'<div class="hw-posters">'+ps.map(f=>'<img loading="lazy" data-foto="'+esc(f.src)+'" src="'+esc(f.src)+'" alt="'+esc(f.tekst)+'">').join('')+'</div>':'')+'</div></div>';
      }).join('')+'</div><div class="hw-nota">'+esc(a.code.nota)+'</div></div>';
  }
  (a.startKaarten||[]).forEach(k=>{ h+=kaartHtml(k); });
  // snelkaarten naar de andere tabbladen
  const SNEL={zones:['🗺️',a.zonesTab||'Zones',a.zonesUitleg||'Alle posten: rollen, scripts, opbouw en foto’s.'],
    techniek:['🔧','Techniek','PC, muziek, licht, rook en portofoons — stap voor stap met foto’s.'],
    tijd:['⏱️','Tijdsloten & uren','Het uurschema van de avond en de tijdsloten.'],
    praktisch:['⚠️','Veiligheid & praktisch','Nood, pauzes, water, omkleden, ombouw en afbouw.']};
  const sn=Object.keys(SNEL).filter(id=>heeft(id));
  if(sn.length&&a.id==='outbreak'||(sn.length&&a.snelkaarten)){
    h+='<div class="hw-grid">'+sn.map(id=>'<a class="hw-kaart" href="#'+pad(id)+'" style="text-decoration:none;color:inherit;display:block"><h3>'+SNEL[id][0]+' '+esc(SNEL[id][1])+'</h3><p class="hw-muted" style="margin:0">'+esc(SNEL[id][2])+'</p></a>').join('')+'</div>';
  }
  if(a.leeg) h+='<div class="hw-nota">Nog niet uitgewerkt in de Drive-documenten: dit onderdeel staat klaar, de inhoud volgt.</div>';
  return h;
}

// ---------------------------------------------------------------- PLANNING
function afbouwNaam(r){ return r.naam||(r.namen||[]).join(', '); }
function viewPlanning(){
  const a=A(), d=state.datum, n=(a.nachten||{})[d]||{draaiboek:[],afbouw:[]};
  const P=a.planning||{kolommen:[['karakter','Karakter'],['naam','Naam'],['waar','Waar']]};
  let h=datumKnoppen();
  h+='<div class="hw-wie"><label for="hwWie"><b>Wie ben jij?</b></label><select id="hwWie"><option value="">— niemand (toon iedereen) —</option>'
    +alleNamen().map(x=>'<option'+(x===state.wie?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>'
    +'<span class="hw-muted">Dan lichten jouw rijen op en zie je al je avonden.</span></div>';
  if(state.wie&&alleNamen().indexOf(state.wie)>=0) h+=mijnAvonden();

  if(n.opbouw&&n.opbouw.length){
    h+='<div class="hw-kaart"><h3>'+esc(P.opbouwTitel||'Opbouw')+'</h3><div class="hw-afbouw">'+n.opbouw.map(r=>{
      const ik=isIk(r.naam);
      return '<div class="hw-afb'+(ik?' ik':'')+'" style="--zk:var(--hw)"><b>'+esc(r.naam)+(ik?'<span class="hw-ikbadge">jij</span>':'')+'</b><div class="waar">'+esc(r.tijd||'')+'</div>'
        +(r.taken&&r.taken.length?'<ul>'+r.taken.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'')+'</div>';
    }).join('')+'</div></div>';
  }
  h+='<div class="hw-kaart"><h3>'+esc(P.titel||'Draaiboek')+' · '+dagnaam(d)+' '+d+'</h3>';
  if(n.voorlopig) h+='<div class="hw-nota">Voorlopig: het draaiboek van deze avond is nog niet uitgewerkt. Dit is de rolverdeling uit de manual. De afbouwtaken volgen.</div>';
  if(P.tijdKop&&n.draaiboek[0]) h+='<p class="hw-muted">'+esc(tijdTxt(n.draaiboek[0].tijd))+' · tik een rij om naar de zone te gaan</p>';
  else if(a.zones) h+='<p class="hw-muted">Tik een kaart om naar de post te gaan.</p>';
  if(P.kaarten){
    h+='<div class="hw-afbouw">'+n.draaiboek.map(r=>{
      const z=zoneVoorRol(r.karakter);
      return '<div class="hw-afb'+(isIk(r.naam)?' ik':'')+'" style="--zk:'+kleurVoorRol(r.karakter)+(z?';cursor:pointer':'')+'"'+(z?' data-ga="zones/'+z.id+'"':'')+'>'
        +'<b>'+esc(r.naam||'–')+(isIk(r.naam)?'<span class="hw-ikbadge">jij</span>':'')+'</b>'
        +'<div class="waar"><b class="rol">'+esc(r.karakter)+'</b>'+(r.tijd?' · '+esc(r.tijd):'')+'</div>'
        +(r.wat?'<p style="margin:6px 0 0;font-size:14px">'+esc(r.wat)+'</p>':'')+(r.waar?'<div class="waar">📍 '+esc(r.waar)+'</div>':'')+'</div>';
    }).join('')+'</div>';
  }else{
    h+='<table class="hw-tabel"><thead><tr>'+P.kolommen.map(k=>'<th>'+esc(k[1])+'</th>').join('')+'</tr></thead><tbody>'
      +n.draaiboek.map(r=>{
        const z=zoneVoorRol(r.karakter);
        return '<tr style="--zk:'+kleurVoorRol(r.karakter)+';cursor:pointer" class="'+(isIk(r.naam)?'ik':'')+'"'+(z?' data-ga="zones/'+z.id+'"':'')+'>'
          +P.kolommen.map((k,i)=>'<td>'+esc(r[k[0]])+(k[0]==='naam'&&isIk(r.naam)?'<span class="hw-ikbadge">jij</span>':'')+'</td>').join('')+'</tr>';
      }).join('')+'</tbody></table>';
  }
  h+='</div>';

  if(a.nachtExtra){ const x=a.nachtExtra(n,d); if(x) h+=kaartHtml(x); }

  h+='<div class="hw-kaart"><h3>'+esc(P.afbouwTitel||'Afbouw · 22u30 – 23u30')+'</h3>';
  if(!n.afbouw.length){
    h+='<p class="hw-muted">'+(n.voorlopig?'De afbouwtaken van deze avond staan nog niet in het draaiboek.':'Geen afbouwtaken gevonden.')+'</p>';
  }else{
    h+='<p class="hw-muted">Wie iets afbouwt, heeft het ook opgezet.</p><div class="hw-afbouw">'+n.afbouw.map(r=>{
      const nm=afbouwNaam(r), ik=isIk(nm);
      return '<div class="hw-afb'+(ik?' ik':'')+'" style="--zk:'+kleurVoorRol(r.rol||r.karakter)+'"><b>'+esc(nm)+(ik?'<span class="hw-ikbadge">jij</span>':'')+'</b>'
        +'<div class="waar">'+esc([r.karakter,r.waar,(r.tijd&&P.afbTijd?r.tijd:'')].filter(Boolean).join(' · '))+'</div>'
        +(r.taken&&r.taken.length?'<ul>'+r.taken.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'')+'</div>';
    }).join('')+'</div>';
  }
  h+='</div>';
  h+='<p class="hw-muted">Stand van de Drive-documenten: '+esc(a.stand||window.HW_STAND||'')+'. Is er iets gewijzigd in het draaiboek? Dan moet deze pagina bijgewerkt worden.</p>';
  return h;
}
function mijnAvonden(){
  const a=A(), rijen=[];
  a.data.forEach(d=>{
    const n=(a.nachten||{})[d]; if(!n) return;
    const mijn=(n.draaiboek||[]).filter(r=>isIk(r.naam));
    if(mijn.length) rijen.push({d,mijn});
  });
  let h='<div class="hw-kaart"><h3>Jouw avonden, '+esc(state.wie)+'</h3>';
  if(!rijen.length) return h+'<p class="hw-muted">Je staat nog op geen enkele avond.</p></div>';
  h+='<div class="hw-mijn">'+rijen.map(({d,mijn})=>{
    const zs=[...new Set(mijn.map(r=>{ const z=zoneVoorRol(r.karakter); return z?z.naam:r.waar; }))];
    return '<div class="rij'+(d===state.datum?' actief':'')+'" style="--zk:'+kleurVoorRol(mijn[0].karakter)+'" data-datum="'+d+'"><b>'+dagnaam(d)+' '+d+'</b><span>'+mijn.map(r=>esc(r.karakter)).join(' · ')+'</span>'
      +'<span class="hw-muted">'+esc(zs.join(' · '))+'</span></div>';
  }).join('')+'</div></div>';
  return h;
}

// ---------------------------------------------------------------- TIJDSLOTEN
function viewTijd(){
  const a=A(), T=a.tijdsloten, B=a.balk||STD_BALK;
  const tot=B.eind-B.start;
  const nu=new Date(), nuMin=nu.getHours()*60+nu.getMinutes();
  const toon=a.data&&(state.datum===vandaagStr()) && nuMin>=B.start && nuMin<=B.eind;
  let h='<div class="hw-kaart"><h3>De avond in één oogopslag</h3>'
    +'<div class="hw-balk">'+B.segs.map(s=>'<div style="width:'+((s[2]-s[1])/tot*100).toFixed(2)+'%;background:'+s[3]+'" title="'+esc(s[0])+'">'+((s[2]-s[1])/tot>0.1?esc(s[0]):'')+'</div>').join('')
    +(toon?'<span class="hw-nu" style="left:'+((nuMin-B.start)/tot*100).toFixed(2)+'%" title="Nu"></span>':'')+'</div>'
    +'<div class="hw-balkuren">'+B.uren.map(u=>'<span>'+u+'</span>').join('')+'</div>'
    +'<ul class="hw-schema">'+a.uurschema.map(r=>'<li><span class="u">'+esc(r[0])+'</span><span class="t"><b>'+esc(r[1])+'</b>'+(r[2]?'<small>'+esc(r[2])+'</small>':'')+'</span></li>').join('')+'</ul></div>';
  if(T){
    const [sh,sm]=T.start.split(':').map(Number), [lh,lm]=T.laatste.split(':').map(Number);
    const slots=[]; for(let m=sh*60+sm;m<=lh*60+lm;m+=T.stapMin) slots.push(m);
    const f=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
    h+='<div class="hw-kaart"><h3>'+esc(T.titel||'Tijdsloten voor de gasten')+'</h3><p class="hw-muted">'+esc(T.intro||('Gasten schrijven in per tijdslot van '+T.stapMin+' minuten, met '+T.perSlot+' personen per tijdslot. De inkom heeft de lijst van vanavond.'))+'</p>'
      +'<div class="hw-slots">'+slots.map((m,i)=>{
        const laatste=i===slots.length-1;
        const sub=T.chip?T.chip(i,laatste):(laatste?'laatste vertrek':'tot '+T.perSlot+' pers.');
        return '<div class="hw-slot'+(laatste?' laatste':'')+'"><b>'+f(m)+'</b><small>'+esc(sub)+'</small></div>';
      }).join('')+'</div></div>';
    h+='<div class="hw-kaart"><h3>Regels voor de doorstroom</h3>'+deflijst(T.regels)+'</div>';
  }
  return h;
}

// ---------------------------------------------------------------- ZONES / POSTEN
function rolMatch(z,r){ return z.rollen.indexOf(r.rol||r.karakter)>=0; }
function matrixHtml(z){
  const a=A(), data=a.data;
  let h='<div style="overflow-x:auto"><table class="hw-matrix"><thead><tr><th>Rol</th>'
    +data.map(d=>'<th'+(d===state.datum?' style="color:var(--hw)"':'')+'>'+d+'</th>').join('')+'</tr></thead><tbody>';
  z.rollen.forEach(rol=>{
    h+='<tr><td>'+esc(rol)+'</td>'+data.map(d=>{
      const n=(a.nachten||{})[d]; const r=n&&(n.draaiboek||[]).find(x=>x.karakter===rol);
      return '<td'+(r&&isIk(r.naam)?' style="background:var(--hw-bg);font-weight:700"':'')+'>'+(r&&r.naam?esc(voornaam(r.naam)):'<span class="hw-muted">–</span>')+'</td>';
    }).join('')+'</tr>';
  });
  return h+'</tbody></table></div>';
}
function viewZones(){
  const a=A(), zs=a.zones;
  const z=zs.find(x=>x.id===state.sub)||zs[0];
  const sub=['overzicht','rollen','opbouw','fotos'].indexOf(state.sub2)>=0?state.sub2:'overzicht';
  let h='<div class="hw-zonekeuze">'+zs.map(x=>'<button type="button" class="hw-zbtn'+(x.id===z.id?' actief':'')+'" style="--zk:'+x.kleur+'" data-ga="zones/'+x.id+'/'+sub+'">'+esc(x.naam)+'<small>'+esc(x.kort)+'</small></button>').join('')+'</div>';
  h+='<div class="hw-sub">'+[['overzicht','Overzicht'],['rollen',a.rollenTab||'Rollen & scripts'],['opbouw','Opbouw & materiaal'],['fotos','Foto’s ('+(z.fotos||[]).length+')']].map(s=>
    '<button type="button" class="hw-subtab'+(s[0]===sub?' actief':'')+'" data-ga="zones/'+z.id+'/'+s[0]+'">'+s[1]+'</button>').join('')+'</div>';
  h+='<h3 style="margin:0 0 10px;border-left:6px solid '+z.kleur+';padding-left:10px">'+esc(z.naam)+'</h3>';

  if(sub==='overzicht'){
    if(a.data) h+='<div class="hw-kaart"><h3>Wie staat hier</h3>'+matrixHtml(z)+'</div>';
    h+='<div class="hw-kaart"><h3>'+esc(z.watTitel||'Wat gebeurt hier')+'</h3>'+paragrafen(z.wat)+'</div>';
    if(z.aandacht&&z.aandacht.length) h+='<div class="hw-kaart hw-nood"><h3>Aandachtspunten</h3>'+lijst(z.aandacht)+'</div>';
    (z.extra||[]).forEach(k=>{ h+=kaartHtml(k); });
    if(z.plattegrond) h+='<div class="hw-kaart"><h3>Plattegrond</h3><img class="hw-plan" loading="lazy" data-foto="'+esc(z.plattegrond.src)+'" src="'+esc(z.plattegrond.src)+'" alt="'+esc(z.plattegrond.tekst)+'"><p class="hw-muted" style="text-align:center;margin-top:6px">Tik om te vergroten</p></div>';
  }else if(sub==='rollen'){
    h+=(z.personages||[]).map((p,i)=>personageHtml(z,p,i)).join('')||'<p class="hw-muted">Geen rollen.</p>';
  }else if(sub==='opbouw'){
    h+=datumKnoppen();
    if(z.plattegrond) h+='<div class="hw-kaart"><h3>Waar? De plattegrond</h3><img class="hw-plan" loading="lazy" data-foto="'+esc(z.plattegrond.src)+'" src="'+esc(z.plattegrond.src)+'" alt="'+esc(z.plattegrond.tekst)+'"><p class="hw-muted" style="text-align:center;margin-top:6px">Tik om te vergroten</p></div>';
    const n=(a.nachten||{})[state.datum]; const afb=n?(n.afbouw||[]).filter(r=>rolMatch(z,r)):[];
    h+='<div class="hw-kaart"><h3>Materiaal & afbouw</h3><p class="hw-muted">'+esc(a.materiaalUitleg||'Wie iets afbouwt, heeft het ook opgezet. Het materiaal zit in de doos van de zone.')+'</p>'
      +'<div class="hw-mat">'+z.materiaal.map(g=>'<div><h5>'+esc(g.groep)+'</h5>'+lijst(g.items,'')+'</div>').join('')+'</div></div>';
    h+='<div class="hw-kaart"><h3>'+esc(a.opbouwTitel||'Opbouw (ombouw 19u)')+'</h3><p class="hw-muted">Tik een foto om te vergroten: zo moet het er staan.</p><ol class="hw-stappenlijst">'+z.opbouw.map(s=>{
      const t=typeof s==='string'?s:s.t, fs=typeof s==='string'?[]:(s.fotos||[]);
      return '<li>'+esc(t)+(fs.length?'<div class="hw-fotos hw-stapfotos">'+fs.map(fotoKnop).join('')+'</div>':'')+'</li>';
    }).join('')+'</ol></div>';
    if(a.data) h+='<div class="hw-kaart"><h3>Afbouw op '+dagnaam(state.datum)+' '+state.datum+'</h3>'
      +(afb.length?'<div class="hw-afbouw">'+afb.map(r=>{ const nm=afbouwNaam(r); return '<div class="hw-afb'+(isIk(nm)?' ik':'')+'" style="--zk:'+z.kleur+'"><b>'+esc(nm)+'</b><div class="waar">'+esc(r.karakter)+' · '+esc(r.waar)+'</div>'
        +(r.taken&&r.taken.length?'<ul>'+r.taken.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>':'')+'</div>'; }).join('')+'</div>'
        :'<p class="hw-muted">'+(n&&n.voorlopig?'De afbouwtaken van deze avond staan nog niet in het draaiboek.':'Voor deze post staan er die avond geen eigen afbouwtaken in het draaiboek (kijk bij Planning voor alle taken).')+'</p>')+'</div>';
  }else{
    h+='<div class="hw-kaart"><h3>Foto’s van '+esc(z.naam)+'</h3>'+fotoGalerij(z.fotos)+'</div>';
  }
  return h;
}
function personageHtml(z,p,i){
  const open=z.personages.length===1||i===0;
  let h='<details class="hw-det"'+(open?' open':'')+'><summary><span>'+esc(p.naam)+'</span><span class="hw-pill">'+esc(p.sub)+'</span></summary><div class="inh">';
  if(p.wie&&p.wie.length) h+='<h4 style="margin:6px 0">'+esc(p.wieTitel||'Wie ben je en wat doe je')+'</h4>'+paragrafen(p.wie);
  (p.blokken||[]).forEach(b=>{ h+='<h4 style="margin:12px 0 4px">'+esc(b.t)+'</h4>'+(b.p?paragrafen(b.p):'')+(b.l?lijst(b.l):''); });
  if(p.tip) h+='<div class="hw-tip">'+esc(p.tip)+'</div>';
  const kl=p.kleding||[
    {t:'Zelf voorzien',items:p.zelf||[]},{t:'Voorzien door CP',items:p.cp||[]},{t:'Attributen',items:p.attr||[]}].filter(k=>k.items.length);
  if(kl.length) h+='<h4 style="margin:12px 0 4px">Wat draag je</h4><div class="hw-kleding">'+kl.map(k=>'<div><h5>'+esc(k.t)+'</h5>'+lijst(k.items,'')+'</div>').join('')+'</div>';
  if(p.fotos&&p.fotos.length) h+='<div class="hw-fotos" style="margin-top:10px">'+p.fotos.map(fotoKnop).join('')+'</div>';
  const sc=p.scripts||[].concat(p.script?[{t:'Script',key:p.script}]:[],p.scriptExtra?[{t:'Roepteksten als CZC',key:p.scriptExtra}]:[]);
  sc.forEach(s=>{ h+='<h4 style="margin:14px 0 4px">'+esc(s.t)+'</h4>'+scriptHtml(s.key,nieuwUid()); });
  return h+'</div></details>';
}

// ---------------------------------------------------------------- TECHNIEK
function viewTechniek(){
  const T=A().techniek;
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
function sleutel(d){ return state.act==='outbreak'?d:state.act+'|'+d; }
function leesCheck(){ try{return JSON.parse(lsGet(K_CHECK))||{};}catch(e){return {};} }
function avond(d){ const a=leesCheck()[sleutel(d)]||{}; return {v:a.v||'',c:a.c||{},o:a.o||{},r:a.r||{}}; }
function bewaar(d,x){ const o=leesCheck(); o[sleutel(d)]=x; lsSet(K_CHECK,JSON.stringify(o)); }
function itemId(f,it){ return f.id+':'+hash(it); }
function faseTelling(f,x){
  if(f.info) return {klaar:0,totaal:0};
  let klaar=0,totaal=0;
  f.groepen.forEach(g=>g.items.forEach(it=>{ totaal++; if(x.c[itemId(f,it)]) klaar++; }));
  return {klaar,totaal};
}
function totaalTelling(x){
  let klaar=0,totaal=0;
  (A().checklist||[]).forEach(f=>{ const t=faseTelling(f,x); klaar+=t.klaar; totaal+=t.totaal; });
  return {klaar,totaal};
}
let actieveFase=null;
function viewChecklist(){
  const a=A(), CL=a.checklist, d=state.datum, x=avond(d);
  if(!actieveFase||!CL.some(f=>f.id===actieveFase)) actieveFase=state.sub&&CL.some(f=>f.id===state.sub)?state.sub:CL[0].id;
  let h='<div class="hw-geenprint">'+datumKnoppen()+'</div>';
  h+='<div class="hw-kaart hw-geenprint"><div class="hw-cl-kop"><div><label for="hwVerantw">Verantwoordelijke van de avond</label><input class="hw-inp" id="hwVerantw" data-verantw type="text" placeholder="Naam" value="'+esc(x.v)+'"></div>'
    +'<div class="hw-knoppen" style="margin:0"><button class="btn" id="hwPrint">🖨️ Afdrukken</button><button class="btn gevaar" id="hwWis">Alles wissen</button></div></div>'
    +'<div class="hw-totaal"><b id="hwTotTxt"></b><span class="vb"><i id="hwTotBalk"></i></span></div>'
    +'<div class="hw-fasen">'+CL.map(f=>'<button type="button" class="hw-fase'+(f.id===actieveFase?' actief':'')+'" data-fase="'+f.id+'" id="hwF-'+f.id+'"><b>Fase '+f.nr+' · '+esc(f.titel)+'</b><small>'+esc(f.tijd)+'</small><span class="vb"><i></i></span></button>').join('')+'</div></div>';
  h+='<div class="hw-printkop" style="display:none"></div>';
  const laatste=CL[CL.length-1].id;
  h+=CL.map(f=>{
    let p='<section class="hw-kaart hw-fasepaneel" data-paneel-fase="'+f.id+'"'+(f.id===actieveFase?'':' hidden')+'>'
      +'<h3>Fase '+f.nr+' · '+esc(f.titel)+' <span class="hw-pill">'+esc(f.tijd)+'</span></h3><p class="hw-muted">'+esc(f.protocol)+'</p>';
    f.groepen.forEach(g=>{
      p+='<div class="hw-cgroep"><h4>'+esc(g.naam)+'</h4>'+g.items.map(it=>{
        const id=itemId(f,it);
        return f.info
          ? '<div class="hw-item info"><span class="box"></span><span class="tx">'+esc(it)+'</span></div>'
          : '<div class="hw-item'+(x.c[id]?' klaar':'')+'" data-vink="'+id+'" role="checkbox" aria-checked="'+(x.c[id]?'true':'false')+'" tabindex="0"><span class="box">'+(x.c[id]?'✓':'')+'</span><span class="tx">'+esc(it)+'</span></div>';
      }).join('')+'</div>';
    });
    if(f.kader) p+='<div class="hw-tip">'+esc(f.kader)+'</div>';
    p+='<label class="hw-opm-l" for="hwO-'+f.id+'">Opmerkingen</label><textarea class="hw-opm" id="hwO-'+f.id+'" data-opm="'+f.id+'" placeholder="Opmerkingen bij deze fase…">'+esc(x.o[f.id]||'')+'</textarea>';
    if(f.id===laatste&&a.rapport){
      p+='<h4 style="margin:16px 0 0">Rapport van de avond</h4><p class="hw-muted">Na afloop in de map in de hut.</p>'
        +a.rapport.map((r,i)=>'<label class="hw-opm-l" for="hwR-'+i+'">'+esc(r)+'</label><textarea class="hw-opm" id="hwR-'+i+'" data-rap="'+i+'">'+esc(x.r[i]||'')+'</textarea>').join('');
    }
    p+='<div class="hw-knoppen hw-geenprint"><button class="btn" data-volgende="'+f.id+'">'+(f.id===laatste?'Klaar ✔':'Naar de volgende fase →')+'</button></div>';
    return p+'</section>';
  }).join('');
  h+='<p class="hw-muted hw-geenprint">Vinkjes, notities en rapport worden op dit toestel bewaard, per avond. Een andere tablet ziet ze niet: gebruik één toestel per avond, of druk de checklist af.</p>';
  return h;
}
function updateChecklistVoortgang(){
  if(!heeft('checklist')) return;
  const x=avond(state.datum), tot=totaalTelling(x);
  const t=$('hwTotTxt'); if(t) t.textContent=tot.klaar+' / '+tot.totaal+' klaar';
  const b=$('hwTotBalk'); if(b) b.style.width=(tot.totaal?tot.klaar/tot.totaal*100:0)+'%';
  (A().checklist||[]).forEach(f=>{
    const el=$('hwF-'+f.id); if(!el) return;
    if(f.info){ el.querySelector('.vb').style.display='none'; return; }
    const tl=faseTelling(f,x);
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
  const id=el.getAttribute('data-vink'), x=avond(state.datum);
  if(x.c[id]) delete x.c[id]; else x.c[id]=1;
  bewaar(state.datum,x);
  const aan=!!x.c[id];
  el.classList.toggle('klaar',aan); el.setAttribute('aria-checked',aan?'true':'false'); el.querySelector('.box').textContent=aan?'✓':'';
  updateChecklistVoortgang();
}

// ---------------------------------------------------------------- PRAKTISCH
function viewPraktisch(){
  const a=A(); let h='';
  if(a.noodkaart) h+='<div class="hw-kaart hw-nood"><h3>'+esc(a.noodkaart.titel)+'</h3>'+paragrafen(a.noodkaart.p)+'<p class="hw-muted" style="margin:0">'+a.noodkaart.klein+'</p></div>';
  h+=a.praktisch.map(s=>'<div class="hw-kaart"><h3>'+esc(s.titel)+'</h3>'+deflijst(s.rijen)+'</div>').join('');
  return h;
}

// ---------------------------------------------------------------- DOCUMENTEN
function viewDocs(){
  const a=A();
  let h='<div class="hw-kaart"><h3>Documenten</h3><p class="hw-muted">De originele bestanden staan in de gedeelde Drive. Je opent ze in een nieuw tabblad; je hebt daarvoor toegang tot de map nodig.</p>'
    +(a.documenten||[]).map(d=>'<div class="hw-kaart hw-doc"><div class="tx"><b>📄 '+esc(d.titel)+'</b><p class="hw-muted" style="margin:2px 0 0">'+esc(d.tekst)+'</p></div><a class="btn" href="'+driveFile(d.id)+'" target="_blank" rel="noopener">Openen in Drive</a></div>').join('')+'</div>';
  h+='<div class="hw-kaart"><h3>Mappen in Drive</h3><div class="hw-grid">'+(a.mappen||[]).map(m=>'<a class="btn'+(m.hoofd?' primary':'')+'" style="text-align:left;text-decoration:none" href="'+drive(m.id)+'" target="_blank" rel="noopener">📁 '+esc(m.titel)+'</a>').join('')+'</div></div>';
  h+='<div class="hw-nota">Alles op deze pagina komt uit die documenten (stand '+esc(a.stand||window.HW_STAND||'')+'). Wijzigt een document, dan moet deze pagina bijgewerkt worden — de Drive-bestanden blijven de bron.</div>';
  return h;
}

// ---------------------------------------------------------------- vrije tabbladen
function viewKaarten(tab){
  let h='';
  (tab.kaarten||[]).forEach(k=>{ h+=kaartHtml(k); });
  return h||'<p class="hw-muted">Nog niets.</p>';
}

// ---------------------------------------------------------------- hero + tabs
// "Zones › Kok › Opbouw": waar je nu bent, in de compacte kop.
function kruimel(){
  const a=A(); const t=a.tabs.find(x=>x.id===state.tab)||a.tabs[0]; const del=[(t.id==='zones'&&a.zonesTab)?a.zonesTab:t.t];
  if(t.id==='zones'&&a.zones){ const z=a.zones.find(x=>x.id===state.sub)||a.zones[0]; del.push(z.naam); const sub={overzicht:'Overzicht',rollen:a.rollenTab||'Rollen & scripts',opbouw:'Opbouw & materiaal',fotos:'Foto’s'}[state.sub2]; if(sub) del.push(sub); }
  if(t.id==='techniek'&&a.techniek){ const b=a.techniek.blokken.find(x=>x.id===state.sub); if(b) del.push(b.titel); }
  return del.join(' › ');
}
function tekenHero(){
  const a=A();
  $('hwActs').innerHTML=HW.activiteiten.map(x=>'<button type="button" class="hw-act'+(x.id===a.id?' actief':'')+'" data-act="'+x.id+'"><span class="ic">'+(x.ic||'')+'</span>'+esc(x.kort)+'</button>').join('');
  const hero=document.querySelector('.hw-hero'); hero.style.background=a.kleur;
  const compact=state.tab!==a.tabs[0].id;
  $('hwKicker').textContent=compact?kruimel():a.kicker; $('hwTitel').textContent=a.titel; $('hwOndertitel').textContent=a.sub;
  $('hwFeiten').innerHTML=(a.feiten||[]).map(f=>'<div class="hw-feit"><b>'+esc(f[1])+'</b><span>'+esc(f[0])+'</span></div>').join('');
  hero.classList.toggle('compact',state.tab!==a.tabs[0].id);
  $('hwTabs').style.display=a.tabs.length>1?'':'none';
}
function tekenTabs(){
  const a=A(); const tot=heeft('checklist')?totaalTelling(avond(state.datum)):null;
  $('hwTabs').innerHTML=a.tabs.map(t=>'<button type="button" class="hw-tab'+(t.id===state.tab?' actief':'')+'" data-ga="'+t.id+'"><span class="ic">'+t.ic+'</span>'+esc(t.id==='zones'&&a.zonesTab?a.zonesTab:t.t)
    +(t.id==='checklist'&&tot?'<span class="tel">'+tot.klaar+'/'+tot.totaal+'</span>':'')+'</button>').join('');
}
let vorigeTab=null, vorigeAct=null;
function render(scroll){
  const a=A();
  tekenHero(); tekenTabs();
  const act=document.querySelector('.hw-tab.actief'), balk=$('hwTabs');
  if(act&&balk) balk.scrollLeft=act.offsetLeft-balk.clientWidth/2+act.clientWidth/2;
  const tab=a.tabs.find(t=>t.id===state.tab)||a.tabs[0];
  const type=tab.type||tab.id;
  const V={start:viewStart,planning:viewPlanning,tijd:viewTijd,zones:viewZones,techniek:viewTechniek,checklist:viewChecklist,praktisch:viewPraktisch,docs:viewDocs};
  const uitleg=tab.uitleg||UITLEG[type]||'';
  $('hwInhoud').innerHTML=(uitleg?'<p class="hw-uitleg">'+esc(uitleg)+'</p>':'')+(V[type]||(()=>viewKaarten(tab)))(tab);
  if(type==='checklist') updateChecklistVoortgang();
  if(type==='techniek'&&state.sub){ const el=$('tk-'+state.sub); if(el&&scroll!==false) el.scrollIntoView({block:'start'}); }
  const wijzigde=(vorigeTab!==null&&vorigeTab!==state.tab)||(vorigeAct!==null&&vorigeAct!==state.act);
  vorigeTab=state.tab; vorigeAct=state.act;
  if(scroll!==false&&(wijzigde||scroll===true)){
    const r=$('hwInhoud').getBoundingClientRect();
    if(r.top<0){ $('hwInhoud').scrollIntoView({block:'start'}); }
  }
}

// ---------------------------------------------------------------- events
document.addEventListener('click',e=>{
  const t=e.target;
  const kies=t.closest('[data-kies]'); if(kies){ state.datum=kies.getAttribute('data-kies'); lsSet(K_DATUM,state.datum); }
  const actKnop=t.closest('[data-act]'); if(actKnop){ const id=actKnop.getAttribute('data-act'); const p=id==='outbreak'?'start':id; if(location.hash==='#'+p) render(true); else location.hash=p; return; }
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
    const CL=A().checklist; const i=CL.findIndex(f=>f.id===volg.getAttribute('data-volgende')); const nxt=CL[i+1];
    if(nxt){ toonFase(nxt.id); $('hwInhoud').scrollIntoView({block:'start'}); } else { window.scrollTo({top:0,behavior:'smooth'}); }
    return;
  }
  const dat=t.closest('[data-datum]'); if(dat){ kiesDatum(dat.getAttribute('data-datum')); return; }
  const g=t.closest('[data-ga]'); if(g&&!g.closest('a')){ ga(g.getAttribute('data-ga')); return; }
  if(t.closest('#hwPrint')){
    document.body.classList.add('hw-print-checklist');
    const kop=document.querySelector('.hw-printkop'); const x=avond(state.datum);
    if(kop){ kop.style.display='block'; kop.innerHTML='<h2>'+esc(A().titel)+' · Checklist verantwoordelijke</h2><p>Datum: '+esc(state.datum)+'/'+A().jaar+' · Verantwoordelijke: '+esc(x.v||'……………………')+'</p>'; }
    const klaar=()=>{ document.body.classList.remove('hw-print-checklist'); if(kop) kop.style.display='none'; window.removeEventListener('afterprint',klaar); };
    window.addEventListener('afterprint',klaar); window.print(); return;
  }
  if(t.closest('#hwWis')){
    bevestig({titel:'Alle vinkjes, notities en het rapport van '+state.datum+' wissen?',okTekst:'Ja, wissen',gevaar:true}).then(ok=>{
      if(!ok) return; const o=leesCheck(); delete o[sleutel(state.datum)]; lsSet(K_CHECK,JSON.stringify(o)); render(false);
    });
  }
});
document.addEventListener('keydown',e=>{
  if((e.key===' '||e.key==='Enter')&&e.target.matches&&e.target.matches('[data-vink]')){ e.preventDefault(); vinkOm(e.target); }
});
document.addEventListener('input',e=>{
  const t=e.target; if(!t.matches) return;
  if(t.matches('[data-verantw]')){ const x=avond(state.datum); x.v=t.value; bewaar(state.datum,x); }
  else if(t.matches('[data-opm]')){ const x=avond(state.datum); x.o[t.getAttribute('data-opm')]=t.value; bewaar(state.datum,x); }
  else if(t.matches('[data-rap]')){ const x=avond(state.datum); x.r[t.getAttribute('data-rap')]=t.value; bewaar(state.datum,x); }
});
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='hwWie'){ state.wie=e.target.value; lsSet(K_WIE,state.wie); render(false); }
});
window.addEventListener('hashchange',()=>{ parseHash(); render(true); });

// ---------------------------------------------------------------- start
parseHash();
render(false);
})();

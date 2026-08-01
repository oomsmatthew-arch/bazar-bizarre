// Projecten — bord met taken (Trello-stijl) + bespreking, voor de Entertainment-app.
// Deze pagina draait op hetzelfde domein als entertainment.html en deelt daardoor de
// login én de gedeelde database (BBInv uit inventaris.js). Alles wat je hier doet gaat
// meteen naar de lokale cache (dus de app reageert direct) en op de achtergrond naar
// Supabase; zonder internet blijft het in de wachtrij staan tot er weer verbinding is.
(function(){
'use strict';

// ---------------- BASIS ----------------
const K_THEME='bb_home_theme';
const K_PIN='bb_home_pin';
const DEFAULT_PIN='3920';
const K_USER='bb_current_user';
const K_GELEZEN='bb_proj_gelezen';       // per project: tijdstip waarop je de bespreking las
const K_PROJ_MAKEN='bb_proj_maken';      // wie mag projecten aanmaken (vast/iedereen/beheer)
const K_PROJ_BEWERKEN='bb_proj_bewerken';// wie mag taken maken/verplaatsen (iedereen/vast)

const LABELS=[
  {naam:'Materiaal',kleur:'#4a9b5e'},
  {naam:'Techniek',kleur:'#2f8f9d'},
  {naam:'Personeel',kleur:'#8a5cc7'},
  {naam:'Budget',kleur:'#d98a2b'},
  {naam:'Extern',kleur:'#7a5a3a'},
  {naam:'Dringend',kleur:'#c0392b'}
];
const STATUSSEN=['Idee','Lopend','On hold','Afgerond'];
const KLEUREN=['#4a63c0','#4a9b5e','#e2683f','#8a5cc7','#d98a2b','#2f8f9d'];
const SJABLONEN=[
  {naam:'Eenvoudig',kolommen:['Te doen','Bezig','Klaar']},
  {naam:'Evenement',kolommen:['Idee','Voorbereiding','Deze week','Bezig','Klaar']},
  {naam:'Opbouw',kolommen:['Te doen','Materiaal nodig','Bezig','Controle','Klaar']},
  {naam:'Leeg',kolommen:['Te doen']}
];

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function $(id){return document.getElementById(id);}
function getPin(){return localStorage.getItem(K_PIN)||DEFAULT_PIN;}
function vandaag(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dmy(iso){ if(!iso) return ''; const p=String(iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
// Aantal dagen tot een datum: 0 = vandaag, negatief = te laat.
function dagenTot(iso){
  if(!iso) return null;
  const d=new Date(iso+'T00:00:00'); if(isNaN(d)) return null;
  const nu=new Date(); nu.setHours(0,0,0,0);
  return Math.round((d-nu)/86400000);
}
function tijdKort(ts){
  if(!ts) return '';
  const d=new Date(ts), nu=new Date();
  const zelfdeDag=d.toDateString()===nu.toDateString();
  const uur=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  if(zelfdeDag) return 'vandaag '+uur;
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+' '+uur;
}
function initialen(naam){ const p=String(naam||'').trim().split(/\s+/); return (((p[0]||'')[0]||'?')+((p[1]||'')[0]||'')).toUpperCase(); }

// ---------------- WIE BEN JE / WAT MAG JE ----------------
function currentUser(){ try{return JSON.parse(localStorage.getItem(K_USER)||'null');}catch(e){return null;} }
function currentUserName(){ const u=currentUser(); return u&&u.naam?u.naam:''; }
function gebruikers(){ return (window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[]; }
function fullCurrentUser(){ const u=currentUser(); if(!u) return null; return gebruikers().find(x=>x.id===u.id)||u; }
function avatarInner(u){ return (u&&u.foto)?('<img src="'+esc(u.foto)+'" alt="">'):esc(initialen(u?u.naam:'')); }
function avatarVoorNaam(naam){ const u=gebruikers().find(x=>x.naam===naam); return u?avatarInner(u):esc(initialen(naam)); }
function isVasteMdw(){ const u=fullCurrentUser(); return !!(u&&u.rol==='vast'); }
function magBeheren(actie){
  if(isVasteMdw()) return true;
  const p=prompt('Wachtwoord'+(actie?' '+actie:'')+':'); if(p===null) return false;
  if(p!==getPin()){ alert('Onjuist wachtwoord.'); return false; }
  return true;
}
// De twee regels zijn instelbaar via Instellingen op de homepagina (gedeeld via appconfig).
function regel(sleutel,standaard){
  const cfg=(window.BBInv&&BBInv.getConfig)?BBInv.getConfig():null;
  if(cfg&&cfg[sleutel]) return cfg[sleutel];
  return localStorage.getItem(sleutel==='projMaken'?K_PROJ_MAKEN:K_PROJ_BEWERKEN)||standaard;
}
// Mag ik een project aanmaken/bewerken? (standaard: enkel vaste medewerkers)
// 'vast' = enkel vaste medewerkers · 'beheer' = vast óf het beheer-wachtwoord · 'iedereen' = elke login.
function magProjectMaken(vraag){
  const r=regel('projMaken','vast');
  if(r==='iedereen') return true;
  if(r==='beheer') return vraag?magBeheren('voor projectbeheer'):isVasteMdw();
  if(isVasteMdw()) return true;
  if(vraag) alert('Alleen vaste medewerkers kunnen projecten aanmaken of aanpassen.\n\nJe kan wel meewerken: taken toevoegen, verslepen, afvinken en meepraten in de bespreking.\n\n(Deze regel staat bij Instellingen op de startpagina.)');
  return false;
}
// Mag ik in een project werken (taken maken, verplaatsen, afvinken)? (standaard: iedereen)
function magWerken(){
  const r=regel('projBewerken','iedereen');
  if(r==='vast') return isVasteMdw();
  return true;
}
function eisWerken(){
  if(magWerken()) return true;
  alert('Alleen vaste medewerkers kunnen taken aanpassen.\n\nDit is in te stellen via Instellingen op de startpagina.');
  return false;
}

// ---------------- THEMA ----------------
function applyTheme(){
  const dark=localStorage.getItem(K_THEME)==='dark';
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  const b=$('themeBtn'); if(b) b.textContent=dark?'☀️':'🌙';
  const tc=document.querySelector('meta[name="theme-color"]');
  if(tc) tc.setAttribute('content',dark?'#0f1a14':'#2f6450');
}
applyTheme();

// ---------------- STATE ----------------
let huidigProject=null;   // id van het geopende project (null = lijst)
let huidigTab='overzicht';
let filterStatus='lopend';
let zoekTekst='';
let bordZoek='';
let alleenMijn=false, verbergKlaar=false;
let taakOpen=null;        // id van de taak in het venster (null = nieuw)
let taakConcept=null;     // werkkopie zolang het venster open staat
let projOpen=null;        // id van het project in het projectvenster (null = nieuw)
let projConcept=null;
let bezigMetSlepen=false; // tijdens het slepen niet hertekenen (anders schiet de kaart uit je hand)

function project(){ return huidigProject?(BBInv.getProject(huidigProject)||null):null; }
function taken(pid){ return BBInv.getTaken(pid||huidigProject); }
function kolommen(p){ return (p&&p.kolommen&&p.kolommen.length)?p.kolommen:['Te doen','Bezig','Klaar']; }
function isKlaarKolom(naam){ return /^(klaar|gereed|afgewerkt|done|af)$/i.test(String(naam||'').trim()); }
function filterActief(){ return alleenMijn||verbergKlaar||!!bordZoek.trim(); }

// Gelezen-stand van de bespreking (per toestel, niet gedeeld).
function gelezen(){ try{return JSON.parse(localStorage.getItem(K_GELEZEN)||'{}')||{};}catch(e){return {};} }
function zetGelezen(pid,ts){ const g=gelezen(); g[pid]=ts||Date.now(); try{localStorage.setItem(K_GELEZEN,JSON.stringify(g));}catch(e){} }
function ongelezenAantal(pid){
  const sinds=gelezen()[pid]||0;
  const mij=currentUserName();
  return BBInv.getBerichten(pid).filter(b=>(b.ts||0)>sinds && b.auteur!==mij).length;
}

// ---------------- LIJST VAN PROJECTEN ----------------
function renderLijst(){
  const grid=$('projGrid'), leeg=$('projLeeg');
  const q=zoekTekst.trim().toLowerCase();
  let lijst=BBInv.getProjecten();
  if(filterStatus==='lopend')        lijst=lijst.filter(p=>!p.archief&&p.status!=='Afgerond');
  else if(filterStatus==='afgerond') lijst=lijst.filter(p=>!p.archief&&p.status==='Afgerond');
  else if(filterStatus==='archief')  lijst=lijst.filter(p=>p.archief);
  if(q) lijst=lijst.filter(p=>((p.naam||'')+' '+(p.doel||'')).toLowerCase().indexOf(q)>=0);

  grid.innerHTML='';
  if(!lijst.length){
    leeg.style.display='';
    leeg.textContent = q ? 'Geen project gevonden voor "'+zoekTekst+'".'
      : (filterStatus==='archief' ? 'Nog niets in het archief.'
      : (filterStatus==='afgerond' ? 'Nog geen afgerond project.'
      : 'Nog geen projecten. Maak er hierboven één aan.'));
    return;
  }
  leeg.style.display='none';

  lijst.forEach(p=>{
    const ts=BBInv.getTaken(p.id);
    const klaar=ts.filter(t=>t.klaar).length;
    const pct=ts.length?Math.round(klaar/ts.length*100):0;
    const open=ts.length-klaar;
    const dg=dagenTot(p.deadline);
    const ongelezen=ongelezenAantal(p.id);
    // Iedereen die aan een taak van dit project werkt, plus de verantwoordelijke.
    const namen=[];
    if(p.verantwoordelijke) namen.push(p.verantwoordelijke);
    ts.forEach(t=>(t.wie||[]).forEach(n=>{ if(namen.indexOf(n)<0) namen.push(n); }));

    const el=document.createElement('div');
    el.className='projcard';
    el.style.setProperty('--kleur',p.kleur||'#4a63c0');
    let deadlinePill='';
    if(p.deadline){
      const kl = dg<0?' rood' : (dg<=7?' oranje':'');
      const tekst = dg<0?('te laat · '+dmy(p.deadline)) : (dg===0?'vandaag':(dg===1?'morgen':(dg<=30?('nog '+dg+' dagen'):dmy(p.deadline))));
      deadlinePill='<span class="pill'+kl+'">📅 '+esc(tekst)+'</span>';
    }
    el.innerHTML=
      '<span class="status '+statusKlasse(p.status)+'" >'+esc(p.status||'Lopend')+'</span>'+
      '<h3>'+esc(p.naam||'Naamloos')+'</h3>'+
      (p.doel?'<p class="doel">'+esc(p.doel)+'</p>':'<p class="doel" style="font-style:italic">Geen omschrijving</p>')+
      '<div class="balk"><i style="width:'+pct+'%"></i></div>'+
      '<div class="projmeta">'+
        '<span class="pill">'+klaar+'/'+ts.length+' klaar</span>'+
        (open?'<span class="pill">'+open+' open</span>':'')+
        deadlinePill+
        (ongelezen?'<span class="ongelezen">'+ongelezen+' nieuw</span>':'')+
        (namen.length?'<span class="avs">'+namen.slice(0,4).map(n=>'<span class="av">'+avatarVoorNaam(n)+'</span>').join('')+
          (namen.length>4?'<span class="av">+'+(namen.length-4)+'</span>':'')+'</span>':'')+
      '</div>';
    el.onclick=()=>openProject(p.id);
    grid.appendChild(el);
  });
}
function statusKlasse(s){
  if(s==='Afgerond') return 'afgerond';
  if(s==='On hold') return 'hold';
  if(s==='Idee') return 'idee';
  return 'lopend';
}

// ---------------- ÉÉN PROJECT ----------------
function openProject(id){
  huidigProject=id; huidigTab='overzicht';
  $('lijstView').style.display='none';
  $('projectView').style.display='';
  toonTab('overzicht');
  renderProject();
  window.scrollTo(0,0);
}
function naarLijst(){
  huidigProject=null;
  $('projectView').style.display='none';
  $('lijstView').style.display='';
  $('title').textContent='Projecten';
  renderLijst();
  window.scrollTo(0,0);
}
function toonTab(p){
  huidigTab=p;
  document.querySelectorAll('.ptab').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
  document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));
  $('pane-'+p).classList.add('active');
  if(p==='bespreking'){ zetGelezen(huidigProject,Date.now()); }
  renderProject();
}
function renderProject(){
  const p=project();
  if(!p){ naarLijst(); return; }
  $('title').textContent=p.naam||'Project';
  $('pNaam').textContent=p.naam||'Naamloos';
  const st=$('pStatus'); st.textContent=p.status||'Lopend'; st.className='status '+statusKlasse(p.status);
  const ong=ongelezenAantal(p.id);
  $('pOngelezen').innerHTML = (ong&&huidigTab!=='bespreking') ? '<span class="ongelezen">'+ong+'</span>' : '';
  if(huidigTab==='overzicht') renderOverzicht();
  else if(huidigTab==='bord') renderBord();
  else renderBespreking();
}

// ---- Overzicht ----
function renderOverzicht(){
  const p=project(); if(!p) return;
  const ts=taken();
  const klaar=ts.filter(t=>t.klaar).length;
  const pct=ts.length?Math.round(klaar/ts.length*100):0;
  const mij=currentUserName();
  const mijn=ts.filter(t=>!t.klaar&&(t.wie||[]).indexOf(mij)>=0);
  const week=ts.filter(t=>{ if(t.klaar||!t.deadline) return false; const d=dagenTot(t.deadline); return d!==null&&d<=7; })
    .sort((a,b)=>(a.deadline||'').localeCompare(b.deadline||''));
  const laatste=BBInv.getBerichten(p.id).slice(-3).reverse();
  const dg=dagenTot(p.deadline);

  const box=$('ovBlokken');
  box.innerHTML=
    '<div class="blok"><h4>Voortgang</h4>'+
      '<div class="groot">'+pct+'%</div>'+
      '<div class="balk" style="margin:10px 0 8px"><i style="width:'+pct+'%"></i></div>'+
      '<div class="sub">'+klaar+' van '+ts.length+' taken klaar'+(ts.length-klaar?' · '+(ts.length-klaar)+' open':'')+'</div>'+
    '</div>'+
    '<div class="blok"><h4>Deadline</h4>'+
      (p.deadline
        ? '<div class="groot">'+(dg<0?'te laat':(dg===0?'vandaag':dg+' dgn'))+'</div><div class="sub">'+dmy(p.deadline)+(p.start?' · start '+dmy(p.start):'')+'</div>'
        : '<div class="sub" style="margin-top:6px">Geen deadline ingesteld.'+(p.start?'<br>Start: '+dmy(p.start):'')+'</div>')+
      (p.verantwoordelijke?'<div class="sub" style="margin-top:8px">Verantwoordelijke: <b>'+esc(p.verantwoordelijke)+'</b></div>':'')+
    '</div>'+
    '<div class="blok"><h4>Mijn taken</h4>'+
      (mijn.length?'<ul>'+mijn.slice(0,6).map(t=>'<li data-taak="'+t.id+'">'+esc(t.titel)+(t.deadline?' <span class="sub">('+dmy(t.deadline)+')</span>':'')+'</li>').join('')+'</ul>'
        :'<div class="sub">'+(mij?'Er staat niets op jouw naam.':'Log in om je eigen taken te zien.')+'</div>')+
    '</div>'+
    '<div class="blok"><h4>Deze week</h4>'+
      (week.length?'<ul>'+week.slice(0,6).map(t=>'<li data-taak="'+t.id+'">'+esc(t.titel)+' <span class="sub">('+dmy(t.deadline)+')</span></li>').join('')+'</ul>'
        :'<div class="sub">Geen deadlines binnen 7 dagen.</div>')+
    '</div>'+
    '<div class="blok"><h4>Laatste berichten</h4>'+
      (laatste.length?laatste.map(b=>'<div class="sub" style="margin-bottom:8px"><b>'+esc(b.auteur||'?')+'</b> · '+tijdKort(b.ts)+'<br>'+esc((b.tekst||'').slice(0,110))+((b.tekst||'').length>110?'…':'')+'</div>').join('')
        :'<div class="sub">Nog geen berichten.</div>')+
    '</div>'+
    '<div class="blok"><h4>Doel</h4>'+
      (p.doel?'<div class="doeltekst">'+esc(p.doel)+'</div>':'<div class="sub">Nog geen omschrijving ingevuld.</div>')+
    '</div>';
  box.querySelectorAll('[data-taak]').forEach(li=>{ li.onclick=()=>openTaak(li.dataset.taak); });

  const acties=$('ovActies'); acties.innerHTML='';
  const knop=(tekst,klasse,fn)=>{ const b=document.createElement('button'); b.className='btn'+(klasse?' '+klasse:''); b.textContent=tekst; b.onclick=fn; acties.appendChild(b); };
  knop('✎ Project bewerken','',()=>{ if(magProjectMaken(true)) openProjectVenster(p.id); });
  knop(p.archief?'↩ Uit archief halen':'📦 Archiveren','',()=>{
    if(!magProjectMaken(true)) return;
    BBInv.updateProject(p.id,{archief:!p.archief});
    if(!p.archief){ naarLijst(); } else renderProject();
  });
  knop('🗑 Verwijderen','gevaar',()=>{
    if(!magBeheren('om een project te verwijderen')) return;
    if(!confirm('Het project "'+(p.naam||'')+'" verwijderen?\n\nAlle taken en berichten van dit project verdwijnen mee. Dit kan niet ongedaan gemaakt worden.')) return;
    BBInv.removeProject(p.id); naarLijst();
  });
}

// ---- Bord ----
function renderBord(){
  const p=project(); if(!p) return;
  const bord=$('bord'); bord.innerHTML='';
  const mij=currentUserName();
  const q=bordZoek.trim().toLowerCase();
  const alle=taken();
  $('fMijn').classList.toggle('active',alleenMijn);
  $('fKlaar').classList.toggle('active',verbergKlaar);
  // Zolang er gefilterd wordt zie je maar een deel van de kaarten; slepen zou dan de
  // volgorde van de verborgen kaarten door elkaar gooien. Daarom staat het even uit.
  let hint=$('bordFilterHint');
  if(!hint){
    hint=document.createElement('span'); hint.id='bordFilterHint';
    hint.style.cssText='font-size:12.5px;color:var(--muted);font-weight:600;';
    $('bordFilter').appendChild(hint);
  }
  hint.textContent=filterActief()?'Slepen staat even uit zolang je filtert of zoekt.':'';

  kolommen(p).forEach(knaam=>{
    let lijst=alle.filter(t=>t.kolom===knaam);
    // Taken waarvan de kolom niet (meer) bestaat, tonen we in de eerste kolom.
    if(knaam===kolommen(p)[0]) lijst=lijst.concat(alle.filter(t=>kolommen(p).indexOf(t.kolom)<0));
    const totaal=lijst.length;
    if(alleenMijn) lijst=lijst.filter(t=>(t.wie||[]).indexOf(mij)>=0);
    if(verbergKlaar) lijst=lijst.filter(t=>!t.klaar);
    if(q) lijst=lijst.filter(t=>((t.titel||'')+' '+(t.omschrijving||'')).toLowerCase().indexOf(q)>=0);

    const kol=document.createElement('div');
    kol.className='kolom'; kol.dataset.kolom=knaam;
    const kop=document.createElement('div');
    kop.className='kolomkop';
    kop.innerHTML='<span class="knaam">'+esc(knaam)+'</span><span class="kct">'+totaal+'</span>'+
      (magWerken()?'<button class="kmenu" title="Kolom beheren">⋯</button>':'');
    const mnu=kop.querySelector('.kmenu');
    if(mnu) mnu.onclick=e=>{ e.stopPropagation(); kolomMenu(knaam); };
    kol.appendChild(kop);

    const vak=document.createElement('div'); vak.className='kaarten';
    lijst.forEach(t=>vak.appendChild(maakKaart(t)));
    kol.appendChild(vak);

    if(magWerken()){
      const add=document.createElement('div'); add.className='kaartadd';
      const inp=document.createElement('input');
      inp.type='text'; inp.placeholder='+ Taak toevoegen…';
      inp.onkeydown=e=>{
        if(e.key!=='Enter') return;
        const v=inp.value.trim(); if(!v) return;
        BBInv.addTaak({projectId:p.id,kolom:knaam,titel:v});
        inp.value=''; renderBord();
        // opnieuw focussen in dezelfde kolom, zodat je door kan typen
        const nieuw=[...bord.querySelectorAll('.kolom')].find(k=>k.dataset.kolom===knaam);
        if(nieuw){ const i=nieuw.querySelector('.kaartadd input'); if(i) i.focus(); }
      };
      add.appendChild(inp); kol.appendChild(add);
    }
    bord.appendChild(kol);
  });

  if(magWerken()){
    const extra=document.createElement('div'); extra.className='kolomadd';
    const b=document.createElement('button'); b.textContent='+ Kolom';
    b.onclick=()=>{
      const n=prompt('Naam van de nieuwe kolom:'); if(n===null) return;
      const naam=n.trim(); if(!naam) return;
      const ks=kolommen(p).slice();
      if(ks.indexOf(naam)>=0){ alert('Die kolom bestaat al.'); return; }
      ks.push(naam); BBInv.updateProject(p.id,{kolommen:ks}); renderBord();
    };
    extra.appendChild(b); bord.appendChild(extra);
  }
}
function maakKaart(t){
  const el=document.createElement('div');
  el.className='kaart'+(t.klaar?' klaar':'');
  el.dataset.id=t.id;
  const dg=dagenTot(t.deadline);
  let dl='';
  if(t.deadline&&!t.klaar){
    const kl=dg<0?' rood':(dg<=3?' oranje':'');
    dl='<span class="pill'+kl+'">📅 '+(dg<0?'te laat':(dg===0?'vandaag':(dg===1?'morgen':dmy(t.deadline))))+'</span>';
  }else if(t.deadline){ dl='<span class="pill">📅 '+dmy(t.deadline)+'</span>'; }
  const sub=(t.subtaken||[]);
  const subKlaar=sub.filter(s=>s.done).length;
  el.innerHTML=
    (t.labels&&t.labels.length?'<div class="klabels">'+t.labels.map(l=>{
      const def=LABELS.find(x=>x.naam===l);
      const st=def?('background:'+def.kleur+'22;border-color:'+def.kleur+'55;color:'+def.kleur):'';
      return '<span class="klabel" style="'+st+'">'+esc(l)+'</span>';
    }).join('')+'</div>':'')+
    '<div class="ktitel">'+esc(t.titel||'')+'</div>'+
    '<div class="kvoet">'+
      '<button class="vink'+(t.klaar?' on':'')+'" title="Afvinken">✓</button>'+
      dl+
      (sub.length?'<span class="pill">☑ '+subKlaar+'/'+sub.length+'</span>':'')+
      ((t.wie&&t.wie.length)?'<span class="avs">'+t.wie.slice(0,3).map(n=>'<span class="av">'+avatarVoorNaam(n)+'</span>').join('')+'</span>':'')+
    '</div>'+
    ((magWerken()&&!filterActief())?'<div class="kgreep" title="Sleep om te verplaatsen">⠿</div>':'');
  el.onclick=e=>{ if(e.target.closest('.vink')||e.target.closest('.kgreep')) return; openTaak(t.id); };
  const vink=el.querySelector('.vink');
  vink.onclick=e=>{
    e.stopPropagation();
    if(!eisWerken()) return;
    zetKlaar(t,!t.klaar);
    renderBord();
  };
  const greep=el.querySelector('.kgreep');
  if(greep) kaartDragInit(greep,el);
  return el;
}
// Afvinken: zet ook de kolom goed als er een "Klaar"-kolom bestaat.
function zetKlaar(t,klaar){
  const p=project(); const ks=kolommen(p);
  const patch={klaar:klaar};
  const klaarKolom=ks.find(isKlaarKolom);
  if(klaar&&klaarKolom&&t.kolom!==klaarKolom) patch.kolom=klaarKolom;
  if(!klaar&&isKlaarKolom(t.kolom)) patch.kolom=ks[0];
  BBInv.updateTaak(t.id,patch);
}

// Slepen van kaarten tussen kolommen (muis én touch, via pointer events).
function kaartDragInit(greep,kaart){
  greep.addEventListener('pointerdown',e=>{
    if(!magWerken()) return;
    e.preventDefault(); e.stopPropagation();
    const bord=$('bord');
    const bronKolom=kaart.closest('.kolom').dataset.kolom;
    bezigMetSlepen=true;
    kaart.classList.add('dragging');
    let scrollT=null;
    const move=ev=>{
      const x=ev.clientX, y=ev.clientY;
      // In welke kolom hangt de vinger/muis?
      let doel=null;
      [...bord.querySelectorAll('.kolom')].forEach(k=>{
        const r=k.getBoundingClientRect();
        if(x>=r.left&&x<=r.right) doel=k;
      });
      if(!doel) return;
      bord.querySelectorAll('.kolom').forEach(k=>k.classList.toggle('sleepdoel',k===doel));
      const vak=doel.querySelector('.kaarten');
      let voor=null;
      for(const sib of [...vak.querySelectorAll('.kaart')]){
        if(sib===kaart) continue;
        const r=sib.getBoundingClientRect();
        if(y<r.top+r.height/2){ voor=sib; break; }
      }
      if(voor) vak.insertBefore(kaart,voor); else vak.appendChild(kaart);
      // Aan de rand automatisch meescrollen (belangrijk op een tablet met veel kolommen).
      const br=bord.getBoundingClientRect();
      clearInterval(scrollT); scrollT=null;
      if(x<br.left+60) scrollT=setInterval(()=>bord.scrollBy({left:-18}),16);
      else if(x>br.right-60) scrollT=setInterval(()=>bord.scrollBy({left:18}),16);
    };
    const up=()=>{
      document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);
      document.removeEventListener('pointercancel',up);
      clearInterval(scrollT);
      bezigMetSlepen=false;
      kaart.classList.remove('dragging');
      bord.querySelectorAll('.kolom').forEach(k=>k.classList.remove('sleepdoel'));
      const doelEl=kaart.closest('.kolom'); if(!doelEl) return;
      const doelKolom=doelEl.dataset.kolom;
      const ids=[...doelEl.querySelectorAll('.kaart')].map(el=>el.dataset.id);
      BBInv.reorderTaken(ids,doelKolom);
      if(doelKolom!==bronKolom){
        // de kolom waar de kaart vandaan komt opnieuw nummeren
        const bronEl=[...bord.querySelectorAll('.kolom')].find(k=>k.dataset.kolom===bronKolom);
        if(bronEl) BBInv.reorderTaken([...bronEl.querySelectorAll('.kaart')].map(el=>el.dataset.id),bronKolom);
        // in of uit een "Klaar"-kolom slepen vinkt de taak mee af
        const t=taken().find(x=>x.id===kaart.dataset.id);
        if(t){
          if(isKlaarKolom(doelKolom)&&!t.klaar) BBInv.updateTaak(t.id,{klaar:true});
          else if(!isKlaarKolom(doelKolom)&&t.klaar&&isKlaarKolom(bronKolom)) BBInv.updateTaak(t.id,{klaar:false});
        }
      }
      renderBord();
    };
    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',up);
    document.addEventListener('pointercancel',up);
  });
}
function kolomMenu(knaam){
  const p=project(); const ks=kolommen(p).slice();
  const i=ks.indexOf(knaam); if(i<0) return;
  const keuze=prompt('Kolom "'+knaam+'":\n\n1 = hernoemen\n2 = naar links\n3 = naar rechts\n4 = verwijderen\n\nTyp een cijfer:');
  if(keuze===null) return;
  if(keuze.trim()==='1'){
    const n=prompt('Nieuwe naam:',knaam); if(n===null) return;
    const naam=n.trim(); if(!naam||naam===knaam) return;
    if(ks.indexOf(naam)>=0){ alert('Die kolom bestaat al.'); return; }
    ks[i]=naam; BBInv.updateProject(p.id,{kolommen:ks});
    BBInv.verplaatsTaken(p.id,knaam,naam);
  }else if(keuze.trim()==='2'&&i>0){
    ks.splice(i,1); ks.splice(i-1,0,knaam); BBInv.updateProject(p.id,{kolommen:ks});
  }else if(keuze.trim()==='3'&&i<ks.length-1){
    ks.splice(i,1); ks.splice(i+1,0,knaam); BBInv.updateProject(p.id,{kolommen:ks});
  }else if(keuze.trim()==='4'){
    if(ks.length<2){ alert('Er moet minstens één kolom overblijven.'); return; }
    const aantal=taken().filter(t=>t.kolom===knaam).length;
    const naar=ks.filter(k=>k!==knaam)[0];
    if(!confirm('Kolom "'+knaam+'" verwijderen?'+(aantal?('\n\n'+aantal+' taak/taken verhuizen naar "'+naar+'".'):''))) return;
    BBInv.verplaatsTaken(p.id,knaam,naar);
    BBInv.updateProject(p.id,{kolommen:ks.filter(k=>k!==knaam)});
  }else return;
  renderBord();
}

// ---- Taak-venster ----
function openTaak(id){
  const p=project(); if(!p) return;
  const t=id?taken().find(x=>x.id===id):null;
  if(id&&!t) return;
  taakOpen=id||null;
  taakConcept = t ? {titel:t.titel,omschrijving:t.omschrijving,wie:(t.wie||[]).slice(),deadline:t.deadline,
                     labels:(t.labels||[]).slice(),subtaken:(t.subtaken||[]).map(s=>({text:s.text,done:!!s.done})),kolom:t.kolom}
                  : {titel:'',omschrijving:'',wie:[],deadline:'',labels:[],subtaken:[],kolom:kolommen(p)[0]};
  $('tmKop').textContent = t?'Taak bewerken':'Nieuwe taak';
  $('tmTitel').value=taakConcept.titel||'';
  $('tmOms').value=taakConcept.omschrijving||'';
  $('tmDeadline').value=taakConcept.deadline||'';
  const sel=$('tmKolom'); sel.innerHTML='';
  kolommen(p).forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; if(k===taakConcept.kolom) o.selected=true; sel.appendChild(o); });
  $('tmDel').style.display = t?'':'none';
  $('tmMeta').innerHTML = t ? ('Aangemaakt '+tijdKort(t.ts)+(t.door?' door '+esc(t.door):'')+
    (t.klaar&&t.klaarTs?('<br>Afgevinkt '+tijdKort(t.klaarTs)+(t.klaarDoor?' door '+esc(t.klaarDoor):'')):'')) : '';
  renderTmWie(); renderTmLabels(); renderTmSub();
  $('taakModal').classList.add('open');
  setTimeout(()=>{ if(!t) $('tmTitel').focus(); },50);
}
function sluitTaak(){ $('taakModal').classList.remove('open'); taakOpen=null; taakConcept=null; }
function renderTmWie(){
  const box=$('tmWie'); box.innerHTML='';
  const users=gebruikers();
  if(!users.length){ box.innerHTML='<span class="sub" style="color:var(--muted);font-size:13px">Nog geen collega\'s in de namenlijst.</span>'; return; }
  users.forEach(u=>{
    const aan=taakConcept.wie.indexOf(u.naam)>=0;
    const b=document.createElement('button');
    b.className='keuze'+(aan?' on':'');
    b.innerHTML='<span class="av">'+avatarInner(u)+'</span>'+esc(u.naam);
    b.onclick=()=>{
      const i=taakConcept.wie.indexOf(u.naam);
      if(i>=0) taakConcept.wie.splice(i,1); else taakConcept.wie.push(u.naam);
      renderTmWie();
    };
    box.appendChild(b);
  });
}
function renderTmLabels(){
  const box=$('tmLabels'); box.innerHTML='';
  LABELS.forEach(l=>{
    const aan=taakConcept.labels.indexOf(l.naam)>=0;
    const b=document.createElement('button');
    b.className='keuze'+(aan?' on':'');
    if(aan) b.style.cssText='background:'+l.kleur+';border-color:'+l.kleur+';color:#fff';
    b.textContent=l.naam;
    b.onclick=()=>{
      const i=taakConcept.labels.indexOf(l.naam);
      if(i>=0) taakConcept.labels.splice(i,1); else taakConcept.labels.push(l.naam);
      renderTmLabels();
    };
    box.appendChild(b);
  });
}
function renderTmSub(){
  const box=$('tmSub'); box.innerHTML='';
  if(!taakConcept.subtaken.length){ box.innerHTML='<div class="sub" style="color:var(--muted);font-size:13px">Nog geen subtaken.</div>'; return; }
  taakConcept.subtaken.forEach((s,i)=>{
    const r=document.createElement('div');
    r.className='subrij'+(s.done?' done':'');
    r.innerHTML='<div class="vink'+(s.done?' on':'')+'">✓</div><div class="tx">'+esc(s.text)+'</div>'+
      '<button class="btn mini clear" title="Verwijderen">✕</button>';
    r.querySelector('.vink').onclick=()=>{ s.done=!s.done; renderTmSub(); };
    r.querySelector('button').onclick=()=>{ taakConcept.subtaken.splice(i,1); renderTmSub(); };
    box.appendChild(r);
  });
}
function bewaarTaak(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  taakConcept.titel=$('tmTitel').value.trim();
  taakConcept.omschrijving=$('tmOms').value.trim();
  taakConcept.deadline=$('tmDeadline').value||'';
  taakConcept.kolom=$('tmKolom').value||kolommen(p)[0];
  if(!taakConcept.titel){ alert('Geef de taak een titel.'); $('tmTitel').focus(); return; }
  if(taakOpen){
    const oud=taken().find(x=>x.id===taakOpen);
    const patch=Object.assign({},taakConcept);
    if(oud&&oud.kolom===patch.kolom) delete patch.kolom; // kolom onveranderd → geen "verplaatst"-melding
    BBInv.updateTaak(taakOpen,patch);
    // Via de keuzelijst naar (of uit) een "Klaar"-kolom gezet? Dan het vinkje mee aanpassen.
    const nu=taken().find(x=>x.id===taakOpen);
    if(nu&&oud){
      if(isKlaarKolom(nu.kolom)&&!nu.klaar) BBInv.updateTaak(nu.id,{klaar:true});
      else if(!isKlaarKolom(nu.kolom)&&nu.klaar&&isKlaarKolom(oud.kolom)) BBInv.updateTaak(nu.id,{klaar:false});
    }
  }
  else BBInv.addTaak(Object.assign({projectId:p.id,door:currentUserName()},taakConcept));
  sluitTaak(); renderProject();
}

// ---- Bespreking ----
function renderBespreking(){
  const p=project(); if(!p) return;
  const lijst=$('chatLijst'); lijst.innerHTML='';
  const mij=currentUserName();
  const berichten=BBInv.getBerichten(p.id);
  $('chatVan').textContent='Van: '+(mij||'niet ingelogd');
  if(!berichten.length){
    lijst.innerHTML='<div class="leeg">Nog geen berichten. Schrijf hieronder het eerste.</div>';
    return;
  }
  berichten.forEach(b=>{
    const el=document.createElement('div');
    el.className='bericht'+(b.auteur===mij?' eigen':'');
    el.innerHTML='<div class="bkop"><span class="av">'+avatarVoorNaam(b.auteur)+'</span>'+
      '<span>'+esc(b.auteur||'?')+'</span><span>· '+tijdKort(b.ts)+'</span>'+
      '<button class="bdel" title="Verwijderen">🗑</button></div>'+
      '<div class="btekst">'+esc(b.tekst)+'</div>';
    el.querySelector('.bdel').onclick=()=>{
      // je eigen bericht mag je zelf weghalen; dat van een ander enkel met beheer
      if(b.auteur!==mij && !magBeheren('om een bericht van iemand anders te verwijderen')) return;
      if(!confirm('Dit bericht verwijderen?')) return;
      BBInv.removeBericht(b.id); renderBespreking();
    };
    lijst.appendChild(el);
  });
  zetGelezen(p.id,Date.now());
}
function plaatsBericht(){
  const p=project(); if(!p) return;
  const t=$('chatTekst').value.trim();
  if(!t){ $('chatTekst').focus(); return; }
  const mij=currentUserName();
  if(!mij){ alert('Log eerst in via de startpagina, zodat je collega\'s zien van wie het bericht komt.'); return; }
  BBInv.addBericht({projectId:p.id,auteur:mij,tekst:t});
  $('chatTekst').value='';
  renderBespreking();
  const l=$('chatLijst'); l.scrollIntoView({block:'end',behavior:'smooth'});
}

// ---- Project aanmaken / bewerken ----
function openProjectVenster(id){
  const p=id?BBInv.getProject(id):null;
  projOpen=id||null;
  projConcept = p ? {naam:p.naam,doel:p.doel,status:p.status,kleur:p.kleur||KLEUREN[0],start:p.start,deadline:p.deadline,
                     verantwoordelijke:p.verantwoordelijke,kolommen:kolommen(p).slice()}
                  : {naam:'',doel:'',status:'Lopend',kleur:KLEUREN[0],start:vandaag(),deadline:'',
                     verantwoordelijke:currentUserName(),kolommen:SJABLONEN[0].kolommen.slice()};
  $('pmKop').textContent = p?'Project bewerken':'Nieuw project';
  $('pmNaam').value=projConcept.naam||'';
  $('pmDoel').value=projConcept.doel||'';
  $('pmStart').value=projConcept.start||'';
  $('pmDeadline').value=projConcept.deadline||'';
  $('pmSjabloonVeld').style.display = p?'none':'';
  renderPmStatus(); renderPmKleur(); renderPmWie(); renderPmSjabloon();
  $('projModal').classList.add('open');
  setTimeout(()=>$('pmNaam').focus(),50);
}
function sluitProjectVenster(){ $('projModal').classList.remove('open'); projOpen=null; projConcept=null; }
function renderPmStatus(){
  const box=$('pmStatus'); box.innerHTML='';
  STATUSSEN.forEach(s=>{
    const b=document.createElement('button');
    b.className='keuze'+(projConcept.status===s?' on':''); b.textContent=s;
    b.onclick=()=>{ projConcept.status=s; renderPmStatus(); };
    box.appendChild(b);
  });
}
function renderPmKleur(){
  const box=$('pmKleur'); box.innerHTML='';
  KLEUREN.forEach(k=>{
    const b=document.createElement('button');
    b.className='keuze'+(projConcept.kleur===k?' on':'');
    b.style.cssText='background:'+k+';border-color:'+k+';color:#fff;min-width:52px;'+(projConcept.kleur===k?'outline:2px solid var(--text);outline-offset:2px;':'');
    b.textContent=projConcept.kleur===k?'✓':' ';
    b.onclick=()=>{ projConcept.kleur=k; renderPmKleur(); };
    box.appendChild(b);
  });
}
function renderPmWie(){
  const box=$('pmWie'); box.innerHTML='';
  const users=gebruikers();
  if(!users.length){ box.innerHTML='<span style="color:var(--muted);font-size:13px">Nog geen collega\'s in de namenlijst.</span>'; return; }
  users.forEach(u=>{
    const b=document.createElement('button');
    b.className='keuze'+(projConcept.verantwoordelijke===u.naam?' on':'');
    b.innerHTML='<span class="av">'+avatarInner(u)+'</span>'+esc(u.naam);
    b.onclick=()=>{ projConcept.verantwoordelijke = projConcept.verantwoordelijke===u.naam?'':u.naam; renderPmWie(); };
    box.appendChild(b);
  });
}
function renderPmSjabloon(){
  const box=$('pmSjabloon'); box.innerHTML='';
  SJABLONEN.forEach(s=>{
    const aan=projConcept.kolommen.join('|')===s.kolommen.join('|');
    const b=document.createElement('button');
    b.className='keuze'+(aan?' on':'');
    b.textContent=s.naam+' ('+s.kolommen.length+')';
    b.title=s.kolommen.join(' · ');
    b.onclick=()=>{ projConcept.kolommen=s.kolommen.slice(); renderPmSjabloon(); };
    box.appendChild(b);
  });
}
function bewaarProject(){
  projConcept.naam=$('pmNaam').value.trim();
  projConcept.doel=$('pmDoel').value.trim();
  projConcept.start=$('pmStart').value||'';
  projConcept.deadline=$('pmDeadline').value||'';
  if(!projConcept.naam){ alert('Geef het project een naam.'); $('pmNaam').focus(); return; }
  if(projConcept.start&&projConcept.deadline&&projConcept.deadline<projConcept.start){
    if(!confirm('De deadline ligt vóór de startdatum. Toch bewaren?')) return;
  }
  if(projOpen){
    BBInv.updateProject(projOpen,{naam:projConcept.naam,doel:projConcept.doel,status:projConcept.status,
      kleur:projConcept.kleur,start:projConcept.start,deadline:projConcept.deadline,
      verantwoordelijke:projConcept.verantwoordelijke});
    sluitProjectVenster(); renderProject();
  }else{
    const rec=BBInv.addProject(projConcept);
    sluitProjectVenster(); openProject(rec.id);
  }
}

// ---------------- KOPPELINGEN ----------------
$('homeLogo').onclick=()=>{ location.href='entertainment.html'; };
$('terugBtn').onclick=()=>{ if(huidigProject) naarLijst(); else location.href='entertainment.html'; };
$('userBtn').onclick=()=>{ location.href='entertainment.html'; };
$('themeBtn').onclick=()=>{
  const dark=localStorage.getItem(K_THEME)==='dark';
  localStorage.setItem(K_THEME,dark?'light':'dark');
  applyTheme();
};
$('naarLijst').onclick=naarLijst;
$('projZoek').oninput=e=>{ zoekTekst=e.target.value; renderLijst(); };
$('projFilter').onclick=e=>{
  const b=e.target.closest('.chip'); if(!b) return;
  filterStatus=b.dataset.f;
  document.querySelectorAll('#projFilter .chip').forEach(x=>x.classList.toggle('active',x===b));
  renderLijst();
};
$('projNieuw').onclick=()=>{ if(magProjectMaken(true)) openProjectVenster(null); };
$('pTabs').onclick=e=>{ const b=e.target.closest('.ptab'); if(b) toonTab(b.dataset.p); };
$('fMijn').onclick=()=>{ alleenMijn=!alleenMijn; renderBord(); };
$('fKlaar').onclick=()=>{ verbergKlaar=!verbergKlaar; renderBord(); };
$('bordZoek').oninput=e=>{ bordZoek=e.target.value; renderBord(); };
$('tmAnnuleer').onclick=sluitTaak;
$('tmBewaar').onclick=bewaarTaak;
$('tmDel').onclick=()=>{
  if(!taakOpen) return;
  if(!eisWerken()) return;
  if(!confirm('Deze taak verwijderen?')) return;
  BBInv.removeTaak(taakOpen); sluitTaak(); renderProject();
};
$('tmSubAdd').onclick=()=>{
  const v=$('tmSubNew').value.trim(); if(!v) return;
  taakConcept.subtaken.push({text:v,done:false}); $('tmSubNew').value=''; renderTmSub(); $('tmSubNew').focus();
};
$('tmSubNew').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); $('tmSubAdd').click(); } };
$('pmAnnuleer').onclick=sluitProjectVenster;
$('pmBewaar').onclick=bewaarProject;
$('chatPlaats').onclick=plaatsBericht;
$('chatTekst').onkeydown=e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) plaatsBericht(); };
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if($('taakModal').classList.contains('open')) sluitTaak();
  else if($('projModal').classList.contains('open')) sluitProjectVenster();
});
// buiten het venster tikken = sluiten
$('taakModal').onclick=e=>{ if(e.target===$('taakModal')) sluitTaak(); };
$('projModal').onclick=e=>{ if(e.target===$('projModal')) sluitProjectVenster(); };

// ---------------- OPSTARTEN ----------------
function updateUserKnop(){
  const u=fullCurrentUser();
  if(window.BBInv&&BBInv.setActor) BBInv.setActor(u&&u.naam?u.naam:'');
  $('userAv').innerHTML=u?avatarInner(u):'👤';
  $('userNm').textContent=u?u.naam:'Inloggen';
  $('userBtn').title=u?('Ingelogd als '+u.naam+' · tik om te wisselen'):'Inloggen';
}
function updateSync(){
  const pend=(window.BBInv&&BBInv.pendingCount)?BBInv.pendingCount():0;
  const b=$('syncBadge');
  b.style.display=pend?'':'none';
  b.textContent=pend?('⏳ '+pend+' wacht op internet'):'';
  const deel=$('deelStatus');
  if(window.BBInv&&BBInv.isProjectenGedeeld&&BBInv.isProjectenGedeeld()){
    deel.textContent='Gedeeld met alle toestellen.';
  }else if(window.BBInv&&BBInv.isReady&&BBInv.isReady()){
    deel.innerHTML='⚠ Nog niet gedeeld: de projecttabellen bestaan nog niet in de database. '+
      'Alles werkt, maar enkel op dit toestel. Voer <b>projecten-supabase.sql</b> één keer uit in Supabase.';
  }else deel.textContent='';
}
function herteken(){
  updateUserKnop(); updateSync();
  // Niet hertekenen terwijl iemand een kaart vasthoudt of in een venster typt:
  // een wijziging van een collega zou anders het scherm onder je handen wegtrekken.
  if(bezigMetSlepen) return;
  if($('taakModal').classList.contains('open')||$('projModal').classList.contains('open')) return;
  if(huidigProject) renderProject(); else renderLijst();
}
// Niet ingelogd? Dan eerst langs de startpagina, want daar staat het inlogscherm.
if(!currentUser()){
  location.replace('entertainment.html');
}else if(window.BBInv){
  BBInv.setOnChange(herteken);
  BBInv.init();
  herteken();
  window.addEventListener('online',updateSync);
  window.addEventListener('offline',updateSync);
}else{
  $('projLeeg').style.display='';
  $('projLeeg').textContent='Kon de gegevens niet laden. Ververs de pagina.';
}
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
})();

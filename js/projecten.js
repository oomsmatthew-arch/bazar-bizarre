// Projecten — bord met taken (Trello-stijl) + bespreking, voor de Entertainment-app.
// Deze pagina draait op hetzelfde domein als entertainment.html en deelt daardoor de
// login én de gedeelde database (BBInv uit inventaris.js). Alles wat je hier doet gaat
// meteen naar de lokale cache (dus de app reageert direct) en op de achtergrond naar
// Supabase; zonder internet blijft het in de wachtrij staan tot er weer verbinding is.
(function(){
'use strict';

// ---------------- BASIS ----------------
// Versie van de Projecten-module. Verhoog dit bij elke aanpassing die je uitrolt,
// zodat je op de tablet meteen ziet of de nieuwste versie geladen is.
const APP_VERSION='v1.2';
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
const MAANDEN=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const DAGEN=['ma','di','wo','do','vr','za','zo'];
const AGENDA_SOORTEN=[
  {key:'afspraak',naam:'Afspraak',icoon:'📌'},
  {key:'mijlpaal',naam:'Mijlpaal',icoon:'🚩'},
  {key:'levering',naam:'Levering',icoon:'📦'},
  {key:'opbouw',naam:'Opbouw',icoon:'🔨'},
  {key:'afbraak',naam:'Afbraak',icoon:'🧹'}
];
const DOC_TAGS=['Offerte','Draaiboek','Plan','Foto','Contract','Overig'];
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

// ---------------- EIGEN VENSTERS (i.p.v. de browserdialogen) ----------------
// Een klein menu dat bij het aangeklikte knopje opent, en één venstertje dat zowel
// "typ iets" als "weet je het zeker?" doet. Zo blijft alles binnen de pagina en werkt
// het prettig op een tablet.
function sluitMenu(){ $('popMenu').classList.remove('open'); $('popBackdrop').classList.remove('open'); }
function toonMenu(anker,kop,items){
  const m=$('popMenu'); m.innerHTML='';
  if(kop){ const h=document.createElement('div'); h.className='pkop'; h.textContent=kop; m.appendChild(h); }
  items.forEach(it=>{
    if(it.scheiding){ const s=document.createElement('div'); s.className='scheiding'; m.appendChild(s); return; }
    const b=document.createElement('button');
    b.textContent=it.tekst;
    if(it.gevaar) b.className='gevaar';
    if(it.uit) b.disabled=true;
    b.onclick=()=>{ sluitMenu(); it.fn(); };
    m.appendChild(b);
  });
  $('popBackdrop').classList.add('open');
  m.classList.add('open');
  // Onder het knopje plaatsen, maar altijd volledig binnen het scherm.
  const r=anker.getBoundingClientRect(), bw=m.offsetWidth, bh=m.offsetHeight;
  let links=Math.max(10,Math.min(r.left,window.innerWidth-bw-10));
  let boven=r.bottom+6;
  if(boven+bh>window.innerHeight-10) boven=Math.max(10,r.top-bh-6);
  m.style.left=links+'px'; m.style.top=boven+'px';
}

let dlgKlaar=null, dlgSoort='tekst';
function dlgSluit(waarde){
  $('dlgModal').classList.remove('open');
  const f=dlgKlaar; dlgKlaar=null;
  if(f) f(waarde);
}
function dlgOpen(opties,soort){
  return new Promise(res=>{
    if(dlgKlaar) dlgSluit(soort==='tekst'?null:false); // een vorig venster netjes afsluiten
    dlgSoort=soort; dlgKlaar=res;
    $('dlgKop').textContent=opties.titel||'';
    const tk=$('dlgTekst'); tk.textContent=opties.tekst||''; tk.style.display=opties.tekst?'':'none';
    $('dlgVeld').style.display = soort==='tekst'?'':'none';
    $('dlgLabel').textContent=opties.label||'Naam';
    const inp=$('dlgInput'); inp.value=opties.waarde||''; inp.placeholder=opties.placeholder||'';
    const ok=$('dlgOk');
    ok.textContent=opties.okTekst||(soort==='tekst'?'Bewaren':'Ja, doorgaan');
    ok.classList.toggle('gevaar',!!opties.gevaar);
    ok.classList.toggle('primary',!opties.gevaar);
    $('dlgAnnuleer').style.display=opties.enkelOk?'none':'';
    $('dlgModal').classList.add('open');
    if(soort==='tekst') setTimeout(()=>{ inp.focus(); inp.select(); },60);
  });
}
// Vraagt om tekst; geeft de ingetypte tekst terug, of null als je annuleert.
function vraagTekst(opties){ return dlgOpen(opties,'tekst'); }
// Vraagt ja/nee; geeft true of false terug.
function vraagBevestiging(opties){ return dlgOpen(opties,'bevestig'); }
// Gewoon iets melden, met enkel een Oké-knop.
function meld(titel,tekst){ return dlgOpen({titel:titel,tekst:tekst,okTekst:'Oké',enkelOk:true},'bevestig'); }

// ---------------- WIE BEN JE / WAT MAG JE ----------------
function currentUser(){ try{return JSON.parse(localStorage.getItem(K_USER)||'null');}catch(e){return null;} }
function currentUserName(){ const u=currentUser(); return u&&u.naam?u.naam:''; }
function gebruikers(){ return (window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[]; }
// Wie ben ik in de gedeelde namenlijst? Eerst op id zoeken. Vindt hij niets — bijvoorbeeld
// omdat je account ooit opnieuw is aangemaakt en dus een nieuw id kreeg — dan proberen we
// het op naam. Zonder die terugval zou je je rol (en dus je rechten) kwijt zijn.
function fullCurrentUser(){
  const u=currentUser(); if(!u) return null;
  const lijst=gebruikers();
  const opId=lijst.find(x=>x.id===u.id);
  if(opId) return opId;
  const naam=String(u.naam||'').trim().toLowerCase();
  const opNaam=naam?lijst.find(x=>String(x.naam||'').trim().toLowerCase()===naam):null;
  return opNaam||u;
}
function avatarInner(u){ return (u&&u.foto)?('<img src="'+esc(u.foto)+'" alt="">'):esc(initialen(u?u.naam:'')); }
function avatarVoorNaam(naam){ const u=gebruikers().find(x=>x.naam===naam); return u?avatarInner(u):esc(initialen(naam)); }
// 'rol' kan meerdere etiketten bevatten ('vast', 'admin', of beide) — zie BBInv.heeftRol.
function heeftRol(tag){ const u=fullCurrentUser(); return !!(window.BBInv&&BBInv.heeftRol&&BBInv.heeftRol(u,tag)); }
function isVasteMdw(){ return heeftRol('vast'); }
function magBeheren(actie){
  if(isVasteMdw()) return true;
  const p=prompt('Wachtwoord'+(actie?' '+actie:'')+':'); if(p===null) return false;
  if(p!==getPin()){ alert('Onjuist wachtwoord.'); return false; }
  return true;
}
// De regels staan in Instellingen → Toegangen (gedeeld via appconfig).
//   projMaken    → projecten/beheren     projBewerken → projecten/gebruiken
// De oude sleutels blijven als terugval, voor het geval een toestel nog niet bijgewerkt is.
function regel(sleutel,standaard){
  const niveau = sleutel==='projMaken' ? 'beheren' : 'gebruiken';
  const cfg=(window.BBInv&&BBInv.getConfig)?BBInv.getConfig():null;
  const t=cfg&&cfg.toegangen&&cfg.toegangen.projecten;
  if(t&&t[niveau]) return t[niveau];
  let lokaal=null;
  try{ const o=JSON.parse(localStorage.getItem('bb_toegangen')||'{}');
       lokaal=o&&o.projecten&&o.projecten[niveau]; }catch(e){}
  if(lokaal) return lokaal;
  if(cfg&&cfg[sleutel]) return cfg[sleutel];
  return localStorage.getItem(sleutel==='projMaken'?K_PROJ_MAKEN:K_PROJ_BEWERKEN)||standaard;
}
// Mag ik een project aanmaken/bewerken? (standaard: enkel vaste medewerkers)
// 'vast' = enkel vaste medewerkers · 'beheer' = vast óf het beheer-wachtwoord · 'iedereen' = elke login.
function magProjectMaken(vraag){
  const r=regel('projMaken','vast');
  if(r==='iedereen') return true;
  if(r==='beheer') return vraag?magBeheren('voor projectbeheer'):(isVasteMdw()||heeftRol('admin'));
  if(r==='admin') return heeftRol('admin');
  if(isVasteMdw()||heeftRol('admin')) return true;
  if(vraag) meld('Enkel vaste medewerkers',
    'Projecten aanmaken of aanpassen kan enkel door een vaste medewerker. '+wieBenIk()+
    ' Klopt dat niet? Tik dan rechtsboven op je naam om te wisselen, of laat je rol goedzetten '+
    'via Instellingen → Namenlijst beheren. Meewerken kan sowieso: taken toevoegen, verslepen, '+
    'afvinken en meepraten.');
  return false;
}
// Korte uitleg van wat de app op dit moment over jou weet — anders sta je voor een
// dichte deur zonder te zien waarom.
function wieBenIk(){
  const u=fullCurrentUser();
  if(!u) return 'De app ziet momenteel niemand als ingelogd.';
  const lijst=gebruikers();
  if(!lijst.length) return 'De namenlijst is nog niet geladen; probeer de pagina te verversen.';
  const gevonden=lijst.some(x=>x.id===u.id);
  const namen={vast:'vaste medewerker',admin:'admin',algemeen:'gedeeld account'};
  const tags=(window.BBInv&&BBInv.rolTags)?BBInv.rolTags(u):[];
  const rol=tags.length?tags.map(t=>namen[t]||t).join(' + '):'geen rol ingesteld';
  return 'De app ziet je als "'+(u.naam||'onbekend')+'" ('+rol+')'+
    (gevonden?'':' — dit account staat niet meer in de gedeelde namenlijst')+'.';
}
// Mag ik in een project werken (taken maken, verplaatsen, afvinken)? (standaard: iedereen)
function magWerken(){
  const r=regel('projBewerken','iedereen');
  if(r==='vast')   return isVasteMdw()||heeftRol('admin');
  if(r==='admin')  return heeftRol('admin');
  if(r==='beheer') return isVasteMdw()||heeftRol('admin');
  return true;
}
function eisWerken(){
  if(magWerken()) return true;
  meld('Enkel vaste medewerkers','Taken aanpassen kan hier enkel door een vaste medewerker. Dit is in te stellen via Instellingen op de startpagina.');
  return false;
}

// ---------------- THEMA ----------------
// Staat sinds v6.1 één keer in js/topbar.js, samen met de balk waar het maantje in zit.
// Deze pagina had een eigen kopie die de instelling van het toestel níét volgde, waardoor
// ze licht bleef terwijl de rest van de app donker stond.

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
let agJaar=null, agMaandNr=null, agGekozen=''; // welke maand de agenda toont, en de aangetikte dag
let agOpen=null, agConcept=null;               // afspraak in het venster
let docTag='', docZoek='';                     // filter en zoekterm bij Documenten
let vsOpen=null, vsConcept=null;               // verslag in het venster
let matOpen=null, matConcept=null, matFilter='', matZoek=''; // materiaal
let dbOpen=null, dbConcept=null;               // draaiboekregel in het venster
let evScore=0;                                 // sterren bij de evaluatie

function project(){ return huidigProject?(BBInv.getProject(huidigProject)||null):null; }
function taken(pid){ return BBInv.getTaken(pid||huidigProject); }
function kolommen(p){ return (p&&p.kolommen&&p.kolommen.length)?p.kolommen:['Te doen','Bezig','Klaar']; }
function isKlaarKolom(naam){ return /^(klaar|gereed|afgewerkt|done|af)$/i.test(String(naam||'').trim()); }
// De tabel 'projectberichten' bevat meer dan chat: ook verslagen, ideeën, materiaal,
// draaiboekregels en de evaluatie. Enkel dit hoort thuis in de Bespreking.
function isChat(b){ return !b.soort || b.soort==='bericht'; }
// Reacties horen bij één kaart op het bord (soort 'taakreactie', met het taak-id erin).
function taakReacties(taakId){
  const p=project(); if(!p||!taakId) return [];
  return BBInv.getBerichten(p.id).filter(b=>b.soort==='taakreactie'&&(b.data||{}).taakId===taakId);
}
// Documenten die aan één kaart hangen (het veld taakId bestaat al in de documenttabel).
function taakBijlagen(taakId){
  const p=project(); if(!p||!taakId) return [];
  return BBInv.getDocs(p.id).filter(d=>d.taakId===taakId);
}
// "21 aug" — korter dan 21/08/2026, past beter op een kaart.
function korteDatum(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00:00'); if(isNaN(d)) return iso;
  const maand=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'][d.getMonth()];
  return d.getDate()+' '+maand;
}
function filterActief(){ return alleenMijn||verbergKlaar||!!bordZoek.trim(); }

// Gelezen-stand van de bespreking (per toestel, niet gedeeld).
function gelezen(){ try{return JSON.parse(localStorage.getItem(K_GELEZEN)||'{}')||{};}catch(e){return {};} }
function zetGelezen(pid,ts){ const g=gelezen(); g[pid]=ts||Date.now(); try{localStorage.setItem(K_GELEZEN,JSON.stringify(g));}catch(e){} }
function ongelezenAantal(pid){
  const sinds=gelezen()[pid]||0;
  const mij=currentUserName();
  return BBInv.getBerichten(pid).filter(b=>isChat(b)&&(b.ts||0)>sinds&&b.auteur!==mij).length;
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
  wisFilters(); // filters van het vorige project niet meeslepen
  $('lijstView').style.display='none';
  $('projectView').style.display='';
  toonTab('overzicht');
  renderProject();
  window.scrollTo(0,0);
  // Eén project openen verbergt de lijst, maar dat ziet de browser niet. We
  // melden het, zodat de terugknop naar de lijst gaat en niet de pagina uit.
  if(window.bbStap) bbStap.open('project',naarLijst);
}
// Zoekvelden en filters horen bij één project; bij het wisselen zetten we ze schoon,
// anders lijkt een ander project ineens leeg door een filter die je vergeten was.
function wisFilters(){
  bordZoek=''; alleenMijn=false; verbergKlaar=false;
  matFilter=''; matZoek=''; docTag=''; docZoek='';
  agGekozen=''; agJaar=null; agMaandNr=null;
  ['bordZoek','matZoek','docZoek'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
}
function naarLijst(){
  huidigProject=null;
  $('projectView').style.display='none';
  $('lijstView').style.display='';
  $('title').textContent='Projecten';
  renderLijst();
  window.scrollTo(0,0);
  if(window.bbStap) bbStap.dicht('project');
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
  // De kleur van het project kleurt de titelbalk en de koppen van de kolommen.
  $('projectView').style.setProperty('--kleur',p.kleur||'#4a63c0');
  const st=$('pStatus'); st.textContent=p.status||'Lopend'; st.className='status '+statusKlasse(p.status);
  const ong=ongelezenAantal(p.id);
  $('pOngelezen').innerHTML = (ong&&huidigTab!=='bespreking') ? '<span class="ongelezen">'+ong+'</span>' : '';
  if(huidigTab==='overzicht') renderOverzicht();
  else if(huidigTab==='bord') renderBord();
  else if(huidigTab==='ideeen') renderIdeeen();
  else if(huidigTab==='materiaal') renderMateriaal();
  else if(huidigTab==='agenda') renderAgenda();
  else if(huidigTab==='draaiboek') renderDraaiboek();
  else if(huidigTab==='documenten') renderDocumenten();
  else if(huidigTab==='verslagen') renderVerslagen();
  else if(huidigTab==='evaluatie') renderEvaluatie();
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
  const laatste=BBInv.getBerichten(p.id).filter(isChat).slice(-3).reverse();
  const dg=dagenTot(p.deadline);
  const nu=vandaag();
  const komend=agendaItems().filter(it=>(it.datum||'')>=nu).slice(0,4);
  const alleDocs=BBInv.getDocs(p.id), aantalDocs=alleDocs.length, docs=alleDocs.slice(0,3);

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
    '<div class="blok"><h4>Komt eraan</h4>'+
      (komend.length?'<ul>'+komend.map(it=>'<li'+(it.bron==='taak'?(' data-taak="'+it.id+'"'):'')+'>'+esc(it.titel)+
          ' <span class="sub">('+dmy(it.datum)+(it.van?' '+it.van:'')+')</span></li>').join('')+'</ul>'
        :'<div class="sub">Niets gepland. Voeg iets toe bij Agenda.</div>')+
    '</div>'+
    '<div class="blok"><h4>Documenten</h4>'+
      (docs.length?'<ul>'+docs.map(d=>'<li data-doc="'+d.id+'">'+esc(d.naam)+' <span class="sub">('+esc(d.soort||'Overig')+')</span></li>').join('')+'</ul>'
        :'<div class="sub">Nog niets toegevoegd.</div>')+
      (aantalDocs>3?'<div class="sub" style="margin-top:6px">+ '+(aantalDocs-3)+' meer</div>':'')+
    '</div>'+
    '<div class="blok"><h4>Laatste berichten</h4>'+
      (laatste.length?laatste.map(b=>'<div class="sub" style="margin-bottom:8px"><b>'+esc(b.auteur||'?')+'</b> · '+tijdKort(b.ts)+'<br>'+esc((b.tekst||'').slice(0,110))+((b.tekst||'').length>110?'…':'')+'</div>').join('')
        :'<div class="sub">Nog geen berichten.</div>')+
    '</div>'+
    '<div class="blok"><h4>Doel</h4>'+
      (p.doel?'<div class="doeltekst">'+esc(p.doel)+'</div>':'<div class="sub">Nog geen omschrijving ingevuld.</div>')+
    '</div>';
  box.querySelectorAll('[data-taak]').forEach(li=>{ li.onclick=()=>openTaak(li.dataset.taak); });
  box.querySelectorAll('[data-doc]').forEach(li=>{ li.onclick=()=>{
    const d=alleDocs.find(x=>x.id===li.dataset.doc);
    if(d&&d.url) window.open(d.url,'_blank','noopener');
  }; });

  const acties=$('ovActies'); acties.innerHTML='';
  const knop=(tekst,klasse,fn)=>{ const b=document.createElement('button'); b.className='btn'+(klasse?' '+klasse:''); b.textContent=tekst; b.onclick=fn; acties.appendChild(b); };
  knop('✎ Project bewerken','',()=>{ if(magProjectMaken(true)) openProjectVenster(p.id); });
  knop(p.archief?'↩ Uit archief halen':'📦 Archiveren','',()=>{
    if(!magProjectMaken(true)) return;
    BBInv.updateProject(p.id,{archief:!p.archief});
    if(!p.archief){ naarLijst(); } else renderProject();
  });
  knop('🗑 Verwijderen','gevaar',async()=>{
    if(!magBeheren('om een project te verwijderen')) return;
    const ja=await vraagBevestiging({titel:'Project "'+(p.naam||'')+'" verwijderen?',
      tekst:'Alle taken en berichten van dit project verdwijnen mee. Dit kan niet ongedaan gemaakt worden.',
      okTekst:'Definitief verwijderen',gevaar:true});
    if(!ja) return;
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
    if(mnu) mnu.onclick=e=>{ e.stopPropagation(); kolomMenu(knaam,mnu); };
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
    b.onclick=async()=>{
      const n=await vraagTekst({titel:'Nieuwe kolom',label:'Naam van de kolom',
        placeholder:'bv. Wacht op levering',okTekst:'Toevoegen'});
      if(n===null) return;
      const naam=n.trim(); if(!naam) return;
      const ks=kolommen(p).slice();
      if(ks.indexOf(naam)>=0){ await meld('Bestaat al','Er is al een kolom met de naam "'+naam+'".'); return; }
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
  // Deadline als datumvakje, met kleur zodra het dringend of te laat wordt.
  let dl='';
  if(t.deadline){
    const kl = t.klaar ? ' groen' : (dg<0?' rood':(dg<=3?' oranje':''));
    const tekst = t.klaar ? dmy(t.deadline)
      : (dg<0?'te laat':(dg===0?'vandaag':(dg===1?'morgen':korteDatum(t.deadline))));
    dl='<span class="kdatum'+kl+'" title="Deadline '+esc(dmy(t.deadline))+'">🕐 '+esc(tekst)+'</span>';
  }
  const sub=(t.subtaken||[]);
  const subKlaar=sub.filter(s=>s.done).length;
  const reacties=taakReacties(t.id).length;
  const bijlagen=taakBijlagen(t.id).length;
  el.innerHTML=
    (t.labels&&t.labels.length?'<div class="klabels">'+t.labels.map(l=>{
      const def=LABELS.find(x=>x.naam===l);
      return '<span class="klabel"'+(def?(' style="background:'+def.kleur+'"'):'')+'>'+esc(l)+'</span>';
    }).join('')+'</div>':'')+
    '<div class="ktitel">'+esc(t.titel||'')+'</div>'+
    '<div class="kvoet">'+
      '<button class="vink'+(t.klaar?' on':'')+'" title="'+(t.klaar?'Terug openzetten':'Afvinken')+'">✓</button>'+
      dl+
      (t.omschrijving?'<span class="kmerk" title="Heeft een omschrijving">≡</span>':'')+
      (sub.length?'<span class="kmerk'+(subKlaar===sub.length?' vol':'')+'" title="Subtaken">☑ '+subKlaar+'/'+sub.length+'</span>':'')+
      (bijlagen?'<span class="kmerk" title="Bijlagen">📎 '+bijlagen+'</span>':'')+
      (reacties?'<span class="kmerk" title="Reacties">💬 '+reacties+'</span>':'')+
      ((t.wie&&t.wie.length)?'<span class="avs">'+t.wie.slice(0,3).map(n=>'<span class="av" title="'+esc(n)+'">'+avatarVoorNaam(n)+'</span>').join('')+
        (t.wie.length>3?'<span class="av">+'+(t.wie.length-3)+'</span>':'')+'</span>':'')+
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
      // In welke kolom hangt de vinger/muis? Het bord is een raster, dus we kijken naar
      // links/rechts én boven/onder. Zit je net naast een kolom, dan nemen we de dichtste.
      let doel=null, beste=Infinity;
      [...bord.querySelectorAll('.kolom')].forEach(k=>{
        const r=k.getBoundingClientRect();
        if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom){ doel=k; beste=-1; return; }
        if(beste===-1) return;
        const dx=Math.max(r.left-x,0,x-r.right), dy=Math.max(r.top-y,0,y-r.bottom);
        const d=dx*dx+dy*dy;
        if(d<beste){ beste=d; doel=k; }
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
      // Sleep je naar de boven- of onderrand van het scherm, dan scrollt de pagina mee.
      clearInterval(scrollT); scrollT=null;
      if(y<90) scrollT=setInterval(()=>window.scrollBy(0,-14),16);
      else if(y>window.innerHeight-90) scrollT=setInterval(()=>window.scrollBy(0,14),16);
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
function kolomMenu(knaam,anker){
  const p=project(); const ks=kolommen(p).slice();
  const i=ks.indexOf(knaam); if(i<0) return;
  const aantal=taken().filter(t=>t.kolom===knaam).length;
  toonMenu(anker,'Kolom "'+knaam+'"',[
    {tekst:'✎ Hernoemen', fn:()=>kolomHernoem(knaam)},
    {tekst:'← Naar links', uit:i===0, fn:()=>{
      ks.splice(i,1); ks.splice(i-1,0,knaam); BBInv.updateProject(p.id,{kolommen:ks}); renderBord();
    }},
    {tekst:'→ Naar rechts', uit:i===ks.length-1, fn:()=>{
      ks.splice(i,1); ks.splice(i+1,0,knaam); BBInv.updateProject(p.id,{kolommen:ks}); renderBord();
    }},
    {scheiding:true},
    {tekst:'🗑 Kolom verwijderen', gevaar:true, uit:ks.length<2, fn:()=>kolomVerwijder(knaam,aantal)}
  ]);
}
async function kolomHernoem(knaam){
  const p=project(); const ks=kolommen(p).slice(); const i=ks.indexOf(knaam); if(i<0) return;
  const n=await vraagTekst({titel:'Kolom hernoemen',label:'Nieuwe naam',waarde:knaam,okTekst:'Hernoemen'});
  if(n===null) return;
  const naam=n.trim(); if(!naam||naam===knaam) return;
  if(ks.indexOf(naam)>=0){ await vraagBevestiging({titel:'Bestaat al',tekst:'Er is al een kolom met de naam "'+naam+'".',okTekst:'Oké'}); return; }
  ks[i]=naam;
  BBInv.updateProject(p.id,{kolommen:ks});
  BBInv.verplaatsTaken(p.id,knaam,naam);  // de taken verhuizen mee naar de nieuwe naam
  renderBord();
}
async function kolomVerwijder(knaam,aantal){
  const p=project(); const ks=kolommen(p).slice();
  if(ks.length<2) return;
  const naar=ks.filter(k=>k!==knaam)[0];
  const ja=await vraagBevestiging({
    titel:'Kolom "'+knaam+'" verwijderen?',
    tekst: aantal ? (aantal===1?'De taak die erin staat verhuist naar "'+naar+'".'
                              :'De '+aantal+' taken die erin staan verhuizen naar "'+naar+'".')
                  : 'De kolom is leeg en verdwijnt gewoon.',
    okTekst:'Verwijderen', gevaar:true});
  if(!ja) return;
  BBInv.verplaatsTaken(p.id,knaam,naar);
  BBInv.updateProject(p.id,{kolommen:ks.filter(k=>k!==knaam)});
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
  // Bijlagen en reacties hangen aan een bestaande taak; bij een nieuwe kaart tonen we ze
  // pas nadat ze bewaard is (anders is er nog geen kaart om ze aan te hangen).
  const heeftId=!!taakOpen;
  $('tmBijlageVeld').style.display=heeftId?'':'none';
  $('tmReactieVeld').style.display=heeftId?'':'none';
  if(heeftId){ renderTmBijlagen(); renderTmReacties(); }
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
function renderTmBijlagen(){
  const box=$('tmBijlagen'); box.innerHTML='';
  const lijst=taakBijlagen(taakOpen);
  if(!lijst.length){ box.innerHTML='<div style="color:var(--muted);font-size:13px">Nog geen bijlagen.</div>'; return; }
  const mij=currentUserName();
  lijst.forEach(d=>{
    const r=document.createElement('div'); r.className='subrij';
    r.innerHTML='<span>'+docIcoon(d)+'</span><div class="tx">'+esc(d.naam||'')+
      '<div class="sub" style="font-size:12px;color:var(--muted)">'+esc(d.door||'?')+' · '+tijdKort(d.ts)+'</div></div>'+
      '<button class="btn mini">Openen</button><button class="btn mini clear">✕</button>';
    const [open,del]=r.querySelectorAll('button');
    open.onclick=()=>{ if(d.url) window.open(d.url,'_blank','noopener'); };
    del.onclick=async()=>{
      if(d.door!==mij && !magBeheren('om een bijlage van iemand anders te verwijderen')) return;
      const ja=await vraagBevestiging({titel:'Bijlage weghalen?',tekst:d.naam||'',okTekst:'Weghalen',gevaar:true});
      if(!ja) return;
      BBInv.removeDoc(d.id); renderTmBijlagen();
    };
    box.appendChild(r);
  });
}
function renderTmReacties(){
  const box=$('tmReacties'); box.innerHTML='';
  const lijst=taakReacties(taakOpen);
  if(!lijst.length){ box.innerHTML='<div style="color:var(--muted);font-size:13px">Nog geen reacties.</div>'; return; }
  const mij=currentUserName();
  lijst.forEach(b=>{
    const r=document.createElement('div'); r.className='subrij';
    r.innerHTML='<span class="av" style="width:24px;height:24px;border-radius:50%;background:var(--forest);color:#fff;'+
      'font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto">'+
      avatarVoorNaam(b.auteur)+'</span>'+
      '<div class="tx">'+esc(b.tekst||'')+
      '<div class="sub" style="font-size:12px;color:var(--muted)">'+esc(b.auteur||'?')+' · '+tijdKort(b.ts)+'</div></div>'+
      '<button class="btn mini clear">✕</button>';
    r.querySelector('button').onclick=async()=>{
      if(b.auteur!==mij && !magBeheren('om een reactie van iemand anders te verwijderen')) return;
      const ja=await vraagBevestiging({titel:'Reactie verwijderen?',tekst:b.tekst||'',okTekst:'Verwijderen',gevaar:true});
      if(!ja) return;
      BBInv.removeBericht(b.id); renderTmReacties();
    };
    box.appendChild(r);
  });
}
function plaatsReactie(){
  if(!taakOpen||!eisWerken()) return;
  const p=project(); if(!p) return;
  const t=$('tmReactieNew').value.trim(); if(!t) return;
  const mij=currentUserName();
  if(!mij){ meld('Niet ingelogd','Log eerst in via de startpagina.'); return; }
  BBInv.addBericht({projectId:p.id,soort:'taakreactie',auteur:mij,tekst:t,data:{taakId:taakOpen}});
  $('tmReactieNew').value=''; renderTmReacties();
}
async function taakBijlageBestand(e){
  const p=project(); if(!p||!taakOpen) return;
  const file=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!file||!eisWerken()) return;
  try{
    const url=await BBInv.uploadFile(file,'projecten/'+p.id+'/taken');
    BBInv.addDoc({projectId:p.id,naam:file.name,url:url,soort:'Overig',bron:'bestand',
      mime:file.type||'',grootte:file.size||0,taakId:taakOpen,door:currentUserName()});
    renderTmBijlagen();
  }catch(err){
    await meld('Uploaden mislukt',(err&&err.message?err.message:String(err))+' — uploaden lukt enkel met internet.');
  }
}
async function taakBijlageLink(){
  const p=project(); if(!p||!taakOpen||!eisWerken()) return;
  const url=await vraagTekst({titel:'Link aan deze taak hangen',label:'Adres (URL)',placeholder:'https://…',okTekst:'Volgende'});
  if(url===null) return;
  const adres=url.trim(); if(!adres) return;
  if(!/^https?:\/\//i.test(adres)){ await meld('Geen geldig adres','Een link begint met http:// of https://'); return; }
  const naam=await vraagTekst({titel:'Link aan deze taak hangen',label:'Naam',placeholder:'bv. Offerte',okTekst:'Toevoegen'});
  if(naam===null) return;
  BBInv.addDoc({projectId:p.id,naam:(naam.trim()||adres),url:adres,soort:'Overig',bron:'link',
    taakId:taakOpen,door:currentUserName()});
  renderTmBijlagen();
}
async function bewaarTaak(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  taakConcept.titel=$('tmTitel').value.trim();
  taakConcept.omschrijving=$('tmOms').value.trim();
  taakConcept.deadline=$('tmDeadline').value||'';
  taakConcept.kolom=$('tmKolom').value||kolommen(p)[0];
  if(!taakConcept.titel){ await meld('Titel ontbreekt','Geef de taak eerst een korte titel.'); $('tmTitel').focus(); return; }
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

// ---- Agenda ----
// Toont drie soorten dingen door elkaar: eigen agenda-items, de deadlines van taken
// (die komen er vanzelf bij) en de start/deadline van het project zelf.
function agendaItems(){
  const p=project(); if(!p) return [];
  const uit=BBInv.getAgenda(p.id).map(a=>({bron:'agenda',id:a.id,soort:a.soort||'afspraak',datum:a.datum,
    van:a.van,tot:a.tot,titel:a.titel,plaats:a.plaats,wie:a.wie||[],notitie:a.notitie}));
  taken().forEach(t=>{ if(t.deadline&&!t.klaar) uit.push({bron:'taak',id:t.id,soort:'taak',datum:t.deadline,
    titel:t.titel,wie:t.wie||[],notitie:''}); });
  if(p.start)    uit.push({bron:'project',id:'start',soort:'mijlpaal',datum:p.start,titel:'Start van het project',wie:[]});
  if(p.deadline) uit.push({bron:'project',id:'deadline',soort:'mijlpaal',datum:p.deadline,titel:'Deadline van het project',wie:[]});
  return uit.sort((a,b)=>(a.datum||'').localeCompare(b.datum||'')||(a.van||'').localeCompare(b.van||''));
}
function renderAgenda(){
  const p=project(); if(!p) return;
  if(agJaar===null){ const n=new Date(); agJaar=n.getFullYear(); agMaandNr=n.getMonth(); }
  const items=agendaItems();
  const perDag={};
  items.forEach(it=>{ if(!it.datum) return; (perDag[it.datum]=perDag[it.datum]||[]).push(it); });

  $('agMaand').textContent=MAANDEN[agMaandNr]+' '+agJaar;
  const kal=$('agKalender'); kal.innerHTML='';
  DAGEN.forEach(d=>{ const el=document.createElement('div'); el.className='dagnaam'; el.textContent=d; kal.appendChild(el); });
  const eerste=new Date(agJaar,agMaandNr,1);
  const start=(eerste.getDay()+6)%7;              // maandag als eerste dag van de week
  const dagenInMaand=new Date(agJaar,agMaandNr+1,0).getDate();
  const nu=vandaag();
  for(let i=0;i<start;i++){ const el=document.createElement('div'); el.className='dag leeg'; kal.appendChild(el); }
  for(let d=1;d<=dagenInMaand;d++){
    const iso=agJaar+'-'+String(agMaandNr+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const el=document.createElement('div');
    el.className='dag'+(iso===nu?' vandaag':'')+(iso===agGekozen?' gekozen':'');
    let inhoud='<div class="nr">'+d+'</div>';
    const lijst=perDag[iso]||[];
    lijst.slice(0,2).forEach(it=>{
      const telaat=it.soort==='taak'&&iso<nu;
      inhoud+='<div class="ag '+it.soort+(telaat?' telaat':'')+'" title="'+esc(it.titel)+'">'+esc(it.titel)+'</div>';
    });
    if(lijst.length>2) inhoud+='<div class="meer">+'+(lijst.length-2)+'</div>';
    el.innerHTML=inhoud;
    el.onclick=()=>{ agGekozen=(agGekozen===iso?'':iso); renderAgenda(); };
    kal.appendChild(el);
  }
  const rest=(7-((start+dagenInMaand)%7))%7;
  for(let i=0;i<rest;i++){ const el=document.createElement('div'); el.className='dag leeg'; kal.appendChild(el); }

  // Lijst eronder: de gekozen dag, of anders wat er als eerste aankomt.
  const lijstBox=$('agLijst'); lijstBox.innerHTML='';
  let toon, kop;
  if(agGekozen){ toon=(perDag[agGekozen]||[]); kop=dmy(agGekozen); }
  else { toon=items.filter(it=>(it.datum||'')>=nu).slice(0,12); kop='Eerstvolgende'; }
  $('agLijstKop').textContent=kop;
  if(!toon.length){
    lijstBox.innerHTML='<div class="leeg">'+(agGekozen?'Niets gepland op deze dag.':'Nog niets gepland.')+'</div>';
  }
  toon.forEach(it=>{
    const el=document.createElement('div');
    el.className='agrij '+it.soort;
    const wanneer=agGekozen
      ? (it.van?(it.van+(it.tot?'–'+it.tot:'')):'hele dag')
      : (dmy(it.datum)+(it.van?('<br>'+it.van):''));
    const extra=[];
    if(it.plaats) extra.push('📍 '+it.plaats);
    if(it.wie&&it.wie.length) extra.push('👤 '+it.wie.join(', '));
    if(it.bron==='taak') extra.push('taak van het bord');
    if(it.bron==='project') extra.push('uit de projectgegevens');
    if(it.notitie) extra.push(it.notitie);
    el.innerHTML='<div class="wanneer">'+wanneer+'</div>'+
      '<div class="wat"><b>'+esc(it.titel||'')+'</b>'+(extra.length?'<div class="sub">'+esc(extra.join(' · '))+'</div>':'')+'</div>'+
      (it.bron==='agenda'?'<div class="knopjes"><button class="btn mini" title="Bewerken">✎</button></div>':'');
    if(it.bron==='agenda') el.querySelector('button').onclick=()=>openAgendaVenster(it.id);
    else if(it.bron==='taak') el.onclick=()=>openTaak(it.id);
    lijstBox.appendChild(el);
  });
}
function openAgendaVenster(id,datum){
  const p=project(); if(!p) return;
  const a=id?BBInv.getAgenda(p.id).find(x=>x.id===id):null;
  agOpen=id||null;
  agConcept = a ? {titel:a.titel,soort:a.soort,datum:a.datum,van:a.van,tot:a.tot,plaats:a.plaats,
                   wie:(a.wie||[]).slice(),notitie:a.notitie}
                : {titel:'',soort:'afspraak',datum:datum||agGekozen||vandaag(),van:'',tot:'',plaats:'',
                   wie:[],notitie:''};
  $('agKop').textContent = a?'Afspraak bewerken':'Nieuwe afspraak';
  $('agTitel').value=agConcept.titel; $('agDatum').value=agConcept.datum;
  $('agVan').value=agConcept.van; $('agTot').value=agConcept.tot;
  $('agPlaats').value=agConcept.plaats; $('agNotitie').value=agConcept.notitie;
  $('agDel').style.display = a?'':'none';
  renderAgSoort(); renderAgWie();
  $('agModal').classList.add('open');
  setTimeout(()=>$('agTitel').focus(),50);
}
function sluitAgendaVenster(){ $('agModal').classList.remove('open'); agOpen=null; agConcept=null; }
function renderAgSoort(){
  const box=$('agSoort'); box.innerHTML='';
  AGENDA_SOORTEN.forEach(s=>{
    const b=document.createElement('button');
    b.className='keuze'+(agConcept.soort===s.key?' on':'');
    b.textContent=s.icoon+' '+s.naam;
    b.onclick=()=>{ agConcept.soort=s.key; renderAgSoort(); };
    box.appendChild(b);
  });
}
function renderAgWie(){
  const box=$('agWie'); box.innerHTML='';
  const users=gebruikers();
  if(!users.length){ box.innerHTML='<span style="color:var(--muted);font-size:13px">Nog geen collega\'s in de namenlijst.</span>'; return; }
  users.forEach(u=>{
    const aan=agConcept.wie.indexOf(u.naam)>=0;
    const b=document.createElement('button');
    b.className='keuze'+(aan?' on':'');
    b.innerHTML='<span class="av">'+avatarInner(u)+'</span>'+esc(u.naam);
    b.onclick=()=>{ const i=agConcept.wie.indexOf(u.naam); if(i>=0) agConcept.wie.splice(i,1); else agConcept.wie.push(u.naam); renderAgWie(); };
    box.appendChild(b);
  });
}
async function bewaarAgenda(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  agConcept.titel=$('agTitel').value.trim();
  agConcept.datum=$('agDatum').value||'';
  agConcept.van=$('agVan').value||''; agConcept.tot=$('agTot').value||'';
  agConcept.plaats=$('agPlaats').value.trim(); agConcept.notitie=$('agNotitie').value.trim();
  if(!agConcept.titel){ await meld('Titel ontbreekt','Geef de afspraak eerst een korte titel.'); $('agTitel').focus(); return; }
  if(!agConcept.datum){ await meld('Datum ontbreekt','Kies een datum voor de afspraak.'); $('agDatum').focus(); return; }
  if(agConcept.van&&agConcept.tot&&agConcept.tot<agConcept.van){
    const ja=await vraagBevestiging({titel:'Einduur ligt vóór het beginuur',tekst:'Van '+agConcept.van+' tot '+agConcept.tot+'. Toch bewaren?',okTekst:'Toch bewaren'});
    if(!ja) return;
  }
  if(agOpen) BBInv.updateAgenda(agOpen,agConcept);
  else BBInv.addAgenda(Object.assign({projectId:p.id,door:currentUserName()},agConcept));
  sluitAgendaVenster(); renderAgenda();
}

// ---- Documenten ----
function docIcoon(d){
  if(d.bron==='link') return '🔗';
  const n=(d.naam||'').toLowerCase(), m=(d.mime||'').toLowerCase();
  if(m.indexOf('pdf')>=0||/\.pdf$/.test(n)) return '📕';
  if(m.indexOf('image')>=0||/\.(png|jpe?g|gif|webp|heic)$/.test(n)) return '🖼️';
  if(m.indexOf('video')>=0||/\.(mp4|mov|m4v|avi)$/.test(n)) return '🎬';
  if(/\.(xlsx?|csv|numbers)$/.test(n)) return '📊';
  if(/\.(docx?|pages|txt|rtf)$/.test(n)) return '📄';
  return '📎';
}
function leesbareGrootte(b){
  if(!b) return '';
  if(b<1024) return b+' B';
  if(b<1024*1024) return Math.round(b/1024)+' kB';
  return (b/1048576).toFixed(1).replace('.',',')+' MB';
}
function renderDocumenten(){
  const p=project(); if(!p) return;
  const alle=BBInv.getDocs(p.id);
  const q=docZoek.trim().toLowerCase();

  const fil=$('docFilter'); fil.innerHTML='';
  const maakChip=(naam,waarde)=>{
    const b=document.createElement('button');
    b.className='chip'+(docTag===waarde?' active':'');
    const n=waarde?alle.filter(d=>d.soort===waarde).length:alle.length;
    b.textContent=naam+(n?' ('+n+')':'');
    b.onclick=()=>{ docTag=waarde; renderDocumenten(); };
    fil.appendChild(b);
  };
  maakChip('Alle','');
  DOC_TAGS.forEach(t=>maakChip(t,t));

  let lijst=alle;
  if(docTag) lijst=lijst.filter(d=>d.soort===docTag);
  if(q) lijst=lijst.filter(d=>((d.naam||'')+' '+(d.soort||'')).toLowerCase().indexOf(q)>=0);

  const box=$('docLijst'); box.innerHTML='';
  if(!lijst.length){
    box.innerHTML='<div class="leeg">'+(alle.length?'Niets gevonden met deze filter.':'Nog geen documenten. Voeg er hierboven één toe.')+'</div>';
    return;
  }
  const mij=currentUserName();
  lijst.forEach(d=>{
    const el=document.createElement('div'); el.className='docrij';
    el.innerHTML='<div class="ico">'+docIcoon(d)+'</div>'+
      '<div class="wat"><b>'+esc(d.naam||'zonder naam')+'</b>'+
        '<div class="sub">'+esc(d.door||'?')+' · '+tijdKort(d.ts)+(d.grootte?(' · '+leesbareGrootte(d.grootte)):'')+'</div></div>'+
      '<button class="doctag" title="Soort wijzigen">'+esc(d.soort||'Overig')+'</button>'+
      '<button class="btn mini" title="Openen">Openen</button>'+
      '<button class="btn mini clear" title="Verwijderen">🗑</button>';
    const [tagBtn,openBtn,delBtn]=el.querySelectorAll('button');
    tagBtn.onclick=()=>{
      if(!eisWerken()) return;
      toonMenu(tagBtn,'Soort',DOC_TAGS.map(t=>({tekst:(t===d.soort?'✓ ':'')+t,fn:()=>{
        BBInv.updateDoc(d.id,{soort:t}); renderDocumenten();
      }})));
    };
    openBtn.onclick=()=>{ if(d.url) window.open(d.url,'_blank','noopener'); };
    delBtn.onclick=async()=>{
      if(d.door!==mij && !magBeheren('om een document van iemand anders te verwijderen')) return;
      const ja=await vraagBevestiging({titel:'Document verwijderen?',
        tekst:'"'+(d.naam||'')+'" verdwijnt uit de lijst.'+(d.bron==='bestand'?' Het bestand zelf blijft in de opslag staan.':''),
        okTekst:'Verwijderen',gevaar:true});
      if(!ja) return;
      BBInv.removeDoc(d.id); renderDocumenten();
    };
    box.appendChild(el);
  });
}
async function docKiesBestand(e){
  const p=project(); if(!p) return;
  const file=e.target.files&&e.target.files[0];
  e.target.value='';
  if(!file) return;
  if(!eisWerken()) return;
  $('docBezig').classList.add('bezig');
  try{
    const url=await BBInv.uploadFile(file,'projecten/'+p.id);
    BBInv.addDoc({projectId:p.id,naam:file.name,url:url,soort:docTag||'Overig',bron:'bestand',
      mime:file.type||'',grootte:file.size||0,door:currentUserName()});
    renderDocumenten();
  }catch(err){
    await meld('Uploaden mislukt',(err&&err.message?err.message:String(err))+
      ' — uploaden lukt enkel met internet. Probeer het later opnieuw.');
  }finally{ $('docBezig').classList.remove('bezig'); }
}
async function docVoegLinkToe(){
  const p=project(); if(!p) return;
  if(!eisWerken()) return;
  const url=await vraagTekst({titel:'Link toevoegen',label:'Adres (URL)',placeholder:'https://…',okTekst:'Volgende'});
  if(url===null) return;
  const adres=url.trim(); if(!adres) return;
  if(!/^https?:\/\//i.test(adres)){ await meld('Geen geldig adres','Een link begint met http:// of https://'); return; }
  const naam=await vraagTekst({titel:'Link toevoegen',label:'Naam',placeholder:'bv. Offerte springkasteel',okTekst:'Toevoegen'});
  if(naam===null) return;
  BBInv.addDoc({projectId:p.id,naam:(naam.trim()||adres),url:adres,soort:docTag||'Overig',bron:'link',door:currentUserName()});
  renderDocumenten();
}

// ---- Verslagen ----
function verslagen(){
  const p=project(); if(!p) return [];
  return BBInv.getBerichten(p.id).filter(b=>b.soort==='verslag')
    .sort((a,b)=>((b.data&&b.data.datum)||'').localeCompare((a.data&&a.data.datum)||'')||(b.ts||0)-(a.ts||0));
}
function renderVerslagen(){
  const p=project(); if(!p) return;
  const box=$('vsLijst'); box.innerHTML='';
  const lijst=verslagen();
  if(!lijst.length){
    box.innerHTML='<div class="leeg">Nog geen verslagen. Maak er één na het volgende overleg — de actiepunten zet je dan met één tik op het bord.</div>';
    return;
  }
  const mij=currentUserName();
  lijst.forEach(v=>{
    const d=v.data||{};
    const acties=Array.isArray(d.acties)?d.acties:[];
    const el=document.createElement('div'); el.className='verslag';
    let html='<div class="vkop"><b>'+esc(v.tekst||'Verslag')+'</b>'+
      '<span class="pill">'+esc(dmy(d.datum)||tijdKort(v.ts))+'</span>'+
      '<span class="doctag">'+esc(v.auteur||'?')+'</span>'+
      '<button class="btn mini" style="margin-left:auto">✎</button>'+
      '<button class="btn mini clear">🗑</button></div>';
    if(d.aanwezigen&&d.aanwezigen.length){
      html+='<h5>Aanwezig</h5><div class="aanwezig">'+d.aanwezigen.map(n=>'<span class="av" title="'+esc(n)+'">'+avatarVoorNaam(n)+'</span>').join('')+'</div>';
    }
    if(d.besproken) html+='<h5>Besproken</h5><div class="vtekst">'+esc(d.besproken)+'</div>';
    if(d.beslissingen) html+='<h5>Beslissingen</h5><div class="vtekst">'+esc(d.beslissingen)+'</div>';
    if(acties.length){
      html+='<h5>Actiepunten</h5><div class="acties"></div>';
    }
    el.innerHTML=html;
    const [bewerkBtn,delBtn]=el.querySelectorAll('.vkop button');
    bewerkBtn.onclick=()=>openVerslagVenster(v.id);
    delBtn.onclick=async()=>{
      if(v.auteur!==mij && !magBeheren('om een verslag van iemand anders te verwijderen')) return;
      const ja=await vraagBevestiging({titel:'Verslag verwijderen?',tekst:esc(v.tekst||''),okTekst:'Verwijderen',gevaar:true});
      if(!ja) return;
      BBInv.removeBericht(v.id); renderVerslagen();
    };
    const av=el.querySelector('.acties');
    if(av) acties.forEach((a,i)=>{
      const bestaat=a.taakId && taken().some(t=>t.id===a.taakId);
      const r=document.createElement('div'); r.className='actierij';
      r.innerHTML='<div class="tx">'+esc(a.tekst||'')+
        '<div class="sub">'+esc([a.wie?('voor '+a.wie):'',a.deadline?('tegen '+dmy(a.deadline)):''].filter(Boolean).join(' · '))+'</div></div>'+
        (bestaat?'<span class="gedaan">✓ staat op het bord</span><button class="btn mini">Openen</button>'
                :'<button class="btn mini">→ maak taak</button>');
      const knop=r.querySelector('button');
      knop.onclick=()=>{
        if(bestaat){ toonTab('bord'); setTimeout(()=>openTaak(a.taakId),60); return; }
        if(!eisWerken()) return;
        const t=BBInv.addTaak({projectId:p.id,kolom:kolommen(p)[0],titel:a.tekst,
          wie:a.wie?[a.wie]:[],deadline:a.deadline||'',labels:[],subtaken:[],door:currentUserName()});
        const nieuw=acties.slice(); nieuw[i]=Object.assign({},a,{taakId:t.id});
        BBInv.updateBericht(v.id,{data:Object.assign({},d,{acties:nieuw})});
        renderVerslagen();
      };
      av.appendChild(r);
    });
    box.appendChild(el);
  });
}
function openVerslagVenster(id){
  const p=project(); if(!p) return;
  const v=id?verslagen().find(x=>x.id===id):null;
  vsOpen=id||null;
  const d=(v&&v.data)||{};
  vsConcept = v ? {titel:v.tekst||'',datum:d.datum||'',aanwezigen:(d.aanwezigen||[]).slice(),
                   besproken:d.besproken||'',beslissingen:d.beslissingen||'',
                   acties:(d.acties||[]).map(a=>Object.assign({},a))}
                : {titel:'Overleg',datum:vandaag(),aanwezigen:currentUserName()?[currentUserName()]:[],
                   besproken:'',beslissingen:'',acties:[]};
  $('vsKop').textContent = v?'Verslag bewerken':'Nieuw verslag';
  $('vsTitel').value=vsConcept.titel; $('vsDatum').value=vsConcept.datum;
  $('vsBesproken').value=vsConcept.besproken; $('vsBeslissingen').value=vsConcept.beslissingen;
  $('vsDel').style.display = v?'':'none';
  $('vsActieNew').value=''; $('vsActieDatum').value='';
  const sel=$('vsActieWie'); sel.innerHTML='<option value="">Niemand toegewezen</option>';
  gebruikers().forEach(u=>{ const o=document.createElement('option'); o.value=u.naam; o.textContent=u.naam; sel.appendChild(o); });
  renderVsWie(); renderVsActies();
  $('vsModal').classList.add('open');
  setTimeout(()=>$('vsTitel').focus(),50);
}
function sluitVerslagVenster(){ $('vsModal').classList.remove('open'); vsOpen=null; vsConcept=null; }
function renderVsWie(){
  const box=$('vsWie'); box.innerHTML='';
  const users=gebruikers();
  if(!users.length){ box.innerHTML='<span style="color:var(--muted);font-size:13px">Nog geen collega\'s in de namenlijst.</span>'; return; }
  users.forEach(u=>{
    const aan=vsConcept.aanwezigen.indexOf(u.naam)>=0;
    const b=document.createElement('button');
    b.className='keuze'+(aan?' on':'');
    b.innerHTML='<span class="av">'+avatarInner(u)+'</span>'+esc(u.naam);
    b.onclick=()=>{ const i=vsConcept.aanwezigen.indexOf(u.naam); if(i>=0) vsConcept.aanwezigen.splice(i,1); else vsConcept.aanwezigen.push(u.naam); renderVsWie(); };
    box.appendChild(b);
  });
}
function renderVsActies(){
  const box=$('vsActies'); box.innerHTML='';
  if(!vsConcept.acties.length){ box.innerHTML='<div style="color:var(--muted);font-size:13px">Nog geen actiepunten.</div>'; return; }
  vsConcept.acties.forEach((a,i)=>{
    const r=document.createElement('div'); r.className='actierij';
    r.innerHTML='<div class="tx">'+esc(a.tekst||'')+
      '<div class="sub">'+esc([a.wie||'niemand toegewezen',a.deadline?dmy(a.deadline):''].filter(Boolean).join(' · '))+'</div></div>'+
      (a.taakId?'<span class="gedaan">✓ op het bord</span>':'')+
      '<button class="btn mini clear">✕</button>';
    r.querySelector('button').onclick=()=>{ vsConcept.acties.splice(i,1); renderVsActies(); };
    box.appendChild(r);
  });
}
async function bewaarVerslag(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  vsConcept.titel=$('vsTitel').value.trim()||'Overleg';
  vsConcept.datum=$('vsDatum').value||vandaag();
  vsConcept.besproken=$('vsBesproken').value.trim();
  vsConcept.beslissingen=$('vsBeslissingen').value.trim();
  if(!vsConcept.besproken&&!vsConcept.beslissingen&&!vsConcept.acties.length){
    await meld('Nog niets ingevuld','Vul minstens iets in bij besproken, beslissingen of actiepunten.');
    return;
  }
  const data={datum:vsConcept.datum,aanwezigen:vsConcept.aanwezigen,besproken:vsConcept.besproken,
    beslissingen:vsConcept.beslissingen,acties:vsConcept.acties};
  if(vsOpen) BBInv.updateBericht(vsOpen,{tekst:vsConcept.titel,data:data});
  else BBInv.addBericht({projectId:p.id,soort:'verslag',auteur:currentUserName(),tekst:vsConcept.titel,data:data});
  sluitVerslagVenster(); renderVerslagen();
}

// ---- Ideeën ----
// Ideeën, materiaal, draaiboek en de evaluatie delen dezelfde opslag als de berichten;
// het veld 'soort' houdt ze uit elkaar. Zo is er geen extra tabel in de database nodig.
function itemsVan(soort){
  const p=project(); if(!p) return [];
  return BBInv.getBerichten(p.id).filter(b=>b.soort===soort);
}
function renderIdeeen(){
  const p=project(); if(!p) return;
  $('ideeVan').textContent='Van: '+(currentUserName()||'niet ingelogd');
  const box=$('ideeLijst'); box.innerHTML='';
  const lijst=itemsVan('idee').slice().reverse(); // nieuwste bovenaan
  if(!lijst.length){
    box.innerHTML='<div class="leeg">Nog geen ideeën. Gooi er hierboven eentje in — het hoeft nog niet doordacht te zijn.</div>';
    return;
  }
  const mij=currentUserName();
  lijst.forEach(b=>{
    const d=b.data||{};
    const opBord=d.taakId && taken().some(t=>t.id===d.taakId);
    const el=document.createElement('div');
    el.className='idee'+(opBord?' om':'');
    el.innerHTML='<div class="tx">'+esc(b.tekst||'')+
      '<div class="sub">'+esc(b.auteur||'?')+' · '+tijdKort(b.ts)+(opBord?' · staat op het bord':'')+'</div></div>'+
      '<button class="btn mini">'+(opBord?'Openen':'→ maak taak')+'</button>'+
      '<button class="btn mini clear">🗑</button>';
    const [actie,del]=el.querySelectorAll('button');
    actie.onclick=()=>{
      if(opBord){ toonTab('bord'); setTimeout(()=>openTaak(d.taakId),60); return; }
      if(!eisWerken()) return;
      const t=BBInv.addTaak({projectId:p.id,kolom:kolommen(p)[0],titel:b.tekst,door:currentUserName()});
      BBInv.updateBericht(b.id,{data:Object.assign({},d,{taakId:t.id})});
      renderIdeeen();
    };
    del.onclick=async()=>{
      if(b.auteur!==mij && !magBeheren('om een idee van iemand anders te verwijderen')) return;
      const ja=await vraagBevestiging({titel:'Idee verwijderen?',tekst:'"'+(b.tekst||'').slice(0,90)+'"',okTekst:'Verwijderen',gevaar:true});
      if(!ja) return;
      BBInv.removeBericht(b.id); renderIdeeen();
    };
    box.appendChild(el);
  });
}
function plaatsIdee(){
  const p=project(); if(!p) return;
  const t=$('ideeTekst').value.trim();
  if(!t){ $('ideeTekst').focus(); return; }
  const mij=currentUserName();
  if(!mij){ meld('Niet ingelogd','Log eerst in via de startpagina.'); return; }
  BBInv.addBericht({projectId:p.id,soort:'idee',auteur:mij,tekst:t,data:{taakId:''}});
  $('ideeTekst').value=''; renderIdeeen();
}

// ---- Materiaal ----
const MAT_STATUS=[
  {key:'Nodig',klasse:'nodig'},
  {key:'Besteld',klasse:'besteld'},
  {key:'In huis',klasse:'inhuis'},
  {key:'Geregeld',klasse:'geregeld'}
];
function matKlasse(s){ const x=MAT_STATUS.find(m=>m.key===s); return x?x.klasse:'nodig'; }
// Voorraad uit de bestaande inventaris, als de lijn aan een artikel gekoppeld is.
function voorraadVan(prijsId){
  if(!prijsId||!window.BBInv||!BBInv.getPrijzen) return null;
  const pr=BBInv.getPrijzen().find(x=>x.id===prijsId);
  return pr?pr:null;
}
function renderMateriaal(){
  const p=project(); if(!p) return;
  const alle=itemsVan('materiaal');
  const q=matZoek.trim().toLowerCase();

  // Samenvatting bovenaan
  const som=$('matSom'); som.innerHTML='';
  MAT_STATUS.forEach(s=>{
    const n=alle.filter(b=>((b.data||{}).status||'Nodig')===s.key).length;
    if(!n) return;
    som.innerHTML+='<span class="pill">'+n+' '+esc(s.key.toLowerCase())+'</span>';
  });
  if(!alle.length) som.innerHTML='';

  const fil=$('matFilter'); fil.innerHTML='';
  const chip=(naam,waarde)=>{
    const b=document.createElement('button');
    b.className='chip'+(matFilter===waarde?' active':'');
    b.textContent=naam;
    b.onclick=()=>{ matFilter=waarde; renderMateriaal(); };
    fil.appendChild(b);
  };
  chip('Alles','');
  MAT_STATUS.forEach(s=>chip(s.key,s.key));

  let lijst=alle;
  if(matFilter) lijst=lijst.filter(b=>((b.data||{}).status||'Nodig')===matFilter);
  if(q) lijst=lijst.filter(b=>((b.tekst||'')+' '+((b.data||{}).opmerking||'')).toLowerCase().indexOf(q)>=0);

  const box=$('matLijst'); box.innerHTML='';
  if(!lijst.length){
    box.innerHTML='<div class="leeg">'+(alle.length?'Niets gevonden met deze filter.'
      :'Nog niets op de lijst. Zet hier wat je nodig hebt voor dit project.')+'</div>';
    return;
  }
  lijst.forEach(b=>{
    const d=b.data||{};
    const status=d.status||'Nodig';
    const pr=voorraadVan(d.prijsId);
    const aantal=+d.aantal||0;
    const krap=pr && aantal && (pr.stock||0)<aantal;
    const el=document.createElement('div'); el.className='docrij';
    el.innerHTML='<div class="ico">'+(pr?'📦':'🧰')+'</div>'+
      '<div class="wat"><b>'+esc(b.tekst||'')+(aantal?(' <span class="sub">× '+aantal+(d.eenheid?' '+esc(d.eenheid):'')+'</span>'):'')+'</b>'+
        '<div class="sub">'+
          (pr?('voorraad in de inventaris: '+(pr.stock||0)+(krap?' <span class="matkrap">— te weinig</span>':'')):'niet gekoppeld aan de inventaris')+
          (d.opmerking?' · '+esc(d.opmerking):'')+
        '</div></div>'+
      '<button class="matstatus '+matKlasse(status)+'" title="Status wijzigen">'+esc(status)+'</button>'+
      '<button class="btn mini" title="Bewerken">✎</button>';
    const [statusBtn,bewerkBtn]=el.querySelectorAll('button');
    statusBtn.onclick=()=>{
      if(!eisWerken()) return;
      toonMenu(statusBtn,'Status',MAT_STATUS.map(s=>({tekst:(s.key===status?'✓ ':'')+s.key,fn:()=>{
        BBInv.updateBericht(b.id,{data:Object.assign({},d,{status:s.key})}); renderMateriaal();
      }})));
    };
    bewerkBtn.onclick=()=>openMateriaalVenster(b.id);
    box.appendChild(el);
  });
}
function openMateriaalVenster(id){
  const p=project(); if(!p) return;
  const b=id?itemsVan('materiaal').find(x=>x.id===id):null;
  matOpen=id||null;
  const d=(b&&b.data)||{};
  matConcept = b ? {naam:b.tekst||'',aantal:d.aantal||1,eenheid:d.eenheid||'',status:d.status||'Nodig',
                    prijsId:d.prijsId||'',opmerking:d.opmerking||''}
                 : {naam:'',aantal:1,eenheid:'',status:'Nodig',prijsId:'',opmerking:''};
  $('matKop').textContent = b?'Materiaal bewerken':'Materiaal toevoegen';
  $('matNaam').value=matConcept.naam; $('matAantal').value=matConcept.aantal;
  $('matEenheid').value=matConcept.eenheid; $('matOpm').value=matConcept.opmerking;
  $('matDel').style.display = b?'':'none';
  // Keuzelijst met alle artikelen uit de inventaris
  const dl=$('matInvList'); dl.innerHTML='';
  ((window.BBInv&&BBInv.getPrijzen)?BBInv.getPrijzen():[]).forEach(pr=>{
    const o=document.createElement('option'); o.value=pr.naam; dl.appendChild(o);
  });
  renderMatStatus(); toonMatVoorraad();
  $('matModal').classList.add('open');
  setTimeout(()=>$('matNaam').focus(),50);
}
function sluitMateriaalVenster(){ $('matModal').classList.remove('open'); matOpen=null; matConcept=null; }
function renderMatStatus(){
  const box=$('matStatus'); box.innerHTML='';
  MAT_STATUS.forEach(s=>{
    const b=document.createElement('button');
    b.className='keuze'+(matConcept.status===s.key?' on':''); b.textContent=s.key;
    b.onclick=()=>{ matConcept.status=s.key; renderMatStatus(); };
    box.appendChild(b);
  });
}
// Herkent de app de getypte naam uit de inventaris? Dan tonen we de voorraad en koppelen we.
function toonMatVoorraad(){
  const naam=$('matNaam').value.trim().toLowerCase();
  const pr=((window.BBInv&&BBInv.getPrijzen)?BBInv.getPrijzen():[]).find(x=>(x.naam||'').toLowerCase()===naam);
  matConcept.prijsId=pr?pr.id:'';
  const el=$('matVoorraad');
  el.textContent = pr ? ('✓ Gekoppeld aan de inventaris — voorraad nu: '+(pr.stock||0))
                      : (naam?'Niet in de inventaris gevonden; dat mag, het blijft gewoon een eigen lijn.':'');
}
async function bewaarMateriaal(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  matConcept.naam=$('matNaam').value.trim();
  matConcept.aantal=Math.max(0,parseInt($('matAantal').value,10)||0);
  matConcept.eenheid=$('matEenheid').value.trim();
  matConcept.opmerking=$('matOpm').value.trim();
  toonMatVoorraad();
  if(!matConcept.naam){ await meld('Naam ontbreekt','Vul in wat je nodig hebt.'); $('matNaam').focus(); return; }
  const data={aantal:matConcept.aantal,eenheid:matConcept.eenheid,status:matConcept.status,
    prijsId:matConcept.prijsId,opmerking:matConcept.opmerking};
  if(matOpen) BBInv.updateBericht(matOpen,{tekst:matConcept.naam,data:data});
  else BBInv.addBericht({projectId:p.id,soort:'materiaal',auteur:currentUserName(),tekst:matConcept.naam,data:data});
  sluitMateriaalVenster(); renderMateriaal();
}

// ---- Draaiboek ----
function draaiboekItems(){
  return itemsVan('draaiboek').slice().sort((a,b)=>{
    const da=(a.data||{}), db2=(b.data||{});
    return (da.datum||'').localeCompare(db2.datum||'')||(da.van||'').localeCompare(db2.van||'');
  });
}
function langeDatum(iso){
  if(!iso) return 'Zonder datum';
  const d=new Date(iso+'T00:00:00');
  if(isNaN(d)) return iso;
  const dag=['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'][d.getDay()];
  return dag+' '+d.getDate()+' '+MAANDEN[d.getMonth()];
}
function renderDraaiboek(){
  const p=project(); if(!p) return;
  const box=$('dbLijst'); box.innerHTML='';
  const lijst=draaiboekItems();
  if(!lijst.length){
    box.innerHTML='<div class="leeg">Nog geen draaiboek. Voeg de eerste regel toe — bijvoorbeeld het uur waarop de opbouw start.</div>';
    return;
  }
  const perDag={};
  lijst.forEach(b=>{ const dag=(b.data||{}).datum||''; (perDag[dag]=perDag[dag]||[]).push(b); });
  Object.keys(perDag).sort().forEach(dag=>{
    const groep=document.createElement('div'); groep.className='dbdag';
    groep.innerHTML='<div class="dbdagkop">'+esc(langeDatum(dag))+
      '<span class="telling">'+perDag[dag].length+' regel'+(perDag[dag].length===1?'':'s')+'</span></div>';
    perDag[dag].forEach(b=>{
      const d=b.data||{};
      const el=document.createElement('div'); el.className='dbrij';
      const extra=[];
      if(d.plaats) extra.push('📍 '+d.plaats);
      if(d.wie&&d.wie.length) extra.push('👤 '+d.wie.join(', '));
      if(d.opmerking) extra.push(d.opmerking);
      el.innerHTML='<div class="tijd">'+esc(d.van||'—')+(d.tot?('–'+esc(d.tot)):'')+'</div>'+
        '<div class="wat"><b>'+esc(b.tekst||'')+'</b>'+
          (extra.length?'<div class="sub">'+esc(extra.join(' · '))+'</div>':'')+'</div>'+
        '<button class="btn mini">✎</button>';
      el.querySelector('button').onclick=()=>openDraaiboekVenster(b.id);
      groep.appendChild(el);
    });
    box.appendChild(groep);
  });
}
function openDraaiboekVenster(id){
  const p=project(); if(!p) return;
  const b=id?draaiboekItems().find(x=>x.id===id):null;
  dbOpen=id||null;
  const d=(b&&b.data)||{};
  const laatste=draaiboekItems().slice(-1)[0];
  dbConcept = b ? {wat:b.tekst||'',datum:d.datum||'',van:d.van||'',tot:d.tot||'',plaats:d.plaats||'',
                   wie:(d.wie||[]).slice(),opmerking:d.opmerking||''}
                : {wat:'',datum:(laatste&&(laatste.data||{}).datum)||p.deadline||vandaag(),
                   van:'',tot:'',plaats:'',wie:[],opmerking:''};
  $('dbKop').textContent = b?'Regel bewerken':'Regel toevoegen';
  $('dbWat').value=dbConcept.wat; $('dbDatum').value=dbConcept.datum;
  $('dbVan').value=dbConcept.van; $('dbTot').value=dbConcept.tot;
  $('dbPlaats').value=dbConcept.plaats; $('dbOpm').value=dbConcept.opmerking;
  $('dbDel').style.display = b?'':'none';
  renderDbWie();
  $('dbModal').classList.add('open');
  setTimeout(()=>$('dbVan').focus(),50);
}
function sluitDraaiboekVenster(){ $('dbModal').classList.remove('open'); dbOpen=null; dbConcept=null; }
function renderDbWie(){
  const box=$('dbWie'); box.innerHTML='';
  const users=gebruikers();
  if(!users.length){ box.innerHTML='<span style="color:var(--muted);font-size:13px">Nog geen collega\'s in de namenlijst.</span>'; return; }
  users.forEach(u=>{
    const aan=dbConcept.wie.indexOf(u.naam)>=0;
    const b=document.createElement('button');
    b.className='keuze'+(aan?' on':'');
    b.innerHTML='<span class="av">'+avatarInner(u)+'</span>'+esc(u.naam);
    b.onclick=()=>{ const i=dbConcept.wie.indexOf(u.naam); if(i>=0) dbConcept.wie.splice(i,1); else dbConcept.wie.push(u.naam); renderDbWie(); };
    box.appendChild(b);
  });
}
async function bewaarDraaiboek(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  dbConcept.wat=$('dbWat').value.trim();
  dbConcept.datum=$('dbDatum').value||'';
  dbConcept.van=$('dbVan').value||''; dbConcept.tot=$('dbTot').value||'';
  dbConcept.plaats=$('dbPlaats').value.trim(); dbConcept.opmerking=$('dbOpm').value.trim();
  if(!dbConcept.wat){ await meld('Nog niets ingevuld','Vul in wat er op dat moment gebeurt.'); $('dbWat').focus(); return; }
  const data={datum:dbConcept.datum,van:dbConcept.van,tot:dbConcept.tot,plaats:dbConcept.plaats,
    wie:dbConcept.wie,opmerking:dbConcept.opmerking};
  if(dbOpen) BBInv.updateBericht(dbOpen,{tekst:dbConcept.wat,data:data});
  else BBInv.addBericht({projectId:p.id,soort:'draaiboek',auteur:currentUserName(),tekst:dbConcept.wat,data:data});
  sluitDraaiboekVenster(); renderDraaiboek();
}
function printDraaiboek(){
  const p=project(); if(!p) return;
  const lijst=draaiboekItems();
  if(!lijst.length){ meld('Niets af te drukken','Het draaiboek is nog leeg.'); return; }
  const perDag={};
  lijst.forEach(b=>{ const dag=(b.data||{}).datum||''; (perDag[dag]=perDag[dag]||[]).push(b); });
  let body='<h1>'+esc(p.naam||'Project')+' — draaiboek</h1><div class="sub">Afgedrukt op '+dmy(vandaag())+'</div>';
  Object.keys(perDag).sort().forEach(dag=>{
    body+='<h2>'+esc(langeDatum(dag))+'</h2><table><tr><th>Tijd</th><th>Wat</th><th>Waar</th><th>Wie</th><th>Opmerking</th></tr>';
    perDag[dag].forEach(b=>{
      const d=b.data||{};
      body+='<tr><td>'+esc((d.van||'')+(d.tot?'–'+d.tot:''))+'</td><td>'+esc(b.tekst||'')+'</td>'+
        '<td>'+esc(d.plaats||'')+'</td><td>'+esc((d.wie||[]).join(', '))+'</td><td>'+esc(d.opmerking||'')+'</td></tr>';
    });
    body+='</table>';
  });
  const css='body{font-family:Arial,Helvetica,sans-serif;color:#1b2233;margin:22px;}h1{font-size:20px;margin:0 0 4px;}'+
    'h2{font-size:15px;margin:20px 0 6px;}.sub{color:#666;font-size:12px;}table{border-collapse:collapse;width:100%;font-size:12.5px;}'+
    'th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top;}th{background:#f2f4fa;}';
  const w=window.open('','_blank');
  if(!w){ meld('Afdrukken lukt niet','Het afdrukvenster werd geblokkeerd. Sta pop-ups toe voor deze pagina.'); return; }
  w.document.open();
  w.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Draaiboek</title><style>'+css+'</style></head><body>'+body+'</body></html>');
  w.document.close(); w.focus();
  setTimeout(()=>{ try{ w.print(); }catch(e){} },350);
}

// ---- Evaluatie ----
function evaluatieVan(){ return itemsVan('evaluatie')[0]||null; }
function renderEvaluatie(){
  const p=project(); if(!p) return;
  const ev=evaluatieVan();
  const d=(ev&&ev.data)||{};
  evScore=+d.score||0;
  $('evGoed').value=d.goed||'';
  $('evMinder').value=d.minder||'';
  $('evOnthouden').value=d.onthouden||'';
  $('evMeta').innerHTML = ev?('Laatst bijgewerkt door '+esc(ev.auteur||'?')+' op '+tijdKort(ev.ts)):'Nog niet ingevuld.';
  renderEvSterren();
}
function renderEvSterren(){
  const box=$('evScore'); box.innerHTML='';
  for(let i=1;i<=5;i++){
    const b=document.createElement('button');
    b.className=(i<=evScore?'aan':''); b.textContent='⭐'; b.title=i+' van 5';
    b.onclick=()=>{ evScore=(evScore===i?0:i); renderEvSterren(); };
    box.appendChild(b);
  }
}
function bewaarEvaluatie(){
  if(!eisWerken()) return;
  const p=project(); if(!p) return;
  const data={score:evScore,goed:$('evGoed').value.trim(),minder:$('evMinder').value.trim(),
    onthouden:$('evOnthouden').value.trim()};
  const ev=evaluatieVan();
  if(ev) BBInv.updateBericht(ev.id,{tekst:'Evaluatie',data:data,auteur:currentUserName(),ts:Date.now()});
  else BBInv.addBericht({projectId:p.id,soort:'evaluatie',auteur:currentUserName(),tekst:'Evaluatie',data:data});
  renderEvaluatie();
  meld('Bewaard','De evaluatie is opgeslagen en zichtbaar voor het hele team.');
}
// Het project kopiëren als startpunt voor een volgende editie: dezelfde kolommen, taken,
// materiaallijst en draaiboek — maar schoon, zonder afgevinkte taken of oude datums.
async function kopieerProject(){
  const p=project(); if(!p) return;
  if(!magProjectMaken(true)) return;
  const naam=await vraagTekst({titel:'Project kopiëren',label:'Naam van het nieuwe project',
    waarde:volgendeNaam(p.naam||''),okTekst:'Kopiëren'});
  if(naam===null) return;
  const nieuweNaam=naam.trim(); if(!nieuweNaam) return;
  const ja=await vraagBevestiging({titel:'Wat gaat er mee?',
    tekst:'De kolommen, alle taken (niet afgevinkt en zonder deadline), de materiaallijst (alles terug op "Nodig") en het draaiboek (met de uren, zonder datum). '+
          'Berichten, verslagen, documenten en de agenda blijven bij het oude project.',
    okTekst:'Kopie maken'});
  if(!ja) return;

  const nieuw=BBInv.addProject({naam:nieuweNaam,doel:p.doel,status:'Idee',kleur:p.kleur,
    verantwoordelijke:p.verantwoordelijke,kolommen:kolommen(p).slice()});
  taken().forEach(t=>{
    BBInv.addTaak({projectId:nieuw.id,kolom:isKlaarKolom(t.kolom)?kolommen(p)[0]:t.kolom,titel:t.titel,
      omschrijving:t.omschrijving,wie:(t.wie||[]).slice(),deadline:'',labels:(t.labels||[]).slice(),
      subtaken:(t.subtaken||[]).map(s=>({text:s.text,done:false})),door:currentUserName()});
  });
  itemsVan('materiaal').forEach(b=>{
    const d=b.data||{};
    BBInv.addBericht({projectId:nieuw.id,soort:'materiaal',auteur:currentUserName(),tekst:b.tekst,
      data:{aantal:d.aantal,eenheid:d.eenheid,status:'Nodig',prijsId:d.prijsId,opmerking:d.opmerking}});
  });
  itemsVan('draaiboek').forEach(b=>{
    const d=b.data||{};
    BBInv.addBericht({projectId:nieuw.id,soort:'draaiboek',auteur:currentUserName(),tekst:b.tekst,
      data:{datum:'',van:d.van,tot:d.tot,plaats:d.plaats,wie:(d.wie||[]).slice(),opmerking:d.opmerking}});
  });
  // De lessen uit de evaluatie meenemen als eerste bericht in het nieuwe project.
  const ev=evaluatieVan();
  if(ev&&ev.data&&(ev.data.onthouden||ev.data.minder)){
    BBInv.addBericht({projectId:nieuw.id,auteur:currentUserName(),
      tekst:'Uit de evaluatie van "'+(p.naam||'')+'":\n'+
        (ev.data.onthouden?('Onthouden: '+ev.data.onthouden+'\n'):'')+
        (ev.data.minder?('Kon beter: '+ev.data.minder):'')});
  }
  openProject(nieuw.id);
}
// "Halloween 2026" → "Halloween 2027"; anders gewoon "(kopie)" erachter.
function volgendeNaam(naam){
  const m=String(naam).match(/^(.*?)(\d{4})(\D*)$/);
  if(m) return m[1]+(parseInt(m[2],10)+1)+m[3];
  return naam+' (kopie)';
}

// ---- Bespreking ----
function renderBespreking(){
  const p=project(); if(!p) return;
  const lijst=$('chatLijst'); lijst.innerHTML='';
  const mij=currentUserName();
  const berichten=BBInv.getBerichten(p.id).filter(isChat); // enkel echte chatberichten
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
    el.querySelector('.bdel').onclick=async()=>{
      // je eigen bericht mag je zelf weghalen; dat van een ander enkel met beheer
      if(b.auteur!==mij && !magBeheren('om een bericht van iemand anders te verwijderen')) return;
      const ja=await vraagBevestiging({titel:'Bericht verwijderen?',
        tekst:'"'+(b.tekst||'').slice(0,90)+((b.tekst||'').length>90?'…':'')+'"',
        okTekst:'Verwijderen',gevaar:true});
      if(!ja) return;
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
  if(!mij){ meld('Niet ingelogd','Log eerst in via de startpagina, zodat je collega\'s zien van wie het bericht komt.'); return; }
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
async function bewaarProject(){
  projConcept.naam=$('pmNaam').value.trim();
  projConcept.doel=$('pmDoel').value.trim();
  projConcept.start=$('pmStart').value||'';
  projConcept.deadline=$('pmDeadline').value||'';
  if(!projConcept.naam){ await meld('Naam ontbreekt','Geef het project eerst een naam.'); $('pmNaam').focus(); return; }
  if(projConcept.start&&projConcept.deadline&&projConcept.deadline<projConcept.start){
    const ja=await vraagBevestiging({titel:'Deadline ligt vóór de start',
      tekst:'De deadline ('+dmy(projConcept.deadline)+') valt vóór de startdatum ('+dmy(projConcept.start)+'). Toch bewaren?',
      okTekst:'Toch bewaren'});
    if(!ja) return;
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

// ---------------- TERUG-KNOP (zie js/terug.js) ----------------
// Elk venster zijn eigen sluitfunctie, zodat de terugknop hetzelfde doet als
// Annuleren. Voor dlgModal is dat extra belangrijk: dat venster laat een vraag
// wachten (een Promise), en die moet een antwoord krijgen — anders blijft de
// code erachter voor altijd hangen.
window.bbVensterSluiters={
  dlgModal:()=>dlgSluit(dlgSoort==='tekst'?null:false),
  taakModal:sluitTaak,
  agModal:sluitAgendaVenster,
  vsModal:sluitVerslagVenster,
  matModal:sluitMateriaalVenster,
  dbModal:sluitDraaiboekVenster,
  projModal:sluitProjectVenster
};

// ---------------- KOPPELINGEN ----------------
// Logo, gebruikersknop en maantje zitten in js/topbar.js en werken daar al; hier enkel
// de terugknop, want die moet eerst het geopende project sluiten voor ze de pagina verlaat.
$('terugBtn').onclick=()=>{ if(huidigProject) naarLijst(); else location.href='../entertainment.html'; };
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
$('tmDel').onclick=async()=>{
  if(!taakOpen) return;
  if(!eisWerken()) return;
  const t=taken().find(x=>x.id===taakOpen);
  const ja=await vraagBevestiging({titel:'Taak verwijderen?',tekst:t?('"'+t.titel+'"'):'',
    okTekst:'Verwijderen',gevaar:true});
  if(!ja) return;
  BBInv.removeTaak(taakOpen); sluitTaak(); renderProject();
};
$('tmSubAdd').onclick=()=>{
  const v=$('tmSubNew').value.trim(); if(!v) return;
  taakConcept.subtaken.push({text:v,done:false}); $('tmSubNew').value=''; renderTmSub(); $('tmSubNew').focus();
};
$('tmSubNew').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); $('tmSubAdd').click(); } };
$('tmBijlageBestand').onclick=()=>{ if(eisWerken()) $('tmBestand').click(); };
$('tmBestand').onchange=taakBijlageBestand;
$('tmBijlageLink').onclick=taakBijlageLink;
$('tmReactieAdd').onclick=plaatsReactie;
$('tmReactieNew').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); plaatsReactie(); } };
$('pmAnnuleer').onclick=sluitProjectVenster;
$('pmBewaar').onclick=bewaarProject;
$('chatPlaats').onclick=plaatsBericht;
$('chatTekst').onkeydown=e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) plaatsBericht(); };
// ---- ideeën ----
$('ideePlaats').onclick=plaatsIdee;
$('ideeTekst').onkeydown=e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) plaatsIdee(); };

// ---- materiaal ----
$('matNieuw').onclick=()=>{ if(eisWerken()) openMateriaalVenster(null); };
$('matZoek').oninput=e=>{ matZoek=e.target.value; renderMateriaal(); };
$('matNaam').oninput=toonMatVoorraad;
$('matAnnuleer').onclick=sluitMateriaalVenster;
$('matBewaar').onclick=bewaarMateriaal;
$('matDel').onclick=async()=>{
  if(!matOpen||!eisWerken()) return;
  const ja=await vraagBevestiging({titel:'Van de lijst halen?',tekst:$('matNaam').value,okTekst:'Verwijderen',gevaar:true});
  if(!ja) return;
  BBInv.removeBericht(matOpen); sluitMateriaalVenster(); renderMateriaal();
};
$('matModal').onclick=e=>{ if(e.target===$('matModal')) sluitMateriaalVenster(); };

// ---- draaiboek ----
$('dbNieuw').onclick=()=>{ if(eisWerken()) openDraaiboekVenster(null); };
$('dbPrint').onclick=printDraaiboek;
$('dbAnnuleer').onclick=sluitDraaiboekVenster;
$('dbBewaar').onclick=bewaarDraaiboek;
$('dbDel').onclick=async()=>{
  if(!dbOpen||!eisWerken()) return;
  const ja=await vraagBevestiging({titel:'Regel verwijderen?',tekst:$('dbWat').value,okTekst:'Verwijderen',gevaar:true});
  if(!ja) return;
  BBInv.removeBericht(dbOpen); sluitDraaiboekVenster(); renderDraaiboek();
};
$('dbModal').onclick=e=>{ if(e.target===$('dbModal')) sluitDraaiboekVenster(); };

// ---- evaluatie ----
$('evBewaar').onclick=bewaarEvaluatie;
$('evKopie').onclick=kopieerProject;

// ---- agenda ----
$('agVorige').onclick=()=>{ agMaandNr--; if(agMaandNr<0){agMaandNr=11;agJaar--;} agGekozen=''; renderAgenda(); };
$('agVolgende').onclick=()=>{ agMaandNr++; if(agMaandNr>11){agMaandNr=0;agJaar++;} agGekozen=''; renderAgenda(); };
$('agVandaag').onclick=()=>{ const n=new Date(); agJaar=n.getFullYear(); agMaandNr=n.getMonth(); agGekozen=vandaag(); renderAgenda(); };
$('agNieuw').onclick=()=>{ if(eisWerken()) openAgendaVenster(null,agGekozen||''); };
$('agAnnuleer').onclick=sluitAgendaVenster;
$('agBewaar').onclick=bewaarAgenda;
$('agDel').onclick=async()=>{
  if(!agOpen||!eisWerken()) return;
  const ja=await vraagBevestiging({titel:'Afspraak verwijderen?',tekst:$('agTitel').value,okTekst:'Verwijderen',gevaar:true});
  if(!ja) return;
  BBInv.removeAgenda(agOpen); sluitAgendaVenster(); renderAgenda();
};
$('agModal').onclick=e=>{ if(e.target===$('agModal')) sluitAgendaVenster(); };

// ---- documenten ----
$('docUpload').onclick=()=>{ if(eisWerken()) $('docBestand').click(); };
$('docBestand').onchange=docKiesBestand;
$('docLink').onclick=docVoegLinkToe;
$('docZoek').oninput=e=>{ docZoek=e.target.value; renderDocumenten(); };

// ---- verslagen ----
$('vsNieuw').onclick=()=>{ if(eisWerken()) openVerslagVenster(null); };
$('vsAnnuleer').onclick=sluitVerslagVenster;
$('vsBewaar').onclick=bewaarVerslag;
$('vsDel').onclick=async()=>{
  if(!vsOpen||!eisWerken()) return;
  // Zelfde regel als in de lijst: je eigen verslag mag je zelf wissen, dat van een
  // ander enkel met het beheer-wachtwoord.
  const v=verslagen().find(x=>x.id===vsOpen);
  if(v && v.auteur!==currentUserName() && !magBeheren('om een verslag van iemand anders te verwijderen')) return;
  const ja=await vraagBevestiging({titel:'Verslag verwijderen?',tekst:$('vsTitel').value,okTekst:'Verwijderen',gevaar:true});
  if(!ja) return;
  BBInv.removeBericht(vsOpen); sluitVerslagVenster(); renderVerslagen();
};
$('vsActieAdd').onclick=()=>{
  const t=$('vsActieNew').value.trim(); if(!t) return;
  vsConcept.acties.push({tekst:t,wie:$('vsActieWie').value||'',deadline:$('vsActieDatum').value||'',taakId:''});
  $('vsActieNew').value=''; $('vsActieDatum').value='';
  renderVsActies(); $('vsActieNew').focus();
};
$('vsActieNew').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); $('vsActieAdd').click(); } };
$('vsModal').onclick=e=>{ if(e.target===$('vsModal')) sluitVerslagVenster(); };

// ---- het kleine venster (typen / bevestigen) en het keuzemenu ----
$('dlgOk').onclick=()=>dlgSluit(dlgSoort==='tekst'?$('dlgInput').value:true);
$('dlgAnnuleer').onclick=()=>dlgSluit(dlgSoort==='tekst'?null:false);
$('dlgInput').onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); dlgSluit($('dlgInput').value); } };
$('dlgModal').onclick=e=>{ if(e.target===$('dlgModal')) dlgSluit(dlgSoort==='tekst'?null:false); };
$('popBackdrop').onclick=sluitMenu;
window.addEventListener('resize',sluitMenu);
window.addEventListener('scroll',()=>{ if($('popMenu').classList.contains('open')) sluitMenu(); },true);

document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  // van boven naar beneden: eerst het bovenste venster sluiten
  if($('popMenu').classList.contains('open')) sluitMenu();
  else if($('dlgModal').classList.contains('open')) dlgSluit(dlgSoort==='tekst'?null:false);
  else if($('taakModal').classList.contains('open')) sluitTaak();
  else if($('projModal').classList.contains('open')) sluitProjectVenster();
  else if($('agModal').classList.contains('open')) sluitAgendaVenster();
  else if($('vsModal').classList.contains('open')) sluitVerslagVenster();
  else if($('matModal').classList.contains('open')) sluitMateriaalVenster();
  else if($('dbModal').classList.contains('open')) sluitDraaiboekVenster();
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
  const kern=window.BBInv&&BBInv.isProjectenGedeeld&&BBInv.isProjectenGedeeld();
  const extra=window.BBInv&&BBInv.isProjectExtraGedeeld&&BBInv.isProjectExtraGedeeld();
  if(kern&&extra){
    deel.textContent='Gedeeld met alle toestellen.';
  }else if(window.BBInv&&BBInv.isReady&&BBInv.isReady()){
    deel.innerHTML='⚠ Nog niet alles gedeeld: '+(kern?'de tabellen voor agenda en documenten':'de projecttabellen')+
      ' ontbreken nog in de database. Alles werkt, maar enkel op dit toestel. '+
      'Voer <b>docs/projecten-supabase.sql</b> (opnieuw) uit in Supabase.';
  }else deel.textContent='';
}
function herteken(){
  updateUserKnop(); updateSync();
  $('sysline').textContent='Projecten '+APP_VERSION+' — onderdeel van de Entertainment-app';
  // Niet hertekenen terwijl iemand een kaart vasthoudt of in een venster typt:
  // een wijziging van een collega zou anders het scherm onder je handen wegtrekken.
  if(bezigMetSlepen) return;
  if($('taakModal').classList.contains('open')||$('projModal').classList.contains('open')) return;
  if($('dlgModal').classList.contains('open')||$('popMenu').classList.contains('open')) return;
  if($('agModal').classList.contains('open')||$('vsModal').classList.contains('open')) return;
  if($('matModal').classList.contains('open')||$('dbModal').classList.contains('open')) return;
  if(huidigProject) renderProject(); else renderLijst();
}
// Niet ingelogd? Dan eerst langs de startpagina, want daar staat het inlogscherm.
if(!currentUser()){
  location.replace('../entertainment.html');
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
if('serviceWorker' in navigator){ navigator.serviceWorker.register('../sw.js').catch(()=>{}); }
})();

// =====================================================================
//  KERN — het gedeelte dat ELKE pagina nodig heeft.
//  Sinds v4.0 is elke kaart van de startpagina een eigen pagina; sinds v4.6
//  staan die pagina's samen in de map paginas/ (de startpagina zelf en het
//  spel blijven in de hoofdmap). Alles wat die pagina's gemeen hebben staat
//  hier één keer: inloggen, thema, foto's, de gedeelde instellingen en de
//  synchronisatie-melding.
//
//  Volgorde in elke pagina (onderaan de body):
//     supabase.min.js → inventaris-data.js → inventaris.js → kern.js → eigen script
//  Deze kern zet zelf BBInv.init() in gang zodra de pagina klaar is; een
//  pagina hoeft enkel window.bbOnChange / window.bbStart in te vullen.
// =====================================================================

// ---------------- WAAR STAAT DE APP? ----------------
// Een pagina uit paginas/ zit één map dieper dan de startpagina. In plaats van
// overal '../' te gissen, leiden we de hoofdmap één keer af uit het adres van
// dit bestand (js/kern.js staat altijd rechtstreeks onder de hoofdmap).
const BB_ROOT=(function(){
  const s=document.currentScript||[...document.scripts].find(x=>/js\/kern\.js/.test(x.src||''));
  return (s&&s.src)? s.src.replace(/js\/kern\.js.*$/,'') : new URL('./',location.href).href;
})();
// bbUrl('paginas/inventaris.html') werkt vanaf élke pagina.
function bbUrl(pad){ return BB_ROOT+pad; }

// ---------------- GEDEELDE VENSTERS (op elke pagina hetzelfde) -------
// Eén keer hier beschreven i.p.v. in tien HTML-bestanden.
document.body.insertAdjacentHTML('afterbegin',`
<div id="loginOverlay">
  <div class="login-card">
    <div class="login-head">
      <img src="${BB_ROOT}assets/logo-cp.png" alt="Center Parcs">
      <div>
        <h2>Welkom</h2>
        <div class="login-sub" id="loginSub">Tik op je naam om in te loggen</div>
      </div>
    </div>
    <div id="loginNames">
      <div id="nameGrid"></div>
      <div class="login-foot">
        <button class="login-link" id="loginCancel" style="display:none">← Terug (blijf ingelogd)</button>
        <button class="login-link" id="loginBeheer">⚙ Namen beheren</button>
      </div>
    </div>
    <div id="loginPin" class="pin-panel" style="display:none">
      <div class="pin-who" id="pinWho">Naam</div>
      <div class="pin-dots"><i></i><i></i><i></i><i></i></div>
      <div class="pin-msg" id="pinMsg"></div>
      <div class="keypad" id="keypad">
        <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
        <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
        <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
        <button class="wide" data-k="back">⌫</button><button data-k="0">0</button><button class="wide" data-k="cancel">↩</button>
      </div>
      <label class="pin-remember"><input type="checkbox" id="pinRemember"> Onthoud mij op dit toestel <span class="pin-hint">(alleen je eigen gsm)</span></label>
    </div>
    <div id="loginBeheerPanel" style="display:none">
      <p class="login-sub" style="margin:0 0 14px">Voeg collega's toe en laat de code op <b>0000</b> staan — bij de eerste keer inloggen kiest de collega zelf een eigen code. Vergeten code? Tik <b>Reset</b> en zet ze terug op 0000. Deze lijst is gedeeld met alle toestellen.</p>
      <div class="gebradd">
        <div class="h">Nieuwe collega</div>
        <input type="text" id="gebrNaam" class="finp" placeholder="Naam (bv. Jan)">
        <input type="tel" id="gebrPin" class="finp" inputmode="numeric" maxlength="4" value="0000" placeholder="Pincode (4 cijfers)">
        <button class="btn primary" id="gebrAdd">Collega toevoegen</button>
      </div>
      <div class="gebrlist" id="gebrlist" style="margin-top:14px"></div>
      <div class="login-foot"><button class="login-link" id="beheerKlaar">← Klaar</button></div>
    </div>
  </div>
</div>

<div class="cammodal" id="profielModal">
  <div class="cammodal-box choose">
    <div class="cammodal-title">Mijn profiel</div>
    <div id="profAvatar"></div>
    <div class="prof-naam" id="profNaam"></div>
    <button class="btn primary" id="profFoto">📷 Profielfoto kiezen</button>
    <button class="btn" id="profFotoDel" style="display:none">Foto verwijderen</button>
    <button class="btn" id="profWissel">🔄 Wissel gebruiker</button>
    <button class="btn" id="profUitloggen">🚪 Uitloggen</button>
    <button class="btn clear" id="profSluit">Sluiten</button>
  </div>
</div>

<div class="cammodal" id="fotoBronModal">
  <div class="cammodal-box choose">
    <div class="cammodal-title">Profielfoto</div>
    <button class="btn primary" id="bronCamera">📷 Foto maken met camera</button>
    <button class="btn" id="bronGalerij">🖼️ Uit galerij kiezen</button>
    <button class="btn clear" id="bronAnnuleer">Annuleren</button>
  </div>
</div>

<div class="cammodal" id="fotoKies"><div class="cammodal-box choose">
  <div class="cammodal-title">Foto toevoegen</div>
  <button class="btn primary" id="kiesCam">📸 Maak een foto</button>
  <button class="btn" id="kiesFile">🖼️ Kies uit bestanden</button>
  <button class="btn clear" id="kiesAnnuleer">Annuleren</button>
</div></div>

<div class="cammodal" id="camModal"><div class="cammodal-box">
  <video id="camVideo" autoplay playsinline muted></video>
  <div class="cammodal-bar">
    <button class="btn clear" id="camCancel">Annuleren</button>
    <button class="btn primary" id="camShot">📸 Vastleggen</button>
  </div>
</div></div>

<div class="cammodal" id="fotoView"><img id="fotoViewImg" alt=""><video id="fotoViewVid" controls playsinline style="display:none"></video></div>
`);

// ---------------- STATE ----------------
const APP_VERSION='v7.2';
const K_MED='bb_home_mededeling';
const K_LINKS='bb_home_links';
const K_PIN='bb_home_pin';
const K_DREMPEL='bb_home_drempel';       // rood: voorraad bijna op
const K_DREMPEL2='bb_home_drempel2';     // oranje: aandacht gevraagd
const K_DREMPEL_BK='bb_home_drempel_boekjes'; // boekjes-voorraad melding
const K_BESTELMAIL='bb_home_bestelmail';
const K_CONTACTEN='bb_contacten';
const K_CHECKLISTEN='bb_checklisten';
const K_PROJ_MAKEN='bb_proj_maken';        // wie mag projecten aanmaken/bewerken
const K_PROJ_BEWERKEN='bb_proj_bewerken';  // wie mag in een project werken
const DEFAULT_PIN='3920';
const DEFAULT_DREMPEL=16;
const DEFAULT_DREMPEL2=24;
const DEFAULT_DREMPEL_BK=500;

function getMededeling(){return localStorage.getItem(K_MED)||'';}
// Elke niet-lege regel is een aparte mededeling; meerdere regels roteren op de home.
function getMededelingen(){return getMededeling().split('\n').map(s=>s.trim()).filter(Boolean);}
function getLinks(){try{return Object.assign({inventaris:'',manuals:''},JSON.parse(localStorage.getItem(K_LINKS))||{});}catch(e){return{inventaris:'',manuals:''};}}
function getPin(){return localStorage.getItem(K_PIN)||DEFAULT_PIN;}
function getDrempel(){const v=parseInt(localStorage.getItem(K_DREMPEL),10);return isNaN(v)?DEFAULT_DREMPEL:v;}
function getDrempel2(){const v=parseInt(localStorage.getItem(K_DREMPEL2),10);return isNaN(v)?DEFAULT_DREMPEL2:v;}
function getDrempelBoekjes(){const v=parseInt(localStorage.getItem(K_DREMPEL_BK),10);return isNaN(v)?DEFAULT_DREMPEL_BK:v;}
// eenmalige update naar de nieuwe drempels (16 / 24)
if(localStorage.getItem('bb_drempel_v2')!=='1'){
  localStorage.setItem(K_DREMPEL,String(DEFAULT_DREMPEL));
  localStorage.setItem(K_DREMPEL2,String(DEFAULT_DREMPEL2));
  localStorage.setItem('bb_drempel_v2','1');
}
function getBestelMail(){return localStorage.getItem(K_BESTELMAIL)||'';}
// Rechten voor Projecten (projecten.html leest dezelfde waarden).
function getProjMaken(){return toegangRegel('projecten','beheren');}
function getProjBewerken(){return toegangRegel('projecten','gebruiken');}

// ---------------- TOEGANGEN ----------------
// Eén plek waar per categorie staat wie wat mag. Vroeger zat dit verspreid in de code
// (isVasteMdw hier, magBeheren daar) en was het enkel te wijzigen door de code aan te
// passen. Nu staat het in de gedeelde instellingen en beheer je het in de app.
//
// Drie niveaus per categorie:
//   bekijken  — de kaart op de home zien en de pagina openen
//   gebruiken — gewone dingen doen: toevoegen, invullen, afvinken
//   beheren   — het slotje: verwijderen, lijsten aanpassen, bedragen zien
//
// Vier keuzes per niveau:
//   iedereen — iedereen die ingelogd is
//   vast     — vaste medewerkers en admins
//   admin    — enkel admins
//   beheer   — met het beheer-wachtwoord (vaste mdw en admins hoeven het niet te typen)
const K_TOEGANGEN='bb_toegangen';
const TOEGANG_NIVEAUS=['bekijken','gebruiken','beheren'];
const TOEGANG_KEUZES=[
  {waarde:'iedereen', naam:'Iedereen'},
  {waarde:'vast',     naam:'Vaste mdw + admin'},
  {waarde:'admin',    naam:'Enkel admin'},
  {waarde:'beheer',   naam:'Met wachtwoord'}
];
// De standaardwaarden zijn zo gekozen dat de app zich precies gedraagt zoals vóór deze
// instelling bestond. Wie niets aanpast, merkt er niets van.
const TOEGANG_CATEGORIEEN=[
  {key:'spel',        naam:'Bazar Bizarre',  uitleg:'Het spel leiden en afsluiten.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'inventaris',  naam:'Inventaris',     uitleg:'Voorraad, leveringen en ingezonden formulieren.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'bestellingen',naam:'Besteloverzicht',uitleg:'Beheren omvat ook de bedragen en het financieel overzicht.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'vast'}},
  {key:'projecten',   naam:'Projecten',      uitleg:'Gebruiken = in een project werken. Beheren = projecten aanmaken en verwijderen.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'vast'}},
  {key:'ratings',     naam:'Ratings',        uitleg:'Beoordelingen bekijken en invullen.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'checklisten', naam:'Checklists',     uitleg:'Afvinklijsten.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'contacten',   naam:'Contacten',      uitleg:'Telefoonnummers en e-mails.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'logboek',     naam:'Logboek',        uitleg:'Overdracht tussen shifts.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'werkuren',    naam:'Mijn werkuren',  uitleg:'Je eigen gepresteerde uren bijhouden. Iedereen ziet enkel zijn eigen uren — ook wie hier "beheren" mag, ziet die van een collega niet.',
   std:{bekijken:'vast',gebruiken:'vast',beheren:'vast'}},
  {key:'manuals',     naam:'Online manuals', uitleg:'Handleidingen en video\'s.',
   std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'}},
  {key:'activiteit',  naam:'Activiteit',     uitleg:'Wie heeft wat aangepast.',
   std:{bekijken:'vast',gebruiken:'vast',beheren:'admin'}},
  {key:'systeem',     naam:'Systeem',        uitleg:'Verbinding, synchronisatie en opslag.',
   std:{bekijken:'admin',gebruiken:'admin',beheren:'admin'}}
];
function _toegangStd(cat){
  const c=TOEGANG_CATEGORIEEN.find(x=>x.key===cat);
  return c?c.std:{bekijken:'iedereen',gebruiken:'iedereen',beheren:'beheer'};
}
function getToegangen(){
  let opgeslagen={};
  try{ opgeslagen=JSON.parse(localStorage.getItem(K_TOEGANGEN))||{}; }catch(e){ opgeslagen={}; }
  const uit={};
  TOEGANG_CATEGORIEEN.forEach(c=>{
    const eigen=opgeslagen[c.key]||{};
    uit[c.key]={};
    TOEGANG_NIVEAUS.forEach(n=>{
      const w=eigen[n];
      uit[c.key][n]=TOEGANG_KEUZES.some(k=>k.waarde===w) ? w : c.std[n];
    });
  });
  return uit;
}
function setToegangen(obj){
  try{ localStorage.setItem(K_TOEGANGEN,JSON.stringify(obj||{})); }catch(e){}
  if(!cfgApplying) pushConfig();
}
function toegangRegel(cat,niveau){
  const t=getToegangen()[cat];
  return (t&&t[niveau])||_toegangStd(cat)[niveau];
}
// Mag ik dit, zonder iets te vragen? 'beheer' geldt als toegestaan zodra het wachtwoord
// deze sessie al is ingetikt (of je vaste mdw / admin bent).
function magToegang(cat,niveau){
  const r=toegangRegel(cat,niveau);
  if(r==='iedereen') return true;
  if(r==='vast')     return isVasteMdw()||isAdmin();
  if(r==='admin')    return isAdmin();
  if(r==='beheer')   return isVasteMdw()||isAdmin()||isOntgrendeld();
  return true;
}
// Mag ik dit, en zo niet: vraag het wachtwoord of zeg waarom niet.
async function eisToegang(cat,niveau,actie){
  const r=toegangRegel(cat,niveau);
  if(r==='beheer') return await eisBeheer(actie);
  if(magToegang(cat,niveau)) return true;
  bbToon('Daar heb je geen toegang toe.\n\nDit is ingesteld op "'+
    (TOEGANG_KEUZES.find(k=>k.waarde===r)||{}).naam+'". Een admin kan dat wijzigen via Instellingen → Toegangen.');
  return false;
}
// Eenmalig: de twee losse projectinstellingen van vóór deze versie overnemen.
(function migreerProjectRechten(){
  try{
    if(localStorage.getItem(K_TOEGANGEN)) return;
    const maken=localStorage.getItem(K_PROJ_MAKEN), werken=localStorage.getItem(K_PROJ_BEWERKEN);
    if(!maken && !werken) return;
    const t={projecten:{}};
    if(maken)  t.projecten.beheren=maken;
    if(werken) t.projecten.gebruiken=werken;
    localStorage.setItem(K_TOEGANGEN,JSON.stringify(t));
  }catch(e){}
})();

// ---- Keuzelijsten van het besteloverzicht (op dit toestel bewaard) ----
// Ze staan hier in de kern omdat élke pagina de gedeelde instellingen kan
// wegschrijven: die worden in één keer overschreven, dus we moeten de lijsten
// altijd meesturen — ook vanaf een pagina die er zelf niets mee doet.
const DEFAULT_STATUSSEN=['Besteld','Onderweg','In loods','Uitgepakt','Geannuleerd'];
function lsArr(k,def){ try{const r=localStorage.getItem(k); return r?(JSON.parse(r)||def.slice()):def.slice();}catch(e){return def.slice();} }
function lsSave(k,a){ try{localStorage.setItem(k,JSON.stringify(a));}catch(e){} if(!cfgApplying && /^bb_bestel_/.test(k) && window.BBInv && BBInv.saveConfig) pushConfig(); }

// ---- Gedeelde instellingen (appconfig): alles online houden + offline syncen ----
let cfgApplying=false;
function pushConfig(){
  if(!(window.BBInv&&BBInv.saveConfig)) return;
  BBInv.saveConfig({
    mededeling: localStorage.getItem(K_MED)||'',
    drempel: getDrempel(), drempel2: getDrempel2(), drempelBk: getDrempelBoekjes(),
    pin: localStorage.getItem(K_PIN)||DEFAULT_PIN,
    links: getLinks(), bestelmail: localStorage.getItem(K_BESTELMAIL)||'',
    toegangen: getToegangen(),
    // Blijven meesturen voor toestellen die nog een oudere versie draaien.
    projMaken: getProjMaken(), projBewerken: getProjBewerken(),
    bestelCats: lsArr('bb_bestel_cats',[]),
    bestelLevs: lsArr('bb_bestel_levs',[]),
    bestelStats: lsArr('bb_bestel_stats',DEFAULT_STATUSSEN),
    bestelOntvangen: lsArr('bb_bestel_ontvangen',['In loods','Uitgepakt']),
    bestelBjExtra: lsArr('bb_bestel_bj_extra',[])
  });
}
function pullConfig(){
  const c=(window.BBInv&&BBInv.getConfig)?BBInv.getConfig():null;
  if(!c||typeof c!=='object') return false;
  cfgApplying=true;
  try{
    if(c.mededeling!=null) localStorage.setItem(K_MED,c.mededeling);
    if(c.drempel!=null) localStorage.setItem(K_DREMPEL,String(c.drempel));
    if(c.drempel2!=null) localStorage.setItem(K_DREMPEL2,String(c.drempel2));
    if(c.drempelBk!=null) localStorage.setItem(K_DREMPEL_BK,String(c.drempelBk));
    if(c.pin) localStorage.setItem(K_PIN,c.pin);
    if(c.links) localStorage.setItem(K_LINKS,JSON.stringify(c.links));
    if(c.bestelmail!=null) localStorage.setItem(K_BESTELMAIL,c.bestelmail);
    if(c.toegangen && typeof c.toegangen==='object') localStorage.setItem(K_TOEGANGEN,JSON.stringify(c.toegangen));
    if(c.projMaken) localStorage.setItem(K_PROJ_MAKEN,c.projMaken);
    if(c.projBewerken) localStorage.setItem(K_PROJ_BEWERKEN,c.projBewerken);
    if(Array.isArray(c.bestelCats)) lsSave('bb_bestel_cats',c.bestelCats);
    if(Array.isArray(c.bestelLevs)) lsSave('bb_bestel_levs',c.bestelLevs);
    if(Array.isArray(c.bestelStats)) lsSave('bb_bestel_stats',c.bestelStats);
    if(Array.isArray(c.bestelOntvangen)) lsSave('bb_bestel_ontvangen',c.bestelOntvangen);
    if(Array.isArray(c.bestelBjExtra)) lsSave('bb_bestel_bj_extra',c.bestelBjExtra);
  }finally{ cfgApplying=false; }
  // De bestellingen-pagina houdt deze lijsten ook in het geheugen: laten weten.
  if(typeof window.bbConfigToegepast==='function') window.bbConfigToegepast();
  return true;
}
function syncConfig(){
  const c=(window.BBInv&&BBInv.getConfig)?BBInv.getConfig():null;
  if(c&&typeof c==='object'&&Object.keys(c).length){ pullConfig(); }
  else if(window.BBInv&&BBInv.isConfigGedeeld&&BBInv.isConfigGedeeld()&&localStorage.getItem('bb_cfg_seeded')!=='1'){
    localStorage.setItem('bb_cfg_seeded','1'); pushConfig(); // eerste toestel: huidige instellingen delen
  }
}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ---------------- THEMA (donker/licht) ----------------
// Het thema hoort bij de balk bovenaan (daar staat het maantje), dus het staat samen
// met die balk in js/topbar.js — dat bestand laadt óók op de pagina's die deze kern
// niet laden. Hier alleen nog de doorverwijzing, zodat oudere aanroepen blijven werken.
function themaKeuze(){ return window.bbThema ? bbThema.keuze() : 'light'; }
function applyTheme(){ if(window.bbThema) bbThema.zet(); }

function bbFmtTs(ts){const d=new Date(ts);const p=n=>String(n).padStart(2,'0');
  return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());}

// Foto kiezen + verkleinen tot een kleine thumbnail (bespaart opslagruimte)
function pickFoto(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=()=>{const f=inp.files&&inp.files[0]; if(f) fileToThumb(f,cb);};
  inp.click();
}
function fileToThumb(file,cb){
  const r=new FileReader();
  r.onload=()=>{const img=new Image();
    img.onload=()=>{const max=1000;let w=img.width,h=img.height;
      if(w>h){if(w>max){h=Math.round(h*max/w);w=max;}}else{if(h>max){w=Math.round(w*max/h);h=max;}}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      try{cb(c.toDataURL('image/jpeg',0.78));}catch(e){cb(null);}};
    img.onerror=()=>cb(null); img.src=r.result;};
  r.onerror=()=>cb(null); r.readAsDataURL(file);
}
// ---- Foto-bron kiezen (camera of bestand) ----
let fotoCb=null;
function chooseFoto(cb){ fotoCb=cb; document.getElementById('fotoKies').classList.add('open'); }
function pickFile(cb){ const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  inp.onchange=()=>{const f=inp.files&&inp.files[0]; if(f) fileToThumb(f,cb);}; inp.click(); }
document.getElementById('kiesCam').onclick=()=>{document.getElementById('fotoKies').classList.remove('open');openCamera(fotoCb);};
document.getElementById('kiesFile').onclick=()=>{document.getElementById('fotoKies').classList.remove('open');pickFile(fotoCb);};
document.getElementById('kiesAnnuleer').onclick=()=>document.getElementById('fotoKies').classList.remove('open');
// ---- Camera (live foto → JPEG) ----
let camStream=null;
function openCamera(cb){
  const m=document.getElementById('camModal'), v=document.getElementById('camVideo');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){bbToon('Camera niet beschikbaar op dit toestel — kies een foto uit bestanden.');return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}},audio:false}).then(s=>{
    camStream=s; v.srcObject=s; if(v.play)v.play().catch(()=>{}); m.classList.add('open');
    // Beeldbron (echte foto of videoframe) verkleinen en als JPEG bewaren.
    const bewaar=(src,natW,natH)=>{
      let w=natW,h=natH; if(!w||!h){bbToon('Camera nog niet klaar, probeer opnieuw.');bezig=false;return;}
      const max=1000; if(w>h){if(w>max){h=Math.round(h*max/w);w=max;}}else{if(h>max){w=Math.round(w*max/h);h=max;}}
      const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(src,0,0,w,h);
      let url=null; try{url=c.toDataURL('image/jpeg',0.8);}catch(e){}
      closeCamera(); if(url&&cb)cb(url);
    };
    let bezig=false;
    document.getElementById('camShot').onclick=()=>{
      if(bezig) return; bezig=true;
      const track=camStream&&camStream.getVideoTracks&&camStream.getVideoTracks()[0];
      const videoFrame=()=>bewaar(v,v.videoWidth,v.videoHeight);
      // Voorkeur: een ECHTE foto nemen (scherper dan een videoframe: stelt scherp + volle resolutie).
      if(window.ImageCapture && track){
        let ic=null; try{ic=new ImageCapture(track);}catch(e){}
        if(ic){
          ic.takePhoto()
            .then(blob=>createImageBitmap(blob,{imageOrientation:'from-image'}))
            .then(bm=>bewaar(bm,bm.width,bm.height))
            .catch(()=>{ try{ ic.grabFrame().then(bm=>bewaar(bm,bm.width,bm.height)).catch(videoFrame); }catch(e){ videoFrame(); } });
          return;
        }
      }
      videoFrame();
    };
  }).catch(e=>{bbToon('Kan de camera niet openen ('+((e&&e.name)||e)+'). Geef toestemming voor de camera, of kies een foto uit bestanden.');});
}
function closeCamera(){ const m=document.getElementById('camModal'); m.classList.remove('open');
  if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;} const v=document.getElementById('camVideo'); if(v)v.srcObject=null; }
document.getElementById('camCancel').onclick=closeCamera;
// ---- Foto bekijken (vergroot) ----
// Toont foto óf video in het volledige-scherm venster.
function viewMedia(m){
  if(!m||!m.src)return;
  const img=document.getElementById('fotoViewImg'), vid=document.getElementById('fotoViewVid');
  if(m.type==='video'){
    img.style.display='none'; img.removeAttribute('src');
    vid.style.display='block'; vid.src=m.src; if(vid.play)vid.play().catch(()=>{});
  } else {
    if(vid.pause)vid.pause(); vid.style.display='none'; vid.removeAttribute('src');
    img.style.display='block'; img.src=m.src;
  }
  document.getElementById('fotoView').classList.add('open');
}
function viewFoto(url){ viewMedia({type:'foto',src:url}); }
// Video-blob tonen: maak een tijdelijke object-URL en geef die vrij bij het sluiten.
let _fotoViewUrl=null;
function viewMediaVideoBlob(blob){
  if(!blob)return;
  if(_fotoViewUrl){ try{URL.revokeObjectURL(_fotoViewUrl);}catch(_){} }
  _fotoViewUrl=URL.createObjectURL(blob);
  viewMedia({type:'video',src:_fotoViewUrl});
}
function closeFotoView(){
  const vid=document.getElementById('fotoViewVid'); if(vid&&vid.pause){vid.pause();} if(vid)vid.removeAttribute('src');
  if(_fotoViewUrl){ try{URL.revokeObjectURL(_fotoViewUrl);}catch(_){} _fotoViewUrl=null; }
  document.getElementById('fotoView').classList.remove('open');
}
// Alleen sluiten bij klik op de donkere achtergrond, niet op de video-bediening.
document.getElementById('fotoView').onclick=e=>{ if(e.target===document.getElementById('fotoView')) closeFotoView(); };
// Video kiezen (bestand). Het bestand zelf (blob) wordt bewaard in IndexedDB, dus
// ook grote gsm-video's passen. We geven het File-object terug.
function pickVideo(cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='video/*';
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; cb(f||null); };
  inp.click();
}

// ---- Import / Export ----
function csvCell(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
function rowsToCSV(rows){return rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
function rowsToTSV(rows){return rows.map(r=>r.map(v=>String(v==null?'':v).replace(/\t/g,' ').replace(/\r?\n/g,' ')).join('\t')).join('\n');}
function dl(name,text){const blob=new Blob(['﻿'+text],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),1500);}
function copyText(t){const done=()=>bbToon('Gekopieerd! Plak het in Google Sheets of Excel (Ctrl+V).');
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fb());}else fb();
  function fb(){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){bbToon('Kopiëren niet gelukt.');}document.body.removeChild(ta);}}

// Sync-indicator: toont hoeveel wijzigingen nog op internet wachten
function updateSyncBadge(){
  const el=document.getElementById('syncBadge'); if(!el)return;
  const n=(window.BBInv&&BBInv.pendingCount)?BBInv.pendingCount():0;
  if(n>0){ el.style.display=''; el.innerHTML='⏳ '+n+'<span class="lbl"> wacht op internet</span>'; }
  else { el.style.display='none'; }
}

// ---------------- INLOGGEN (namenlijst + persoonlijke pincode) ----------------
// De namenlijst is gedeeld (Supabase, tabel 'gebruikers'); de pincode wordt gehasht
// bewaard. Dit is een LICHTE beveiliging (de database staat open) — bedoeld om
// vreemden buiten te houden en te zien wie wat deed, geen bankkluis.
const K_USER='bb_current_user';      // {id,naam} van wie op dit toestel is ingelogd
const K_REMEMBER='bb_remember_user'; // '1' = eigen gsm → ingelogd blijven
const K_REMEMBER_ENT='bb_remember_ent'; // per toestel: "ENT algemeen" ingelogd houden
// Sinds elke kaart een eigen pagina is, laadt de app bij élke tik opnieuw. Zonder
// dit merkteken zou je dan telkens opnieuw je pincode moeten intikken. Het staat in
// sessionStorage: het blijft binnen dit tabblad, maar is weg zodra je de app sluit —
// precies zoals vroeger, toen alles één pagina was.
const K_SESSIE='bb_sessie_actief';

function currentUser(){ try{return JSON.parse(localStorage.getItem(K_USER)||'null');}catch(e){return null;} }
function currentUserName(){ const u=currentUser(); return u&&u.naam?u.naam:''; }
function setCurrentUser(u,remember){
  if(u) localStorage.setItem(K_USER,JSON.stringify({id:u.id,naam:u.naam}));
  else localStorage.removeItem(K_USER);
  if(remember) localStorage.setItem(K_REMEMBER,'1'); else localStorage.removeItem(K_REMEMBER);
  try{ if(u) sessionStorage.setItem(K_SESSIE,'1'); else sessionStorage.removeItem(K_SESSIE); }catch(e){}
  resetBeheerLocks(); // andere gebruiker → beheer-toegang opnieuw verdienen
  updateUserBtn();
}
function initials(naam){ const p=String(naam||'').trim().split(/\s+/); return (((p[0]||'')[0]||'?')+((p[1]||'')[0]||'')).toUpperCase(); }
// De volledige gebruiker (incl. foto) uit de gedeelde lijst; localStorage bewaart enkel id+naam.
// Eerst op id zoeken; lukt dat niet (bv. omdat het account opnieuw is aangemaakt en een
// nieuw id kreeg), dan op naam. Zonder die terugval verlies je stilletjes je rol.
function fullCurrentUser(){
  const u=currentUser(); if(!u) return null;
  const list=(window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[];
  const opId=list.find(x=>x.id===u.id);
  if(opId) return opId;
  const naam=String(u.naam||'').trim().toLowerCase();
  return (naam?list.find(x=>String(x.naam||'').trim().toLowerCase()===naam):null)||u;
}
// Avatar-inhoud: een foto als die er is, anders de initialen.
function avatarInner(u){ return (u&&u.foto)?('<img src="'+u.foto+'" alt="">'):esc(initials(u?u.naam:'')); }
// 'rol' is een lijstje etiketten ('vast', 'admin', of beide) — zie BBInv.heeftRol.
function heeftRol(tag){ const u=fullCurrentUser(); return !!(window.BBInv&&BBInv.heeftRol&&BBInv.heeftRol(u,tag)); }
// Vaste medewerker = heeft standaard toegang tot alle beheer (geen wachtwoord nodig).
function isVasteMdw(){ return heeftRol('vast'); }
// Admin = mag het Systeem-scherm en de Activiteit bekijken.
function isAdmin(){ return heeftRol('admin'); }
// Toegang tot een beheerdeel: waar voor een vaste mdw of admin, anders het wachtwoord
// vragen. Admins horen er ook zonder wachtwoord in — ze beheren toch de Toegangen zelf,
// dus hen dat laten typen is schijnbeveiliging. Dit sluit ook aan bij magToegang().
// LET OP: sinds het codevenster (zie bbVraagCode in js/topbar.js) is dit ASYNCHROON.
// Elke aanroep hoort dus 'await' te krijgen — zonder await krijg je een belofte terug,
// en die is altijd waar, waardoor de vraag om het wachtwoord stilletjes overgeslagen zou
// worden. Dat geldt ook voor eisBeheer() en eisToegang() hieronder.
async function magBeheren(actie){
  if(isVasteMdw()||isAdmin()) return true;
  const p=await bbVraagCode({titel:'Wachtwoord', uitleg:actie?('Nodig '+actie+'.'):'',
    plaatshouder:'Wachtwoord', controle:v=>v===getPin()?'':'Onjuist wachtwoord.'});
  return p!==null;
}
// Beheer-toegang geldt voor dit tabblad, niet per pagina: anders zou je het
// wachtwoord opnieuw moeten intikken telkens je van pagina wisselt.
function isOntgrendeld(){ try{ return sessionStorage.getItem('bb_beheer_open')==='1'; }catch(e){ return false; } }
function zetOntgrendeld(){ try{ sessionStorage.setItem('bb_beheer_open','1'); }catch(e){} }
// Bij het wisselen/uitloggen de 'ontgrendeld'-vlag wissen, zodat de volgende
// persoon niet de beheer-toegang van de vorige erft.
function resetBeheerLocks(){
  try{ sessionStorage.removeItem('bb_beheer_open'); }catch(e){}
  try{ sessionStorage.removeItem(K_NOOD_SYSTEEM); }catch(e){}
}
// Noodingang naar Systeem: met het beheer-wachtwoord kan je het diagnosescherm openen,
// ook zonder de rol Admin. Dat moet kunnen — als er iets stuk is, is Systeem net het
// scherm waar je moet zijn, en dan is "vraag het aan een admin" geen antwoord.
// Bewust apart en enkel voor Systeem: het beheer-wachtwoord mag niet zomaar élke
// admin-pagina openzetten.
const K_NOOD_SYSTEEM='bb_nood_systeem';
function zetNoodSysteem(){ try{ sessionStorage.setItem(K_NOOD_SYSTEEM,'1'); }catch(e){} }
function heeftNoodSysteem(){ try{ return sessionStorage.getItem(K_NOOD_SYSTEEM)==='1'; }catch(e){ return false; } }
// Beheer-toegang vragen en onthouden (gebruikt door de tabbladen 🔒 Beheer).
async function eisBeheer(actie){
  if(isOntgrendeld()) return true;
  if(isVasteMdw()||isAdmin()){ zetOntgrendeld(); return true; }
  const p=await bbVraagCode({titel:'Wachtwoord beheer', uitleg:actie?('Nodig om '+actie+'.'):'',
    plaatshouder:'Wachtwoord', controle:v=>v===getPin()?'':'Onjuist wachtwoord.'});
  if(p===null) return false;
  zetOntgrendeld();
  return true;
}
function updateUserBtn(){
  const u=fullCurrentUser(), btn=document.getElementById('userBtn'); if(!btn) return;
  if(window.BBInv&&BBInv.setActor) BBInv.setActor(u?u.naam:''); // wie de activiteit veroorzaakt
  document.getElementById('userAv').innerHTML=u?avatarInner(u):'👤';
  document.getElementById('userNm').textContent=u?u.naam:'Inloggen';
  btn.title=u?('Ingelogd als '+u.naam+' · tik voor je profiel of om te wisselen'):'Inloggen';
  btn.style.display='flex';
}

// pincode hashen (SHA-256; valt terug op onversleuteld als crypto niet beschikbaar is)
async function sha256(str){
  try{
    const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bb:'+str));
    return 'h:'+Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){ return 'p:'+str; }
}
async function pinMatch(stored,entered){
  if(!stored) return false;
  if(stored.slice(0,2)==='p:') return stored.slice(2)===entered;
  return (await sha256(entered))===stored;
}

function showLogin(){ document.getElementById('loginOverlay').classList.add('show'); toNames(); }
function hideLogin(){ document.getElementById('loginOverlay').classList.remove('show'); }

let loginSel=null, pinBuf='', pinBusy=false;

// ---------------- EERSTE KEER INLOGGEN: ZELF EEN CODE KIEZEN ----------------
// Iedereen krijgt de standaardcode 0000. Wie daarmee binnenkomt, moet eerst een eigen code
// kiezen voor hij in de app is.
//
// Er is BEWUST geen extra kolom in de database om bij te houden of iemand dat al gedaan
// heeft. "Nog met 0000 binnenkomen" ís die vlag: zodra je een eigen code kiest, is 0000
// niet meer je code en wordt de vraag nooit meer gesteld. Eén keer dus, vanzelf, zonder dat
// er iets kan scheeflopen tussen toestellen.
//
// Mooi neveneffect: reset een admin later iemands code naar 0000, dan krijgt die persoon
// bij de volgende keer inloggen weer de vraag om een eigen code. Precies wat je wil.
const STANDAARD_PIN='0000';
// Deze mensen houden hun eigen code en krijgen de vraag niet. Op naam, kleine letters.
// Staat hun code toevallig al niet meer op 0000, dan doet deze lijst sowieso niets.
const GEEN_CODEVRAAG=['matthew','laura'];
function moetEigenCodeKiezen(u,getypteCode){
  if(!u || getypteCode!==STANDAARD_PIN) return false;
  if(u.id==='entalg') return false;   // gedeeld account: iedereen gebruikt het, geen eigen code
  // ALLEEN vragen als de gedeelde namenlijst écht uit de database komt.
  //
  // Waarom dit moet: staat de tablet zonder wifi, of is hij nog niet aangemeld, dan draait
  // de app op de lokale momentopname. Een pincode die je dán kiest, blijft op dat ene
  // toestel staan — en zodra de lijst later wél binnenkomt, overschrijft die je keuze met
  // de oude 0000. Je zou dus "✓ Code bewaard" zien voor een code die morgen niet werkt,
  // terwijl je op de andere tablets nog steeds op 0000 staat.
  // Beter dan een halve belofte: laat de collega gewoon binnen met 0000 en stel de vraag
  // de volgende keer, wanneer er wél verbinding is.
  if(!(window.BBInv && BBInv.isReady && BBInv.isReady())) return false;
  if(!(BBInv.isGebruikersGedeeld && BBInv.isGebruikersGedeeld())) return false;
  return GEEN_CODEVRAAG.indexOf(String(u.naam||'').trim().toLowerCase())<0;
}
// null = gewoon inloggen · 'nieuw' = eerste keer typen · 'herhaal' = ter bevestiging
let kiesFase=null, kiesEerste='';
// Toon precies één paneel binnen het inlogscherm (namen / pincode / beheer).
function loginPanel(which){
  document.getElementById('loginNames').style.display = which==='names'?'':'none';
  document.getElementById('loginPin').style.display   = which==='pin'?'':'none';
  document.getElementById('loginBeheerPanel').style.display = which==='beheer'?'':'none';
}
// Ook de code-keuze afbreken: wie hier weggaat is NIET ingelogd en moet opnieuw beginnen.
// Zo kan je de vraag niet omzeilen door op ↩ te tikken.
function toNames(){ loginSel=null; pinBuf=''; kiesFase=null; kiesEerste=''; loginPanel('names'); renderLoginNames(); }
function toBeheer(){ loginPanel('beheer'); document.getElementById('loginSub').textContent='Namen beheren'; renderGebrList(); }
function openBeheerPanel(){ document.getElementById('loginOverlay').classList.add('show'); toBeheer(); }
function beheerKlaar(){ if(currentUser()) hideLogin(); else toNames(); }
// Inloggen zonder pincode (bv. het gedeelde account "ENT algemeen").
function loginDirect(u){
  // ENT algemeen mag op dit toestel ingelogd blijven als dat zo is ingesteld (Instellingen).
  const rem=(u&&u.id==='entalg')&&localStorage.getItem(K_REMEMBER_ENT)==='1';
  setCurrentUser(u,rem); hideLogin(); toNames(); naLogin();
}
// Na het inloggen: de pagina waar je op staat gewoon opnieuw laten tekenen.
function naLogin(){ if(typeof window.bbNaLogin==='function') window.bbNaLogin(); refreshAuth(); }
function renderLoginNames(){
  const grid=document.getElementById('nameGrid'); if(!grid) return;
  const users=(window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[];
  const sub=document.getElementById('loginSub');
  const cancel=document.getElementById('loginCancel');
  if(cancel) cancel.style.display = currentUser()?'':'none';
  if(!users.length){
    if(window.BBInv&&BBInv.isReady&&!BBInv.isReady()){ grid.innerHTML='<div class="login-empty">Even laden…</div>'; sub.textContent='Momentje'; return; }
    grid.innerHTML='<div class="login-empty">Nog geen gebruikers ingesteld.<br>Tik op <b>⚙ Namen beheren</b> om de eerste collega toe te voegen.</div>';
    sub.textContent='Nog niemand ingesteld'; return;
  }
  sub.textContent='Tik op je naam om in te loggen';
  grid.innerHTML='';
  const maakTegel=u=>{
    const b=document.createElement('button'); b.className='name-tile';
    let sub='';
    if(!u.pin) sub='<span class="nopin">geen code</span>';
    else {
      const r=[];
      if(BBInv.heeftRol(u,'admin')) r.push('Admin');
      if(BBInv.heeftRol(u,'vast')) r.push('Vaste mdw');
      if(r.length) sub='<span class="nopin vast">'+r.join(' · ')+'</span>';
    }
    b.innerHTML='<span class="av">'+avatarInner(u)+'</span><span>'+esc(u.naam)+sub+'</span>';
    b.onclick=()=> u.pin ? toPin(u) : loginDirect(u);   // pinloos account = meteen binnen
    return b;
  };
  const groep=arr=>{ const g=document.createElement('div'); g.className='name-grid'; arr.forEach(u=>g.appendChild(maakTegel(u))); return g; };
  const algemeen=users.filter(u=>u.id==='entalg');   // vast gedeeld account bovenaan
  const rest=users.filter(u=>u.id!=='entalg');
  if(algemeen.length){
    grid.appendChild(groep(algemeen));
    if(rest.length){ const sep=document.createElement('div'); sep.className='name-sep'; grid.appendChild(sep); }
  }
  if(rest.length) grid.appendChild(groep(rest));
}
function toPin(u){
  loginSel=u; pinBuf=''; kiesFase=null; kiesEerste='';   // altijd schoon beginnen
  document.getElementById('pinWho').textContent='Hallo '+u.naam;
  const msg=document.getElementById('pinMsg'); msg.textContent=''; msg.className='pin-msg';
  document.getElementById('pinRemember').checked = localStorage.getItem(K_REMEMBER)==='1';
  loginPanel('pin');
  renderPinDots();
}
function renderPinDots(){ document.querySelectorAll('#loginPin .pin-dots i').forEach((el,i)=>el.classList.toggle('on', i<pinBuf.length)); }
async function tryPin(){
  if(!loginSel||pinBusy) return;
  // Zitten we in de code-keuze, dan is wat je typt geen controle maar een nieuwe code.
  if(kiesFase){ verwerkCodeKeuze(); return; }
  pinBusy=true;
  const ok=await pinMatch(loginSel.pin, pinBuf); pinBusy=false;
  const msg=document.getElementById('pinMsg');
  if(ok){
    // Juiste code, maar het is nog de standaardcode: eerst een eigen code kiezen.
    if(moetEigenCodeKiezen(loginSel,pinBuf)){ startCodeKeuze(); return; }
    msg.className='pin-msg ok'; msg.textContent='✓ Welkom!';
    setCurrentUser(loginSel, document.getElementById('pinRemember').checked);
    setTimeout(()=>{ hideLogin(); toNames(); naLogin(); }, 250);
  }else{
    msg.className='pin-msg'; msg.textContent='Onjuiste pincode, probeer opnieuw.';
    pinBuf=''; renderPinDots();
  }
}
// Het pincodescherm wordt hergebruikt: zelfde klavier, zelfde bolletjes, andere vraag.
// De NAAM blijft bewust staan. Op een gedeelde tablet met twaalf tegels naast elkaar tik
// je zo de verkeerde aan; verdween de naam hier, dan stelde je ongemerkt de code van een
// collega in en werkte je de rest van je shift onder diens naam.
function startCodeKeuze(){
  kiesFase='nieuw'; kiesEerste=''; pinBuf=''; renderPinDots();
  document.getElementById('pinWho').textContent=loginSel.naam+' — kies je eigen pincode';
  zetPinUitleg('Je logt in met de standaardcode '+STANDAARD_PIN+'. Kies nu één keer 4 cijfers '+
    'die alleen jij kent — daarna log je altijd met die code in.');
}
// Uitleg is GEEN foutmelding. Zonder eigen stijl kreeg je dit in hetzelfde rood als
// "Onjuiste pincode", en dan denk je dat je je vergist hebt en blijf je opnieuw proberen.
function zetPinUitleg(tekst){
  const msg=document.getElementById('pinMsg');
  msg.className='pin-msg uitleg'; msg.textContent=tekst;
}
function zetPinFout(tekst){
  const msg=document.getElementById('pinMsg');
  msg.className='pin-msg'; msg.textContent=tekst;
}
async function verwerkCodeKeuze(){
  const code=pinBuf; pinBuf=''; renderPinDots();

  if(kiesFase==='nieuw'){
    // De standaardcode opnieuw kiezen mag niet — dan sta je hier morgen weer.
    if(code===STANDAARD_PIN){ zetPinFout('Kies een andere code dan '+STANDAARD_PIN+'.'); return; }
    kiesEerste=code; kiesFase='herhaal';
    zetPinUitleg(loginSel.naam+' — typ je nieuwe code nog een keer.');
    return;
  }

  if(code!==kiesEerste){
    kiesFase='nieuw'; kiesEerste='';
    zetPinFout('De twee codes waren niet gelijk. Begin opnieuw.');
    return;
  }

  // Pas hier wordt er iets bewaard — en pas daarna ben je ingelogd.
  pinBusy=true;
  try{
    // Wie de wijziging veroorzaakt, staat nog op de vórige gebruiker (de collega die de
    // tablet doorgaf). Zonder dit komt er "Laura — Gebruiker Jan — eigen pincode ingesteld"
    // in het activiteitenlogboek te staan.
    if(window.BBInv&&BBInv.setActor) BBInv.setActor(loginSel.naam);
    BBInv.updateGebruiker(loginSel.id,{pin: await sha256(code)},'eigen pincode ingesteld (eerste keer inloggen)');
  }catch(e){
    pinBusy=false; kiesFase='nieuw'; kiesEerste='';
    zetPinFout('Bewaren lukte niet. Probeer het opnieuw.');
    return;
  }
  pinBusy=false;
  kiesFase=null; kiesEerste='';
  const msg=document.getElementById('pinMsg');
  msg.className='pin-msg ok'; msg.textContent='✓ Code bewaard. Welkom!';
  setCurrentUser(loginSel, document.getElementById('pinRemember').checked);
  setTimeout(()=>{ hideLogin(); toNames(); naLogin(); }, 600);
}
function pinKey(k){
  if(k==='cancel'){ toNames(); return; }
  if(k==='back'){ pinBuf=pinBuf.slice(0,-1); renderPinDots(); return; }
  if(/^[0-9]$/.test(k) && pinBuf.length<4){ pinBuf+=k; renderPinDots(); if(pinBuf.length===4) tryPin(); }
}
document.getElementById('keypad').addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) pinKey(b.getAttribute('data-k')); });
// fysiek toetsenbord (sommige tablets): cijfers, backspace, escape
document.addEventListener('keydown',e=>{
  if(!document.getElementById('loginOverlay').classList.contains('show')) return;
  if(document.getElementById('loginPin').style.display==='none') return;
  if(/^[0-9]$/.test(e.key)) pinKey(e.key);
  else if(e.key==='Backspace') pinKey('back');
  else if(e.key==='Escape') pinKey('cancel');
});
document.getElementById('userBtn').onclick=()=>{ if(currentUser()) openProfiel(); else showLogin(); };
document.getElementById('loginCancel').onclick=()=>{ if(currentUser()) hideLogin(); };
document.getElementById('loginBeheer').onclick=async()=>{
  const p=await bbVraagCode({titel:'Beheerderswachtwoord',
    uitleg:'Nodig om de namen en pincodes te beheren.', plaatshouder:'Wachtwoord',
    controle:v=>v===getPin()?'':'Onjuist wachtwoord.'});
  if(p===null) return;
  toBeheer();  // beheer binnen het inlogscherm → app blijft vergrendeld
};
document.getElementById('beheerKlaar').onclick=beheerKlaar;

// ---- Gebruikersbeheer (achter het beheer-wachtwoord) ----
async function openGebruikers(){
  if(!await magBeheren()) return;
  openBeheerPanel();
}
// ROL ADMIN UITDELEN — enkel door een admin.
// Zonder deze grens kon een vaste medewerker zichzelf in twee tikken tot admin maken en
// daarna via 🔑 Toegangen alles openzetten. Er zijn drie wegen die hetzelfde opleveren en
// die dus alle drie dicht moeten:
//   1. de knop Admin aanzetten bij jezelf
//   2. de pincode van een admin resetten en als die persoon inloggen
//   3. alle admins verwijderen, waarna de noodregel hieronder weer opengaat
//
// NOODREGEL: zolang er nog GEEN enkele admin is, mag wie in de namenlijst kan de eerste
// aanduiden. Anders is die rol na een verse installatie nooit meer toe te kennen.
function erIsEenAdmin(){
  const users=(window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[];
  return users.some(u=>BBInv.heeftRol(u,'admin'));
}
function magAdminUitdelen(){ return isAdmin() || !erIsEenAdmin(); }
// Iets doen mét een bestaande admin (rol afnemen, code resetten, verwijderen) mag enkel
// door een admin — anders is het een omweg naar punt 3 hierboven.
function magAanAdminRaken(u){ return isAdmin() || !BBInv.heeftRol(u,'admin'); }
function meldGeenAdmin(){
  bbToon('Alleen een admin kan de rol Admin toekennen of afnemen.\n\n'+
    'Dat is met opzet: wie dat zou kunnen, kan zichzelf admin maken en daarna via '+
    'Instellingen → Toegangen alles openzetten.');
}
function renderGebrList(){
  const box=document.getElementById('gebrlist'); if(!box) return;
  const users=(window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[]; box.innerHTML='';
  if(!users.length){ box.innerHTML='<div class="login-empty">Nog geen collega\'s. Voeg er hierboven een toe.</div>'; return; }
  users.forEach(u=>{
    const row=document.createElement('div'); row.className='gebr-row';
    const locked = u.id==='entalg';   // vast gedeeld account: niet verwijderen/wijzigen
    const vast = BBInv.heeftRol(u,'vast');
    const admin = BBInv.heeftRol(u,'admin');
    row.innerHTML='<span class="av">'+avatarInner(u)+'</span>'+
      '<span class="nm">'+esc(u.naam)+'</span>'+
      (locked
        ? '<span class="rol">🔒 vast account · geen code</span>'
        : '<button class="vast'+(vast?' on':'')+'" title="Standaard toegang tot alle beheer (geen wachtwoord nodig)">'+(vast?'✓ Vaste mdw':'Vaste mdw')+'</button>'+
          '<button class="admin'+(admin?' on':'')+(magAdminUitdelen()?'':' uit')+'" title="'+
            (magAdminUitdelen()?'Mag Systeem en Activiteit bekijken en de Toegangen beheren'
                               :'Alleen een admin kan deze rol toekennen of afnemen')+'">'+
            (admin?'✓ Admin':'Admin')+'</button>'+
          '<button class="foto">📷 Foto</button><button class="rst">Reset code</button><button class="del">Verwijderen</button>');
    if(!locked){
      row.querySelector('.vast').onclick=()=>{ BBInv.updateGebruiker(u.id,{rol: BBInv.zetRol(u,'vast',!vast)}); renderGebrList(); refreshAuth(); };
      row.querySelector('.admin').onclick=()=>{
        // Opnieuw nakijken bij de klik: de lijst kan intussen veranderd zijn, en een
        // uitgeschakelde knop is geen beveiliging.
        if(!magAdminUitdelen()){ meldGeenAdmin(); return; }
        BBInv.updateGebruiker(u.id,{rol: BBInv.zetRol(u,'admin',!admin)}); renderGebrList(); refreshAuth();
      };
      row.querySelector('.foto').onclick=()=>chooseProfilePhoto(url=>{ if(url){ BBInv.updateGebruiker(u.id,{foto:url}); updateUserBtn(); renderGebrList(); } });
      row.querySelector('.rst').onclick=async()=>{
        // De code van een admin resetten = als die admin kunnen inloggen. Dus enkel een
        // admin mag dat; anders is het een omweg naar de rol.
        if(!magAanAdminRaken(u)){
          bbToon('Alleen een admin kan de pincode van een andere admin resetten.\n\n'+
                'Anders zou je met die code als admin kunnen inloggen.');
          return;
        }
        const np=await bbVraagCode({titel:'Nieuwe pincode voor '+u.naam,
          uitleg:'Precies 4 cijfers. Zet ze op 0000, dan kiest '+u.naam+' bij de volgende keer inloggen zelf een eigen code.',
          plaatshouder:'0000', maxlengte:4,
          controle:v=>/^\d{4}$/.test((v||'').trim())?'':'De pincode moet precies 4 cijfers zijn.'});
        if(np===null) return;
        BBInv.updateGebruiker(u.id,{pin: await sha256(np.trim())},'pincode gereset door een beheerder');
        bbToon(np.trim()===STANDAARD_PIN
          ? 'Code op 0000 gezet. '+u.naam+' kiest bij de volgende keer inloggen een eigen code.'
          : 'Pincode aangepast.');
      };
      row.querySelector('.del').onclick=async()=>{
        // Alle admins verwijderen zou de noodregel weer openzetten, en dan kan wie in
        // deze lijst kan zichzelf alsnog tot admin maken.
        if(!magAanAdminRaken(u)){
          bbToon('Alleen een admin kan een andere admin verwijderen.');
          return;
        }
        if(!await bbBevestig({titel:'Collega verwijderen?', okTekst:'Ja, verwijderen', gevaar:true,
          tekst:u.naam+' kan daarna niet meer inloggen.'})) return;
        BBInv.removeGebruiker(u.id);
        const cu=currentUser(); if(cu&&cu.id===u.id) setCurrentUser(null,false);
        renderGebrList();
      };
    }
    box.appendChild(row);
  });
}
{ const og=document.getElementById('openGebruikers'); if(og) og.onclick=openGebruikers; } // enkel op Instellingen
document.getElementById('gebrAdd').onclick=async()=>{
  const naam=document.getElementById('gebrNaam').value.trim();
  const pin=document.getElementById('gebrPin').value.trim();
  if(!naam){ bbToon('Vul een naam in.'); return; }
  if(!/^\d{4}$/.test(pin)){ bbToon('De pincode moet precies 4 cijfers zijn.'); return; }
  if(BBInv.getGebruikers().some(u=>(u.naam||'').toLowerCase()===naam.toLowerCase())
     && !await bbBevestig({titel:'Naam bestaat al', okTekst:'Toch toevoegen',
          tekst:'Er staat al iemand met de naam "'+naam+'" in de lijst.'})) return;
  BBInv.addGebruiker({naam, pin: await sha256(pin)});
  // Het codeveld terug op de standaardcode, niet leeg: de volgende collega hoort er ook
  // met 0000 bij te komen, zodat hij zelf een eigen code kiest.
  document.getElementById('gebrNaam').value=''; document.getElementById('gebrPin').value=STANDAARD_PIN;
  renderGebrList();
};

// ---- Profielfoto: verklein tot een klein vierkant (gecentreerd bijgesneden) ----
function fileToSquare(file,cb){
  if(!file){ cb(null); return; }
  const r=new FileReader();
  r.onload=()=>{ const img=new Image();
    img.onload=()=>{ const S=180, c=document.createElement('canvas'); c.width=S; c.height=S;
      const ctx=c.getContext('2d'), scale=Math.max(S/img.width,S/img.height), w=img.width*scale, h=img.height*scale;
      ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h);
      try{ cb(c.toDataURL('image/jpeg',0.72)); }catch(e){ cb(null); }
    };
    img.onerror=()=>cb(null); img.src=r.result;
  };
  r.onerror=()=>cb(null); r.readAsDataURL(file);
}
// Een fotobestand kiezen: capture=true opent (op gsm/tablet) meteen de camera.
function photoInput(capture,cb){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
  if(capture) inp.setAttribute('capture','user'); // voorkant-camera (selfie) waar mogelijk
  inp.onchange=()=>fileToSquare(inp.files&&inp.files[0],cb);
  inp.click();
}
// Keuzevenster: camera of galerij.
let bronCb=null;
function chooseProfilePhoto(cb){ bronCb=cb; document.getElementById('fotoBronModal').classList.add('open'); }
function closeBron(){ document.getElementById('fotoBronModal').classList.remove('open'); }
document.getElementById('bronCamera').onclick=()=>{ closeBron(); photoInput(true, url=>{ if(bronCb) bronCb(url); }); };
document.getElementById('bronGalerij').onclick=()=>{ closeBron(); photoInput(false, url=>{ if(bronCb) bronCb(url); }); };
document.getElementById('bronAnnuleer').onclick=closeBron;
document.getElementById('fotoBronModal').addEventListener('click',e=>{ if(e.target.id==='fotoBronModal') closeBron(); });

// ---- Mijn profiel (zelf een foto kiezen, of wisselen van gebruiker) ----
function renderProfiel(){
  const u=fullCurrentUser(); if(!u) return;
  document.getElementById('profAvatar').innerHTML=avatarInner(u);
  document.getElementById('profNaam').textContent=u.naam;
  document.getElementById('profFotoDel').style.display=u.foto?'':'none';
}
function openProfiel(){ if(!currentUser()) return; renderProfiel(); document.getElementById('profielModal').classList.add('open'); }
function closeProfiel(){ document.getElementById('profielModal').classList.remove('open'); }
document.getElementById('profFoto').onclick=async()=>{
  const u=fullCurrentUser(); if(!u) return;
  if(u.pin){ // eerst de eigen pincode bevestigen (pinloze accounts overslaan)
    const entered=await bbVraagCode({titel:'Je pincode', uitleg:'Even bevestigen dat jij het bent.',
      plaatshouder:'••••', maxlengte:4,
      controle:async v=>(await pinMatch(u.pin,(v||'').trim()))?'':'Onjuiste pincode.'});
    if(entered===null) return;
  }
  chooseProfilePhoto(url=>{ if(!url) return; BBInv.updateGebruiker(u.id,{foto:url}); renderProfiel(); updateUserBtn(); });
};
document.getElementById('profFotoDel').onclick=()=>{
  const u=currentUser(); if(!u) return;
  BBInv.updateGebruiker(u.id,{foto:''}); renderProfiel(); updateUserBtn();
};
document.getElementById('profWissel').onclick=()=>{ closeProfiel(); showLogin(); };
document.getElementById('profUitloggen').onclick=()=>{ closeProfiel(); setCurrentUser(null,false); showLogin(); };
document.getElementById('profSluit').onclick=closeProfiel;
document.getElementById('profielModal').addEventListener('click',e=>{ if(e.target.id==='profielModal') closeProfiel(); });

// ---- Inlog-status bij het opstarten en na het laden van de gedeelde lijst ----
function bootAuth(){
  // Ingelogd blijven: ofwel "onthoud mij" (eigen gsm), ofwel binnen dezelfde
  // app-sessie — dat laatste is nodig omdat elke pagina apart geladen wordt.
  let sessie=false; try{ sessie=sessionStorage.getItem(K_SESSIE)==='1'; }catch(e){}
  const remembered=localStorage.getItem(K_REMEMBER)==='1', u=currentUser();
  if((remembered||sessie) && u){ updateUserBtn(); hideLogin(); }
  else { setCurrentUser(null,false); showLogin(); } // verse start: altijd opnieuw inloggen (geen hervatten zonder pincode)
}
// Sommige pagina's zijn enkel voor bepaalde rollen (Systeem = admin, Activiteit =
// admin of vaste mdw). Wie er via de webadresbalk toch op belandt, sturen we terug.
// refreshAuth() roept dit bij élke wijziging opnieuw aan. Sinds het wachtwoord in een
// eigen venster gevraagd wordt, duurt deze controle even — zonder deze vlag stapelden de
// vensters zich op terwijl je nog aan het typen was.
let bewaakBezig=false;
async function bewaakPagina(){
  if(bewaakBezig) return;
  bewaakBezig=true;
  try{ await bewaakPaginaDoe(); } finally{ bewaakBezig=false; }
}
async function bewaakPaginaDoe(){
  // data-toegang = de categorie uit Instellingen → Toegangen. data-rol is de oude manier
  // en blijft werken voor pagina's die nog niet omgezet zijn.
  const cat=document.body.getAttribute('data-toegang');
  const nodig=document.body.getAttribute('data-rol');
  if(!cat && !nodig) return;
  if(!currentUser()) return;                                   // nog niet ingelogd: eerst het inlogscherm
  if(!(window.BBInv&&BBInv.isReady&&BBInv.isReady())) return;   // rollen nog niet geladen
  if(cat){
    if(magToegang(cat,'bekijken')) return;
    if(cat==='systeem' && heeftNoodSysteem()) return;   // via de noodingang binnengekomen
    const r=toegangRegel(cat,'bekijken');
    if(r==='beheer' && await eisBeheer('deze pagina te openen')) return;
    bbToon('Je hebt geen toegang tot deze pagina.\n\nEen admin kan dat wijzigen via Instellingen → Toegangen.');
  }else{
    if(nodig==='admin' ? isAdmin() : (isAdmin()||isVasteMdw())) return;
    bbToon('Deze pagina is enkel voor '+(nodig==='admin'?'beheerders (admin)':'admins en vaste medewerkers')+'.');
  }
  location.replace(bbUrl('entertainment.html'));
}
function refreshAuth(){
  updateUserBtn(); // avatar/foto in de balk bijwerken zodra de gedeelde lijst (met foto's) laadt
  if(typeof window.bbRolGewijzigd==='function') window.bbRolGewijzigd(); // de pagina past zich aan de rol aan
  if(document.getElementById('loginOverlay').classList.contains('show') && document.getElementById('loginNames').style.display!=='none') renderLoginNames();
  if(document.getElementById('loginBeheerPanel').style.display!=='none') renderGebrList();
  // Hervalideer: staat de ingelogde persoon nog in de gedeelde lijst? Pas nadat de verse
  // lijst geladen is — de lokale kopie die we meteen bij het opstarten tonen kan verouderd
  // zijn, en dan zou een collega die net is toegevoegd er onterecht uit vliegen.
  if(!(window.BBInv&&BBInv.isReady&&BBInv.isReady())) return;
  const u=currentUser(), users=(window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[];
  if(u && users.length && !users.some(x=>x.id===u.id)){ setCurrentUser(null,false); showLogin(); return; }
  controleerStandaardcode(u,users);
  bewaakPagina();
}
// Wie ingelogd BLIJFT — 'Onthoud mij op dit toestel', of een tablet die de hele dag
// openstaat — komt nooit langs het inlogscherm en zou de codekeuze dus voor altijd
// ontlopen. Zijn account blijft dan op 0000 staan, en iedereen die weet dat dat de
// standaardcode is, kan als hem inloggen en onder zijn naam werken.
// Daarom hier ook controleren. We loggen hem uit en tonen het inlogscherm: dan loopt hij
// door precies dezelfde weg als iedereen (0000 typen → code kiezen), en is er geen tweede
// route die apart stuk kan gaan.
let codeCheckBezig=false;
async function controleerStandaardcode(u,users){
  if(codeCheckBezig || !u) return;
  if(document.getElementById('loginOverlay').classList.contains('show')) return; // al aan het inloggen
  const rec=(users||[]).find(x=>x.id===u.id);
  if(!rec || !rec.pin) return;
  if(!moetEigenCodeKiezen(rec,STANDAARD_PIN)) return;   // uitgezonderd, of lijst niet gedeeld
  codeCheckBezig=true;
  let nogStandaard=false;
  try{ nogStandaard=await pinMatch(rec.pin,STANDAARD_PIN); }catch(e){}
  codeCheckBezig=false;
  if(!nogStandaard) return;
  setCurrentUser(null,false);
  showLogin();
  toPin(rec);
  zetPinUitleg(rec.naam+' — je account staat nog op de standaardcode '+STANDAARD_PIN+'. '+
    'Log even in, dan kies je meteen een eigen code.');
}

// ---------------- OFFLINE-STATUS + VERSIE ----------------
function updateSys(){
  const stat=document.getElementById('sysStat'), txt=document.getElementById('sysStatTxt');
  if(!stat||!txt) return;
  if(!navigator.onLine){ stat.className='sysstat off'; txt.textContent='Geen internet · '+APP_VERSION; return; }
  if('serviceWorker' in navigator && navigator.serviceWorker.controller){
    stat.className='sysstat ready'; txt.textContent='Klaar voor offline · '+APP_VERSION;
  }else{
    stat.className='sysstat busy'; txt.textContent='Aan het downloaden… · '+APP_VERSION;
  }
}
window.addEventListener('online',updateSys);
window.addEventListener('offline',updateSys);
if('serviceWorker' in navigator){
  navigator.serviceWorker.register(bbUrl('sw.js')).then(()=>navigator.serviceWorker.ready).then(updateSys).catch(updateSys);
  navigator.serviceWorker.addEventListener('controllerchange',updateSys);
}

// ---------------- AUTOMATISCH VERNIEUWEN (blijft up-to-date) ----------------
// Een tablet die de hele dag openstaat draait anders oude code. We kijken periodiek
// of er een nieuwe versie online staat en herladen dan stil — maar alleen wanneer
// niemand bezig is (geen open venster, en minstens ~3 min geen aanraking, of het
// scherm staat op de achtergrond), zodat we niemand midden in het typen onderbreken.
let updateReady=false, lastActivity=Date.now();
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{lastActivity=Date.now();},{passive:true}));
function appIsBusy(){
  // een open invoervenster? dan niet herladen
  if(document.querySelector('.cammodal.open, .modal.open')) return true;
  return false;
}
function tryReload(){
  if(!updateReady) return;
  if(document.hidden){ location.reload(); return; }
  if(!appIsBusy() && (Date.now()-lastActivity > 180000)) location.reload();
}
async function checkForUpdate(){
  if(updateReady || !navigator.onLine) return;
  try{
    // Het versienummer staat sinds v4.0 in dit bestand (kern.js), niet meer in de pagina.
    const url=bbUrl('js/kern.js')+'?_v='+Date.now();
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) return;
    const m=(await res.text()).match(/APP_VERSION='([^']+)'/);
    if(m && m[1] && m[1]!==APP_VERSION){ updateReady=true; tryReload(); }
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ if(updateReady) location.reload(); } else { checkForUpdate(); } });
window.addEventListener('online',checkForUpdate);

// De terugknop wordt geregeld in js/terug.js, dat elke pagina apart inlaadt —
// ook de pagina's die deze kern niet gebruiken (projecten, ratings).

// ---------------- OPSTARTEN ----------------
// Elke pagina laadt deze kern en daarna haar eigen script. Zodra alles klaarstaat
// starten we hier de gedeelde database op en laten we de pagina zich tekenen.
document.addEventListener('DOMContentLoaded',()=>{
  updateSys(); bootAuth();
  BBInv.setOnChange(()=>{
    syncConfig();   // gedeelde instellingen + keuzelijsten ophalen/zaaien
    refreshAuth();  // namenlijst + inlogstatus bijwerken zodra de gedeelde lijst laadt
    if(typeof window.bbOnChange==='function') window.bbOnChange();
    updateSyncBadge();
  });
  if(typeof window.bbStart==='function') window.bbStart();
  BBInv.init();
  // De ⏳-melding volgt de wachtrij: de gegevenslaag geeft een seintje zodra dat aantal
  // verandert. Vroeger stond hier een setInterval van 3 seconden dat de hele dag door
  // bleef kijken naar iets dat zelden wijzigt. (Kent een toestel die nieuwe functie nog
  // niet — bv. een oude, opgeslagen kopie van inventaris.js — dan valt het terug op de
  // oude manier, zodat de melding hoe dan ook blijft werken.)
  if(BBInv.setOnWachtrij) BBInv.setOnWachtrij(updateSyncBadge);
  else { updateSyncBadge(); setInterval(updateSyncBadge,3000); }
  // Automatisch vernieuwen: eerste check na 1 min, daarna elk kwartier; en elke 30s
  // kijken of het een geschikt moment is om (stil) te herladen bij een nieuwe versie.
  setTimeout(checkForUpdate,60000);
  setInterval(checkForUpdate,15*60*1000);
  setInterval(tryReload,30000);
});

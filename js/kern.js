// =====================================================================
//  KERN — het gedeelte dat ELKE pagina nodig heeft.
//  Sinds v4.0 is elke kaart van de startpagina een eigen pagina
//  (inventaris.html, bestellingen.html, ...). Alles wat die pagina's
//  gemeen hebben staat hier één keer: inloggen, thema, foto's, de
//  gedeelde instellingen en de synchronisatie-melding.
//
//  Volgorde in elke pagina (onderaan de body):
//     supabase.min.js → inventaris-data.js → inventaris.js → kern.js → eigen script
//  Deze kern zet zelf BBInv.init() in gang zodra de pagina klaar is; een
//  pagina hoeft enkel window.bbOnChange / window.bbStart in te vullen.
// =====================================================================

// ---------------- GEDEELDE VENSTERS (op elke pagina hetzelfde) -------
// Eén keer hier beschreven i.p.v. in tien HTML-bestanden.
document.body.insertAdjacentHTML('afterbegin',`
<div id="loginOverlay">
  <div class="login-card">
    <div class="login-head">
      <img src="assets/logo-cp.png" alt="Center Parcs">
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
      <p class="login-sub" style="margin:0 0 14px">Voeg collega's toe met een pincode van 4 cijfers. Vergeten code? Tik <b>Reset</b>. Deze lijst is gedeeld met alle toestellen.</p>
      <div class="gebradd">
        <div class="h">Nieuwe collega</div>
        <input type="text" id="gebrNaam" class="finp" placeholder="Naam (bv. Jan)">
        <input type="tel" id="gebrPin" class="finp" inputmode="numeric" maxlength="4" placeholder="Pincode (4 cijfers)">
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
const APP_VERSION='v4.0';
const K_MED='bb_home_mededeling';
const K_LINKS='bb_home_links';
const K_PIN='bb_home_pin';
const K_DREMPEL='bb_home_drempel';       // rood: voorraad bijna op
const K_DREMPEL2='bb_home_drempel2';     // oranje: aandacht gevraagd
const K_DREMPEL_BK='bb_home_drempel_boekjes'; // boekjes-voorraad melding
const K_BESTELMAIL='bb_home_bestelmail';
const K_THEME='bb_home_theme';
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
function getProjMaken(){return localStorage.getItem(K_PROJ_MAKEN)||'vast';}
function getProjBewerken(){return localStorage.getItem(K_PROJ_BEWERKEN)||'iedereen';}

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
function applyTheme(){
  const dark=localStorage.getItem(K_THEME)==='dark';
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  const b=document.getElementById('themeBtn');
  if(b) b.textContent=dark?'☀️':'🌙';
  const tc=document.querySelector('meta[name="theme-color"]');
  if(tc) tc.setAttribute('content',dark?'#0f1a14':'#2f6450');
}
{ const tb=document.getElementById('themeBtn');
  if(tb) tb.onclick=()=>{
    const dark=localStorage.getItem(K_THEME)==='dark';
    localStorage.setItem(K_THEME,dark?'light':'dark');
    applyTheme();
  };
}

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
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('Camera niet beschikbaar op dit toestel — kies een foto uit bestanden.');return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}},audio:false}).then(s=>{
    camStream=s; v.srcObject=s; if(v.play)v.play().catch(()=>{}); m.classList.add('open');
    // Beeldbron (echte foto of videoframe) verkleinen en als JPEG bewaren.
    const bewaar=(src,natW,natH)=>{
      let w=natW,h=natH; if(!w||!h){alert('Camera nog niet klaar, probeer opnieuw.');bezig=false;return;}
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
  }).catch(e=>{alert('Kan de camera niet openen ('+((e&&e.name)||e)+'). Geef toestemming voor de camera, of kies een foto uit bestanden.');});
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
function copyText(t){const done=()=>alert('Gekopieerd! Plak het in Google Sheets of Excel (Ctrl+V).');
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fb());}else fb();
  function fb(){const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){alert('Kopiëren niet gelukt.');}document.body.removeChild(ta);}}

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
// Toegang tot een beheerdeel: waar voor een vaste mdw, anders het wachtwoord vragen.
function magBeheren(actie){
  if(isVasteMdw()) return true;
  const p=prompt('Wachtwoord'+(actie?' '+actie:'')+':'); if(p===null) return false;
  if(p!==getPin()){ alert('Onjuist wachtwoord.'); return false; }
  return true;
}
// Beheer-toegang geldt voor dit tabblad, niet per pagina: anders zou je het
// wachtwoord opnieuw moeten intikken telkens je van pagina wisselt.
function isOntgrendeld(){ try{ return sessionStorage.getItem('bb_beheer_open')==='1'; }catch(e){ return false; } }
function zetOntgrendeld(){ try{ sessionStorage.setItem('bb_beheer_open','1'); }catch(e){} }
// Bij het wisselen/uitloggen de 'ontgrendeld'-vlag wissen, zodat de volgende
// persoon niet de beheer-toegang van de vorige erft.
function resetBeheerLocks(){ try{ sessionStorage.removeItem('bb_beheer_open'); }catch(e){} }
// Beheer-toegang vragen en onthouden (gebruikt door de tabbladen 🔒 Beheer).
function eisBeheer(actie){
  if(isOntgrendeld()) return true;
  if(isVasteMdw()){ zetOntgrendeld(); return true; }
  const p=prompt('Wachtwoord beheer'+(actie?' om '+actie:'')+':');
  if(p===null) return false;
  if(p!==getPin()){ alert('Onjuist wachtwoord.'); return false; }
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
// Toon precies één paneel binnen het inlogscherm (namen / pincode / beheer).
function loginPanel(which){
  document.getElementById('loginNames').style.display = which==='names'?'':'none';
  document.getElementById('loginPin').style.display   = which==='pin'?'':'none';
  document.getElementById('loginBeheerPanel').style.display = which==='beheer'?'':'none';
}
function toNames(){ loginSel=null; pinBuf=''; loginPanel('names'); renderLoginNames(); }
function toBeheer(){ loginPanel('beheer'); document.getElementById('loginSub').textContent='Namen beheren'; renderGebrList(); }
function openBeheerPanel(){ document.getElementById('loginOverlay').classList.add('show'); toBeheer(); }
function beheerKlaar(){ if(currentUser()) hideLogin(); else toNames(); }
// Inloggen zonder pincode (bv. het gedeelde account "ENT algemeen").
function loginDirect(u){
  // ENT algemeen mag op dit toestel ingelogd blijven als dat zo is ingesteld (Instellingen).
  const rem=(u&&u.id==='entalg')&&localStorage.getItem(K_REMEMBER_ENT)==='1';
  setCurrentUser(u,rem); hideLogin(); toNames(); show('home'); renderHome();
}
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
  loginSel=u; pinBuf='';
  document.getElementById('pinWho').textContent='Hallo '+u.naam;
  const msg=document.getElementById('pinMsg'); msg.textContent=''; msg.className='pin-msg';
  document.getElementById('pinRemember').checked = localStorage.getItem(K_REMEMBER)==='1';
  loginPanel('pin');
  renderPinDots();
}
function renderPinDots(){ document.querySelectorAll('#loginPin .pin-dots i').forEach((el,i)=>el.classList.toggle('on', i<pinBuf.length)); }
async function tryPin(){
  if(!loginSel||pinBusy) return; pinBusy=true;
  const ok=await pinMatch(loginSel.pin, pinBuf); pinBusy=false;
  const msg=document.getElementById('pinMsg');
  if(ok){
    msg.className='pin-msg ok'; msg.textContent='✓ Welkom!';
    setCurrentUser(loginSel, document.getElementById('pinRemember').checked);
    setTimeout(()=>{ hideLogin(); toNames(); show('home'); renderHome(); }, 250);
  }else{
    msg.className='pin-msg'; msg.textContent='Onjuiste pincode, probeer opnieuw.';
    pinBuf=''; renderPinDots();
  }
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
document.getElementById('loginBeheer').onclick=()=>{
  const p=prompt('Beheerderswachtwoord:'); if(p===null) return;
  if(p!==getPin()){ alert('Onjuist wachtwoord.'); return; }
  toBeheer();  // beheer binnen het inlogscherm → app blijft vergrendeld
};
document.getElementById('beheerKlaar').onclick=beheerKlaar;

// ---- Gebruikersbeheer (achter het beheer-wachtwoord) ----
function openGebruikers(){
  if(!magBeheren()) return;
  openBeheerPanel();
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
          '<button class="admin'+(admin?' on':'')+'" title="Mag het Systeem-scherm en de Activiteit bekijken">'+(admin?'✓ Admin':'Admin')+'</button>'+
          '<button class="foto">📷 Foto</button><button class="rst">Reset code</button><button class="del">Verwijderen</button>');
    if(!locked){
      row.querySelector('.vast').onclick=()=>{ BBInv.updateGebruiker(u.id,{rol: BBInv.zetRol(u,'vast',!vast)}); renderGebrList(); refreshAuth(); };
      row.querySelector('.admin').onclick=()=>{ BBInv.updateGebruiker(u.id,{rol: BBInv.zetRol(u,'admin',!admin)}); renderGebrList(); refreshAuth(); };
      row.querySelector('.foto').onclick=()=>chooseProfilePhoto(url=>{ if(url){ BBInv.updateGebruiker(u.id,{foto:url}); updateUserBtn(); renderGebrList(); } });
      row.querySelector('.rst').onclick=async()=>{
        const np=prompt('Nieuwe pincode voor '+u.naam+' (4 cijfers):'); if(np===null) return;
        if(!/^\d{4}$/.test(np.trim())){ alert('De pincode moet precies 4 cijfers zijn.'); return; }
        BBInv.updateGebruiker(u.id,{pin: await sha256(np.trim())}); alert('Pincode aangepast.');
      };
      row.querySelector('.del').onclick=()=>{
        if(!confirm(u.naam+' verwijderen? Deze persoon kan dan niet meer inloggen.')) return;
        BBInv.removeGebruiker(u.id);
        const cu=currentUser(); if(cu&&cu.id===u.id) setCurrentUser(null,false);
        renderGebrList();
      };
    }
    box.appendChild(row);
  });
}
document.getElementById('openGebruikers').onclick=openGebruikers;
document.getElementById('gebrAdd').onclick=async()=>{
  const naam=document.getElementById('gebrNaam').value.trim();
  const pin=document.getElementById('gebrPin').value.trim();
  if(!naam){ alert('Vul een naam in.'); return; }
  if(!/^\d{4}$/.test(pin)){ alert('De pincode moet precies 4 cijfers zijn.'); return; }
  if(BBInv.getGebruikers().some(u=>(u.naam||'').toLowerCase()===naam.toLowerCase())
     && !confirm('Er bestaat al iemand met de naam "'+naam+'". Toch toevoegen?')) return;
  BBInv.addGebruiker({naam, pin: await sha256(pin)});
  document.getElementById('gebrNaam').value=''; document.getElementById('gebrPin').value='';
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
    const entered=prompt('Je pincode om door te gaan:'); if(entered===null) return;
    if(!(await pinMatch(u.pin,(entered||'').trim()))){ alert('Onjuiste pincode.'); return; }
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
  const remembered=localStorage.getItem(K_REMEMBER)==='1', u=currentUser();
  if(remembered && u){ updateUserBtn(); hideLogin(); }
  else { setCurrentUser(null,false); showLogin(); } // verse start: altijd opnieuw inloggen (geen hervatten zonder pincode)
}
function refreshAuth(){
  updateUserBtn(); // avatar/foto in de balk bijwerken zodra de gedeelde lijst (met foto's) laadt
  updateBestelTabs(); // Financieel-tab tonen/verbergen volgens rol
  updateActiviteitCard(); // Activiteit-kaart tonen/verbergen volgens rol
  if(document.getElementById('activiteit').classList.contains('active')) renderActiviteit();
  if(document.getElementById('loginOverlay').classList.contains('show') && document.getElementById('loginNames').style.display!=='none') renderLoginNames();
  if(document.getElementById('loginBeheerPanel').style.display!=='none') renderGebrList();
  // Hervalideer: staat de ingelogde persoon nog in de gedeelde lijst? Pas nadat de verse
  // lijst geladen is — de lokale kopie die we meteen bij het opstarten tonen kan verouderd
  // zijn, en dan zou een collega die net is toegevoegd er onterecht uit vliegen.
  if(!(window.BBInv&&BBInv.isReady&&BBInv.isReady())) return;
  const u=currentUser(), users=(window.BBInv&&BBInv.getGebruikers)?BBInv.getGebruikers():[];
  if(u && users.length && !users.some(x=>x.id===u.id)){ setCurrentUser(null,false); showLogin(); }
}

// ---------------- OFFLINE-STATUS + VERSIE ----------------
function updateSys(){
  const stat=document.getElementById('sysStat'), txt=document.getElementById('sysStatTxt');
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
  navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(updateSys).catch(updateSys);
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
    const url=new URL('entertainment.html', location.href).href+'?_v='+Date.now();
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) return;
    const m=(await res.text()).match(/APP_VERSION='([^']+)'/);
    if(m && m[1] && m[1]!==APP_VERSION){ updateReady=true; tryReload(); }
  }catch(e){}
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ if(updateReady) location.reload(); } else { checkForUpdate(); } });
window.addEventListener('online',checkForUpdate);

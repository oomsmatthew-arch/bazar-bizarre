/* Persoonlijke ratings — de ratings per medewerker, via de rooster.
   Enkel voor een Admin of Parkcoach. Gebruikt de helpers van js/ratings.js (window.Ratings)
   en het inlezen/koppelen van js/rooster.js (window.Rooster).

   De rooster wordt gedeeld bewaard, net als de ratings: in de tabel spelarchief, rij 5.
   Zo upload je hem één keer en ziet elke Admin of Parkcoach hem op elk toestel. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const R=window.Ratings||{}, RO=window.Rooster||{};
const K_ROOSTER='bb_rooster_v1';
const SB_RIJ=5;

let _alle=[];            // alle ratings van dit toestel (na de sync met de gedeelde set)
let _rooster=null;       // {ts, dagen, namen, shifts, uploads}
let _boekjaar='', _bjInit=false;
let _mdw='';             // gekozen medewerker
let _koppel=null;        // uitkomst van Rooster.koppel voor het gekozen boekjaar
let _dFilter=null;       // filter op de reacties van de gekozen medewerker: {soort, key, label}

// ---------------------------------------------------------------- wie mag hier binnen
// De rol komt uit de gedeelde gebruikerslijst, zoals isVaste() op Team ratings (Ratings.rolTags).
function magHier(){ const t=(R.rolTags?R.rolTags():[]); return t.indexOf('admin')>=0 || t.indexOf('parkcoach')>=0; }

// ---------------------------------------------------------------- opslag
function laadLokaal(){ try{ const r=JSON.parse(localStorage.getItem(K_ROOSTER)||'null'); return (r&&Array.isArray(r.shifts))?r:null; }catch(e){ return null; } }
function bewaarLokaal(r){ try{ localStorage.setItem(K_ROOSTER,JSON.stringify(r)); }catch(e){} }
async function laadGedeeld(){
  const sb=R.sbClient&&R.sbClient(); if(!sb) return null;
  try{ const r=await sb.from('spelarchief').select('data').eq('id',SB_RIJ).maybeSingle();
    if(r && !r.error && r.data && r.data.data && Array.isArray(r.data.data.shifts)) return r.data.data; }catch(e){}
  return null;
}
async function bewaarGedeeld(r){
  const sb=R.sbClient&&R.sbClient(); if(!sb) return false;
  try{ const res=await sb.from('spelarchief').upsert({id:SB_RIJ,data:r}); return !(res&&res.error); }catch(e){ return false; }
}
// De recentste van de twee wint (een upload op een ander toestel, of hier zonder verbinding).
function recentste(a,b){ if(!a) return b; if(!b) return a; return (b.ts||0)>(a.ts||0)?b:a; }

// ---------------------------------------------------------------- hulpjes
const esc=s=>R.esc?R.esc(s):String(s==null?'':s);
function status(tekst,soort){ const st=$('status'); if(!st) return; st.className='status '+(soort||''); st.textContent=tekst||''; }
function maandNaam(isoDag){ const p=String(isoDag||'').split('-'); return p.length>1?(R.MND[+p[1]-1]+' '+p[0]):''; }
function uploadLabel(u){
  const d=(u.dagen||[]).slice().sort(); if(!d.length) return u.bestand||'rooster';
  const a=maandNaam(d[0]), b=maandNaam(d[d.length-1]);
  return a===b?a:(a+' – '+b);
}
function kortDatum(isoDag){ const p=String(isoDag||'').split('-'); return p.length>2?(+p[2]+'/'+(+p[1])):''; }
function leegDonut(){ return '<span class="donut leeg"><span class="donut-in">–</span></span>'; }

// ---------------------------------------------------------------- tekenen
function render(){
  const heeft=!!(_rooster && _rooster.uploads && _rooster.uploads.length);
  $('leeg').style.display=heeft?'none':'';
  $('mdwCard').style.display=heeft?'':'none';
  renderUploads();
  // boekjaren uit de ratings; standaard het recentste, zoals op Team ratings
  const bj=Array.from(new Set(_alle.map(r=>R.boekjaarKey(r.datum)).filter(Boolean))).sort().reverse();
  if(!_bjInit && bj.length){ _boekjaar=bj[0]; _bjInit=true; }
  if(_boekjaar && bj.indexOf(_boekjaar)<0) _boekjaar='';
  const bs=$('boekjaar');
  bs.innerHTML='<option value="">Alle boekjaren</option>'+bj.map(k=>'<option value="'+k+'">Boekjaar '+R.boekjaarLabel(k)+'</option>').join('');
  bs.value=_boekjaar;
  if(!heeft){ $('detail').style.display='none'; $('nietCard').style.display='none'; $('koppelInfo').innerHTML=''; $('telling').textContent=''; $('mdwKeuze').style.display='none'; return; }

  const rev=_boekjaar?_alle.filter(r=>R.boekjaarKey(r.datum)===_boekjaar):_alle;
  _koppel=RO.koppel(rev,_rooster,R.canonAct);
  const pp=_koppel.perPersoon;
  const gekoppeld=rev.length-_koppel.niet.length-_koppel.buiten;
  let info='<b>'+gekoppeld+'</b> van de '+(rev.length-_koppel.buiten)+' ratings in de roosterperiode zijn gekoppeld aan een medewerker.';
  if(_koppel.niet.length) info+=' <a id="naarNiet">'+_koppel.niet.length+' niet gekoppeld</a>.';
  if(_koppel.buiten) info+='<br><span>'+_koppel.buiten+' ratings vallen op dagen zonder rooster; upload die maand om ze mee te tellen.</span>';
  $('koppelInfo').innerHTML=info;
  const nn=$('naarNiet'); if(nn) nn.onclick=()=>{ const c=$('nietCard'); if(c&&c.scrollIntoView) c.scrollIntoView({behavior:'smooth',block:'start'}); };
  $('telling').textContent=_rooster.namen.length+' medewerkers op de rooster';

  // per medewerker: eerst wie ratings heeft (beste bovenaan), daarna de rest in roostervolgorde
  const met=[], zonder=[];
  _rooster.namen.forEach(n=>{ const l=pp[n]||[]; if(l.length) met.push({naam:n,n:l.length,gem:R.avg(l.map(r=>r.score))}); else zonder.push(n); });
  met.sort((a,b)=>b.gem-a.gem||b.n-a.n);
  const box=$('perMdw'); box.innerHTML='';
  met.forEach(m=>{
    const el=R.kaartRij(m.naam,m.gem,m.n,()=>kies(m.naam,true));
    if(m.naam===_mdw) el.classList.add('gekozen');
    box.appendChild(el);
  });
  zonder.forEach(n=>{
    const el=document.createElement('div'); el.className='rij klik zonder'+(n===_mdw?' gekozen':'');
    el.innerHTML='<div class="rij-donut">'+leegDonut()+'</div><div class="rij-nm"><div class="t">'+esc(n)+'</div></div>'+
      '<div class="rij-n"><span>geen ratings</span></div>';
    el.onclick=()=>kies(n,true);
    box.appendChild(el);
  });
  const mk=$('mdwKeuze'); mk.style.display='';
  mk.innerHTML='<option value="">Kies een medewerker…</option>'+met.map(m=>m.naam).concat(zonder.slice().sort((a,b)=>a.localeCompare(b)))
    .map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('');
  mk.value=_mdw;

  renderDetail();
  renderNiet();
}

function renderUploads(){
  const box=$('uploads'); box.innerHTML='';
  ((_rooster&&_rooster.uploads)||[]).forEach((u,i)=>{
    const el=document.createElement('span'); el.className='upl';
    el.title=(u.bestand||'')+(u.ts?(' · opgeladen '+new Date(u.ts).toLocaleDateString('nl-BE')):'');
    el.innerHTML='📅 '+esc(uploadLabel(u))+' <button type="button" title="Deze rooster weghalen">✕</button>';
    el.querySelector('button').onclick=()=>verwijder(i);
    box.appendChild(el);
  });
}

function kies(naam,scroll){
  _mdw=naam; _dFilter=null;
  render();
  if(scroll){ const d=$('detail'); if(d&&d.scrollIntoView) d.scrollIntoView({behavior:'smooth',block:'start'}); }
}

function renderDetail(){
  const box=$('detail');
  if(!_mdw || !_koppel){ box.style.display='none'; return; }
  box.style.display='';
  const lijst=_koppel.perPersoon[_mdw]||[];
  const shifts=(_rooster.shifts||[]).filter(s=>s.n===_mdw);
  $('dNaam').textContent=_mdw;
  $('dSub').textContent=lijst.length+(lijst.length===1?' rating · ':' ratings · ')+shifts.length+(shifts.length===1?' shift':' shifts')+' met een activiteit op de rooster';
  if(!lijst.length){
    $('dTiles').innerHTML='<div class="hint" style="grid-column:1/-1;margin:0;">Nog geen ratings gekoppeld aan '+esc(_mdw)+
      (_boekjaar?' in boekjaar '+esc(R.boekjaarLabel(_boekjaar)):'')+'.</div>';
    ['dMaand','dTaal','dAct'].forEach(id=>{ $(id).innerHTML='<p class="muted">—</p>'; });
    $('dCount').textContent=''; $('dLijst').innerHTML='';
    return;
  }
  const perMaand=R.groepeer(lijst,r=>R.maandKey(r.datum)).sort((a,b)=>b.key.localeCompare(a.key));
  const perAct=R.groepeer(lijst,r=>R.canonAct(r.activiteit)).sort((a,b)=>b.gem-a.gem||b.n-a.n);
  const perTaal=R.groepeer(lijst,r=>R.taalVan(r)).sort((a,b)=>b.n-a.n);
  const tile=(v,label,naam)=>'<div class="tile"><div class="v '+R.kl(v)+'">'+R.fmtScore(v)+'</div><div class="l">'+label+(naam?'<div class="nm">'+esc(naam)+'</div>':'')+'</div></div>';
  const pool=perAct.filter(a=>a.n>=2), ap=pool.length>=2?pool:perAct;
  let grid='';
  if(ap.length) grid+=tile(ap[0].gem,'beste activiteit',ap[0].key);
  if(ap.length>1) grid+=tile(ap[ap.length-1].gem,'laagste activiteit',ap[ap.length-1].key);
  if(perMaand.length){ const b=perMaand.reduce((m,x)=>x.gem>m.gem?x:m); grid+=tile(b.gem,'beste maand',R.maandLabel(b.key)); }
  if(perMaand.length>1){ const s=perMaand.reduce((m,x)=>x.gem<m.gem?x:m); grid+=tile(s.gem,'laagste maand',R.maandLabel(s.key)); }
  $('dTiles').innerHTML='<div class="sum-hero">'+R.donut(R.avg(lijst.map(r=>r.score)))+'<div class="l">gemiddelde<br>'+lijst.length+' reacties</div></div>'+
    '<div class="sum-grid">'+grid+'</div>';
  const vul=(id,rijen)=>{ const c=$(id); c.innerHTML=''; if(!rijen.length){ c.innerHTML='<p class="muted">—</p>'; return; } rijen.forEach(e=>c.appendChild(e)); };
  vul('dMaand',perMaand.map(m=>R.kaartRij(R.maandLabel(m.key),m.gem,m.n,()=>zetFilter('maand',m.key,R.maandLabel(m.key)))));
  vul('dTaal',perTaal.map(t=>R.kaartRij(t.key,t.gem,t.n,()=>zetFilter('taal',t.key,t.key))));
  vul('dAct',perAct.map(a=>R.kaartRij(a.key,a.gem,a.n,()=>zetFilter('act',a.key,a.key))));
  renderReacties(lijst);
}
function zetFilter(soort,key,label){
  _dFilter=(_dFilter&&_dFilter.soort===soort&&_dFilter.key===key)?null:{soort:soort,key:key,label:label};
  renderReacties((_koppel&&_koppel.perPersoon[_mdw])||[]);
  const c=$('dCount'); if(c&&c.scrollIntoView) c.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderReacties(lijst){
  const f=_dFilter;
  const toon=lijst.filter(r=>{
    if(!f) return true;
    if(f.soort==='maand') return R.maandKey(r.datum)===f.key;
    if(f.soort==='taal') return R.taalVan(r)===f.key;
    if(f.soort==='act') return R.canonAct(r.activiteit)===f.key;
    return true;
  }).sort((a,b)=>((b.datum?b.datum.getTime():0)-(a.datum?a.datum.getTime():0)));
  const c=$('dCount');
  c.innerHTML=toon.length+' van '+lijst.length+' reacties'+(f?' · gemiddelde '+(toon.length?R.fmtScore(R.avg(toon.map(r=>r.score))):'–'):'')+
    (f?' <span class="filterchip" id="dFilterWeg">'+esc(f.label)+' ✕</span>':'');
  const w=$('dFilterWeg'); if(w) w.onclick=()=>{ _dFilter=null; renderReacties(lijst); };
  $('dLijst').innerHTML=toon.length?toon.map(R.reviewKaart).join(''):'<p class="muted">Geen reacties.</p>';
}

function renderNiet(){
  const card=$('nietCard');
  const niet=(_koppel&&_koppel.niet)||[];
  if(!niet.length){ card.style.display='none'; return; }
  card.style.display='';
  $('nietUitleg').textContent=niet.length+' ratings vallen op een dag met rooster, maar niemand stond rond dat uur op een passende shift. '+
    'Meestal heeft de shift in de rooster een naam die (nog) niet herkend wordt, of valt het uur van de rating buiten de shift.';
  const per=R.groepeer(niet,r=>R.canonAct(r.activiteit)||'(zonder naam)').sort((a,b)=>b.n-a.n);
  $('nietPerAct').innerHTML=per.map(a=>'<div class="rij"><div class="rij-nm"><div class="t">'+esc(a.key)+'</div></div><div class="rij-n"><b>'+a.n+'</b><span>ratings</span></div></div>').join('');
  $('nietLijst').innerHTML=niet.slice().sort((a,b)=>((b.datum?b.datum.getTime():0)-(a.datum?a.datum.getTime():0)))
    .map(r=>'<div class="r"><span>'+esc(r.activiteit||'—')+'</span><span>'+esc(r.datum?kortDatum(RO.iso(r.datum)):'')+(r.uur?' · '+esc(r.uur):'')+'</span><b>'+R.fmtScore(r.score)+'</b></div>').join('');
}

// ---------------------------------------------------------------- uploaden en weghalen
async function upload(file){
  status('Rooster inlezen…','bezig');
  try{
    const r=await RO.leesPdf(file);
    const nieuw=RO.alleenOptredens(r);
    status('Rooster inlezen… (opslaan)','bezig');
    const basis=recentste(_rooster, await laadGedeeld());
    const samen=RO.voegSamen(basis,nieuw); samen.ts=Date.now();
    _rooster=samen; bewaarLokaal(samen);
    const ok=await bewaarGedeeld(samen);
    status('Rooster van '+uploadLabel(samen.uploads.find(u=>u.van===nieuw.periode.van&&u.tot===nieuw.periode.tot)||{dagen:nieuw.dagen})+
      ' ingelezen: '+nieuw.namen.length+' medewerkers, '+nieuw.shifts.length+' shifts met een activiteit.'+
      (ok?'':'\nLet op: enkel op dit toestel bewaard — er was geen verbinding met de gedeelde opslag.'),ok?'klaar':'fout');
    render();
  }catch(e){
    status('De rooster kon niet ingelezen worden: '+((e&&e.message)||e),'fout');
  }
}
async function verwijder(i){
  const u=_rooster&&_rooster.uploads&&_rooster.uploads[i]; if(!u) return;
  if(!await bbBevestig({titel:'Rooster weghalen?', okTekst:'Ja, weghalen', gevaar:true,
    tekst:'De rooster van '+uploadLabel(u)+' wordt weggehaald, voor iedereen. De ratings zelf blijven staan.'})) return;
  const basis=recentste(_rooster, await laadGedeeld());
  const j=(basis.uploads||[]).findIndex(x=>x.van===u.van&&x.tot===u.tot&&x.ts===u.ts);
  _rooster=RO.verwijderUpload(basis, j>=0?j:i); _rooster.ts=Date.now();
  bewaarLokaal(_rooster);
  const ok=await bewaarGedeeld(_rooster);
  status(ok?'Rooster weggehaald.':'Weggehaald op dit toestel, maar de gedeelde opslag was niet bereikbaar.',ok?'klaar':'fout');
  render();
}

// ---------------------------------------------------------------- opstarten
document.addEventListener('DOMContentLoaded',async()=>{
  const verbergLaden=()=>{ const o=$('laadOverlay'); if(o) o.classList.add('weg'); };
  if(!magHier()){ $('geenToegang').style.display=''; verbergLaden(); return; }
  $('inhoud').style.display='';
  const inp=$('fileInput');
  inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(f) upload(f); inp.value=''; };
  $('uploadBtn').onclick=()=>inp.click();
  $('boekjaar').onchange=()=>{ _boekjaar=$('boekjaar').value; render(); };
  $('mdwKeuze').onchange=()=>{ const v=$('mdwKeuze').value; if(v) kies(v,true); else { _mdw=''; render(); } };
  // Terug naar het overzicht van iedereen.
  $('dSluit').onclick=()=>{ _mdw=''; _dFilter=null; render(); const c=$('mdwCard'); if(c&&c.scrollIntoView) c.scrollIntoView({behavior:'smooth',block:'start'}); };

  // Eerst wat er op dit toestel staat, dan de gedeelde versies erbij halen.
  _alle=(R.laadReviews?R.laadReviews():[])||[];
  _rooster=laadLokaal();
  render();
  if(_alle.length||_rooster) verbergLaden(); else setTimeout(verbergLaden,6000);
  try{
    const [_, gedeeld]=await Promise.all([R.syncGedeeld?R.syncGedeeld().catch(()=>null):null, laadGedeeld()]);
    _alle=(R.laadReviews?R.laadReviews():[])||[];
    const beste=recentste(_rooster,gedeeld);
    if(beste!==_rooster){ _rooster=beste; bewaarLokaal(beste); }
  }catch(e){}
  render();
  verbergLaden();
});
})();

/* Rooster — de "Master Schedule"-PDF uit het planningsprogramma inlezen en de ratings
   koppelen aan wie er die dag op de passende shift stond. Gebruikt door de pagina
   Persoonlijke ratings (js/ratings-persoonlijk.js).

   Hoe de PDF eruitziet: per pagina een blok dagen (bovenaan weekdag + dagnummer, bv.
   "di" en "1"), links een kolom met namen ("Ooms, Matthew"), en per dag een of meer
   shifts onder elkaar: een label ("O&F Orry 15.00", "FQN", "Prize Night - ENT 1") met
   daaronder het uur ("15:00 - 18:00"). De periode staat bovenaan ("Period: 1-9-2026 to
   1-10-2026"). Bij veel medewerkers loopt dezelfde reeks dagen over twee pagina's.

   Het programma tekent rij per rij: eerst de naam, dan de shifts van die rij. Daarom
   hangen we elke shift aan de laatst getekende naam, en kiezen we de dag op basis van
   waar de tekst horizontaal staat.

   Alles hieronder behalve leesPdf() werkt zonder browser (zie tests/test-rooster.js). */
(function(){
'use strict';

const WEEKDAG=['zo','ma','di','wo','do','vr','za'];       // zoals Date.getDay()
const IS_WEEKDAG=/^(ma|di|wo|do|vr|za|zo)$/i;

// ---------------------------------------------------------------- welke shift ↔ welke rating
// Links: het label van de shift in de rooster. Rechts: de naam van de activiteit zoals de
// ratingspagina ze samenvoegt (Ratings.canonAct). Iedereen op een passende shift krijgt
// de rating, ook de technieker en ENT 1 én ENT 2.
// Een nieuwe soort shift of activiteit? Voeg hier een regel toe. Shifts die nergens bij
// passen, worden niet bewaard (verlof, vergaderingen, restaurant…) — upload de rooster
// dan opnieuw nadat je een regel hebt toegevoegd.
// Elke shift van een personage (Orry, Woops, Rep, Bing, of gewoon "O&F") telt voor elke
// O&F-activiteit — ook de pool-shifts ("O&F Rep Pool"): op vrijdag gebeurt de taxirit binnen
// die shift. De DJ van de pool party ("DJ - Pool Party") telt enkel voor de Pool Party.
const IS_OF=/\bO&F\b|\borry\b|\bwoops\b|\brep\b|\bbing\b|kids\s*disco/i;
const KOPPEL=[
  {shift:IS_OF,                                                         act:a=>/^O&F:/.test(a)},
  {shift:/pool/i,                                                       act:a=>a==='O&F: Pool Party'},
  {shift:/\bFQN\b|quiz/i,                                               act:a=>a==='Family Quiz Night'},
  {shift:/prize\s*night/i,                                              act:a=>a==='Prize Night'},
  {shift:/silent\s*disco/i,                                             act:a=>a==='Silent Disco'},
  {shift:/live\s*mus|chill\s*tunes/i,                                   act:a=>a==='Live muziek / Chill Tunes'},
  {shift:/crazy\s*game|\bCGT\b/i,                                       act:a=>a==='Crazy Game Time'},
  {shift:/family\s*game|\bFGB\b/i,                                      act:a=>a==='Family Game Battle'},
  {shift:/pirate|piraat/i,                                              act:a=>a==='A Pirates Show'},
  {shift:/concert/i,                                                    act:a=>a==='A Private Love Concert'},
  {shift:/pop-?\s*up/i,                                                 act:a=>a==='Pop-Up Entertainment'},
  {shift:/halloween|griezel|outbreak|kindertocht|volwassentocht/i,      act:a=>/halloween/i.test(a)},
  {shift:/piet|sint|ruprecht/i,                                         act:a=>/piet|sinterklaas/i.test(a)},
  {shift:/paas|pasen|easter/i,                                          act:a=>/^paas/i.test(a)}
];
// Woorden die wel op een activiteit lijken maar geen optreden zijn ("Overleg Halloween",
// "Training Bazar Bizarre", "EA - Halloween": EA is voorbereiding, geen optreden).
const GEEN_OPTREDEN=/^EA\b|overleg|vergadering|training|programma|briefing/i;

function past(regel,label){ return typeof regel.shift==='function' ? regel.shift(label) : regel.shift.test(label); }
function isOptreden(label){
  const l=String(label||'');
  return !GEEN_OPTREDEN.test(l) && KOPPEL.some(k=>past(k,l));
}

// ---------------------------------------------------------------- kleine hulpjes
function pad(n){ return String(n).padStart(2,'0'); }
function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
// "13:00", "13.00", "13u00" of een Excel-tijd (0,5416 = 13:00) → minuten sinds middernacht
function minuten(v){
  if(v==null||v==='') return null;
  if(typeof v==='number' && isFinite(v)) return Math.round((v%1)*1440);
  const m=/(\d{1,2})\s*[:.hu]\s*(\d{2})/i.exec(String(v));
  return m ? (+m[1])*60+(+m[2]) : null;
}
// "Ooms, Matthew" → "Matthew Ooms"
function mooieNaam(n){
  const p=String(n||'').split(',');
  if(p.length!==2) return String(n||'').trim();
  return (p[1].trim()+' '+p[0].trim()).trim();
}
// De naam van een account in de app terugvinden op de rooster. Volgorde, hoofdletters,
// accenten en leestekens tellen niet mee ("Ooms, Matthew" = "matthew ooms"), maar alle
// delen van de naam moeten kloppen: enkel "Matthew" is niet genoeg — anders zou iemand
// zomaar de scores van een collega met dezelfde voornaam te zien krijgen.
function naamSleutel(n){
  return String(n||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).sort().join(' ');
}
function zoekNaam(naam, namen){
  const k=naamSleutel(naam); if(!k) return null;
  const hits=(namen||[]).filter(n=>naamSleutel(n)===k);
  return hits.length===1?hits[0]:null;
}
function leesDatum(s){                       // "1-9-2026" → Date (lokaal, middernacht)
  const m=/(\d{1,2})-(\d{1,2})-(\d{4})/.exec(s||'');
  return m ? new Date(+m[3],+m[2]-1,+m[1]) : null;
}

// ---------------------------------------------------------------- de PDF-tekst omzetten
// paginas: [{items:[{str, x, y, w}]}] — x,y = linksonder van de tekst (PDF-coördinaten,
// y loopt naar boven), w = breedte. Precies wat pdf.js teruggeeft, in tekenvolgorde.
// Geeft {periode:{van,tot}, dagen:[iso…], namen:[…], shifts:[{n,d,l,v,t}]}.
function uitItems(paginas){
  const alle=[].concat.apply([],paginas.map(p=>p.items||[]));
  // De periode: het item na "Period:" (of "Periode:"), anders het eerste "d-m-jjjj to d-m-jjjj".
  let periode=null;
  for(let i=0;i<alle.length && !periode;i++){
    const s=String(alle[i].str||'');
    const m=/(\d{1,2}-\d{1,2}-\d{4})\s*(?:to|tot|t\/m|-)\s*(\d{1,2}-\d{1,2}-\d{4})/i.exec(s);
    const vorige=i>0?String(alle[i-1].str||''):'';
    if(m && (/period/i.test(vorige) || /period/i.test(s))) periode={van:leesDatum(m[1]),tot:leesDatum(m[2])};
  }
  if(!periode){
    for(const it of alle){ const m=/(\d{1,2}-\d{1,2}-\d{4})\s*(?:to|tot)\s*(\d{1,2}-\d{1,2}-\d{4})/i.exec(it.str||''); if(m){ periode={van:leesDatum(m[1]),tot:leesDatum(m[2])}; break; } }
  }
  if(!periode||!periode.van) throw new Error('Geen periode gevonden in de rooster (bovenaan hoort "Period: 1-9-2026 to 1-10-2026" te staan).');

  const dagen=new Set(), namen=[], gezien={}, shifts=[];
  paginas.forEach(p=>{
    const r=leesPagina(p.items||[], periode);
    r.dagen.forEach(d=>dagen.add(d));
    r.namen.forEach(n=>{ if(!gezien[n]){ gezien[n]=1; namen.push(n); } });
    shifts.push.apply(shifts,r.shifts);
  });
  if(!dagen.size) throw new Error('Geen dagen gevonden in de rooster. Is dit wel de "Master Schedule"-PDF?');
  return {periode:{van:iso(periode.van),tot:iso(periode.tot||periode.van)}, dagen:Array.from(dagen).sort(), namen:namen, shifts:shifts};
}

function midden(it){ return (+it.x||0)+((+it.w||0)/2); }

function leesPagina(items, periode){
  const leeg={dagen:[],namen:[],shifts:[]};
  // 1. De rij met weekdagen: de hoogte (y) waarop de meeste "ma/di/wo…" staan.
  const perY={};
  items.forEach(it=>{ if(IS_WEEKDAG.test(String(it.str||'').trim())){ const k=Math.round(it.y); (perY[k]=perY[k]||[]).push(it); } });
  let kopY=null, kop=[];
  Object.keys(perY).forEach(k=>{ if(perY[k].length>kop.length){ kop=perY[k]; kopY=+k; } });
  if(!kop.length) return leeg;                       // pagina zonder rooster (bv. een lege laatste pagina)
  kop.sort((a,b)=>midden(a)-midden(b));
  const midx=kop.map(midden);
  const breed=midx.length>1 ? (midx[midx.length-1]-midx[0])/(midx.length-1) : 70;
  const grenzen=midx.map((m,i)=>i===0?m-breed/2:(midx[i-1]+m)/2);   // linkerrand van elke kolom
  grenzen.push(midx[midx.length-1]+breed/2);
  const kolom=it=>{ const m=midden(it); for(let i=0;i<midx.length;i++){ if(m>=grenzen[i]&&m<grenzen[i+1]) return i; } return -1; };

  // 2. De dagnummers: getallen net onder de weekdagen.
  const dagNr=new Array(midx.length).fill(null);
  items.forEach(it=>{
    const s=String(it.str||'').trim();
    if(/^\d{1,2}$/.test(s) && it.y<kopY && it.y>kopY-30){ const k=kolom(it); if(k>=0 && dagNr[k]==null) dagNr[k]=+s; }
  });
  // 3. Elke kolom een datum geven: het dagnummer mét de juiste weekdag, in of vlak rond de periode.
  const datums=kop.map((w,i)=>vindDatum(dagNr[i], String(w.str).trim().toLowerCase(), periode));

  // 4. De rijen. De onderkant van de raster: de voettekst ("Master Schedule" helemaal onderaan)
  //    en alles erboven tot aan de weekdagen.
  let voetY=-Infinity;
  items.forEach(it=>{ if(/master\s*schedule/i.test(it.str||'') && it.y<kopY-40) voetY=Math.max(voetY,it.y); });
  const links=grenzen[0];
  const namen=[], shifts=[];
  let naam=null; const buf={};                        // per kolom: tekst sinds de vorige shift
  const leegBuf=()=>{ Object.keys(buf).forEach(k=>delete buf[k]); };
  items.forEach(it=>{
    const s=String(it.str||'');
    if(!(it.y<kopY-2 && it.y>voetY+2)) return;        // kop of voettekst
    if(midden(it)<links){                             // de namenkolom
      if(s.indexOf(',')>0){ naam=mooieNaam(s); namen.push(naam); leegBuf(); }
      return;
    }
    if(!naam) return;
    const k=kolom(it); if(k<0||!datums[k]) return;
    buf[k]=(buf[k]||'')+' '+s;
    // Een shift is af zodra er "uu:mm - uu:mm" staat.
    const m=/^(.*?)(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*$/.exec(buf[k].replace(/\s+/g,' ').trim());
    if(m){
      shifts.push({n:naam, d:datums[k], l:m[1].trim(), v:m[2], t:m[3]});
      buf[k]='';
    }
  });
  return {dagen:datums.filter(Boolean), namen:namen, shifts:shifts};
}

function vindDatum(nr, wd, periode){
  if(nr==null) return null;
  const van=periode.van, tot=periode.tot||periode.van;
  const vroegst=new Date(van.getFullYear(),van.getMonth(),van.getDate()-7);
  const laatst=new Date(tot.getFullYear(),tot.getMonth(),tot.getDate()+7);
  for(let m=-1;m<=2;m++){
    const d=new Date(van.getFullYear(),van.getMonth()+m,nr);
    if(d.getDate()!==nr) continue;                   // bv. 31 in een maand van 30 dagen
    if(d<vroegst||d>laatst) continue;
    if(WEEKDAG[d.getDay()]===wd) return iso(d);
  }
  return null;
}

// ---------------------------------------------------------------- bewaren en samenvoegen
// Enkel de shifts die bij een activiteit horen, gaan mee (geen verlof of vergaderingen).
function alleenOptredens(r){
  return Object.assign({},r,{shifts:r.shifts.filter(s=>isOptreden(s.l))});
}
// Een nieuwe upload vervangt de dagen die erin staan; andere dagen blijven. Elke upload
// onthoudt zijn eigen dagen en namen, zodat je hem later weer kunt weghalen.
function voegSamen(oud, nieuw){
  const o=oud||{dagen:[],shifts:[],uploads:[]};
  const vervangen=new Set(nieuw.dagen);
  const upload={van:nieuw.periode.van, tot:nieuw.periode.tot, dagen:nieuw.dagen.slice(),
    namen:(nieuw.namen||[]).slice(), bestand:nieuw.bestand||'', ts:Date.now()};
  // Oudere uploads verliezen de dagen die de nieuwe overneemt; wie dan niets meer heeft, valt weg.
  const uploads=(o.uploads||[])
    .map(u=>Object.assign({},u,{dagen:(u.dagen||[]).filter(d=>!vervangen.has(d))}))
    .filter(u=>u.dagen.length)
    .concat([upload])
    .sort((a,b)=>a.van.localeCompare(b.van));
  return metNamen({
    dagen:Array.from(new Set((o.dagen||[]).concat(nieuw.dagen))).sort(),
    shifts:(o.shifts||[]).filter(s=>!vervangen.has(s.d)).concat(nieuw.shifts),
    uploads:uploads
  });
}
function verwijderUpload(r, index){
  const u=(r.uploads||[])[index]; if(!u) return r;
  const weg=new Set(u.dagen||[]);
  return metNamen({
    dagen:(r.dagen||[]).filter(d=>!weg.has(d)),
    shifts:(r.shifts||[]).filter(s=>!weg.has(s.d)),
    uploads:r.uploads.filter((x,i)=>i!==index)
  });
}
// Iedereen die op een van de opgeladen roosters staat, in de volgorde van de rooster.
function metNamen(r){
  const namen=[];
  (r.uploads||[]).forEach(u=>(u.namen||[]).forEach(n=>{ if(namen.indexOf(n)<0) namen.push(n); }));
  r.namen=namen;
  return r;
}

// ---------------------------------------------------------------- ratings koppelen
// reviews: zoals Ratings.laadReviews() ze geeft ({score, activiteit, datum: Date, uur, …}).
// canon: Ratings.canonAct. Geeft {perPersoon:{naam:[review…]}, niet:[review…], buiten:n}.
//   niet   = in de roosterperiode, maar niemand op een passende shift gevonden
//   buiten = op een dag waarvoor nog geen rooster is opgeladen
function koppel(reviews, rooster, canon){
  const perDag={};
  ((rooster&&rooster.shifts)||[]).forEach(s=>{ (perDag[s.d]=perDag[s.d]||[]).push(s); });
  const dagen=new Set((rooster&&rooster.dagen)||[]);
  const perPersoon={}, niet=[]; let buiten=0;
  (reviews||[]).forEach(r=>{
    if(!(r.datum instanceof Date) || isNaN(r.datum)){ buiten++; return; }
    const d=iso(r.datum);
    if(!dagen.has(d)){ buiten++; return; }
    const act=canon?canon(r.activiteit):String(r.activiteit||'');
    const regels=KOPPEL.filter(k=>k.act(act));
    const um=minuten(r.uur);
    const wie=[];
    (perDag[d]||[]).forEach(s=>{
      if(GEEN_OPTREDEN.test(s.l) || !regels.some(k=>past(k,s.l))) return;
      if(um!=null && !binnenShift(um,s)) return;
      if(wie.indexOf(s.n)<0) wie.push(s.n);
    });
    if(!wie.length){ niet.push(r); return; }
    wie.forEach(n=>{ (perPersoon[n]=perPersoon[n]||[]).push(r); });
  });
  return {perPersoon:perPersoon, niet:niet, buiten:buiten};
}
// Het uur van de activiteit valt binnen de shift. Een kwartier speling vooraan: een show
// van 15u00 hoort ook bij wie om 15u15 begint, en een bezoek van 14u00 bij een shift van
// 12u30 tot 18u00. Een shift over middernacht (19:00 - 00:30) loopt door tot de volgende dag.
function binnenShift(um,s){
  const v=minuten(s.v), t0=minuten(s.t);
  if(v==null||t0==null) return true;
  const t=t0<=v?t0+1440:t0;
  return um>=v-15 && um<=t;
}

// ---------------------------------------------------------------- PDF lezen (browser)
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let _pdfjs=null;
function laadPdfjs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(_pdfjs) return _pdfjs;
  _pdfjs=new Promise((ok,nok)=>{
    const s=document.createElement('script'); s.src=PDFJS; s.async=true;
    s.onload=()=>{ if(window.pdfjsLib){ window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER; ok(window.pdfjsLib); } else nok(new Error('pdf.js niet geladen')); };
    s.onerror=()=>{ _pdfjs=null; nok(new Error('De PDF-lezer kon niet geladen worden. Is er internet?')); };
    document.head.appendChild(s);
  });
  return _pdfjs;
}
async function leesPdf(file){
  const lib=await laadPdfjs();
  const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const paginas=[];
  for(let i=1;i<=doc.numPages;i++){
    const pg=await doc.getPage(i);
    const tc=await pg.getTextContent();
    paginas.push({items:tc.items.filter(it=>it&&typeof it.str==='string'&&it.transform)
      .map(it=>({str:it.str, x:it.transform[4], y:it.transform[5], w:it.width||0}))});
  }
  const r=uitItems(paginas);
  r.bestand=file.name||'';
  return r;
}

const API={KOPPEL:KOPPEL, isOptreden:isOptreden, uitItems:uitItems, alleenOptredens:alleenOptredens,
  voegSamen:voegSamen, verwijderUpload:verwijderUpload, koppel:koppel, minuten:minuten, mooieNaam:mooieNaam,
  zoekNaam:zoekNaam, iso:iso, leesPdf:leesPdf};
if(typeof window!=='undefined') window.Rooster=API;
else if(typeof globalThis!=='undefined') globalThis.Rooster=API;
})();

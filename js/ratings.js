/* Ratings — inlezen van een survey-export (.xlsx of .csv), reviews vertalen naar het
   Nederlands en tonen als lijst + overzichten (per maand, activiteit, taal).
   Alles gebeurt op het toestel zelf; de laatste import wordt lokaal bewaard. */
(function(){
'use strict';

// ---------------------------------------------------------------- helpers
const $=id=>document.getElementById(id);
const MND=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const TAALNAAM={nl:'Nederlands',de:'Duits',en:'Engels',fr:'Frans',es:'Spaans',it:'Italiaans',pl:'Pools',pt:'Portugees',da:'Deens',nb:'Noors',no:'Noors',sv:'Zweeds',cs:'Tsjechisch',ru:'Russisch'};
const K_DATA='bb_ratings_data_v1';
const K_TR='bb_ratings_trcache_v1';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// score-klasse: groen ≥4, oranje 3–<4, rood <3 (zoals de donut op papier)
function kl(v){ return v>=4?'goed':(v>=3?'let':'slecht'); }
function avg(a){ return a.length? a.reduce((s,x)=>s+x,0)/a.length : 0; }
function fmtScore(v){ return (Math.round(v*100)/100).toFixed(2).replace('.',','); }

// ---------------------------------------------------------------- datums
// Excel bewaart datums als getal (dagen sinds 1899-12-30). 25569 = dat getal voor 1970-01-01.
function excelDate(serial){ const ms=Math.round((serial-25569)*86400*1000); const d=new Date(ms); return isNaN(d)?null:d; }
function parseDate(v){
  if(v==null||v==='') return null;
  const s=String(v).trim();
  if(/^\d+(\.\d+)?$/.test(s)) return excelDate(parseFloat(s));           // Excel-serienummer
  let m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);                 // dd-mm-jjjj
  if(m){ let y=+m[3]; if(y<100)y+=2000; const d=new Date(y,+m[2]-1,+m[1]); return isNaN(d)?null:d; }
  m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);                        // jjjj-mm-dd
  if(m){ const d=new Date(+m[1],+m[2]-1,+m[3]); return isNaN(d)?null:d; }
  const d=new Date(s); return isNaN(d)?null:d;
}
function fmtDate(d){ if(!(d instanceof Date)||isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear(); }

// ---------------------------------------------------------------- CSV
function parseCSV(text){
  const nl=text.indexOf('\n'); const first=nl>=0?text.slice(0,nl):text;
  const delim=(first.split(';').length>first.split(',').length)?';':',';
  const rows=[]; let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"') q=true;
    else if(ch===delim){ row.push(cur); cur=''; }
    else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
    else if(ch!=='\r') cur+=ch;
  }
  if(cur.length||row.length){ row.push(cur); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------- XLSX (zip + DecompressionStream)
function colIdx(letters){ let n=0; for(let i=0;i<letters.length;i++) n=n*26+(letters.charCodeAt(i)-64); return n-1; }
async function parseXLSX(buf){
  if(typeof DecompressionStream==='undefined') throw new Error('Dit toestel kan geen Excel uitpakken. Sla het op als CSV en probeer opnieuw.');
  const dv=new DataView(buf); const u8=new Uint8Array(buf);
  let eocd=-1;
  for(let i=buf.byteLength-22;i>=0;i--){ if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; } }
  if(eocd<0) throw new Error('Dit lijkt geen geldig Excel-bestand.');
  const cdCount=dv.getUint16(eocd+10,true); let off=dv.getUint32(eocd+16,true);
  const entries={};
  for(let n=0;n<cdCount;n++){
    if(dv.getUint32(off,true)!==0x02014b50) break;
    const method=dv.getUint16(off+10,true), compSize=dv.getUint32(off+20,true);
    const nameLen=dv.getUint16(off+28,true), extraLen=dv.getUint16(off+30,true), commentLen=dv.getUint16(off+32,true);
    const localOff=dv.getUint32(off+42,true);
    const name=new TextDecoder().decode(u8.subarray(off+46,off+46+nameLen));
    entries[name]={method,compSize,localOff};
    off+=46+nameLen+extraLen+commentLen;
  }
  async function read(name){
    const e=entries[name]; if(!e) return null;
    const lnameLen=dv.getUint16(e.localOff+26,true), lextraLen=dv.getUint16(e.localOff+28,true);
    const dataOff=e.localOff+30+lnameLen+lextraLen;
    const comp=u8.subarray(dataOff,dataOff+e.compSize);
    if(e.method===0) return new TextDecoder().decode(comp);
    const stream=new Blob([comp]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  const sheetXml=await read('xl/worksheets/sheet1.xml');
  if(!sheetXml) throw new Error('Kon het werkblad niet lezen.');
  const ssXml=await read('xl/sharedStrings.xml');
  const shared=[];
  if(ssXml){ new DOMParser().parseFromString(ssXml,'application/xml').querySelectorAll('si').forEach(si=>{
    let s=''; si.querySelectorAll('t').forEach(t=>s+=t.textContent); shared.push(s); }); }
  const doc=new DOMParser().parseFromString(sheetXml,'application/xml');
  const aoa=[];
  doc.querySelectorAll('row').forEach(r=>{
    const arr=[];
    r.querySelectorAll('c').forEach(c=>{
      const ref=c.getAttribute('r')||''; const letters=ref.replace(/[0-9]/g,'')||'A';
      const idx=colIdx(letters); const t=c.getAttribute('t'); let v='';
      if(t==='inlineStr'){ const is=c.querySelector('is'); v=is?is.textContent:''; }
      else if(t==='s'){ const ve=c.querySelector('v'); v=ve?(shared[+ve.textContent]||''):''; }
      else { const ve=c.querySelector('v'); v=ve?ve.textContent:''; }
      arr[idx]=v;
    });
    aoa.push(arr);
  });
  return aoa;
}

// ---------------------------------------------------------------- kolommen koppelen
function mapTable(aoa){
  // niet-lege rijen behouden
  const rows=aoa.filter(r=>r&&r.some(c=>String(c==null?'':c).trim()!==''));
  // header-rij zoeken (bevat rating/review/score)
  let hi=0;
  for(let i=0;i<Math.min(rows.length,12);i++){
    const j=rows[i].map(x=>String(x||'').toLowerCase()).join('|');
    if(/rating|review|score|beoordeling|waardering|comment|reactie/.test(j)){ hi=i; break; }
  }
  const H=rows[hi].map(x=>String(x||'').trim().toLowerCase());
  const has=(i,...k)=> i>=0 && k.some(kk=>H[i].includes(kk));
  const find=fn=>{ for(let i=0;i<H.length;i++){ if(fn(i)) return i; } return -1; };
  const iScore=find(i=>has(i,'rating','score','beoordeling','waardering'));
  const iText =find(i=>has(i,'review','comment','opmerking','reactie','tekst','feedback'));
  const iDate =find(i=>has(i,'date','datum'));
  let   iAct  =find(i=>H[i].includes('activity')&&H[i].includes('name'));
  if(iAct<0) iAct=find(i=>has(i,'activiteit','activity','activity name'));
  const iHour =find(i=>has(i,'hour','uur','time','tijd'));
  const iBook =find(i=>has(i,'booking','crs','boeking'));                // boekingscode → helpt dubbels herkennen
  const out=[];
  for(let i=hi+1;i<rows.length;i++){
    const r=rows[i];
    const score=iScore>=0?parseFloat(String(r[iScore]).replace(',','.')):NaN;
    if(!isFinite(score)) continue;                                       // rijen zonder score overslaan
    out.push({
      score:score,
      activiteit:iAct>=0?String(r[iAct]||'').trim():'',
      datum:iDate>=0?parseDate(r[iDate]):null,
      uur:iHour>=0?String(r[iHour]||'').trim():'',
      tekst:iText>=0?String(r[iText]||'').trim():'',
      code:iBook>=0?String(r[iBook]||'').trim():''
    });
  }
  return {reviews:out, mapping:{score:iScore,text:iText,date:iDate,act:iAct}};
}

// ---------------------------------------------------------------- vertalen (auto → NL)
let _trCache={}; try{ _trCache=JSON.parse(localStorage.getItem(K_TR))||{}; }catch(e){ _trCache={}; }
function _saveTr(){ try{ localStorage.setItem(K_TR,JSON.stringify(_trCache)); }catch(e){} }
async function translateToNL(text){
  const key=text.slice(0,400);
  if(_trCache[key]) return _trCache[key];
  const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=nl&dt=t&q='+encodeURIComponent(text);
  const r=await fetch(url);
  if(!r.ok) throw new Error('http '+r.status);
  const data=await r.json();
  const vertaald=(data[0]||[]).map(seg=>seg[0]).join('');
  const lang=data[2]||'';
  const res={vertaald:vertaald||text, lang};
  _trCache[key]=res; _saveTr();
  return res;
}
// reviews met tekst vertalen, met kleine gelijktijdigheid en voortgang
async function vertaalAlles(reviews, onProgress){
  const teVertalen=reviews.filter(r=>r.tekst);
  let klaar=0; const N=teVertalen.length;
  const werk=teVertalen.slice();
  async function worker(){
    while(werk.length){
      const r=werk.shift();
      try{ const t=await translateToNL(r.tekst); r.vertaald=t.vertaald; r.lang=t.lang; }
      catch(e){ r.vertaald=r.tekst; r.lang=''; r._trFout=true; }
      klaar++; if(onProgress) onProgress(klaar,N);
    }
  }
  await Promise.all([worker(),worker(),worker()]);            // 3 tegelijk
  return reviews;
}

// ---------------------------------------------------------------- overzichten
function groepeer(reviews, keyFn){
  const m={};
  reviews.forEach(r=>{ const k=keyFn(r); if(k==null||k==='') return; (m[k]=m[k]||[]).push(r.score); });
  return Object.keys(m).map(k=>({key:k, n:m[k].length, gem:avg(m[k])}));
}
function taalVan(r){
  if(r.lang && TAALNAAM[r.lang]) return TAALNAAM[r.lang];
  if(r.lang) return r.lang.toUpperCase();
  return null;                                                // geen tekst → niet meetellen per taal
}

// ---------------------------------------------------------------- weergave
function donut(v){
  const c=kl(v), col=c==='goed'?'var(--goed)':(c==='let'?'var(--let)':'var(--slecht)');
  const pct=Math.max(0,Math.min(100,(v/5)*100));
  return '<span class="donut" style="background:conic-gradient('+col+' '+pct+'%, var(--ring) 0)"><span class="donut-in">'+fmtScore(v)+'</span></span>';
}
function maandKey(d){ return d?(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')):''; }
function maandLabel(k){ const p=k.split('-'); return MND[+p[1]-1]+' '+p[0]; }
function fmtISO(d){ if(!(d instanceof Date)||isNaN(d)) return ''; const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }

// Eén overzicht-rij; met onClick wordt ze klikbaar (filtert de reactielijst).
function kaartRij(naam,gem,n,onClick){
  const el=document.createElement('div'); el.className='rij'+(onClick?' klik':'');
  el.innerHTML='<div class="rij-donut">'+donut(gem)+'</div>'+
    '<div class="rij-nm"><div class="t">'+esc(naam)+'</div></div>'+
    '<div class="rij-n"><b>'+fmtScore(gem)+'</b><span>'+n+' reacties</span></div>';
  if(onClick) el.onclick=onClick;
  return el;
}
function vulRijen(id,els){ const c=$(id); if(!c) return; c.innerHTML=''; if(!els.length){ c.innerHTML='<p class="muted">—</p>'; return; } els.forEach(e=>c.appendChild(e)); }

function reviewKaart(r){
  const c=kl(r.score);
  const heeft=r.tekst||r.vertaald;
  const orig=(r.tekst && r.vertaald && r.tekst!==r.vertaald)?'<div class="rv-orig">origineel: '+esc(r.tekst)+'</div>':'';
  const tekst=heeft?esc(r.vertaald||r.tekst):'<span class="muted">— geen tekst —</span>';
  return '<div class="rv"><div class="rv-score '+c+'">'+fmtScore(r.score)+'</div>'+
    '<div class="rv-body"><div class="rv-top"><b>'+esc(r.activiteit||'—')+'</b>'+
    (r.datum?'<span class="rv-datum">'+fmtDate(r.datum)+(r.uur?' · '+esc(r.uur):'')+'</span>':'')+
    (taalVan(r)?'<span class="rv-taal">'+esc(taalVan(r))+'</span>':'')+'</div>'+
    '<div class="rv-tekst">'+tekst+'</div>'+orig+'</div></div>';
}

// ---- filter + reactielijst ----
let _reviews=[];
let _filter={zoek:'',datum:'',act:'',maand:'',score:''};
function renderReviews(){
  const f=_filter;
  const list=_reviews.filter(r=>{
    if(f.act && r.activiteit!==f.act) return false;
    if(f.maand && maandKey(r.datum)!==f.maand) return false;
    if(f.datum && fmtISO(r.datum)!==f.datum) return false;
    if(f.score && kl(r.score)!==f.score) return false;
    if(f.zoek){ const hay=((r.activiteit||'')+' '+(r.tekst||'')+' '+(r.vertaald||'')).toLowerCase(); if(hay.indexOf(f.zoek)<0) return false; }
    return true;
  }).sort((a,b)=>((b.datum?b.datum.getTime():0)-(a.datum?a.datum.getTime():0)));
  const actief=!!(f.act||f.maand||f.datum||f.score||f.zoek);
  let head=list.length+' van '+_reviews.length+' reacties';
  if(actief) head+=' · gemiddelde '+(list.length?fmtScore(avg(list.map(r=>r.score))):'–');
  $('reviewCount').textContent=head;
  $('reviewList').innerHTML=list.length?list.map(reviewKaart).join(''):'<p class="muted">Geen reacties gevonden voor deze zoekopdracht.</p>';
}
function zetFilter(patch,scroll){
  Object.assign(_filter,patch);
  const z=$('fZoek'),d=$('fDatum'),a=$('fAct');
  if(z) z.value=_filter.zoek||''; if(d) d.value=_filter.datum||''; if(a) a.value=_filter.act||'';
  document.querySelectorAll('#fScore .chip').forEach(x=>x.classList.toggle('active',(x.dataset.score||'')===(_filter.score||'')));
  renderReviews();
  if(scroll){ const el=$('reviewCount'); if(el&&el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'start'}); }
}
function resetFilter(){ zetFilter({zoek:'',datum:'',act:'',maand:'',score:''},false); }

function render(data){
  const reviews=data.reviews; _reviews=reviews;
  $('leeg').style.display='none';
  $('resultaat').style.display='block';
  const alle=reviews.map(r=>r.score);
  const perMaand=groepeer(reviews,r=>maandKey(r.datum)).sort((a,b)=>a.key.localeCompare(b.key));
  const bestM=perMaand.reduce((m,x)=>(!m||x.gem>m.gem)?x:m,null);
  const slechtM=perMaand.reduce((m,x)=>(!m||x.gem<m.gem)?x:m,null);
  const perAct=groepeer(reviews,r=>r.activiteit).sort((a,b)=>b.gem-a.gem);
  const pool=perAct.filter(a=>a.n>=3); const actPool=pool.length?pool:perAct;   // min. 3 reacties, anders vertekent n=1 het beeld
  const bestA=actPool[0]||null, slechtA=actPool.length?actPool[actPool.length-1]:null;
  const tile=(v,label,cls,naam)=>'<div class="tile"><div class="v '+(cls||'')+'">'+fmtScore(v)+'</div><div class="l">'+label+(naam?'<div class="nm">'+esc(naam)+'</div>':'')+'</div></div>';
  const hero='<div class="sum-hero">'+donut(avg(alle))+'<div class="l">gemiddelde<br>'+reviews.length+' reacties</div></div>';
  let grid='';
  if(bestM) grid+=tile(bestM.gem,'beste maand: '+maandLabel(bestM.key),kl(bestM.gem));
  if(slechtM && perMaand.length>1) grid+=tile(slechtM.gem,'laagste maand: '+maandLabel(slechtM.key),kl(slechtM.gem));
  if(bestA) grid+=tile(bestA.gem,'beste activiteit',kl(bestA.gem),bestA.key);
  if(slechtA && actPool.length>1) grid+=tile(slechtA.gem,'laagste activiteit',kl(slechtA.gem),slechtA.key);
  $('sumTiles').innerHTML=hero+'<div class="sum-grid">'+grid+'</div>';
  vulRijen('perMaand', perMaand.map(m=>kaartRij(maandLabel(m.key),m.gem,m.n,()=>zetFilter({maand:m.key,act:'',datum:''},true))));
  vulRijen('perActiviteit', perAct.map(a=>kaartRij(a.key||'(zonder naam)',a.gem,a.n,()=>zetFilter({act:a.key,maand:'',datum:''},true))));
  const perTaal=groepeer(reviews,taalVan).sort((a,b)=>b.n-a.n);
  vulRijen('perTaal', perTaal.map(t=>kaartRij(t.key,t.gem,t.n,null)));
  // activiteiten-keuzelijst vullen
  const namen=Array.from(new Set(reviews.map(r=>r.activiteit).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  const fa=$('fAct'); if(fa) fa.innerHTML='<option value="">Alle activiteiten</option>'+namen.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('');
  $('telling').textContent=reviews.length+' reacties';
  renderReviews();
}

// ---------------------------------------------------------------- import-flow
async function importFile(file){
  const st=$('status'); st.className='status bezig'; st.textContent='Bestand inlezen…';
  try{
    let aoa;
    const naam=(file.name||'').toLowerCase();
    if(naam.endsWith('.csv')||naam.endsWith('.txt')){ aoa=parseCSV(await file.text()); }
    else { aoa=await parseXLSX(await file.arrayBuffer()); }
    const {reviews:nieuw,mapping}=mapTable(aoa);
    if(!nieuw.length){ st.className='status fout'; st.textContent='Geen reviews met een score gevonden. Klopt het bestand? (kolommen score/activiteit/datum/tekst)'; return; }
    if(mapping.score<0){ st.className='status fout'; st.textContent='Geen scorekolom gevonden.'; return; }
    // Samenvoegen met wat er al is; identieke reacties overslaan (geen dubbeltelling).
    const bestaand=laadOpgeslagenReviews();
    const gezien=new Set(bestaand.map(reviewKey));
    const toeTeVoegen=nieuw.filter(r=>{ const k=reviewKey(r); if(gezien.has(k)) return false; gezien.add(k); return true; });
    const dubbel=nieuw.length-toeTeVoegen.length;
    // Enkel de nieuwe reacties vertalen.
    const metTekst=toeTeVoegen.filter(r=>r.tekst).length;
    st.textContent=metTekst?('Vertalen… (0/'+metTekst+')'):'Samenvoegen…';
    await vertaalAlles(toeTeVoegen,(k,n)=>{ st.textContent='Vertalen… ('+k+'/'+n+')'; });
    const alles=bestaand.concat(toeTeVoegen);
    const data={reviews:alles, ts:Date.now(), bestand:file.name||''};
    bewaar(data);
    render(data);
    const fouten=toeTeVoegen.filter(r=>r._trFout).length;
    let msg='Klaar — '+toeTeVoegen.length+' nieuwe reacties toegevoegd';
    if(dubbel>0) msg+=' ('+dubbel+' stonden er al)';
    msg+=' · totaal '+alles.length+' reacties';
    if(fouten) msg+=' · '+fouten+' niet vertaald (probeer later opnieuw)';
    st.className='status klaar'; st.textContent=msg+'.';
  }catch(e){
    st.className='status fout'; st.textContent='Kon het bestand niet inlezen: '+(e&&e.message?e.message:e);
  }
}
function bewaar(data){
  try{ localStorage.setItem(K_DATA, JSON.stringify({ts:data.ts,bestand:data.bestand,
    reviews:data.reviews.map(r=>({score:r.score,activiteit:r.activiteit,datum:r.datum?r.datum.getTime():null,uur:r.uur,tekst:r.tekst,vertaald:r.vertaald,lang:r.lang,code:r.code}))})); }catch(e){}
}
// De al ingelezen reacties ophalen (datum terug als Date).
function laadOpgeslagenReviews(){
  try{ const raw=localStorage.getItem(K_DATA); if(!raw) return []; const o=JSON.parse(raw); if(!o||!Array.isArray(o.reviews)) return [];
    return o.reviews.map(r=>({score:r.score,activiteit:r.activiteit,datum:r.datum?new Date(r.datum):null,uur:r.uur,tekst:r.tekst,vertaald:r.vertaald,lang:r.lang,code:r.code}));
  }catch(e){ return []; }
}
// Vingerafdruk van één reactie — identieke reacties (zelfde boeking, datum, activiteit,
// uur, score én tekst) tellen maar één keer, ook bij dubbel uploaden of overlappende exports.
function reviewKey(r){
  const d=r.datum instanceof Date?r.datum.getTime():(r.datum||0);
  return (r.code||'')+'|'+d+'|'+(r.activiteit||'')+'|'+(r.uur||'')+'|'+r.score+'|'+(r.tekst||'');
}
function laadBewaard(){
  try{ const raw=localStorage.getItem(K_DATA); if(!raw) return; const o=JSON.parse(raw); if(!o||!Array.isArray(o.reviews)||!o.reviews.length) return;
    o.reviews.forEach(r=>{ r.datum=r.datum?new Date(r.datum):null; });
    render(o);
    $('status').className='status klaar';
    $('status').textContent='Laatste import: '+o.reviews.length+' reacties'+(o.bestand?(' · '+o.bestand):'')+'.';
  }catch(e){}
}

// ---------------------------------------------------------------- printen
function printOverzicht(){
  const w=window.open('','_blank'); if(!w){ alert('Kon het afdrukvenster niet openen (pop-ups toestaan).'); return; }
  const html=$('resultaat').innerHTML;
  const css='body{font-family:Arial,Helvetica,sans-serif;color:#1b2233;margin:24px;}'+
    '.donut,.rij-donut,.filterbar,.toolbar{display:none!important;}.tile{display:inline-block;margin:0 18px 10px 0;}.tile .v,.tile .l{display:block;}'+
    '.rij{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:6px 0;}'+
    '.reviewgrid{display:block;}.rv{border-bottom:1px solid #eee;padding:8px 0;}.rv-score{font-weight:bold;display:inline-block;width:34px;}'+
    '.rv-orig{color:#666;font-style:italic;font-size:12px;}.muted{color:#888;}h2{font-size:15px;margin:16px 0 6px;}';
  w.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Ratings</title><style>'+css+'</style></head><body><h1>Ratings-overzicht</h1>'+html+'</body></html>');
  w.document.close(); w.focus(); setTimeout(()=>{try{w.print();}catch(e){}},350);
}

// ---------------------------------------------------------------- thema
function initThema(){
  const b=$('themeBtn'); if(!b) return;
  const toe=t=>{ document.documentElement.setAttribute('data-theme',t); try{localStorage.setItem('bb_home_theme',t);}catch(e){} b.textContent=t==='dark'?'☀️':'🌙'; };
  let t='light'; try{ t=localStorage.getItem('bb_home_theme')|| (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'); }catch(e){}
  toe(t);
  b.onclick=()=>toe(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
}

// Is de op dit toestel ingelogde persoon een vaste medewerker? (rol staat in de gedeelde
// gebruikerslijst die entertainment.html lokaal bewaart — geen extra verbinding nodig.)
function isVaste(){
  try{
    const cu=JSON.parse(localStorage.getItem('bb_current_user')||'null');
    if(!cu) return false;
    let lijst=[]; try{ lijst=JSON.parse(localStorage.getItem('bb_gebruikers')||'[]')||[]; }catch(e){}
    if(!lijst.length){ try{ const c=JSON.parse(localStorage.getItem('bb_cache_v1')||'null'); if(c&&Array.isArray(c.gebruikers)) lijst=c.gebruikers; }catch(e){} }
    // eerst op id, anders op naam (account kan ooit opnieuw aangemaakt zijn met een nieuw id)
    let u=lijst.find(x=>x&&x.id===cu.id);
    if(!u){ const naam=String(cu.naam||'').trim().toLowerCase(); if(naam) u=lijst.find(x=>String((x&&x.naam)||'').trim().toLowerCase()===naam); }
    // 'rol' is een komma-lijst met etiketten (bv. "vast,admin") — zoals BBInv.heeftRol
    const tags=String(((u||cu)&&(u||cu).rol)||'').split(',').map(s=>s.trim()).filter(Boolean);
    return tags.indexOf('vast')>=0 || tags.indexOf('admin')>=0;
  }catch(e){ return false; }
}
// Beheer-wachtwoord (gedeeld) — zodat je ook zonder als jezelf ingelogd te zijn (bv. op het
// algemene toestel-account) kan importeren, net zoals elders in de app met beheer.
function beheerPin(){
  try{ const c=JSON.parse(localStorage.getItem('bb_appconfig')||'null'); if(c&&c.pin) return String(c.pin); }catch(e){}
  try{ const c=JSON.parse(localStorage.getItem('bb_cache_v1')||'null'); if(c&&c.appconfig&&c.appconfig.pin) return String(c.appconfig.pin); }catch(e){}
  const p=localStorage.getItem('bb_home_pin'); return p?String(p):'3920';
}

// ---------------------------------------------------------------- wiring
document.addEventListener('DOMContentLoaded',()=>{
  initThema();
  const inp=$('fileInput');
  if(inp) inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(f) importFile(f); inp.value=''; };
  // De knoppen staan er ALTIJD, maar werken enkel voor vaste medewerkers; anders een melding.
  function magBewerken(){
    if(isVaste()) return true;
    const p=prompt('Beheer-wachtwoord om de ratings te uploaden of wissen:');
    if(p===null) return false;
    if(p===beheerPin()) return true;
    alert('Onjuist wachtwoord. Enkel vaste medewerkers — of iemand met het beheer-wachtwoord — kunnen de ratings uploaden of wissen.');
    return false;
  }
  const importBtn=$('importBtn'), wisBtn=$('wisBtn'), leegImport=$('leegImport');
  if(importBtn){ importBtn.style.display=''; importBtn.onclick=()=>{ if(magBewerken()) inp&&inp.click(); }; }
  if(wisBtn){ wisBtn.style.display=''; wisBtn.onclick=()=>{ if(!magBewerken()) return; if(confirm('De ingelezen ratings van dit toestel wissen?')){ try{localStorage.removeItem(K_DATA);}catch(e){} location.reload(); } }; }
  if(leegImport){ leegImport.innerHTML='<button class="btn primary" id="leegImportBtn">📄 Ratings uploaden</button>'; const b=$('leegImportBtn'); if(b) b.onclick=()=>{ if(magBewerken()) inp&&inp.click(); }; }
  const pb=$('printBtn'); if(pb) pb.onclick=printOverzicht;
  // filter/zoek
  const fz=$('fZoek'); if(fz) fz.oninput=()=>{ _filter.zoek=fz.value.trim().toLowerCase(); renderReviews(); };
  const fd=$('fDatum'); if(fd) fd.onchange=()=>{ _filter.datum=fd.value; renderReviews(); };
  const fa=$('fAct'); if(fa) fa.onchange=()=>{ _filter.act=fa.value; _filter.maand=''; renderReviews(); };
  document.querySelectorAll('#fScore .chip').forEach(c=>{ c.onclick=()=>{
    _filter.score=(_filter.score===c.dataset.score)?'':(c.dataset.score||'');
    document.querySelectorAll('#fScore .chip').forEach(x=>x.classList.toggle('active',(x.dataset.score||'')===_filter.score));
    renderReviews();
  }; });
  const fr=$('fReset'); if(fr) fr.onclick=resetFilter;
  laadBewaard();
});

})();

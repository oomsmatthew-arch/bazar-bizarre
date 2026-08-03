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
      tekst:iText>=0?String(r[iText]||'').trim():''
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
function kaartRij(naam,sub,gem,n){
  return '<div class="rij"><div class="rij-donut">'+donut(gem)+'</div>'+
    '<div class="rij-nm"><div class="t">'+esc(naam)+'</div>'+(sub?'<div class="s">'+esc(sub)+'</div>':'')+'</div>'+
    '<div class="rij-n"><b>'+fmtScore(gem)+'</b><span>'+n+' reacties</span></div></div>';
}

function render(data){
  const reviews=data.reviews;
  $('leeg').style.display='none';
  $('resultaat').style.display='block';
  // samenvatting
  const alle=reviews.map(r=>r.score);
  const perMaand=groepeer(reviews,r=>r.datum?(r.datum.getFullYear()+'-'+String(r.datum.getMonth()+1).padStart(2,'0')):null)
    .sort((a,b)=>a.key.localeCompare(b.key));
  let best=null,slecht=null;
  perMaand.forEach(m=>{ if(!best||m.gem>best.gem)best=m; if(!slecht||m.gem<slecht.gem)slecht=m; });
  const mLabel=k=>{ const p=k.split('-'); return MND[+p[1]-1]+' '+p[0]; };
  $('sumTiles').innerHTML=
    '<div class="tile big">'+donut(avg(alle))+'<div class="l">gemiddelde · '+reviews.length+' reacties</div></div>'+
    (best?'<div class="tile"><div class="v goed">'+fmtScore(best.gem)+'</div><div class="l">beste: '+mLabel(best.key)+'</div></div>':'')+
    (slecht?'<div class="tile"><div class="v '+kl(slecht.gem)+'">'+fmtScore(slecht.gem)+'</div><div class="l">laagste: '+mLabel(slecht.key)+'</div></div>':'');
  // per maand
  $('perMaand').innerHTML=perMaand.map(m=>kaartRij(mLabel(m.key),'',m.gem,m.n)).join('')||'<p class="muted">Geen datums gevonden.</p>';
  // per activiteit (hoogste eerst)
  const perAct=groepeer(reviews,r=>r.activiteit).sort((a,b)=>b.gem-a.gem);
  $('perActiviteit').innerHTML=perAct.map(a=>kaartRij(a.key||'(zonder naam)','',a.gem,a.n)).join('')||'<p class="muted">Geen activiteiten gevonden.</p>';
  // per taal
  const perTaal=groepeer(reviews,taalVan).sort((a,b)=>b.n-a.n);
  $('perTaal').innerHTML=perTaal.length?perTaal.map(t=>kaartRij(t.key,'',t.gem,t.n)).join(''):'<p class="muted">Nog geen taal bekend (vertaling nodig).</p>';
  // reviewlijst (nieuwste eerst)
  const lijst=reviews.slice().sort((a,b)=>((b.datum?b.datum.getTime():0)-(a.datum?a.datum.getTime():0)));
  $('reviewList').innerHTML=lijst.map(r=>{
    const c=kl(r.score);
    const orig=(r.tekst && r.vertaald && r.tekst!==r.vertaald)?'<div class="rv-orig">origineel: '+esc(r.tekst)+'</div>':'';
    const tekst=r.vertaald||r.tekst||'<span class="muted">— geen tekst —</span>';
    return '<div class="rv"><div class="rv-score '+c+'">'+fmtScore(r.score)+'</div>'+
      '<div class="rv-body"><div class="rv-top"><b>'+esc(r.activiteit||'—')+'</b>'+
      (r.datum?'<span class="rv-datum">'+fmtDate(r.datum)+(r.uur?' · '+esc(r.uur):'')+'</span>':'')+
      (taalVan(r)?'<span class="rv-taal">'+esc(taalVan(r))+'</span>':'')+'</div>'+
      '<div class="rv-tekst">'+(r.vertaald?esc(tekst):tekst)+'</div>'+orig+'</div></div>';
  }).join('');
  $('telling').textContent=reviews.length+' reacties';
}

// ---------------------------------------------------------------- import-flow
async function importFile(file){
  const st=$('status'); st.className='status bezig'; st.textContent='Bestand inlezen…';
  try{
    let aoa;
    const naam=(file.name||'').toLowerCase();
    if(naam.endsWith('.csv')||naam.endsWith('.txt')){ aoa=parseCSV(await file.text()); }
    else { aoa=await parseXLSX(await file.arrayBuffer()); }
    const {reviews,mapping}=mapTable(aoa);
    if(!reviews.length){ st.className='status fout'; st.textContent='Geen reviews met een score gevonden. Klopt het bestand? (kolommen score/activiteit/datum/tekst)'; return; }
    if(mapping.score<0){ st.className='status fout'; st.textContent='Geen scorekolom gevonden.'; return; }
    // vertalen
    const metTekst=reviews.filter(r=>r.tekst).length;
    st.textContent='Vertalen… (0/'+metTekst+')';
    await vertaalAlles(reviews,(k,n)=>{ st.textContent='Vertalen… ('+k+'/'+n+')'; });
    const data={reviews, ts:Date.now(), bestand:file.name||''};
    bewaar(data);
    render(data);
    const fouten=reviews.filter(r=>r._trFout).length;
    st.className='status klaar';
    st.textContent='Klaar — '+reviews.length+' reacties ingelezen'+(fouten?(' ('+fouten+' niet vertaald — probeer later opnieuw)'):'')+'.';
  }catch(e){
    st.className='status fout'; st.textContent='Kon het bestand niet inlezen: '+(e&&e.message?e.message:e);
  }
}
function bewaar(data){
  try{ localStorage.setItem(K_DATA, JSON.stringify({ts:data.ts,bestand:data.bestand,
    reviews:data.reviews.map(r=>({score:r.score,activiteit:r.activiteit,datum:r.datum?r.datum.getTime():null,uur:r.uur,tekst:r.tekst,vertaald:r.vertaald,lang:r.lang}))})); }catch(e){}
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
    '.donut,.rij-donut{display:none;}.tile{display:inline-block;margin:0 18px 10px 0;}.tile .v,.tile .l{display:block;}'+
    '.rij{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:6px 0;}'+
    '.rv{border-bottom:1px solid #eee;padding:8px 0;}.rv-score{font-weight:bold;display:inline-block;width:34px;}'+
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

// ---------------------------------------------------------------- wiring
document.addEventListener('DOMContentLoaded',()=>{
  initThema();
  const inp=$('fileInput'), dz=$('dropZone');
  if(inp) inp.onchange=()=>{ const f=inp.files&&inp.files[0]; if(f) importFile(f); inp.value=''; };
  if(dz){
    dz.onclick=()=>inp&&inp.click();
    dz.ondragover=e=>{ e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave=()=>dz.classList.remove('over');
    dz.ondrop=e=>{ e.preventDefault(); dz.classList.remove('over'); const f=e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) importFile(f); };
  }
  const pb=$('printBtn'); if(pb) pb.onclick=printOverzicht;
  const wb=$('wisBtn'); if(wb) wb.onclick=()=>{ if(confirm('De ingelezen ratings van dit toestel wissen?')){ try{localStorage.removeItem(K_DATA);}catch(e){} location.reload(); } };
  laadBewaard();
});

})();

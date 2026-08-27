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
// ---- Gedeelde opslag: ratings syncen over alle toestellen (Supabase, aparte rij id=3 in de gedeelde tabel) ----
const SB_URL='https://tbromtomzglqtuyezoav.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicm9tdG9temdscXR1eWV6b2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDg0MjQsImV4cCI6MjA5NzA4NDQyNH0.RxcKKWjEcat3ji4iUjByO5WxBSL0yvZMBvfzkoM3Jrc';
let _sb=null;
function sbClient(){ if(_sb) return _sb; if(!(window.supabase&&window.supabase.createClient)) return null; try{ _sb=window.supabase.createClient(SB_URL,SB_KEY); }catch(e){ _sb=null; } return _sb; }
async function laadGedeeldRaw(){ const sb=sbClient(); if(!sb) return null;
  try{ const r=await sb.from('spelarchief').select('data').eq('id',3).maybeSingle();
    if(r && !r.error && r.data && r.data.data && Array.isArray(r.data.data.reviews)) return r.data.data; }catch(e){}
  return null; }
// Bewaart de volledige set (rij id=3) én een piepklein "versie"-vinkje (rij id=4: {ts,n}),
// zodat andere toestellen snel kunnen zien of er iets veranderd is zonder de grote set op te halen.
async function bewaarGedeeld(serial){ const sb=sbClient(); if(!sb) return false;
  try{ const meta={ts:serial.ts, n:(serial.reviews||[]).length};
    const r=await sb.from('spelarchief').upsert([{id:3,data:serial},{id:4,data:meta}]); return !(r&&r.error); }catch(e){ return false; } }
async function laadGedeeldMeta(){ const sb=sbClient(); if(!sb) return null;
  try{ const r=await sb.from('spelarchief').select('data').eq('id',4).maybeSingle();
    if(r && !r.error && r.data && r.data.data) return r.data.data; }catch(e){}
  return null; }
// Gedeelde + lokale ratings SAMENVOEGEN (union, dubbels eruit). Eerst een snelle versiecontrole:
// is de gedeelde versie gelijk aan wat we lokaal hebben, dan halen we de grote set NIET op (snel!).
async function syncGedeeld(){
  let lokaal=null; try{ const raw=localStorage.getItem(K_DATA); if(raw) lokaal=JSON.parse(raw); }catch(e){}
  const lRev=(lokaal&&Array.isArray(lokaal.reviews))?lokaal.reviews:[];
  const meta=await laadGedeeldMeta();
  if(meta && lokaal && meta.ts===lokaal.ts && +meta.n===lRev.length) return lokaal; // niets veranderd → klaar
  const gedeeld=await laadGedeeldRaw();
  const gRev=(gedeeld&&Array.isArray(gedeeld.reviews))?gedeeld.reviews:[];
  if(!gRev.length && !lRev.length) return null;
  const seen={}, union=[];
  gRev.concat(lRev).forEach(r=>{ const k=reviewKey(r); if(!seen[k]){ seen[k]=1; union.push(r); } });
  const veranderd = union.length!==gRev.length; // lokaal had extra's (of gedeeld was leeg)
  const data={ ts: veranderd?Date.now():((gedeeld&&gedeeld.ts)||(lokaal&&lokaal.ts)||Date.now()),
    bestand:(gedeeld&&gedeeld.bestand)||(lokaal&&lokaal.bestand)||'', reviews:union };
  try{ localStorage.setItem(K_DATA,JSON.stringify(data)); }catch(e){}
  if(veranderd) bewaarGedeeld(data); // gedeelde set aanvullen + nieuwe versie
  return data;
}
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
// Boekjaar loopt van 1 oktober t/m 30 september. Sleutel = startjaar (bv. okt 2025–sep 2026 → "2025").
function boekjaarKey(d){ if(!(d instanceof Date)||isNaN(d)) return ''; const y=d.getFullYear(),m=d.getMonth(); return String(m>=9?y:y-1); }
function boekjaarLabel(k){ return k+'–'+(+k+1); }

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
let _filter={zoek:'',datum:'',act:'',maand:'',score:'',taal:''};
let _data=null; let _boekjaar=''; let _boekjaarInit=false; // gekozen boekjaar ('' = alle); standaard het recentste
// Thema-categorieën voor de activiteiten (afgeleid uit de naam) — voor de filterknopjes.
// Een activiteit kan in meerdere thema's vallen (bv. "Orry & Vrienden Pieten Disco" = O&F én Sint).
const ACT_CATS=[
  {key:'of',label:'O&F',re:/orry|o\s*&\s*f|vrienden|freunde|friends/i},
  {key:'avond',label:'Avond',re:/quiz|prize night|crazy game|dr[oô]les?\s*de\s*jeux|live[\s-]*mu|musique live|chill tunes|concert|bingo|pirate|piraat/i},
  {key:'sint',label:'Sint',re:/sint|piet|nikolaus|ruprecht|knecht|pepernot|nicolas|soulier|pierre/i},
  {key:'halloween',label:'Halloween',re:/hallow|griezel|grusel/i},
  {key:'kerst',label:'Kerst',re:/kerst|christmas|weihnacht|noe?l|santa|kerstman/i},
  {key:'nieuwjaar',label:'Nieuwjaar',re:/nieuwjaar|new year|neujahr|nouvel an|silvester|oud.{0,4}nieuw/i},
  {key:'valentijn',label:'Valentijn',re:/valentij?n|valentine|valentin/i},
  {key:'carnaval',label:'Carnaval',re:/carnaval|carnival|fasching|karneval/i},
  {key:'pasen',label:'Pasen',re:/pasen|paas|easter|ostern|p[aâ]ques/i},
  {key:'zomer',label:'Zomer',re:/zomer|summer|sommer|beach|strand/i}
];
// Taalvarianten van dezelfde activiteit samenvoegen tot één naam (NL/DE/EN/FR).
// Specifiekste regels eerst; wie nergens matcht, houdt zijn eigen naam.
const ACT_CANON=[
  {naam:'O&F: Pieten Spelshow', re:/pieten\s*spel-?show|spiel-?show\s*mit\s*ruprecht/i},
  {naam:'O&F: Pieten Disco', re:/pieten\s*disco/i},
  {naam:'O&F: Carnaval Disco', re:/carnaval\s*disco/i},
  {naam:'Pieten bezoek Cottage', re:/(pieten|ruprecht|knecht)[^,]{0,30}cottage|cottage[^,]{0,30}(ruprecht|knecht)/i},
  {naam:'Meet & Greet Sinterklaas', re:/meet\s*&\s*greet[^,]{0,40}(nikolaus|nicolas|sinterklaas|piet|pierre)|(nikolaus|sinterklaas)[^,]{0,40}meet\s*&\s*greet/i},
  {naam:'Schoen zetten (Sint)', re:/nikolausstiefel|petit\s*soulier|schoen\s*zetten/i},
  {naam:'Wannabe Pepernotenpiet', re:/pepernot/i},
  {naam:'O&F: Halloween-avontuur', re:/(avontuur|aventure|abenteuer|adventure)[^,]{0,15}halloween|halloween[\s-]{0,3}(avontuur|aventure|abenteuer|adventure)/i},
  {naam:'O&F: Knotsgekke Spelshow', re:/knotsgekke\s*spel-?show|verrückte\s*spiel-?show/i},
  {naam:'O&F: Kids Disco', re:/kids\s*disco/i},
  {naam:'O&F: Pool Party', re:/(pool|paul)\s*party/i},
  {naam:'O&F: op taxibezoek', re:/taxi/i},
  {naam:'O&F: bij je cottage', re:/orry[^,]{0,30}(cottage|ferienhaus)/i},
  {naam:'O&F: Voorleesverhaaltjes', re:/voorlees|bedtime|gute\s*nacht|raconte|histoire/i},
  {naam:'O&F: verjaardagsfeest', re:/geburtstag|birthday|verjaardag/i},
  {naam:'O&F: Meet & Greet', re:/orry[^,]{0,25}meet\s*&\s*greet/i},
  {naam:'O&F: Show', re:/orry[^,]{0,25}:\s*show\s*$/i},
  {naam:'Family Quiz Night', re:/quiz/i},
  {naam:'Crazy Game Time', re:/crazy\s*game|dr[oô]les?\s*de\s*jeux/i},
  {naam:'Live muziek', re:/live[\s-]*mu|musique\s*live/i},
  {naam:'Halloween griezeltocht', re:/griezeltocht|grusellauf|halloween[^,]{0,30}(griezel|grusel|promenade|magique|zauber)|promenade[^,]{0,30}halloween/i}
];
function canonAct(naam){ const n=String(naam||''); for(let i=0;i<ACT_CANON.length;i++){ if(ACT_CANON[i].re.test(n)) return ACT_CANON[i].naam; } return n; }
let _perAct=[]; let _actCat='';
function renderPerAct(){
  const cat=ACT_CATS.find(c=>c.key===_actCat);
  const lijst=cat?_perAct.filter(a=>cat.re.test(a.key||'')):_perAct;
  const tot=$('actTotaal');
  if(tot){
    if(cat && lijst.length){
      let n=0,s=0; lijst.forEach(a=>{ n+=a.n; s+=a.gem*a.n; });
      const gem=n?s/n:0;
      tot.innerHTML='<div class="rij"><div class="rij-donut">'+donut(gem)+'</div><div class="rij-nm"><div class="t">'+esc(cat.label)+' — samen</div></div><div class="rij-n"><b>'+fmtScore(gem)+'</b><span>'+n+' reacties</span></div></div>';
      tot.style.display='';
    } else { tot.innerHTML=''; tot.style.display='none'; }
  }
  vulRijen('perActiviteit', lijst.map(a=>kaartRij(a.key||'(zonder naam)',a.gem,a.n,()=>zetFilter({act:a.key,maand:'',datum:'',taal:''},true))));
  if(!lijst.length) $('perActiviteit').innerHTML='<p class="muted">Geen activiteiten in deze categorie.</p>';
}
function renderActCats(){
  const el=$('actCats'); if(!el) return;
  const cats=ACT_CATS.filter(c=>_perAct.some(a=>c.re.test(a.key||'')));
  let html='<button class="chip'+(_actCat===''?' active':'')+'" data-cat="">Alle <b>'+_perAct.length+'</b></button>';
  cats.forEach(c=>{ const n=_perAct.filter(a=>c.re.test(a.key||'')).length; html+='<button class="chip'+(_actCat===c.key?' active':'')+'" data-cat="'+c.key+'">'+c.label+' <b>'+n+'</b></button>'; });
  el.innerHTML=html;
  el.querySelectorAll('.chip').forEach(b=>{ b.onclick=()=>{ _actCat=b.dataset.cat||''; renderActCats(); renderPerAct(); }; });
}
// De activiteitenlijst even hoog maken als "per maand" + "per taal" samen (links) en dan
// intern laten scrollen, zodat de pagina niet eindeloos lang wordt. Op smalle schermen niet.
function syncActHoogte(){
  const links=document.querySelector('.overzichten2 .ov-col:first-child');
  const paneel=document.querySelector('.overzichten2 .ov-col:last-child .ov');
  const lijst=$('perActiviteit');
  if(!links||!paneel||!lijst) return;
  if(window.matchMedia && window.matchMedia('(max-width:760px)').matches){ lijst.style.maxHeight=''; lijst.style.overflowY=''; return; }
  const doel=links.getBoundingClientRect().height;
  const boven=lijst.getBoundingClientRect().top - paneel.getBoundingClientRect().top; // titel + thema-knopjes + marge
  const max=Math.max(160, Math.round(doel - boven - 16));
  lijst.style.maxHeight=max+'px';
  lijst.style.overflowY='auto';
}
function renderReviews(){
  const f=_filter;
  const list=_reviews.filter(r=>{
    if(f.act && canonAct(r.activiteit)!==f.act) return false;
    if(f.maand && maandKey(r.datum)!==f.maand) return false;
    if(f.datum && fmtISO(r.datum)!==f.datum) return false;
    if(f.score && kl(r.score)!==f.score) return false;
    if(f.taal && taalVan(r)!==f.taal) return false;
    if(f.zoek){ const hay=((r.activiteit||'')+' '+(r.tekst||'')+' '+(r.vertaald||'')).toLowerCase(); if(hay.indexOf(f.zoek)<0) return false; }
    return true;
  }).sort((a,b)=>((b.datum?b.datum.getTime():0)-(a.datum?a.datum.getTime():0)));
  const actief=!!(f.act||f.maand||f.datum||f.score||f.zoek||f.taal);
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
function resetFilter(){ zetFilter({zoek:'',datum:'',act:'',maand:'',score:'',taal:''},false); }

let _perMaand=[]; let _maandSort='nieuw'; // 'nieuw' = recentste maand bovenaan
function renderPerMaand(){
  const arr=_perMaand.slice().sort((a,b)=>a.key.localeCompare(b.key)); // oud → nieuw
  if(_maandSort==='nieuw') arr.reverse();
  vulRijen('perMaand', arr.map(m=>kaartRij(maandLabel(m.key),m.gem,m.n,()=>zetFilter({maand:m.key,act:'',datum:'',taal:''},true))));
  const b=$('maandSort'); if(b) b.textContent=(_maandSort==='nieuw'?'nieuwste eerst':'oudste eerst')+' ⇅';
}
function render(data){
  _data=data;
  const bron=data.reviews;
  const bj=Array.from(new Set(bron.map(r=>boekjaarKey(r.datum)).filter(Boolean))).sort().reverse();
  if(!_boekjaarInit && bj.length){ _boekjaar=bj[0]; _boekjaarInit=true; } // standaard het recentste boekjaar
  if(_boekjaar && bj.indexOf(_boekjaar)<0) _boekjaar='';
  const reviews = _boekjaar ? bron.filter(r=>boekjaarKey(r.datum)===_boekjaar) : bron;
  _reviews=reviews;
  $('leeg').style.display='none';
  $('resultaat').style.display='block';
  const bs=$('boekjaar'); if(bs){ bs.innerHTML='<option value="">Alle boekjaren</option>'+bj.map(k=>'<option value="'+k+'">Boekjaar '+boekjaarLabel(k)+'</option>').join(''); bs.value=_boekjaar; }
  const alle=reviews.map(r=>r.score);
  const perMaand=groepeer(reviews,r=>maandKey(r.datum)).sort((a,b)=>a.key.localeCompare(b.key));
  const bestM=perMaand.reduce((m,x)=>(!m||x.gem>m.gem)?x:m,null);
  const slechtM=perMaand.reduce((m,x)=>(!m||x.gem<m.gem)?x:m,null);
  const perAct=groepeer(reviews,r=>canonAct(r.activiteit)).sort((a,b)=>b.gem-a.gem);
  // Beste/laagste ACTIVITEIT van de recentste maand (perMaand is oplopend gesorteerd → laatste = recentste).
  const laatste=perMaand.length?perMaand[perMaand.length-1].key:'';
  const maandRev=reviews.filter(r=>maandKey(r.datum)===laatste);
  const perActM=groepeer(maandRev,r=>canonAct(r.activiteit)).sort((a,b)=>b.gem-a.gem);
  const poolM=perActM.filter(a=>a.n>=2); const actPool=(poolM.length>=2)?poolM:perActM;
  const bestA=actPool[0]||null, slechtA=actPool.length?actPool[actPool.length-1]:null;
  const tile=(v,label,cls,naam)=>'<div class="tile"><div class="v '+(cls||'')+'">'+fmtScore(v)+'</div><div class="l">'+label+(naam?'<div class="nm">'+esc(naam)+'</div>':'')+'</div></div>';
  const hero='<div class="sum-hero">'+donut(avg(alle))+'<div class="l">gemiddelde<br>'+reviews.length+' reacties</div></div>';
  let grid='';
  if(bestM) grid+=tile(bestM.gem,'beste maand',kl(bestM.gem),maandLabel(bestM.key).replace(/^./,c=>c.toUpperCase()));
  if(slechtM && perMaand.length>1) grid+=tile(slechtM.gem,'laagste maand',kl(slechtM.gem),maandLabel(slechtM.key).replace(/^./,c=>c.toUpperCase()));
  const mlab=laatste?maandLabel(laatste):'';
  if(bestA) grid+=tile(bestA.gem,'beste activiteit'+(mlab?' · '+mlab:''),kl(bestA.gem),bestA.key);
  if(slechtA && actPool.length>1) grid+=tile(slechtA.gem,'laagste activiteit'+(mlab?' · '+mlab:''),kl(slechtA.gem),slechtA.key);
  $('sumTiles').innerHTML=hero+'<div class="sum-grid">'+grid+'</div>';
  _perMaand=perMaand; renderPerMaand();
  _perAct=perAct; renderActCats(); renderPerAct();
  const perTaal=groepeer(reviews,taalVan).sort((a,b)=>b.n-a.n);
  vulRijen('perTaal', perTaal.map(t=>kaartRij(t.key,t.gem,t.n,()=>zetFilter({taal:t.key,act:'',maand:'',datum:''},true))));
  // activiteiten-keuzelijst vullen
  const namen=Array.from(new Set(reviews.map(r=>canonAct(r.activiteit)).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
  const fa=$('fAct'); if(fa) fa.innerHTML='<option value="">Alle activiteiten</option>'+namen.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join('');
  $('telling').textContent=reviews.length+' reacties';
  renderReviews();
  if(typeof requestAnimationFrame!=='undefined') requestAnimationFrame(syncActHoogte); else syncActHoogte();
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
    // Eerst de GEDEELDE set (van alle toestellen) vers ophalen, dan samenvoegen (geen dubbeltelling).
    st.textContent='Gedeelde ratings ophalen…'; await syncGedeeld();
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
function serialiseer(data){ return {ts:data.ts,bestand:data.bestand,
  reviews:data.reviews.map(r=>({score:r.score,activiteit:r.activiteit,datum:(r.datum instanceof Date?r.datum.getTime():(r.datum||null)),uur:r.uur,tekst:r.tekst,vertaald:r.vertaald,lang:r.lang,code:r.code}))}; }
function bewaar(data){
  const s=serialiseer(data);
  try{ localStorage.setItem(K_DATA, JSON.stringify(s)); }catch(e){}
  bewaarGedeeld(s); // ook delen zodat alle toestellen het zien
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
function fmtNu(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear(); }
// Keuzemenu: boekjaar, maand, categorie + welke onderdelen.
function vulPrintOpties(){
  const bron=(_data&&_data.reviews)||[];
  const bj=Array.from(new Set(bron.map(r=>boekjaarKey(r.datum)).filter(Boolean))).sort().reverse();
  const mnd=Array.from(new Set(bron.map(r=>maandKey(r.datum)).filter(Boolean))).sort().reverse();
  const pb=$('pBoekjaar'); if(pb){ pb.innerHTML='<option value="">Alle boekjaren</option>'+bj.map(k=>'<option value="'+k+'">Boekjaar '+boekjaarLabel(k)+'</option>').join(''); pb.value=_boekjaar||''; }
  const pm=$('pMaand'); if(pm) pm.innerHTML='<option value="">Alle maanden</option>'+mnd.map(k=>'<option value="'+k+'">'+maandLabel(k)+'</option>').join('');
  const pc=$('pCat'); if(pc) pc.innerHTML='<option value="">Alle categorieën</option>'+ACT_CATS.map(c=>'<option value="'+c.key+'">'+c.label+'</option>').join('');
}
function openPrintDialog(){ if(!_data){ alert('Nog geen gegevens om af te drukken.'); return; } vulPrintOpties(); $('printModal').classList.add('open'); }
function sluitPrint(){ const m=$('printModal'); if(m) m.classList.remove('open'); }
window.bbVensterSluiters={ printModal:sluitPrint }; // terugknop sluit het printvenster (zie js/terug.js)
function doePrint(){
  const o={ boekjaar:$('pBoekjaar').value, maand:$('pMaand').value, categorie:$('pCat').value,
    samenv:$('pSamenv').checked, mnd:$('pMnd').checked, act:$('pAct').checked, taal:$('pTaal').checked, reacties:$('pReacties').checked };
  sluitPrint();
  const w=window.open('','_blank'); if(!w){ alert('Kon het afdrukvenster niet openen (sta pop-ups toe voor deze site).'); return; }
  const css='body{font-family:Arial,Helvetica,sans-serif;color:#1b2233;margin:26px;}'+
    'h1{font-size:21px;margin:0 0 2px;}.sub{color:#666;font-size:12px;margin-bottom:14px;}'+
    'h2{font-size:15px;margin:18px 0 6px;color:#2f6450;border-bottom:2px solid #cfe0c8;padding-bottom:3px;}'+
    'table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:6px;}'+
    'th,td{border:1px solid #d5ddd0;padding:5px 9px;text-align:left;}th{background:#f0f5ec;}'+
    'td.n,th.n{text-align:right;white-space:nowrap;width:92px;}'+
    '.kv{display:flex;gap:24px;flex-wrap:wrap;margin:6px 0 4px;}.kv div{font-size:12px;color:#666;}.kv b{display:block;font-size:20px;color:#2f6450;}'+
    '.rev{border-bottom:1px solid #eee;padding:6px 0;font-size:12px;}.rev .s{font-weight:bold;display:inline-block;width:34px;}.rev .o{color:#777;font-style:italic;}'+
    '.g{color:#2f9e57;}.a{color:#e08a1e;}.r{color:#c0392b;}';
  w.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Ratings-overzicht</title><style>'+css+'</style></head><body>'+bouwPrintHtml(o)+'</body></html>');
  w.document.close(); w.focus(); setTimeout(function(){ try{ w.print(); }catch(e){} }, 400);
}
function bouwPrintHtml(o){
  let rev=((_data&&_data.reviews)||[]).slice();
  if(o.boekjaar) rev=rev.filter(r=>boekjaarKey(r.datum)===o.boekjaar);
  if(o.maand) rev=rev.filter(r=>maandKey(r.datum)===o.maand);
  const cat=ACT_CATS.find(c=>c.key===o.categorie);
  if(cat) rev=rev.filter(r=>cat.re.test(canonAct(r.activiteit)||''));
  const f=[]; if(o.boekjaar)f.push('Boekjaar '+boekjaarLabel(o.boekjaar)); if(o.maand)f.push(maandLabel(o.maand)); if(cat)f.push('Categorie '+cat.label);
  const kl3=v=>v>=4?'g':(v>=3?'a':'r');
  let h='<h1>Ratings-overzicht</h1><div class="sub">'+(f.length?esc(f.join(' · ')):'Alle gegevens')+' — '+rev.length+' reacties · afgedrukt op '+fmtNu()+'</div>';
  if(!rev.length) return h+'<p>Geen reacties voor deze selectie.</p>';
  if(o.samenv){
    const gem=avg(rev.map(r=>r.score));
    const pm=groepeer(rev,r=>maandKey(r.datum)).sort((a,b)=>a.key.localeCompare(b.key));
    const bM=pm.reduce((m,x)=>(!m||x.gem>m.gem)?x:m,null), sM=pm.reduce((m,x)=>(!m||x.gem<m.gem)?x:m,null);
    const pa=groepeer(rev,r=>canonAct(r.activiteit)).sort((a,b)=>b.gem-a.gem);
    h+='<div class="kv"><div>Gemiddelde<b class="'+kl3(gem)+'">'+fmtScore(gem)+'</b>'+rev.length+' reacties</div>'+
      (bM?'<div>Beste maand<b>'+fmtScore(bM.gem)+'</b>'+esc(maandLabel(bM.key))+'</div>':'')+
      (sM&&pm.length>1?'<div>Laagste maand<b>'+fmtScore(sM.gem)+'</b>'+esc(maandLabel(sM.key))+'</div>':'')+
      (pa[0]?'<div>Beste activiteit<b>'+fmtScore(pa[0].gem)+'</b>'+esc(pa[0].key)+'</div>':'')+
      (pa.length>1?'<div>Laagste activiteit<b>'+fmtScore(pa[pa.length-1].gem)+'</b>'+esc(pa[pa.length-1].key)+'</div>':'')+'</div>';
  }
  const tabel=(titel,rows)=> rows.length?('<h2>'+esc(titel)+'</h2><table><tr><th>Naam</th><th class="n">Gemiddelde</th><th class="n">Reacties</th></tr>'+rows.map(r=>'<tr><td>'+esc(r.naam)+'</td><td class="n">'+fmtScore(r.gem)+'</td><td class="n">'+r.n+'</td></tr>').join('')+'</table>'):'';
  if(o.mnd) h+=tabel('Per maand',groepeer(rev,r=>maandKey(r.datum)).sort((a,b)=>b.key.localeCompare(a.key)).map(m=>({naam:maandLabel(m.key),gem:m.gem,n:m.n})));
  if(o.act) h+=tabel('Per activiteit'+(cat?' — '+cat.label:''),groepeer(rev,r=>canonAct(r.activiteit)).sort((a,b)=>b.gem-a.gem).map(a=>({naam:a.key,gem:a.gem,n:a.n})));
  if(o.taal) h+=tabel('Per taal',groepeer(rev,taalVan).sort((a,b)=>b.n-a.n).map(t=>({naam:t.key,gem:t.gem,n:t.n})));
  if(o.reacties){
    const lijst=rev.slice().sort((a,b)=>((b.datum?b.datum.getTime():0)-(a.datum?a.datum.getTime():0)));
    h+='<h2>Alle reacties ('+lijst.length+')</h2>'+lijst.map(r=>{
      const t=r.vertaald||r.tekst||'—';
      const orig=(r.tekst&&r.vertaald&&r.tekst!==r.vertaald)?'<div class="o">origineel: '+esc(r.tekst)+'</div>':'';
      return '<div class="rev"><span class="s '+kl3(r.score)+'">'+fmtScore(r.score)+'</span> <b>'+esc(canonAct(r.activiteit)||'—')+'</b> '+(r.datum?'· '+fmtDate(r.datum):'')+(taalVan(r)?' · '+esc(taalVan(r)):'')+'<div>'+esc(t)+'</div>'+orig+'</div>';
    }).join('');
  }
  return h;
}

// ---------------------------------------------------------------- thema
// Zit sinds v6.1 in js/topbar.js, bij de balk waar het maantje in staat. De kopie die
// hier stond bewaarde meteen de stand van het toestel als "jouw keuze", waardoor deze
// pagina daarna niet meer meeging als je gsm 's avonds op donker sprong.

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
  if(!document.getElementById('resultaat')) return; // andere pagina (bv. vergelijk) — enkel de gedeelde API is nodig
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
  const pb=$('printBtn'); if(pb) pb.onclick=openPrintDialog;
  const pa=$('pAfdruk'); if(pa) pa.onclick=doePrint;
  const pan=$('pAnnuleer'); if(pan) pan.onclick=sluitPrint;
  const pmod=$('printModal'); if(pmod) pmod.onclick=e=>{ if(e.target===pmod) sluitPrint(); };
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
  const ms=$('maandSort'); if(ms) ms.onclick=()=>{ _maandSort=(_maandSort==='nieuw')?'oud':'nieuw'; renderPerMaand(); };
  const bjs=$('boekjaar'); if(bjs) bjs.onchange=()=>{ _boekjaar=bjs.value; if(_data) render(_data); };
  window.addEventListener('resize',syncActHoogte);
  // Staat er al iets op dit toestel? Dan meteen tonen en op de achtergrond verversen.
  let heeftLokaal=false, voorN=0;
  try{ const raw=localStorage.getItem(K_DATA); const d=raw&&JSON.parse(raw); if(d&&d.reviews){ voorN=d.reviews.length; heeftLokaal=voorN>0; } }catch(e){}
  laadBewaard();
  const verbergLaden=()=>{ const o=$('laadOverlay'); if(o) o.classList.add('weg'); };
  if(heeftLokaal) verbergLaden();            // meteen de pagina; update volgt vanzelf
  else setTimeout(verbergLaden, 6000);       // nog niks te tonen → kort wachten op de eerste sync
  // Op de achtergrond bijwerken; enkel opnieuw tekenen als er echt iets bijgekomen is
  // (zo wist een achtergrond-update nooit een filter die je net had ingesteld).
  syncGedeeld().then(d=>{ const naN=(d&&d.reviews)?d.reviews.length:0; if(naN!==voorN) laadBewaard(); verbergLaden(); }).catch(verbergLaden);
});

// Gedeelde API voor andere pagina's (bv. de vergelijk-pagina).
window.Ratings={ canonAct:canonAct, groepeer:groepeer, avg:avg, fmtScore:fmtScore, kl:kl,
  maandKey:maandKey, maandLabel:maandLabel, taalVan:taalVan, boekjaarKey:boekjaarKey, boekjaarLabel:boekjaarLabel,
  esc:esc, fmtDate:fmtDate, MND:MND, laadReviews:laadOpgeslagenReviews, syncGedeeld:syncGedeeld };
})();

// Gedeelde inventaris-motor voor Bazar Bizarre — nu via Supabase (gedeeld + realtime).
// Werking: bij het laden halen we alles op in een lokale cache. De bestaande schermen
// lezen synchroon uit die cache (BBInv.getPrijzen() enz.). Schrijven gaat meteen naar
// de cache (zodat de UI direct reageert) én op de achtergrond naar Supabase. Via realtime
// worden wijzigingen van andere toestellen automatisch ingeladen.
(function(){
  const SUPABASE_URL='https://tbromtomzglqtuyezoav.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicm9tdG9temdscXR1eWV6b2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDg0MjQsImV4cCI6MjA5NzA4NDQyNH0.RxcKKWjEcat3ji4iUjByO5WxBSL0yvZMBvfzkoM3Jrc';

  let sb=null, ready=false, onChange=null;
  const cache={prijzen:[],boekjes:{stock:0},formulieren:[],leveringen:[]};

  function uid(){return 'i'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
  function fire(){ if(onChange) try{onChange();}catch(e){console.error(e);} }
  function err(r){ if(r&&r.error) console.error('Supabase:', r.error.message||r.error); }

  // ---- mapping database <-> app (app gebruikt inGebruik, db gebruikt in_gebruik) ----
  const fromRow=r=>({id:r.id,cat:r.cat,naam:r.naam,stock:r.stock||0,inGebruik:!!r.in_gebruik,foto:r.foto||''});
  const toRow=p=>({id:p.id,cat:p.cat==='groot'?'groot':'klein',naam:p.naam||'',stock:+p.stock||0,in_gebruik:!!p.inGebruik,foto:p.foto||''});
  const mapForm=r=>({id:r.id,ts:r.ts,namen:r.namen||'',kleine:r.kleine||[],groot:r.groot||[],boekjes:r.boekjes||{},finale:r.finale||'',opmerking:r.opmerking||''});

  // ---------------- INIT ----------------
  async function init(){
    if(!window.supabase){console.error('Supabase library niet geladen');return;}
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    await loadAll();
    await migrateIfEmpty();
    subscribe();
    ready=true;
    fire();
  }
  async function loadAll(){
    try{
      const [p,b,f,l]=await Promise.all([
        sb.from('prijzen').select('*'),
        sb.from('boekjes').select('*').eq('id',1).maybeSingle(),
        sb.from('formulieren').select('*'),
        sb.from('leveringen').select('*')
      ]);
      if(p.data) cache.prijzen=p.data.map(fromRow);
      cache.boekjes={stock: b&&b.data? (b.data.stock||0) : 0};
      if(f.data) cache.formulieren=f.data.map(mapForm);
      if(l.data) cache.leveringen=l.data.slice();
    }catch(e){console.error('Laden mislukt:',e);}
  }
  async function reloadTable(t){
    if(t==='prijzen'){const r=await sb.from('prijzen').select('*'); if(r.data)cache.prijzen=r.data.map(fromRow);}
    else if(t==='boekjes'){const r=await sb.from('boekjes').select('*').eq('id',1).maybeSingle(); cache.boekjes={stock:r&&r.data?(r.data.stock||0):0};}
    else if(t==='formulieren'){const r=await sb.from('formulieren').select('*'); if(r.data)cache.formulieren=r.data.map(mapForm);}
    else if(t==='leveringen'){const r=await sb.from('leveringen').select('*'); if(r.data)cache.leveringen=r.data.slice();}
  }
  function subscribe(){
    try{
      sb.channel('bb-all').on('postgres_changes',{event:'*',schema:'public'},payload=>{
        reloadTable(payload.table).then(fire);
      }).subscribe();
    }catch(e){console.error('Realtime mislukt:',e);}
  }

  // Eenmalige migratie: als de database nog leeg is, upload de lokale gegevens
  // (of de standaardlijst). Zo gaat niets verloren bij de overstap.
  async function migrateIfEmpty(){
    if(cache.prijzen.length) return;
    if(localStorage.getItem('bb_migrated_v1')==='1') return; // voorkomt dubbele migratie (home+index delen opslag)
    localStorage.setItem('bb_migrated_v1','1');
    let seed=[];
    try{const raw=localStorage.getItem('bb_inv_prijzen'); if(raw) seed=JSON.parse(raw)||[];}catch(e){}
    if(!seed.length && window.INVENTARIS_DEFAULT){
      const d=window.INVENTARIS_DEFAULT;
      (d.klein||[]).forEach(x=>seed.push({id:uid(),cat:'klein',naam:x.naam,stock:x.stock||0,inGebruik:false,foto:''}));
      (d.groot||[]).forEach(x=>seed.push({id:uid(),cat:'groot',naam:x.naam,stock:x.stock||0,inGebruik:false,foto:''}));
    }
    seed.forEach(p=>{if(!p.id)p.id=uid();});
    // in stukken uploaden (foto's kunnen groot zijn)
    for(let i=0;i<seed.length;i+=40){
      const chunk=seed.slice(i,i+40).map(toRow);
      const r=await sb.from('prijzen').insert(chunk); err(r);
    }
    if(seed.length) cache.prijzen=seed.map(p=>({id:p.id,cat:p.cat,naam:p.naam,stock:p.stock||0,inGebruik:!!p.inGebruik,foto:p.foto||''}));
    // boekjes
    let bkStock=cache.boekjes.stock|| (window.INVENTARIS_DEFAULT&&window.INVENTARIS_DEFAULT.boekjesStock)||0;
    try{const rb=localStorage.getItem('bb_inv_boekjes'); if(rb){const o=JSON.parse(rb); if(o&&typeof o.stock==='number')bkStock=o.stock;}}catch(e){}
    await sb.from('boekjes').upsert({id:1,stock:bkStock}); cache.boekjes={stock:bkStock};
    // formulieren + leveringen
    try{const rf=localStorage.getItem('bb_formulieren'); const fs=rf?JSON.parse(rf):[];
      if(fs && fs.length){ const rows=fs.map(f=>({id:f.id||uid(),ts:f.ts,namen:f.namen,kleine:f.kleine,groot:f.groot,boekjes:f.boekjes,finale:f.finale,opmerking:f.opmerking}));
        const r=await sb.from('formulieren').insert(rows); err(r); cache.formulieren=rows.map(mapForm); }
    }catch(e){}
    try{const rl=localStorage.getItem('bb_leveringen'); const ls=rl?JSON.parse(rl):[];
      if(ls && ls.length){ const rows=ls.map(l=>({id:l.id||uid(),ts:l.ts,datum:l.datum,boekjes:+l.boekjes||0,tekst:l.tekst}));
        const r=await sb.from('leveringen').insert(rows); err(r); cache.leveringen=rows.slice(); }
    }catch(e){}
  }

  // ---------------- GETTERS (synchroon, uit cache) ----------------
  const getPrijzen=()=>cache.prijzen;
  const getBoekjes=()=>cache.boekjes;
  const getFormulieren=()=>cache.formulieren;
  const getLeveringen=()=>cache.leveringen;

  // ---------------- SCHRIJVEN (optimistisch + achtergrond naar DB) ----------------
  // gdebouncede bulk-upsert voor stock-aanpassingen
  let dirty=new Set(), flushT=null;
  function queue(id){ dirty.add(id); clearTimeout(flushT); flushT=setTimeout(flush,500); }
  function flush(){
    const ids=[...dirty]; dirty.clear(); if(!ids.length) return;
    const rows=cache.prijzen.filter(p=>ids.indexOf(p.id)>=0).map(toRow);
    if(rows.length) sb.from('prijzen').upsert(rows).then(err);
  }
  function setStock(id,v){ const p=cache.prijzen.find(x=>x.id===id); if(p){const old=p.stock||0; p.stock=Math.round(v||0); if(p.stock<=0)p.inGebruik=false; else if(old<=0)p.inGebruik=true;} queue(id); }
  function setPrijzen(arr){ cache.prijzen=arr; arr.forEach(p=>dirty.add(p.id)); clearTimeout(flushT); flushT=setTimeout(flush,400); }
  function setBoekjes(o){ cache.boekjes={stock:Math.round(o.stock||0)}; sb.from('boekjes').upsert({id:1,stock:cache.boekjes.stock}).then(err); }
  function addPrijs(cat,naam,stock,foto){
    const s=+stock||0;
    const rec={id:uid(),cat:cat==='groot'?'groot':'klein',naam:naam||'',stock:s,inGebruik:s>0,foto:foto||''};
    cache.prijzen.push(rec); sb.from('prijzen').insert(toRow(rec)).then(err); return rec;
  }
  function removePrijs(id){ cache.prijzen=cache.prijzen.filter(p=>p.id!==id); sb.from('prijzen').delete().eq('id',id).then(err); }
  function setFoto(id,dataUrl){ const p=cache.prijzen.find(x=>x.id===id); if(!p)return false; p.foto=dataUrl||''; sb.from('prijzen').update({foto:p.foto}).eq('id',id).then(err); return true; }
  function setGebruik(id,val){ const p=cache.prijzen.find(x=>x.id===id); if(p){p.inGebruik=!!val; sb.from('prijzen').update({in_gebruik:!!val}).eq('id',id).then(err);} }

  function submitFormulier(f){
    const byId={}; cache.prijzen.forEach(p=>byId[p.id]=p); const changed=new Set();
    const expand=arr=>(arr||[]).map(it=>{const p=byId[it.id]; const n=Math.max(1,+it.n||1); if(p){p.stock=(p.stock||0)-n; if(p.stock<=0)p.inGebruik=false; changed.add(p.id);} return {id:it.id,naam:p?p.naam:'(verwijderd)',n};});
    const kleine=expand(f.kleine), groot=expand(f.groot);
    const b=f.boekjes||{}; const used=(+b.gereserveerd||0)+(+b.extra||0)+(+b.gratis||0);
    cache.boekjes.stock=(cache.boekjes.stock||0)-used;
    const rec={id:uid(),ts:Date.now(),namen:f.namen||'',kleine,groot,boekjes:{gereserveerd:+b.gereserveerd||0,extra:+b.extra||0,gratis:+b.gratis||0},finale:f.finale||'',opmerking:f.opmerking||''};
    cache.formulieren.push(rec);
    const rows=cache.prijzen.filter(p=>changed.has(p.id)).map(toRow);
    if(rows.length) sb.from('prijzen').upsert(rows).then(err);
    sb.from('boekjes').upsert({id:1,stock:cache.boekjes.stock}).then(err);
    sb.from('formulieren').insert({id:rec.id,ts:rec.ts,namen:rec.namen,kleine:rec.kleine,groot:rec.groot,boekjes:rec.boekjes,finale:rec.finale,opmerking:rec.opmerking}).then(err);
    return rec;
  }
  function addLevering(lev){
    if(lev.boekjes){ cache.boekjes.stock=(cache.boekjes.stock||0)+(+lev.boekjes||0); sb.from('boekjes').upsert({id:1,stock:cache.boekjes.stock}).then(err); }
    const rec={id:uid(),ts:Date.now(),datum:lev.datum||'',boekjes:+lev.boekjes||0,tekst:lev.tekst||''};
    cache.leveringen.push(rec); sb.from('leveringen').insert(rec).then(err); return rec;
  }
  function undoLastFormulier(){
    if(!cache.formulieren.length) return null;
    const rec=cache.formulieren.pop();
    const byId={}; cache.prijzen.forEach(p=>byId[p.id]=p); const changed=new Set();
    const credit=arr=>(arr||[]).forEach(it=>{const p=byId[it.id]; if(p){const old=p.stock||0; p.stock=old+(+it.n||0); if(old<=0&&p.stock>0)p.inGebruik=true; changed.add(p.id);}});
    credit(rec.kleine); credit(rec.groot);
    const b=rec.boekjes||{}; const used=(+b.gereserveerd||0)+(+b.extra||0)+(+b.gratis||0);
    cache.boekjes.stock=(cache.boekjes.stock||0)+used;
    const rows=cache.prijzen.filter(p=>changed.has(p.id)).map(toRow);
    if(rows.length) sb.from('prijzen').upsert(rows).then(err);
    sb.from('boekjes').upsert({id:1,stock:cache.boekjes.stock}).then(err);
    sb.from('formulieren').delete().eq('id',rec.id).then(err);
    return rec;
  }
  // verwijderen via "set(filter(...))"-patroon: bepaal welke rij wegviel en wis die in de DB
  function setFormulieren(arr){ const keep={}; arr.forEach(f=>keep[f.id]=1); cache.formulieren.filter(f=>!keep[f.id]).forEach(f=>sb.from('formulieren').delete().eq('id',f.id).then(err)); cache.formulieren=arr; }
  function setLeveringen(arr){ const keep={}; arr.forEach(l=>keep[l.id]=1); cache.leveringen.filter(l=>!keep[l.id]).forEach(l=>sb.from('leveringen').delete().eq('id',l.id).then(err)); cache.leveringen=arr; }

  // Inventaris terugzetten naar de standaardlijst
  async function resetInventaris(){
    await sb.from('prijzen').delete().neq('id','');
    const seed=[]; const d=window.INVENTARIS_DEFAULT||{klein:[],groot:[]};
    (d.klein||[]).forEach(x=>seed.push({id:uid(),cat:'klein',naam:x.naam,stock:x.stock||0,inGebruik:false,foto:''}));
    (d.groot||[]).forEach(x=>seed.push({id:uid(),cat:'groot',naam:x.naam,stock:x.stock||0,inGebruik:false,foto:''}));
    for(let i=0;i<seed.length;i+=40){ await sb.from('prijzen').insert(seed.slice(i,i+40).map(toRow)); }
    cache.prijzen=seed;
    const bk=(d.boekjesStock)||0; await sb.from('boekjes').upsert({id:1,stock:bk}); cache.boekjes={stock:bk};
    fire();
  }

  function seedIfEmpty(){} // niet meer nodig (migratie regelt dit)

  // ---------------- AFDRUKKEN ----------------
  function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function fmtNowNL(){const d=new Date();const p=n=>String(n).padStart(2,'0');return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear();}
  function printHTML(title,bodyHtml){
    const w=window.open('','_blank');
    if(!w){alert('Kon het afdrukvenster niet openen (popup geblokkeerd?). Sta pop-ups toe voor deze site.');return;}
    const css='body{font-family:Arial,Helvetica,sans-serif;color:#1d2e22;margin:24px;}h1{font-size:20px;margin:0 0 4px;}.sub{color:#666;font-size:12px;margin-bottom:16px;}table{border-collapse:collapse;width:100%;font-size:13px;margin-bottom:8px;}th,td{border:1px solid #ccc;padding:6px 9px;text-align:left;}td.n,th.n{text-align:right;width:90px;}h2{font-size:15px;margin:18px 0 6px;}';
    w.document.open();
    w.document.write('<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>'+escHtml(title)+'</title><style>'+css+'</style></head><body>'+bodyHtml+'</body></html>');
    w.document.close(); w.focus();
    setTimeout(function(){ try{ w.print(); }catch(e){} }, 350);
  }
  function printInventaris(){
    const pr=getPrijzen(), bk=getBoekjes();
    const groot=pr.filter(p=>p.cat==='groot').sort((a,b)=>a.naam.localeCompare(b.naam));
    const klein=pr.filter(p=>p.cat==='klein').sort((a,b)=>a.naam.localeCompare(b.naam));
    const rows=g=>g.map(p=>'<tr><td>'+escHtml(p.naam)+'</td><td class="n">'+(p.stock||0)+'</td></tr>').join('');
    const body='<h1>Inventaris — Bazar Bizarre</h1><div class="sub">Afgedrukt op '+fmtNowNL()+'</div>'+
      '<table><tr><th>Artikel</th><th class="n">Voorraad</th></tr><tr><td><b>Boekjes</b></td><td class="n">'+(bk.stock||0)+'</td></tr></table>'+
      '<h2>Grote prijzen ('+groot.length+')</h2><table><tr><th>Naam</th><th class="n">Voorraad</th></tr>'+rows(groot)+'</table>'+
      '<h2>Kleine prijzen ('+klein.length+')</h2><table><tr><th>Naam</th><th class="n">Voorraad</th></tr>'+rows(klein)+'</table>';
    printHTML('Inventaris',body);
  }
  function printBestellijst(){
    const raw=prompt('Toon prijzen met voorraad t/m welk aantal?','5');
    if(raw===null) return;
    const drempel=Math.round(+raw||0);
    const pr=getPrijzen().filter(p=>(p.stock||0)<=drempel).sort((a,b)=>(a.stock||0)-(b.stock||0)||a.naam.localeCompare(b.naam));
    const rows=pr.map(p=>'<tr><td>'+escHtml(p.naam)+'</td><td>'+(p.cat==='groot'?'Grote':'Kleine')+'</td><td class="n">'+(p.stock||0)+'</td></tr>').join('');
    const body='<h1>Bestellijst — bij te bestellen</h1><div class="sub">Voorraad t/m '+drempel+' · afgedrukt op '+fmtNowNL()+'</div>'+
      (pr.length?('<table><tr><th>Naam</th><th>Soort</th><th class="n">Voorraad</th></tr>'+rows+'</table>'):'<p>Geen prijzen op of onder '+drempel+'.</p>');
    printHTML('Bestellijst',body);
  }

  window.BBInv={init,setOnChange:fn=>{onChange=fn;},isReady:()=>ready,
    seedIfEmpty,getPrijzen,setPrijzen,getBoekjes,setBoekjes,
    getFormulieren,setFormulieren,getLeveringen,setLeveringen,
    submitFormulier,addLevering,addPrijs,removePrijs,setFoto,setGebruik,setStock,
    undoLastFormulier,resetInventaris,printInventaris,printBestellijst,uid};
})();

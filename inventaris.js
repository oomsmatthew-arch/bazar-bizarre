// Gedeelde inventaris-motor voor Bazar Bizarre — nu via Supabase (gedeeld + realtime).
// Werking: bij het laden halen we alles op in een lokale cache. De bestaande schermen
// lezen synchroon uit die cache (BBInv.getPrijzen() enz.). Schrijven gaat meteen naar
// de cache (zodat de UI direct reageert) én op de achtergrond naar Supabase. Via realtime
// worden wijzigingen van andere toestellen automatisch ingeladen.
(function(){
  const SUPABASE_URL='https://tbromtomzglqtuyezoav.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicm9tdG9temdscXR1eWV6b2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDg0MjQsImV4cCI6MjA5NzA4NDQyNH0.RxcKKWjEcat3ji4iUjByO5WxBSL0yvZMBvfzkoM3Jrc';

  let sb=null, ready=false, onChange=null;
  const cache={prijzen:[],boekjes:{stock:0},formulieren:[],leveringen:[],bestellingen:[],contacten:[],checklisten:[],logboek:[],manualsdoc:null,appconfig:null,spelarchief:null};
  // Sommige tabellen zijn gedeeld via Supabase als ze bestaan; anders bewaren we ze
  // lokaal op dit toestel (zodat de functie meteen werkt). Eén vlag per tabel.
  let bestelOK=false, contactenOK=false, checklistenOK=false, logboekOK=false, manualsdocOK=false, appconfigOK=false, spelarchiefOK=false;
  const K_BESTEL_BACKUP='bb_bestellingen';
  const K_CONTACTEN_BACKUP='bb_contacten';
  const K_CHECKLISTEN_BACKUP='bb_checklisten';
  const K_LOGBOEK_BACKUP='bb_logboek';
  const K_CACHE='bb_cache_v1';
  const K_OUTBOX='bb_outbox';

  function uid(){return 'i'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
  function fire(){ if(onChange) try{onChange();}catch(e){console.error(e);} }
  function err(r){ if(r&&r.error) console.error('Supabase:', r.error.message||r.error); }

  // ---- Algemene back-up per tabel (lokaal, zodat een ontbrekende tabel toch werkt) ----
  function saveBackup(cacheKey,backupKey){ try{localStorage.setItem(backupKey,JSON.stringify(cache[cacheKey]));}catch(e){} }
  function loadBackup(cacheKey,backupKey){ try{const r=localStorage.getItem(backupKey); cache[cacheKey]=r?(JSON.parse(r)||[]):[];}catch(e){cache[cacheKey]=[];} }
  function loadBestelBackup(){ loadBackup('bestellingen',K_BESTEL_BACKUP); }
  function saveBestelBackup(){ saveBackup('bestellingen',K_BESTEL_BACKUP); }

  // ---- Volledige offline-fallback: laatst bekende gegevens ----
  // De tekstgegevens gaan naar localStorage (klein en snel). De prijs-foto's zijn te groot
  // voor localStorage (limiet ~5 MB), dus die bewaren we apart in IndexedDB (zie hieronder),
  // zodat ze óók offline zichtbaar blijven zonder de slanke fallback te overladen.
  function persistCache(){
    try{
      const slim={
        prijzen: cache.prijzen.map(p=>({id:p.id,cat:p.cat,naam:p.naam,stock:p.stock,inGebruik:p.inGebruik,foto:''})),
        boekjes: cache.boekjes, formulieren: cache.formulieren, leveringen: cache.leveringen,
        bestellingen: cache.bestellingen, contacten: cache.contacten, checklisten: cache.checklisten, logboek: cache.logboek, manualsdoc: cache.manualsdoc, appconfig: cache.appconfig, spelarchief: cache.spelarchief
      };
      localStorage.setItem(K_CACHE,JSON.stringify(slim));
    }catch(e){}
    savePhotosToIDB();
  }
  function loadCacheFallback(){
    try{ const r=localStorage.getItem(K_CACHE); if(!r) return false; const c=JSON.parse(r); if(!c) return false;
      cache.prijzen=c.prijzen||[]; cache.boekjes=c.boekjes||{stock:0}; cache.formulieren=c.formulieren||[];
      cache.leveringen=c.leveringen||[]; cache.bestellingen=c.bestellingen||[]; cache.contacten=c.contacten||[];
      cache.checklisten=c.checklisten||[]; cache.logboek=c.logboek||[]; cache.manualsdoc=c.manualsdoc||null; cache.appconfig=c.appconfig||null; cache.spelarchief=c.spelarchief||null; return true;
    }catch(e){ return false; }
  }

  // ---- Prijs-foto's offline bewaren in IndexedDB (veel ruimer dan localStorage) ----
  const IDB_NAME='bb_offline', IDB_STORE='kv', IDB_PHOTOKEY='prijzenfoto';
  function idbOpen(){
    return new Promise((res,rej)=>{
      try{
        const req=indexedDB.open(IDB_NAME,1);
        req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE); };
        req.onsuccess=()=>res(req.result);
        req.onerror=()=>rej(req.error);
      }catch(e){ rej(e); }
    });
  }
  function idbSet(key,val){
    return idbOpen().then(db=>new Promise((res,rej)=>{
      const tx=db.transaction(IDB_STORE,'readwrite'); tx.objectStore(IDB_STORE).put(val,key);
      tx.oncomplete=()=>{db.close();res();}; tx.onerror=()=>{db.close();rej(tx.error);};
    }));
  }
  function idbGet(key){
    return idbOpen().then(db=>new Promise((res,rej)=>{
      const tx=db.transaction(IDB_STORE,'readonly'); const rq=tx.objectStore(IDB_STORE).get(key);
      rq.onsuccess=()=>{db.close();res(rq.result);}; rq.onerror=()=>{db.close();rej(rq.error);};
    }));
  }
  // Alleen wegschrijven wanneer de foto-verzameling echt veranderde (persistCache wordt
  // bij elke stock-tik aangeroepen; zonder deze check zouden we telkens alle beelden herschrijven).
  let _lastPhotoSig='';
  function savePhotosToIDB(){
    try{
      if(typeof indexedDB==='undefined') return;
      const withFoto=cache.prijzen.filter(p=>p.foto);
      const sig=withFoto.map(p=>p.id+':'+p.foto.length).join('|');
      if(sig===_lastPhotoSig) return;      // niets veranderd → niets doen
      if(!withFoto.length && !_lastPhotoSig) return; // nog nooit foto's → geen lege schrijf
      _lastPhotoSig=sig;
      idbSet(IDB_PHOTOKEY,withFoto.map(p=>({id:p.id,foto:p.foto}))).catch(()=>{});
    }catch(e){}
  }
  // Bij offline laden: de foto's terug in de cache zetten (localStorage bevat ze niet).
  function restorePhotosFromIDB(){
    if(typeof indexedDB==='undefined') return Promise.resolve();
    return idbGet(IDB_PHOTOKEY).then(list=>{
      if(!Array.isArray(list)||!list.length) return;
      const by={}; list.forEach(x=>{ if(x&&x.id) by[x.id]=x.foto||''; });
      cache.prijzen.forEach(p=>{ if(!p.foto && by[p.id]) p.foto=by[p.id]; });
      _lastPhotoSig=cache.prijzen.filter(p=>p.foto).map(p=>p.id+':'+p.foto.length).join('|');
    }).catch(()=>{});
  }

  // ---- Outbox: wijzigingen die nog naar de database moeten (overleven offline) ----
  let outbox=[]; try{const r=localStorage.getItem(K_OUTBOX); outbox=r?(JSON.parse(r)||[]):[];}catch(e){outbox=[];}
  let flushing=false;
  function saveOutbox(){ try{localStorage.setItem(K_OUTBOX,JSON.stringify(outbox));}catch(e){} }
  function pendingCount(){ return outbox.length; }
  function enqueue(op){ outbox.push(op); saveOutbox(); persistCache(); flushOutbox(); }
  function dbInsert(table,payload){ enqueue({op:'insert',table,payload}); }
  function dbUpsert(table,payload){ enqueue({op:'upsert',table,payload}); }
  function dbUpdate(table,col,val,payload){ enqueue({op:'update',table,col,val,payload}); }
  function dbDelete(table,col,val){ enqueue({op:'delete',table,col,val}); }
  async function flushOutbox(){
    if(flushing||!sb||!outbox.length) return;
    if(typeof navigator!=='undefined' && navigator.onLine===false) return;
    flushing=true;
    try{
      while(outbox.length){
        const op=outbox[0]; let res;
        try{
          const q=sb.from(op.table);
          if(op.op==='insert') res=await q.insert(op.payload);
          else if(op.op==='upsert') res=await q.upsert(op.payload);
          else if(op.op==='update') res=await q.update(op.payload).eq(op.col,op.val);
          else if(op.op==='delete') res=await q.delete().eq(op.col,op.val);
          else { outbox.shift(); saveOutbox(); continue; }
        }catch(e){ break; } // netwerk weg → wachtrij behouden, later opnieuw proberen
        if(res && res.error){ console.error('Outbox:',res.error.message||res.error); outbox.shift(); saveOutbox(); continue; }
        outbox.shift(); saveOutbox();
      }
    } finally { flushing=false; fire(); }
  }
  if(typeof window!=='undefined'){ window.addEventListener('online',()=>flushOutbox()); }

  // ---- mapping database <-> app (app gebruikt inGebruik, db gebruikt in_gebruik) ----
  const fromRow=r=>({id:r.id,cat:r.cat,naam:r.naam,stock:r.stock||0,inGebruik:!!r.in_gebruik,foto:r.foto||''});
  const toRow=p=>({id:p.id,cat:p.cat==='groot'?'groot':'klein',naam:p.naam||'',stock:+p.stock||0,in_gebruik:!!p.inGebruik,foto:p.foto||''});
  const mapForm=r=>({id:r.id,ts:r.ts,namen:r.namen||'',kleine:r.kleine||[],groot:r.groot||[],boekjes:r.boekjes||{},finale:r.finale||'',opmerking:r.opmerking||''});
  const mapBestel=r=>({id:r.id,ts:r.ts||0,datum:r.besteldatum||'',cat:r.categorie||'',info:r.info||'',status:r.status||'Besteld',aantal:r.aantal||'',ent:+r.kost_ent||0,bay:+r.kost_bay||0,hsb:+r.kost_hsb||0,leverancier:r.leverancier||'',leverdatum:r.leverdatum||'',door:r.door||'',opm:r.opmerking||''});
  const bestelToRow=b=>({id:b.id,ts:b.ts||0,besteldatum:b.datum||'',categorie:b.cat||'',info:b.info||'',status:b.status||'Besteld',aantal:b.aantal||'',kost_ent:+b.ent||0,kost_bay:+b.bay||0,kost_hsb:+b.hsb||0,leverancier:b.leverancier||'',leverdatum:b.leverdatum||'',door:b.door||'',opmerking:b.opm||''});
  const mapContact=r=>({id:r.id,naam:r.naam||'',rol:r.rol||'',tel:r.tel||'',mail:r.mail||'',ts:r.ts||0});
  const contactToRow=c=>({id:c.id,naam:c.naam||'',rol:c.rol||'',tel:c.tel||'',mail:c.mail||'',ts:c.ts||0});
  const mapChecklist=r=>({id:r.id,naam:r.naam||'',items:Array.isArray(r.items)?r.items:(r.items?(function(){try{return JSON.parse(r.items)}catch(e){return []}})():[]),pos:+r.pos||0,ts:r.ts||0});
  const checklistToRow=c=>({id:c.id,naam:c.naam||'',items:c.items||[],pos:+c.pos||0,ts:c.ts||0});
  const mapLog=r=>({id:r.id,ts:r.ts||0,datum:r.datum||'',auteur:r.auteur||'',tekst:r.tekst||'',klaar:!!r.klaar});
  const logToRow=l=>({id:l.id,ts:l.ts||0,datum:l.datum||'',auteur:l.auteur||'',tekst:l.tekst||'',klaar:!!l.klaar});

  // ---------------- INIT ----------------
  async function init(){
    if(!window.supabase){console.error('Supabase library niet geladen');return;}
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    await loadAll();
    await migrateIfEmpty();
    await migrateBestelIfNeeded();
    await topUpBestelDefaults();
    await migrateSharedLists();
    subscribe();
    flushOutbox(); // eventuele offline gemaakte wijzigingen alsnog doorsturen
    ready=true;
    fire();
  }
  // Bestaande lokale lijsten delen zodra de gedeelde tabel bestaat en nog leeg is.
  async function migrateListToShared(table,toRowFn,cacheKey,backupKey,okGetter){
    if(!okGetter() || cache[cacheKey].length) return;
    const FLAG='bb_sharedseed_'+table;
    if(localStorage.getItem(FLAG)==='1') return; // dit toestel deelde de lijst al eerder
    let backup=[]; try{const r=localStorage.getItem(backupKey); backup=r?(JSON.parse(r)||[]):[];}catch(e){}
    if(backup.length){
      for(let i=0;i<backup.length;i+=40){ const r=await sb.from(table).insert(backup.slice(i,i+40).map(toRowFn)); err(r); }
      cache[cacheKey]=backup.slice();
    }
    localStorage.setItem(FLAG,'1');
  }
  function defaultChecklist(){
    const items=['Boekjes geteld en klaar','Super Deals op het rek','Trolley Tunes muziek klaar','How Much? potten + weegschaal klaar','Crazy Coins munten klaar','Finalevragen voorbereid','Micro getest','Geluid/muziek getest','Prijzentafel klaar','Controleblad bij de hand'].map(t=>({text:t,done:false}));
    return {id:uid(),naam:'Pre-spel checklist',items,pos:0,ts:Date.now()};
  }
  async function migrateSharedLists(){
    await migrateListToShared('contacten',contactToRow,'contacten',K_CONTACTEN_BACKUP,()=>contactenOK);
    await migrateListToShared('checklisten',checklistToRow,'checklisten',K_CHECKLISTEN_BACKUP,()=>checklistenOK);
    await migrateListToShared('logboek',logToRow,'logboek',K_LOGBOEK_BACKUP,()=>logboekOK);
    if(checklistenOK && !cache.checklisten.length && localStorage.getItem('bb_sharedseed_checklisten_def')!=='1'){
      const def=defaultChecklist(); const r=await sb.from('checklisten').insert(checklistToRow(def)); err(r);
      cache.checklisten=[def]; saveBackup('checklisten',K_CHECKLISTEN_BACKUP);
      localStorage.setItem('bb_sharedseed_checklisten_def','1');
    }
  }
  // Eén gedeelde tabel laden; valt terug op de lokale back-up als de tabel nog niet bestaat.
  async function loadShared(table,cacheKey,mapFn,backupKey,setOK){
    try{
      const r=await sb.from(table).select('*');
      if(r.error){ setOK(false); loadBackup(cacheKey,backupKey); }
      else { setOK(true); cache[cacheKey]=(r.data||[]).map(mapFn); if(cache[cacheKey].length) saveBackup(cacheKey,backupKey); }
    }catch(e){ setOK(false); loadBackup(cacheKey,backupKey); }
  }
  async function loadAll(){
    let online=true;
    try{
      const [p,b,f,l]=await Promise.all([
        sb.from('prijzen').select('*'),
        sb.from('boekjes').select('*').eq('id',1).maybeSingle(),
        sb.from('formulieren').select('*'),
        sb.from('leveringen').select('*')
      ]);
      if(p.error||b.error||f.error||l.error) throw (p.error||b.error||f.error||l.error);
      if(p.data) cache.prijzen=p.data.map(fromRow);
      cache.boekjes={stock: b&&b.data? (b.data.stock||0) : 0};
      if(f.data) cache.formulieren=f.data.map(mapForm);
      if(l.data) cache.leveringen=l.data.slice();
    }catch(e){ online=false; console.error('Laden mislukt (offline?):',e); }
    if(!online){ loadCacheFallback(); await restorePhotosFromIDB(); return; } // geen internet → laatst bewaarde gegevens + foto's tonen
    // Gedeelde extra tabellen (vallen lokaal terug als ze nog niet bestaan).
    await loadShared('bestellingen','bestellingen',mapBestel,K_BESTEL_BACKUP,v=>bestelOK=v);
    await loadShared('contacten','contacten',mapContact,K_CONTACTEN_BACKUP,v=>contactenOK=v);
    await loadShared('checklisten','checklisten',mapChecklist,K_CHECKLISTEN_BACKUP,v=>checklistenOK=v);
    await loadShared('logboek','logboek',mapLog,K_LOGBOEK_BACKUP,v=>logboekOK=v);
    // Enkel-rij documenten (id=1, data jsonb): manuals-boom, app-instellingen, spel-archief
    await loadDoc('manualsdoc','manualsdoc',v=>manualsdocOK=v);
    await loadDoc('appconfig','appconfig',v=>appconfigOK=v);
    await loadDoc('spelarchief','spelarchief',v=>spelarchiefOK=v);
    persistCache();
  }
  async function loadDoc(table,cacheKey,setOK){
    try{
      const r=await sb.from(table).select('*').eq('id',1).maybeSingle();
      if(r.error){ setOK(false); }
      else { setOK(true); cache[cacheKey]=r.data?(r.data.data||null):null; }
    }catch(e){ setOK(false); }
  }
  async function reloadTable(t){
    if(t==='prijzen'){const r=await sb.from('prijzen').select('*'); if(r.data)cache.prijzen=r.data.map(fromRow);}
    else if(t==='boekjes'){const r=await sb.from('boekjes').select('*').eq('id',1).maybeSingle(); cache.boekjes={stock:r&&r.data?(r.data.stock||0):0};}
    else if(t==='formulieren'){const r=await sb.from('formulieren').select('*'); if(r.data)cache.formulieren=r.data.map(mapForm);}
    else if(t==='leveringen'){const r=await sb.from('leveringen').select('*'); if(r.data)cache.leveringen=r.data.slice();}
    else if(t==='bestellingen'&&bestelOK){const r=await sb.from('bestellingen').select('*'); if(r.data){cache.bestellingen=r.data.map(mapBestel); saveBestelBackup();}}
    else if(t==='contacten'&&contactenOK){const r=await sb.from('contacten').select('*'); if(r.data){cache.contacten=r.data.map(mapContact); saveBackup('contacten',K_CONTACTEN_BACKUP);}}
    else if(t==='checklisten'&&checklistenOK){const r=await sb.from('checklisten').select('*'); if(r.data){cache.checklisten=r.data.map(mapChecklist); saveBackup('checklisten',K_CHECKLISTEN_BACKUP);}}
    else if(t==='logboek'&&logboekOK){const r=await sb.from('logboek').select('*'); if(r.data){cache.logboek=r.data.map(mapLog); saveBackup('logboek',K_LOGBOEK_BACKUP);}}
    else if(t==='manualsdoc'&&manualsdocOK){const r=await sb.from('manualsdoc').select('*').eq('id',1).maybeSingle(); if(!r.error){cache.manualsdoc=r.data?(r.data.data||null):null;}}
    else if(t==='appconfig'&&appconfigOK){const r=await sb.from('appconfig').select('*').eq('id',1).maybeSingle(); if(!r.error){cache.appconfig=r.data?(r.data.data||null):null;}}
    else if(t==='spelarchief'&&spelarchiefOK){const r=await sb.from('spelarchief').select('*').eq('id',1).maybeSingle(); if(!r.error){cache.spelarchief=r.data?(r.data.data||null):null;}}
    persistCache();
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

  // Bestellingen vullen: bij een lege (gedeelde of lokale) lijst starten we met de
  // standaardlijst uit het Excel-overzicht. Bestaat de gedeelde tabel en is die leeg
  // terwijl we lokaal al iets hebben, dan uploaden we de lokale kopie.
  function bestelSeed(){
    const def=window.BESTELLINGEN_DEFAULT||[];
    return def.map((b,i)=>Object.assign({id:uid(),ts:Date.now()+i},JSON.parse(JSON.stringify(b))));
  }
  async function migrateBestelIfNeeded(){
    const SEEDED='bb_bestel_seed_v1'; // standaardlijst maar één keer plaatsen
    if(bestelOK){
      if(!cache.bestellingen.length){
        let backup=[]; try{const r=localStorage.getItem(K_BESTEL_BACKUP); backup=r?(JSON.parse(r)||[]):[];}catch(e){}
        let seed=[];
        if(backup.length) seed=backup;                                 // lokale kopie → gedeeld zetten
        else if(localStorage.getItem(SEEDED)!=='1') seed=bestelSeed();  // allereerste keer: standaardlijst
        if(seed.length){
          for(let i=0;i<seed.length;i+=40){ const r=await sb.from('bestellingen').insert(seed.slice(i,i+40).map(bestelToRow)); err(r); }
          cache.bestellingen=seed.slice(); saveBestelBackup();
        }
      }
      localStorage.setItem(SEEDED,'1'); // gedeelde tabel is in gebruik → nooit meer automatisch vullen
    }else{
      // geen gedeelde tabel: lokaal werken; lege lijst krijgt eenmalig de standaardlijst
      if(!cache.bestellingen.length && localStorage.getItem(SEEDED)!=='1'){ cache.bestellingen=bestelSeed(); saveBestelBackup(); }
      localStorage.setItem(SEEDED,'1');
    }
  }

  // Bestaande lijsten bijwerken als de standaardlijst nieuwe bestellingen kreeg
  // (bv. een volledig boekjaar toegevoegd). We voegen enkel toe wat nog niet bestaat,
  // op basis van datum + omschrijving + leverancier, zodat niets dubbel komt en eigen
  // toevoegingen blijven staan.
  function bestelKey(b){ return (b.datum||'')+'|'+(b.info||'').trim().toLowerCase()+'|'+(b.leverancier||'').trim().toLowerCase(); }
  async function topUpBestelDefaults(){
    const VER=2; // verhoog dit wanneer er nieuwe standaardbestellingen bijkomen
    const cur=+(localStorage.getItem('bb_bestel_seed_ver')||1);
    if(cur>=VER){ return; }
    const have=new Set(cache.bestellingen.map(bestelKey));
    const def=window.BESTELLINGEN_DEFAULT||[];
    const toAdd=def.filter(d=>!have.has(bestelKey(d)));
    if(toAdd.length){
      const recs=toAdd.map((d,i)=>Object.assign({id:uid(),ts:Date.now()+i},JSON.parse(JSON.stringify(d))));
      if(bestelOK){ for(let i=0;i<recs.length;i+=40){ const r=await sb.from('bestellingen').insert(recs.slice(i,i+40).map(bestelToRow)); err(r); } }
      cache.bestellingen=cache.bestellingen.concat(recs); saveBestelBackup();
    }
    localStorage.setItem('bb_bestel_seed_ver',String(VER));
  }

  // ---------------- GETTERS (synchroon, uit cache) ----------------
  const getPrijzen=()=>cache.prijzen;
  const getBoekjes=()=>cache.boekjes;
  const getFormulieren=()=>cache.formulieren;
  const getLeveringen=()=>cache.leveringen;
  const getBestellingen=()=>cache.bestellingen;
  const isBestelGedeeld=()=>bestelOK;

  // ---------------- CONTACTEN (gedeeld) ----------------
  const getContacten=()=>cache.contacten;
  function saveContactBackup(){ saveBackup('contacten',K_CONTACTEN_BACKUP); }
  function addContact(c){
    const rec={id:uid(),ts:Date.now(),naam:c.naam||'',rol:c.rol||'',tel:c.tel||'',mail:c.mail||''};
    cache.contacten.push(rec); saveContactBackup();
    if(contactenOK) dbUpsert('contacten',contactToRow(rec)); else persistCache(); return rec;
  }
  function updateContact(id,patch){
    const r=cache.contacten.find(x=>x.id===id); if(!r) return null; Object.assign(r,patch); saveContactBackup();
    if(contactenOK) dbUpsert('contacten',contactToRow(r)); else persistCache(); return r;
  }
  function removeContact(id){
    cache.contacten=cache.contacten.filter(c=>c.id!==id); saveContactBackup();
    if(contactenOK) dbDelete('contacten','id',id); else persistCache();
  }

  // ---------------- CHECKLISTS (gedeeld) ----------------
  const getChecklisten=()=>cache.checklisten.slice().sort((a,b)=>(a.pos||0)-(b.pos||0)||(a.ts||0)-(b.ts||0));
  function saveChecklistBackup(){ saveBackup('checklisten',K_CHECKLISTEN_BACKUP); }
  function chkPersist(rec){ saveChecklistBackup(); if(checklistenOK) dbUpsert('checklisten',checklistToRow(rec)); else persistCache(); }
  function addChecklist(naam){
    const maxPos=cache.checklisten.reduce((m,l)=>Math.max(m,l.pos||0),0);
    const rec={id:uid(),naam:naam||'Nieuwe lijst',items:[],pos:maxPos+1,ts:Date.now()};
    cache.checklisten.push(rec); chkPersist(rec); return rec;
  }
  function saveChecklist(rec){ // rec = volledig lijst-object (naam/items gewijzigd)
    const r=cache.checklisten.find(x=>x.id===rec.id); if(!r) return null;
    r.naam=rec.naam; r.items=rec.items; chkPersist(r); return r;
  }
  function removeChecklist(id){
    cache.checklisten=cache.checklisten.filter(l=>l.id!==id); saveChecklistBackup();
    if(checklistenOK) dbDelete('checklisten','id',id); else persistCache();
  }
  // nieuwe volgorde van de lijsten (array van id's) → pos bijwerken en bewaren
  function reorderChecklisten(ids){
    ids.forEach((id,idx)=>{ const r=cache.checklisten.find(x=>x.id===id); if(r) r.pos=idx; });
    saveChecklistBackup();
    if(checklistenOK){ ids.forEach(id=>{ const r=cache.checklisten.find(x=>x.id===id); if(r) dbUpsert('checklisten',checklistToRow(r)); }); }
    else persistCache();
  }

  // ---------------- LOGBOEK / OVERDRACHT (gedeeld) ----------------
  const getLogboek=()=>cache.logboek.slice().sort((a,b)=>(b.ts||0)-(a.ts||0));
  function saveLogBackup(){ saveBackup('logboek',K_LOGBOEK_BACKUP); }
  function addLog(entry){
    const rec={id:uid(),ts:Date.now(),datum:entry.datum||'',auteur:entry.auteur||'',tekst:entry.tekst||'',klaar:!!entry.klaar};
    cache.logboek.push(rec); saveLogBackup();
    if(logboekOK) dbUpsert('logboek',logToRow(rec)); else persistCache(); return rec;
  }
  function updateLog(id,patch){
    const r=cache.logboek.find(x=>x.id===id); if(!r) return null; Object.assign(r,patch); saveLogBackup();
    if(logboekOK) dbUpsert('logboek',logToRow(r)); else persistCache(); return r;
  }
  function removeLog(id){
    cache.logboek=cache.logboek.filter(l=>l.id!==id); saveLogBackup();
    if(logboekOK) dbDelete('logboek','id',id); else persistCache();
  }

  // ---------------- MANUALS (gedeelde mappenboom + bestand-upload) ----------------
  const K_MANUALS_BACKUP='bb_manuals';
  const getManualsTree=()=>cache.manualsdoc;
  function saveManualsTree(tree){
    cache.manualsdoc=tree;
    try{localStorage.setItem(K_MANUALS_BACKUP,JSON.stringify(tree));}catch(e){}
    if(manualsdocOK) dbUpsert('manualsdoc',{id:1,data:tree}); else persistCache();
  }
  // ---------------- APP-INSTELLINGEN (gedeeld document) ----------------
  const getConfig=()=>cache.appconfig;
  function saveConfig(obj){
    cache.appconfig=obj;
    try{localStorage.setItem('bb_appconfig',JSON.stringify(obj));}catch(e){}
    if(appconfigOK) dbUpsert('appconfig',{id:1,data:obj}); else persistCache();
  }
  // ---------------- SPEL-ARCHIEF (gedeeld document) ----------------
  const getArchief=()=>cache.spelarchief;
  function saveArchief(arr){
    cache.spelarchief=arr;
    try{localStorage.setItem('bb_spelarchief',JSON.stringify(arr));}catch(e){}
    if(spelarchiefOK) dbUpsert('spelarchief',{id:1,data:arr}); else persistCache();
  }

  // Upload een bestand naar Supabase Storage (bucket 'manuals') en geef de publieke URL terug.
  async function uploadFile(file){
    if(!sb) throw new Error('Geen verbinding. Upload lukt alleen met internet.');
    const safe=(file.name||'bestand').replace(/[^\w.\-]+/g,'_');
    const path=Date.now().toString(36)+'_'+Math.floor(Math.random()*1e6).toString(36)+'_'+safe;
    const up=await sb.storage.from('manuals').upload(path,file,{upsert:true,contentType:file.type||undefined});
    if(up.error) throw up.error;
    const pub=sb.storage.from('manuals').getPublicUrl(path);
    return (pub&&pub.data)?pub.data.publicUrl:'';
  }

  // ---------------- SCHRIJVEN (optimistisch + achtergrond naar DB) ----------------
  // gdebouncede bulk-upsert voor stock-aanpassingen
  let dirty=new Set(), flushT=null;
  function queue(id){ dirty.add(id); persistCache(); clearTimeout(flushT); flushT=setTimeout(flush,500); }
  function flush(){
    const ids=[...dirty]; dirty.clear(); if(!ids.length) return;
    const rows=cache.prijzen.filter(p=>ids.indexOf(p.id)>=0).map(toRow);
    if(rows.length) dbUpsert('prijzen',rows);
  }
  function setStock(id,v){ const p=cache.prijzen.find(x=>x.id===id); if(p){const old=p.stock||0; p.stock=Math.round(v||0); if(p.stock<=0)p.inGebruik=false; else if(old<=0)p.inGebruik=true;} queue(id); }
  function setPrijzen(arr){ cache.prijzen=arr; arr.forEach(p=>dirty.add(p.id)); clearTimeout(flushT); flushT=setTimeout(flush,400); }
  function setBoekjes(o){ cache.boekjes={stock:Math.round(o.stock||0)}; dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock}); }
  function addPrijs(cat,naam,stock,foto){
    const s=+stock||0;
    const rec={id:uid(),cat:cat==='groot'?'groot':'klein',naam:naam||'',stock:s,inGebruik:s>0,foto:foto||''};
    cache.prijzen.push(rec); dbInsert('prijzen',toRow(rec)); return rec;
  }
  function removePrijs(id){ cache.prijzen=cache.prijzen.filter(p=>p.id!==id); dbDelete('prijzen','id',id); }
  function setFoto(id,dataUrl){ const p=cache.prijzen.find(x=>x.id===id); if(!p)return false; p.foto=dataUrl||''; dbUpdate('prijzen','id',id,{foto:p.foto}); return true; }
  function setGebruik(id,val){ const p=cache.prijzen.find(x=>x.id===id); if(p){p.inGebruik=!!val; dbUpdate('prijzen','id',id,{in_gebruik:!!val});} }

  function submitFormulier(f){
    const byId={}; cache.prijzen.forEach(p=>byId[p.id]=p); const changed=new Set();
    const expand=arr=>(arr||[]).map(it=>{const p=byId[it.id]; const n=Math.max(1,+it.n||1); if(p){p.stock=(p.stock||0)-n; if(p.stock<=0)p.inGebruik=false; changed.add(p.id);} return {id:it.id,naam:p?p.naam:'(verwijderd)',n};});
    const kleine=expand(f.kleine), groot=expand(f.groot);
    const b=f.boekjes||{}; const used=(+b.gereserveerd||0)+(+b.extra||0)+(+b.gratis||0);
    cache.boekjes.stock=(cache.boekjes.stock||0)-used;
    const rec={id:uid(),ts:Date.now(),namen:f.namen||'',kleine,groot,boekjes:{gereserveerd:+b.gereserveerd||0,extra:+b.extra||0,gratis:+b.gratis||0},finale:f.finale||'',opmerking:f.opmerking||''};
    cache.formulieren.push(rec);
    const rows=cache.prijzen.filter(p=>changed.has(p.id)).map(toRow);
    if(rows.length) dbUpsert('prijzen',rows);
    dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock});
    dbInsert('formulieren',{id:rec.id,ts:rec.ts,namen:rec.namen,kleine:rec.kleine,groot:rec.groot,boekjes:rec.boekjes,finale:rec.finale,opmerking:rec.opmerking});
    return rec;
  }
  function addLevering(lev){
    if(lev.boekjes){ cache.boekjes.stock=(cache.boekjes.stock||0)+(+lev.boekjes||0); dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock}); }
    const rec={id:uid(),ts:Date.now(),datum:lev.datum||'',boekjes:+lev.boekjes||0,tekst:lev.tekst||''};
    if(lev.foto) rec.foto=lev.foto; // foto enkel meesturen als er een is (kolom 'foto' nodig in tabel leveringen)
    cache.leveringen.push(rec); dbInsert('leveringen',rec); return rec;
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
    if(rows.length) dbUpsert('prijzen',rows);
    dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock});
    dbDelete('formulieren','id',rec.id);
    return rec;
  }
  // verwijderen via "set(filter(...))"-patroon: bepaal welke rij wegviel en wis die in de DB
  function setFormulieren(arr){ const keep={}; arr.forEach(f=>keep[f.id]=1); cache.formulieren.filter(f=>!keep[f.id]).forEach(f=>dbDelete('formulieren','id',f.id)); cache.formulieren=arr; persistCache(); }
  function setLeveringen(arr){ const keep={}; arr.forEach(l=>keep[l.id]=1); cache.leveringen.filter(l=>!keep[l.id]).forEach(l=>dbDelete('leveringen','id',l.id)); cache.leveringen=arr; persistCache(); }

  // ---- Bestellingen (optimistisch + naar DB als de gedeelde tabel bestaat) ----
  function bestelClean(b){ return {datum:b.datum||'',cat:b.cat||'',info:b.info||'',status:b.status||'Besteld',aantal:b.aantal||'',ent:+b.ent||0,bay:+b.bay||0,hsb:+b.hsb||0,leverancier:b.leverancier||'',leverdatum:b.leverdatum||'',door:b.door||'',opm:b.opm||''}; }
  function bestelSave(rec){ saveBestelBackup(); if(bestelOK) dbUpsert('bestellingen',bestelToRow(rec)); else persistCache(); }
  function addBestelling(b){
    const rec=Object.assign({id:uid(),ts:Date.now()},bestelClean(b));
    cache.bestellingen.push(rec); bestelSave(rec); return rec;
  }
  function updateBestelling(id,patch){
    const rec=cache.bestellingen.find(x=>x.id===id); if(!rec) return null;
    Object.assign(rec,bestelClean(Object.assign({},rec,patch))); bestelSave(rec); return rec;
  }
  function removeBestelling(id){
    cache.bestellingen=cache.bestellingen.filter(b=>b.id!==id);
    saveBestelBackup(); if(bestelOK) dbDelete('bestellingen','id',id); else persistCache();
  }
  async function resetBestellingen(){
    const seed=bestelSeed();
    if(bestelOK){
      await sb.from('bestellingen').delete().neq('id','');
      for(let i=0;i<seed.length;i+=40){ const r=await sb.from('bestellingen').insert(seed.slice(i,i+40).map(bestelToRow)); err(r); }
    }
    cache.bestellingen=seed.slice(); saveBestelBackup(); fire();
  }

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
    getBestellingen,isBestelGedeeld,addBestelling,updateBestelling,removeBestelling,resetBestellingen,
    getContacten,addContact,updateContact,removeContact,isContactenGedeeld:()=>contactenOK,
    getChecklisten,addChecklist,saveChecklist,removeChecklist,reorderChecklisten,isChecklistenGedeeld:()=>checklistenOK,
    getLogboek,addLog,updateLog,removeLog,isLogboekGedeeld:()=>logboekOK,
    getManualsTree,saveManualsTree,uploadFile,isManualsGedeeld:()=>manualsdocOK,
    getConfig,saveConfig,isConfigGedeeld:()=>appconfigOK,
    getArchief,saveArchief,isArchiefGedeeld:()=>spelarchiefOK,
    pendingCount,flushOutbox,
    submitFormulier,addLevering,addPrijs,removePrijs,setFoto,setGebruik,setStock,
    undoLastFormulier,resetInventaris,printInventaris,printBestellijst,uid};
})();

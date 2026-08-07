// Gedeelde inventaris-motor voor Bazar Bizarre — nu via Supabase (gedeeld + realtime).
// Werking: bij het laden halen we alles op in een lokale cache. De bestaande schermen
// lezen synchroon uit die cache (BBInv.getPrijzen() enz.). Schrijven gaat meteen naar
// de cache (zodat de UI direct reageert) én op de achtergrond naar Supabase. Via realtime
// worden wijzigingen van andere toestellen automatisch ingeladen.
(function(){
  const SUPABASE_URL='https://tbromtomzglqtuyezoav.supabase.co';
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicm9tdG9temdscXR1eWV6b2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDg0MjQsImV4cCI6MjA5NzA4NDQyNH0.RxcKKWjEcat3ji4iUjByO5WxBSL0yvZMBvfzkoM3Jrc';

  let sb=null, ready=false, onChange=null;
  const cache={prijzen:[],boekjes:{stock:0},formulieren:[],leveringen:[],bestellingen:[],contacten:[],checklisten:[],logboek:[],gebruikers:[],activiteit:[],sessies:[],projecten:[],projecttaken:[],projectberichten:[],projectagenda:[],projectdocs:[],manualsdoc:null,appconfig:null,spelarchief:null};
  // Sommige tabellen zijn gedeeld via Supabase als ze bestaan; anders bewaren we ze
  // lokaal op dit toestel (zodat de functie meteen werkt). Eén vlag per tabel.
  let bestelOK=false, contactenOK=false, checklistenOK=false, logboekOK=false, gebruikersOK=false, activiteitOK=false, manualsdocOK=false, appconfigOK=false, spelarchiefOK=false;
  let projectenOK=false, projecttakenOK=false, projectberichtenOK=false, projectagendaOK=false, projectdocsOK=false;
  // Diagnose: wat het Systeem-scherm toont. Zonder dit merk je pas veel later dat er iets
  // stilletjes misliep (tabel ontbreekt, wachtrij vast, nooit aangemeld…).
  const K_LAST_SYNC='bb_last_sync';
  let libOK=false, aangemeld=false, kernOK=false, realtime='uit';
  let laatsteSync=0; try{laatsteSync=+(localStorage.getItem(K_LAST_SYNC)||0)||0;}catch(e){}
  let laatsteFout='', laatsteFoutTs=0;
  function noteSync(){ laatsteSync=Date.now(); try{localStorage.setItem(K_LAST_SYNC,String(laatsteSync));}catch(e){} }
  function noteFout(waar,e){
    const m=(e&&(e.message||(e.error&&e.error.message)))||String(e||'onbekende fout');
    laatsteFout=waar+': '+m; laatsteFoutTs=Date.now();
  }
  const K_BESTEL_BACKUP='bb_bestellingen';
  const K_CONTACTEN_BACKUP='bb_contacten';
  const K_CHECKLISTEN_BACKUP='bb_checklisten';
  const K_LOGBOEK_BACKUP='bb_logboek';
  const K_GEBRUIKERS_BACKUP='bb_gebruikers';
  const K_NAMEN_SNEL='bb_namen_snel';   // enkel de namenlijst — zie bewaarNamenSnel()
  const K_ACTIVITEIT_BACKUP='bb_activiteit';
  const K_PROJECTEN_BACKUP='bb_projecten';
  const K_PROJTAKEN_BACKUP='bb_projecttaken';
  const K_PROJBERICHTEN_BACKUP='bb_projectberichten';
  const K_PROJAGENDA_BACKUP='bb_projectagenda';
  const K_PROJDOCS_BACKUP='bb_projectdocs';
  // Projectgegevens die op dit toestel zijn gemaakt terwijl de gedeelde tabel er niet was
  // (of terwijl er geen internet was). We onthouden de id's, zodat ze later alsnog vertrekken
  // en er niets op één tablet blijft hangen. Wat een collega verwijdert staat hier niet in
  // en komt dus ook niet terug.
  const K_PROJ_WACHT='bb_proj_wacht';
  let projWacht={}; try{projWacht=JSON.parse(localStorage.getItem(K_PROJ_WACHT)||'{}')||{};}catch(e){projWacht={};}
  function bewaarWacht(){ try{localStorage.setItem(K_PROJ_WACHT,JSON.stringify(projWacht));}catch(e){} }
  function wachtErbij(tabel,id){
    if(!id) return;
    const l=projWacht[tabel]||(projWacht[tabel]=[]);
    if(l.indexOf(id)<0){ l.push(id); bewaarWacht(); }
  }
  function wachtWeg(tabel,ids){
    if(!projWacht[tabel]) return;
    projWacht[tabel]=projWacht[tabel].filter(id=>ids.indexOf(id)<0);
    if(!projWacht[tabel].length) delete projWacht[tabel];
    bewaarWacht();
  }
  // De lokale stand van vóór het synchroniseren; loadShared overschrijft de reservekopie,
  // dus nemen we bij het opstarten eerst een kopie.
  let lokaalVoorSync={};
  const PROJ_TABELLEN=[['projecten',K_PROJECTEN_BACKUP],['projecttaken',K_PROJTAKEN_BACKUP],
    ['projectberichten',K_PROJBERICHTEN_BACKUP],['projectagenda',K_PROJAGENDA_BACKUP],
    ['projectdocs',K_PROJDOCS_BACKUP]];
  function bewaarLokaleProjectstand(){
    PROJ_TABELLEN.forEach(paar=>{ lokaalVoorSync[paar[0]]=lokaleKopie(paar[0],paar[1]); });
  }
  // Eenmalig bij de overstap naar deze versie: alles wat al op dit toestel staat markeren
  // als "moet nog vertrekken". Projecten die gemaakt zijn vóór deze boekhouding bestond,
  // zouden anders voorgoed op dat ene toestel blijven staan.
  const K_WACHT_INIT='bb_proj_wacht_init';
  function eenmaligWachtVullen(){
    if(localStorage.getItem(K_WACHT_INIT)==='1') return;
    PROJ_TABELLEN.forEach(paar=>{
      (lokaalVoorSync[paar[0]]||[]).forEach(x=>{ if(x&&x.id) wachtErbij(paar[0],x.id); });
    });
    localStorage.setItem(K_WACHT_INIT,'1');
  }
  const K_CACHE='bb_cache_v1';
  const K_OUTBOX='bb_outbox';

  function uid(){return 'i'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
  function fire(){ if(onChange) try{onChange();}catch(e){console.error(e);} }
  function err(r){ if(r&&r.error) console.error('Supabase:', r.error.message||r.error); }

  // ---- Eén lokale momentopname i.p.v. een kopie per tabel ----
  // Vroeger stond élke tabel twee keer in de snelle opslag: los (bb_projecten, bb_contacten…)
  // én samen in bb_cache_v1. Dat vulde de beperkte localStorage-ruimte dubbel zo snel, en
  // een volle opslag betekent dat wijzigingen stil niet meer bewaard worden. Nu is
  // bb_cache_v1 de enige plek. De oude losse sleutels worden nog gelezen zolang ze bestaan
  // (zodat er niets verloren gaat) en pas opgeruimd als de momentopname veilig geschreven is.
  const BACKUP_PAREN=[['bestellingen',K_BESTEL_BACKUP],['contacten',K_CONTACTEN_BACKUP],
    ['checklisten',K_CHECKLISTEN_BACKUP],['logboek',K_LOGBOEK_BACKUP],['gebruikers',K_GEBRUIKERS_BACKUP],
    ['activiteit',K_ACTIVITEIT_BACKUP],['projecten',K_PROJECTEN_BACKUP],['projecttaken',K_PROJTAKEN_BACKUP],
    ['projectberichten',K_PROJBERICHTEN_BACKUP],['projectagenda',K_PROJAGENDA_BACKUP],['projectdocs',K_PROJDOCS_BACKUP]];
  const OUDE_BACKUPS=BACKUP_PAREN.map(p=>p[1]);
  // De momentopname zelf woont in IndexedDB (honderden MB's) i.p.v. in localStorage
  // (± 5 MB, niet te verhogen). We lezen ze bij het opstarten één keer in en houden ze
  // daarna in het geheugen bij, zodat de rest van de code gewoon synchroon kan blijven.
  let snapshot=null, snapshotGeladen=false;
  function snapshotLezen(){ return snapshot; }
  // De laatst bekende stand van één tabel: eerst de oude losse sleutel (die is nooit
  // opgeruimd zolang ze bestaat), anders de gedeelde momentopname.
  function lokaleKopie(cacheKey,backupKey){
    if(backupKey){
      try{ const r=localStorage.getItem(backupKey); if(r!=null){ const a=JSON.parse(r); if(Array.isArray(a)) return a; } }catch(e){}
    }
    const snap=snapshotLezen();
    return (snap && Array.isArray(snap[cacheKey])) ? snap[cacheKey] : [];
  }
  function saveBackup(cacheKey,backupKey){ persistCache(); }
  function loadBackup(cacheKey,backupKey){ cache[cacheKey]=lokaleKopie(cacheKey,backupKey); }
  function loadBestelBackup(){ loadBackup('bestellingen',K_BESTEL_BACKUP); }
  function saveBestelBackup(){ saveBackup('bestellingen',K_BESTEL_BACKUP); }

  // ---- Volledige offline-fallback: laatst bekende gegevens ----
  // Foto's staan apart (zie hieronder), zodat de momentopname enkel tekst bevat.
  const zonderFoto=list=>(list||[]).map(x=>Object.assign({},x,{foto:''}));
  let snapshotOK=true;      // is de laatste schrijfpoging gelukt? (false = opslag vol)
  let snapshotIDB=false;    // staat de momentopname al in IndexedDB?
  let snapT=null;
  function bouwSlim(){
    return {
      prijzen: cache.prijzen.map(p=>({id:p.id,cat:p.cat,naam:p.naam,stock:p.stock,inGebruik:p.inGebruik,foto:''})),
      boekjes: cache.boekjes, formulieren: cache.formulieren, leveringen: zonderFoto(cache.leveringen),
      bestellingen: cache.bestellingen, contacten: cache.contacten, checklisten: cache.checklisten, logboek: cache.logboek, gebruikers: zonderFoto(cache.gebruikers), activiteit: cache.activiteit,
      projecten: cache.projecten, projecttaken: cache.projecttaken, projectberichten: cache.projectberichten,
      projectagenda: cache.projectagenda, projectdocs: cache.projectdocs,
      manualsdoc: cache.manualsdoc, appconfig: cache.appconfig, spelarchief: cache.spelarchief
    };
  }
  const idbKan=()=>typeof indexedDB!=='undefined';
  // Terugval voor browsers zonder IndexedDB (privémodus, oude toestellen): dan toch maar
  // localStorage, met dezelfde beperking als vroeger.
  function schrijfNaarLocalStorage(){
    try{ localStorage.setItem(K_CACHE,JSON.stringify(snapshot)); snapshotOK=true; }
    catch(e){
      // Bijna altijd: de snelle opslag zit vol. Vroeger verdween dat geruisloos; nu komt
      // het in het Systeem-scherm te staan, zodat je weet dat er niets meer bewaard wordt.
      snapshotOK=false; noteFout('Lokale opslag',e);
    }
  }
  function schrijfSnapshot(){
    if(!snapshot) return;
    if(!idbKan()){ schrijfNaarLocalStorage(); return; }
    idbSet(IDB_SNAPSHOT,snapshot).then(()=>{
      snapshotOK=true;
      // Gelukt → de oude kopie in localStorage mag weg; die ruimte hebben we niet meer nodig.
      if(!snapshotIDB){ snapshotIDB=true; try{localStorage.removeItem(K_CACHE);}catch(e){} }
    }).catch(e=>{ noteFout('Lokale opslag (IndexedDB)',e); schrijfNaarLocalStorage(); });
  }
  // BELANGRIJK: standaard schrijven we METEEN weg, niet uitgesteld. Voor tabellen die nog
  // niet in de database bestaan is deze momentopname namelijk de énige kopie — daar zou een
  // uitgestelde schrijfactie een wijziging kwijtspelen als je meteen naar een andere pagina
  // gaat. Alleen het tikken in de voorraadvelden (queue) gaat gebundeld: dat vuurt bij elke
  // toetsaanslag, en daar is de wijziging ook nog op andere manieren gedekt.
  let bulkLaden=false;   // tijdens het opstarten: pas op het einde één keer wegschrijven
  function persistCache(uitstellen){
    // Zolang de bewaarde stand nog niet ingelezen is (IndexedDB leest asynchroon), mogen we
    // niets wegschrijven: de cache is dan nog leeg en zou de offline kopie wissen.
    if(!snapshotGeladen) return;
    snapshot=bouwSlim();
    bewaarNamenSnel();   // ook tijdens het bulk-laden: de namen zijn maar een paar regels
    // Bij het laden komen vijftien tabellen tegelijk binnen; zonder dit zou elke tabel een
    // volledige herschrijving van de offline kopie uitlokken.
    if(bulkLaden) return;
    if(!idbKan()) schrijfNaarLocalStorage();
    else if(uitstellen===true){ clearTimeout(snapT); snapT=setTimeout(()=>{ snapT=null; schrijfSnapshot(); },400); }
    else { clearTimeout(snapT); snapT=null; schrijfSnapshot(); }
    savePhotosToIDB();
  }
  // Bij het sluiten van de pagina niet wachten op de timer.
  function snapshotNu(){ if(snapT){ clearTimeout(snapT); snapT=null; schrijfSnapshot(); } }
  if(typeof window!=='undefined' && window.addEventListener){
    window.addEventListener('pagehide',snapshotNu);
    if(typeof document!=='undefined' && document.addEventListener)
      document.addEventListener('visibilitychange',()=>{ if(document.hidden) snapshotNu(); });
  }
  // Eén keer bij het opstarten: de laatst bewaarde stand ophalen. Eerst uit IndexedDB;
  // staat ze daar nog niet, dan uit de oude plek in localStorage (en daarna verhuist ze).
  async function laadSnapshot(){
    try{
      if(idbKan()){
        try{ const s=await idbGet(IDB_SNAPSHOT); if(s&&typeof s==='object'){ snapshot=s; snapshotIDB=true; return; } }catch(e){}
      }
      try{ const r=localStorage.getItem(K_CACHE); snapshot=r?(JSON.parse(r)||null):null; }catch(e){ snapshot=null; }
    } finally { snapshotGeladen=true; }
  }
  // Ruimt de oude dubbele kopieën op. Dat mag altijd: bij het opstarten zijn ze al in de
  // cache ingelezen (zie overlayOudeKopieen), dus ze bevatten niets wat de momentopname niet
  // heeft. Zit de opslag al vol, dan lukt het schrijven pas ná het wissen — vandaar de
  // tweede poging. Zonder die volgorde blijft een volgelopen toestel voor altijd vastzitten.
  function wisOudeKopieen(){
    let vrij=0;
    // De momentopname in localStorage mag pas weg als ze veilig in IndexedDB staat.
    const wis=OUDE_BACKUPS.concat(snapshotIDB?[K_CACHE]:[]);
    wis.forEach(k=>{
      try{ const v=localStorage.getItem(k); if(v!=null){ vrij+=(k.length+v.length)*2; localStorage.removeItem(k); } }catch(e){}
    });
    return vrij;
  }
  function opruimen(){
    persistCache();
    clearTimeout(snapT); snapT=null;
    schrijfSnapshot();             // meteen wegschrijven, niet wachten op de timer
    if(snapshotOK) return wisOudeKopieen();
    // Geen IndexedDB én de snelle opslag zit vol: eerst plaats maken, dan opnieuw proberen.
    const vrij=wisOudeKopieen();
    schrijfNaarLocalStorage();
    return vrij;
  }
  // Bij elke start één keer opruimen. Een toestel met een volgelopen opslag lost zichzelf
  // zo op, zonder dat iemand iets moet aanklikken.
  function autoOpruimen(){
    const vrij=opruimen();
    if(vrij>1024) console.log('Opslag opgeruimd: '+Math.round(vrij/1024)+' kB vrijgemaakt.');
  }
  // ---- De namenlijst apart en piepklein bewaren (voor een snel inlogscherm) ----
  // De volledige momentopname staat in IndexedDB en die inlezen duurt op een gsm al gauw
  // een halve seconde of meer (prijzen, bestellingen, projecten, 500 activiteitsregels…).
  // Het inlogscherm heeft daar niets aan: het wil enkel de namen. Die zetten we daarom ook
  // in localStorage — dat leest synchroon, dus de tegels staan er meteen, nog vóór er iets
  // uit IndexedDB of van de database komt. Zonder foto's (die zijn te groot en komen
  // vanzelf uit IndexedDB achterna; tot dan tonen we de initialen).
  let _namenSig='';
  function bewaarNamenSnel(){
    try{
      const tekst=JSON.stringify((cache.gebruikers||[]).map(u=>({id:u.id,naam:u.naam||'',pin:u.pin||'',rol:u.rol||'',foto:'',ts:u.ts||0})));
      if(tekst===_namenSig) return;      // niets veranderd → niet herschrijven
      _namenSig=tekst;
      localStorage.setItem(K_NAMEN_SNEL,tekst);
    }catch(e){}
  }
  function laadNamenSnel(){
    try{
      const r=localStorage.getItem(K_NAMEN_SNEL); const a=r?JSON.parse(r):null;
      if(Array.isArray(a)&&a.length){ cache.gebruikers=a.map(mapGebr); _namenSig=r; return true; }
    }catch(e){}
    return false;
  }
  function loadCacheFallback(){
    try{ cache.sessies=JSON.parse(localStorage.getItem('bb_sessies')||'[]')||[]; }catch(e){ cache.sessies=[]; }
    try{ const c=snapshot; if(!c) { overlayOudeKopieen(); return false; }
      cache.prijzen=c.prijzen||[]; cache.boekjes=c.boekjes||{stock:0}; cache.formulieren=c.formulieren||[];
      cache.leveringen=c.leveringen||[]; cache.bestellingen=c.bestellingen||[]; cache.contacten=c.contacten||[];
      cache.checklisten=c.checklisten||[]; cache.logboek=c.logboek||[]; cache.gebruikers=c.gebruikers||[]; cache.activiteit=c.activiteit||[];
      cache.projecten=c.projecten||[]; cache.projecttaken=c.projecttaken||[]; cache.projectberichten=c.projectberichten||[];
      cache.projectagenda=c.projectagenda||[]; cache.projectdocs=c.projectdocs||[];
      cache.manualsdoc=c.manualsdoc||null; cache.appconfig=c.appconfig||null; cache.spelarchief=c.spelarchief||null;
      overlayOudeKopieen();
      return true;
    }catch(e){ overlayOudeKopieen(); return false; }
  }
  // Op een toestel waar de opslag al vol zat, kon de (grote) momentopname niet meer
  // geschreven worden terwijl de kleine losse kopieën dat nog wel lukten. Die zijn dan
  // nieuwer en krijgen voorrang. Pas daarna mogen ze opgeruimd worden.
  function overlayOudeKopieen(){
    BACKUP_PAREN.forEach(p=>{
      try{ const r=localStorage.getItem(p[1]); if(r==null) return;
        const a=JSON.parse(r); if(Array.isArray(a)) cache[p[0]]=a; }catch(e){}
    });
    // Laatste terugval voor de namen: zonder namenlijst kan niemand inloggen.
    if(!cache.gebruikers.length) laadNamenSnel();
  }

  // ---- Foto's offline bewaren in IndexedDB (veel ruimer dan localStorage) ----
  // Elke foto is een data-URL van tientallen kB. Drie lijsten dragen er een: prijzen,
  // leveringen en gebruikers (profielfoto). In localStorage lopen die de opslag in geen
  // tijd vol; IndexedDB heeft honderden MB's. In de momentopname staat daarom foto:''.
  const IDB_NAME='bb_offline', IDB_STORE='kv', IDB_PHOTOKEY='prijzenfoto';
  const IDB_LEVFOTO='leveringfoto', IDB_GEBRFOTO='gebruikerfoto';
  const IDB_SNAPSHOT='momentopname';   // de volledige offline kopie (zie hierboven)
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
  const _fotoSig={};
  function bewaarFotos(sleutel,lijst){
    try{
      if(typeof indexedDB==='undefined') return;
      const met=(lijst||[]).filter(x=>x&&x.foto);
      const sig=met.map(x=>x.id+':'+x.foto.length).join('|');
      if(sig===_fotoSig[sleutel]) return;                    // niets veranderd → niets doen
      if(!met.length && !_fotoSig[sleutel]) return;          // nog nooit foto's → geen lege schrijf
      _fotoSig[sleutel]=sig;
      idbSet(sleutel,met.map(x=>({id:x.id,foto:x.foto}))).catch(()=>{});
    }catch(e){}
  }
  // 'geef' is een functie, geen lijst: het ophalen duurt even, en ondertussen kan de
  // database-versie van diezelfde lijst al binnen zijn. We vullen dus de lijst aan zoals
  // ze op dát moment is, niet zoals ze was toen we begonnen.
  function herstelFotos(sleutel,geef){
    if(typeof indexedDB==='undefined') return Promise.resolve();
    return idbGet(sleutel).then(list=>{
      if(!Array.isArray(list)||!list.length) return;
      const lijst=geef()||[];
      const by={}; list.forEach(x=>{ if(x&&x.id) by[x.id]=x.foto||''; });
      lijst.forEach(x=>{ if(x && !x.foto && by[x.id]) x.foto=by[x.id]; });
      _fotoSig[sleutel]=lijst.filter(x=>x&&x.foto).map(x=>x.id+':'+x.foto.length).join('|');
    }).catch(()=>{});
  }
  function savePhotosToIDB(){
    bewaarFotos(IDB_PHOTOKEY,cache.prijzen);
    bewaarFotos(IDB_LEVFOTO,cache.leveringen);
    bewaarFotos(IDB_GEBRFOTO,cache.gebruikers);
  }
  // Bij offline laden: de foto's terug in de cache zetten (localStorage bevat ze niet).
  function restorePhotosFromIDB(){
    return Promise.all([
      herstelFotos(IDB_PHOTOKEY,()=>cache.prijzen),
      herstelFotos(IDB_LEVFOTO,()=>cache.leveringen),
      herstelFotos(IDB_GEBRFOTO,()=>cache.gebruikers)
    ]).then(()=>{});
  }

  // ---- Checklist-media (foto/video) offline bewaren in IndexedDB, per id ----
  // Video's zijn te groot voor localStorage; we bewaren het bestand (blob) in IndexedDB
  // en houden in het checklist-item enkel een verwijzing (id) bij.
  const IDB_MEDIA='chkmedia:';
  function setChkMedia(id,blob){ return idbSet(IDB_MEDIA+id,blob); }
  function getChkMedia(id){ return idbGet(IDB_MEDIA+id); }
  function delChkMedia(id){
    return idbOpen().then(db=>new Promise((res,rej)=>{
      const tx=db.transaction(IDB_STORE,'readwrite'); tx.objectStore(IDB_STORE).delete(IDB_MEDIA+id);
      tx.oncomplete=()=>{db.close();res();}; tx.onerror=()=>{db.close();rej(tx.error);};
    }));
  }

  // ---- Outbox: wijzigingen die nog naar de database moeten (overleven offline) ----
  let outbox=[]; try{const r=localStorage.getItem(K_OUTBOX); outbox=r?(JSON.parse(r)||[]):[];}catch(e){outbox=[];}
  let flushing=false, retryT=null;
  function saveOutbox(){ try{localStorage.setItem(K_OUTBOX,JSON.stringify(outbox));}catch(e){} }
  function pendingCount(){ return outbox.length; }
  function enqueue(op){ outbox.push(op); saveOutbox(); persistCache(); flushOutbox(); }
  function dbInsert(table,payload){ enqueue({op:'insert',table,payload}); }
  function dbUpsert(table,payload){ enqueue({op:'upsert',table,payload}); }
  function dbUpdate(table,col,val,payload){ enqueue({op:'update',table,col,val,payload}); }
  function dbDelete(table,col,val){ enqueue({op:'delete',table,col,val}); }
  // Verzoek met tijdslimiet: op een netwerk ZONDER echt internet (bv. TP-Link/mengpaneel)
  // blijft een verzoek anders eindeloos hangen en loopt de app vast. Na de limiet
  // behandelen we het als "netwerk weg" → wachtrij behouden en later opnieuw proberen.
  function withTimeout(p,ms){
    return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms||12000))]);
  }
  async function flushOutbox(){
    if(flushing||!sb||!outbox.length) return;
    if(typeof navigator!=='undefined' && navigator.onLine===false) return;
    flushing=true;
    try{
      while(outbox.length){
        const op=outbox[0]; let res, netErr=false;
        try{
          const q=sb.from(op.table); let call;
          if(op.op==='insert') call=q.insert(op.payload);
          else if(op.op==='upsert') call=q.upsert(op.payload);
          else if(op.op==='update') call=q.update(op.payload).eq(op.col,op.val);
          else if(op.op==='delete') call=q.delete().eq(op.col,op.val);
          else { outbox.shift(); saveOutbox(); continue; }
          res=await withTimeout(call,12000);
        }catch(e){ netErr=true; noteFout('Versturen naar '+op.table,e); } // netwerk weg of time-out → wachtrij behouden, later opnieuw proberen
        if(netErr) break;
        if(res && res.error){
          noteFout('Versturen naar '+op.table,res.error);
          // Serverfout (bv. tijdelijke time-out of een grote foto): enkele keren opnieuw
          // proberen i.p.v. de wijziging meteen weg te gooien. Zo komt een foto die de
          // eerste keer faalt alsnog in de database en dus op de andere toestellen.
          op._tries=(op._tries||0)+1;
          if(op._tries<5){ saveOutbox(); break; }
          console.error('Outbox — opgegeven na '+op._tries+' pogingen:',res.error.message||res.error);
          outbox.shift(); saveOutbox(); continue;
        }
        if(op._tries) delete op._tries;
        outbox.shift(); saveOutbox(); noteSync();
      }
    } finally {
      flushing=false;
      // Bleven er wijzigingen staan (na een fout) en zijn we online? Plan een nieuwe poging.
      if(outbox.length && !(typeof navigator!=='undefined' && navigator.onLine===false)){
        clearTimeout(retryT); retryT=setTimeout(()=>{ retryT=null; flushOutbox(); }, 6000);
      }
      fire();
    }
  }
  if(typeof window!=='undefined'){ window.addEventListener('online',()=>flushOutbox()); }

  // ---- Kolommen ZONDER de foto (zie haalFotosVoor hieronder) ----
  // Een foto is bij ons een afbeelding van 1000 px die als tekst in de tabel staat: al
  // gauw 150 kB per stuk, en de inventaris telt er 180. Die haalden we bij ELKE start mee
  // op — megabytes, nog vóór de app bruikbaar was, en opnieuw bij elke wijziging van een
  // collega. Nu vragen we bij het opstarten alle kolommen BEHALVE de foto, en komen de
  // foto's er achteraf rustig bij.
  const KOL_PRIJZEN='id,cat,naam,stock,in_gebruik';
  const KOL_LEVERINGEN='id,ts,datum,boekjes,tekst';
  const KOL_GEBRUIKERS='id,naam,pin,rol,ts';
  // Vangnet: bestaat een van die kolommen (nog) niet in de tabel, dan vragen we gewoon
  // alles op. Beter één verzoek te veel dan een lege inventaris.
  async function selectSmal(tabel,kolommen){
    const r=await sb.from(tabel).select(kolommen);
    return r.error ? await sb.from(tabel).select('*') : r;
  }
  // Een verse lijst uit de database heeft geen foto's; die staan hier al (uit IndexedDB of
  // van eerder). Deze zet ze terug op hun plaats, zodat ze niet van het scherm verdwijnen.
  function behoudFotos(oud,nieuw){
    const per={}; (oud||[]).forEach(x=>{ if(x&&x.foto) per[x.id]=x.foto; });
    (nieuw||[]).forEach(x=>{ if(x&&!x.foto&&per[x.id]) x.foto=per[x.id]; });
    return nieuw;
  }

  // ---- mapping database <-> app (app gebruikt inGebruik, db gebruikt in_gebruik) ----
  const fromRow=r=>({id:r.id,cat:r.cat,naam:r.naam,stock:r.stock||0,inGebruik:!!r.in_gebruik,foto:r.foto||''});
  const toRow=p=>({id:p.id,cat:p.cat==='groot'?'groot':'klein',naam:p.naam||'',stock:+p.stock||0,in_gebruik:!!p.inGebruik,foto:p.foto||''});
  // Zelfde rij, maar ZONDER de foto — voor gewone wijzigingen (voorraad, naam, in gebruik).
  // Twee redenen: de foto verandert daar niet en is groot, én ze is misschien nog niet
  // ingeladen (foto's komen achteraf). Zouden we ze toch meesturen, dan zetten we een lege
  // foto over de echte in de database. De foto zelf gaat enkel mee via setFoto().
  const toRowKaal=p=>({id:p.id,cat:p.cat==='groot'?'groot':'klein',naam:p.naam||'',stock:+p.stock||0,in_gebruik:!!p.inGebruik});
  const mapForm=r=>({id:r.id,ts:r.ts,namen:r.namen||'',kleine:r.kleine||[],groot:r.groot||[],boekjes:r.boekjes||{},finale:r.finale||'',opmerking:r.opmerking||''});
  const mapBestel=r=>({id:r.id,ts:r.ts||0,datum:r.besteldatum||'',cat:r.categorie||'',info:r.info||'',status:r.status||'Besteld',aantal:r.aantal||'',ent:+r.kost_ent||0,bay:+r.kost_bay||0,hsb:+r.kost_hsb||0,leverancier:r.leverancier||'',leverdatum:r.leverdatum||'',door:r.door||'',opm:r.opmerking||''});
  const bestelToRow=b=>({id:b.id,ts:b.ts||0,besteldatum:b.datum||'',categorie:b.cat||'',info:b.info||'',status:b.status||'Besteld',aantal:b.aantal||'',kost_ent:+b.ent||0,kost_bay:+b.bay||0,kost_hsb:+b.hsb||0,leverancier:b.leverancier||'',leverdatum:b.leverdatum||'',door:b.door||'',opmerking:b.opm||''});
  const mapContact=r=>({id:r.id,naam:r.naam||'',rol:r.rol||'',tel:r.tel||'',mail:r.mail||'',ts:r.ts||0});
  const contactToRow=c=>({id:c.id,naam:c.naam||'',rol:c.rol||'',tel:c.tel||'',mail:c.mail||'',ts:c.ts||0});
  const mapChecklist=r=>({id:r.id,naam:r.naam||'',items:Array.isArray(r.items)?r.items:(r.items?(function(){try{return JSON.parse(r.items)}catch(e){return []}})():[]),pos:+r.pos||0,ts:r.ts||0});
  const checklistToRow=c=>({id:c.id,naam:c.naam||'',items:c.items||[],pos:+c.pos||0,ts:c.ts||0});
  const mapLog=r=>({id:r.id,ts:r.ts||0,datum:r.datum||'',auteur:r.auteur||'',tekst:r.tekst||'',klaar:!!r.klaar});
  const logToRow=l=>({id:l.id,ts:l.ts||0,datum:l.datum||'',auteur:l.auteur||'',tekst:l.tekst||'',klaar:!!l.klaar});
  const mapGebr=r=>({id:r.id,naam:r.naam||'',pin:r.pin||'',rol:r.rol||'',foto:r.foto||'',ts:r.ts||0});
  const gebrToRow=g=>({id:g.id,naam:g.naam||'',pin:g.pin||'',rol:g.rol||'',foto:g.foto||'',ts:g.ts||0});
  const gebrToRowKaal=g=>({id:g.id,naam:g.naam||'',pin:g.pin||'',rol:g.rol||'',ts:g.ts||0});  // zonder foto, zie toRowKaal
  const mapAct=r=>({id:r.id,ts:r.ts||0,wie:r.wie||'',actie:r.actie||''});
  const actToRow=a=>({id:a.id,ts:a.ts||0,wie:a.wie||'',actie:a.actie||''});
  // ---- Projecten (bord met taken + bespreking) ----
  const arr=v=>Array.isArray(v)?v:(v?(function(){try{const p=JSON.parse(v);return Array.isArray(p)?p:[];}catch(e){return [];}})():[]);
  const mapProject=r=>({id:r.id,naam:r.naam||'',doel:r.doel||'',status:r.status||'Lopend',kleur:r.kleur||'',
    start:r.start||'',deadline:r.deadline||'',verantwoordelijke:r.verantwoordelijke||'',
    kolommen:arr(r.kolommen),pos:+r.pos||0,archief:!!r.archief,ts:r.ts||0});
  const projectToRow=p=>({id:p.id,naam:p.naam||'',doel:p.doel||'',status:p.status||'Lopend',kleur:p.kleur||'',
    start:p.start||'',deadline:p.deadline||'',verantwoordelijke:p.verantwoordelijke||'',
    kolommen:p.kolommen||[],pos:+p.pos||0,archief:!!p.archief,ts:p.ts||0});
  const mapTaak=r=>({id:r.id,projectId:r.project_id||'',kolom:r.kolom||'',titel:r.titel||'',omschrijving:r.omschrijving||'',
    wie:arr(r.wie),deadline:r.deadline||'',labels:arr(r.labels),subtaken:arr(r.subtaken),
    pos:+r.pos||0,klaar:!!r.klaar,klaarDoor:r.klaar_door||'',klaarTs:r.klaar_ts||0,door:r.door||'',ts:r.ts||0});
  const taakToRow=t=>({id:t.id,project_id:t.projectId||'',kolom:t.kolom||'',titel:t.titel||'',omschrijving:t.omschrijving||'',
    wie:t.wie||[],deadline:t.deadline||'',labels:t.labels||[],subtaken:t.subtaken||[],
    pos:+t.pos||0,klaar:!!t.klaar,klaar_door:t.klaarDoor||'',klaar_ts:t.klaarTs||0,door:t.door||'',ts:t.ts||0});
  const mapBericht=r=>({id:r.id,projectId:r.project_id||'',soort:r.soort||'bericht',ts:r.ts||0,
    auteur:r.auteur||'',tekst:r.tekst||'',data:(r.data&&typeof r.data==='object')?r.data:{}});
  const berichtToRow=b=>({id:b.id,project_id:b.projectId||'',soort:b.soort||'bericht',ts:b.ts||0,
    auteur:b.auteur||'',tekst:b.tekst||'',data:b.data||{}});
  const mapAgenda=r=>({id:r.id,projectId:r.project_id||'',datum:r.datum||'',van:r.van||'',tot:r.tot||'',
    titel:r.titel||'',soort:r.soort||'afspraak',plaats:r.plaats||'',wie:arr(r.wie),notitie:r.notitie||'',
    door:r.door||'',ts:r.ts||0});
  const agendaToRow=a=>({id:a.id,project_id:a.projectId||'',datum:a.datum||'',van:a.van||'',tot:a.tot||'',
    titel:a.titel||'',soort:a.soort||'afspraak',plaats:a.plaats||'',wie:a.wie||[],notitie:a.notitie||'',
    door:a.door||'',ts:a.ts||0});
  const mapDoc=r=>({id:r.id,projectId:r.project_id||'',naam:r.naam||'',url:r.url||'',soort:r.soort||'Overig',
    bron:r.bron||'link',mime:r.mime||'',grootte:+r.grootte||0,taakId:r.taak_id||'',door:r.door||'',ts:r.ts||0});
  const docToRow=d=>({id:d.id,project_id:d.projectId||'',naam:d.naam||'',url:d.url||'',soort:d.soort||'Overig',
    bron:d.bron||'link',mime:d.mime||'',grootte:+d.grootte||0,taak_id:d.taakId||'',door:d.door||'',ts:d.ts||0});

  // ---------------- TOEGANG (gedeelde toegangscode) ----------------
  // De sleutel bovenaan dit bestand staat leesbaar in de broncode. Dat hoort zo bij Supabase:
  // het is geen wachtwoord maar een adreslabel. De echte grendel zit in de database zelf
  // (zie docs/beveiliging-supabase.sql): die geeft enkel gegevens vrij aan wie aangemeld is.
  // Daarom meldt de app zich hier eerst aan met één gedeeld account. De toegangscode typ je
  // maar één keer per toestel — daarna onthoudt de browser de aanmelding.
  //
  // TEAM_EMAIL is enkel een inlognaam bij Supabase, géén werkend mailadres en géén
  // websiteadres. Er wordt nooit mail naartoe gestuurd. Krijgt de site later een eigen
  // domeinnaam, dan hoeft dit dus niet mee te veranderen.
  const TEAM_EMAIL='team@entertainment.app';

  async function zorgVoorToegang(){
    try{
      const {data}=await sb.auth.getSession();
      if(data&&data.session) return true; // dit toestel is al aangemeld
    }catch(e){}
    if(!navigator.onLine) return false;   // nog nooit aangemeld én geen internet → lokale modus
    let fout='';
    for(;;){
      const code=await vraagToegangscode(fout);
      if(code===null) return false;       // "Verder zonder internet" gekozen
      if(!code){ fout='Vul de toegangscode in.'; continue; }
      const {error}=await sb.auth.signInWithPassword({email:TEAM_EMAIL,password:code});
      if(!error) return true;
      fout='Deze code klopt niet. Probeer opnieuw.';
    }
  }

  // Eigen schermpje in code (geen HTML nodig), zodat het op alle drie de pagina's werkt.
  function vraagToegangscode(fout){
    return new Promise(resolve=>{
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;'+
        'justify-content:center;padding:24px;background:#0f1f3d;'+
        'font-family:system-ui,-apple-system,Segoe UI,sans-serif';
      ov.innerHTML=
        '<div style="width:100%;max-width:380px;background:#fff;border-radius:18px;padding:26px;'+
          'box-shadow:0 18px 50px rgba(0,0,0,.35);text-align:center">'+
        '<h2 style="margin:0 0 6px;font-size:20px;color:#0f1f3d">Toegangscode</h2>'+
        '<p style="margin:0 0 18px;font-size:14px;line-height:1.45;color:#5a6a85">'+
          'Vul de code van het team in. Dat hoeft maar één keer op dit toestel.</p>'+
        '<input id="bbToegangInput" type="password" autocomplete="current-password" '+
          'style="width:100%;box-sizing:border-box;padding:13px 14px;font-size:17px;text-align:center;'+
          'border:2px solid #d7dceb;border-radius:12px;outline:none">'+
        '<p id="bbToegangFout" style="margin:10px 0 0;font-size:13px;color:#c0392b;min-height:18px"></p>'+
        '<button id="bbToegangOk" style="width:100%;margin-top:10px;padding:13px;font-size:16px;'+
          'font-weight:700;color:#fff;background:#ff5d8f;border:0;border-radius:12px;cursor:pointer">'+
          'Openen</button>'+
        '<button id="bbToegangOff" style="margin-top:14px;background:none;border:0;font-size:13px;'+
          'color:#5a6a85;text-decoration:underline;cursor:pointer">Verder zonder internet</button>'+
        '</div>';
      document.body.appendChild(ov);
      const inp=ov.querySelector('#bbToegangInput');
      if(fout) ov.querySelector('#bbToegangFout').textContent=fout;
      const klaar=v=>{ ov.remove(); resolve(v); };
      ov.querySelector('#bbToegangOk').onclick=()=>klaar(inp.value.trim());
      ov.querySelector('#bbToegangOff').onclick=()=>klaar(null);
      inp.addEventListener('keydown',e=>{ if(e.key==='Enter') klaar(inp.value.trim()); });
      inp.focus();
    });
  }

  // ---------------- INIT ----------------
  // Vraag de browser om onze offline gegevens te bewaren. Zonder dit mag ze IndexedDB
  // opruimen wanneer het toestel plaats tekortkomt — precies op het moment dat je zonder
  // internet in een zaal staat. De vraag wordt maar één keer per toestel gesteld en levert
  // op de meeste tablets stilzwijgend "ja" op (een geïnstalleerde app krijgt het vanzelf).
  let blijvend=null;
  async function vraagBlijvendeOpslag(){
    try{
      if(!navigator.storage || !navigator.storage.persist) return;
      blijvend=await navigator.storage.persisted();
      if(!blijvend) blijvend=await navigator.storage.persist();
    }catch(e){ blijvend=null; }
  }

  async function init(){
    // Mag veilig meerdere keren aangeroepen worden (bv. de pagina én de zoekfunctie doen dit):
    // enkel de eerste keer telt, de rest is een no-op.
    if(init.__gestart) return; init.__gestart=true;
    // ALLEREERST de namen (synchroon uit localStorage, een paar honderd bytes). Zo staat
    // het inlogscherm er meteen; vroeger wachtte het op de volledige offline kopie uit
    // IndexedDB hieronder, en dat is op een gsm het verschil tussen meteen en enkele seconden.
    if(laadNamenSnel()) fire();
    await laadSnapshot();       // de offline kopie inlezen (IndexedDB) vóór er iets uit gelezen wordt
    bewaarLokaleProjectstand(); // eerst vastleggen wat er lokaal staat, vóór het synchroniseren
    eenmaligWachtVullen();      // bestaande projecten van vóór deze versie alsnog laten vertrekken
    // METEEN tonen wat we al weten — vooral de namenlijst met de rollen. Anders is de app
    // de eerste seconden "leeg" en denkt ze dat je geen rechten hebt, tot de database
    // antwoordt. Wat hier staat is de laatst bekende stand; loadAll() ververst het zo meteen.
    loadCacheFallback();
    fire();
    // Deze twee mogen het scherm niet ophouden: de foto's kunnen megabytes zijn, en de
    // vraag om blijvende opslag heeft niets met tonen te maken. Ze komen er vanzelf bij.
    restorePhotosFromIDB().then(fire);
    vraagBlijvendeOpslag();
    if(!window.supabase){
      // Bibliotheek niet geladen (zeldzaam, bv. offline vóór ze ooit gecacht is):
      // toch de laatst bewaarde gegevens tonen zodat lezen én inloggen offline werken.
      // Schrijfacties wachten in de outbox tot er weer verbinding is.
      console.warn('Supabase-bibliotheek niet geladen — lokale (offline) modus.');
      noteFout('Opstarten','de Supabase-bibliotheek is niet geladen');
      ensureEntAlgemeen();
      autoOpruimen();
      ready=true; fire();
      return;
    }
    libOK=true;
    sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const toegang=await zorgVoorToegang();
    aangemeld=!!toegang;
    if(!toegang){
      noteFout('Aanmelden','dit toestel is niet aangemeld bij de database (toegangscode overgeslagen of geen internet)');
      // Niet aangemeld (offline, of code overgeslagen): we tonen wat er lokaal bewaard staat
      // (hierboven al ingeladen). Schrijfacties wachten in de outbox tot dit toestel weer
      // aangemeld en online is.
      ensureEntAlgemeen();
      autoOpruimen();
      ready=true; fire();
      return;
    }
    await loadAll();
    await migrateIfEmpty();
    await migrateBestelIfNeeded();
    await topUpBestelDefaults();
    await migrateSharedLists();
    ensureEntAlgemeen(); // gedeeld account "ENT algemeen" (zonder pincode) altijd beschikbaar
    normalizeInGebruik(); // prijzen op 0 die nog "in gebruik" stonden opschonen + syncen
    subscribe();
    flushOutbox(); // eventuele offline gemaakte wijzigingen alsnog doorsturen
    autoOpruimen();
    ready=true;
    fire();
    // Pas nu, met de app al bruikbaar op het scherm, de foto's die dit toestel nog mist.
    // Bewust géén await: niets mag hierop wachten.
    haalFotosBij();
  }
  // Bestaande lokale lijsten delen zodra de gedeelde tabel bestaat en nog leeg is.
  async function migrateListToShared(table,toRowFn,cacheKey,backupKey,okGetter){
    if(!okGetter() || cache[cacheKey].length) return;
    const FLAG='bb_sharedseed_'+table;
    if(localStorage.getItem(FLAG)==='1') return; // dit toestel deelde de lijst al eerder
    const backup=lokaleKopie(cacheKey,backupKey);
    if(backup.length){
      for(let i=0;i<backup.length;i+=40){ const r=await sb.from(table).insert(backup.slice(i,i+40).map(toRowFn)); err(r); }
      cache[cacheKey]=backup.slice();
    }
    localStorage.setItem(FLAG,'1');
  }
  // Projecten inhalen: alles wat op dit toestel is aangemaakt terwijl de gedeelde tabel
  // er nog niet was (of terwijl er geen internet was) alsnog naar de database sturen.
  // We vergelijken op id: wat de database al kent laten we met rust, de rest gaat mee.
  // Anders dan bij de oude lijsten gebruiken we hier géén eenmalige vlag — die zorgde
  // ervoor dat later lokaal aangemaakte projecten voorgoed op één toestel bleven staan.
  async function seedProjectTable(table,toRowFn,cacheKey,backupKey,okGetter){
    if(!okGetter()) return;
    const wacht=(projWacht[table]||[]).slice();
    if(!wacht.length) return;
    // Wat nog moet vertrekken, halen we uit de stand van vóór het synchroniseren.
    const lokaal=lokaalVoorSync[cacheKey]||[];
    const teSturen=lokaal.filter(x=>x&&x.id&&wacht.indexOf(x.id)>=0);
    if(!teSturen.length){ wachtWeg(table,wacht); return; } // lokaal alweer verwijderd → niets te doen
    for(let i=0;i<teSturen.length;i+=40){
      const r=await sb.from(table).upsert(teSturen.slice(i,i+40).map(toRowFn));
      err(r);
      if(r&&r.error) return; // mislukt → id's blijven wachten, we proberen het later opnieuw
    }
    const bekend={}; cache[cacheKey].forEach(x=>{ if(x&&x.id) bekend[x.id]=true; });
    cache[cacheKey]=cache[cacheKey].concat(teSturen.filter(x=>!bekend[x.id]));
    saveBackup(cacheKey,backupKey);
    wachtWeg(table,wacht);
    console.log('Projecten: '+teSturen.length+' rij(en) uit "'+table+'" alsnog gedeeld.');
  }
  function defaultChecklist(){
    const items=['Boekjes geteld en klaar','Super Deals op het rek','Trolley Tunes muziek klaar','How Much? potten + weegschaal klaar','Crazy Coins munten klaar','Finalevragen voorbereid','Micro getest','Geluid/muziek getest','Prijzentafel klaar','Controleblad bij de hand'].map(t=>({text:t,done:false}));
    return {id:uid(),naam:'Pre-spel checklist',items,pos:0,ts:Date.now()};
  }
  async function migrateSharedLists(){
    await migrateListToShared('contacten',contactToRow,'contacten',K_CONTACTEN_BACKUP,()=>contactenOK);
    await migrateListToShared('checklisten',checklistToRow,'checklisten',K_CHECKLISTEN_BACKUP,()=>checklistenOK);
    await migrateListToShared('logboek',logToRow,'logboek',K_LOGBOEK_BACKUP,()=>logboekOK);
    await migrateListToShared('gebruikers',gebrToRow,'gebruikers',K_GEBRUIKERS_BACKUP,()=>gebruikersOK);
    await seedProjectTable('projecten',projectToRow,'projecten',K_PROJECTEN_BACKUP,()=>projectenOK);
    await seedProjectTable('projecttaken',taakToRow,'projecttaken',K_PROJTAKEN_BACKUP,()=>projecttakenOK);
    await seedProjectTable('projectberichten',berichtToRow,'projectberichten',K_PROJBERICHTEN_BACKUP,()=>projectberichtenOK);
    await seedProjectTable('projectagenda',agendaToRow,'projectagenda',K_PROJAGENDA_BACKUP,()=>projectagendaOK);
    await seedProjectTable('projectdocs',docToRow,'projectdocs',K_PROJDOCS_BACKUP,()=>projectdocsOK);
    if(checklistenOK && !cache.checklisten.length && localStorage.getItem('bb_sharedseed_checklisten_def')!=='1'){
      const def=defaultChecklist(); const r=await sb.from('checklisten').insert(checklistToRow(def)); err(r);
      cache.checklisten=[def]; saveBackup('checklisten',K_CHECKLISTEN_BACKUP);
      localStorage.setItem('bb_sharedseed_checklisten_def','1');
    }
  }
  // Eén gedeelde tabel laden; valt terug op de lokale back-up als de tabel nog niet bestaat.
  // 'kolommen' meegeven = de foto-kolom overslaan (die komt achteraf, zie haalFotosVoor).
  async function loadShared(table,cacheKey,mapFn,backupKey,setOK,kolommen){
    try{
      const r=kolommen ? await selectSmal(table,kolommen) : await sb.from(table).select('*');
      if(r.error){ setOK(false); loadBackup(cacheKey,backupKey); }
      else { setOK(true); cache[cacheKey]=behoudFotos(cache[cacheKey],(r.data||[]).map(mapFn)); if(cache[cacheKey].length) saveBackup(cacheKey,backupKey); }
    }catch(e){ setOK(false); loadBackup(cacheKey,backupKey); }
  }
  // Activiteitenlogboek: enkel de recentste 500 laden (kan lang worden).
  async function loadActiviteit(){
    try{
      const r=await sb.from('activiteit').select('*').order('ts',{ascending:false}).limit(500);
      if(r.error){ activiteitOK=false; loadBackup('activiteit',K_ACTIVITEIT_BACKUP); }
      else { activiteitOK=true; cache.activiteit=(r.data||[]).map(mapAct); if(cache.activiteit.length) saveBackup('activiteit',K_ACTIVITEIT_BACKUP); }
    }catch(e){ activiteitOK=false; loadBackup('activiteit',K_ACTIVITEIT_BACKUP); }
  }
  // ---- De foto's achteraf ophalen, op de achtergrond ----
  // Eerst vragen we enkel WELKE rijen een foto hebben — dat antwoord is een lijstje id's
  // van een paar honderd bytes. Daarna halen we alleen de foto's op die dit toestel nog
  // niet heeft, in pakketjes van 25, en tonen we ze per pakketje. Op een toestel dat al
  // eens gesynchroniseerd was is dat nul foto's: die staan al in IndexedDB.
  async function haalFotosVoor(tabel,cacheKey){
    if(!sb||!aangemeld) return false;
    try{
      const r=await sb.from(tabel).select('id').not('foto','is',null).neq('foto','');
      if(r.error) return false;                       // geen foto-kolom in deze tabel
      const heeft={}; (cache[cacheKey]||[]).forEach(x=>{ if(x&&x.foto) heeft[x.id]=1; });
      const missen=(r.data||[]).map(x=>x.id).filter(id=>!heeft[id]);
      if(!missen.length) return false;
      let iets=false;
      for(let i=0;i<missen.length;i+=25){
        const deel=await sb.from(tabel).select('id,foto').in('id',missen.slice(i,i+25));
        if(deel.error) break;
        const per={}; (deel.data||[]).forEach(x=>{ if(x.foto) per[x.id]=x.foto; });
        let nieuw=false;
        (cache[cacheKey]||[]).forEach(x=>{ if(x&&!x.foto&&per[x.id]){ x.foto=per[x.id]; nieuw=true; } });
        if(nieuw){ iets=true; fire(); }               // per pakketje tonen, niet aan het eind
      }
      return iets;
    }catch(e){ return false; }
  }
  let fotosBezig=false;
  async function haalFotosBij(){
    if(fotosBezig) return; fotosBezig=true;           // niet twee keer tegelijk
    try{
      let iets=false;
      for(const [tabel,key] of [['prijzen','prijzen'],['leveringen','leveringen'],['gebruikers','gebruikers']])
        if(await haalFotosVoor(tabel,key)) iets=true;
      if(iets) persistCache();                        // meteen offline bewaren (ook in IndexedDB)
    } finally { fotosBezig=false; }
  }
  async function loadAll(){
    let online=true;
    try{
      const [p,b,f,l]=await withTimeout(Promise.all([
        selectSmal('prijzen',KOL_PRIJZEN),
        sb.from('boekjes').select('*').eq('id',1).maybeSingle(),
        sb.from('formulieren').select('*'),
        selectSmal('leveringen',KOL_LEVERINGEN)
      ]),12000);
      if(p.error||b.error||f.error||l.error) throw (p.error||b.error||f.error||l.error);
      if(p.data) cache.prijzen=behoudFotos(cache.prijzen,p.data.map(fromRow));
      cache.boekjes={stock: b&&b.data? (b.data.stock||0) : 0};
      if(f.data) cache.formulieren=f.data.map(mapForm);
      if(l.data) cache.leveringen=behoudFotos(cache.leveringen,l.data.slice());
      kernOK=true; noteSync();
    }catch(e){ online=false; kernOK=false; noteFout('Kerngegevens laden',e); console.error('Laden mislukt (offline?):',e); }
    if(!online){ loadCacheFallback(); restorePhotosFromIDB().then(fire); return; } // geen internet → laatst bewaarde gegevens tonen, foto's volgen
    // Gedeelde extra tabellen (vallen lokaal terug als ze nog niet bestaan).
    // ALLEMAAL TEGELIJK: vroeger wachtte elk verzoek op het vorige — vijftien keer heen en
    // weer naar de server achter elkaar. Op een trage wifi is dat het verschil tussen een
    // paar honderd milliseconden en enkele seconden. Elke laadfunctie vangt haar eigen
    // fouten op en schrijft naar haar eigen plek, dus ze zitten elkaar niet in de weg.
    bulkLaden=true;
    try{
    await Promise.all([
      loadShared('bestellingen','bestellingen',mapBestel,K_BESTEL_BACKUP,v=>bestelOK=v),
      loadShared('contacten','contacten',mapContact,K_CONTACTEN_BACKUP,v=>contactenOK=v),
      loadShared('checklisten','checklisten',mapChecklist,K_CHECKLISTEN_BACKUP,v=>checklistenOK=v),
      loadShared('logboek','logboek',mapLog,K_LOGBOEK_BACKUP,v=>logboekOK=v),
      loadShared('gebruikers','gebruikers',mapGebr,K_GEBRUIKERS_BACKUP,v=>gebruikersOK=v,KOL_GEBRUIKERS),
      loadShared('projecten','projecten',mapProject,K_PROJECTEN_BACKUP,v=>projectenOK=v),
      loadShared('projecttaken','projecttaken',mapTaak,K_PROJTAKEN_BACKUP,v=>projecttakenOK=v),
      loadShared('projectberichten','projectberichten',mapBericht,K_PROJBERICHTEN_BACKUP,v=>projectberichtenOK=v),
      loadShared('projectagenda','projectagenda',mapAgenda,K_PROJAGENDA_BACKUP,v=>projectagendaOK=v),
      loadShared('projectdocs','projectdocs',mapDoc,K_PROJDOCS_BACKUP,v=>projectdocsOK=v),
      loadActiviteit(),
      loadDoc('manualsdoc','manualsdoc',v=>manualsdocOK=v),
      loadDoc('appconfig','appconfig',v=>appconfigOK=v),
      loadDoc('spelarchief','spelarchief',v=>spelarchiefOK=v),
      laadSessies()
    ]);
    } finally { bulkLaden=false; }
    persistCache();
  }
  // Gedeelde recente sessies: aparte rij (id=2) in dezelfde spelarchief-tabel — geen extra opzet nodig.
  async function laadSessies(){
    try{
      const rs=await sb.from('spelarchief').select('data').eq('id',2).maybeSingle();
      if(rs&&!rs.error){
        cache.sessies=(rs.data&&Array.isArray(rs.data.data))?rs.data.data:[];
        try{localStorage.setItem('bb_sessies',JSON.stringify(cache.sessies));}catch(e){}
      }
    }catch(e){}
  }
  // Enkel-rij documenten (id=1, data jsonb): manuals-boom, app-instellingen, spel-archief
  async function loadDoc(table,cacheKey,setOK){
    try{
      const r=await sb.from(table).select('*').eq('id',1).maybeSingle();
      if(r.error){ setOK(false); }
      else { setOK(true); cache[cacheKey]=r.data?(r.data.data||null):null; }
    }catch(e){ setOK(false); }
  }
  async function reloadTable(t){
    // BESCHERMING TEGEN GEGEVENSVERLIES bij wifi-wissel (bv. KPN ↔ TP-Link/mengpaneel):
    // overschrijf de lokale cache NIET zolang er nog eigen wijzigingen wachten om verstuurd
    // te worden. Anders wist een (mogelijk verouderde) serverkopie je nog-niet-gesyncte
    // wijzigingen (bv. je boekjes-telling). Zodra alles veilig verstuurd is, herladen we weer.
    if(outbox.length || dirty.size){ return; }
    // Ook hier zonder foto's: dit vuurt bij elke wijziging van een collega (elke voorraadtik),
    // en de foto's die we al hebben blijven gewoon staan (behoudFotos).
    if(t==='prijzen'){const r=await selectSmal('prijzen',KOL_PRIJZEN); if(r.data)cache.prijzen=behoudFotos(cache.prijzen,r.data.map(fromRow));}
    else if(t==='boekjes'){const r=await sb.from('boekjes').select('*').eq('id',1).maybeSingle(); cache.boekjes={stock:r&&r.data?(r.data.stock||0):0};}
    else if(t==='formulieren'){const r=await sb.from('formulieren').select('*'); if(r.data)cache.formulieren=r.data.map(mapForm);}
    else if(t==='leveringen'){const r=await selectSmal('leveringen',KOL_LEVERINGEN); if(r.data)cache.leveringen=behoudFotos(cache.leveringen,r.data.slice());}
    else if(t==='bestellingen'&&bestelOK){const r=await sb.from('bestellingen').select('*'); if(r.data){cache.bestellingen=r.data.map(mapBestel); saveBestelBackup();}}
    else if(t==='contacten'&&contactenOK){const r=await sb.from('contacten').select('*'); if(r.data){cache.contacten=r.data.map(mapContact); saveBackup('contacten',K_CONTACTEN_BACKUP);}}
    else if(t==='checklisten'&&checklistenOK){const r=await sb.from('checklisten').select('*'); if(r.data){cache.checklisten=r.data.map(mapChecklist); saveBackup('checklisten',K_CHECKLISTEN_BACKUP);}}
    else if(t==='logboek'&&logboekOK){const r=await sb.from('logboek').select('*'); if(r.data){cache.logboek=r.data.map(mapLog); saveBackup('logboek',K_LOGBOEK_BACKUP);}}
    else if(t==='gebruikers'&&gebruikersOK){const r=await selectSmal('gebruikers',KOL_GEBRUIKERS); if(r.data){cache.gebruikers=behoudFotos(cache.gebruikers,r.data.map(mapGebr)); saveBackup('gebruikers',K_GEBRUIKERS_BACKUP);}}
    else if(t==='activiteit'&&activiteitOK){const r=await sb.from('activiteit').select('*').order('ts',{ascending:false}).limit(500); if(r.data){cache.activiteit=r.data.map(mapAct); saveBackup('activiteit',K_ACTIVITEIT_BACKUP);}}
    else if(t==='projecten'&&projectenOK){const r=await sb.from('projecten').select('*'); if(r.data){cache.projecten=r.data.map(mapProject); saveBackup('projecten',K_PROJECTEN_BACKUP);}}
    else if(t==='projecttaken'&&projecttakenOK){const r=await sb.from('projecttaken').select('*'); if(r.data){cache.projecttaken=r.data.map(mapTaak); saveBackup('projecttaken',K_PROJTAKEN_BACKUP);}}
    else if(t==='projectberichten'&&projectberichtenOK){const r=await sb.from('projectberichten').select('*'); if(r.data){cache.projectberichten=r.data.map(mapBericht); saveBackup('projectberichten',K_PROJBERICHTEN_BACKUP);}}
    else if(t==='projectagenda'&&projectagendaOK){const r=await sb.from('projectagenda').select('*'); if(r.data){cache.projectagenda=r.data.map(mapAgenda); saveBackup('projectagenda',K_PROJAGENDA_BACKUP);}}
    else if(t==='projectdocs'&&projectdocsOK){const r=await sb.from('projectdocs').select('*'); if(r.data){cache.projectdocs=r.data.map(mapDoc); saveBackup('projectdocs',K_PROJDOCS_BACKUP);}}
    else if(t==='manualsdoc'&&manualsdocOK){const r=await sb.from('manualsdoc').select('*').eq('id',1).maybeSingle(); if(!r.error){cache.manualsdoc=r.data?(r.data.data||null):null;}}
    else if(t==='appconfig'&&appconfigOK){const r=await sb.from('appconfig').select('*').eq('id',1).maybeSingle(); if(!r.error){cache.appconfig=r.data?(r.data.data||null):null;}}
    else if(t==='spelarchief'&&spelarchiefOK){const r=await sb.from('spelarchief').select('*').eq('id',1).maybeSingle(); if(!r.error){cache.spelarchief=r.data?(r.data.data||null):null;}}
    persistCache();
  }
  function subscribe(){
    try{
      realtime='verbinden…';
      sb.channel('bb-all').on('postgres_changes',{event:'*',schema:'public'},payload=>{
        reloadTable(payload.table).then(()=>{ noteSync(); fire(); });
      }).subscribe(st=>{
        realtime = st==='SUBSCRIBED' ? 'live'
                 : (st==='CHANNEL_ERROR'||st==='TIMED_OUT') ? 'mislukt' : String(st||'onbekend').toLowerCase();
        if(realtime==='mislukt') noteFout('Realtime','kon niet luisteren naar wijzigingen van andere toestellen');
      });
    }catch(e){ realtime='mislukt'; noteFout('Realtime',e); console.error('Realtime mislukt:',e); }
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
  const BESTEL_SEED_VER=3; // verhoog dit wanneer de startlijst uit het Excel verandert
  function bestelSeed(){
    const def=window.BESTELLINGEN_DEFAULT||[];
    return def.map((b,i)=>Object.assign({id:uid(),ts:Date.now()+i},JSON.parse(JSON.stringify(b))));
  }
  async function migrateBestelIfNeeded(){
    const SEEDED='bb_bestel_seed_v1'; // standaardlijst maar één keer plaatsen
    if(bestelOK){
      if(!cache.bestellingen.length){
        const backup=lokaleKopie('bestellingen',K_BESTEL_BACKUP);
        let seed=[];
        if(backup.length) seed=backup;                                 // lokale kopie → gedeeld zetten
        else if(localStorage.getItem(SEEDED)!=='1'){                    // allereerste keer: standaardlijst
          seed=bestelSeed();
          localStorage.setItem('bb_bestel_seed_ver',String(BESTEL_SEED_VER)); // is al de nieuwste versie
        }
        if(seed.length){
          for(let i=0;i<seed.length;i+=40){ const r=await sb.from('bestellingen').insert(seed.slice(i,i+40).map(bestelToRow)); err(r); }
          cache.bestellingen=seed.slice(); saveBestelBackup();
        }
      }
      localStorage.setItem(SEEDED,'1'); // gedeelde tabel is in gebruik → nooit meer automatisch vullen
    }else{
      // geen gedeelde tabel: lokaal werken; lege lijst krijgt eenmalig de standaardlijst
      if(!cache.bestellingen.length && localStorage.getItem(SEEDED)!=='1'){
        cache.bestellingen=bestelSeed(); saveBestelBackup();
        localStorage.setItem('bb_bestel_seed_ver',String(BESTEL_SEED_VER)); // is al de nieuwste versie
      }
      localStorage.setItem(SEEDED,'1');
    }
  }

  // Bestaande lijsten gelijkzetten met een bijgewerkt Excel-overzicht. We herkennen een
  // bestelling aan datum + omschrijving + leverancier. Alles wat uit de vorige startlijst
  // kwam wordt vervangen door de nieuwe versie (zo volgen ook gewijzigde statussen,
  // bedragen en leverdatums mee), bestellingen die iemand zélf in de app toevoegde
  // blijven staan. Een tweede keer uitvoeren verandert niets meer: rijen die al gelijk
  // zijn aan de nieuwe lijst worden ook als "startlijst" gezien en dus niet gedupliceerd.
  function bestelKey(b){ return (b.datum||'')+'|'+(b.info||'').trim().toLowerCase()+'|'+(b.leverancier||'').trim().toLowerCase(); }
  async function topUpBestelDefaults(){
    const cur=+(localStorage.getItem('bb_bestel_seed_ver')||1);
    if(cur>=BESTEL_SEED_VER){ return; }
    const nieuw=bestelSeed();
    if(!nieuw.length){ localStorage.setItem('bb_bestel_seed_ver',String(BESTEL_SEED_VER)); return; }
    const uitLijst=new Set((window.BESTELLINGEN_OUDE_SLEUTELS||[]).concat(nieuw.map(bestelKey)));
    const eigen=[],weg=[];
    cache.bestellingen.forEach(b=>{ (uitLijst.has(bestelKey(b))?weg:eigen).push(b); });
    if(bestelOK){
      // eerst wissen, dan pas plaatsen — anders staat de lijst even dubbel voor een collega
      // die net op dat moment opstart. Lukt het wissen niet, dan stoppen we en proberen we
      // het de volgende keer opnieuw (de versie hieronder wordt dan niet opgeslagen).
      for(let i=0;i<weg.length;i+=40){
        const r=await sb.from('bestellingen').delete().in('id',weg.slice(i,i+40).map(b=>b.id));
        if(r&&r.error){ err(r); return; }
      }
      let mis=false;
      for(let i=0;i<nieuw.length;i+=40){
        const r=await sb.from('bestellingen').insert(nieuw.slice(i,i+40).map(bestelToRow));
        if(r&&r.error){ err(r); mis=true; }
      }
      // Ging er een stuk mis, dan tonen we lokaal wél de juiste lijst maar onthouden we de
      // versie niet: bij de volgende start doen we het gewoon opnieuw en klopt alles weer.
      if(mis){ cache.bestellingen=eigen.concat(nieuw); saveBestelBackup(); return; }
    }
    cache.bestellingen=eigen.concat(nieuw); saveBestelBackup();
    localStorage.setItem('bb_bestel_seed_ver',String(BESTEL_SEED_VER));
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
    if(contactenOK) dbUpsert('contacten',contactToRow(rec)); else persistCache();
    logAct('Contact toegevoegd: '+(rec.naam||'')); return rec;
  }
  function updateContact(id,patch){
    const r=cache.contacten.find(x=>x.id===id); if(!r) return null; Object.assign(r,patch); saveContactBackup();
    if(contactenOK) dbUpsert('contacten',contactToRow(r)); else persistCache();
    logAct('Contact aangepast: '+(r.naam||'')); return r;
  }
  function removeContact(id){
    const g=cache.contacten.find(c=>c.id===id);
    cache.contacten=cache.contacten.filter(c=>c.id!==id); saveContactBackup();
    if(contactenOK) dbDelete('contacten','id',id); else persistCache();
    logAct('Contact verwijderd'+(g?': '+g.naam:''));
  }

  // ---------------- CHECKLISTS (gedeeld) ----------------
  const getChecklisten=()=>cache.checklisten.slice().sort((a,b)=>(a.pos||0)-(b.pos||0)||(a.ts||0)-(b.ts||0));
  function saveChecklistBackup(){ saveBackup('checklisten',K_CHECKLISTEN_BACKUP); }
  function chkPersist(rec){ saveChecklistBackup(); if(checklistenOK) dbUpsert('checklisten',checklistToRow(rec)); else persistCache(); }
  function addChecklist(naam){
    const maxPos=cache.checklisten.reduce((m,l)=>Math.max(m,l.pos||0),0);
    const rec={id:uid(),naam:naam||'Nieuwe lijst',items:[],pos:maxPos+1,ts:Date.now()};
    cache.checklisten.push(rec); chkPersist(rec); logAct('Checklist toegevoegd: '+rec.naam); return rec;
  }
  function saveChecklist(rec){ // rec = volledig lijst-object (naam/items gewijzigd)
    const r=cache.checklisten.find(x=>x.id===rec.id); if(!r) return null;
    r.naam=rec.naam; r.items=rec.items; chkPersist(r); logAct('Checklist aangepast: '+(r.naam||'')); return r;
  }
  function removeChecklist(id){
    const l0=cache.checklisten.find(l=>l.id===id);
    cache.checklisten=cache.checklisten.filter(l=>l.id!==id); saveChecklistBackup();
    if(checklistenOK) dbDelete('checklisten','id',id); else persistCache();
    logAct('Checklist verwijderd'+(l0?': '+l0.naam:''));
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
    if(logboekOK) dbUpsert('logboek',logToRow(rec)); else persistCache();
    logAct('Logboekbericht geplaatst'); return rec;
  }
  function updateLog(id,patch){
    const r=cache.logboek.find(x=>x.id===id); if(!r) return null; Object.assign(r,patch); saveLogBackup();
    if(logboekOK) dbUpsert('logboek',logToRow(r)); else persistCache();
    logAct(patch&&('klaar' in patch)?('Logboekbericht '+(patch.klaar?'afgehandeld':'heropend')):'Logboekbericht aangepast'); return r;
  }
  function removeLog(id){
    cache.logboek=cache.logboek.filter(l=>l.id!==id); saveLogBackup();
    if(logboekOK) dbDelete('logboek','id',id); else persistCache();
    logAct('Logboekbericht verwijderd');
  }

  // ---------------- PROJECTEN (gedeeld) — bord met taken + bespreking ----------------
  // Drie tabellen: 'projecten' (het project zelf, met zijn kolommen), 'projecttaken'
  // (de kaarten op het bord) en 'projectberichten' (de bespreking). Bestaat een tabel
  // nog niet in Supabase, dan werkt alles gewoon lokaal op dit toestel verder.
  const STD_KOLOMMEN=['Te doen','Bezig','Wacht op','Klaar'];
  // Schrijven naar een projecttabel. Bestaat de gedeelde tabel, dan gaat de wijziging via
  // de wachtrij naar de database. Zo niet, dan onthouden we het id zodat de rij later
  // alsnog vertrekt in plaats van op dit ene toestel te blijven staan.
  function projSchrijf(tabel,gedeeld,rij,id){
    if(gedeeld) dbUpsert(tabel,rij);
    else { wachtErbij(tabel,id); persistCache(); }
  }
  function projWissen(tabel,gedeeld,id){
    if(gedeeld) dbDelete(tabel,'id',id);
    else { wachtWeg(tabel,[id]); persistCache(); }
  }
  const getProjecten=()=>cache.projecten.slice().sort((a,b)=>(a.pos||0)-(b.pos||0)||(b.ts||0)-(a.ts||0));
  const getProject=id=>cache.projecten.find(p=>p.id===id)||null;
  function saveProjBackup(){ saveBackup('projecten',K_PROJECTEN_BACKUP); }
  function saveTaakBackup(){ saveBackup('projecttaken',K_PROJTAKEN_BACKUP); }
  function saveBerBackup(){ saveBackup('projectberichten',K_PROJBERICHTEN_BACKUP); }
  function addProject(p){
    const maxPos=cache.projecten.reduce((m,x)=>Math.max(m,x.pos||0),0);
    const rec={id:uid(),naam:(p&&p.naam)||'Nieuw project',doel:(p&&p.doel)||'',status:(p&&p.status)||'Lopend',
      kleur:(p&&p.kleur)||'',start:(p&&p.start)||'',deadline:(p&&p.deadline)||'',
      verantwoordelijke:(p&&p.verantwoordelijke)||'',kolommen:(p&&p.kolommen&&p.kolommen.length)?p.kolommen.slice():STD_KOLOMMEN.slice(),
      pos:maxPos+1,archief:false,ts:Date.now()};
    cache.projecten.push(rec); saveProjBackup();
    projSchrijf('projecten',projectenOK,projectToRow(rec),rec.id);
    logAct('Project aangemaakt: '+rec.naam); return rec;
  }
  function updateProject(id,patch){
    const r=cache.projecten.find(x=>x.id===id); if(!r) return null;
    Object.assign(r,patch); saveProjBackup();
    projSchrijf('projecten',projectenOK,projectToRow(r),r.id);
    let wat='aangepast';
    if(patch&&('archief' in patch)) wat=patch.archief?'gearchiveerd':'uit het archief gehaald';
    else if(patch&&('status' in patch)) wat='status → '+patch.status;
    else if(patch&&('kolommen' in patch)) wat='kolommen aangepast';
    logAct('Project '+(r.naam||'')+' — '+wat); return r;
  }
  // Een project verwijderen wist ook zijn taken en berichten (anders blijven die zweven).
  function removeProject(id){
    const p0=cache.projecten.find(p=>p.id===id);
    // Wat van dit project nog stond te wachten om verstuurd te worden, hoeft niet meer.
    wachtWeg('projecten',[id]);
    wachtWeg('projecttaken',cache.projecttaken.filter(t=>t.projectId===id).map(t=>t.id));
    wachtWeg('projectberichten',cache.projectberichten.filter(b=>b.projectId===id).map(b=>b.id));
    wachtWeg('projectagenda',cache.projectagenda.filter(a=>a.projectId===id).map(a=>a.id));
    wachtWeg('projectdocs',cache.projectdocs.filter(d=>d.projectId===id).map(d=>d.id));
    cache.projecten=cache.projecten.filter(p=>p.id!==id);
    cache.projecttaken=cache.projecttaken.filter(t=>t.projectId!==id);
    cache.projectberichten=cache.projectberichten.filter(b=>b.projectId!==id);
    cache.projectagenda=cache.projectagenda.filter(a=>a.projectId!==id);
    cache.projectdocs=cache.projectdocs.filter(d=>d.projectId!==id);
    saveProjBackup(); saveTaakBackup(); saveBerBackup();
    saveBackup('projectagenda',K_PROJAGENDA_BACKUP); saveBackup('projectdocs',K_PROJDOCS_BACKUP);
    if(projectenOK) dbDelete('projecten','id',id);
    if(projecttakenOK) dbDelete('projecttaken','project_id',id);
    if(projectberichtenOK) dbDelete('projectberichten','project_id',id);
    if(projectagendaOK) dbDelete('projectagenda','project_id',id);
    if(projectdocsOK) dbDelete('projectdocs','project_id',id);
    if(!projectenOK||!projecttakenOK||!projectberichtenOK||!projectagendaOK||!projectdocsOK) persistCache();
    logAct('Project verwijderd'+(p0?': '+p0.naam:''));
  }
  // Taken van één project, of van alle projecten als er geen id meegegeven wordt.
  const getTaken=projectId=>cache.projecttaken.filter(t=>!projectId||t.projectId===projectId)
    .slice().sort((a,b)=>(a.pos||0)-(b.pos||0)||(a.ts||0)-(b.ts||0));
  function addTaak(t){
    const inKolom=cache.projecttaken.filter(x=>x.projectId===t.projectId&&x.kolom===t.kolom);
    const maxPos=inKolom.reduce((m,x)=>Math.max(m,x.pos||0),0);
    const rec={id:uid(),projectId:t.projectId||'',kolom:t.kolom||'',titel:t.titel||'',omschrijving:t.omschrijving||'',
      wie:t.wie||[],deadline:t.deadline||'',labels:t.labels||[],subtaken:t.subtaken||[],
      pos:maxPos+1,klaar:false,klaarDoor:'',klaarTs:0,door:t.door||actor||'',ts:Date.now()};
    cache.projecttaken.push(rec); saveTaakBackup();
    projSchrijf('projecttaken',projecttakenOK,taakToRow(rec),rec.id);
    logAct('Taak toegevoegd: '+rec.titel+projSuffix(rec.projectId)); return rec;
  }
  function updateTaak(id,patch,stil){
    const r=cache.projecttaken.find(x=>x.id===id); if(!r) return null;
    if(patch&&('klaar' in patch)){
      if(patch.klaar && !r.klaar){ r.klaarDoor=actor||''; r.klaarTs=Date.now(); }
      else if(!patch.klaar && r.klaar){ r.klaarDoor=''; r.klaarTs=0; }
    }
    Object.assign(r,patch); saveTaakBackup();
    projSchrijf('projecttaken',projecttakenOK,taakToRow(r),r.id);
    if(!stil){
      let wat='aangepast';
      if(patch&&('klaar' in patch)) wat=patch.klaar?'afgevinkt':'heropend';
      else if(patch&&('kolom' in patch)) wat='verplaatst naar '+patch.kolom;
      logAct('Taak '+wat+': '+(r.titel||'')+projSuffix(r.projectId));
    }
    return r;
  }
  function removeTaak(id){
    const t0=cache.projecttaken.find(t=>t.id===id);
    cache.projecttaken=cache.projecttaken.filter(t=>t.id!==id); saveTaakBackup();
    projWissen('projecttaken',projecttakenOK,id);
    logAct('Taak verwijderd'+(t0?': '+t0.titel+projSuffix(t0.projectId):''));
  }
  // Nieuwe volgorde binnen een kolom (array van taak-id's) na het slepen.
  function reorderTaken(ids,kolom){
    ids.forEach((id,idx)=>{ const r=cache.projecttaken.find(x=>x.id===id); if(r){ r.pos=idx; if(kolom) r.kolom=kolom; } });
    saveTaakBackup();
    ids.forEach(id=>{ const r=cache.projecttaken.find(x=>x.id===id); if(r) projSchrijf('projecttaken',projecttakenOK,taakToRow(r),r.id); });
  }
  // Een kolom hernoemen of verwijderen: de taken erin mee laten verhuizen.
  function verplaatsTaken(projectId,vanKolom,naarKolom){
    const lijst=cache.projecttaken.filter(t=>t.projectId===projectId&&t.kolom===vanKolom);
    if(!lijst.length) return;
    lijst.forEach(t=>{ t.kolom=naarKolom; }); saveTaakBackup();
    lijst.forEach(t=>projSchrijf('projecttaken',projecttakenOK,taakToRow(t),t.id));
  }
  const getBerichten=projectId=>cache.projectberichten.filter(b=>!projectId||b.projectId===projectId)
    .slice().sort((a,b)=>(a.ts||0)-(b.ts||0));
  function addBericht(b){
    const rec={id:uid(),projectId:b.projectId||'',soort:b.soort||'bericht',ts:Date.now(),
      auteur:b.auteur||actor||'',tekst:b.tekst||'',data:b.data||{}};
    cache.projectberichten.push(rec); saveBerBackup();
    projSchrijf('projectberichten',projectberichtenOK,berichtToRow(rec),rec.id);
    logAct('Bericht geplaatst'+projSuffix(rec.projectId)); return rec;
  }
  function updateBericht(id,patch){
    const r=cache.projectberichten.find(b=>b.id===id); if(!r) return null;
    Object.assign(r,patch); saveBerBackup();
    projSchrijf('projectberichten',projectberichtenOK,berichtToRow(r),r.id);
    logAct((r.soort==='verslag'?'Verslag':'Bericht')+' aangepast'+projSuffix(r.projectId)); return r;
  }
  function removeBericht(id){
    cache.projectberichten=cache.projectberichten.filter(b=>b.id!==id); saveBerBackup();
    projWissen('projectberichten',projectberichtenOK,id);
    logAct('Bericht verwijderd');
  }
  function projSuffix(projectId){ const p=getProject(projectId); return p?(' ('+p.naam+')'):''; }

  // ---- Agenda van een project (afspraken, mijlpalen, leveringen) ----
  const getAgenda=projectId=>cache.projectagenda.filter(a=>!projectId||a.projectId===projectId)
    .slice().sort((a,b)=>(a.datum||'').localeCompare(b.datum||'')||(a.van||'').localeCompare(b.van||''));
  function saveAgendaBackup(){ saveBackup('projectagenda',K_PROJAGENDA_BACKUP); }
  function addAgenda(a){
    const rec={id:uid(),projectId:a.projectId||'',datum:a.datum||'',van:a.van||'',tot:a.tot||'',
      titel:a.titel||'',soort:a.soort||'afspraak',plaats:a.plaats||'',wie:a.wie||[],notitie:a.notitie||'',
      door:a.door||actor||'',ts:Date.now()};
    cache.projectagenda.push(rec); saveAgendaBackup();
    projSchrijf('projectagenda',projectagendaOK,agendaToRow(rec),rec.id);
    logAct('Agenda-item toegevoegd: '+rec.titel+projSuffix(rec.projectId)); return rec;
  }
  function updateAgenda(id,patch){
    const r=cache.projectagenda.find(x=>x.id===id); if(!r) return null;
    Object.assign(r,patch); saveAgendaBackup();
    projSchrijf('projectagenda',projectagendaOK,agendaToRow(r),r.id);
    logAct('Agenda-item aangepast: '+(r.titel||'')+projSuffix(r.projectId)); return r;
  }
  function removeAgenda(id){
    const a0=cache.projectagenda.find(a=>a.id===id);
    cache.projectagenda=cache.projectagenda.filter(a=>a.id!==id); saveAgendaBackup();
    projWissen('projectagenda',projectagendaOK,id);
    logAct('Agenda-item verwijderd'+(a0?': '+a0.titel:''));
  }

  // ---- Documenten van een project (bestanden en links) ----
  // Nieuwste eerst. Vallen twee documenten in dezelfde milliseconde, dan beslist de
  // volgorde van toevoegen — zo staat de lijst nooit willekeurig door elkaar.
  const getDocs=projectId=>cache.projectdocs.map((d,i)=>({d:d,i:i}))
    .filter(x=>!projectId||x.d.projectId===projectId)
    .sort((a,b)=>(b.d.ts||0)-(a.d.ts||0)||b.i-a.i)
    .map(x=>x.d);
  function saveDocsBackup(){ saveBackup('projectdocs',K_PROJDOCS_BACKUP); }
  function addDoc(d){
    const rec={id:uid(),projectId:d.projectId||'',naam:d.naam||'',url:d.url||'',soort:d.soort||'Overig',
      bron:d.bron||'link',mime:d.mime||'',grootte:+d.grootte||0,taakId:d.taakId||'',door:d.door||actor||'',ts:Date.now()};
    cache.projectdocs.push(rec); saveDocsBackup();
    projSchrijf('projectdocs',projectdocsOK,docToRow(rec),rec.id);
    logAct('Document toegevoegd: '+rec.naam+projSuffix(rec.projectId)); return rec;
  }
  function updateDoc(id,patch){
    const r=cache.projectdocs.find(d=>d.id===id); if(!r) return null;
    Object.assign(r,patch); saveDocsBackup();
    projSchrijf('projectdocs',projectdocsOK,docToRow(r),r.id);
    logAct('Document aangepast: '+(r.naam||'')+projSuffix(r.projectId)); return r;
  }
  function removeDoc(id){
    const d0=cache.projectdocs.find(d=>d.id===id);
    cache.projectdocs=cache.projectdocs.filter(d=>d.id!==id); saveDocsBackup();
    projWissen('projectdocs',projectdocsOK,id);
    logAct('Document verwijderd'+(d0?': '+d0.naam:''));
  }

  // ---------------- GEBRUIKERS (gedeeld) — namenlijst + persoonlijke pincode ----------------
  // 'pin' bevat een gehashte code (zie entertainment.html); nooit de code zelf zichtbaar.
  const getGebruikers=()=>cache.gebruikers.slice().sort((a,b)=>{
    if(a.id==='entalg') return -1; if(b.id==='entalg') return 1; // "ENT algemeen" altijd bovenaan
    return (a.naam||'').localeCompare(b.naam||'');
  });
  function saveGebrBackup(){ saveBackup('gebruikers',K_GEBRUIKERS_BACKUP); }
  function addGebruiker(g){
    const rec={id:uid(),naam:g.naam||'',pin:g.pin||'',rol:g.rol||'',foto:g.foto||'',ts:Date.now()};
    cache.gebruikers.push(rec); saveGebrBackup();
    if(gebruikersOK) dbUpsert('gebruikers',gebrToRow(rec)); else persistCache();
    logAct('Gebruiker toegevoegd: '+(rec.naam||'')); return rec;
  }
  function updateGebruiker(id,patch){
    const r=cache.gebruikers.find(x=>x.id===id); if(!r) return null; Object.assign(r,patch); saveGebrBackup();
    // De foto enkel meesturen als ze het onderwerp van de wijziging is (zie toRowKaal).
    const rij=(patch&&('foto' in patch)) ? gebrToRow(r) : gebrToRowKaal(r);
    if(gebruikersOK) dbUpsert('gebruikers',rij); else persistCache();
    let wat='aangepast';
    if(patch&&('rol' in patch)){
      const t=rolTags({rol:patch.rol});
      const namen={vast:'Vaste mdw',admin:'Admin',algemeen:'Gedeeld account'};
      wat = t.length ? ('rol: '+t.map(x=>namen[x]||x).join(' + ')) : 'rol verwijderd (gewone medewerker)';
    }
    else if(patch&&('pin' in patch)) wat='pincode gereset';
    else if(patch&&('foto' in patch)) wat='profielfoto gewijzigd';
    logAct('Gebruiker '+(r.naam||'')+' — '+wat); return r;
  }
  function removeGebruiker(id){
    const g=cache.gebruikers.find(x=>x.id===id);
    cache.gebruikers=cache.gebruikers.filter(x=>x.id!==id); saveGebrBackup();
    if(gebruikersOK) dbDelete('gebruikers','id',id); else persistCache();
    logAct('Gebruiker verwijderd'+(g?': '+g.naam:''));
  }
  // ---------------- ACTIVITEIT (wie paste wat aan) — gedeeld ----------------
  let actor=''; // naam van wie nu is ingelogd (gezet door de app)
  function setActor(n){ actor=n||''; }
  const getActiviteit=()=>cache.activiteit.slice().sort((a,b)=>(b.ts||0)-(a.ts||0));
  function logAct(actie){
    if(!actie) return;
    const rec={id:uid(),ts:Date.now(),wie:actor||'?',actie:String(actie)};
    cache.activiteit.unshift(rec);                              // nieuwste eerst
    if(cache.activiteit.length>600) cache.activiteit.length=600; // cache begrenzen
    saveBackup('activiteit',K_ACTIVITEIT_BACKUP);
    if(activiteitOK) dbInsert('activiteit',actToRow(rec)); else persistCache();
  }
  async function clearActiviteit(){
    cache.activiteit=[]; saveBackup('activiteit',K_ACTIVITEIT_BACKUP);
    if(activiteitOK && sb){ try{ await sb.from('activiteit').delete().neq('id',''); }catch(e){} }
    else persistCache();
    fire();
  }

  // Vast gedeeld account "ENT algemeen" zonder pincode (vaste id → nooit dubbel, self-healing).
  function ensureEntAlgemeen(){
    if(cache.gebruikers.some(u=>u.id==='entalg')) return;
    const rec={id:'entalg',naam:'ENT algemeen',pin:'',rol:'algemeen',foto:'',ts:Date.now()};
    cache.gebruikers.push(rec); saveGebrBackup();
    if(gebruikersOK) dbUpsert('gebruikers',gebrToRow(rec)); else persistCache();
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
  // ---------------- GEDEELDE RECENTE SESSIES (herstelbare speelstand) ----------------
  // Bewaard als aparte rij (id=2) in de spelarchief-tabel, dus geen extra Supabase-opzet
  // nodig en het echte archief (id=1) blijft ongemoeid. Laatste 10 sessies, over alle toestellen.
  const getSessies=()=>Array.isArray(cache.sessies)?cache.sessies:[];
  async function getSessiesFresh(){
    if(sb && spelarchiefOK){
      try{ const rs=await withTimeout(sb.from('spelarchief').select('data').eq('id',2).maybeSingle(),12000);
        if(rs && !rs.error){ cache.sessies=(rs.data&&Array.isArray(rs.data.data))?rs.data.data:[]; try{localStorage.setItem('bb_sessies',JSON.stringify(cache.sessies));}catch(e){} } }catch(e){}
    }
    return getSessies();
  }
  function saveSessies(arr){
    cache.sessies=Array.isArray(arr)?arr:[];
    try{localStorage.setItem('bb_sessies',JSON.stringify(cache.sessies));}catch(e){}
    if(spelarchiefOK) dbUpsert('spelarchief',{id:2,data:cache.sessies}); else persistCache();
  }
  function pushSessie(snap){
    if(!snap) return;
    const arr=getSessies().slice();
    arr.unshift(snap);
    saveSessies(arr.slice(0,10)); // enkel de laatste 10 bewaren
  }

  // Upload een bestand naar Supabase Storage (bucket 'manuals') en geef de publieke URL terug.
  // Met 'map' komt het bestand in een submap terecht (bv. 'projecten/<id>'), zodat de
  // manuals en de projectdocumenten netjes gescheiden blijven in dezelfde bucket.
  async function uploadFile(file,map){
    if(!sb) throw new Error('Geen verbinding. Upload lukt alleen met internet.');
    const safe=(file.name||'bestand').replace(/[^\w.\-]+/g,'_');
    const mapdeel=map?(String(map).replace(/[^\w\/\-]+/g,'_').replace(/^\/+|\/+$/g,'')+'/'):'';
    const path=mapdeel+Date.now().toString(36)+'_'+Math.floor(Math.random()*1e6).toString(36)+'_'+safe;
    const up=await sb.storage.from('manuals').upload(path,file,{upsert:true,contentType:file.type||undefined});
    if(up.error) throw up.error;
    const pub=sb.storage.from('manuals').getPublicUrl(path);
    return (pub&&pub.data)?pub.data.publicUrl:'';
  }

  // Alles opsommen wat er in de opslagmap (bucket 'manuals') staat, ook in submappen.
  // Puur lezen — bedoeld voor het Database-overzicht bij Instellingen.
  async function lijstOpslag(){
    if(!sb) return [];
    const uit=[];
    async function doorloop(prefix,diep){
      if(diep>4) return;                                  // veiligheidsrem tegen diepe mappen
      let offset=0;
      for(;;){
        const r=await sb.storage.from('manuals').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
        if(r.error||!r.data||!r.data.length) return;
        for(const it of r.data){
          if(!it.name||it.name.charAt(0)==='.') continue;  // .emptyFolderPlaceholder e.d.
          const pad=(prefix?prefix+'/':'')+it.name;
          if(!it.metadata){ await doorloop(pad,diep+1); continue; }   // dit is een map
          const pub=sb.storage.from('manuals').getPublicUrl(pad);
          uit.push({naam:it.name, pad,
            url:(pub&&pub.data)?pub.data.publicUrl:'',
            grootte:+(it.metadata.size||0),
            type:it.metadata.mimetype||'',
            gewijzigd:it.updated_at||it.created_at||''});
        }
        if(r.data.length<100) return;
        offset+=100;
      }
    }
    try{ await doorloop('',0); }catch(e){}
    return uit;
  }

  // Een bestand uit de opslagmap weggooien (Database-overzicht bij Instellingen).
  // Let op: dit kan niet ongedaan gemaakt worden.
  async function verwijderOpslag(pad){
    if(!sb) throw new Error('Daar is internet voor nodig.');
    const r=await sb.storage.from('manuals').remove([pad]);
    if(r.error) throw r.error;
    logAct('Bestand uit de opslagmap verwijderd: '+pad);
    return true;
  }

  // ---------------- SCHRIJVEN (optimistisch + achtergrond naar DB) ----------------
  // gdebouncede bulk-upsert voor stock-aanpassingen
  let dirty=new Set(), flushT=null;
  // Voorraadvelden: vuurt bij elke toetsaanslag → hier wél bundelen (zie persistCache).
  function queue(id){ dirty.add(id); persistCache(true); clearTimeout(flushT); flushT=setTimeout(flush,500); }
  function flush(){
    const ids=[...dirty]; dirty.clear(); if(!ids.length) return;
    const rows=cache.prijzen.filter(p=>ids.indexOf(p.id)>=0).map(toRowKaal);
    if(rows.length) dbUpsert('prijzen',rows);
  }
  function setStock(id,v){ const p=cache.prijzen.find(x=>x.id===id); if(p){const old=p.stock||0; p.stock=Math.round(v||0); if(p.stock<=0)p.inGebruik=false; else if(old<=0)p.inGebruik=true;} queue(id); }
  function setPrijzen(arr){ arr.forEach(p=>{ if(p&&(p.stock||0)<=0) p.inGebruik=false; }); cache.prijzen=arr; arr.forEach(p=>dirty.add(p.id)); clearTimeout(flushT); flushT=setTimeout(flush,400); }
  // Regel: voorraad ≤ 0 ⇒ nooit "in gebruik" (zodat enkel echt gestockte prijzen
  // meetellen voor de lage-voorraad melding). Corrigeert oude/geïmporteerde gegevens
  // één keer bij het opstarten en synct de verbetering mee naar alle toestellen.
  function normalizeInGebruik(){
    const fixed=cache.prijzen.filter(p=>p.inGebruik&&(p.stock||0)<=0);
    if(!fixed.length) return 0;
    fixed.forEach(p=>{ p.inGebruik=false; });
    persistCache();
    dbUpsert('prijzen',fixed.map(toRowKaal));
    return fixed.length;
  }
  function setBoekjes(o){ cache.boekjes={stock:Math.round(o.stock||0)}; dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock}); logAct('Boekjesvoorraad ingesteld op '+cache.boekjes.stock); }
  function addPrijs(cat,naam,stock,foto){
    const s=+stock||0;
    const rec={id:uid(),cat:cat==='groot'?'groot':'klein',naam:naam||'',stock:s,inGebruik:s>0,foto:foto||''};
    cache.prijzen.push(rec); dbInsert('prijzen',toRow(rec)); logAct('Prijs toegevoegd: '+(rec.naam||'')); return rec;
  }
  function removePrijs(id){ const p=cache.prijzen.find(x=>x.id===id); cache.prijzen=cache.prijzen.filter(x=>x.id!==id); dbDelete('prijzen','id',id); logAct('Prijs verwijderd'+(p?': '+p.naam:'')); }
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
    const rows=cache.prijzen.filter(p=>changed.has(p.id)).map(toRowKaal);
    if(rows.length) dbUpsert('prijzen',rows);
    dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock});
    dbInsert('formulieren',{id:rec.id,ts:rec.ts,namen:rec.namen,kleine:rec.kleine,groot:rec.groot,boekjes:rec.boekjes,finale:rec.finale,opmerking:rec.opmerking});
    logAct('Spel afgesloten / formulier ingezonden'+(rec.namen?': '+rec.namen:''));
    return rec;
  }
  function addLevering(lev){
    if(lev.boekjes){ cache.boekjes.stock=(cache.boekjes.stock||0)+(+lev.boekjes||0); dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock}); }
    const rec={id:uid(),ts:Date.now(),datum:lev.datum||'',boekjes:+lev.boekjes||0,tekst:lev.tekst||''};
    if(lev.foto) rec.foto=lev.foto; // foto enkel meesturen als er een is (kolom 'foto' nodig in tabel leveringen)
    cache.leveringen.push(rec); dbInsert('leveringen',rec);
    logAct('Levering geregistreerd'+(rec.boekjes?' (+'+rec.boekjes+' boekjes)':'')); return rec;
  }
  function undoLastFormulier(){
    if(!cache.formulieren.length) return null;
    const rec=cache.formulieren.pop();
    const byId={}; cache.prijzen.forEach(p=>byId[p.id]=p); const changed=new Set();
    const credit=arr=>(arr||[]).forEach(it=>{const p=byId[it.id]; if(p){const old=p.stock||0; p.stock=old+(+it.n||0); if(old<=0&&p.stock>0)p.inGebruik=true; changed.add(p.id);}});
    credit(rec.kleine); credit(rec.groot);
    const b=rec.boekjes||{}; const used=(+b.gereserveerd||0)+(+b.extra||0)+(+b.gratis||0);
    cache.boekjes.stock=(cache.boekjes.stock||0)+used;
    const rows=cache.prijzen.filter(p=>changed.has(p.id)).map(toRowKaal);
    if(rows.length) dbUpsert('prijzen',rows);
    dbUpsert('boekjes',{id:1,stock:cache.boekjes.stock});
    dbDelete('formulieren','id',rec.id);
    return rec;
  }
  // verwijderen via "set(filter(...))"-patroon: bepaal welke rij wegviel en wis die in de DB
  function setFormulieren(arr){ const keep={}; arr.forEach(f=>keep[f.id]=1); const weg=cache.formulieren.filter(f=>!keep[f.id]); weg.forEach(f=>dbDelete('formulieren','id',f.id)); cache.formulieren=arr; persistCache(); if(weg.length) logAct('Formulier verwijderd'); }
  function setLeveringen(arr){ const keep={}; arr.forEach(l=>keep[l.id]=1); const weg=cache.leveringen.filter(l=>!keep[l.id]); weg.forEach(l=>dbDelete('leveringen','id',l.id)); cache.leveringen=arr; persistCache(); if(weg.length) logAct('Levering verwijderd'); }

  // ---- Bestellingen (optimistisch + naar DB als de gedeelde tabel bestaat) ----
  function bestelClean(b){ return {datum:b.datum||'',cat:b.cat||'',info:b.info||'',status:b.status||'Besteld',aantal:b.aantal||'',ent:+b.ent||0,bay:+b.bay||0,hsb:+b.hsb||0,leverancier:b.leverancier||'',leverdatum:b.leverdatum||'',door:b.door||'',opm:b.opm||''}; }
  function bestelSave(rec){ saveBestelBackup(); if(bestelOK) dbUpsert('bestellingen',bestelToRow(rec)); else persistCache(); }
  function addBestelling(b){
    const rec=Object.assign({id:uid(),ts:Date.now()},bestelClean(b));
    cache.bestellingen.push(rec); bestelSave(rec); logAct('Bestelling toegevoegd: '+(rec.info||rec.cat||'')); return rec;
  }
  function updateBestelling(id,patch){
    const rec=cache.bestellingen.find(x=>x.id===id); if(!rec) return null;
    const oudeStatus=rec.status;
    Object.assign(rec,bestelClean(Object.assign({},rec,patch))); bestelSave(rec);
    const statusExtra=(rec.status&&rec.status!==oudeStatus)?(' → '+rec.status):'';
    logAct('Bestelling aangepast: '+(rec.info||rec.cat||'')+statusExtra); return rec;
  }
  function removeBestelling(id){
    const b0=cache.bestellingen.find(b=>b.id===id);
    cache.bestellingen=cache.bestellingen.filter(b=>b.id!==id);
    saveBestelBackup(); if(bestelOK) dbDelete('bestellingen','id',id); else persistCache();
    logAct('Bestelling verwijderd'+(b0?': '+(b0.info||b0.cat||''):''));
  }
  async function resetBestellingen(){
    const seed=bestelSeed();
    if(bestelOK){
      await sb.from('bestellingen').delete().neq('id','');
      for(let i=0;i<seed.length;i+=40){ const r=await sb.from('bestellingen').insert(seed.slice(i,i+40).map(bestelToRow)); err(r); }
    }
    cache.bestellingen=seed.slice(); saveBestelBackup(); logAct('Bestellijst hersteld naar de startlijst'); fire();
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
    logAct('Inventaris hersteld naar de startlijst'); fire();
  }

  function seedIfEmpty(){} // niet meer nodig (migratie regelt dit)

  // ---------------- ROLLEN ----------------
  // 'rol' is een lijstje etiketten, gescheiden door komma's: '', 'vast', 'admin',
  // 'vast,admin' of 'algemeen' (het gedeelde ENT-account). Zo kan iemand tegelijk
  // vaste medewerker én admin zijn zonder een extra kolom in de database.
  function rolTags(u){ return String((u&&u.rol)||'').split(',').map(s=>s.trim()).filter(Boolean); }
  function heeftRol(u,tag){ return rolTags(u).indexOf(tag)>=0; }
  // Geeft de nieuwe rol-tekst terug met dit etiket aan- of uitgezet (schrijft zelf niets weg).
  function zetRol(u,tag,aan){
    const t=rolTags(u).filter(x=>x!==tag);
    if(aan) t.push(tag);
    return t.join(',');
  }

  // ---------------- SYSTEEM / DIAGNOSE ----------------
  // Eén overzicht van alles wat stil kan mislopen. Elke tabel: is ze gedeeld via de
  // database, of leeft ze enkel op dit toestel?
  const TABELLEN=[
    {tabel:'prijzen',        label:'Prijzen (voorraad)',   ok:()=>kernOK,           tel:()=>cache.prijzen.length,        kern:true},
    {tabel:'boekjes',        label:'Boekjes',              ok:()=>kernOK,           tel:()=>1,                           kern:true},
    {tabel:'formulieren',    label:'Formulieren',          ok:()=>kernOK,           tel:()=>cache.formulieren.length,    kern:true},
    {tabel:'leveringen',     label:'Leveringen',           ok:()=>kernOK,           tel:()=>cache.leveringen.length,     kern:true},
    {tabel:'bestellingen',   label:'Bestellingen',         ok:()=>bestelOK,         tel:()=>cache.bestellingen.length},
    {tabel:'contacten',      label:'Contacten',            ok:()=>contactenOK,      tel:()=>cache.contacten.length},
    {tabel:'checklisten',    label:'Checklists',           ok:()=>checklistenOK,    tel:()=>cache.checklisten.length},
    {tabel:'logboek',        label:'Logboek',              ok:()=>logboekOK,        tel:()=>cache.logboek.length},
    {tabel:'gebruikers',     label:'Gebruikers (namen)',   ok:()=>gebruikersOK,     tel:()=>cache.gebruikers.length},
    {tabel:'activiteit',     label:'Activiteit',           ok:()=>activiteitOK,     tel:()=>cache.activiteit.length},
    {tabel:'projecten',      label:'Projecten',            ok:()=>projectenOK,      tel:()=>cache.projecten.length},
    {tabel:'projecttaken',   label:'Projecttaken',         ok:()=>projecttakenOK,   tel:()=>cache.projecttaken.length},
    {tabel:'projectberichten',label:'Projectberichten',    ok:()=>projectberichtenOK,tel:()=>cache.projectberichten.length},
    {tabel:'projectagenda',  label:'Projectagenda',        ok:()=>projectagendaOK,  tel:()=>cache.projectagenda.length},
    {tabel:'projectdocs',    label:'Projectdocumenten',    ok:()=>projectdocsOK,    tel:()=>cache.projectdocs.length},
    {tabel:'manualsdoc',     label:'Online manuals',       ok:()=>manualsdocOK,     tel:()=>cache.manualsdoc?1:0},
    {tabel:'appconfig',      label:'Instellingen (gedeeld)',ok:()=>appconfigOK,     tel:()=>cache.appconfig?1:0},
    {tabel:'spelarchief',    label:'Spelarchief',          ok:()=>spelarchiefOK,    tel:()=>cache.spelarchief?1:0}
  ];
  function getSysteem(){
    const eerste=outbox[0];
    return {
      online: typeof navigator==='undefined' || navigator.onLine!==false,
      lib: libOK, aangemeld, kern: kernOK, klaar: ready, realtime,
      url: SUPABASE_URL,
      laatsteSync, laatsteFout, laatsteFoutTs,
      wachtrij: outbox.length,
      wachtrijEerste: eerste?{tabel:eerste.table,actie:eerste.op,pogingen:eerste._tries||0}:null,
      nogTeBewaren: dirty.size,
      tabellen: TABELLEN.map(t=>({tabel:t.tabel,label:t.label,gedeeld:!!t.ok(),aantal:t.tel(),kern:!!t.kern}))
    };
  }
  // Echte proef op de som: haalt één rijtje op en meet hoe lang dat duurt.
  async function pingDB(){
    if(!sb) return {ok:false,ms:0,fout:'Supabase-bibliotheek niet geladen'};
    const t0=Date.now();
    try{
      const r=await withTimeout(sb.from('boekjes').select('id').limit(1),8000);
      if(r&&r.error){ noteFout('Verbindingstest',r.error); return {ok:false,ms:Date.now()-t0,fout:r.error.message||String(r.error)}; }
      noteSync();
      return {ok:true,ms:Date.now()-t0};
    }catch(e){
      noteFout('Verbindingstest',e);
      return {ok:false,ms:Date.now()-t0,fout:(e&&e.message)||'geen antwoord'};
    }
  }
  // Wat de losse sleutels in de snelle opslag betekenen, in mensentaal.
  const SLEUTELNAMEN={
    'bb_outbox':'Wachtrij (nog te versturen)',
    'bb_bestellingen':'Bestellingen (oude kopie)','bb_contacten':'Contacten (oude kopie)',
    'bb_checklisten':'Checklists (oude kopie)','bb_logboek':'Logboek (oude kopie)',
    'bb_gebruikers':'Gebruikers (oude kopie)','bb_activiteit':'Activiteit (oude kopie)',
    'bb_projecten':'Projecten (oude kopie)','bb_projecttaken':'Projecttaken (oude kopie)',
    'bb_projectberichten':'Projectberichten (oude kopie)','bb_projectagenda':'Projectagenda (oude kopie)',
    'bb_projectdocs':'Projectdocumenten (oude kopie)','bb_sessies':'Recente spelsessies',
    'bb_cache_v1':'Offline kopie (verhuist naar IndexedDB)',
    'bb_proj_wacht':'Projecten die nog moeten vertrekken'
  };
  // Hoeveel ruimte de app inneemt op dit toestel (localStorage is hard begrensd, ± 5 MB).
  async function getOpslag(){
    let lsBytes=0, lsAantal=0; const sleutels=[];
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i); const v=localStorage.getItem(k)||'';
        const b=(k.length+v.length)*2;
        lsBytes+=b; lsAantal++;
        sleutels.push({k,bytes:b,naam:SLEUTELNAMEN[k]||k,oud:OUDE_BACKUPS.indexOf(k)>=0});
      }
      sleutels.sort((a,b)=>b.bytes-a.bytes);
    }catch(e){}
    let quota=0, usage=0;
    try{
      if(navigator.storage&&navigator.storage.estimate){
        const est=await navigator.storage.estimate();
        quota=est.quota||0; usage=est.usage||0;
      }
    }catch(e){}
    const teHalen=sleutels.filter(s=>s.oud||s.k===K_CACHE).reduce((n,s)=>n+s.bytes,0);
    return {lsBytes,lsAantal,lsLimiet:5*1024*1024,quota,usage,sleutels:sleutels.slice(0,10),
      teHalen,snapshotOK,plek:snapshotIDB?'IndexedDB':'snelle opslag',blijvend};
  }
  // Laatste redmiddel als een wijziging de wachtrij blijft blokkeren. De app vraagt
  // hier eerst bevestiging voor — wat weg is, is weg.
  function wisWachtrij(){
    const n=outbox.length;
    outbox.length=0; saveOutbox(); fire();
    logAct('Systeem: wachtrij gewist ('+n+' wijziging'+(n===1?'':'en')+')');
    return n;
  }

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
    setChkMedia,getChkMedia,delChkMedia,
    getLogboek,addLog,updateLog,removeLog,isLogboekGedeeld:()=>logboekOK,
    getProjecten,getProject,addProject,updateProject,removeProject,
    getTaken,addTaak,updateTaak,removeTaak,reorderTaken,verplaatsTaken,
    getBerichten,addBericht,updateBericht,removeBericht,
    getAgenda,addAgenda,updateAgenda,removeAgenda,
    getDocs,addDoc,updateDoc,removeDoc,
    isProjectenGedeeld:()=>projectenOK&&projecttakenOK&&projectberichtenOK,
    isProjectExtraGedeeld:()=>projectagendaOK&&projectdocsOK,
    STD_KOLOMMEN,
    getGebruikers,addGebruiker,updateGebruiker,removeGebruiker,isGebruikersGedeeld:()=>gebruikersOK,
    setActor,getActiviteit,clearActiviteit,logAct,isActiviteitGedeeld:()=>activiteitOK,
    getManualsTree,saveManualsTree,uploadFile,lijstOpslag,verwijderOpslag,isManualsGedeeld:()=>manualsdocOK,
    haalFotosBij,   // foto's van collega's alsnog ophalen (het Database-overzicht gebruikt dit)
    getConfig,saveConfig,isConfigGedeeld:()=>appconfigOK,
    getArchief,saveArchief,isArchiefGedeeld:()=>spelarchiefOK,
    getSessies,getSessiesFresh,pushSessie,
    pendingCount,flushOutbox,
    rolTags,heeftRol,zetRol,
    getSysteem,pingDB,getOpslag,wisWachtrij,opruimen,
    submitFormulier,addLevering,addPrijs,removePrijs,setFoto,setGebruik,setStock,
    undoLastFormulier,resetInventaris,printInventaris,printBestellijst,uid};
})();

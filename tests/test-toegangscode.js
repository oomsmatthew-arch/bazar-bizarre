// Het toegangscode-scherm. Aan de techniektafel hangt de tablet aan een TP-Link-wifi die
// wél verbonden is, maar zonder internet. Een aanmelding bij de database is telkens een uur
// geldig en moet dan ververst worden — en dat lukt daar niet. Vroeger was dat genoeg om bij
// elke herstart van de pagina de toegangscode te vragen, en zei het scherm "klopt niet"
// terwijl de code juist was. Deze test bootst de echte Supabase-bibliotheek na op de punten
// die ertoe doen:
//   • de aanmelding staat in localStorage, onder dezelfde naam als in de echte bibliotheek;
//   • lukt verversen niet door het netwerk, dan blijft ze bewaard maar zegt getSession "geen";
//   • is ze écht ongeldig (code gewijzigd), dan wist de bibliotheek ze zelf.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
var timers=[];
globalThis.setTimeout=function(fn,ms){ timers.push({fn:fn,ms:ms||0,af:false}); return timers.length-1; };
globalThis.clearTimeout=function(id){ if(timers[id]) timers[id].af=true; };
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
function draaiTimers(tot){
  timers.forEach(function(t){ if(!t.af && t.ms<=tot){ t.af=true; try{t.fn();}catch(e){} } });
}
globalThis.navigator={onLine:true};       // er is wifi — of er internet achter zit, is de vraag

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }
async function rust(){ for(var i=0;i<60;i++) await null; }

// ---- Het netwerk: is de database te bereiken? ----
var internet=false, healthVragen=0;
globalThis.fetch=function(url){
  if(String(url).indexOf('/auth/v1/health')>=0) healthVragen++;
  if(!internet) return Promise.reject(new TypeError('Failed to fetch'));
  return Promise.resolve({ok:true,status:200,json:function(){ return Promise.resolve({name:'GoTrue'}); }});
};

// ---- Het toegangscode-scherm: we tellen hoe vaak het verschijnt, en kunnen antwoorden ----
var schermen=[];
function nepElement(){
  var el={style:{},textContent:'',value:'',onclick:null,_luister:{},
    addEventListener:function(n,f){ el._luister[n]=f; }, focus:function(){}, remove:function(){ el.weg=true; },
    querySelector:function(sel){ el._kind=el._kind||{}; return el._kind[sel]||(el._kind[sel]=nepElement()); }};
  return el;
}
globalThis.document={
  createElement:function(){ return nepElement(); },
  body:{appendChild:function(el){ schermen.push(el); }}
};
function antwoord(scherm,code){
  if(code===null){ scherm.querySelector('#bbToegangOff').onclick(); return; }
  scherm.querySelector('#bbToegangInput').value=code;
  scherm.querySelector('#bbToegangOk').onclick();
}
function foutOp(scherm){ return scherm.querySelector('#bbToegangFout').textContent; }

// ---- De bibliotheek ----
var K_AUTH='sb-tbromtomzglqtuyezoav-auth-token';
var CODE='drie-woorden-samen';
function zetAanmelding(minutenGeldig){
  store[K_AUTH]=JSON.stringify({access_token:'a',refresh_token:'r',
    expires_at:Math.floor(Date.now()/1000)+minutenGeldig*60});
}
var echtIngetrokken=false;   // bv. de toegangscode is in Supabase gewijzigd
function nepAuth(){
  return {
    getSession:function(){
      var t=JSON.parse(store[K_AUTH]||'null');
      if(!t) return Promise.resolve({data:{session:null},error:null});
      if(t.expires_at*1000-Date.now()>30000) return Promise.resolve({data:{session:t},error:null});
      // Verlopen → verversen over het netwerk.
      if(!internet) return Promise.resolve({data:{session:null},error:{name:'AuthRetryableFetchError',status:0}});
      if(echtIngetrokken){ delete store[K_AUTH]; return Promise.resolve({data:{session:null},error:{name:'AuthApiError',status:400}}); }
      zetAanmelding(60); return Promise.resolve({data:{session:JSON.parse(store[K_AUTH])},error:null});
    },
    signInWithPassword:function(x){
      if(!internet) return Promise.resolve({data:{},error:{name:'AuthRetryableFetchError',status:0}});
      if(x.password!==CODE) return Promise.resolve({data:{},error:{name:'AuthApiError',status:400}});
      zetAanmelding(60); return Promise.resolve({data:{},error:null});
    }
  };
}

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';
var ONTBREEKT={contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,projecten:true,projecttaken:true,
  projectberichten:true,projectagenda:true,projectdocs:true,bestellingen:true};
function basisDB(){
  return {prijzen:[{id:'p1',cat:'groot',naam:'Blender',stock:4,in_gebruik:true,foto:''}],
          boekjes:[{id:1,stock:100}], formulieren:[], leveringen:[],
          gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}]};
}
// De pagina (her)laden. Geeft de opstart-belofte terug: bij een scherm wacht die op een antwoord.
var nep;
function start(db){
  nep=maakNepSupabase(db,Object.assign({},ONTBREEKT));
  nep.client.auth=nepAuth();
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  schermen=[]; timers=[]; healthVragen=0;
  return BBInv.init();
}
function aangemeld(){ return !!BBInv.getSysteem().aangemeld; }

(async function(){
  print('— Het TP-Link-geval: al lang aangemeld, aanmelding verlopen, geen internet —');
  // Eerst, met internet, een gewone start: zo heeft de tablet een lokale kopie, zoals in het echt.
  store={}; internet=true; echtIngetrokken=false;
  zetAanmelding(30);
  var serverDB=basisDB();
  await start(serverDB);
  ok(aangemeld() && schermen.length===0,'(voorbereiding) met internet aangemeld, geen scherm');
  // Twee uur later, aan de techniektafel: pagina herstart, aanmelding verlopen, geen internet.
  internet=false;
  zetAanmelding(-120);
  await start(serverDB);
  ok(schermen.length===0,'GEEN toegangscode-scherm');
  ok(!aangemeld(),'niet aangemeld (kan ook niet zonder internet)');
  ok(BBInv.getSysteem().klaar,'de app staat gewoon klaar, met wat er lokaal bewaard was');
  ok(!!store[K_AUTH],'de bewaarde aanmelding blijft staan');

  print('\n— Daar gewoon verder werken: wijzigingen wachten in de wachtrij —');
  var db=serverDB;
  BBInv.setStock('p1',2);
  draaiTimers(1000);                         // een voorraadwijziging wacht eerst een halve seconde
  await rust();
  ok(BBInv.pendingCount()>0,'de wijziging staat in de wachtrij');
  ok(db.prijzen[0].stock===4,'en is nog niet in de database (geen internet)');

  print('\n— Het internet komt terug: vanzelf aangemeld, wachtrij vertrekt, zonder scherm —');
  internet=true;
  draaiTimers(60000);                        // de stille nieuwe poging van elke minuut
  await rust();
  ok(aangemeld(),'stil opnieuw aangemeld');
  ok(schermen.length===0,'nog altijd geen toegangscode-scherm');
  for(var i=0;i<20 && BBInv.pendingCount();i++){ await BBInv.flushOutbox(); await rust(); }
  ok(BBInv.pendingCount()===0,'de wachtrij is leeg');
  ok(db.prijzen[0].stock===2,'en de wijziging staat in de database');

  print('\n— Herstart op het TP-Link-netwerk, aanmelding nog geldig —');
  internet=false; zetAanmelding(30);
  await start(basisDB());
  ok(schermen.length===0,'geen scherm');
  ok(healthVragen===0,'en zelfs geen netwerkcontrole nodig (de aanmelding is nog geldig)');

  print('\n— Een nieuw toestel zonder internet —');
  store={}; internet=false;
  await start(basisDB());
  ok(schermen.length===0,'geen scherm: de code kan toch niet gecontroleerd worden');
  ok(!aangemeld(),'lokaal verder');

  print('\n— Een nieuw toestel mét internet: dan wél de code vragen —');
  store={}; internet=true;
  var klaar=start(basisDB());
  await rust();
  ok(schermen.length===1,'het toegangscode-scherm verschijnt');
  antwoord(schermen[0],'fout-geraden');
  await rust();
  ok(schermen.length===2 && /klopt niet/.test(foutOp(schermen[1])),'een foute code: "klopt niet"');
  internet=false;                            // midden in het intypen valt het internet weg
  antwoord(schermen[1],CODE);
  await rust();
  ok(schermen.length===3 && /Geen verbinding/.test(foutOp(schermen[2])),
     'de juiste code zonder internet: "geen verbinding", niet "klopt niet"');
  internet=true;
  antwoord(schermen[2],CODE);
  await klaar;
  ok(aangemeld(),'met internet en de juiste code: aangemeld');

  print('\n— "Verder zonder internet" gekozen, internet is er wel —');
  store={}; internet=true;
  klaar=start(basisDB());
  await rust();
  antwoord(schermen[0],null);
  await klaar;
  ok(!aangemeld(),'lokaal verder');
  draaiTimers(60000); await rust();
  ok(schermen.length===1,'de stille nieuwe poging vraagt de code niet opnieuw');

  print('\n— Echt afgemeld (code in Supabase gewijzigd) — dán vraagt ze opnieuw —');
  store={}; internet=true; echtIngetrokken=true;
  zetAanmelding(-120);
  klaar=start(basisDB());
  await rust();
  ok(!store[K_AUTH],'de bibliotheek wiste de ongeldige aanmelding');
  ok(schermen.length===1,'het scherm verschijnt');
  echtIngetrokken=false;
  antwoord(schermen[0],CODE);
  await klaar;
  ok(aangemeld(),'met de nieuwe code: aangemeld');

  print('\n'+(fouten?'RESULTAAT: '+fouten+' fout(en)':'RESULTAAT: alles in orde'));
})().catch(function(e){ print('CRASH: '+e+'\n'+(e&&e.stack)); print('RESULTAAT: crash'); });

// Test de opslag-opruiming: van "elke tabel twee keer bewaard" naar één momentopname.
// Dit is de gevaarlijkste soort wijziging (er kunnen gegevens verdwijnen), dus we spelen
// het scenario van de tablet na: opslag helemaal vol, oude losse kopieën nieuwer dan de
// gedeelde momentopname.
var store={};
var LIMIET=null;   // null = onbeperkt; een getal = zoveel tekens passen er in totaal
function beslag(){ var n=0; Object.keys(store).forEach(function(k){ n+=k.length+store[k].length; }); return n; }
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){
    v=String(v);
    if(LIMIET!==null){
      var oud=Object.prototype.hasOwnProperty.call(store,k)?(k.length+store[k].length):0;
      if(beslag()-oud+k.length+v.length>LIMIET){ throw new Error('QuotaExceededError'); }
    }
    store[k]=v;
  },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
var timers=[];
globalThis.setTimeout=function(fn,ms){ timers.push({fn:fn,ms:ms||0,af:false}); return timers.length-1; };
globalThis.clearTimeout=function(id){ if(timers[id]) timers[id].af=true; };
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
globalThis.navigator={onLine:true};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

// Nagemaakte IndexedDB — genoeg voor de open/put/get die inventaris.js gebruikt.
// De callbacks worden pas in een volgende microtaak opgeroepen, net als in een browser:
// de echte code zet .onsuccess/.oncomplete pas ná de aanroep.
function nepIndexedDB(){
  var data={}, stores={}, puts={};
  function later(fn){ Promise.resolve().then(fn); }
  // Een echte IndexedDB maakt bij put() een kópie (structured clone). Zonder dat na te doen
  // zou de test een verwijzing naar de levende cache bewaren en dus altijd slagen, ook als
  // er in werkelijkheid niets weggeschreven werd.
  function kopie(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; } }
  return {
    data:data,
    puts:puts,          // hoe vaak er per sleutel geschreven is
    open:function(){
      var req={onupgradeneeded:null,onsuccess:null,onerror:null,result:null};
      req.result={
        objectStoreNames:{contains:function(n){ return !!stores[n]; }},
        createObjectStore:function(n){ stores[n]=true; },
        transaction:function(){
          var tx={oncomplete:null,onerror:null,objectStore:function(){
            return {
              put:function(v,k){ data[k]=kopie(v); puts[k]=(puts[k]||0)+1; later(function(){ if(tx.oncomplete) tx.oncomplete(); }); },
              get:function(k){ var rq={onsuccess:null,onerror:null,result:undefined};
                later(function(){ rq.result=data[k]; if(rq.onsuccess) rq.onsuccess(); }); return rq; },
              'delete':function(k){ delete data[k]; later(function(){ if(tx.oncomplete) tx.oncomplete(); }); }
            };
          }};
          return tx;
        },
        close:function(){}
      };
      later(function(){ if(req.onupgradeneeded) req.onupgradeneeded(); if(req.onsuccess) req.onsuccess(); });
      return req;
    }
  };
}
// De IndexedDB-ketting is asynchroon; even de wachtrij van microtaken laten leeglopen.
async function rust(){ for(var i=0;i<40;i++) await Promise.resolve(); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';

function basisDB(){
  return {prijzen:[{id:'p1',cat:'klein',naam:'Knuffel',stock:10,in_gebruik:true,foto:''}],
          boekjes:[{id:1,stock:100}], formulieren:[], leveringen:[], gebruikers:[]};
}
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true};

async function sessie(db){
  var nep=maakNepSupabase(db,ONTBREEKT);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  return nep;
}
function project(id,naam,ts){
  return {id:id,naam:naam,doel:'',status:'Lopend',kleur:'',start:'',deadline:'',
    verantwoordelijke:'',kolommen:['Te doen','Klaar'],pos:1,archief:false,ts:ts||1};
}

(async function(){
  print('— Oude losse kopieën worden overgenomen en daarna opgeruimd —');
  store['bb_projecten']=JSON.stringify([project('a1','Halloween')]);
  store['bb_contacten']=JSON.stringify([{id:'c1',naam:'Jan',rol:'techniek',tel:'',mail:'',ts:1}]);
  await sessie(basisDB());
  ok(BBInv.getProjecten().length===1,'het project uit de oude kopie staat in de app');
  ok(BBInv.getContacten().length===1,'het contact uit de oude kopie staat in de app');
  ok(!store['bb_projecten'] && !store['bb_contacten'],'de oude losse kopieën zijn opgeruimd');
  var snap=JSON.parse(store['bb_cache_v1']||'{}');
  ok((snap.projecten||[]).length===1 && (snap.contacten||[]).length===1,'alles zit nu in één momentopname');

  print('\n— Een losse kopie die nieuwer is dan de momentopname wint —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  // Zo ziet een volgelopen toestel eruit: de grote momentopname is blijven steken op een
  // oude stand, de kleine losse kopie werd nog wél bijgewerkt.
  store['bb_cache_v1']=JSON.stringify({projecten:[project('a1','Oude naam')],contacten:[],checklisten:[],
    logboek:[],gebruikers:[],activiteit:[],projecttaken:[],projectberichten:[],projectagenda:[],
    projectdocs:[],bestellingen:[],prijzen:[],formulieren:[],leveringen:[],boekjes:{stock:0}});
  store['bb_projecten']=JSON.stringify([project('a1','Nieuwe naam'),project('a2','Kerstmarkt')]);
  await sessie(basisDB());
  var namen=BBInv.getProjecten().map(function(p){return p.naam;}).sort();
  ok(namen.length===2,'beide projecten uit de nieuwere kopie zijn er ('+namen.join(', ')+')');
  ok(namen.indexOf('Nieuwe naam')>=0,'de nieuwere naam won van de oude momentopname');
  ok(!store['bb_projecten'],'de losse kopie is pas daarna opgeruimd');

  print('\n— Opslag helemaal vol: opruimen maakt zichzelf weer los —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var veel=[]; for(var i=0;i<40;i++) veel.push(project('p'+i,'Project '+i+' '+new Array(60).join('x')));
  store['bb_projecten']=JSON.stringify(veel);
  store['bb_projecttaken']=JSON.stringify([]);
  // Krap genoeg dat de momentopname er niet bij past zolang de losse kopie er staat.
  LIMIET=Math.round((store['bb_projecten'].length)*1.6);
  await sessie(basisDB());
  ok(BBInv.getProjecten().length===40,'alle 40 projecten staan nog in de app');
  ok(!store['bb_projecten'],'de dubbele kopie is weg — dat maakte de plaats vrij');
  var snap3=JSON.parse(store['bb_cache_v1']||'{}');
  ok((snap3.projecten||[]).length===40,'en de momentopname kon daarna wél geschreven worden');
  LIMIET=null;

  print('\n— Verhuizing naar de ruime opslag (IndexedDB) —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var idb=nepIndexedDB();
  globalThis.indexedDB=idb;
  store['bb_cache_v1']=JSON.stringify({projecten:[project('m1','Verhuizen')],contacten:[],checklisten:[],
    logboek:[],gebruikers:[],activiteit:[],projecttaken:[],projectberichten:[],projectagenda:[],
    projectdocs:[],bestellingen:[],prijzen:[],formulieren:[],leveringen:[],boekjes:{stock:0}});
  await sessie(basisDB());
  await rust();
  ok(BBInv.getProjecten().length===1,'de oude kopie is meeverhuisd');
  ok(!!idb.data['momentopname'],'de momentopname staat nu in de ruime opslag');
  ok((idb.data['momentopname'].projecten||[]).length===1,'met het project erin');
  ok(!store['bb_cache_v1'],'en niet meer in de snelle opslag');

  print('\n— Een volgende start leest uit de ruime opslag —');
  BBInv.addProject({naam:'Nieuwjaar'});
  BBInv.opruimen();          // meteen wegschrijven i.p.v. op de timer wachten
  await rust();
  await sessie(basisDB());   // opnieuw opstarten met dezelfde IndexedDB
  await rust();
  var namen2=BBInv.getProjecten().map(function(p){return p.naam;}).sort();
  ok(namen2.length===2,'beide projecten kwamen terug uit de ruime opslag ('+namen2.join(', ')+')');
  ok(!store['bb_cache_v1'],'de snelle opslag blijft leeg');
  globalThis.indexedDB=undefined;

  print('\n— Invullen en meteen naar een andere pagina —');
  // Het scenario van elke dag: iets invullen en direct wegklikken. De timers draaien hier
  // BEWUST niet (draaiTimers wordt niet aangeroepen) — dat bootst na dat de pagina weg is
  // vóór een uitgestelde schrijfactie zou afgaan. Alles moet er dus al staan.
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var idb2=nepIndexedDB();
  globalThis.indexedDB=idb2;
  await sessie(basisDB());
  await rust();
  BBInv.addContact({naam:'Nieuwe leverancier',rol:'decor',tel:'0470',mail:''});
  BBInv.addProject({naam:'Snel weggeklikt'});
  await rust();                                  // geen timers, enkel de IndexedDB-ketting
  var bewaard2=idb2.data['momentopname']||{};
  ok((bewaard2.contacten||[]).length===1,'het contact staat meteen in de offline kopie');
  ok((bewaard2.projecten||[]).length===1,'het project ook — zonder op een timer te wachten');
  // En het komt ook echt terug na een herstart.
  await sessie(basisDB());
  await rust();
  ok(BBInv.getContacten().length===1 && BBInv.getProjecten().length===1,
     'na opnieuw opstarten staat alles er nog');
  globalThis.indexedDB=undefined;

  print('\n— Wie je bent is meteen bekend, vóór de database antwoordt —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  globalThis.indexedDB=undefined;   // via de snelle opslag, zodat de stand er zeker staat
  store['bb_cache_v1']=JSON.stringify({projecten:[],contacten:[],checklisten:[],logboek:[],
    gebruikers:[{id:'u9',naam:'Matthew',pin:'h:x',rol:'vast,admin',foto:'',ts:1}],
    activiteit:[],projecttaken:[],projectberichten:[],projectagenda:[],projectdocs:[],
    bestellingen:[],prijzen:[],formulieren:[],leveringen:[],boekjes:{stock:0}});
  var nep=maakNepSupabase(basisDB(),ONTBREEKT);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  var vroegAantal=null, vroegRol=null, vroegKlaar=null;
  BBInv.setOnChange(function(){
    if(vroegAantal!==null) return;                 // enkel de allereerste verversing
    var lijst=BBInv.getGebruikers();
    vroegAantal=lijst.length;
    vroegRol=BBInv.heeftRol(lijst[0],'admin');
    vroegKlaar=BBInv.isReady();
  });
  await BBInv.init();
  ok(vroegAantal===1,'de namenlijst was al gevuld bij de eerste verversing');
  ok(vroegRol===true,'en de rol Admin was toen al bekend');
  ok(vroegKlaar===false,'dat gebeurde nog vóór het laden klaar was');

  print('\n— Opstarten herschrijft de offline kopie niet per tabel —');
  Object.keys(store).forEach(function(k){ delete store[k]; });
  var idb3=nepIndexedDB();
  globalThis.indexedDB=idb3;
  // Elke gedeelde tabel moet gevuld zijn, anders valt er per tabel niets weg te schrijven
  // en zou de test ook slagen zonder het bundelen.
  var volleDB=basisDB();
  volleDB.bestellingen=[{id:'b1',ts:1,info:'Knuffels',status:'Besteld'}];
  volleDB.contacten=[{id:'c1',naam:'Jan',rol:'techniek',tel:'',mail:'',ts:1}];
  volleDB.checklisten=[{id:'k1',naam:'Pre-spel',items:[],pos:0,ts:1}];
  volleDB.logboek=[{id:'l1',ts:1,datum:'',auteur:'Jan',tekst:'Micro stuk',klaar:false}];
  volleDB.activiteit=[{id:'a1',ts:1,wie:'Jan',actie:'Prijs toegevoegd'}];
  volleDB.projecten=[{id:'pr1',naam:'Halloween',kolommen:['Te doen'],pos:1,ts:1}];
  volleDB.projecttaken=[{id:'t1',project_id:'pr1',kolom:'Te doen',titel:'Decor',pos:1,ts:1}];
  volleDB.projectberichten=[{id:'m1',project_id:'pr1',soort:'bericht',ts:1,auteur:'Jan',tekst:'hoi'}];
  volleDB.projectagenda=[{id:'g1',project_id:'pr1',datum:'2026-10-01',titel:'Overleg',soort:'afspraak',ts:1}];
  volleDB.projectdocs=[{id:'d1',project_id:'pr1',naam:'Offerte',url:'https://x',soort:'Offerte',ts:1}];
  var nep3=maakNepSupabase(volleDB,{});        // alle tabellen bestaan én zijn gevuld
  globalThis.supabase={createClient:function(){ return nep3.client; }};
  delete globalThis.BBInv;
  load(PAD);
  await BBInv.init();
  await rust();
  var n=idb3.puts['momentopname']||0;
  ok(n>0,'de offline kopie is weggeschreven');
  ok(n<=6,'en niet één keer per tabel ('+n+' schrijfacties voor 15 tabellen)');
  globalThis.indexedDB=undefined;

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

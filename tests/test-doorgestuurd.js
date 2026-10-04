// Het "Doorgestuurd"-scherm van het spel: één groot kader dat van kleur en tekst wisselt.
//   ROOD   = nog niet verstuurd (geen internet, niet aangemeld, of de poging mislukte)
//   ORANJE = er wordt nu verstuurd
//   GROEN  = verstuurd en gesynct
//
// Vroeger stond er bovenaan altijd "Doorgestuurd ✓", en zei een klein kadertje eronder of
// het al echt verstuurd was. Op een wifi zonder internet (het TP-Link-netwerk aan de
// techniektafel) bleef dat kadertje eindeloos "bezig met versturen" zeggen: de browser
// denkt dat hij online is, maar elke poging mislukt. Nu wordt het daar rood.
//
// Hoe: we knippen het stuk tussen "KLAAR-TOESTAND (begin)" en "(einde)" uit
// bazar-bizarre-spel.html en draaien het tegen de échte gegevenslaag (js/inventaris.js)
// met de nep-database, en een piepkleine nep-DOM voor de vier vakjes van het kader.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
// Timers bijhouden maar niet vanzelf laten lopen: anders loopt de tijdslimiet van
// withTimeout() af en denkt de app dat het netwerk weg is.
var timers=[];
globalThis.setTimeout=function(fn,ms){ timers.push({fn:fn,ms:ms||0,af:false}); return timers.length-1; };
globalThis.clearTimeout=function(id){ if(timers[id]) timers[id].af=true; };
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
globalThis.navigator={onLine:true};
async function rust(){ for(var i=0;i<120;i++) await Promise.resolve(); }

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

// ---- nep-DOM: enkel de vakjes van het kader ----
var elementen={};
function el(id){
  return elementen[id]||(elementen[id]={id:id,className:'',textContent:'',style:{display:'none'},onclick:null});
}
globalThis.document={getElementById:el};

// ---- het stuk uit de spelpagina ----
var html=readFile('./bazar-bizarre-spel.html');
var a=html.indexOf('// ---- KLAAR-TOESTAND (begin)'), b=html.indexOf('// ---- KLAAR-TOESTAND (einde) ----');
if(a<0||b<0) throw new Error('markeringen KLAAR-TOESTAND niet gevonden in bazar-bizarre-spel.html');
eval(html.slice(a,b)+'\nglobalThis.klaarToestand=klaarToestand;globalThis.updateKlaarSync=updateKlaarSync;'+
  'globalThis.klaarOpnieuwProberen=klaarOpnieuwProberen;');

load('./tests/nep-supabase.js');
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,appconfig:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true};
function basisDB(){
  return {prijzen:[{id:'p1',cat:'klein',naam:'Knuffel',stock:10,in_gebruik:true},
                   {id:'p2',cat:'groot',naam:'Fiets',stock:4,in_gebruik:true}],
          boekjes:[{id:1,stock:100}], formulieren:[], leveringen:[], gebruikers:[]};
}
// Schakelaars voor het schrijven naar de database. LEZEN blijft altijd werken.
//   netwerk='weg'  → elke schrijfactie mislukt zoals op een wifi zonder internet
//   netwerk='fout' → de server antwoordt wél, maar met een foutmelding
var netwerk='ok';
async function sessie(db,opties){
  opties=opties||{};
  Object.keys(store).forEach(function(k){ delete store[k]; });
  timers=[]; netwerk='ok'; navigator.onLine=true;
  var nep=maakNepSupabase(db,ONTBREEKT);
  if(opties.nietAangemeld) nep.zetSessie(false);
  var echtFrom=nep.client.from;
  nep.client.from=function(tabel){
    var q=echtFrom.call(nep.client,tabel);
    ['insert','upsert','update','delete'].forEach(function(soort){
      var echt=q[soort];
      q[soort]=function(p){
        echt.call(q,p);
        var oudThen=q.then;
        q.then=function(res,rej){
          if(netwerk==='weg') return Promise.reject(new Error('netwerk weg')).then(res,rej);
          if(netwerk==='fout') return Promise.resolve({data:null,error:{message:'boem'}}).then(res,rej);
          return oudThen.call(q,res,rej);
        };
        return q;
      };
    });
    return q;
  };
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load('./js/inventaris.js');
  await BBInv.init();
  // Het opstarten stuurt zelf ook al iets weg, zonder daarop te wachten. Laat dat eerst
  // aflopen: anders neemt die nog lopende ronde het formulier mee, ook nadat de test het
  // internet "uitzette" — de nep-database kijkt daar niet naar.
  await rust();
  return nep;
}
function doorsturen(){
  return BBInv.submitFormulier({namen:'Isabelle & Matthew',kleine:[{id:'p1',n:1}],groot:[{id:'p2',n:1}],
    boekjes:{gereserveerd:3,extra:0,gratis:0},finale:'',finalevraag:'V1: Wanneer werd Spa voor het eerst gebotteld?',opmerking:''});
}
function nu(){ return klaarToestand(BBInv.getSysteem(),false); }
function kader(){ updateKlaarSync(); return el('klaarCard').className; }

(async function(){

  print('— De beslissing zelf, los van de database —');
  var basis={online:true,klaar:true,lib:true,aangemeld:true,wachtrij:2,wachtrijVast:false};
  function met(x){ return Object.assign({},basis,x); }
  ok(klaarToestand(met({wachtrij:0}),false).kleur==='groen','lege wachtrij = groen');
  ok(klaarToestand(met({wachtrij:0}),false).titel.indexOf('Doorgestuurd')>=0,'met de titel "Doorgestuurd"');
  ok(klaarToestand(met({wachtrij:0,online:false,aangemeld:false}),false).kleur==='groen',
     'lege wachtrij is groen, ook zonder internet of aanmelding (er wacht niets meer)');
  ok(klaarToestand(met({}),false).kleur==='oranje','iets in de wachtrij, alles in orde = oranje (bezig)');
  ok(klaarToestand(met({online:false}),false).kleur==='rood','geen internet = rood');
  ok(!klaarToestand(met({online:false}),false).opnieuw,'zonder internet geen knop "opnieuw proberen"');
  ok(klaarToestand(met({aangemeld:false}),false).kleur==='rood','niet aangemeld = rood');
  ok(!klaarToestand(met({aangemeld:false}),false).opnieuw,'niet aangemeld: geen knop (versturen kan dan toch niet)');
  ok(klaarToestand(met({lib:false}),false).kleur==='rood','databasebibliotheek niet geladen = rood');
  ok(klaarToestand(met({wachtrijVast:true}),false).kleur==='rood','vorige poging mislukt = rood');
  ok(klaarToestand(met({wachtrijVast:true}),false).opnieuw===true,'met een knop "opnieuw proberen"');
  ok(klaarToestand(met({wachtrijVast:true}),true).kleur==='oranje','tijdens een zelf gestarte poging = oranje');
  ok(klaarToestand(met({online:false}),true).kleur==='rood','zonder internet blijft het rood, ook na een tik op de knop');
  ok(klaarToestand(met({klaar:false}),false).kleur==='oranje','app nog aan het opstarten = oranje');
  var oud=met({}); delete oud.wachtrijVast;
  ok(klaarToestand(oud,false).kleur==='oranje','een oudere gegevenslaag zonder wachtrijVast valt terug op oranje');

  print('\n— Gewoon internet: meteen groen —');
  var db=basisDB();
  await sessie(db);
  doorsturen();
  await rust();
  ok(BBInv.getSysteem().wachtrij===0,'de wachtrij is leeg');
  ok(db.formulieren.length===1,'het formulier staat in de database');
  ok(kader()==='klaarcard groen','het kader is groen');
  ok(el('klaarTitel').textContent==='✓ Doorgestuurd','titel: ✓ Doorgestuurd');
  ok(el('klaarOpnieuw').style.display==='none','geen knop "opnieuw proberen"');

  print('\n— Wifi zonder internet: rood, niet eindeloos oranje —');
  db=basisDB();
  await sessie(db);
  netwerk='weg';
  doorsturen();
  await rust();
  var s=BBInv.getSysteem();
  ok(s.online===true,'de browser denkt dat hij online is');
  ok(s.wachtrij>0,'het formulier wacht nog in de wachtrij');
  ok(s.wachtrijVast===true,'de gegevenslaag meldt dat de poging mislukte (wachtrijVast)');
  ok(db.formulieren.length===0,'en het staat inderdaad niet in de database');
  ok(kader()==='klaarcard rood','het kader is ROOD');
  ok(el('klaarTitel').textContent.indexOf('Nog niet doorgestuurd')>=0,'titel: Nog niet doorgestuurd');
  ok(el('klaarOpnieuw').style.display==='','de knop "opnieuw proberen" staat er');

  print('\n— Internet terug, tik op "Nu opnieuw proberen" —');
  netwerk='ok';
  klaarOpnieuwProberen();
  ok(el('klaarCard').className==='klaarcard oranje','meteen oranje terwijl het verstuurd wordt');
  ok(el('klaarOpnieuw').style.display==='none','de knop verdwijnt zolang het bezig is');
  await rust();
  ok(BBInv.getSysteem().wachtrij===0,'de wachtrij is leeg');
  ok(db.formulieren.length===1,'het formulier staat nu in de database');
  ok(BBInv.getSysteem().wachtrijVast===false,'wachtrijVast staat terug uit');
  ok(el('klaarCard').className==='klaarcard groen','en het kader is groen');

  print('\n— Een poging die NOG eens mislukt, blijft rood —');
  db=basisDB();
  await sessie(db);
  netwerk='weg';
  doorsturen();
  await rust();
  klaarOpnieuwProberen();
  await rust();
  ok(db.formulieren.length===0,'nog altijd niet in de database');
  ok(el('klaarCard').className==='klaarcard rood','na de mislukte poging terug rood (niet blijven hangen op oranje)');
  ok(el('klaarOpnieuw').style.display==='','en de knop staat er weer');

  print('\n— De server geeft een foutmelding: ook rood —');
  db=basisDB();
  await sessie(db);
  netwerk='fout';
  doorsturen();
  await rust();
  s=BBInv.getSysteem();
  ok(s.wachtrij>0 && s.wachtrijEerste && s.wachtrijEerste.pogingen>0,'de opdracht bleef staan na een foutmelding');
  ok(s.wachtrijVast===true,'wachtrijVast staat aan');
  ok(kader()==='klaarcard rood','het kader is rood');

  print('\n— Echt geen internet: rood, met de geruststelling dat het vanzelf vertrekt —');
  db=basisDB();
  await sessie(db);
  navigator.onLine=false;
  doorsturen();
  await rust();
  s=BBInv.getSysteem();
  ok(s.wachtrij>0,'het formulier wacht in de wachtrij');
  ok(s.wachtrijVast===false,'er werd niets geprobeerd, dus niet "vast"');
  ok(kader()==='klaarcard rood','het kader is rood');
  ok(/Geen internet/.test(el('klaarUitleg').textContent),'uitleg: geen internet');
  ok(el('klaarOpnieuw').style.display==='none','geen knop (de browser zegt zelf wanneer het internet terug is)');
  navigator.onLine=true;
  ok(kader()==='klaarcard oranje','online gekomen, nog niets geprobeerd: oranje');
  BBInv.flushOutbox();
  await rust();
  ok(db.formulieren.length===1,'het formulier vertrekt');
  ok(kader()==='klaarcard groen','en het kader wordt groen');

  print('\n— Niet aangemeld bij de database: rood —');
  db=basisDB();
  await sessie(db,{nietAangemeld:true});
  doorsturen();
  await rust();
  s=BBInv.getSysteem();
  ok(s.aangemeld===false,'dit toestel is niet aangemeld');
  ok(s.wachtrij>0,'het formulier wacht in de wachtrij');
  ok(kader()==='klaarcard rood','het kader is rood (niet oranje: er wordt niets verstuurd)');
  ok(/niet aangemeld/.test(el('klaarUitleg').textContent),'uitleg: niet aangemeld');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

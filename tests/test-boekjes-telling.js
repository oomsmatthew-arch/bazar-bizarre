// De boekjesvoorraad: uitgerekend uit een telling, niet langer een losse teller.
//
// Het probleem (oktober 2026): de teller stond op 4334, terwijl er in totaal maar 20 pakjes
// van 192 = 3840 boekjes geleverd waren. Elk toestel schreef een VAST getal naar de teller:
// "wat ik weet − 68". Een tablet met een verouderde kopie (opgestart zonder internet, of een
// Beheer-scherm dat al uren openstond) overschreef zo de afboekingen van de andere toestellen.
//
// Nu: één keer tellen, en daarna rekent elk toestel zelf: telling + geleverd − uitgedeeld.
// Formulieren en leveringen zijn losse rijen; die kan geen toestel overschrijven.
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
globalThis.navigator={onLine:true};

// Een klok die vooruit gaat: elke Date.now() een tel later, zodat elke stap een eigen tijd heeft.
var EchteDate=Date, NU=new EchteDate(2026,9,4,12,0).getTime();
class NepDate extends EchteDate {
  constructor(...a){ if(a.length) super(...a); else super(NU); }
  static now(){ NU+=1000; return NU; }
}
globalThis.Date=NepDate;

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }
async function vlot(n){ for(var i=0;i<(n||40);i++) await Promise.resolve(); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,spelarchief:true,projecten:true,projecttaken:true,projectberichten:true,
  projectagenda:true,projectdocs:true,werkuren:true,producten:true,productleveringen:true};
function basisDB(){
  return {prijzen:[{id:'p1',cat:'klein',naam:'Pen',stock:10,in_gebruik:true}],
    boekjes:[{id:1,stock:4334}],            // de verkeerde oude teller
    formulieren:[
      {id:'f-oud',ts:new EchteDate(2026,8,26,22,0).getTime(),namen:'Tessy & Matthew',kleine:[],groot:[],boekjes:{gereserveerd:70,extra:3,gratis:0}}
    ],
    leveringen:[{id:'l-oud',ts:new EchteDate(2026,7,1,10,0).getTime(),datum:'2026-08-01',boekjes:3840,tekst:'20 pakjes'}],
    gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}],
    appconfig:[{id:1,data:{}}]};
}
var toestel=async function(db){
  var nep=maakNepSupabase(db,ONTBREEKT);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  var api=globalThis.BBInv;
  await api.init(); await vlot();
  return api;
};
var form=function(namen,n){ return {namen:namen,kleine:[],groot:[],boekjes:{gereserveerd:n,extra:0,gratis:0},finale:'',opmerking:''}; };

(async function(){
  print('— Zolang er niet geteld is: de oude teller —');
  var db=basisDB();
  var A=await toestel(db);
  var o=A.boekjesOpbouw();
  ok(o.telling===null,'er is nog geen telling');
  ok(A.getBoekjes().stock===4334,'de voorraad is nog de oude teller (4334)');
  ok(o.teller===4334,'en het scherm kan zeggen wat die teller zegt');

  print('\n— Eén keer tellen —');
  A.setBoekjes({stock:3700});
  await vlot();
  o=A.boekjesOpbouw();
  ok(o.telling&&o.telling.stock===3700,'de telling staat erin: 3700');
  ok(A.getBoekjes().stock===3700,'de voorraad is nu 3700');
  ok(db.appconfig[0].data.boekjesTelling&&db.appconfig[0].data.boekjesTelling.stock===3700,'de telling staat in de gedeelde instellingen, voor alle toestellen');
  ok(o.geleverd===0&&o.uitgedeeld===0,'wat vóór de telling gebeurde (oude levering en formulier) telt niet nog eens mee');

  print('\n— Een spel afsluiten en een levering —');
  A.submitFormulier(form('Isabelle & Matthew',68));
  await vlot();
  ok(A.getBoekjes().stock===3632,'3700 − 68 = 3632');
  A.addLevering({datum:'2026-10-05',boekjes:192,tekst:'1 pakje'});
  await vlot();
  ok(A.getBoekjes().stock===3824,'+ 192 geleverd = 3824');
  o=A.boekjesOpbouw();
  ok(o.nFormulieren===1&&o.nLeveringen===1&&o.uitgedeeld===68&&o.geleverd===192,'de opbouw: 1 spel (−68), 1 levering (+192)');
  ok(db.boekjes[0].stock===3700,'de oude teller wordt niet meer overschreven (bleef op de telling)');

  print('\n— Het eigenlijke probleem: een speltablet zonder internet —');
  // Zo liep de oude teller op. Tablet T opent de app, daarna valt het internet weg (de wifi
  // van het mengpaneel). Intussen sluit A een spel af (−68). T kent dat niet en sluit zelf een
  // spel af (−29). Vroeger schreef T daarna "wat ik weet − 29" naar de teller: de 68 van A weg.
  async function scenario(metTelling){
    var d=basisDB();
    var a=await toestel(d);
    if(metTelling){ a.setBoekjes({stock:3700}); await vlot(); }
    var t=await toestel(d);                           // T opent, nog met internet
    a.submitFormulier(form('Spel op tablet A',68)); await vlot();
    navigator.onLine=false;                           // T verliest het internet
    t.submitFormulier(form('Spel op tablet T',29)); await vlot();
    var tussen=d.formulieren.length;
    navigator.onLine=true;                            // later weer internet
    await t.flushOutbox(); await vlot();
    return {d:d, tussen:tussen, nieuw:await toestel(d)};
  }
  var oud=await scenario(false);
  ok(oud.d.boekjes[0].stock===4334-29,'ZONDER telling (de oude manier): de teller staat op '+oud.d.boekjes[0].stock+' — de 68 van tablet A zijn kwijt');
  var nu=await scenario(true);
  ok(nu.tussen===2,'met telling: zolang T offline is, staat enkel het spel van A in de database');
  ok(nu.d.formulieren.length===3,'daarna komt het spel van T er gewoon bij (naast het oude formulier)');
  ok(nu.nieuw.getBoekjes().stock===3700-68-29,'en elk toestel rekent: 3700 − 68 − 29 = '+(3700-68-29)+' — niets verloren');

  print('\n— Ongedaan maken, aanpassen, verwijderen —');
  var E=await toestel(db);
  ok(E.getBoekjes().stock===3824,'startpunt 3824');
  E.updateFormulier(E.getFormulieren().filter(function(f){return f.namen==='Isabelle & Matthew';})[0].id,{boekjes:{gereserveerd:60,extra:0,gratis:0}});
  await vlot();
  ok(E.getBoekjes().stock===3832,'formulier aangepast van 68 naar 60 boekjes → 8 terug: 3832');
  E.submitFormulier(form('Dubbel ingezonden',50)); await vlot();
  ok(E.getBoekjes().stock===3782,'een spel van 50 erbij: 3782');
  E.undoLastFormulier(); await vlot();
  ok(E.getBoekjes().stock===3832,'laatste formulier ongedaan gemaakt: terug op 3832');
  E.setFormulieren(E.getFormulieren().filter(function(f){return f.id!=='f-oud';})); await vlot();
  ok(E.getBoekjes().stock===3832,'een formulier van vóór de telling verwijderen verandert niets');
  E.setLeveringen(E.getLeveringen().filter(function(l){return l.tekst!=='1 pakje';})); await vlot();
  ok(E.getBoekjes().stock===3640,'een levering van na de telling verwijderen: die 192 gaan er weer af (3640)');

  print('\n— Opnieuw tellen —');
  E.setBoekjes({stock:3600}); await vlot();
  ok(E.getBoekjes().stock===3600,'een nieuwe telling vervangt de vorige: 3600');
  ok(E.boekjesOpbouw().uitgedeeld===0,'en alles daarvoor zit in dat getal');
  E.submitFormulier(form('Lien',65)); await vlot();
  ok(E.getBoekjes().stock===3535,'3600 − 65 = 3535');
  var F=await toestel(db);
  ok(F.getBoekjes().stock===3535,'en een toestel dat net opstart, ziet hetzelfde: 3535');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

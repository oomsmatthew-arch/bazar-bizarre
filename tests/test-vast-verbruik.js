// Vast verbruik (automatische aftelling) voor Quiz/O&F/Algemeen: op vaste weekdagen gaat er
// vanzelf iets af van de voorraad. Er draait geen server — het eerste toestel dat de app opent
// op of na zo'n dag, telt af. Wat hier nooit mag misgaan:
//
//  1. DUBBEL AFTELLEN. Drie tablets die woensdagochtend tegelijk opstarten, mogen samen maar
//     één keer aftellen. Een toestel claimt de dag met een vaste id in productleveringen;
//     de database aanvaardt die id maar één keer.
//  2. MET TERUGWERKENDE KRACHT. Een regel die je vandaag bewaart (of aanpast), telt pas
//     vanaf morgen — anders gaan er bij het aanzetten in één klap weken af.
//  3. GEMISTE DAGEN. Opende er op donderdag niemand de app, dan telt maandag die donderdag
//     alsnog af — maar ook niet meer dan dat.
//  4. ONDER NUL. Wat al op 0 staat, blijft op 0.
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

// De klok in de hand: "vandaag" is wat de test zegt, niet de echte datum.
var EchteDate=Date, NU=new EchteDate(2026,9,5,9,0).getTime();   // maandag 5 oktober 2026
class NepDate extends EchteDate {
  constructor(...a){ if(a.length) super(...a); else super(NU); }
  static now(){ return NU; }
}
globalThis.Date=NepDate;
function zetDag(j,m,d,u){ NU=new EchteDate(j,m-1,d,u==null?9:u,0).getTime(); }

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }
async function vlot(n){ for(var i=0;i<(n||40);i++) await Promise.resolve(); }

load('./tests/nep-supabase.js');
var PAD='./js/inventaris.js';
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,spelarchief:true,projecten:true,projecttaken:true,projectberichten:true,
  projectagenda:true,projectdocs:true,werkuren:true};
function basisDB(){
  return {prijzen:[],boekjes:[{id:1,stock:0}],formulieren:[],leveringen:[],
    gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}],
    appconfig:[{id:1,data:{}}],
    producten:[
      {id:'q1',hoofdstuk:'quiz',naam:'Pennen',stock:10},
      {id:'q2',hoofdstuk:'quiz',naam:'Antwoordbladen',stock:5},
      {id:'q3',hoofdstuk:'quiz',naam:'Buzzer (telt niet mee)',stock:4},
      {id:'q4',hoofdstuk:'quiz',naam:'Snoep',stock:0},
      {id:'o1',hoofdstuk:'of',naam:'Ballonnen',stock:20}
    ],
    productleveringen:[]};
}
// Eén toestel: inventaris.js laden en opstarten. Geeft de BBInv van DAT toestel terug, zodat
// we er twee naast elkaar kunnen laten draaien op dezelfde database.
async function toestel(db,extraOntbreekt){
  var o={}; Object.keys(ONTBREEKT).forEach(function(k){o[k]=true;});
  (extraOntbreekt||[]).forEach(function(k){o[k]=true;});
  var nep=maakNepSupabase(db,o);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load(PAD);
  var api=globalThis.BBInv;
  await api.init();
  await vlot();
  return api;
}
var stock=function(db,id){ return (db.producten.filter(function(p){return p.id===id;})[0]||{}).stock; };
var vvRijen=function(db){ return db.productleveringen.filter(function(l){ return String(l.id).indexOf('vv-')===0; }); };

(async function(){
  print('— Een regel instellen op maandag —');
  var db=basisDB();
  var A=await toestel(db);
  ok(A.isProductenGedeeld(),'de tabel producten bestaat');
  await A.setVastVerbruik('quiz',{aan:true,dagen:[3,4],aantal:1,uit:['q3']});   // woensdag + donderdag
  await vlot();
  var r=A.getVastVerbruik('quiz');
  ok(r&&r.aan&&r.dagen.join()==='3,4','de regel staat erin: woensdag en donderdag');
  ok(r.vanaf==='2026-10-06','ze telt pas vanaf morgen (dinsdag 6 oktober)');
  ok(db.appconfig[0].data.vastVerbruik_quiz&&db.appconfig[0].data.vastVerbruik_quiz.aan,'en staat in de gedeelde instellingen, voor alle toestellen');
  ok(A.volgendeVastVerbruik('quiz')==='2026-10-07','de eerstvolgende aftelling is woensdag 7 oktober');
  ok(A.volgendeVastVerbruik('of')==='','O&F heeft geen regel');
  ok((await A.vastVerbruikInhalen())===0,'op maandag gaat er niets af');
  ok(stock(db,'q1')===10,'pennen staan nog op 10');

  print('\n— Woensdag: het eerste toestel telt af —');
  zetDag(2026,10,7);
  ok((await A.vastVerbruikInhalen())===1,'er is één dag afgeteld');
  await vlot();
  ok(stock(db,'q1')===9 && stock(db,'q2')===4,'pennen 10 → 9, antwoordbladen 5 → 4');
  ok(stock(db,'q3')===4,'de buzzer telt niet mee en blijft op 4');
  ok(stock(db,'q4')===0,'snoep stond op 0 en blijft op 0 (niet −1)');
  ok(stock(db,'o1')===20,'O&F wordt niet aangeraakt');
  var rij=vvRijen(db)[0];
  ok(vvRijen(db).length===1 && rij.id==='vv-quiz-2026-10-07','de dag is geclaimd met een vaste id');
  ok(rij && rij.aantal===-2 && /woensdag/.test(rij.tekst) && /1 stond al op 0/.test(rij.tekst),'en die rij vertelt wat er gebeurde: '+(rij&&rij.tekst));
  ok(A.isVastVerbruikRij(rij),'de app herkent ze als vast verbruik (geen gewone levering)');
  ok(A.volgendeVastVerbruik('quiz')==='2026-10-08','de volgende keer is donderdag');

  print('\n— Dezelfde dag nog eens: niets —');
  ok((await A.vastVerbruikInhalen())===0,'nog eens nakijken telt niet opnieuw af');
  await vlot();
  ok(stock(db,'q1')===9,'pennen blijven op 9');

  print('\n— Een tweede toestel dat later opstart —');
  var B=await toestel(db);
  ok((await B.vastVerbruikInhalen())===0,'het tweede toestel ziet dat woensdag al gedaan is');
  await vlot();
  ok(stock(db,'q1')===9,'pennen nog altijd op 9');

  print('\n— Twee toestellen die TEGELIJK aftellen (donderdag) —');
  zetDag(2026,10,8);
  var C=await toestel(db), D=await toestel(db);
  var uit=await Promise.all([C.vastVerbruikInhalen(),D.vastVerbruikInhalen()]);
  await vlot();
  ok(uit[0]+uit[1]===1,'samen tellen ze één keer af (C: '+uit[0]+', D: '+uit[1]+')');
  ok(stock(db,'q1')===8 && stock(db,'q2')===3,'pennen 9 → 8, antwoordbladen 4 → 3 — niet twee keer');
  ok(vvRijen(db).length===2,'er staan twee dagen in het logboek: woensdag en donderdag');

  print('\n— Gemiste dagen: niemand opende de app tot de maandag erna —');
  zetDag(2026,10,14);   // woensdag 14 oktober
  zetDag(2026,10,19);   // ...maar pas maandag 19 oktober opent iemand de app
  var E=await toestel(db);
  ok((await E.vastVerbruikInhalen())===2,'woensdag 14 en donderdag 15 worden alsnog afgeteld');
  await vlot();
  ok(stock(db,'q1')===6 && stock(db,'q2')===1,'pennen 8 → 6, antwoordbladen 3 → 1');
  ok(vvRijen(db).map(function(l){return l.datum;}).sort().join()==='2026-10-07,2026-10-08,2026-10-14,2026-10-15','precies die vier dagen, geen weekend of vrijdag');

  print('\n— Onder nul gaat het nooit —');
  zetDag(2026,10,21); await E.vastVerbruikInhalen(); await vlot();
  zetDag(2026,10,22); await E.vastVerbruikInhalen(); await vlot();
  ok(stock(db,'q2')===0,'antwoordbladen: 1 → 0, en de dag erna blijven ze op 0');
  ok(stock(db,'q1')===4,'pennen tellen gewoon door: 6 → 4');

  print('\n— Een regel aanpassen werkt niet terug —');
  zetDag(2026,10,26);   // maandag
  await E.setVastVerbruik('quiz',{aan:true,dagen:[1,3,4],aantal:2,uit:['q3']});   // nu ook maandag, en 2 per keer
  await vlot();
  ok(stock(db,'q1')===4,'bewaren op maandag telt die maandag niet af (pennen blijven op 4)');
  ok(E.getVastVerbruik('quiz').vanaf==='2026-10-27','de aangepaste regel telt vanaf morgen');
  ok(E.volgendeVastVerbruik('quiz')==='2026-10-28','eerstvolgende keer: woensdag 28 oktober');
  zetDag(2026,10,28); await E.vastVerbruikInhalen(); await vlot();
  ok(stock(db,'q1')===2,'op woensdag gaan er nu 2 af: 4 → 2');

  print('\n— Uitzetten —');
  await E.setVastVerbruik('quiz',{aan:false,dagen:[1,3,4],aantal:2,uit:[]});
  await vlot();
  zetDag(2026,10,29); ok((await E.vastVerbruikInhalen())===0,'uitgezet: donderdag gaat er niets af');
  ok(E.volgendeVastVerbruik('quiz')==='','en er staat geen volgende keer');

  print('\n— Zonder verbinding: niets doen, later inhalen —');
  var db2=basisDB();
  zetDag(2026,10,5);
  var F=await toestel(db2);
  await F.setVastVerbruik('quiz',{aan:true,dagen:[3],aantal:1,uit:[]}); await vlot();
  zetDag(2026,10,7);
  navigator.onLine=false;
  ok((await F.vastVerbruikInhalen())===0,'offline op woensdag: er gebeurt niets (liever later dan dubbel)');
  ok(stock(db2,'q1')===10 && vvRijen(db2).length===0,'niets afgeteld, niets geclaimd');
  navigator.onLine=true;
  ok((await F.vastVerbruikInhalen())===1,'weer online: de woensdag wordt alsnog afgeteld');
  await vlot();
  ok(stock(db2,'q1')===9,'pennen 10 → 9');

  print('\n— Ontbreekt de tabel productleveringen, dan wordt er niet gegokt —');
  var db3=basisDB(); delete db3.productleveringen;
  zetDag(2026,10,5);
  var G=await toestel(db3,['productleveringen']);
  await G.setVastVerbruik('quiz',{aan:true,dagen:[3],aantal:1,uit:[]}); await vlot();
  zetDag(2026,10,7);
  ok((await G.vastVerbruikInhalen())===0,'producten zijn gedeeld maar zonder claim-tabel tellen we niet af');
  await vlot();
  ok(stock(db3,'q1')===10,'pennen blijven op 10 — anders telt elk toestel apart af');

  print('\n— Over alle toestellen: een tablet die al dagen openstaat —');
  // De instellingen komen niet live binnen. Zet iemand het aftellen uit op zijn gsm, dan mag
  // een tablet die nog de oude regel kent, toch niet aftellen.
  var db4=basisDB();
  zetDag(2026,10,5);
  var gsm=await toestel(db4);
  await gsm.setVastVerbruik('quiz',{aan:true,dagen:[3],aantal:1,uit:[]}); await vlot();
  var tablet=await toestel(db4);                 // opent maandag, blijft de hele week open
  ok(tablet.getVastVerbruik('quiz').aan,'de tablet kent de regel (aan)');
  zetDag(2026,10,6);
  await gsm.setVastVerbruik('quiz',{aan:false,dagen:[3],aantal:1,uit:[]}); await vlot();   // dinsdag: uit op de gsm
  ok(tablet.getVastVerbruik('quiz').aan,'de tablet kent nog steeds de oude regel (geen live-melding)');
  zetDag(2026,10,7);
  ok((await tablet.vastVerbruikInhalen())===0,'woensdag: de tablet haalt eerst de verse regel op en telt NIET af');
  await vlot();
  ok(stock(db4,'q1')===10 && vvRijen(db4).length===0,'niets afgeteld, niets geclaimd');
  ok(tablet.getVastVerbruik('quiz').aan===false,'en de tablet kent nu de regel van de gsm');

  print('\n— Een aangepaste regel op een ander toestel wordt gevolgd —');
  var db5=basisDB();
  zetDag(2026,10,5);
  var a5=await toestel(db5);
  await a5.setVastVerbruik('quiz',{aan:true,dagen:[3],aantal:1,uit:[]}); await vlot();
  var b5=await toestel(db5);
  await a5.setVastVerbruik('quiz',{aan:true,dagen:[3],aantal:3,uit:['q2']}); await vlot();   // 3 per keer, zonder antwoordbladen
  zetDag(2026,10,7);
  ok((await b5.vastVerbruikInhalen())===1,'woensdag telt het andere toestel af');
  await vlot();
  ok(stock(db5,'q1')===7,'volgens de nieuwe regel: 3 pennen af (10 → 7)');
  ok(stock(db5,'q2')===5,'en de antwoordbladen, die uitgevinkt werden, blijven op 5');

  print('\n— Een openstaand toestel haalt een nieuwe regel op als je terugkeert —');
  var db6=basisDB();
  zetDag(2026,10,5,9);
  var open6=await toestel(db6);
  var ander6=await toestel(db6);
  await ander6.setVastVerbruik('of',{aan:true,dagen:[5],aantal:2,uit:[]}); await vlot();
  ok(open6.getVastVerbruik('of')===null,'het openstaande toestel weet nog van niets');
  ok((await open6.ververs('appconfig'))===true,'terug naar het scherm → de instellingen worden opnieuw opgehaald');
  var r6=open6.getVastVerbruik('of');
  ok(r6&&r6.aan&&r6.dagen.join()==='5'&&r6.aantal===2,'en nu staat de regel van het andere toestel er (vrijdag, 2)');
  ok(open6.volgendeVastVerbruik('of')==='2026-10-09','volgende keer: vrijdag 9 oktober');

  print('\n— Na de aftelling van een ander toestel: de nieuwe aantallen ophalen —');
  zetDag(2026,10,9,9);
  ok((await ander6.vastVerbruikInhalen())===1,'vrijdag telt het andere toestel af');
  await vlot();
  ok(stock(db6,'o1')===18,'ballonnen 20 → 18 in de database');
  NU+=5000;
  ok((await open6.ververs('producten'))===true,'het openstaande toestel ververst de voorraad (licht, zonder foto\'s)');
  var o1=open6.getProducten().filter(function(p){return p.id==='o1';})[0];
  ok(o1&&o1.stock===18,'en toont nu ook 18 ballonnen');
  ok((await open6.ververs('productleveringen'))===true,'en de leveringen');
  ok(open6.getProductleveringen().some(function(l){return l.id==='vv-of-2026-10-09';}),'met de aftelling van vrijdag erbij');

  print('\n— Verversen veegt eigen, nog niet verstuurd werk niet weg —');
  NU+=5000;
  navigator.onLine=false;
  open6.setProductStock('o1',50);               // offline aangepast: staat in de wachtrij
  navigator.onLine=true;
  var g=open6.getProducten().filter(function(p){return p.id==='o1';})[0];
  ok(g.stock===50 && open6.pendingCount()>0,'50 ballonnen, nog te versturen');
  ok((await open6.ververs('producten'))===false,'verversen wordt overgeslagen zolang dat onderweg is');
  ok(open6.getProducten().filter(function(p){return p.id==='o1';})[0].stock===50,'de 50 blijft staan');

  print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));
})();

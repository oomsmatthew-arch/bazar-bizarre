// Minimum per product en stockcontrole voor Quiz/O&F/Algemeen — de papieren stocklijsten,
// maar dan in de app. Wat hier nooit mag misgaan:
//
//  1. DE STOCKLIJST TOEVOEGEN mag niets overschrijven: wat er al staat (zelfde naam), blijft
//     staan met zijn voorraad, en nog eens op de knop tikken voegt niets dubbel toe.
//  2. DE KLEUREN: onder het minimum = rood (bijbestellen), precies erop = oranje, erboven =
//     groen. Wat niet meer bijbesteld wordt of enkel in de zomer telt, komt nooit op de
//     bestellijst (behalve zonnebrand in de zomer).
//  3. DE STOCKCONTROLE zet de getelde aantallen in de gedeelde voorraad — enkel wat
//     nagekeken is — en onthoudt wanneer en door wie, voor alle toestellen.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis;
globalThis.addEventListener=function(){};
globalThis.setTimeout=function(){ return 0; }; globalThis.clearTimeout=function(){};
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
globalThis.navigator={onLine:true};

var EchteDate=Date, NU=new EchteDate(2026,10,10,9,0).getTime();   // dinsdag 10 november 2026
class NepDate extends EchteDate {
  constructor(...a){ if(a.length) super(...a); else super(NU); }
  static now(){ return NU; }
}
globalThis.Date=NepDate;

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }
async function vlot(n){ for(var i=0;i<(n||600);i++) await Promise.resolve(); }   // veel schrijfopdrachten na elkaar

load('./tests/nep-supabase.js');
load('./js/inventaris-data.js');
var ONTBREEKT={bestellingen:true,contacten:true,checklisten:true,logboek:true,activiteit:true,
  manualsdoc:true,spelarchief:true,projecten:true,projecttaken:true,projectberichten:true,
  projectagenda:true,projectdocs:true,werkuren:true};
function basisDB(){
  return {prijzen:[],boekjes:[{id:1,stock:0}],formulieren:[],leveringen:[],
    gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast',foto:'',ts:1}],
    appconfig:[{id:1,data:{}}],
    producten:[
      {id:'a1',hoofdstuk:'algemeen',naam:'Watjes',stock:12},         // staat er al, zonder minimum
      {id:'a2',hoofdstuk:'algemeen',naam:'Pleisters',stock:3},       // staat niet op de papieren lijst
      {id:'o1',hoofdstuk:'of',naam:'Ballonnen',stock:20}
    ],
    productleveringen:[]};
}
async function toestel(db){
  var nep=maakNepSupabase(db,ONTBREEKT);
  globalThis.supabase={createClient:function(){ return nep.client; }};
  delete globalThis.BBInv;
  load('./js/inventaris.js');
  var api=globalThis.BBInv;
  await api.init();
  await vlot();
  return api;
}
function rij(db,naam,hs){ return db.producten.filter(function(p){ return p.naam===naam&&(!hs||p.hoofdstuk===hs); })[0]; }

(async function(){
  print('— De papieren stocklijst toevoegen (Algemeen) —');
  var db=basisDB();
  var A=await toestel(db);
  ok(A.stocklijstOntbreekt('algemeen')===16,'16 van de 17 staan er nog niet in (Watjes wel)');
  var r=A.voegStocklijstToe('algemeen');
  await vlot();
  ok(r.toegevoegd===16 && r.bijgewerkt===1,'16 nieuw, Watjes aangevuld met zijn minimum ('+r.toegevoegd+'/'+r.bijgewerkt+')');
  ok(db.producten.filter(function(p){ return p.hoofdstuk==='algemeen'; }).length===18,'samen 18 producten in Algemeen (Pleisters blijft staan)');
  ok(rij(db,'Watjes').stock===12 && db.producten.filter(function(p){ return p.naam==='Watjes'; }).length===1,'Watjes houdt zijn voorraad (12) en staat er maar één keer');
  ok(rij(db,'BOMA Alco Spray').stock===0,'nieuwe producten staan op 0 tot de eerste stockcontrole');
  var info=A.getProductInfo('algemeen');
  var boma=rij(db,'BOMA Alco Spray');
  ok(info[boma.id] && info[boma.id].min===6 && info[boma.id].eenheid==='flessen','BOMA Alco Spray: minstens 6 flessen');
  ok(info['a1'].min===10 && info['a1'].eenheid==='rollen','Watjes: minstens 10 rollen');
  ok(!info['a2'],'Pleisters krijgt niets (staat niet op de lijst)');
  ok(db.appconfig[0].data.productInfo_algemeen && db.appconfig[0].data.productInfo_algemeen[boma.id].min===6,'het minimum staat in de gedeelde instellingen');
  ok(A.stocklijstOntbreekt('algemeen')===0,'daarna ontbreekt er niets meer');
  var r2=A.voegStocklijstToe('algemeen');
  ok(r2.toegevoegd===0 && r2.bijgewerkt===0 && db.producten.filter(function(p){ return p.hoofdstuk==='algemeen'; }).length===18,'nog eens op de knop: niets dubbel');
  ok(A.getProducten().filter(function(p){ return p.hoofdstuk==='of'; }).length===1,'O&F wordt niet aangeraakt');

  print('\n— De kleuren —');
  var p={stock:5}, i={min:6,eenheid:'flessen',status:''};
  ok(A.productStaat(p,i)==='rood','5 bij een minimum van 6 → rood');
  ok(A.productStaat({stock:6},i)==='oranje','precies 6 → oranje');
  ok(A.productStaat({stock:7},i)==='groen','7 → groen');
  ok(A.productStaat({stock:0},{min:0,status:'uitlopend'})==='uitlopend','niet meer bijbestellen → uitlopend, ook op 0');
  ok(A.productStaat({stock:0},{min:2,status:'zomer'})==='buiten','zonnebrand in november → telt niet');
  ok(A.productStaat({stock:0},{min:2,status:'zomer'},new EchteDate(2026,6,1))==='rood','zonnebrand in juli → wel');
  ok(A.productStaat({stock:3},{})==='','zonder minimum: geen kleur');

  print('\n— De bestellijst —');
  var tk=A.tekorten('algemeen');
  ok(tk.length===15,'15 producten onder of op het minimum (alles op 0, behalve Watjes en zonnebrand)');
  ok(!tk.some(function(t){ return t.naam==='Zonnebrand'||t.naam==='Watjes'||t.naam==='Pleisters'; }),'zonnebrand (november), Watjes (12 ≥ 10) en Pleisters (geen minimum) staan er niet op');
  ok(tk[0].naam==='Tissues' && tk[0].tekort===10 && tk[1].naam==='Febreze kledij verfrisser' && tk[1].tekort===8,'het grootste tekort eerst: Tissues (10 dozen), dan Febreze (8 flessen)');

  print('\n— Een stockcontrole —');
  var febreze=rij(db,'Febreze kledij verfrisser'), haargel=rij(db,'Haargel');
  var tel={}; tel[boma.id]=7; tel[febreze.id]=3; tel['a1']=12; tel[haargel.id]=1;
  var rec=A.stockControle('algemeen',tel,'Matthew');
  await vlot();
  ok(rij(db,'BOMA Alco Spray').stock===7 && rij(db,'Febreze kledij verfrisser').stock===3 && rij(db,'Haargel').stock===1,'de getelde aantallen staan in de gedeelde voorraad');
  ok(rec.geteld===4 && rec.gewijzigd===3,'4 nagekeken, 3 aangepast (Watjes klopte al)');
  ok(rec.datum==='2026-11-10' && rec.door==='Matthew','met datum en wie de controle deed');
  ok(db.appconfig[0].data.stockControle_algemeen && db.appconfig[0].data.stockControle_algemeen.door==='Matthew','en dat staat in de gedeelde instellingen, voor alle toestellen');
  ok(rij(db,'Shampoo').stock===0,'wat niet nagekeken is, blijft zoals het stond');
  var staat=function(naam){ var x=rij(db,naam); return A.productStaat(x,A.getProductInfo('algemeen')[x.id]); };
  ok(staat('BOMA Alco Spray')==='groen' && staat('Febreze kledij verfrisser')==='rood' && staat('Haargel')==='oranje','BOMA groen (7/6), Febreze rood (3/8), Haargel oranje (1/1)');
  ok(A.getStockControle('of')===null,'O&F heeft nog geen controle');

  print('\n— Een tweede toestel ziet hetzelfde —');
  var B=await toestel(db);
  ok(B.getStockControle('algemeen') && B.getStockControle('algemeen').datum==='2026-11-10','de laatste controle');
  ok(B.getProductInfo('algemeen')[boma.id].min===6,'het minimum');
  ok(B.tekorten('algemeen').some(function(t){ return t.naam==='Febreze kledij verfrisser'&&t.tekort===5; }),'en dus dezelfde bestellijst (Febreze: nog 5 tekort)');

  print('\n— Minimum aanpassen en product verwijderen —');
  var w={}; w[boma.id]={min:'8',eenheid:'flessen',status:''};
  B.setProductInfo('algemeen',w);
  ok(B.getProductInfo('algemeen')[boma.id].min===8,'het minimum aanpassen (tekst "8" wordt 8)');
  w={}; w[boma.id]={min:''};
  B.setProductInfo('algemeen',w);
  ok(B.getProductInfo('algemeen')[boma.id].min===null && B.productStaat({stock:0},B.getProductInfo('algemeen')[boma.id])==='','een leeg minimum = geen minimum, geen kleur');
  B.removeProduct(haargel.id);
  await vlot();
  ok(!B.getProductInfo('algemeen')[haargel.id],'een verwijderd product neemt zijn minimum mee');

  print('\n— O&F: uitlopende producten —');
  var ro=B.voegStocklijstToe('of');
  await vlot();
  ok(ro.toegevoegd===19,'19 producten van de O&F-lijst toegevoegd');
  var tshirt=rij(db,'O&F T-shirt 104','of');
  ok(B.productStaat(tshirt,B.getProductInfo('of')[tshirt.id])==='uitlopend','T-shirts: niet meer bijbestellen');
  ok(!B.tekorten('of').some(function(t){ return /T-shirt|voorleesboekje|vriendenboekje/.test(t.naam); }),'en die staan nooit op de bestellijst');
  var vb=rij(db,'O&F voorleesboekje FR','of');
  ok(B.getProductInfo('of')[vb.id].notitie==='oud logo','het voorleesboekje FR heeft de notitie "oud logo"');

  print('\n— Twee toestellen voegen de stocklijst tegelijk toe —');
  // Zo ontstond het: twee toestellen tikten op "Stocklijst toevoegen" voor ze elkaars producten
  // gezien hadden. Met een vaste id per product wordt dat één product in de database, niet twee.
  var db2=basisDB(); db2.producten=[];
  var C=await toestel(db2), D=await toestel(db2);       // allebei opgestart vóór er iets in staat
  C.voegStocklijstToe('algemeen'); await vlot();
  ok(D.stocklijstOntbreekt('algemeen')===17,'het tweede toestel heeft de producten van het eerste nog niet gezien');
  D.voegStocklijstToe('algemeen'); await vlot();
  ok(db2.producten.length===17,'toch staat elk product maar één keer in de database ('+db2.producten.length+')');
  var D2=await toestel(db2);
  ok(D2.dubbeleProducten('algemeen').length===0,'en een vers toestel ziet geen dubbels');
  var sh=db2.producten.filter(function(p){ return p.naam==='Shampoo'; })[0];
  ok(D2.getProductInfo('algemeen')[sh.id] && D2.getProductInfo('algemeen')[sh.id].min===6,'met zijn minimum');

  print('\n— Dubbels van vroeger samenvoegen —');
  // Wat er al dubbel stond (met willekeurige id's): de kopie met het minimum stond op 0, de
  // kopie zonder minimum werd geteld (5). Na het samenvoegen: één Shampoo, minimum 6, voorraad 5.
  var db3=basisDB();
  db3.producten=[
    {id:'x1',hoofdstuk:'algemeen',naam:'Shampoo',stock:0},
    {id:'x2',hoofdstuk:'algemeen',naam:'Shampoo',stock:5},
    {id:'x3',hoofdstuk:'algemeen',naam:'Handzeep',stock:0},
    {id:'x4',hoofdstuk:'algemeen',naam:'handzeep ',stock:0},
    {id:'x5',hoofdstuk:'algemeen',naam:'Tissues',stock:4},
    {id:'x6',hoofdstuk:'of',naam:'Shampoo',stock:1}
  ];
  db3.appconfig[0].data.productInfo_algemeen={x1:{min:6,eenheid:'flessen',status:'',notitie:''},x3:{min:6,eenheid:'flessen',status:'',notitie:''}};
  var E=await toestel(db3);
  var dub=E.dubbeleProducten('algemeen');
  ok(dub.length===2,'2 namen staan dubbel (Shampoo, Handzeep — ook met een spatie of kleine letter)');
  var dsh=dub.filter(function(d){ return d.naam==='Shampoo'; })[0];
  ok(dsh && dsh.houd==='x1' && dsh.weg.join()==='x2' && dsh.stock===5,'Shampoo: de kopie met het minimum blijft, met de getelde 5');
  var rs=E.voegDubbelsSamen('algemeen'); await vlot();
  ok(rs.namen===2 && rs.weg===2,'2 namen samengevoegd, 2 kopieën weg');
  var alg=db3.producten.filter(function(p){ return p.hoofdstuk==='algemeen'; });
  ok(alg.length===3,'Algemeen: Shampoo, Handzeep en Tissues ('+alg.map(function(p){ return p.naam; }).join(', ')+')');
  ok(alg.filter(function(p){ return p.id==='x1'; })[0].stock===5,'Shampoo staat op 5');
  ok(E.getProductInfo('algemeen').x1.min===6,'en houdt zijn minimum van 6');
  ok(db3.producten.filter(function(p){ return p.id==='x6'; }).length===1,'de Shampoo van O&F blijft gewoon staan');
  ok(E.dubbeleProducten('algemeen').length===0,'daarna staat er niets meer dubbel');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})().catch(function(e){ print('  ✗ de test liep vast: '+(e&&e.message)); print('\nRESULTAAT: '+(fouten+1)+' fout(en)'); });

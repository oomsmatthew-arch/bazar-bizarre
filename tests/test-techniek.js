// Techniek: het materiaal voor licht en geluid, wat er kapot is, wat in herstel is, en de
// koppeling met het Besteloverzicht. Wat hier nooit mag misgaan:
//
//  1. DE AANTALLEN van telbaar materiaal: kapot, in herstel en afgeschreven verschuiven
//     tussen elkaar, en mogen nooit onder nul of boven het totaal raken.
//  2. EEN MELDING (mag iedereen) zet het item meteen op kapot en blijft open tot een
//     technieker ze afhandelt — naar herstel sturen of hersteld markeren sluit ze ook.
//  3. DE LEVERING van een bestelling die vanuit Techniek gemaakt werd, wordt precies één keer
//     verwerkt — ook als de status later nog eens verandert of een tweede toestel het ziet.
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
var EchteDate=Date, NU=new EchteDate(2026,10,10,9,0).getTime();   // 10 november 2026
class NepDate extends EchteDate {
  constructor(...a){ if(a.length) super(...a); else super(NU); }
  static now(){ return NU; }
}
globalThis.Date=NepDate;

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }
async function vlot(n){ for(var i=0;i<(n||600);i++) await Promise.resolve(); }

load('./tests/nep-supabase.js');
var ONTBREEKT={contacten:true,checklisten:true,logboek:true,activiteit:true,manualsdoc:true,spelarchief:true,
  projecten:true,projecttaken:true,projectberichten:true,projectagenda:true,projectdocs:true,werkuren:true};
function basisDB(){
  return {prijzen:[],boekjes:[{id:1,stock:0}],formulieren:[],leveringen:[],bestellingen:[],
    gebruikers:[{id:'u1',naam:'Matthew',pin:'',rol:'vast,technieker',foto:'',ts:1}],
    appconfig:[{id:1,data:{}}],producten:[],productleveringen:[],techniek:[]};
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
function rij(db,id){ return db.techniek.filter(function(r){ return r.id===id; })[0]; }
function data(db,id){ var r=rij(db,id); return r?r.data:null; }

(async function(){
  print('— Materiaal toevoegen —');
  var db=basisDB();
  var A=await toestel(db);
  ok(A.isTechniekGedeeld(),'de tabel techniek bestaat');
  var xlr=A.addTechniekItem({naam:'XLR-kabel 10 m',groep:'Kabels',type:'aantal',aantal:24,locatie:'Technische ruimte, kast A'});
  var hs=A.addTechniekReeks({naam:'Headset',groep:'Geluid',locatie:'Bay'},6);
  await vlot();
  ok(xlr && data(db,xlr.id).aantal===24 && data(db,xlr.id).locatie==='Technische ruimte, kast A','XLR-kabels: 24 stuks in kast A, gedeeld');
  ok(hs.length===6 && hs[2].naam==='Headset 3' && data(db,hs[2].id).status==='ok','6 headsets, elk een eigen item (Headset 1 … 6), in orde');
  ok(A.getTechniek().length===7,'7 items');
  ok(!A.addTechniekItem({naam:'  '}),'zonder naam gaat niets');

  print('\n— Iemand meldt iets kapot —');
  var m1=A.techniekMeld({itemId:hs[2].id,tekst:'Geen geluid links',foto:'data:image/jpeg;base64,AAAA'});
  var m2=A.techniekMeld({itemId:xlr.id,tekst:'Stekker los',aantal:2});
  var m3=A.techniekMeld({naam:'Spot boven podium',tekst:'Flikkert'});
  await vlot();
  ok(data(db,hs[2].id).status==='kapot','Headset 3 staat meteen op kapot');
  ok(data(db,xlr.id).kapot===2,'2 XLR-kabels kapot');
  ok(rij(db,m1.id) && rij(db,m1.id).foto==='data:image/jpeg;base64,AAAA' && data(db,m1.id).open===true,'de melding staat open in het logboek, met foto');
  ok(data(db,m3.id).item_naam==='Spot boven podium' && !data(db,m3.id).item_id,'iets dat niet in de lijst staat, kan ook gemeld worden');
  ok(A.techniekOpenMeldingen().length===3,'3 open meldingen');
  var t=A.techniekTelling();
  ok(t.kapot===3 && t.herstel===0 && t.open===3,'samen 3 kapot (1 headset + 2 kabels)');

  print('\n— Naar herstel, en terug —');
  A.naarHerstel(hs[2].id,{bij:'AMPS',tekst:'garantie'});
  A.naarHerstel(xlr.id,{bij:'AMPS',aantal:5});          // maar 24 − 0 in herstel; 2 kapot gaan eerst
  await vlot();
  var h=data(db,hs[2].id);
  ok(h.status==='herstel' && h.herstelBij==='AMPS' && h.herstelSinds==='2026-11-10','Headset 3: in herstel bij AMPS sinds 10/11');
  ok(data(db,m1.id).open===false && data(db,m1.id).afgehandeld.hoe==='herstel','de melding van Headset 3 is daarmee afgehandeld');
  ok(data(db,xlr.id).kapot===0 && data(db,xlr.id).herstel===5,'XLR: de 2 kapotte (en 3 andere) naar herstel: kapot 0, herstel 5');
  A.terugUitHerstel(xlr.id,{aantal:3});
  A.terugUitHerstel(hs[2].id,{});
  await vlot();
  ok(data(db,xlr.id).herstel===2 && data(db,xlr.id).herstelBij==='AMPS','3 kabels terug, 2 nog bij AMPS');
  ok(data(db,hs[2].id).status==='ok' && !data(db,hs[2].id).herstelBij,'Headset 3 terug en in orde');
  var log3=A.getTechniekLog(hs[2].id).map(function(l){ return l.actie; });
  ok(log3.join(',')==='terug,herstel,melding,toegevoegd','de geschiedenis van Headset 3: toegevoegd → kapot gemeld → herstel → terug');

  print('\n— Hersteld ter plaatse, afschrijven, en de grenzen —');
  A.techniekMeld({itemId:xlr.id,aantal:30});              // kan nooit meer dan wat er is
  await vlot();
  ok(data(db,xlr.id).kapot===22,'meer kapot melden dan er is: kapot = 24 − 2 in herstel = 22');
  A.markeerHersteld(xlr.id,{aantal:20});
  A.afschrijven(xlr.id,{aantal:4});
  await vlot();
  var x=data(db,xlr.id);
  ok(x.aantal===20 && x.kapot===0 && x.herstel===2,'20 hersteld, 4 afgeschreven (eerst de kapotte): 20 in totaal, 0 kapot, 2 in herstel');
  A.afschrijven(hs[5].id,{tekst:'verloren'});
  await vlot();
  ok(data(db,hs[5].id).status==='weg','Headset 6: afgeschreven (weg)');
  A.meldingAfhandelen(m3.id,'geen');
  await vlot();
  ok(A.techniekOpenMeldingen().length===0,'alle meldingen afgehandeld (de laatste: "geen probleem")');

  print('\n— Bestellen vanuit Techniek → Besteloverzicht —');
  var b=A.techniekBestellen({itemId:xlr.id,aantal:6,leverancier:'Thomann'});
  await vlot();
  var br=db.bestellingen.filter(function(r){ return r.id===b.id; })[0];
  ok(br && br.categorie==='Techniek' && br.info==='XLR-kabel 10 m' && br.aantal==='6' && br.status==='Besteld' && br.leverancier==='Thomann','de bestelling staat in het Besteloverzicht (categorie Techniek, 6 stuks, Thomann)');
  ok(A.techniekBestellingen().length===1 && A.techniekBestellingen()[0].item.id===xlr.id,'en bij Techniek, gekoppeld aan de XLR-kabels');
  A.updateBestelling(b.id,{status:'Onderweg'}); await vlot();
  ok(data(db,xlr.id).aantal===20,'onderweg: nog niets bijgeteld');
  A.updateBestelling(b.id,{status:'In loods'}); await vlot();
  ok(data(db,xlr.id).aantal===26,'in de loods: de 6 kabels komen erbij (20 → 26)');
  A.updateBestelling(b.id,{status:'Uitgepakt'}); await vlot();
  ok(data(db,xlr.id).aantal===26,'nog eens een "ontvangen" status: niet nog eens bijgeteld');
  ok(db.techniek.filter(function(r){ return r.data&&r.data.actie==='geleverd'; }).length===1,'één levering in het logboek');

  print('\n— Een bestelling van het Besteloverzicht koppelen —');
  var b2=A.addBestelling({cat:'Techniek',info:'Nieuwe headset',aantal:'1',status:'Besteld'});
  ok(A.techniekBestellingen().some(function(x){ return x.bestelling.id===b2.id && !x.link; }),'een bestelling met categorie Techniek staat er ook, nog zonder koppeling');
  A.koppelBestelling(b2.id,hs[5].id,1);
  A.updateBestelling(b2.id,{status:'Uitgepakt'}); await vlot();
  ok(data(db,hs[5].id).status==='ok','gekoppeld aan Headset 6 (afgeschreven): geleverd → Headset 6 staat terug in orde');

  print('\n— Een tweede toestel —');
  var B=await toestel(db);
  ok(B.getTechniek().length===7 && B.getTechniekItem(xlr.id).aantal===26,'ziet hetzelfde materiaal');
  ok(B.getTechniekLog(hs[2].id).length===4,'en dezelfde geschiedenis');
  B.updateBestelling(b.id,{status:'In loods'}); await vlot();
  ok(B.getTechniekItem(xlr.id).aantal===26,'de levering nog eens "ontvangen" op een ander toestel: niets dubbel');
  B.removeTechniekItem(hs[4].id); await vlot();
  ok(!rij(db,hs[4].id) && B.getTechniekLog(hs[4].id).some(function(l){ return l.actie==='verwijderd'; }),'een item verwijderen: weg uit de lijst, de geschiedenis blijft');

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})().catch(function(e){ print('  ✗ de test liep vast: '+(e&&e.message)); print('\nRESULTAAT: '+(fouten+1)+' fout(en)'); });

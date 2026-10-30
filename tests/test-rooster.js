// De rooster en de persoonlijke ratings (js/rooster.js). Twee dingen kunnen hier stil
// misgaan, en allebei merk je het pas als iemand een score krijgt die niet van hem is:
//
//  1. HET LEZEN VAN DE PDF. De "Master Schedule" wordt rij per rij getekend: eerst de
//     naam, dan de shifts van die rij. Elke shift moet bij de juiste naam én de juiste
//     dag terechtkomen — ook als dezelfde dagen over twee pagina's lopen, en ook als een
//     reeks dagen over het einde van de maand gaat.
//  2. HET KOPPELEN. Een rating gaat naar iedereen die die dag rond dat uur op een passende
//     shift stond — niet naar wie dan in het restaurant stond of verlof had.
//
// We bouwen hier zelf een kleine rooster na, zoals pdf.js hem uit de PDF haalt: per pagina
// een lijst tekststukjes met hun plaats (x, y vanaf onderaan) en breedte, in tekenvolgorde.
// Verzonnen namen — echte roosters horen niet in deze map.
var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

var window=undefined;
load('./js/rooster.js');
var RO=globalThis.Rooster;

// ---- een pagina namaken ----
var KOL0=143, BREED=70;                                   // eerste dagkolom en kolombreedte
function cel(k){ return KOL0+k*BREED; }
function t(str,x,y){ return {str:str,x:x,y:y,w:str.length*3.5}; }
function pagina(dagen,rijen,metKop){
  // dagen: [['di',1],['wo',2],…]; rijen: [{naam, y, shifts:[[kolom, label, van, tot], …]}]
  var it=[];
  dagen.forEach(function(d,k){ it.push(t(d[0],cel(k)+BREED/2-3,472)); });
  dagen.forEach(function(d,k){ it.push(t(String(d[1]),cel(k)+BREED/2-2,455)); });
  rijen.forEach(function(r){
    it.push(t(r.naam,4,r.y));
    var perKol={};
    r.shifts.forEach(function(s){
      var n=perKol[s[0]]=(perKol[s[0]]||0)+1, y=r.y+12-(n-1)*20;
      it.push(t(s[1],cel(s[0])+8,y));
      it.push(t(s[2],cel(s[0])+12,y-8)); it.push(t(' - ',cel(s[0])+30,y-8)); it.push(t(s[3],cel(s[0])+36,y-8));
    });
  });
  if(metKop){                                              // de kop wordt bij dit programma als laatste getekend
    it.push(t('Master Schedule',160,560)); it.push(t('Period:',160,530)); it.push(t('1-9-2026 to 1-10-2026',335,530));
  }
  it.push(t('Master Schedule',400,12)); it.push(t('23-7-2026 16:25:27',4,12));   // voettekst
  return {items:it};
}

var blok1=[['di',1],['wo',2],['do',3]];
var blok2=[['ma',28],['di',29],['wo',30]];
var pag=[
  pagina(blok1,[
    {naam:'Peeters, An', y:400, shifts:[[0,'O&F Orry 15.00','15:00','18:00'],[0,'Rest. Avond','18:30','21:00'],[2,'FQN','19:00','22:00']]},
    {naam:'Janssens, Bram', y:340, shifts:[[0,'O&F Tech','15:00','18:00'],[1,'JV','09:00','12:00'],[1,'DJ - Pool Party','17:30','21:30']]},
    {naam:'Maes, Cato', y:280, shifts:[]}
  ],true),
  // dezelfde dagen, tweede reeks medewerkers
  pagina(blok1,[
    {naam:'Willems, Dirk', y:400, shifts:[[1,'O&F Rep Pool','14:45','19:30'],[2,'Prize Night - ENT 2','19:00','23:15']]}
  ],true),
  pagina(blok2,[
    {naam:'Peeters, An', y:400, shifts:[[2,'Overleg Halloween','14:15','17:00'],[2,'Silent Disco','20:00','22:00']]}
  ],true)
];

print('— De PDF lezen —');
var r=RO.uitItems(pag);
ok(r.periode.van==='2026-09-01' && r.periode.tot==='2026-10-01','periode uit "Period:"');
ok(r.dagen.join(',')==='2026-09-01,2026-09-02,2026-09-03,2026-09-28,2026-09-29,2026-09-30','dagen uit weekdag + dagnummer ('+r.dagen.join(',')+')');
ok(r.namen.join('|')==='An Peeters|Bram Janssens|Cato Maes|Dirk Willems','namen omgedraaid, iedereen één keer ('+r.namen.join('|')+')');
function vind(n,d,l){ return r.shifts.filter(function(s){ return s.n===n&&s.d===d&&s.l===l; })[0]; }
var s1=vind('An Peeters','2026-09-01','O&F Orry 15.00');
ok(s1 && s1.v==='15:00' && s1.t==='18:00','shift met label en uren');
ok(!!vind('An Peeters','2026-09-01','Rest. Avond'),'tweede shift in dezelfde cel');
ok(!!vind('An Peeters','2026-09-03','FQN'),'shift in de derde kolom → 3 september');
ok(!!vind('Bram Janssens','2026-09-01','O&F Tech'),'shift bij de juiste naam (volgende rij)');
ok(!!vind('Dirk Willems','2026-09-03','Prize Night - ENT 2') && !!vind('Dirk Willems','2026-09-02','O&F Rep Pool'),'tweede pagina met dezelfde dagen');
ok(!!vind('Bram Janssens','2026-09-02','DJ - Pool Party'),'tweede shift op dezelfde dag, na verlof');
ok(!!vind('An Peeters','2026-09-30','Silent Disco'),'einde van de maand');
ok(!r.shifts.some(function(s){ return /Master|Period|16:25/.test(s.l); }),'kop en voettekst worden geen shift');

var op=RO.alleenOptredens(r);
ok(!op.shifts.some(function(s){ return s.l==='JV'||s.l==='Rest. Avond'||s.l==='Overleg Halloween'; }),'verlof, restaurant en overleg worden niet bewaard');
ok(op.shifts.length===7,'zeven shifts met een activiteit ('+op.shifts.length+')');

print('— Ratings koppelen —');
var basis=RO.voegSamen(null,op);
function dag(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
function canon(a){ return /orry.*show/i.test(a)?'O&F: Show':(/pool/i.test(a)?'O&F: Pool Party':(/taxi/i.test(a)?'O&F: op taxibezoek':a)); }
var show={score:5,activiteit:'Orry & Vrienden: Show',datum:dag('2026-09-01'),uur:'15:00'};
var showLaat={score:4,activiteit:'Orry & Vrienden: Show',datum:dag('2026-09-01'),uur:'14:00'};
var pool={score:3,activiteit:'Pool party',datum:dag('2026-09-02'),uur:'15:00'};
var poolAvond={score:4,activiteit:'Pool party',datum:dag('2026-09-02'),uur:'18:00'};
var taxi={score:5,activiteit:'Orry & Vrienden: Taxi ritje!',datum:dag('2026-09-02'),uur:'16:30'};
var taxiLaat={score:5,activiteit:'Orry & Freunde: eine Taxifahrt!',datum:dag('2026-09-02'),uur:'18:00'};
var quiz={score:5,activiteit:'Family Quiz Night',datum:dag('2026-09-03'),uur:'19:00'};
var prize={score:2,activiteit:'Prize Night',datum:dag('2026-09-03'),uur:'19:00'};
var buiten={score:5,activiteit:'Family Quiz Night',datum:dag('2026-10-08'),uur:'19:00'};
var k=RO.koppel([show,showLaat,pool,poolAvond,taxi,taxiLaat,quiz,prize,buiten],basis,canon);
function wie(rv){ return Object.keys(k.perPersoon).filter(function(n){ return k.perPersoon[n].indexOf(rv)>=0; }).sort().join(','); }
ok(wie(show)==='An Peeters,Bram Janssens','show van 15u00 → Orry én de technieker ('+wie(show)+')');
ok(wie(pool)==='Dirk Willems','pool party van 15u00 → wie op de pool-shift staat ('+wie(pool)+')');
ok(wie(poolAvond)==='Bram Janssens,Dirk Willems','pool party van 18u00 → ook de DJ ('+wie(poolAvond)+')');
ok(wie(taxi)==='Dirk Willems','taxirit tijdens een pool-shift → het personage ('+wie(taxi)+')');
ok(wie(taxiLaat)==='Dirk Willems','taxirit → nooit de DJ ('+wie(taxiLaat)+')');
ok(wie(quiz)==='An Peeters','quiz → wie op FQN staat');
ok(wie(prize)==='Dirk Willems','Prize Night → ENT 2');
ok(k.niet.indexOf(showLaat)>=0,'show om 14u00 valt buiten elke shift → niet gekoppeld');
ok(k.buiten===1,'rating op een dag zonder rooster telt als buiten');

print('— Uren —');
ok(RO.minuten('15:00')===900 && RO.minuten('15.30')===930 && RO.minuten('9u05')===545,'uren lezen');
ok(RO.minuten(0.625)===900,'Excel-tijd (0,625 = 15:00)');
var nacht={score:5,activiteit:'Silent Disco',datum:dag('2026-09-30'),uur:'21:30'};
var kn=RO.koppel([nacht],basis,canon);
ok(kn.perPersoon['An Peeters'] && kn.perPersoon['An Peeters'].length===1,'silent disco van 21u30 → An');

print('— Samenvoegen en weghalen —');
var oktPag=pagina([['do',1],['vr',2]],[{naam:'Maes, Cato',y:400,shifts:[[0,'FQN','19:00','22:00']]}],false);
oktPag.items.push(t('Period:',160,530),t('1-10-2026 to 1-11-2026',335,530));
var okt=RO.alleenOptredens(RO.uitItems([oktPag]));
ok(okt.dagen.join(',')==='2026-10-01,2026-10-02','oktober: 1 en 2 oktober (weekdag klopt)');
var twee=RO.voegSamen(basis,okt);
ok(twee.uploads.length===2 && twee.dagen.length===8,'twee maanden naast elkaar');
var opnieuw=RO.voegSamen(twee,op);
ok(opnieuw.uploads.length===2 && opnieuw.shifts.length===twee.shifts.length,'september opnieuw uploaden vervangt, verdubbelt niet');
var zonderSep=RO.verwijderUpload(opnieuw,opnieuw.uploads.findIndex(function(u){ return u.van==='2026-09-01'; }));
ok(zonderSep.dagen.join(',')==='2026-10-01,2026-10-02' && zonderSep.namen.join('|')==='Cato Maes','september weghalen laat oktober staan');

print('— Je eigen naam op de rooster —');
// Een gewone medewerker ziet enkel zichzelf: de naam van zijn account moet op de rooster
// gevonden worden, en nooit per ongeluk iemand anders.
var namen=['An Peeters','Bram Janssens','Christel Van vleymen','Zoë De Smet','An Maes'];
ok(RO.zoekNaam('An Peeters',namen)==='An Peeters','zelfde schrijfwijze');
ok(RO.zoekNaam('peeters an',namen)==='An Peeters','andere volgorde en kleine letters');
ok(RO.zoekNaam('Peeters, An',namen)==='An Peeters','zoals op de rooster ("Peeters, An")');
ok(RO.zoekNaam('Christel Van Vleymen',namen)==='Christel Van vleymen','hoofdletter in "Van Vleymen"');
ok(RO.zoekNaam('Zoe De Smet',namen)==='Zoë De Smet','zonder accent');
ok(RO.zoekNaam('An',namen)===null,'enkel een voornaam is niet genoeg (twee keer "An" op de rooster)');
ok(RO.zoekNaam('Bram',namen)===null,'ook niet als die voornaam maar één keer voorkomt');
ok(RO.zoekNaam('An Peeters-Maes',namen)===null,'een andere naam geeft niemand');
ok(RO.zoekNaam('',namen)===null,'geen naam geeft niemand');

print(fouten?('RESULTAAT: '+fouten+' fout(en)'):'RESULTAAT: alles in orde');

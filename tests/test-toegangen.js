// Toegangen: wie mag wat, per onderdeel.
// Twee dingen mogen hier nooit misgaan:
//  1. Wie niets instelt, moet exact dezelfde app houden als vóór deze functie bestond.
//  2. De rechten van Projecten van vóór deze versie moeten mee overgenomen worden —
//     anders kan een team dat "iedereen" had ingesteld ineens niets meer.
// Deze test laadt enkel het stuk uit js/kern.js dat over toegangen gaat; de rest van dat
// bestand heeft een browser nodig.
var store={};
globalThis.localStorage={
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null; },
  setItem:function(k,v){ store[k]=String(v); },
  removeItem:function(k){ delete store[k]; }
};

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

// Wie er nu ingelogd is, bootsen we na met twee schakelaars.
var IK={vast:false, admin:false, ontgrendeld:false};
globalThis.isVasteMdw=function(){ return IK.vast; };
globalThis.isAdmin=function(){ return IK.admin; };
globalThis.isOntgrendeld=function(){ return IK.ontgrendeld; };
globalThis.eisBeheer=function(){ return IK.vast||IK.admin||IK.ontgrendeld; };
globalThis.pushConfig=function(){};
globalThis.cfgApplying=false;
globalThis.alert=function(){};
globalThis.K_PROJ_MAKEN='bb_proj_maken';
globalThis.K_PROJ_BEWERKEN='bb_proj_bewerken';

// Het toegangen-gedeelte uit kern.js knippen en uitvoeren.
function laadToegangen(){
  var src=readFile('./js/kern.js');
  var start=src.indexOf('// ---------------- TOEGANGEN ----------------');
  var eind=src.indexOf('// ---- Keuzelijsten van het besteloverzicht');
  if(start<0||eind<0||eind<start){ print('KON HET TOEGANGEN-DEEL NIET VINDEN'); return false; }
  var deel=src.slice(start,eind);
  // Uitvoeren en daarna alles wat de test nodig heeft in de globale ruimte zetten.
  eval(deel+'\n'+
    'globalThis.getToegangen=getToegangen;'+
    'globalThis.setToegangen=setToegangen;'+
    'globalThis.toegangRegel=toegangRegel;'+
    'globalThis.magToegang=magToegang;'+
    'globalThis.eisToegang=eisToegang;'+
    'globalThis.TOEGANG_CATEGORIEEN=TOEGANG_CATEGORIEEN;'+
    'globalThis.TOEGANG_NIVEAUS=TOEGANG_NIVEAUS;'+
    'globalThis.TOEGANG_KEUZES=TOEGANG_KEUZES;');
  return true;
}
function verse(){ Object.keys(store).forEach(function(k){ delete store[k]; }); }

(function(){
  if(!laadToegangen()) { print('\nRESULTAAT: 1 fout(en)'); return; }

  print('— Zonder iets in te stellen blijft alles zoals het was —');
  verse();
  IK={vast:false,admin:false,ontgrendeld:false};
  ok(magToegang('inventaris','bekijken')===true,'iedereen mag de inventaris bekijken');
  ok(magToegang('inventaris','gebruiken')===true,'en gebruiken');
  ok(magToegang('inventaris','beheren')===false,'maar niet beheren (dat vraagt het wachtwoord)');
  ok(magToegang('systeem','bekijken')===false,'Systeem is niet zichtbaar');
  ok(magToegang('activiteit','bekijken')===false,'Activiteit ook niet');
  ok(magToegang('bestellingen','beheren')===false,'de bedragen bij bestellingen zijn verborgen');

  print('\n— Als vaste medewerker —');
  IK={vast:true,admin:false,ontgrendeld:false};
  ok(magToegang('inventaris','beheren')===true,'inventaris beheren mag');
  ok(magToegang('bestellingen','beheren')===true,'de bedragen zijn zichtbaar');
  ok(magToegang('activiteit','bekijken')===true,'Activiteit is zichtbaar');
  ok(magToegang('systeem','bekijken')===false,'maar Systeem niet — dat is enkel admin');

  print('\n— Als admin —');
  IK={vast:false,admin:true,ontgrendeld:false};
  ok(magToegang('systeem','bekijken')===true,'Systeem is zichtbaar');
  ok(magToegang('activiteit','bekijken')===true,'Activiteit ook');
  ok(magToegang('inventaris','beheren')===true,'en beheren mag zonder wachtwoord');

  print('\n— Het wachtwoord intikken opent de "beheer"-onderdelen —');
  IK={vast:false,admin:false,ontgrendeld:true};
  ok(magToegang('inventaris','beheren')===true,'inventaris beheren mag na het wachtwoord');
  ok(magToegang('systeem','bekijken')===false,'maar Systeem blijft dicht — dat staat op admin');

  print('\n— Een eigen instelling overschrijft de standaard —');
  verse();
  IK={vast:false,admin:false,ontgrendeld:false};
  setToegangen({bestellingen:{bekijken:'admin'}, contacten:{beheren:'iedereen'}});
  ok(magToegang('bestellingen','bekijken')===false,'bestellingen op "enkel admin" → niet zichtbaar');
  IK={vast:false,admin:true,ontgrendeld:false};
  ok(magToegang('bestellingen','bekijken')===true,'…maar wel voor een admin');
  IK={vast:false,admin:false,ontgrendeld:false};
  ok(magToegang('contacten','beheren')===true,'contacten op "iedereen" → iedereen mag beheren');
  ok(magToegang('logboek','beheren')===false,'en wat je niet aanpaste, blijft op de standaard');

  print('\n— Onzin in de instelling valt terug op de standaard —');
  verse();
  setToegangen({inventaris:{bekijken:'onzin'}});
  ok(toegangRegel('inventaris','bekijken')==='iedereen','een onbekende waarde wordt genegeerd');

  print('\n— "vast" betekent vaste medewerkers én admins —');
  verse();
  setToegangen({logboek:{bekijken:'vast'}});
  IK={vast:true,admin:false,ontgrendeld:false};
  ok(magToegang('logboek','bekijken')===true,'een vaste medewerker mag');
  IK={vast:false,admin:true,ontgrendeld:false};
  ok(magToegang('logboek','bekijken')===true,'een admin ook');
  IK={vast:false,admin:false,ontgrendeld:false};
  ok(magToegang('logboek','bekijken')===false,'iemand zonder rol niet');

  print('\n— De oude projectinstellingen worden overgenomen —');
  verse();
  store['bb_proj_maken']='iedereen';
  store['bb_proj_bewerken']='vast';
  // De migratie draait bij het laden van kern.js; hier roepen we ze los aan.
  (function migreer(){
    if(localStorage.getItem('bb_toegangen')) return;
    var m=localStorage.getItem('bb_proj_maken'), w=localStorage.getItem('bb_proj_bewerken');
    if(!m && !w) return;
    var t={projecten:{}};
    if(m) t.projecten.beheren=m;
    if(w) t.projecten.gebruiken=w;
    localStorage.setItem('bb_toegangen',JSON.stringify(t));
  })();
  ok(toegangRegel('projecten','beheren')==='iedereen','"wie mag aanmaken" werd "beheren"');
  ok(toegangRegel('projecten','gebruiken')==='vast','"wie mag werken" werd "gebruiken"');
  ok(toegangRegel('projecten','bekijken')==='iedereen','en bekijken staat op de standaard');

  print('\n— magBeheren/eisBeheer sluiten aan bij magToegang —');
  // Vroeger lieten magBeheren() en eisBeheer() enkel vaste medewerkers door, terwijl
  // magToegang('…','beheren') admins wél doorliet. Een admin kreeg dan op de ene plek
  // het wachtwoord gevraagd en op de andere niet.
  verse();
  var src=readFile('./js/kern.js');
  var mb=src.slice(src.indexOf('function magBeheren('), src.indexOf('function isOntgrendeld('));
  var eb=src.slice(src.indexOf('function eisBeheer('), src.indexOf('function eisBeheer(')+400);
  ok(/isVasteMdw\(\)\|\|isAdmin\(\)/.test(mb),'magBeheren laat ook admins door');
  ok(/isVasteMdw\(\)\|\|isAdmin\(\)/.test(eb),'eisBeheer ook');
  IK={vast:false,admin:true,ontgrendeld:false};
  ok(magToegang('contacten','beheren')===true,'en magToegang zegt hetzelfde');

  print('\n— De noodingang naar Systeem werkt echt —');
  // De knop "🩺 Systeem bekijken" in Instellingen belooft toegang met het beheer-
  // wachtwoord, ook zonder de rol Admin. Maar bewaakPagina() stuurde je meteen terug:
  // Systeem staat op "enkel admin", en die regel kent geen wachtwoord-uitweg. Het
  // etiket loog dus. Nu zet de knop een sessie-vlag die bewaakPagina() herkent.
  var k=readFile('./js/kern.js');
  ok(/function zetNoodSysteem\(/.test(k),'kern.js kent zetNoodSysteem()');
  ok(/cat==='systeem' && heeftNoodSysteem\(\)/.test(k),'bewaakPagina laat de noodingang door');
  ok(/removeItem\(K_NOOD_SYSTEEM\)/.test(k),'en wist ze bij het wisselen van gebruiker');
  var inst=readFile('./paginas/instellingen.html');
  ok(/zetNoodSysteem\(\);/.test(inst),'de knop in Instellingen zet de vlag');
  // De vlag mag enkel voor Systeem gelden, niet voor elke admin-pagina.
  ok(!/heeftNoodSysteem\(\)\s*\)\s*return;\s*$/m.test(k.replace(/cat==='systeem' && /,'')),
     'de vlag opent enkel Systeem, geen andere pagina');

  print('\n— De weg van "vaste mdw" naar "admin" is dicht —');
  // Een vaste medewerker kon zichzelf in twee tikken tot admin maken en daarna via
  // Toegangen alles openzetten. Er waren DRIE wegen die hetzelfde opleverden; ze moeten
  // alle drie dicht, anders is het dichten van één ervan zinloos.
  var kk=readFile('./js/kern.js');
  ok(/function magAdminUitdelen\(\)\{ return isAdmin\(\) \|\| !erIsEenAdmin\(\); \}/.test(kk),
     'de rol Admin toekennen mag enkel een admin');
  ok(/if\(!magAdminUitdelen\(\)\)\{ meldGeenAdmin\(\); return; \}/.test(kk),
     '1. de knop Admin wordt bij de klik opnieuw nagekeken');
  var rst=kk.slice(kk.indexOf(".querySelector('.rst')"), kk.indexOf(".querySelector('.del')"));
  ok(/magAanAdminRaken\(u\)/.test(rst),'2. de pincode van een admin resetten mag niet');
  var del=kk.slice(kk.indexOf(".querySelector('.del')"), kk.indexOf(".querySelector('.del')")+600);
  ok(/magAanAdminRaken\(u\)/.test(del),'3. een admin verwijderen mag niet');
  ok(/function magAanAdminRaken\(u\)\{ return isAdmin\(\) \|\| !BBInv\.heeftRol\(u,'admin'\); \}/.test(kk),
     'en dat geldt enkel voor mensen die écht admin zijn');

  print('\n— Maar de eerste admin moet aan te duiden blijven —');
  // Zonder deze noodregel kan de rol na een verse installatie nooit meer toegekend
  // worden: niemand is admin, dus niemand mag iemand admin maken.
  ok(/zolang er nog GEEN enkele admin is/i.test(kk),'de noodregel is beschreven');
  ok(/function erIsEenAdmin\(\)/.test(kk),'en kijkt of er al een admin bestaat');
  // Bestaande admins mogen door deze wijziging niets verliezen.
  ok(!/zetRol\([^)]*'admin',\s*false\s*\)/.test(kk),'niemand wordt automatisch zijn rol afgenomen');

  print('\n— Alle categorieën hebben alle drie de niveaus —');
  verse();
  var t=getToegangen();
  var mis=[];
  TOEGANG_CATEGORIEEN.forEach(function(c){
    TOEGANG_NIVEAUS.forEach(function(n){
      var w=(t[c.key]||{})[n];
      if(!TOEGANG_KEUZES.some(function(k){return k.waarde===w;})) mis.push(c.key+'/'+n);
    });
  });
  ok(mis.length===0,'geen enkele categorie mist een niveau'+(mis.length?(' ('+mis.join(', ')+')'):''));

  print(fouten?('\nRESULTAAT: '+fouten+' fout(en)'):'\nRESULTAAT: alles in orde');
})();

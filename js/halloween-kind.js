// =====================================================================
//  HALLOWEEN · KINDERTOCHT "Halloween op de zeven zeeën" — de inhoud.
//
//  Overgenomen uit de Drive-documenten "Manual kindertocht - 2026" en "Draaiboek kindertocht",
//  stand 12/10/2026. De planning per avond en de gesproken teksten staan in
//  js/halloween-kind-bron.js (gegenereerd). Tekenen doet js/halloween.js.
//  Aangevuld met de werkpunten na de eerste avond (mail van het Halloween team, 17/10/2026):
//  start op het platform van Janneke, kinderen niet alleen, dieven van achteren, bord van de
//  schutter met de E-car, hulp voor de heks en een duidelijk einde van de tocht bij de heks.
// =====================================================================
(function(){
'use strict';
const F='../assets/halloween/';
const foto=(naam,tekst)=>({src:F+naam+'.jpg',tekst:tekst||''});
const OPDRACHT='Houd je opdracht kort en krachtig. Is iets te moeilijk, vereenvoudig het dan.';

const NACHTEN=window.HW_KIND_NACHTEN||{};
// Bij de afbouw staat de eigen post vooraan ("Dronkaard/CZC mdw 1"): die bepaalt bij welke post de taak hoort.
Object.values(NACHTEN).forEach(n=>{ (n.afbouw||[]).forEach(r=>{ r.rol=String(r.karakter||'').split('/')[0].trim(); }); });

// ---------------------------------------------------------------- wissels voor één avond
// Zieken en last-minute wissels, bovenop het Drive-draaiboek. Ze verschijnen als melding bovenaan
// die avond (Start, Planning, Ombouw). Haal ze weg zodra het draaiboek in de Drive zelf is bijgewerkt.
//   rollen: karakter in het draaiboek → nieuwe naam · ombouw: oude naam → vervanging · orry: wie de show speelt
const TE_BEPALEN='Nog te bepalen';
const WISSELS={
  '17/10':{
    melding:['Laura is ziek. Nick neemt dief 2 over (16u50 – 19u00, fiets zonder laadbak) en Matthew speelt Orry in de show.',
             'De kapitein tijdens de tocht (16u40 – 18u30) is daardoor nog te bepalen. Volgens het draaiboek doet Nick wel nog de opbouw van de kapitein en dief 1 (15u10 – 15u50).',
             'De ombouwtaken van Laura, en de ombouw die Nick als kapitein vanaf 18u30 zou doen, zijn nog te bepalen. Nick is dief 2 tot 19u00.'],
    rollen:{'Dief 2':'Nick','Kapitein':TE_BEPALEN+' (Nick is dief 2)'},
    ombouw:{'Laura':TE_BEPALEN+' (Laura is ziek)','Nick':TE_BEPALEN+' (Nick is dief 2)'},
    orry:'Matthew (voor Laura)',
    showNota:'17/10: Laura is ziek. Matthew speelt Orry in de show, Nick is dief 2.'}
};
Object.keys(WISSELS).forEach(d=>{
  const n=NACHTEN[d], w=WISSELS[d]; if(!n) return;
  n.wijziging=w.melding; if(w.showNota) n.showNota=w.showNota; if(w.orry) n.orry=w.orry;
  (n.draaiboek||[]).forEach(r=>{ if(w.rollen&&w.rollen[r.karakter]) r.naam=w.rollen[r.karakter]; });
  (n.afbouw||[]).forEach(r=>{ if(w.ombouw&&r.namen) r.namen=r.namen.map(x=>w.ombouw[x]||x); });
});

// Wie een fiets ophaalt (en dus mag inklokken bij de check-in) — volgens de laatste briefing van Marith.
const FIETS={'Schutter':'met laadbak','Kok':'met laadbak','Dronkaard':'met laadbak','Dief 1':'met laadbak','Dief 2':'zonder laadbak','Heks':'zonder laadbak'};
const SC=window.HW_KIND_SCRIPTS=window.HW_KIND_SCRIPTS||{};
SC['kapitein-samen']={nl:['Blijf altijd samen! Volg de lampjes!'],de:['Bleibt immer zusammen! Folge den Lichtern!'],fr:['Restez ensemble! Suivez les lumières!'],en:['Stay together! Follow the lights!']};
// Kinderen begrepen niet altijd dat de heks het einde van de tocht is (feedback 17/10): deze slotzin maakt het duidelijk.
SC['heks-einde']={
  nl:['Het kompas is terug, dankzij jullie! Hier eindigt de tocht. Goed gedaan, dappere piraten, en een fijne Halloween!'],
  de:['Der Kompass ist zurück, dank euch! Hier endet die Tour. Gut gemacht, tapfere Piraten, und ein schönes Halloween!'],
  fr:['La boussole est de retour, grâce à vous ! La balade se termine ici. Bravo, courageux pirates, et joyeux Halloween !'],
  en:['The compass is back, thanks to you! This is where the trail ends. Well done, brave pirates, and happy Halloween!']};

const VOORBEREIDEN=[
  ['Draaiboek','Per dag een gestructureerd schema: de tijdsplanning, welke rol je die dag hebt en wat je taak is voor, tijdens en na de tocht. Vooral handig op de dag zelf (zie Planning). De draaiboeken liggen in de kleedkamer en worden ook gedeeld in de WhatsAppgroepen.'],
  ['Manual','Een uitgebreide uitleg van de hele tocht. Belangrijk: bekijk de pagina’s met praktische informatie en die van je eigen rol, en studeer de teksten in de 4 talen in. De rest van de manual mag je lezen, maar is geen must.'],
  ['Vragen?','Lees je draaiboek goed na en stel je vragen zoveel mogelijk vóór je dienst begint: meld ze zo snel mogelijk aan Marith en niet pas op de dag zelf.']];
const K={ ontvangst:'#8a5cc7', kapitein:'#4a63c0', dronkaard:'#d98a2b', schutter:'#e2683f', kok:'#4a9b5e', heks:'#8a3a8c', dief:'#2f6b70' };

const route=(n,t)=>foto('kind-route-'+n,t);
const kledij=(items)=>({t:'Kledij',items});
const makeup=(items)=>({t:'Make-up',items});
const trekjes=(l)=>({t:'Typische trekjes',l});
const uitspraken=(l)=>({t:'Typische uitspraken',l});

const ZONES=[
  {
    id:'ontvangst',naam:'Ontvangst',kleur:K.ontvangst,rollen:['Ontvangst'],kort:'Pirates Place · platform van Janneke',
    plattegrond:foto('kind-plattegrond','Plattegrond van het park met de route'),
    watTitel:'Wat gebeurt hier',
    wat:['De kindertocht start op Pirate Place, beneden op het platform van Janneke. Daar worden de gasten ontvangen: hun armbandje wordt gescand en ze krijgen tijd om hun lampion te versieren. Op de juiste tijdstippen komt kapitein Pablo de groep ophalen.',
         'De activiteit kost €3. Elk kind krijgt bij inschrijving een lampion met lampje. Belangrijk: als je de inschrijving afvinkt in de PDA, geef je automatisch de lampion mee.'],
    aandacht:['LET OP: op Pirate Place is enkel het tijdslot aanwezig dat vertrekt. Andere groepen wachten even (verwijs ze naar het marktje en de andere activiteiten tot hun tijdslot aan de beurt is), zodat het overzichtelijk blijft en de groepen niet te groot worden.',
              'Laat kinderen niet alleen vertrekken. Komen er toch kinderen alleen, scan dan hun bandjes en neem contact op met de ouders. Je kan hiervoor ook altijd de receptie bellen.',
              'Gasten kunnen nog aansluiten als er nog plek is. Ze betalen dan bij jou met de terminal.',
              'Bij het tijdslot van de eerste groep is de Halloween Show nog bezig op de Pirates Place. Die gasten kunnen hun lantaarn daar nog niet versieren: probeer ze er rondom te plaatsen en geef ze stiften of kleurtjes mee. Zodra de show afgelopen is, verplaatsen we de knutselhoek naar de Pirates Place.',
              'Niet alle lampionnen hebben al batterijen: vul ze als je niets te doen hebt, zo hebben we telkens een voorraad voor de tocht nadien. Houd ze apart van de lampionnen die al batterijen hebben. Wie op reserve staat, kan helpen op Pirate Place; de Kidsclub springt bij waar nodig.',
              'Stop de stokjes na gebruik terug in de plastic verpakking, om knopen en schade te voorkomen.'],
    extra:[{titel:'Bij regenalternatief',p:['Als het regent, ben jij diegene die de kids op weg moet zetten: kapitein Pablo komt de groep dan niet ophalen. Zie de tekst onder Rollen & scripts.']}],
    personages:[
      {naam:'Ontvangst gasten',sub:'Scanner · lampionnen',wieTitel:'Wie ben je en wat doe je',
       wie:['Jij ontvangt de gasten op Pirate Place, beneden op het platform van Janneke, scant de bandjes (PDA) en geeft elk kind een lampionpakketje om te versieren. Je bent redelijk neutraal gekleed en vriendelijk.'],
       kleding:[kledij(['Redelijk neutraal: kies een kostuum van het rek waar je je goed bij voelt']),makeup(['Mag Halloween-gerelateerd zijn, maar niet TE eng']),
                {t:'Attributen',items:['PDA','Betaalterminal','120-tal lampionpakketjes (lampion en lampje met batterijen)','3 tafels met materiaal om de lampionnen te versieren']}],
       scripts:[{t:'Intro (bij de ontvangst)',key:'ontvangst'},{t:'Bij regenalternatief',key:'ontvangst-regen'}]}
    ],
    materiaal:[{groep:'Backoffice',items:['PDA / computertje','Betaalterminal']},{groep:'Lampionnen',items:['Doos met lampionpakketjes (120 per dag)','3 tafels met materiaal om de lampionnen te versieren','Stiften en ander materiaal','Plastic verpakking voor de stokjes (na gebruik terugsteken)']}],
    opbouw:[{t:'Zet de benodigdheden klaar op Pirate Place, beneden op het platform van Janneke: PDA/computertje, betaalterminal en de doos met lampionpakketjes (120 per dag).',fotos:[foto('kind-plattegrond','Plattegrond van het park: de Pirates Place ligt in de Discovery Bay, bij de start van de route')]},
            'Na de show snel: de tafels met stiften en ander materiaal om lampionnen te versieren op de Pirates Place zetten (de knutselhoek verhuist dan van onder het schip).',
            'Ontvangst vertrekt om 16u15 naar de Pirates Place: om 16u25 start het eerste tijdslot.'],
    fotos:[foto('kind-plattegrond','Plattegrond van het park met de route')]
  },
  {
    id:'kapitein',naam:'Kapitein Pablo',kleur:K.kapitein,rollen:['Kapitein','Dief 1 en kapitein'],kort:'Start · nooduitgang achter de hut',
    plattegrond:foto('kind-route-kaart','De route op de kaart'),
    wat:['Kapitein Pablo heeft jaren geleden een magisch kompas gekocht bij de heks. Dat is zopas gestolen door een dief! Maar omdat het een magisch kompas is, is de dief nu vervloekt. Pablo wil zijn kompas terug, maar hij lag te slapen en heeft niet gezien wie het deed. Een aantal piraten heeft wel iets gezien, maar wil het niet aan Pablo vertellen. Daarom heeft hij de kinderen nodig en stuurt hij ze op pad.',
         'Hij waarschuwt hen voor de dief: komen ze die tegen, dan worden ze misschien zelf vervloekt. Door de vloek kan de dief niets meer zien, enkel horen: als de dief komt, moeten ze muisstil blijven staan. Pablo geeft elk kind een kaartje met gezichtskenmerken; hij weet enkel niet welke de juiste zijn.'],
    aandacht:['De kapitein zorgt dat er op elk tijdslot een groep wordt meegenomen van Pirate Place (beneden op het platform van Janneke) naar de nooddeur: 16u40 (groep 1), 16u55, 17u10, 17u25, 17u40, 17u55, 18u10 en 18u25 (groep 8).',
              'Haal de groep steeds 5 minuten vóór het vertrekuur op bij Pirate Place (voor groep 1 dus om 16u35): tot iedereen mee is en jij je uitleg hebt gedaan, zitten we dan mooi op schema.',
              'Aan de nooddeur doet de kapitein de uitleg, deelt het materiaal uit en stuurt de groep naar links (richting hotel).',
              'Elke groep bestaat uit maximum 10–15 kinderen tussen 2 en 12, begeleiders niet meegerekend. Is er iemand te laat, laat hem dan liefst met de volgende groep meelopen.',
              'Laat geen kinderen zonder begeleider vertrekken. Komen er toch kinderen alleen, dan scant de ontvangst hun bandjes en neemt contact op met de ouders (of belt de receptie).'],
    extra:[{titel:'Route vanaf de start',p:['De gasten worden in groep naar buiten gestuurd via de nooddeur achter de hut. Ze gaan naar links richting de splitsing en daar naar rechts, langs het hotel af.'],fotos:[route(1,'Route 1/4: stap 1 en 2 (nooduitgang, links, splitsing bij het hotel rechts) en stap 3 (Nature Lodge)')]}],
    personages:[
      {naam:'Kapitein Pablo',sub:'Start van de tocht',wieTitel:'Het verhaal',
       wie:['Je haalt de groep op bij Pirate Place (beneden op het platform van Janneke), geeft de uitleg aan de nooddeur en deelt aan elk kind een bingokaartje en een potloodje uit. Je stuurt de groep naar links.'],
       kleding:[kledij(['Kledij van Pablo: paarse gestreepte broek, paarse blouse, piratenlaarzen, kapiteinshoed, riem','Paarse accessoires','Eventueel een geweer of zwaard']),makeup(['Donkere ogen','Littekens','Eventueel baard of snor']),
                {t:'Attributen',items:['Bingokaartjes (voor elk kind 1) — 120-tal','Potloodjes (voor elk kind 1) — 120-tal']}],
       fotos:[foto('kind-pablo','Voorbeeld van de make-up van de kapitein')],
       scripts:[{t:'Intro (aan de nooddeur)',key:'kapitein'},{t:'Laatste zin voor de groep vertrekt',key:'kapitein-samen'},{t:'Bij regenalternatief',key:'kapitein-regen'}],
       tip:'Bij regen loopt Pablo vrij rond in de Bay. Hij is vriendelijk tegen iedereen en roept regelmatig erg luid “Ahoy!”.'}
    ],
    materiaal:[{groep:'Voor de start',items:['Bingokaartjes (120)','Potloodjes (120)','Kaartjes met kenmerken (120 per tocht)']},{groep:'Algemeen',items:['EHBO-kit','3 lantaarns','Muziekboxen (neem je pas mee bij aanvang tocht)']}],
    opbouw:[{t:'Benodigdheden klaarleggen: bingokaarten (120) en potloden (120) bij de nooduitgang van de Bay.',fotos:[route(1,'Route 1/4: de nooduitgang achter de hut en de weg naar links')]},
            'Techniek van de show klaarleggen in de hut (de techniek van de show gebeurt normaal door Bay-medewerkers).',
            'Show opruimen om 16u30–16u40 (dief 1 en kapitein): van de Pirates Place naar onder het schip.',
            'Om 16u35 gaat iedereen naar zijn post; om 16u40 vertrekt de eerste tocht.'],
    fotos:[foto('kind-pablo','Voorbeeld van de make-up van de kapitein'),foto('kind-route-1','Route 1/4: nooduitgang, links, splitsing bij het hotel rechts'),foto('kind-route-kaart','De route op de kaart')]
  },
  {
    id:'dronkaard',naam:'Dronkaard',kleur:K.dronkaard,rollen:['Dronkaard'],kort:'Post 3 · Stop 3 (Nature Lodge)',
    plattegrond:foto('kind-plattegrond','Plattegrond van het park met de route'),
    wat:['Deze piraat heeft veel te veel rum gedronken, daardoor kan hij amper nog recht lopen. De kinderen moeten laten zien hoe een echte piraat over het schip loopt.'],
    aandacht:['Fiets met laadbak: klok in bij de check-in en haal hem op bij de fietsenstalling van de Housekeeping (achter de loods). Zet hem bij de nooddeur onder het schip, zodat je je spullen er makkelijk in kan zetten.','Dit is de eerste post waar de groepen passeren.',OPDRACHT,'Als de groep bij jou vertrekt, moet ze oversteken: houd zelf even de auto’s tegen zodat de groep dit veilig kan.','Let op: de fles is van glas.','Stempel bij regenalternatief steeds op de achterkant van het bingokaartje af.'],
    extra:[
      {titel:'Opdracht',p:['Het piratenparcours doorlopen terwijl ze een lepel vasthouden met daarop een knikker. De knikker mag niet vallen. Valt de knikker, laat ze dan eventueel opnieuw starten.']},
      {titel:'Locatie',p:['De dronkaard staat in het grasveldje links naast de Nature Lodge. Het parcours dat daar al ligt wordt gebruikt met wat extra attributen. De hoepels mag je tussendoor leggen: daar moeten ze dan volledig doorheen.']},
      {titel:'Route naar deze post',p:['Ter hoogte van de Nature Lodge (in het grasveldje rechts ervan) staat de dronkaard met een lantaarn. Hij geeft de eerste opdracht.'],fotos:[route(1,'Route 1/4: stap 3 (post dronkaard)')]},
      {titel:'Bij regenalternatief',p:['Je blijft zoals buiten, maar het parcours is met kratten en tonnen achter het kraaiennest in de Bay (klimmen over de tonnen en kratten). Stempel steeds op de achterkant af.']}
    ],
    personages:[
      {naam:'De Dronkaard',sub:'Wankelt en praat tegen bomen',wieTitel:'Karakter',
       wie:['Dit karakter heeft iets te veel rum gedronken; je hebt ook een fles vast (let op: glas). Daardoor denkt hij dat de grond beweegt, bomen praten en zijn schip voortdurend schommelt. Hij is nooit gemeen of eng: gewoon heel verward en ontzettend grappig.'],
       blokken:[trekjes(['Wankelt voortdurend','Verliest soms zijn evenwicht','Vergeet continu wat hij zei','Praat tegen objecten','Kijkt af en toe scheel','Probeert soms een ton, boom of paaltje te begroeten alsof het een persoon is']),
                uitspraken(['“Wacht eens... waren jullie er daarnet ook al?”','“Waarom draait de lucht?”','“Praatte die boom nu tegen mij?”','“Of ben ik dat?”'])],
       kleding:[kledij(['Zwarte piratenbroek','Wit piratenhemd','Piratenvest','Scheve hoed','Grote doodskopfles','Verschillende riemen en touwen die slordig hangen (kijk wat haalbaar is)','Ooglapje (in je kist met materiaal)']),makeup(['Rode wangetjes en neus','Donkere ogen','Eventueel wat gekke accenten'])],
       scripts:[{t:'Intro',key:'dronkaard'},{t:'Tip voor de kinderen (de bandana)',key:'dronkaard-tip'}]}
    ],
    materiaal:[{groep:'Parcours',items:['2 hoepels','15 lepels','15 knikkers']},{groep:'Sfeer',items:['Spinnenweb-deco (op een plek naar keuze)','Muziekbox','Doodshoofd-fles']}],
    opbouw:[{t:'Parcours neerleggen op het grasveldje links naast de Nature Lodge (Stop 3). Het parcours dat er al ligt wordt gebruikt met extra attributen.',fotos:[route(1,'Route 1/4: stap 3 (post dronkaard)')]},
            'Hoepels tussendoor leggen: de kinderen moeten er volledig doorheen.',
            'Spinnenweb-deco ophangen op een plek naar keuze.',
            'Benodigdheden van de heks klaarleggen in de fiets en op de mediva-tafel onder het schip (tafel met heksenketel met snoep en deco-spin, daarnaast de extra kist): die gaan later naar Stop 10 (vlindertuin).',
            'Muziekbox pas meenemen bij aanvang van de tocht.'],
    fotos:[foto('kind-route-1','Route 1/4: nooduitgang, splitsing en Nature Lodge')]
  },
  {
    id:'schutter',naam:'Schutter',kleur:K.schutter,rollen:['Schutter'],kort:'Post 5 · Stop 5 (cottage 236–237)',
    plattegrond:foto('kind-plattegrond','Plattegrond van het park met de route'),
    wat:['De Schutter staat bekend als de beste scherpschutter van alle piraten. Helaas is hij de laatste tijd zo zenuwachtig dat hij voortdurend staat te trillen. Hij heeft geprobeerd enkele blikken van zijn schietkraam omver te gooien, maar raakt zelf niets meer.'],
    aandacht:['Fiets met laadbak: klok in bij de check-in en haal hem op bij de fietsenstalling van de Housekeeping (achter de loods). Zet hem bij de nooddeur onder het schip, zodat je je spullen er makkelijk in kan zetten.','Het bord gaat niet mee met de fiets: dief 1 brengt en haalt het altijd met de E-car. Draag het met twee personen, om schade aan de haken te voorkomen.',OPDRACHT,'Stempel bij regenalternatief steeds op de achterkant af.'],
    extra:[
      {titel:'Opdracht',p:['Elk kind krijgt 3 ringen. Ze moeten proberen zoveel mogelijk ringen om de haken te krijgen. Laat ze telkens per 2 of 3 tegelijk gooien en maak zo rijtjes van 4 à 5 kinderen. Je mag kiezen of je de kinderen 1 ring per keer laat gooien of alle 3 na elkaar.']},
      {titel:'Locatie',p:['De Schutter staat op het verharde stukje tegenover cottage 236–237. Hier kan je de kinderen mooi op een rij zetten en het bord plaatsen. Het camouflagenet en de spinnenweb-deco mag je op een plek naar keuze hangen.']},
      {titel:'Route naar deze post',p:['Na het parcours van de dronkaard gaan ze op de splitsing naar rechts, richting het meer. Ongeveer in het midden van deze weg (ter hoogte van cottage 236–237, aan de rechterkant) staat de schutter.'],fotos:[route(2,'Route 2/4: stap 4 (splitsing rechts), stap 5 (post schutter), stap 6')]},
      {titel:'Bij regenalternatief',p:['Je staat op een plekje in het bamboebos. Stempel steeds op de achterkant af.']}
    ],
    personages:[
      {naam:'Jack(y), de Schutter',sub:'Zenuwachtig en trillend',wieTitel:'Karakter',
       wie:['Jack(y) was ooit een legendarische scherpschutter. Niemand kon beter mikken dan hij. Maar sinds zijn laatste zeereis is hij ontzettend zenuwachtig: zijn handen trillen voortdurend en daardoor mist hij zelfs doelen van dichtbij. Hij is eigenlijk heel vriendelijk, maar maakt zich constant zorgen.'],
       blokken:[trekjes(['Trillende handen','Praat erg snel','Schrikt van alles','Overdrijft zijn mislukte schoten','Probeert constant iets te richten terwijl zijn arm overdreven heen en weer beweegt']),
                uitspraken(['“Oei, oei, oei!”','“Dat ging bijna goed!”','“Ik had hem bijna geraakt!”','“Vroeger was ik écht goed hoor!”'])],
       kleding:[kledij(['Broek en blouse (Francesco)','Bandana','Riem met pistolen (in de mand met materiaal)','Ooglapje (in de mand met materiaal)']),makeup(['Donkere ogen','Littekens'])],
       scripts:[{t:'Intro',key:'schutter'},{t:'Tip voor de kinderen (de mond)',key:'schutter-tip'}]}
    ],
    materiaal:[{groep:'Spel',items:['2 dozen werpringen','Spelbord / bord met haken (dief 1 brengt en haalt het met de E-car)','Camouflagenet']},{groep:'Sfeer',items:['Spinnenweb-deco','Muziekbox']}],
    opbouw:[{t:'Benodigdheden klaarleggen en naar Stop 5 (cottage 236–237) rijden met de fiets. Het bord brengt dief 1 met de E-car; draag het met twee, zo beschadigen de haken niet.',fotos:[route(2,'Route 2/4: stap 5 (post schutter)')]},
            'Het bord met haken op het verharde stukje tegenover de cottage plaatsen, zo dat je de kinderen op een rij kan zetten.',
            'Camouflagenet en spinnenweb-deco ophangen op een plek naar keuze.',
            'Klaar met je eigen post? Help dan de kok (de schutter helpt de kok bij de opbouw).',
            'Muziekbox pas meenemen bij aanvang van de tocht.'],
    fotos:[foto('kind-route-2','Route 2/4: splitsing, post schutter en verder')]
  },
  {
    id:'kok',naam:'Kok',kleur:K.kok,rollen:['Kok'],kort:'Post 7 · Stop 7 (cottage 317–318)',
    plattegrond:foto('kind-plattegrond','Plattegrond van het park met de route'),
    wat:['De Kok wilde pompoensoep maken voor Halloween. Maar terwijl hij even weg was, hebben hongerige ratten zijn ajuinen overal verstopt om op te eten. Hij heeft hulp nodig om de ajuinen terug te vinden!'],
    aandacht:['Fiets met laadbak: klok in bij de check-in en haal hem op bij de fietsenstalling van de Housekeeping (achter de loods). Zet hem bij de nooddeur onder het schip, zodat je je spullen er makkelijk in kan zetten.','Rol het lint na gebruik netjes terug op, zo kunnen we het hergebruiken.',OPDRACHT,'Na de laatste groep help je de heks bij de afbouw van haar post.','Bij regenalternatief wordt de opdracht kleiner: minder ajuinen zoeken (bv. elk kind 3, 4 of 5 stuks).','Stempel bij regenalternatief steeds op de achterkant af.'],
    extra:[
      {titel:'Opdracht',p:['Ajuinen zoeken over een afgebakend terrein. Er liggen ook tennisballen verstopt: die heeft de kok natuurlijk niet nodig. De kinderen mogen alle ajuinen in een grote kookpot stoppen.']},
      {titel:'Locatie',p:['De kok staat ter hoogte van cottage 317–318. Hier is een veldje rechts van de weg waar je de groep kan verzamelen en de opdracht doen. De ajuinen verstop je best aan de overkant van de weg, daar is veel ruimte. Hang lint rond de 2 bomen waartussen je de ajuinen verstopt, zo is er een duidelijke grens. Welke bomen dit zijn, bepaal je zelf.']},
      {titel:'Route naar deze post',p:['Ze lopen de weg helemaal af tot ze achteraan het park uitkomen. Op de splitsing gaan ze naar rechts; op de rechterkant van de weg, ter hoogte van cottage 317–318, staat de kok.'],fotos:[route(3,'Route 3/4: stap 7 (post kok), stap 8 (grindpad), stap 9 (richting vlindertuin)')]},
      {titel:'Bij regenalternatief',p:['Je staat bij de glijbaanboom in de Bay en de opdracht wordt kleiner. Stempel steeds op de achterkant af.']}
    ],
    personages:[
      {naam:'Chef Alfons, de Kok',sub:'Scheepskok met ajuinen',wieTitel:'Karakter',
       wie:['Chef Alfons is de scheepskok. Hij is trots op zijn beroemde Halloween-pompoensoep, maar vergeet voortdurend waar hij zijn ingrediënten heeft gelegd. Hij is er heilig van overtuigd dat de scheepsratten hem telkens saboteren.'],
       blokken:[trekjes(['Ruikt aan alles','Roert voortdurend in zijn kookpot','Praat over eten','Klaagt over ratten','Laat af en toe een ajuin uit zijn zak vallen zonder dat hij het doorheeft']),
                uitspraken(['“Geen soep zonder ajuinen!”','“Die ratten weer!”','“Dat ruikt heerlijk!”','“Een kok zonder ajuinen is als een schip zonder kapitein!”'])],
       kleding:[kledij(['Witte koksmuts','Witte schort','Piratenbroek / koksbroek (wat jou past)','Ooglapje (in de ketel met materiaal)','Ajuinen in zijn zakken']),makeup(['Getekende rimpels','Wallen','Eventueel snor of baard'])],
       scripts:[{t:'Intro',key:'kok'},{t:'Tip voor de kinderen (de ogen)',key:'kok-tip'}]}
    ],
    materiaal:[{groep:'Spel',items:['60-tal ajuinen','10-tal tennisballen','1 kookpot','1 rol afbakenlint','1 roerlepel']},{groep:'Sfeer',items:['Spinnenweb-deco','Muziekbox']}],
    opbouw:[{t:'Ajuinen (60-tal) en tennisballen (10-tal) verspreiden in een afgebakend gebied van lint, aan de overkant van de weg ter hoogte van cottage 317–318 (Stop 7).',fotos:[route(3,'Route 3/4: stap 7 (post kok)')]},
            'Lint hangen rond 2 bomen waartussen je de ajuinen verstopt, zo is er een duidelijke grens.',
            'Kookpot, roerlepel en spinnenweb-deco klaarzetten op het veldje rechts van de weg.',
            'Na gebruik het lint netjes terug oprollen.',
            'Muziekbox pas meenemen bij aanvang van de tocht.',
            'Na de tocht: eigen post afbouwen en daarna de heks helpen met de afbouw van haar post.'],
    fotos:[foto('kind-route-3','Route 3/4: post kok, grindpad en vlindertuin')]
  },
  {
    id:'heks',naam:'Heks',kleur:K.heks,rollen:['Heks'],kort:'Post 10 · Stop 10 (vlindertuin)',
    plattegrond:foto('kind-plattegrond','Plattegrond van het park met de route'),
    wat:['De heks reconstrueert samen met de kinderen het gezicht van de dief, om te ontdekken wie de dief is. Ze heeft blanco gezichten met velcro en alle kenmerken van de bingokaartjes. Ze legt om de beurt kenmerken op de gezichten; het is aan de kinderen te zeggen wat wel of niet klopt.',
         'Is de identiteit gevormd, dan doet de heks een spreuk en tovert ze plots het kompas terug! Elk kind krijgt daarna nog een snoepje.'],
    aandacht:['Fiets zonder laadbak: klok in bij de check-in en haal hem op bij de fietsenstalling van de Housekeeping (achter de loods). Zet hem bij de nooddeur onder het schip.','De groene appelringen zijn glutenvrij: houd 1 zak apart. We hebben geen halal-snoep.','Bouw je post niet te vroeg op: we willen dit materiaal niet in het zicht van de gasten laten staan. Neem je kar en de kist met materiaal mee naar je post.','Je bouwt niet alleen op of af: Orry (dief 2) helpt bij het vervoer, de opbouw en de afbouw, en de kok helpt ook bij de afbouw. Is er niet op tijd hulp, meld het dan bij Marith.','De laatste tocht is rond 19u15 bij de heks. Is de groep voorbij je post, dan ruim je op (met Orry en de kok) en ga je terug naar de Discovery Bay.',
              'Einde van de tocht: de kinderen begrepen niet altijd dat de heks het einde is en wilden terug naar de Bay. Sluit daarom af met de slotzin “Hier eindigt de tocht” (bij Karakter & scripts), zodat duidelijk is dat de tocht bij jou stopt. Eventueel kan er een extra dief ingezet worden.',
              'Kompas van Pablo: controleer of het nog bij de heks ligt en breng het na gebruik steeds terug.'],
    extra:[
      {titel:'Locatie',p:['De heks staat helemaal op het einde van het parcours, op het verhoogde deel in de vlindertuin, bij haar heksentafel. Rondom haar staan led-kaarsjes: dat is ineens ook een duidelijke afbakening waar de gasten kunnen gaan staan. Je hebt de heksentafel met kookpot en nog heel wat leuke attributen: maak er zelf iets leuks van, op en rond de tafel.']},
      {titel:'Route naar deze post',p:['Direct nadat ze zijn overgestoken, staat de heks op een verhoogd stuk aan de linkerkant. Bij de heks stopt de tocht: zij maakt duidelijk dat het avontuur hier afgelopen is. Daarna kiezen de gasten zelf waar ze naartoe gaan (terug naar de Bay, naar hun cottage of elders).'],fotos:[route(4,'Route 4/4: stap 10 (post heks in de vlindertuin)')]},
      {titel:'Bij regenalternatief',p:['Je zit verstopt op een plek in de Bay. Als de kinderen naar je komen met een bingokaart die klaar is (met 3 stempels op de achterkant), doe je dezelfde toverspreuk samen met hen, tover je het kompas terug en deel je snoepjes uit. Daarna stuur je de kinderen naar de markt.']}
    ],
    personages:[
      {naam:'De Heks',sub:'Toverspreuken en snoepjes',wieTitel:'Karakter',
       wie:['De heks is een mysterieuze maar slimme vrouw die af en toe wat gekke trekjes heeft. Ze is natuurlijk een pro in spreuken en toveren, al gaat er af en toe toch wat mis. Ze praat enthousiast en theatraal.'],
       blokken:[trekjes(['Af en toe vergeetachtig: zoekt bv. haar boek terwijl het onder haar arm zit, start een spreuk maar vergeet halverwege de woorden','Fluistert af en toe geheimzinnig','Elke kleine ontdekking is een ‘groots’ moment']),
                {t:'Tijdens het spel',l:['“Hmmmm... wat denken jullie van deze neus? Nee? Dan zat mijn magische bril er weer naast!”','“Wacht eens even... had de dief echt zo’n snor? Zijn jullie zeker? Mijn hekseninstinct zegt van wel... of misschien toch niet?”','“Aha! We komen steeds dichter bij de waarheid. Ik voel mijn speurneus beginnen te kriebelen!”']}],
       kleding:[kledij(['Heksenkleed','Laarzen','Haarclip','Ringen','Halsketting','Zwarte panty']),makeup(['Naar eigen invulling'])],
       tip:'Bij de toverspreuk laat je de kinderen “Zim, Zam, Zoom!” meerdere keren roepen, steeds luider en luider. Wanneer het voor jou oké is, tover je het kompas terug!',
       scripts:[{t:'Intro',key:'heks'},{t:'Wanneer het gezicht klaar is',key:'heks-klaar'},{t:'Afsluiting',key:'heks-afsluiting'},{t:'Slotzin: hier eindigt de tocht',key:'heks-einde'}]}
    ],
    materiaal:[{groep:'Op de mediva-tafel',items:['1 mediva-tafel','1 heksenketel met snoep','Deco-spin','1 spreukenboek']},
               {groep:'In de extra kist',items:['30-tal led-kaarsen','Deco: spinnenwebben, rat, grote spin, heksenketels','1 magische bol','1 vogelkooi met kraai','1 kompas (van Pablo: na gebruik altijd terugbrengen)','1 groot voorbeeldgezicht (+1 reserve)','1 set kenmerken met velcro (+1 reserve)']}],
    opbouw:[{t:'Benodigdheden klaarleggen in de fiets en op de mediva-tafel onder het schip: de heksenketel met snoep en de deco-spin op de tafel, de rest in de extra kist (de dronkaard legt dit klaar). Bouw de post nog niet meteen op: het materiaal mag niet in het zicht van de gasten staan.'},
            {t:'Met de kar en de kist naar Stop 10 (vlindertuin), op het verhoogde deel bij het zebrapad en daar de post opbouwen met dief 2 / Orry (niet alleen: geen hulp op tijd, meld het bij Marith).',fotos:[route(4,'Route 4/4: stap 10 (post heks)')]},
            'Heksentafel neerzetten met de heksenketel met snoep, de deco-spin en het spreukenboek.',
            'Led-kaarsjes (30-tal) rondom plaatsen als afbakening voor de gasten.',
            'Uit de extra kist: deco (spinnenwebben, rat, grote spin, heksenketels), de magische bol, de vogelkooi met kraai en het kompas klaarzetten.',
            'Voorbeeldgezicht en de set kenmerken met velcro klaarleggen.',
            'Na de laatste groep afbouwen met Orry en de kok, en het kompas van Pablo terugbrengen.'],
    fotos:[foto('kind-route-4','Route 4/4: post van de heks in de vlindertuin')]
  },
  {
    id:'dief',naam:'Dieven',kleur:K.dief,rollen:['Dief 1','Dief 2'],kort:'Dief 1 & 2 · lopen rond',
    plattegrond:foto('kind-route-kaart','De route op de kaart'),
    wat:['Er zijn altijd 2 dieven die elk een deel van het parcours voor hun rekening nemen. Ze proberen elke groep minstens 1 keer gehad te hebben. Sommige tochten zijn er 3 dieven: dief 3 vlindert dan wat over het parcours.',
         'Tijdens de opbouw ben jij (dief 1) verantwoordelijk om de lampjes op de splitsingen te plaatsen, zodat de groepen weten waar ze heen moeten, en om bij elke splitsing met stoepkrijt een pijl op de weg te tekenen. Dief 1 brengt en haalt ook het bord van de schutter, altijd met de E-car en met twee personen gedragen.',
         'De dief is vervloekt: hij kan niets zien, enkel horen. Als de dief bij een groep komt, moeten de kinderen muisstil blijven staan.'],
    aandacht:['Fiets: dief 1 (overhead) neemt een fiets MET laadbak, dief 2 (Orry) een fiets ZONDER laadbak. Klok in bij de check-in, haal hem op bij de fietsenstalling van de Housekeeping (achter de loods) en zet hem bij de nooddeur onder het schip.','Je kondigt je komst steeds aan met de bel, zodat dit ook voor spanning zorgt.','Na de kok weten de kinderen dat de dief groene ogen heeft: houd daarna voldoende afstand, zodat ze dit niet komen controleren.','Benader een groep bij voorkeur van achteren, zodat de groep niet opsplitst of in delen doorloopt. Dagen kinderen je uit, loop dan achter de groep langs in plaats van ertussendoor.','Maak af en toe gromgeluiden. Maakt iemand lawaai, dan mag je daar gerust even aandacht aan besteden.','Bij regenalternatief loop je doorheen de hele Bay.'],
    personages:[
      {naam:'De Dief',sub:'Volledig gemaskerd, met bel en lantaarn',wieTitel:'Wat doe je',
       wie:['Je loopt rond met je bel en je lantaarn, doorheen je deel van het parcours, en laat de kinderen stilstaan wanneer je langskomt. Je benadert de groep van achteren, zodat ze samen blijft. Je bent volledig gemaskerd en spreekt niet: je gromt.'],
       kleding:[kledij(['Lange groene mantel met kap','Volledig masker','Zwarte handschoenen (worden voorzien)','Donkere broek en schoenen (zelf voorzien)']),{t:'Attributen',items:['Handbel','Lantaarn']}]}
    ],
    materiaal:[{groep:'Dief',items:['3 handbellen','3 lantaarns']},{groep:'Dief 1 — voor de opbouw',items:['6 paddenstoelenlampjes, inclusief AA-batterijen','Stoepkrijt','E-car voor het bord van de schutter']}],
    opbouw:[{t:'Lampjes plaatsen en pijlen met stoepkrijt tekenen (dief 1, 15u10–15u50), op 6 plaatsen: 1 splitsing bij de nooduitgang van de Bay (linkerkant); 2 splitsing bij het hotel (rechterkant in de bocht); 3 splitsing bij de dronkaard (rechterkant); 4 splitsing na de schutter (rechterkant); 5 grindpad (net op het grindpad zelf); 6 vlindertuin (vlak na het zebrapad). Leg de lampjes op de grond of op de struiken: het is niet nodig om de stokjes of kopjes erop te steken. Teken ook op elke splitsing die ze moeten nemen een pijl in de juiste richting met stoepkrijt.',fotos:[foto('kind-route-kaart','De route op de kaart: de 6 plaatsen volg je langs het pad')]},
            'Dief 1 brengt het bord van de schutter met de E-car naar Stop 5 (cottage 236–237) en haalt het na de tocht terug. Altijd met twee dragen, zodat de haken niet beschadigen.',
            'Dief 1 en de kapitein ruimen om 16u30–16u40 de show op (Pirates Place naar onder het schip).',
            'Dief 2 loopt vanaf 16u50 rond met bel en lantaarn tot 19u00 (zie plattegrond); dief 1 vanaf 16u40.'],
    fotos:[foto('kind-route-kaart','De route op de kaart')]
  }
];

// ---------------------------------------------------------------- checklist
const CHECK=[
  {id:'f1',nr:1,titel:'Opbouw',tijd:'15u00 – 15u50',protocol:'Briefing om 15u00 onder het schip, opbouw vanaf 15u10. Klaar om 15u50, daarna make-up en kledij.',groepen:[
    {naam:'Fietsen & inklokken',items:['Schutter, kok, dronkaard en dief 1 (overhead): ingeklokt bij de check-in en een fiets MET laadbak opgehaald bij de fietsenstalling van de Housekeeping (achter de loods)','Dief 2 (Orry) en heks: ingeklokt bij de check-in en een fiets ZONDER laadbak opgehaald','De fiets bij de nooddeur onder het schip gezet, zodat je de spullen er makkelijk in kan zetten']},
    {naam:'Briefing',items:['Iedereen aanwezig voor de briefing (15u00, onder het schip): de verplaatsing met de fiets zelf ingecalculeerd','Wie op reserve staat weet dat hij inspringt bij ziekte, anders helpt bij de ontvangst of als dief']},
    {naam:'Algemeen materiaal',items:['EHBO-kit klaar','Lantaarns (3) klaar','4 muziekboxen opgeladen (3 grote en 1 JBL)','Fietsen: 4 met laadbak en 2 zonder laadbak, bij de nooddeur onder het schip','AA-batterijen (240 per tocht) bij de hand','PDA opgeladen en betaalterminal klaar','Stempels voor het regenalternatief (3) klaar','Spinnenweb-deco (4) klaar']},
    {naam:'Kapitein',items:['Bingokaarten (120) klaargelegd','Potloden (120) klaargelegd','Kaartjes met kenmerken (120) klaar','Techniek van de show klaargelegd in de hut']},
    {naam:'Dronkaard (Stop 3, Nature Lodge)',items:['Parcours neergelegd','Hoepels (2), lepels (15) en knikkers (15) klaar','Spinnenweb-deco opgehangen','Doodshoofd-fles klaar (let op: glas)','Muziekbox van de dronkaard klaar (meenemen bij aanvang tocht)']},
    {naam:'Schutter (Stop 5, cottage 236–237)',items:['Werpringen (2 dozen) klaar','Bord met haken door dief 1 met de E-car gebracht, met twee gedragen','Camouflagenet en spinnenweb-deco opgehangen','Bord met haken geplaatst','Muziekbox van de schutter klaar (meenemen bij aanvang tocht)','Klaar met je eigen post? Help de kok']},
    {naam:'Kok (Stop 7, cottage 317–318)',items:['Ajuinen (60-tal) en tennisballen (10-tal) verspreid in het afgebakende gebied','Lint rond de 2 bomen gehangen','Kookpot, roerlepel en spinnenweb-deco klaar','Muziekbox van de kok klaar (meenemen bij aanvang tocht)']},
    {naam:'Dief 1: lampjes en pijlen',items:['Lampje 1: splitsing bij de nooduitgang van de Bay (linkerkant)','Lampje 2: splitsing bij het hotel (rechterkant in de bocht)','Lampje 3: splitsing bij de dronkaard (rechterkant)','Lampje 4: splitsing na de schutter (rechterkant)','Lampje 5: grindpad (net op het pad zelf)','Lampje 6: vlindertuin (vlak na het zebrapad)','Lampjes op de grond of op de struiken gelegd (stokjes en kopjes zijn niet nodig)','Op elke splitsing een pijl met stoepkrijt in de juiste richting getekend','Lampjes aan, batterijen in orde','Bord van de schutter met de E-car naar Stop 5 gebracht (met twee gedragen)']},
    {naam:'Heks (nog niet opbouwen)',items:['Hulp geregeld: Orry helpt bij de op- en afbouw, de kok bij de afbouw (geen hulp op tijd: melden bij Marith)','Kompas van Pablo ligt bij de heks','Materiaal klaargelegd in de fiets en op de mediva-tafel, uit het zicht van de gasten','Mediva-tafel met de heksenketel met snoep, de deco-spin en het spreukenboek','Extra kist met led-kaarsen (30-tal), deco (spinnenwebben, rat, grote spin, heksenketels), magische bol, vogelkooi met kraai, kompas, voorbeeldgezicht (+1 reserve) en kenmerken met velcro (+1 set reserve)','Glutenvrije appelringen: 1 zak apart']},
    {naam:'Ontvangst (Pirate Place, platform van Janneke)',items:['PDA/computertje en betaalterminal klaargezet, beneden op het platform van Janneke','Doos met lampionpakketjes klaar (120 per dag)','Lampionnen zonder batterijen apart gehouden en gevuld waar mogelijk (de reserve en de Kidsclub helpen)','Tafels met stiften en ander materiaal om te versieren klaar (na de show)']}
  ]},
  {id:'f2',nr:2,titel:'Voor de start',tijd:'15u50 – 16u40',protocol:'Make-up en kledij, ontvangst naar de Pirates Place, iedereen naar zijn post.',groepen:[
    {naam:'Klaar voor de gasten',items:['Opbouw klaar om 15u50, daarna afgesproken voor make-up en kledij','Iedereen in kostuum en geschminkt (kledij, make-up en schoeisel passend bij je karakter, met warme kleding eronder)','Show opgeruimd (16u30–16u40: dief 1 en kapitein, van de Pirates Place naar onder het schip)','Knutselhoek verplaatst naar de Pirates Place zodra de show gedaan is']},
    {naam:'Ontvangst',items:['Ontvangst vertrokken naar de Pirates Place om 16u15','Eerste tijdslot start om 16u25: enkel het tijdslot dat vertrekt staat op Pirate Place, andere groepen wachten even','Armbandjes scannen en afvinken in de PDA: lampion meegeven','Geen kinderen alleen laten vertrekken: alleen gekomen kinderen? Bandje scannen en de ouders contacteren (of de receptie bellen)']},
    {naam:'Posten',items:['Iedereen vertrekt om 16u35 naar zijn post','Op post: spinnenweb-deco hangt, muziekbox staat aan','Dieven lopen rond met bel en lantaarn']},
    {naam:'Start',items:['16u40: kapitein haalt groep 1 op en vertrekt naar de nooduitgang','Orry en de heks: show opgeruimd en verplaatst naar post (16u45–16u50), fiets meegenomen']}
  ],kader:'Groepen vertrekken om het kwartier: 16u40 (groep 1), 16u55, 17u10, 17u25, 17u40, 17u55, 18u10 en 18u25 (groep 8).'},
  {id:'f3',nr:3,titel:'Tijdens de tocht',tijd:'16u40 – 19u15',protocol:'Ter info, geen vinkjes',info:true,groepen:[
    {naam:'Doorstroom',items:['Om het kwartier vertrekt er een groep van max 10–15 kinderen (2–12 jaar), begeleiders niet meegerekend','De kapitein zorgt dat er elk tijdslot een groep wordt meegenomen van de Pirates Place naar de nooddeur','Is er iemand te laat, laat hem dan met de volgende groep meelopen','Niet-ingeschreven gasten kunnen nog aansluiten als er plek is (betalen met de terminal)']},
    {naam:'Op post',items:['Enkel de kinderen nemen actief deel aan de opdrachten','Opdrachten kort en krachtig; is iets te moeilijk, vereenvoudig het dan','Elke post geeft zijn tip over een gezichtskenmerk (mond, ogen, hoofddeksel)','De dieven kondigen zich aan met de bel: de kinderen blijven muisstil staan','De dieven benaderen een groep van achteren; dagen kinderen hen uit, dan lopen ze achter de groep langs in plaats van ertussendoor','Bij regen wordt de tocht naar binnen verplaatst (regenalternatief): stempel steeds op de achterkant van het bingokaartje']},
    {naam:'Veiligheid',items:['De tocht is ongeveer 2 km lang en mogelijk voor rolstoelgebruikers','Geen kinderen alleen laten: de groepen lopen samen met hun begeleiders','De heks sluit af en zegt duidelijk dat de tocht bij haar stopt; de laatste groep is rond 19u15 bij haar','Eventueel een extra dief inzetten']}
  ]},
  {id:'f4',nr:4,titel:'Afbouw',tijd:'vanaf 18u25',protocol:'Zodra de laatste groep bij jou voorbij is, mag je opruimen.',groepen:[
    {naam:'Eigen post',items:['Laatste groep (18u25) gepasseerd: materiaal opgeruimd en terug naar de Bay gebracht','Lint netjes opgerold (kok)','Fiets (terug naar de fietsenstalling van de Housekeeping), kar en muziekbox teruggebracht','Paddenstoelenlampjes opgehaald (dief 1)','Bord van de schutter met de E-car teruggehaald, met twee gedragen (dief 1)','Stokjes van de lampionnen terug in de plastic verpakking (ontvangst)']},
    {naam:'Heks & Orry',items:['Post van de heks opgeruimd met Orry en de kok, en terug naar de Discovery Bay (19u15–19u30)','Kompas van Pablo teruggebracht','Omkleden en make-up eraf (19u30–19u45)','Pauze 19u45–20u15; daarna omkleden en make-up voor de volwassentocht (20u15–20u25)']},
    {naam:'Ombouw voor de volwassentocht (19u00 – 19u30)',items:['Je taak voor de ombouw staat bij Planning, per avond: kijk naar je eigen naam','Inkom, locker & ingang, sector 1 en 2, buitenbos en techniek zijn verdeeld over de medewerkers']},
    {naam:'Netheid',items:['Ronde door de hele Bay: achtergebleven decoratie opgeruimd (de Kidsclub kan dit doen)','Verlengsnoeren terug onder het schip']},
    {naam:'Materiaal & rapport',items:['Tekorten (lint, tape, batterijen) genoteerd','Ontbrekend of kapot materiaal gemeld','Rapport ingevuld']}
  ]}
];

// ---------------------------------------------------------------- de activiteit
window.HW_ACT=window.HW_ACT||{};
window.HW_ACT['zeven-zeeen']={
  stand:'19/10/2026',
  data:['15/10','17/10','22/10','24/10','29/10','31/10','05/11'],
  nachten:NACHTEN,scripts:window.HW_KIND_SCRIPTS||{},
  tabs:[{id:'start',ic:'🏴‍☠️',t:'Start'},{id:'planning',ic:'📅',t:'Planning'},{id:'tijd',ic:'⏱️',t:'Tijdsloten'},{id:'zones',ic:'🗺️',t:'Posten'},
        {id:'checklist',ic:'✅',t:'Checklist'},{id:'praktisch',ic:'⚠️',t:'Praktisch'},{id:'docs',ic:'📎',t:'Documenten'}],
  zonesTab:'Posten',zonesUitleg:'Ontvangst, kapitein en de vier posten: karakter, scripts, opbouw en foto’s.',rollenTab:'Karakter & scripts',
  opbouwTitel:'Opbouw (vanaf 15u10)',materiaalUitleg:'De shifttijd begint om 15u. Elke piraat met een post neemt zijn materiaal dat klaarligt onder het schip en rijdt met de fiets naar zijn post. Leg het materiaal zoveel mogelijk nog uit het zicht van de gasten.',
  snelkaarten:true,
  fiets:FIETS,
  startKaartenVoor:[
    {nood:true,titel:'Belangrijk',l:['Je staat de hele tocht buiten: zorg voor voldoende warme onderkleding en eventueel handschoenen. Bij je post staat welke kleding je zelf moet voorzien.','Zorg dat je echt op de afgesproken tijd onder het schip bent voor de briefing (15u00).','Neem eigen eten mee voor de pauze: eten in de Evergreens is op deze dagen niet echt mogelijk.','Heb je vragen? Meld ze zo snel mogelijk aan Marith, niet pas op de dag zelf.']},
    {titel:'🆕 Nieuw na de eerste avond',sub:'Werkpunten en afspraken uit de mail van het Halloween team (17/10). Ze staan ook uitgewerkt bij de posten.',l:[
      'De tocht start op Pirate Place, beneden op het platform van Janneke. Enkel het tijdslot dat vertrekt staat op Pirate Place; andere groepen wachten even.',
      'Laat kinderen niet alleen vertrekken. Komen er toch kinderen alleen, scan dan hun bandjes en neem contact op met de ouders (of bel de receptie).',
      'Lampionnen: niet alle lampionnen hebben batterijen. De reserve kan helpen op Pirate Place, de Kidsclub springt bij waar nodig. Stop de stokjes na gebruik terug in de plastic verpakking.',
      'Opdrachten op de posten: kort en krachtig. Is iets te moeilijk, vereenvoudig het dan.',
      'Dieven benaderen groepen van achteren. Dagen kinderen je uit, loop dan achter de groep in plaats van ertussendoor.',
      'Het bord van de schutter brengt en haalt dief 1 altijd met de E-car, met twee personen gedragen (om de haken te sparen).',
      'De heks bouwt niet alleen op en af: Orry helpt bij beide, de kok helpt bij de afbouw. Geen hulp op tijd? Meld het bij Marith.',
      'Bij de heks moet duidelijk zijn dat de tocht daar stopt: zij sluit af met de nieuwe slotzin. Controleer of het kompas van Pablo nog bij de heks ligt en breng het na gebruik terug.']},
    {titel:'🚲 Fietsen: wie haalt er een op?',p:['Deze rollen nemen een fiets en mogen daarvoor bij de check-in inklokken. Alleen deze medewerkers klokken bij de check-in in.'],
     fietsMatrix:[['Schutter','Schutter','Met laadbak'],['Kok','Kok','Met laadbak'],['Dronkaard','Dronkaard','Met laadbak'],['Dief 1 / overhead','Dief 1','Met laadbak'],['Dief 2 / Orry','Dief 2','Zonder laadbak'],['Heks','Heks','Zonder laadbak']],
     l:['Ophalen: bij de fietsenstalling van de Housekeeping, achter de loods.','Zet je fiets bij de nooddeur onder het schip, zodat je de spullen er makkelijk in kan zetten.','Dit doe je eerst, vóór al het andere. Orry en de heks halen hun fiets op vóór 14u15 (opbouw van de show); de anderen zorgen dat ze om 15u00 onder het schip zijn voor de briefing. Bedenk zelf hoeveel tijd je nodig hebt voor de verplaatsing.','De namen per avond staan in de tabel hierboven en bij Planning (blok “Fietsen”).'],
     nota:'Kapitein, ontvangst en reserve staan niet in dit lijstje: zij halen geen fiets op.'},
    {titel:'Wat moet je voorbereiden?',rijen:VOORBEREIDEN}
  ],
  feiten:[['Tocht','16u40 – 19u00'],['Leeftijd','2 – 12 jaar'],['Duur','± 45 min · 2 km'],['Prijs','€ 3'],['Groep','10–15 kinderen'],['Verantw.','Lien']],
  verhaalTitel:'Het verhaal',
  verhaal:['Kapitein Pablo heeft jaren geleden een magisch kompas gekocht bij de heks. Dat is zopas gestolen door een dief! Maar omdat het een magisch kompas is, is de dief nu vervloekt. Pablo weet niet wie het deed, want hij lag te slapen. Een aantal piraten heeft wel iets gezien, maar wil het niet aan Pablo vertellen. Daarom heeft hij de kinderen nodig.',
           'De kinderen trekken met hun begeleiders in groepjes op pad en komen op 3 punten een piraat tegen. Elke piraat is ooggetuige geweest, maar draagt een ooglapje en zag daarom maar 1 kenmerk (kin-mond, neus-ogen of hoofddeksel). Ze delen hun informatie pas als de kinderen eerst helpen.',
           'Op het einde hebben de kinderen op hun kaartje van de 4 kenmerken er telkens nog 1 over. Bij de heks puzzelen ze samen het gezicht van de dief bij elkaar. Is het juist, dan weet de heks wie de dief is: ze doet een magische spreuk, tovert het kompas terug en straft de dief voor altijd. Als dank krijgt iedereen heksensnoep.',
           'Sidenote: de dief passeert de kinderen regelmatig en kondigt zich aan met een bel. Hij is volledig gemaskerd; de kinderen moeten dan zo stil mogelijk blijven staan.'],
  stappenTitel:'De route van de tocht',
  stappen:[
    {nr:1,zone:'ontvangst',titel:'Ontvangst & lampion',tekst:'Op Pirate Place, beneden op het platform van Janneke, wordt het armbandje gescand en versieren de kinderen 15 minuten hun lampion.'},
    {nr:2,zone:'kapitein',titel:'Kapitein Pablo',tekst:'Hij haalt de groep op, vertelt het verhaal van het gestolen kompas, geeft elk kind een bingokaartje en stuurt de groep via de nooddeur achter de hut naar links.'},
    {nr:3,zone:'dronkaard',titel:'Post 3 · Dronkaard (Stop 3)',tekst:'Piratenparcours met een knikker op een lepel, bij de Nature Lodge. Tip: een gestreepte bandana.'},
    {nr:4,zone:'schutter',titel:'Post 5 · Schutter (Stop 5)',tekst:'Ringwerpen bij cottage 236–237. Tip: een gouden tand.'},
    {nr:5,zone:'kok',titel:'Post 7 · Kok (Stop 7)',tekst:'Ajuinen zoeken bij cottage 317–318. Tip: groene ogen.'},
    {nr:6,zone:'heks',titel:'Post 10 · Heks (Stop 10)',tekst:'In de vlindertuin puzzelen ze het gezicht van de dief, roepen “Zim, Zam, Zoom!” en krijgen een snoepje. Het kompas is terug en de tocht stopt hier.'}
  ],
  startKaarten:[
    {titel:'Praktische informatie',rijen:[
      ['Locatie','De kindertochten starten op vaste tijdstippen op Pirate Place in de Discovery Bay, beneden op het platform van Janneke. Van hieruit vertrekt de tocht richting buiten en eindigt bij de heks in de vlindertuin (speeltuin zone 4). De gasten kunnen van hieruit kiezen of ze terug naar de Bay gaan of naar hun cottage/andere locatie.'],
      ['Data','Elke donderdag- en zaterdagavond van 15 oktober tot en met 5 november.'],
      ['Uren','De shift loopt van 15u00 tot 23u30, met de activiteit zelf van 16u25 tot 19u00. De kids krijgen eerst 15 minuten om hun lampion te versieren; de tocht zelf duurt dan 45 minuten.'],
      ['Doelgroep','Kinderen onder 12 met hun begeleiders. Mogelijk voor rolstoelgebruikers; bij regenweer wordt de tocht naar binnen verplaatst.'],
      ['Inschrijving en prijs','€3 per kind. Elk kind krijgt bij inschrijving een lampion met lampje. Bij het afvinken in de PDA geef je automatisch de lampion mee. Vaste tijdssloten: vol = vol.'],
      ['Reserve','Sta je op de reserve-post, dan spring jij in als er zieken zijn. Is iedereen aanwezig, vraag dan aan de overhead waar je kan helpen: bij de ontvangst of als dief.'],
      ['Kledij','Voor elk karakter is iets voorzien, meestal de piratenkledij uit de Bay: voorzie dus zelf voldoende warme kledij eronder en eigen schoeisel, liefst passend bij je karakter.']
    ]},
    {titel:'Omschrijving in de app',sub:'Zo staat de activiteit bij de gasten. Vraagt iemand er iets over, dan weet je wat er beloofd werd.',talen:{
      nl:['Halloweentocht op de Zeven Zeeën','De kapitein heeft jullie hulp nodig: zijn magisch kompas is gestolen door een vervloekte dief! Volg het spoor, verzamel aanwijzingen en ontdek wie de mysterieuze dief is. Durven jullie het avontuur aan?','Gelieve enkel in te schrijven voor kinderen tussen 2 en 12 jaar, enkel zij nemen actief deel aan de opdrachten. Voor oudere kinderen is er een tocht later op de avond voorzien. De tocht vindt plaats in groepen, je loopt dus niet individueel. Let op: de tocht is 2 km lang, neem dus zeker een kinderwagen mee indien nodig.'],
      en:['Halloween-tour on the Seven Seas','The captain needs your help: his magical compass has been stolen by a cursed thief! Follow the trail, gather clues, and discover who the mysterious thief is. Do you dare to take on this adventure?','Please register only children aged 2 to 12 years. Only they actively take part in the activities. A separate trail is planned later in the evening for older children. The trail takes place in groups, so you will not participate individually. Please note: the trail is 2 km long, so if possible, bring a stroller or buggy.'],
      fr:['Ballade d’Halloween sur les Sept Mers','Le capitaine a besoin de votre aide : son boussole magique a été volée par un voleur maudit ! Suivez la piste, trouvez des indices et découvrez qui est le mystérieux voleur. Oserez-vous vivre cette aventure ?','Veuillez inscrire uniquement les enfants âgés de 2 à 12 ans. Seuls eux participent activement aux épreuves. Une balade est prévue plus tard dans la soirée pour les enfants plus âgés. Le parcours se fait en groupes, vous ne participez donc pas individuellement. Attention : le parcours fait 2 km. Si possible, pensez à apporter une poussette.'],
      de:['Halloween-Wanderung auf den Sieben Meeren','Der Kapitän braucht eure Hilfe: Sein magisches Kompass wurde von einem verfluchten Dieb gestohlen! Folgt der Spur, sammelt Hinweise und findet heraus, wer der geheimnisvolle Dieb ist. Traut ihr euch auf dieses Abenteuer?','Bitte melden Sie nur Kinder im Alter von 2 bis 12 Jahren an. Nur sie nehmen aktiv an den Aufgaben teil. Für ältere Kinder ist später am Abend eine eigene Tour vorgesehen. Die Tour findet in Gruppen statt, daher nimmt man nicht einzeln teil. Achtung: Die Tour ist 2 km lang. Bringen Sie daher nach Möglichkeit einen Kinderwagen mit.']}},
    {titel:'De route',p:['De gasten worden in groep naar buiten gestuurd via de nooddeur achter de hut. Ze gaan naar links richting de splitsing en daar naar rechts, langs het hotel af. Ter hoogte van de Nature Lodge vinden ze POST 3: de dronkaard. Hierna gaan ze op de splitsing naar rechts, richting het meer; ongeveer in het midden van deze weg staat POST 5: de schutter. Ze lopen de weg helemaal af tot ze achteraan het park uitkomen, gaan op de splitsing naar rechts en passeren ergens op dit pad POST 7: de kok. Daarna lopen ze door tot de splitsing met het grindpad terug richting het centrum, dat ze volgen tot de vlindertuin. Hier wacht POST 10: de heks.',
          'Los van de opdrachten is de wandeltijd een 30-tal minuten. De tocht duurt dus zeker 45 minuten en is net geen 2 km lang.'],
     fotos:[foto('kind-route-kaart','De route op de kaart'),foto('kind-plattegrond','Plattegrond van het park met de route'),foto('kind-route-1','Route 1/4: nooduitgang tot Nature Lodge'),foto('kind-route-2','Route 2/4: splitsing rechts tot de schutter'),foto('kind-route-3','Route 3/4: kok, grindpad en vlindertuin'),foto('kind-route-4','Route 4/4: de heks')]},
    {titel:'Kledij en make-up',p:['Er is voor elk karakter iets van kledij voorzien: meestal de piratenkledij uit de Bay. Voorzie dus zelf voldoende warme kledij eronder en eigen schoeisel, liefst passend bij je karakter. Make-up per karakter staat bij de posten; dit zijn voorbeelden van het piratenlook.'],
     fotos:[foto('kind-pablo','Make-up voorbeeld: kapitein Pablo'),foto('kind-schmink-piraat-vrouw','Make-up voorbeeld: piraat (vrouw)'),foto('kind-schmink-piraat-man','Make-up voorbeeld: piraat (man)')]}
  ],
  uurschema:[
    ['Eerst: vóór 15u00','Inklokken en fiets ophalen','Dit komt vóór al het andere. Alleen schutter, kok, dronkaard, dief 1/overhead (fiets met laadbak) en dief 2/Orry en heks (fiets zonder laadbak): inklokken bij de check-in en een fiets halen bij de fietsenstalling van de Housekeeping (achter de loods). Zet hem bij de nooddeur onder het schip. Orry en de heks doen dit vóór 14u15, voor de opbouw van de show.'],
    ['15u00','Briefing','Iedereen onder het schip in de Discovery Bay. Wees echt op tijd.'],
    ['15u10','Opbouw','Elke piraat met een post neemt zijn materiaal onder het schip en fietst naar zijn post. De heks bouwt nog niet op: dat materiaal mag niet in het zicht van de gasten staan.'],
    ['15u50','Opbouw klaar','Daarna afspraak voor make-up en kledij.'],
    ['16u15','Ontvangst naar de Pirates Place','Zij vertrekken al om 16u15, want om 16u25 start het eerste tijdslot.'],
    ['16u25','Eerste tijdslot','15 minuten lampion versieren, daarna vertrekt de groep.'],
    ['16u30 – 16u40','Show opruimen','Dief 1 en kapitein, van de Pirates Place naar onder het schip.'],
    ['16u35','Iedereen naar zijn post','Zo zijn we zeker op tijd.'],
    ['16u40','Eerste tocht vertrekt','Nadien om het kwartier een nieuwe groep.'],
    ['18u25','Laatste tocht vertrekt','Vanaf het moment dat de groep voorbij je post is, mag je opruimen en terug naar de Bay.'],
    ['19u00 – 19u30','Af- en ombouw','Eigen post afbouwen, daarna ombouw van de Bay voor de volwassentocht volgens je taak (zie Planning). De shift loopt tot 23u30.']
  ],
  balk:{start:15*60,eind:19*60+30,segs:[
    ['Opbouw',15*60,15*60+50,'#d98a2b'],['Make-up',15*60+50,16*60+15,'#8a3a8c'],['Ontvangst',16*60+15,16*60+40,'#4a63c0'],
    ['Tocht',16*60+40,19*60,'#e8772e'],['Afbouw',19*60,19*60+30,'#2f6b70']],uren:['15u00','15u50','16u40','19u00','19u30']},
  tijdsloten:{start:'16:40',laatste:'18:25',stapMin:15,perSlot:15,titel:'De 8 groepen',
    intro:'Gasten schrijven in op vaste tijdssloten (vol = vol). Voor elk vertrek krijgen ze eerst 15 minuten om hun lampion te versieren. Er vertrekt elk kwartier een groep van maximaal 10–15 kinderen.',
    chip:(i)=>'groep '+(i+1),
    regels:[
      ['Groepsgrootte','Maximum 10–15 kinderen tussen 2 en 12 per groep, begeleiders niet meegerekend. Groepen kunnen dus groter zijn dan 15; de bedoeling is dat enkel de kinderen actief deelnemen aan de opdrachten.'],
      ['Per dag','In totaal kunnen er 80–120 kinderen inschrijven per dag.'],
      ['Kapitein','Zorgt dat er op elk tijdslot een groep wordt meegenomen van Pirate Place (beneden op het platform van Janneke) naar de nooddeur. Daar doet hij de uitleg, deelt het materiaal uit en stuurt de groep naar links.'],
      ['Laatste groep','Vertrekt om 18u25. Vanaf het moment dat de groep bij jou voorbij is, mag je opruimen.'],
      ['Te laat','Is er iemand te laat, laat hem dan liefst meelopen met de volgende groep.'],
      ['Niet ingeschreven','Gasten die niet ingeschreven zijn, kunnen nog aansluiten als er plek is. Ze betalen dan bij de ontvangst met de terminal.'],
      ['Ontvangst','Op Pirate Place is enkel het tijdslot aanwezig dat vertrekt. Andere groepen wachten even (verwijs ze naar het marktje en de andere activiteiten), zodat het overzichtelijk blijft en de groepen niet te groot worden.'],
      ['Kinderen alleen','Laat kinderen niet alleen vertrekken. Komen er toch kinderen alleen, scan dan hun bandjes en neem contact op met de ouders. Je kan hiervoor ook altijd de receptie bellen.'],
      ['Duur','Wandelen duurt een 30-tal minuten, met de opdrachten zeker 45 minuten. De tocht is net geen 2 km.']
    ]},
  planning:{titel:'Draaiboek tocht',kaarten:true,afbTijd:true,opbouwTitel:'Opbouw · na de briefing van 15u00',afbouwTitel:'Af- en ombouw · 19u00 – 19u30'},
  nachtExtra:(n,datum)=>{
    if(!n) return null; const uit=[];
    const fr=(n.draaiboek||[]).filter(r=>FIETS[r.karakter]);
    if(fr.length) uit.push({titel:'🚲 Fietsen op '+datum,sub:'Zij klokken in bij de check-in en halen een fiets op bij de fietsenstalling van de Housekeeping (achter de loods); ze zetten hem bij de nooddeur onder het schip.',
      rijen:fr.map(r=>[r.naam+' — '+r.karakter,'Fiets '+FIETS[r.karakter]])});
    // Normaal is Orry daarna ook dief 2; bij een wissel (zie WISSELS) kunnen dat twee mensen zijn.
    const vn=s=>String(s||'').replace(/\(.*?\)/g,'').trim(), d2=(n.draaiboek||[]).find(r=>r.karakter==='Dief 2');
    const orry=!d2||vn(d2.naam)===vn(n.orry)?[['Orry (en dief 2)',n.orry||'—']]:[['Orry (show)',n.orry||'—'],['Dief 2',d2.naam]];
    if(n.orry||n.heks) uit.push({titel:'Orry & de heks · de show',sub:'Dit geldt voor Orry en de heks. Wie in de middag Orry is, volgt vanaf 19u00 het draaiboek van de andere medewerkers.',
      rijen:orry.concat([['Heks',n.heks||'—'],['Tessy ’s avonds',n.tessy||'—'],['Shows','15u15 – 15u45 en 16u00 – 16u30 (zie het onderdeel O&F Halloween show)'],['Op post','16u50 – 19u15; de laatste tocht is rond 19u15 bij de heks']])});
    return uit;
  },
  zones:ZONES,
  checklist:CHECK,
  rapport:['Incidenten','Ontbrekend of kapot materiaal','Opmerkingen voor de volgende avond'],
  praktisch:[
    {titel:'Wat moet je voorbereiden?',rijen:VOORBEREIDEN},
    {titel:'Fietsen & inklokken',rijen:[
      ['Wie','Schutter, kok, dronkaard en dief 1 / overhead nemen een fiets MET laadbak; dief 2 / Orry en heks nemen een fiets ZONDER laadbak.'],
      ['Waar ophalen','Bij de fietsenstalling van de Housekeeping, achter de loods. Zet je fiets bij de nooddeur onder het schip, zodat je de spullen er makkelijk in kan zetten.'],
      ['Inklokken','Alleen deze medewerkers mogen bij de check-in inklokken.'],
      ['Op tijd','Zorg dat je om 15u00 onder het schip bent voor de briefing: bedenk zelf hoeveel tijd je nodig hebt voor deze verplaatsing.']]},
    {titel:'Kleding, eten en nood',rijen:[
      ['Warm aankleden','Afhankelijk van je rol sta je de hele tocht buiten: zorg voor voldoende warme onderkleding en eventueel handschoenen. Bij je post staat welke kleding je zelf moet voorzien.'],
      ['Eten','Er is geen ruimte voor speling: eten in de Evergreens tijdens de dagen van de Halloweentochten is niet echt mogelijk. Neem dus eigen eten mee voor de pauze. Ga je toch in de Evergreens eten, houd er dan rekening mee dat bestellen tijd kost, zeker met de drukte op dat uur.'],
      ['Nationaliteiten','Een overzicht van de nationaliteiten per dag staat in de bijlage van de mail van Marith (niet in de app): zo weet je welke talen welke dagen extra belangrijk zijn. Op de dag zelf staan we er ook kort bij stil tijdens de briefing.'],
      ['EHBO / veiligheid','Gebeurt er tijdens je dienst iets ernstigs of is er een EHBO-geval, dan volgen we dezelfde procedures als op de werkvloer. Elk van jullie heeft een telefoon bij met het noodnummer van CP: dat bel je alleen in echte noodgevallen (het nummer staat bewust niet op deze pagina). Kleine EHBO’s kunnen in de Bay door onze medewerkers zelf verzorgd worden; bij twijfel val je terug op de DUTY en/of je leidinggevende.']]},
    {titel:'De tocht',rijen:[
      ['Verloop','Kinderen met begeleiders trekken het park in om de identiteit van de vervloekte dief te achterhalen. Door als groep opdrachten te doen bij de verschillende piraten krijgen ze tips. Lukt het alle tips te verzamelen en bij de heks het magische kompas terug te toveren?'],
      ['Beloning','Wie alle opdrachten tot een goed einde brengt, ontvangt aan het einde een snoepje. Groene appelringen zijn glutenvrij; houd 1 zak apart. We hebben geen halal-snoep.'],
      ['Bingokaartje','Elk kind krijgt een bingokaartje met gezichtskenmerken en een potloodje. Na de 3 posten blijft op het kaartje van elk kind nog 1 kenmerk over van de 4.'],
      ['Doelgroep','Enkel kinderen van 2 tot 12 nemen actief deel. Voor oudere kinderen is er later op de avond een tocht (de volwassentocht, vanaf 10 jaar).'],
      ['Kinderen alleen','Laat kinderen niet alleen vertrekken. Komen er toch kinderen alleen, scan dan hun bandjes en neem contact op met de ouders. Je kan hiervoor ook altijd de receptie bellen.'],
      ['Opdrachten','Houd opdrachten kort en krachtig. Is iets te moeilijk, vereenvoudig het dan.'],
      ['Dieven','Benader groepen bij voorkeur van achteren, zodat ze niet opsplitsen of in delen doorlopen. Dagen kinderen je uit, loop dan achter de groep in plaats van ertussendoor.'],
      ['Einde','De tocht stopt bij de heks en zij maakt dat duidelijk. Daarna kiezen de gasten zelf waar ze naartoe gaan. Eventueel kan er een extra dief ingezet worden.']
    ]},
    {titel:'Materiaal (algemeen)',rijen:[
      ['Per tocht','120 potloodjes · 120 kaartjes met kenmerken · 120 lampionnen · 120 lampionlampjes · 240 batterijen AA'],
      ['Eén of enkele','1 EHBO-kit · 1 PDA · 3 lantaarns · 4 muziekboxen (3 grote en 1 JBL) · 4 spinnenweb-deco'],
      ['Vervoer','4 fietsen met laadbak en 2 fietsen zonder laadbak (zie Fietsen op Start); het bord van de schutter brengt en haalt dief 1 met de E-car, met twee personen gedragen'],
      ['Regenalternatief','3 stempels']
    ]},
    {titel:'Regenalternatief',rijen:[
      ['Beslissing','Is er slecht weer voorspeld, dan kan de tocht naar binnen verplaatst worden. Het concept:'],
      ['Onthaal','De gasten worden nog steeds onthaald; de gastheer of -vrouw geeft de opdracht om kapitein Pablo te zoeken (zijn lievelingskleur is paars en hij roept heel luid “Ahoy”). Daarna doet Pablo zijn uitleg.'],
      ['Bingokaartje','Elk kind krijgt nog steeds een bingokaartje en een potlood, met de boodschap dat ze de 3 piraten in de Bay moeten zoeken. Dit doen ze per gezin, niet in groep.'],
      ['Piraten','Dronkaard (achter het kraaiennest): klimmen over de tonnen en kratten. Schutter (lekkende boot): ringen gooien. Kok (glijbaanboom): ajuinen zoeken. Elk karakter stempelt op de achterkant van het bingokaartje en geeft dezelfde hint als buiten.'],
      ['Heks','Na 3 opdrachten gaan ze op zoek naar de heks. Zij controleert of alles goed is en geeft een kleine beloning. Daarna stuurt ze de kinderen naar de markt.'],
      ['Dief','De dief loopt ook in dit concept nog steeds rond in de Bay.']
    ]},
    {titel:'Opbouw en afbouw',rijen:[
      ['Opbouw','Shift begint om 15u; korte briefing in de Discovery Bay; opbouw vanaf 15u10, klaar om 15u50. Leg het materiaal zoveel mogelijk uit het zicht van de gasten.'],
      ['Afbouw','De laatste tocht vertrekt om 18u25. Vanaf het moment dat die groep bij jou voorbij is, ruim je op en neem je alles terug mee naar de Bay. De kok helpt de heks, samen met Orry. Daarna ombouw van de Bay volgens je eigen taak (zie Planning).'],
      ['Netheid','Na de kindertocht een ronde door de hele Bay om achtergebleven decoratie op te ruimen (de Kidsclub kan dit doen). Verlengsnoeren terug onder het schip.']
    ]}
  ],
  documenten:[
    {titel:'Manual kindertocht – 2026',tekst:'De uitgebreide uitleg van de hele tocht. Verplicht: de pagina’s met praktische informatie en die van je eigen rol, en de teksten in 4 talen instuderen. De rest is leesvoer.',id:'1M9Y-_Zxvlfr9oVR6utjN3uTDmnhTJeR2'},
    {titel:'Draaiboek kindertocht',tekst:'Per dag een schema met de tijdsplanning, je rol en je taak voor, tijdens en na de tocht (vooral handig op de dag zelf), plus het schema voor Orry en de heks.',id:'1i9njdvvqUj3_eDf6295WjPWMtoPfgAkg'},
    {titel:'Geluidsbestand (mp3) bij de kindertocht',tekst:'Een mp3 in de Drive-map van de kindertocht (de naam is hier niet leesbaar: open de map als je het zoekt).',id:'1XVzUAIeJrhzxo7rS0Y7yC3BGhQ4dHDqh'},
    {titel:'Draaiboek Halloween 2026',tekst:'Het overzicht van de hele Halloweenperiode (12/10 – 09/11).',id:'1qSIK18QpBqPlBt0mP0fWKqy9vuVSIWY4'}
  ],
  mappen:[{titel:'Map: Kindertocht',id:'1b90bUPP10aCn6tt6DCdh4ouZ60SuMyvF',hoofd:true},{titel:'Alles: Halloweenperiode 2026',id:'1PTdTRqa6ZeUv5jxgEispvTEfvfKI4rei'}]
};
})();

// =====================================================================
//  HALLOWEEN · MARKTJE (de Halloween-atelieractiviteiten in de Discovery Bay) — de inhoud.
//
//  Overgenomen uit het draaiboek/de briefing van de Halloween-atelieractiviteiten, stand
//  12/10/2026. Met opzet NIET overgenomen: de persoonlijke gsm-nummers en het noodnummer
//  (de site is openbaar; die staan in het draaiboek en in Contacten). Namen staan als voornaam;
//  bij twee Britts: "Britt E." en "Britt vL". "(s)" = stagiair van Kosh. Tekenen doet js/halloween.js.
//  Aangevuld met de werkpunten na de eerste avond (mail van het Halloween team, 17/10/2026):
//  bolderkarren vooraf onder het schip, vaste plekken per activiteit, suikerspin, Berta de heks
//  en om 19u00 eerst de grote kar voor de tent van Entertainment.
//  Aangevuld met de feedback voor donderdag 22/10 (mail van 19/10/2026): suikerspinbriefing en vlotter opruimen.
// =====================================================================
(function(){
'use strict';

// ---------------------------------------------------------------- standaardtaken
// De bolderkarren worden voortaan vooraf onder het schip gezet; staat er nog een in het atelier,
// dan neem je die mee. Waar elke activiteit staat: zie WAAR hieronder.
const OP={
  knuffels:['Kar met knuffels + maskers onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay)','Tafels neerzetten en de activiteiten klaarzetten beneden op het strandje'],
  knuffelsSchip:['Kar met knuffels + maskers/lampionnen van onder het schip halen','Tafels neerzetten en de activiteit klaarzetten beneden op het strandje'],
  suiker:['Kar met de suikerspin onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay)','Om 14u00 meteen de machine klaarzetten op de eerste verdieping van het schip (daar is het stroompunt): vuilniszak ophangen en handschoenen aan','Stroom: onder het schip, direct links bij binnenkomst; leg de verlengkabel langs de muur naar de eerste verdieping','Meteen beginnen met het voorbereiden van suikerspinnen'],
  makeover:['Kar kids make over onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay)','Schminken op de tweede verdieping van het schip, bij het roer: zet daar vier stoelen uit het atelier klaar','De betalende activiteiten (glittertattoo, hairbeads, …) beneden op het strandje klaarzetten'],
  makeoverTafels:['Kar kids make over onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay)','Schminken op de tweede verdieping van het schip, bij het roer: zet daar vier stoelen uit het atelier klaar','Tafels en stoelen van onder het schip beneden op het strandje klaarzetten voor de betalende activiteiten (glittertattoo, hairbeads, …)'],
  pompoen:['Kar pompoen schilderen onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay; de pompoenen liggen onder het schip)','Tafels en stoelen neerzetten beneden op het strandje en de spullen klaarleggen'],
  pompoenSchip:['Kar pompoen schilderen van onder het schip halen','Tafels en stoelen neerzetten beneden op het strandje en de spullen klaarleggen'],
  ontvangst:['Ontvangst klaarzetten: PDA','Berta de heks (de pop met het boek) in de eerste grot na de ingang zetten en links naast de deur aansluiten (Nikki weet waar)','Doos met lampionnen op de Pirates Place zetten, zodat het uit het zicht is tijdens de show']
};
const AF={
  knuffels:['Tafels en stoelen terug onder het schip','Alle spullen in de kar van knuffels + maskers doen','Zorg dat alle benodigheden van het lijstje in de kar zitten'],
  suiker:['Tafel terug onder het schip','Verlengkabel terug onder het schip','Suikerspinmachine in de kar doen en naar het atelier brengen','In het atelier de machine schoonmaken zoals in de briefing beschreven'],
  makeover:['Tafels en stoelen terug onder het schip','Spullen terug in de kar en checken of er dingen aangevuld moeten worden','Kar terug naar het atelier brengen en hier alles schoonmaken','Kar achterlaten in het atelier zoals meegenomen'],
  pompoen:['Tafels en stoelen terug onder het schip','Spullen in de kar en kijken of er iets bijgevuld moet worden','Kar onder het schip achterlaten zoals meegenomen'],
  ontvangst:['PDA opbergen onder het schip','Berta de heks afbouwen vóór de volwassentocht en in de lockerruimte zetten']
};
// Waar staat wat in de Bay (afspraak na de eerste avond).
const WAAR=[
  ['Beneden op het strandje','Alle betalende activiteiten en de maskers: knuffels, maskers, glittertattoos, hairbeads en pompoen schilderen'],
  ['Eerste verdieping van het schip','De suikerspinmachine, vanwege het stroompunt. De stroomaansluiting zit onder het schip, direct links bij binnenkomst: leg de verlengkabel langs de muur naar de eerste verdieping.'],
  ['Tweede verdieping, bij het roer','Schminken: zet daar vier stoelen uit het atelier klaar']
];
const Z=(naam)=>['Zie '+naam];
const o=(naam,taken,tijd)=>({tijd:tijd||'14u00 – 15u00',naam,taken});
const a=(naam,taken)=>({tijd:'19u30 – 22u00',naam,taken});
const d=(naam,karakter,tijd,extra)=>({tijd:tijd||'15u00 – 19u00',naam,karakter,wat:extra||''});

// ---------------------------------------------------------------- planning per avond
const N={
  '15/10':{
    aanspreek:['Britt E.','Aisha','Marith'],
    opbouw:[o('Britt E.',['Kar kids make over van het atelier naar de Bay brengen','Tafels neerzetten en de activiteiten klaarzetten']),o('Noemy (s)',OP.knuffels),o('Eliza (s)',Z('Noemy')),
            o('Ida',['Tafel klaarzetten voor de suikerspin: machine erop, vuilniszak ophangen en handschoenen aan','Beginnen met oefenen: suikerspin maken']),o('Pepijn (s)',Z('Ida')),
            o('Nikki',OP.ontvangst),o('Kato (s)',OP.pompoen),o('Marith',['Meehelpen'])],
    draaiboek:[d('Noemy (s)','Knuffels'),d('Eliza (s)','Maskers maken'),d('Pepijn (s)','Suikerspin + maskers',null,'Suikerspin 15u00 – 15u30 en 17u30 – 18u00'),
               d('Ida','Suikerspin + maskers',null,'Suikerspin 15u00 – 17u30 en 18u00 – 19u00'),d('Aisha','Kids make over'),d('Eefje','Kids make over','17u00 – 19u00','Geen pauze'),
               d('Kato (s)','Pompoen schilderen'),d('Britt E.','Ontvangst','15u00 – 19u00','Vlinder'),d('Nikki','Ontvangst')],
    afbouw:[a('Noemy (s)',AF.knuffels),a('Eliza (s)',Z('Noemy')),a('Pepijn (s)',AF.suiker),a('Ida',Z('Pepijn')),a('Aisha',AF.makeover),a('Eefje',Z('Aisha')),
            a('Kato (s)',AF.pompoen),a('Britt E.',AF.ontvangst),a('Nikki',Z('Britt'))]
  },
  '17/10':{
    aanspreek:['Anne','Britt vL','Marith'],
    opbouw:[o('Nikki',OP.knuffelsSchip,'14u00 – 14u45'),o('Britt vL',OP.suiker,'14u00 – 14u45'),o('Hailey',OP.suiker,'14u00 – 14u45'),
            o('Laura',['Tafels en stoelen neerzetten voor pompoen schilderen, beneden op het strandje','Kar pompoen schilderen van onder het schip halen','Spullen klaarzetten'],'14u00 – 14u45'),
            o('Anne',OP.makeoverTafels,'14u00 – 14u45'),o('Eline',OP.ontvangst,'14u00 – 14u45'),o('Marith',['Meehelpen'],'14u00 – 14u45')],
    draaiboek:[d('Nikki','Knuffels','14u45 – 19u00'),d('Britt vL','Suikerspin + maskers','14u45 – 19u00','Suikerspin 14u45 – 17u00 en 18u30 – 19u00'),
               d('Hailey','Suikerspin + maskers','14u45 – 19u00','Suikerspin 14u45 – 15u15 en 17u00 – 18u30'),d('Anne','Kids make over','14u45 – 19u00'),
               d('Laura','Pompoen schilderen','14u45 – 19u00'),d('Kayra','Ontvangst','17u30 – 19u00','Vlinder'),d('Eline','Ontvangst','14u45 – 19u00')],
    afbouw:[a('Nikki',AF.knuffels),a('Britt vL',AF.suiker),a('Hailey',Z('Britt')),a('Anne',AF.makeover),a('Laura',AF.pompoen),a('Kayra',AF.ontvangst),a('Eline',Z('Kayra'))]
  },
  '22/10':{
    aanspreek:['Lisa','Aisha','Marith'],
    opbouw:[o('Noemy (s)',OP.knuffels),o('Lisa',OP.makeover),o('Pepijn (s)',Z('Lisa')),o('Noa',OP.pompoen),o('Eliza',Z('Noa')),
            o('Nikki',['Kar met de suikerspin en pompoen schilderen onder het schip halen (staan ze nog in het atelier: meenemen naar de Bay)'].concat(OP.suiker.slice(1))),
            o('Kato (s)',OP.ontvangst),o('Marith',['Meehelpen'])],
    draaiboek:[d('Eliza (s)','Knuffels'),d('Noemy (s)','Maskers maken'),d('Annelies','Suikerspin','17u00 – 19u00','Geen pauze'),d('Nikki','Suikerspin','15u00 – 17u30'),
               d('Lisa','Kids make over'),d('Pepijn (s)','Kids make over'),d('Noa','Pompoen schilderen'),d('Kato (s)','Ontvangst'),d('Aisha','Ontvangst','15u00 – 19u00','Vlinder')],
    afbouw:[a('Noemy (s)',AF.knuffels),a('Annelies',AF.suiker),a('Nikki',Z('Annelies')),a('Lisa',AF.makeover),a('Pepijn (s)',Z('Lisa')),a('Noa',AF.pompoen),a('Eliza (s)',Z('Noa')),
            a('Aisha',AF.ontvangst),a('Kato (s)',Z('Aisha'))]
  },
  '24/10':{
    aanspreek:['Lisa','Kayra','Anne','Marith'],
    opbouw:[o('Lisa',OP.knuffels,'14u00 – 14u45'),o('Kayra',OP.suiker,'14u00 – 14u45'),
            o('Ina',['Kar van onder het schip halen','Tafels en stoelen neerzetten voor pompoen schilderen, beneden op het strandje, en de spullen klaarleggen'].concat(OP.ontvangst,['Oefenen met suikerspin maken als je tijd over hebt']),'14u00 – 14u45'),
            o('Anne',OP.makeoverTafels,'14u00 – 14u45'),o('Marith',['Meehelpen'],'14u00 – 14u45')],
    draaiboek:[d('Lisa','Knuffels + maskers maken','14u45 – 19u00'),d('Kayra','Suikerspin','14u45 – 19u00','Vlinder'),d('Anne','Kids make over','14u45 – 19u00'),
               d('Nikki','Pompoen schilderen'),d('Ina','Ontvangst','14u45 – 19u00')],
    afbouw:[a('Lisa',AF.knuffels),a('Kayra',AF.suiker),a('Anne',AF.makeover),a('Nikki',AF.pompoen),a('Ina',AF.ontvangst)]
  },
  '29/10':{
    aanspreek:['Kayra','Britt vL','Aisha','Marith'],
    opbouw:[o('Kayra',OP.knuffels.concat(OP.pompoenSchip)),
            o('Noemy',OP.suiker),o('Hailey',OP.makeover),o('Kato (s)',OP.pompoen),o('Pepijn (s)',Z('Kato')),o('Eliza',OP.ontvangst),o('Marith',['Meehelpen'])],
    draaiboek:[d('Kayra','Knuffels',null,'Vlinder'),d('Noemy (s)','Maskers maken'),d('Aisha','Suikerspin + knuffels',null,'Suikerspin 15u00 – 17u00 en 18u00 – 19u00'),
               d('Hailey','Kids make over'),d('Noami','Kids make over','17u30 – 19u00'),d('Kato (s)','Pompoen schilderen'),d('Pepijn (s)','Pompoen schilderen'),d('Eliza (s)','Ontvangst')],
    afbouw:[a('Kayra',AF.knuffels),a('Noemy (s)',Z('Kayra')),a('Aisha',AF.suiker),a('Hailey',AF.makeover),a('Noami',Z('Hailey')),a('Kato (s)',AF.pompoen),a('Pepijn (s)',Z('Kato')),a('Eliza (s)',AF.ontvangst)]
  },
  '31/10':{
    aanspreek:['Britt E.','Anita','Britt vL','Kayra'],
    opbouw:[o('Britt E.',OP.knuffelsSchip,'14u00 – 14u45'),o('Hailey',OP.suiker,'14u00 – 14u45'),o('Kayra',Z('Hailey'),'14u00 – 14u45'),o('Eline',OP.makeoverTafels,'14u00 – 14u45'),
            o('Britt vL',OP.pompoenSchip,'14u00 – 14u45'),o('Anita',OP.ontvangst,'14u00 – 14u45')],
    draaiboek:[d('Britt E.','Knuffels + maskers','14u45 – 19u00'),d('Hailey','Suikerspin','14u45 – 19u00'),d('Eline','Kids make over','14u45 – 19u00'),d('Britt vL','Pompoen schilderen'),
               d('Anita','Ontvangst','14u45 – 19u00'),d('Kayra','Ontvangst','14u45 – 19u00','Vlinder')],
    afbouw:[a('Britt E.',AF.knuffels),a('Hailey',AF.suiker),a('Eline',AF.makeover),a('Britt vL',AF.pompoen),a('Anita',AF.ontvangst)]
  },
  '05/11':{
    aanspreek:['Britt E.','Britt vL','Marith'],
    opbouw:[o('Britt E.',OP.knuffelsSchip),o('Ida',OP.suiker),o('Britt vL',OP.makeoverTafels),o('Aisha',OP.pompoenSchip),o('Kaat',OP.ontvangst),o('Marith',['Meehelpen'])],
    draaiboek:[d('Britt E.','Knuffels + maskers'),d('Ida','Suikerspin'),d('Britt vL','Kids make over'),d('Aisha','Pompoen schilderen'),d('Kaat','Ontvangst')],
    afbouw:[a('Britt E.',AF.knuffels),a('Ida',AF.suiker),a('Britt vL',AF.makeover),a('Aisha',AF.pompoen),a('Kaat',AF.ontvangst)]
  }
};

// ---------------------------------------------------------------- de activiteiten (info per post)
const POSTEN=[
  {titel:'Knuffels maken',sub:'Betalend · knuffels + maskers · beneden op het strandje',rijen:[['Waar','Beneden op het strandje, bij de andere betalende activiteiten en de maskers'],['Opbouw','Kar met knuffels + maskers onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay); tafels neerzetten en de activiteit klaarzetten'],['Afbouw','Tafels en stoelen terug onder het schip; alle spullen in de kar van knuffels + maskers; controleer dat alle benodigheden van het lijstje in de kar zitten']]},
  {titel:'Maskers maken',sub:'Gratis · beneden op het strandje',rijen:[['Waar','Beneden op het strandje'],['Opbouw','Samen met de knuffels: de kar met knuffels + maskers'],['Afbouw','Samen met de knuffels: alles terug in de kar']]},
  {titel:'Suikerspin',sub:'Gratis · eerste verdieping van het schip',rijen:[['Waar','Eerste verdieping van het schip, vanwege het stroompunt. De stroomaansluiting zit onder het schip, direct links bij binnenkomst: leg de verlengkabel langs de muur naar de eerste verdieping.'],['Opbouw','Zet de machine om 14u00 direct klaar en begin meteen met het voorbereiden van suikerspinnen; vuilniszak ophangen en handschoenen aan'],['Let op','Gebruik alle suiker op en laat geen suiker in het bakje zitten terwijl de heat-knop aanstaat, om verbranden te voorkomen.'],['Afbouw','Tafel en verlengkabel terug onder het schip; machine in de kar en naar het atelier; in het atelier de machine schoonmaken zoals in de briefing beschreven'],['Briefing','Marith geeft een korte briefing over het gebruik en het schoonmaken van de suikerspinmachine. Donderdag 22/10 geeft ze die briefing; Lisa is al komen kijken hoe het werkt.'],['Bekers','Er zijn nieuwe bekers voor de suikerspin besteld.']]},
  {titel:'Kids make over',sub:'Schminken (gratis), glittertattoo, bubble braid, scrunchies en hairbeads (betalend)',rijen:[['Waar','Schminken op de tweede verdieping van het schip, bij het roer: zet daar vier stoelen uit het atelier klaar. De betalende activiteiten beneden op het strandje.'],['Opbouw','Kar kids make over onder het schip halen (staat hij nog in het atelier: meenemen naar de Bay); vier stoelen uit het atelier bij het roer; tafels en stoelen van onder het schip op het strandje; activiteit klaarzetten'],['Afbouw','Tafels en stoelen terug onder het schip; spullen terug in de kar en checken of er iets aangevuld moet worden; kar terug naar het atelier brengen, alles schoonmaken en de kar achterlaten zoals meegenomen']]},
  {titel:'Pompoen schilderen',sub:'Betalend · beneden op het strandje',rijen:[['Waar','Beneden op het strandje'],['Opbouw','Kar pompoen schilderen ophalen (de pompoenen liggen onder het schip); tafels en stoelen neerzetten en de spullen klaarleggen'],['Tip aan de gasten','Vertel de gasten dat de stiften niet uit kleding gaan. Laat hen bij voorkeur kiezen tussen verf of stiften. Willen ze beide gebruiken, laat ze dan eerst met stiften werken en daarna met verf, niet andersom.'],['Afbouw','Tafels en stoelen terug onder het schip; spullen in de kar en kijken of er iets bijgevuld moet worden; kar onder het schip achterlaten zoals meegenomen. De pompoenen, stoelen en tafels gaan niet terug naar het atelier.']]},
  {titel:'Ontvangst',sub:'Aan de ingang van de Discovery Bay',rijen:[['Wat doe je','Je verwelkomt de gasten en informeert hen over de activiteiten die in de Bay plaatsvinden. Zorg dus dat je op de hoogte bent van alles wat er gebeurt. We verwachten dat je de gasten in Halloweenthema ontvangt (zie het welkomstpraatje op Start).'],
    ['Geef de juiste info','De kindertocht start op Pirate Place, beneden op het platform van Janneke. De volwassentocht start vooraan bij de ingang van de Bay, waar de tent staat.'],
    ['Opbouw','PDA klaarzetten; Berta de heks (de pop met het boek) in de eerste grot na de ingang zetten en links naast de deur aansluiten (Nikki weet waar); doos met lampionnen op de Pirates Place zetten, zodat het uit het zicht is tijdens de show'],['Afbouw','PDA opbergen onder het schip; Berta de heks afbouwen vóór de volwassentocht en in de lockerruimte zetten']]}
];

// ---------------------------------------------------------------- checklist
const CHECK=[
  {id:'f1',nr:1,titel:'Opbouw',tijd:'14u00 – 15u00',protocol:'Elke dag korte briefing in het atelier; daarna de bolderkarren naar de Bay.',groepen:[
    {naam:'Start',items:['Om 14u00 in het atelier voor de korte briefing','Bolderkarren onder het schip opgehaald (wat nog in het atelier stond, meegenomen naar de Bay)','Onder het schip omgekleed (zwarte kleding of een Halloweenoutfit) en daarna alles klaargezet: de tafels niet onbemand laten staan','PDA’s en betaalkastjes mee naar de Bay, om ter plaatse activiteiten te kunnen verkopen']},
    {naam:'Knuffels + maskers (strandje)',items:['Kar knuffels + maskers opgehaald','Tafels neergezet en activiteit klaargezet, beneden op het strandje']},
    {naam:'Suikerspin (eerste verdieping)',items:['Kar suikerspin opgehaald','Om 14u00 meteen klaargezet op de eerste verdieping van het schip: machine, vuilniszak, handschoenen','Verlengkabel van het stopcontact onder het schip (direct links bij binnenkomst) langs de muur naar de eerste verdieping','Meteen begonnen met het voorbereiden van suikerspinnen']},
    {naam:'Kids make over',items:['Kar kids make over opgehaald','Schminken op de tweede verdieping bij het roer, met vier stoelen uit het atelier','Betalende activiteiten klaargezet beneden op het strandje']},
    {naam:'Pompoen schilderen (strandje)',items:['Kar pompoen schilderen opgehaald (pompoenen liggen onder het schip)','Tafels en stoelen neergezet voor pompoen schilderen, beneden op het strandje','Spullen klaargelegd (verf en stiften)']},
    {naam:'Ontvangst',items:['PDA klaargezet','Berta de heks in de eerste grot na de ingang gezet en links naast de deur aangesloten','Doos met lampionnen op de Pirates Place gezet, uit het zicht tijdens de show','Welkomstpraatje paraat (NL, EN, DE, FR)','Je weet waar de tochten starten: kindertocht op Pirate Place (beneden op het platform van Janneke), volwassentocht vooraan bij de ingang van de Bay (aan de tent)']}
  ]},
  {id:'f2',nr:2,titel:'Tijdens de activiteiten',tijd:'± 14u45/15u00 – 19u00',protocol:'Ter info, geen vinkjes',info:true,groepen:[
    {naam:'Aanbod',items:['Betalend: knuffels maken, glittertattoo, bubble braid, scrunchies, hairbeads, pompoenen schilderen','Gratis: schminken, suikerspin, maskers maken','Entertainment verzorgt ook: lampionnen maken, silent disco, Orry & heks Halloweenshow, kindertochten en volwassentochten','Boeken van activiteiten kan ook altijd via de app']},
    {naam:'Werkwijze',items:['Je bent zoveel mogelijk verantwoordelijk voor je eigen activiteit, inclusief op- en afbouw','Ben je klaar en kan een collega hulp gebruiken, help dan mee','Ruilen van activiteiten kan, maar bespreek dit altijd even met de verantwoordelijke van die avond','Pompoen schilderen: stiften gaan niet uit kleding; liefst kiezen tussen verf of stiften, en bij beide eerst stiften, dan verf','Suikerspin: gebruik alle suiker op en laat geen suiker in het bakje zitten terwijl de heat-knop aanstaat','Zorg dat iedereen om de beurt tijd krijgt om zich om te kleden en te schminken']},
    {naam:'Pauzes & stagiaires',items:['Wie zes uur of langer werkt, heeft recht op pauze; stem onderling af wie wanneer gaat','De eerste pauze start vanaf 17u00, zodat iedereen vóór 19u00 pauze heeft gehad','Namen met een (s) zijn stagiaires van Kosh: leg de werkzaamheden goed uit, zodat ze tijdens pauzes zelfstandig gasten kunnen helpen']},
    {naam:'Veiligheid',items:['Bij een ernstig voorval of EHBO volg je dezelfde procedures als op de werkvloer','Kleine EHBO verzorgen we in de Bay zelf; bij twijfel val je terug op de DUTY en/of je leidinggevende','Het noodnummer van CP bel je alleen in echte noodgevallen']}
  ]},
  {id:'f3',nr:3,titel:'Afbouw',tijd:'19u00 – 22u00',protocol:'Om 19u00 eindigt het atelier; daarna afbouwen en helpen bij de ombouw.',groepen:[
    {naam:'19u00 – stap 1',items:['Spullen snel in de bolderkar gedaan','Kar, tafels en stoelen onder het schip gebracht (laat alles staan tot stap 2 gedaan is)']},
    {naam:'Tot 19u30 – stap 2',items:['Als eerste samen de grote kar voor Entertainment klaargezet: tentframe, zwarte bache, spandoek, posters en lint (de tent komt tegen de ingang van Discovery Bay; handleiding in de bak op de kar), snel en vóór de gasten aankomen','Daarna gemeld bij Marith of iemand van Entertainment en geholpen met de opbouw van de volwassentocht (zie het uitgeprinte draaiboek onder het schip)']},
    {naam:'Na de ombouw – stap 3 en 4',items:['De Halloween-kinderactiviteiten van je eigen afdeling verder opgeruimd','Alle spullen behalve de pompoenen, stoelen en tafels terug in de bolderkarren naar het atelier','In het atelier de karren gecontroleerd, aangevuld, opgeruimd en schoongemaakt','Materiaal opgeborgen zoals je het aan het begin van je shift ophaalde','Opgeraakte spullen aangevuld, of gemeld bij Marith','Suikerspinmachine schoongemaakt volgens de aparte briefing','Verlengkabels (gebruikt en ongebruikt) terug onder het schip']},
    {naam:'Ontvangst',items:['PDA opgeborgen onder het schip','Berta de heks afgebouwd vóór de volwassentocht en in de lockerruimte gezet']},
    {naam:'Afsluiten',items:['Collega’s geholpen met opruimen','Aan de verantwoordelijke laten weten dat je klaar bent en naar huis gaat (de dienst loopt tot 22u00)']}
  ]}
];

// ---------------------------------------------------------------- de activiteit
window.HW_ACT=window.HW_ACT||{};
window.HW_ACT.marktje={
  stand:'19/10/2026',
  data:['15/10','17/10','22/10','24/10','29/10','31/10','05/11'],
  nachten:N,scripts:{},
  tabs:[{id:'start',ic:'🛍️',t:'Start'},{id:'planning',ic:'📅',t:'Planning'},{id:'tijd',ic:'⏱️',t:'Uren'},{id:'activiteiten',ic:'🎨',t:'Activiteiten',type:'kaarten',uitleg:'Het aanbod en per post wat je opbouwt, afbouwt en waar je op moet letten.'},
        {id:'checklist',ic:'✅',t:'Checklist'},{id:'praktisch',ic:'⚠️',t:'Praktisch'},{id:'docs',ic:'📎',t:'Documenten'}],
  feiten:[['Opbouw','14u00'],['Atelier','± 14u45 – 19u00'],['Dienst','tot 22u00'],['1e pauze','vanaf 17u00'],['Waar','Discovery Bay']],
  verhaalTitel:'Wat is het marktje?',
  verhaal:['In de Discovery Bay vinden van ongeveer 14u45/15u00 tot 19u00 de Halloween-atelieractiviteiten voor kinderen plaats: knuffels maken, schminken, glittertattoo, bubble braid, scrunchies, hairbeads, pompoenen schilderen, suikerspin en maskers maken.',
           'Entertainment verzorgt daarnaast het maken van lampionnen, de silent disco, de Orry & heks Halloweenshow, de kindertochten en de volwassentochten. Daarom gaan er PDA’s en betaalkastjes mee naar de Discovery Bay, om ter plaatse nog activiteiten te kunnen verkopen. Boeken van activiteiten kan ook altijd via de app.',
           'Wie om 14u00 begint, wordt in het atelier verwacht voor een korte briefing. De bolderkarren met de materialen worden voortaan vooraf onder het schip gezet, zodat niet alles pas om 14u00 verplaatst hoeft te worden. Je kleedt je eerst onder het schip om, daarna zet je alles klaar: de tafels willen we niet onbemand laten staan.'],
  startKaartenVoor:[
    {titel:'🆕 Nieuw voor donderdag 22/10',sub:'Feedback uit de mail van het Halloween team (19/10). De afspraken van de vorige keer blijven gelden.',l:[
      'Opstart en opruimen liepen veel vlotter. Het opruimen loopt veel vlotter nu het atelier tussen de dienst door helpt: dat houden we zo.',
      'Suikerspinmachine: Marith geeft donderdag een korte briefing; Lisa is al komen kijken hoe het werkt. Er zijn nieuwe bekers voor de suikerspin besteld.',
      'Besteld (zie Overzicht → Praktisch → Bestellingen en materiaal): o.a. elastiek, extra stiften, extra schmink en nieuwe bekers voor de suikerspin.']},
    {titel:'🆕 Nieuw na de eerste avond',sub:'Werkpunten en afspraken uit de mail van het Halloween team (17/10).',l:[
      'De bolderkarren worden vooraf vanuit het atelier onder het schip gezet. Linse en/of Britt kunnen op maandag en vrijdag al een deel voorbereiden.',
      'Vaste plekken: beneden op het strandje alle betalende activiteiten en de maskers, op de eerste verdieping van het schip de suikerspin, op de tweede verdieping bij het roer het schminken (vier stoelen uit het atelier).',
      'Suikerspin: om 14u00 meteen klaarzetten en suikerspinnen voorbereiden. Gebruik alle suiker op en laat geen suiker in het bakje zitten terwijl de heat-knop aanstaat. Marith geeft er een korte briefing over.',
      'Ontvangst: Berta de heks komt in de eerste grot na de ingang (links naast de deur aansluiten) en wordt afgebouwd vóór de volwassentocht. Vertel de gasten waar de tochten starten: kindertocht op Pirate Place (beneden op het platform van Janneke), volwassentocht vooraan bij de ingang van de Bay (aan de tent).',
      'Om 19u00 de spullen onder het schip en dan eerst Entertainment helpen: als eerste samen de grote kar voor de tent klaarzetten (tentframe, zwarte bache, spandoek, posters en lint). Daarna naar het atelier om de karren te controleren, aan te vullen, op te ruimen en schoon te maken.']}
  ],
  startKaarten:[
    {titel:'De dag in vogelvlucht',tabel:{kop:['Tijd','Wat'],rijen:[['14u00 – 15u00','Klaarzetten van de Halloween-kinderactiviteiten'],['15u00 – 19u00','Halloween-kinderactiviteiten (atelier, in de Bay)'],['15u15 – 16u30','Orry & Friends Halloweenshow'],['16u30 – 19u00','Kindertochten'],['19u00 – 22u00','Klaarzetten van de tocht, opruimen en pauze'],['20u30 – 22u30','Volwassentochten']]}},
    {titel:'Welkomstpraatje voor de ontvangst',sub:'Je ontvangt de gasten aan de ingang van de Discovery Bay in Halloweenthema.',talen:{
      nl:['Welkom in de wereld van Halloween! Een hele spannende en griezelige tocht gewenst!'],
      en:['Welcome to the world of Halloween! We wish you a very exciting and delightful adventure!'],
      fr:['Bienvenue dans le monde d’Halloween! Nous te souhaitons une promenade passionnante et terriblement effrayante!'],
      de:['Willkommen in der Welt von Halloween! Wir wünschen dir eine spannende und schaurig-schöne Tour!']}},
    {titel:'Waar staat wat in de Bay?',rijen:WAAR},
    {titel:'Aanspreekpunten',p:['Per dag zijn twee of drie verantwoordelijken aangewezen (zie Planning). Marith is alle dagen aanwezig, behalve op 31/10; zij is medeverantwoordelijke voor het Halloweenproject. Heb je hulp nodig, bel dan bij voorkeur eerst Marith.'],
     nota:'Telefoonnummers staan in het draaiboek en in Contacten. De persoonlijke gsm-nummers zijn enkel voor deze Halloween-avonden en enkel als het nodig is.'}
  ],
  uurschema:[
    ['14u00','Start in het atelier','Korte briefing. De bolderkarren staan voortaan vooraf onder het schip (wat nog in het atelier staat, neem je mee). Je kleedt je onder het schip om.'],
    ['14u00 – 14u45/15u00','Klaarzetten','Elk de eigen activiteit klaarzetten op de vaste plek (zie Activiteiten). De suikerspin staat om 14u00 meteen klaar. Tafels niet onbemand laten.'],
    ['± 14u45/15u00','Start van de activiteiten','Tot 19u00 in de Bay.'],
    ['15u15 – 16u30','Orry & Friends Halloweenshow',''],
    ['16u30 – 19u00','Kindertochten',''],
    ['17u00','Eerste pauze mogelijk','Wie 6 uur of langer werkt heeft recht op pauze. Stem onderling af; iedereen heeft vóór 19u00 pauze gehad.'],
    ['19u00','Einde van het atelier','Spullen snel in de bolderkar; kar, tafels en stoelen onder het schip.'],
    ['19u00 – 19u30','Helpen bij de ombouw','Als eerste samen de grote kar voor de tent van Entertainment klaarzetten (aan de ingang van de Bay). Daarna melden bij Marith of iemand van Entertainment; het uitgeprinte draaiboek onder het schip zegt waar je nodig bent.'],
    ['19u30 – 22u00','Afbouw van je afdeling','In het atelier de karren controleren, aanvullen, opruimen en schoonmaken; materiaal opbergen zoals je het ophaalde. Verlengkabels terug onder het schip.'],
    ['22u00','Einde van de dienst','Eerder klaar? Eerst collega’s helpen en het aan de verantwoordelijke melden.']
  ],
  balk:{start:14*60,eind:22*60,segs:[
    ['Opbouw',14*60,14*60+50,'#d98a2b'],['Atelier',14*60+50,19*60,'#e8772e'],['Ombouw',19*60,19*60+30,'#8a5cc7'],['Afbouw',19*60+30,22*60,'#2f6b70']],
    uren:['14u00','15u00','17u00','19u00','22u00']},
  planning:{titel:'Draaiboek',kaarten:true,afbTijd:true,opbouwTitel:'Opbouw · 14u00 – 15u00',afbouwTitel:'Afbouw · 19u30 – 22u00'},
  nachtExtra:(n)=>(n&&n.aanspreek&&n.aanspreek.length)?{titel:'Aanspreekpunten van de avond',rijen:[['Bij vragen',n.aanspreek.join(' · ')]],
    nota:'Telefoonnummers staan in het draaiboek en in Contacten. Marith is alle dagen aanwezig, behalve op 31/10.'}:null,
  checklist:CHECK,
  rapport:['Incidenten / EHBO','Ontbrekend of kapot materiaal (ook wat aangevuld moet worden)','Opmerkingen voor de volgende avond'],
  praktisch:[
    {titel:'Werkwijze',rijen:[
      ['Verantwoordelijkheid','Tijdens de dag ben je zoveel mogelijk verantwoordelijk voor je eigen activiteit, inclusief de op- en afbouw. Ben je klaar en kan een collega hulp gebruiken, help dan mee.'],
      ['Ruilen','Onderling ruilen van activiteiten kan, maar bespreek dit altijd even met de verantwoordelijke van die avond.'],
      ['Kleding','Voorzie zwarte kleding (je kan hier nog kleding lenen om erover aan te doen) of een leuke Halloweenoutfit.'],
      ['Stagiaires','Namen met een (s) zijn stagiaires van Kosh die ondersteuning bieden. Leg de werkzaamheden goed uit, zodat zij tijdens pauzes zelfstandig gasten kunnen helpen.'],
      ['Pauze','Wie zes uur of langer werkt, heeft recht op pauze. Stem onderling af wie wanneer pauze neemt. De eerste pauze start vanaf 17u00, zodat iedereen vóór 19u00 pauze heeft gehad.'],
      ['Eten','Eten in de Evergreens is tijdens de dagen van de Halloweentochten niet echt mogelijk (geen ruimte voor speling): neem eigen eten mee voor de pauze. Ga je toch in de Evergreens eten, houd er dan rekening mee dat bestellen tijd kost, zeker met de drukte op dat uur.'],
      ['Op tijd','Zorg dat je echt op de afgesproken tijd in het atelier bent voor de briefing.'],
      ['Bolderkarren','Worden voortaan vooraf vanuit het atelier onder het schip gezet, zodat niet alles pas om 14u00 verplaatst hoeft te worden. Linse en/of Britt kunnen op maandag en vrijdag al een deel voorbereiden.'],
      ['Briefing op wisseldagen','De ateliermedewerkers van donderdag en zaterdag krijgen een briefing met wat vooraf kan gebeuren, inclusief decoratie.'],
      ['Na 19u00','Spullen onder het schip en dan eerst Entertainment helpen met de opbouw van de tochten, als eerste met de grote kar voor de tent. Daarna naar het atelier om de karren te controleren, aan te vullen, op te ruimen en schoon te maken. Dit werkte goed en houden we zo: het opruimen loopt veel vlotter nu het atelier tussen de dienst door helpt.'],
      ['Verlengsnoeren','Breng gebruikte en ongebruikte verlengsnoeren aan het einde van je shift terug onder het schip: we delen ze met meerdere afdelingen.']
    ]},
    {titel:'Betalen en boeken',rijen:[
      ['Betalend','Knuffels maken, glittertattoo, bubble braid, scrunchies, hairbeads, pompoenen schilderen'],
      ['Gratis','Schminken, suikerspin, maskers maken'],
      ['Ter plaatse','PDA’s en betaalkastjes gaan mee naar de Discovery Bay om ter plaatse activiteiten te kunnen verkopen. Boeken van activiteiten kan ook altijd via de app.']
    ]},
    {titel:'Ziek en nood',rijen:[
      ['Ziek','Meld dit altijd aan Marith (op 31 oktober aan Britt E.).'],
      ['EHBO / veiligheid','Gebeurt er iets ernstigs of is er een EHBO-geval, dan volgen we dezelfde procedures als op de werkvloer. Elk van jullie heeft een telefoon bij met het noodnummer van CP: dat bel je alleen in echte noodgevallen. Kleine EHBO kan door onze medewerkers zelf in de Bay verzorgd worden; bij twijfel val je terug op de DUTY en/of je leidinggevende.'],
      ['Telefoonnummers','Staan in het draaiboek en in Contacten, bewust niet op deze pagina.']
    ]}
  ],
  documenten:[{titel:'Draaiboek Halloween 2026',tekst:'Het overzicht van de hele Halloweenperiode (12/10 – 09/11).',id:'1qSIK18QpBqPlBt0mP0fWKqy9vuVSIWY4'}],
  mappen:[{titel:'Alles: Halloweenperiode 2026',id:'1PTdTRqa6ZeUv5jxgEispvTEfvfKI4rei',hoofd:true}]
};
window.HW_ACT.marktje.tabs.find(t=>t.id==='activiteiten').kaarten=[
  {titel:'Het aanbod',rijen:[['Betalend','Knuffels maken · glittertattoo · bubble braid · scrunchies · hairbeads · pompoenen schilderen'],['Gratis','Schminken · suikerspin · maskers maken'],
    ['Entertainment','Lampionnen maken · silent disco · Orry & heks Halloweenshow · kindertochten · volwassentochten']],
   nota:'Per post (Planning) staat wat er op- en afgebouwd moet worden. Welke activiteit precies bij welke post hoort, staat niet apart in het draaiboek.'},
  {titel:'Waar staat wat in de Bay?',rijen:WAAR}
].concat(POSTEN.map(p=>({titel:p.titel,sub:p.sub,rijen:p.rijen})));
})();

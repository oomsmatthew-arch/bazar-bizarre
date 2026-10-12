// =====================================================================
//  HALLOWEEN · THE OUTBREAK (volwassentocht) — de inhoud van de pagina.
//
//  Overgenomen uit de Drive-documenten (Manual, Draaiboek en Checklist verantwoordelijke),
//  stand 12/10/2026. De pagina zelf (paginas/halloween.html + js/halloween.js) bevat geen
//  inhoud meer: wil je een tekst, zone, stap of checklistpunt aanpassen, dan doe je dat hier.
//  De planning per avond en de gesproken teksten staan in js/halloween-bron.js (gegenereerd).
//
//  Met opzet NIET overgenomen: het wachtwoord van de PC, de code van het lichtpaneel en
//  de telefoonnummers. De site is openbaar bereikbaar; die staan in het Drive-draaiboek en
//  in Contacten.
// =====================================================================
(function(){
'use strict';
const F='../assets/halloween/';
const foto=(naam,tekst)=>({src:F+naam+'.jpg',tekst:tekst||''});

window.HW={

  info:{
    titel:'The Outbreak',
    ondertitel:'Volwassentocht · Halloween 2026 · Discovery Bay, Center Parcs De Vossemeren',
    // [dag/maand, dag van de week]
    data:['15/10','17/10','22/10','24/10','29/10','31/10','05/11'],
    jaar:2026,
    feiten:[
      ['Start','20u30'],['Laatste vertrek','22u20'],['Vanaf','10 jaar'],['Duur','15–20 min'],
      ['Tijdslot','10 min · 20 pers.'],['Nood','“Code 10”']
    ]
  },

  verhaal:[
    'Doorheen de dag zijn er meerdere vreemde paddenstoelen vastgesteld in deze bijzondere biotoop, genaamd ‘The Bay’. Het Centrum voor Ziektecontrole (CZC, in het Engels CDC) kwam snel ter plaatse en stelde een quarantainezone in, in en rond dit gebied. Iedereen wordt gevraagd zich te laten testen, zodat de mutatie zich niet verder kan verspreiden.',
    'Binnenin The Bay is iedereen geëvacueerd, met uitzondering van enkele ongelukkigen die niet op tijd hebben kunnen ontkomen. Het CZC voert daar onderzoek uit naar de vreemde paddenstoelen. Personen die zich aanmelden en symptomen van besmetting vertonen, worden in quarantaine geplaatst en opgegeven voor terminatie.',
    'De overlevenden hebben een kist met het vrijstelling gevonden, maar die zit op slot met een code van 4 cijfers. De gasten ontsnappen uit de quarantaine, volgen een afgebakend pad door The Bay en zoeken onderweg de cijfers — zonder gezien te worden door de CZC-medewerker. Aan het einde ligt de Safezone van de overlevenden: geven ze daar de volledige code juist in, dan gaat de kist open en krijgen ze een polsbandje.'
  ],

  // Zo verloopt de tocht, per gast. 'zone' verwijst naar een zone-id.
  stappen:[
    {nr:1,zone:'inkom',titel:'Aankomst & controle',tekst:'Een CZC-medewerker in overall en gasmasker begroet de gasten, scant de bandjes, neemt per gezelschap de temperatuur en plaatst iedereen “in quarantaine”.'},
    {nr:2,zone:'locker',titel:'Quarantaine & de kist',tekst:'Overlever 1 komt de groep halen, waarschuwt voor terminatie en vertelt over de kist met het vrijstelling. Om de 5–8 minuten vertrekt er een groep van max 8–10.'},
    {nr:3,zone:'sector2',titel:'Doorheen The Bay',tekst:'Op een afgebakend pad zoeken de gasten de cijfers 1, 3 en 7. Mutanten laten hen schrikken, achtervolgen en opjagen. De CZC-medewerker patrouilleert: zij mogen niet gezien worden.'},
    {nr:4,zone:'sector1',titel:'Extractiepunt',tekst:'Overlever 2 vraagt naar de eerste 3 cijfers. Fout of niets gevonden? Terug The Bay in. Juist? Dan mogen ze naar buiten.'},
    {nr:5,zone:'bos',titel:'Het bos',tekst:'Via de straatoversteek en de brug volgen ze een route door het bos. Onderweg vinden ze het laatste cijfer (9) en komen ze mutanten 4 en 5 tegen.'},
    {nr:6,zone:'bos',titel:'Safezone',tekst:'Overlever 3 bewaakt de kist. Met de juiste code gaat ze open en krijgt elke gast één polsbandje: “I SURVIVED HALLOWEEN – CENTER PARCS DE VOSSEMEREN”.'}
  ],

  code:{
    volledig:'7139',
    cijfers:[
      {c:'7',waar:'Op het pak van een mutant in The Bay (elke avond een andere mutant, maar er moet er altijd één dragen)'},
      {c:'1',waar:'Lichtgevende poster langs het pad in Sector 2'},
      {c:'3',waar:'Lichtgevende poster langs het pad in Sector 1'},
      {c:'9',waar:'Poster rechts van de vogelhut, op de bosroute'}
    ],
    posters:{
      '1':[foto('poster-1-overcome','Poster met de 1'),foto('poster-1-symptomen','Poster met de 1')],
      '3':[foto('poster-3-sterker','Poster met de 3'),foto('poster-3-symptomen','Poster met de 3')],
      '9':[foto('poster-9-selena','Poster met de 9'),foto('poster-9-kael','Poster met de 9')]
    },
    nota:'Lukt de code na enkele pogingen niet, dan hoort Overlever 3 via het oortje dat een andere overlever het ontbrekende cijfer gevonden heeft en kan hij één van de cijfers geven. Op 15/10 en 17/10 zijn er nog geen polsbandjes: dan krijgen de gasten een vrijstellingskaart.'
  },

  // ---------------------------------------------------------------- planning
  uurschema:[
    ['19u00','Ombouwen','Kan je je eigen zone al opzetten, doe dat dan meteen.'],
    ['19u30','Pauze',''],
    ['20u00','Portofoon ophalen en testen','De verantwoordelijke van de zone. Meteen om 19u zodat je bereikbaar bent voor vragen.'],
    ['20u00 – 20u20','Opbouw volwassentocht',''],
    ['20u20','Omkleden',''],
    ['20u25','Verplaatsen naar je zone','Iedereen op post, gemeld via de portofoon.'],
    ['20u30','Start van de Halloweentocht',''],
    ['22u20','Laatste vertrek',''],
    ['22u30 – 23u30','Afbouw','Wie iets afbouwt, heeft het ook opgezet.']
  ],

  tijdsloten:{
    start:'20:30', laatste:'22:20', stapMin:10, perSlot:20,
    regels:[
      ['Inschrijven','Gasten schrijven in per tijdslot van 10 minuten, met 20 personen per tijdslot.'],
      ['Vertrek','Om de 5–8 minuten vertrekt er een groep, van maximaal 8–10 personen.'],
      ['Groepen','Families en gezinnen blijven samen. Een groep van 20 splits je in twee.'],
      ['Duur','Een tocht duurt gemiddeld 15 à 20 minuten.'],
      ['Leeftijd','De tocht is toegankelijk vanaf 10 jaar.'],
      ['Tickets','Je scant de bandjes en kijkt of ze hun toegangsticket hebben. Hebben ze dit niet, dan kopen ze het via de betaalterminal.'],
      ['Pauzes','Er zijn geen pauzes voorzien in de tocht.']
    ]
  },

  praktisch:[
    {titel:'Tijdens de tocht',rijen:[
      ['Tijdsloten','Gasten schrijven in per tijdslot van 10 minuten, met 20 personen per tijdslot.'],
      ['Vertrek','Om de 5–8 minuten vertrekt er een groep.'],
      ['Duur','Een tocht duurt gemiddeld 15 à 20 minuten.'],
      ['Leeftijd','De tocht is toegankelijk vanaf 10 jaar.'],
      ['Pauzes','Er zijn geen pauzes voorzien.'],
      ['Gasten','Raak de gasten nooit aan en laat je ook niet door hen aanraken.']
    ]},
    {titel:'Veiligheid & nood',rijen:[
      ['Noodgeval: “Code 10”','Raakt iemand in paniek, valt die of wil hij/zij stoppen? Meld het via de portofoon met “Code 10” en je locatie. Speel niet verder en blijf bij de persoon tot er hulp is.'],
      ['Verantwoordelijke','De verantwoordelijke van de avond is bereikbaar via de portofoon.'],
      ['Toilet','Kan tussendoor, op de gebruikelijke plaats in Discovery Bay. Laat je collega’s wel even weten dat je gaat.'],
      ['Schrikmomenten','Geen schrikmomenten bij de straatoversteek, trappen, bruggen of andere risicopunten.'],
      ['Telefoonnummers','Staan in Contacten en in het Drive-draaiboek (bewust niet in deze pagina).']
    ]},
    {titel:'Faciliteiten',rijen:[
      ['Water','Achter de bar staan flesjes water: één à twee per persoon.'],
      ['Omkleden en schminken','Boven, in de kleedkamers.'],
      ['Eigen spullen','Laat je spullen achter in de kleedkamers.'],
      ['Gsm','Mag niet mee tijdens de tocht.'],
      ['Portofoons','Liggen in de hut. Per avond haalt één vaste persoon ze op en legt ze terug. Dat is ook de verantwoordelijke voor de zone.']
    ]},
    {titel:'Ombouw & afbouw',rijen:[
      ['Materiaal','Elke zone heeft een eigen IKEA-doos. Wat erin zit, staat per zone onder “Materiaal & afbouw”.'],
      ['Wie doet wat','Wie iets afbouwt, heeft het ook opgezet. Wie welke taak doet, staat per avond bij Planning.'],
      ['KIC-medewerkers','Je krijgt hulp van de KIC-medewerkers: zet hun hulp goed in.'],
      ['Rookmachine','Zet ze bij de afbouw eerst uit en laat ze afkoelen voor ze weggezet wordt.']
    ]}
  ],

  // ------------------------------------------------------------------ zones
  // rollen = de 'Karakter'-namen uit het draaiboek die bij deze zone horen.
  zones:[
  {
    id:'inkom', naam:'Inkom', kleur:'#8a5cc7', rollen:['CZC mdw 1','CZC mdw 2'],
    kort:'CZC-medewerker 1 & 2',
    plattegrond:foto('plattegrond-inkom','Plattegrond inkom, locker & ingang'),
    wat:[
      'De gasten komen aan bij The Bay en worden opgevangen door het CZC. Via doeken (en paars licht, tussen de 2 schuifdeuren) worden ze naar de lockers geleid. Daar staat een hek dat de rest van de inkom afschermt.',
      'CZC-medewerker 1 neemt per gezelschap de temperatuur, legt uit dat de gasten in quarantaine moeten en zegt duidelijk dat ze de collega’s/onderzoekers onderweg niet mogen aanraken.',
      'CZC-medewerker 2 helpt naargelang de drukte als scanner aan de inkom of patrouilleert in The Bay. Je scant de bandjes en kijkt of ze hun toegangsticket hebben; hebben ze dit niet, dan moeten ze dit nog kopen via de betaalterminal.'
    ],
    aandacht:[
      'Gasten schrijven in per tijdslot van 10 minuten, met 20 personen per tijdslot. Overlever 1 komt de groep halen en brengt ze naar de lockers. Daar vertrekken ongeveer om de 5 minuten de groepen, een groep is max 8–10 personen.',
      'Je komt NOOIT in contact met de overlever die het na jou overneemt; jullie zien of erkennen elkaar niet. Althans: de gasten zien niet dat jullie in contact komen.',
      'Noodgeval: meld je via de portofoon met “Code 10” en je locatie. De verantwoordelijke van de avond is bereikbaar via de portofoon.'
    ],
    personages:[
      {naam:'CZC-medewerker 1',sub:'Scanner · eerste contact',script:'czc1',
       wie:['Jij bent het eerste contact met de gasten en je straalt orde en discipline uit. Er wordt naar je geluisterd, of je zorgt er wel voor dat de gasten luisteren. Het is immers jouw taak om de controle en quarantaine van mogelijke geïnfecteerden vlot te laten verlopen.',
            'Doorheen de dag zijn er in The Bay verschillende vreemde paddenstoelen vastgesteld. Het CZC heeft het gebied afgesloten en iedereen die mogelijk in contact is gekomen met de besmetting moet gecontroleerd worden.',
            'Je geeft nooit de indruk dat de mensen hier mogelijk voor terminatie worden vastgehouden, maar probeert ze gerust te stellen. Alles is onder controle, er is geen reden tot paniek. Je weet echter dat personen met duidelijke symptomen in quarantaine worden geplaatst en mogelijk worden opgegeven voor terminatie.',
            'Je controleert de mensen die zich aanmelden, neemt hun temperatuur en stuurt hen door naar de wachtruimte. Je behandelt ieder gezelschap apart. Je zegt de gasten ook duidelijk dat ze de collega’s/onderzoekers onderweg niet mogen aanraken.'],
       tip:'Het is belangrijk deze tekst in het Nederlands en het Engels te kennen. De tekst is een leidraad, je mag creatief met de tekst omgaan.',
       zelf:['Wandelschoenen','Zwarte (thermische) onderkleding'],cp:['Witte overall','Gasmasker','Handschoenen latex'],
       attr:['Warmtecamera (scanner)','PDA','Betaalterminal','Tikkaart'],
       fotos:[foto('czc-pak','Het CZC-pak met gasmasker')]},
      {naam:'CZC-medewerker 2',sub:'Scanner / patrouille',script:'czc2',
       wie:['Je bent een medewerker van het CZC. Je bent The Bay ingestuurd om onderzoek te doen naar de vreemde paddenstoelen en om achtergebleven personen op te sporen. Naargelang de drukte help je ook aan de inkom als scanner.',
            'Doordat je al lange tijd in het besmette gebied rondloopt, begin je zelf vreemd gedrag te vertonen. Misschien werkt dat gasmasker toch niet zo goed… Je patrouilleert door The Bay en bewaakt het onderzoeksgebied. De gasten proberen ongezien langs jou te geraken.',
            'Je verrast de gasten door plots in beeld te komen, rent achter ze aan en keert daarna terug. Je bent onvoorspelbaar en griezelig. Je hebt geen vaste tekst, maar schreeuwt en roept wel.'],
       tip:'Onder het witte pak draag je overleverskledij, zodat je makkelijk van rol kunt wisselen als er hulp nodig is.',
       zelf:['Wandelschoenen'],cp:['Witte overall','Gasmasker','Handschoenen latex'],
       attr:['Warmtecamera (scanner)','PDA','Betaalterminal','Tikkaart']}
    ],
    materiaal:[
      {groep:'Inkom & aankleding',items:['Partytent','Posters (doos)','Zwarte doek voor de schuifdeur (doos)','Zwarte doek voor de poortjes (doos)','Posters in de vestiaire (doos)']},
      {groep:'Hekken & licht',items:['Hek met twee betonblokken','Lamp aan het hek bij de doorgang (doos)']},
      {groep:'Afsluiten',items:['Checken dat het poortje dicht is']},
      {groep:'Backoffice',items:['2× PDA (ligt in de hut)','2× betaalterminal (ligt in de hut)','Eigen tikkaart']}
    ],
    opbouw:[
      'Zwarte doek achter de schuifdeur. Er hangen bevestigingspunten rechts en links.',
      'Zet de schuifdeur ook op open wanneer we gaan starten, zodat ze niet dichtgaat.',
      'Er komt een hek te staan zodat gasten niet naar links kunnen maar naar rechts gestuurd worden.',
      'De lamp mag aan het hek gehangen worden. Leg dan stroom tot bij het tweede hek aan het vlot: tussen de planten links heb je een stopcontact.',
      'Stel de tent vooraan op. Zet met afzetlint de buitenkant af, zodat gasten een route hebben om aan te schuiven.',
      'Zowel aan de tent, de wachtruimte als de lockerruimte mogen posters hangen met ductape.'
    ],
    fotos:[
      foto('inkom-tent','De partytent aan de inkom, met de wachtrij'),
      foto('inkom-zwarte-doek','Zwarte doek achter de schuifdeur'),
      foto('inkom-hek','Het hek bij de lockers: gasten gaan naar rechts'),
      foto('poster-symptomen','Poster “Symptomen van mutatie”'),
      foto('poster-sheep','Poster “They think we’re sheep”'),
      foto('poster-overcome','Poster “Together we shall overcome”')
    ]
  },
  {
    id:'locker', naam:'Locker & Ingang', kleur:'#8a5cc7', rollen:['Overlever 1'],
    kort:'Overlever 1',
    plattegrond:foto('plattegrond-inkom','Plattegrond inkom, locker & ingang'),
    wat:[
      'In de quarantainezone wachten de gasten op verdere instructies. Overlever 1 komt binnen en neemt hen mee naar de lockerruimte ernaast. Hier waarschuwt hij/zij hen voor terminatie en vertelt over de kist met het vrijstelling. Daarna stuurt hij de groepen één voor één het pad door The Bay op.'
    ],
    aandacht:[
      'Ongeveer om de 5 minuten vertrekt er een groep. Groepen van 8 tot max 10 personen mogen vertrekken. Behoud families en gezinnen samen, maar splits de groep van 20.',
      'Je blijft ALTIJD uit het zicht van de CZC-medewerker en van de mensen die nog buiten staan.',
      'Noodgeval: meld je via de portofoon met “Code 10” en je locatie. De verantwoordelijke van de avond is bereikbaar via de portofoon.'
    ],
    personages:[
      {naam:'Overlever 1',sub:'Vlot in NL/EN',script:'overlever1',
       wie:['Wanneer de gasten in de quarantainezone zitten te wachten, maak je hen duidelijk dat ze in gevaar zijn. Je weet dat personen die duidelijke symptomen vertonen niet zomaar onderzocht worden maar mogelijk worden opgegeven voor terminatie.',
            'Samen met andere overlevenden heb je een kist gevonden met daarin een vrijstelling. De kist zit echter op slot met een code van 4 cijfers. De eerste 3 cijfers vinden de gasten in The Bay: de 1 en de 3 hangen langs het pad en rond de paddenstoelen, en de 7 staat op het pak van een van de mutanten.',
            'De gasten moeten ontsnappen uit de quarantainezone, het afgebakende pad doorheen The Bay volgen en onderweg de cijfers zoeken. Ze mogen daarbij niet gezien worden door de CZC-medewerker die binnen rondloopt.',
            'Jij bepaalt wie wanneer aan de tocht begint. Er moet ongeveer om de 5–8 minuten een groep vertrekken. Zijn er kleinere gezelschappen, deel ze dan logisch in. Groepen van 8 personen of meer splits je indien mogelijk op.'],
       tip:'Je moet er overtuigend uitzien als overlever. In de kast hangen verkleedspullen; gebruik vooral alles wat je vindt.',
       zelf:['Zwarte (thermische) onderkleding','Bruine broek (lang of kort)','Wandelschoenen','Dikke handschoenen'],
       cp:['Beige/grijs T-shirt','Militaire jas','Gasmasker'],attr:['Walkietalkie','Geweer'],
       fotos:[foto('kostuum-overlever','Voorbeeld van de overleverskledij')]}
    ],
    materiaal:[
      {groep:'Inkom & aankleding',items:['Partytent','Posters (doos)','Zwarte doek voor de schuifdeur (doos)','Zwarte doek voor de poortjes (doos)','Posters in de vestiaire (doos)']},
      {groep:'Hekken & licht',items:['Hek met twee betonblokken','Lamp aan het hek bij de doorgang']},
      {groep:'Toegangspoortjes',items:['Checken dat het poortje open kan en blijft staan, anders melden aan de verantwoordelijke']}
    ],
    opbouw:[
      'Zwarte doek achter de schuifdeur. Er hangen bevestigingspunten rechts en links.',
      'Zet de schuifdeur ook op open wanneer we gaan starten, zodat ze niet dichtgaat.',
      'Er komt een hek te staan zodat gasten niet naar links kunnen maar naar rechts gestuurd worden.',
      'De lamp mag aan het hek gehangen worden. Leg dan stroom tot bij het tweede hek aan het vlot: tussen de planten links heb je een stopcontact.',
      'Stel de tent vooraan op. Zet met afzetlint de buitenkant af, zodat gasten een route hebben om aan te schuiven.',
      'Zowel aan de tent, de wachtruimte als de lockerruimte mogen posters hangen met ductape.'
    ],
    fotos:[
      foto('inkom-zwarte-doek','Zwarte doek achter de schuifdeur'),
      foto('inkom-hek','Het hek bij de lockers'),
      foto('inkom-tent','De partytent aan de inkom'),
      foto('poster-symptomen','Poster “Symptomen van mutatie”'),
      foto('poster-sheep','Poster “They think we’re sheep”'),
      foto('poster-overcome','Poster “Together we shall overcome”')
    ]
  },
  {
    id:'sector1', naam:'Sector 1', kleur:'#2f8f9d', rollen:['Overlever 2','Overlever CZC'],
    kort:'Overlever 2 (extractiepunt) · Overlever/CZC',
    plattegrond:foto('plattegrond-sectors','Plattegrond sector 1 en sector 2'),
    wat:[
      'Aan het einde van het pad door The Bay ligt het extractiepunt. Overlever 2 controleert hier de eerste 3 cijfers van de code. Zijn ze fout, dan gaan de gasten terug The Bay in. Zijn ze juist, dan stuurt hij hen naar buiten links, de route naar het bos op.',
      'De rol Overlever/CZC wisselt naargelang wat nodig is tussen overlever aan het extractiepunt en CZC-medewerker op patrouille. Daarom staan beide scripts bij deze zone.'
    ],
    aandacht:[
      'De eerste 3 cijfers van de code zijn 7, 1 en 3. De 1 en de 3 hangen langs het pad, de 7 staat op het pak van een van de mutanten.',
      'In sector 1/2 staat een rookmachine (exacte plek nog te bepalen). De mutant in die zone bedient ze met een drukknop.',
      'Noodgeval: meld je via de portofoon met “Code 10” en je locatie. De verantwoordelijke van de avond is bereikbaar via de portofoon.'
    ],
    personages:[
      {naam:'Overlever 2',sub:'Extractiepunt',script:'overlever2',
       wie:['Jij staat aan het einde van het parcours door The Bay, aan het extractiepunt. Je maakt deel uit van het extractieteam van de overlevenden. De gasten hebben onderweg de eerste 3 cijfers van de code moeten zoeken: 7, 1 en 3.',
            'Zie je gasten aankomen, dan lok je ze naar je toe en vraag je naar de 3 cijfers die ze gevonden hebben. Hebben ze de cijfers niet gevonden of zijn ze fout, dan stuur je hen terug The Bay in om opnieuw te zoeken. Je opent het hek en ze mogen de route opnieuw doen.',
            'Zijn de cijfers correct, dan mogen ze The Bay verlaten. Je legt hen uit dat ze de route door het bos moeten volgen en dat ze onderweg het laatste cijfer van de code vinden. Aan het einde van die route ligt de Safezone, waar de kist met het vrijstelling staat.'],
       tip:'Je moet er overtuigend uitzien als overlever. In de kast hangen verkleedspullen; gebruik vooral alles wat je vindt.',
       zelf:['Zwarte (thermische) onderkleding','Bruine of zwarte broek (lang of kort)','Wandelschoenen','Dikke handschoenen'],
       cp:['Beige/grijs T-shirt','Militaire jas','Gasmasker'],attr:['Walkietalkie','Geweer','Stok'],
       fotos:[foto('jas-bruin','Overleversjas'),foto('jas-bont','Overleversjas met bont'),foto('kostuum-overlever','Voorbeeld van de overleverskledij')]},
      {naam:'Overlever / CZC',sub:'Wisselrol: extractiepunt én patrouille',script:'overlever2',scriptExtra:'czc2',
       wie:['Als overlever sta je aan het extractiepunt en doe je hetzelfde als Overlever 2 (zie hierboven). Tegelijk ben je ook een CZC en kan je uithelpen op plaatsen als dat nodig is.',
            'Als CZC ben je The Bay ingestuurd om onderzoek te doen naar de vreemde paddenstoelen en om achtergebleven personen op te sporen. Naargelang de drukte help je ook aan de inkom als scanner. Doordat je al lange tijd in het besmette gebied rondloopt, begin je zelf vreemd gedrag te vertonen. Je patrouilleert door The Bay en bewaakt het onderzoeksgebied; de gasten proberen ongezien langs jou te geraken. Je verrast de gasten door plots in beeld te komen, rent achter ze aan en keert daarna terug. Je hebt geen vaste tekst, maar schreeuwt en roept wel.'],
       tip:'Onder het witte pak draag je overleverskledij, zodat je makkelijk van rol kunt wisselen. Het script is hetzelfde als dat van Overlever 2; als CZC gebruik je de roepteksten van CZC-medewerker 2.',
       zelf:['Wandelschoenen'],cp:['Witte overall','Gasmasker','Handschoenen latex'],
       attr:['Warmtecamera (scanner)','PDA','Betaalterminal','Tikkaart']}
    ],
    materiaal:[
      {groep:'Lint (doos)',items:['Bootje (langs 2 kanten)','Klimrek (langs 2 kanten)','Trappenhal (plan)','Trap naar het strand (vanuit de gang)','Wiebelbrug','Trap naar het schip via het strand']},
      {groep:'Aankleding',items:['Paddenstoelen doorheen de zone (doos)']},
      {groep:'Hek',items:['Hek plaatsen tussen Sector 1 en Sector 2, aan de ingang van de rotsen']}
    ],
    opbouw:[
      'Gasten wandelen langs het schip; rechts spannen we af zodat ze niet naar de waterval kunnen gaan.',
      'Vergeet zeker de wiebelbrug niet mee te nemen!',
      'De route naar de bar vanuit het strand wordt ook afgespannen.',
      'De route naar de glijbaan en de grot wordt ook afgespannen.',
      'Voor de grot komt een hek te staan; hier moeten de gasten door als ze niet de juiste code hebben.',
      'Doorheen de route mogen posters opgehangen worden met ductape. De poster met het cijfer 3 moet hier zeker hangen!',
      'Leg ook zeker de paddenstoelen verspreid over de route.'
    ],
    fotos:[
      foto('s1-lint-schip','Afgespannen pad langs het schip'),
      foto('s1-lint-trap','Afgespannen route'),
      foto('s1-lint-rotsen','Afgespannen route bij de rotsen'),
      foto('s1-hek-grot','Het hek voor de grot (naar de uitgang richting bos)'),
      foto('poster-3-sterker','Poster met de 3'),
      foto('poster-3-symptomen','Poster met de 3')
    ]
  },
  {
    id:'sector2', naam:'Sector 2', kleur:'#e2683f', rollen:['CZC mutant 1','CZC mutant 2','CZC mutant 3'],
    kort:'CZC-mutant 1, 2 & 3',
    plattegrond:foto('plattegrond-sectors','Plattegrond sector 1 en sector 2'),
    wat:[
      'Dit is het hart van The Bay. De mutanten bewegen zich elk vrij binnen hun eigen zone langs het pad en laten de gasten schrikken, achtervolgen en opjagen. Onderweg zoeken de gasten de eerste 3 cijfers van de code: de 1 en de 3 hangen langs het pad, de 7 staat op het pak van een van de mutanten.'
    ],
    aandacht:[
      'In sector 1/2 staat een rookmachine (exacte plek nog te bepalen). De mutant in die zone bedient ze met een drukknop. Geef korte stoten, zodat het pad zichtbaar en veilig blijft.',
      'Eén mutant in The Bay draagt elke avond het pak met de 7. Raak de gasten nooit aan en laat je ook niet door hen aanraken.',
      'Noodgeval: meld je via de portofoon met “Code 10” en je locatie. De verantwoordelijke van de avond is bereikbaar via de portofoon.'
    ],
    personages:[
      {naam:'CZC-mutant',sub:'Mutant 1, 2 en 3',script:'mutant',
       wie:['Je was een medewerker van het CZC en werd The Bay ingestuurd om de vreemde paddenstoelen te onderzoeken. Je bent te lang in het besmette gebied gebleven en de besmetting heeft het van je overgenomen. Je bent geen mens meer, maar je draagt nog altijd je CZC-pak. Mutanten staan zowel in The Bay als in het bos.',
            'Eén van de pakken heeft een 7 op de rug of borst: dat is een cijfer van de code. Het maakt niet uit wie het draagt, maar een mutant in The Bay moet het elke avond aan hebben.',
            'Je beweegt je vrij binnen je eigen zone langs het afgebakende pad. Je verstopt je, loert en komt dan plots in beeld om de gasten te laten schrikken. Je achtervolgt en jaagt ze op, maar je blijft altijd binnen je zone en verdeelt je met de andere mutanten, zodat de gasten op meerdere plekken verrast worden. Je raakt de gasten nooit aan en laat je ook niet door hen aanraken.',
            'Sta je in de zone van de rookmachine, dan bedien jij ze met de drukknop. Gebruik de rook om je te verstoppen en kom er plots uit tevoorschijn. Geef korte stoten, zodat het pad zichtbaar en veilig blijft. Je hebt geen vaste tekst, maar communiceert via gegrom, gekreun, gesis en losse woorden.'],
       tip:'De witte pakken zijn vooraf bewerkt met bloed en scheuren. Werk daarnaast met schmink zodat je er duidelijk besmet uitziet. Deze kledij geldt voor alle mutanten, in The Bay en in het bos.',
       zelf:['Wandelschoenen'],cp:['Witte overall','Gasmasker','Handschoenen latex'],
       attr:['Drukknop rookmachine (indien in jouw zone)'],
       fotos:[foto('czc-pak','Het CZC-pak met gasmasker')]}
    ],
    materiaal:[
      {groep:'Hekken & lint (doos)',items:['Hek tussen extractiepunt en doorgang aquaria','Lint bij de ingang van het schip','Lint tussen schip en watergrot (smalle doorgang)','Lint bij de trap naar de rivier','Lint bij het trapje van Pirate Place']},
      {groep:'Aankleding',items:['Paddenstoelen doorheen de zone (doos)']},
      {groep:'Bar',items:['Tafels en stoelen door elkaar zetten voor de bar']}
    ],
    opbouw:[
      'Er komt een hek te staan, zo kunnen gasten niet naar de andere kant.',
      'De wc en de kleedkamer worden afgespannen.',
      'Verspreid de tafels en stoelen doorheen de gang voor de bar; maak duidelijk dat gasten een omweg moeten maken.',
      'Lint bij de klimmuur naar beneden en bij de trap naar het water.',
      'De route in de grot en de toegang tot het strand worden afgespannen. Neem zeker tape mee om de linten vast te tapen.',
      'De route in de grot, de toegang tot de High Adventure en de waterval worden afgespannen. Neem zeker tape mee om de linten vast te tapen.',
      'Doorheen de route mogen posters opgehangen worden met ductape. De poster met het cijfer 1 hoort hier te hangen (de foto’s van het draaiboek tonen de 1).',
      'Verspreid de paddenstoelen doorheen de route.'
    ],
    fotos:[
      foto('s2-hek-grot','Hek bij de ingang van de grot'),
      foto('s2-lint-1','Afgespannen route bij de rotsen'),
      foto('s2-lint-grot-1','Afgespannen route in de grot'),
      foto('s2-lint-grot-2','Afgespannen route in de grot'),
      foto('poster-1-overcome','Poster met de 1'),
      foto('poster-1-symptomen','Poster met de 1'),
      foto('poster-wanted-ash','Poster “Wanted”'),
      foto('poster-we-are-your-friend','Poster “We are your friend”')
    ]
  },
  {
    id:'bos', naam:'Buiten bos & Safezone', kleur:'#4a9b5e', rollen:['CZC mutant 4','CZC mutant 5','Overlever 3'],
    kort:'CZC-mutant 4 & 5 · Overlever 3',
    plattegrond:foto('plattegrond-bos','Plattegrond buiten bos & Safezone'),
    wat:[
      'Buiten volgen de gasten een afgebakende route naar en door het bos. Onderweg vinden ze het laatste cijfer van de code (9) en komen ze mutanten 4 en 5 tegen. Aan het einde ligt de Safezone, waar Overlever 3 de kist met het vrijstelling bewaakt. De volledige code is 7139.'
    ],
    aandacht:[
      'Lukt de code na enkele pogingen niet, dan hoort Overlever 3 via het oortje dat een andere overlever het ontbrekende cijfer gevonden heeft en kan hij één van de cijfers geven.',
      'Elke gast krijgt één polsbandje; de kist ligt vol voor de hele avond. Op 15/10 en 17/10 zijn er nog geen bandjes: dan krijgen de gasten een vrijstelling.',
      'Geen schrikmomenten bij de straatoversteek.',
      'Noodgeval: meld je via de portofoon met “Code 10” en je locatie. De verantwoordelijke van de avond is bereikbaar via de portofoon.'
    ],
    personages:[
      {naam:'CZC-mutant',sub:'Mutant 4 en 5',script:'mutant',
       wie:['Je was een medewerker van het CZC en werd The Bay ingestuurd om de vreemde paddenstoelen te onderzoeken. Je bent te lang in het besmette gebied gebleven en de besmetting heeft het van je overgenomen. Je bent geen mens meer, maar je draagt nog altijd je CZC-pak. Mutanten staan zowel in The Bay als in het bos.',
            'Je beweegt je vrij binnen je eigen zone langs het afgebakende pad. Je verstopt je, loert en komt dan plots in beeld om de gasten te laten schrikken. Je achtervolgt en jaagt ze op, maar je blijft altijd binnen je zone en verdeelt je met de andere mutanten. Je raakt de gasten nooit aan en laat je ook niet door hen aanraken.',
            'Je hebt geen vaste tekst, maar communiceert via gegrom, gekreun, gesis en losse woorden.'],
       tip:'De witte pakken zijn vooraf bewerkt met bloed en scheuren. Werk daarnaast met schmink zodat je er duidelijk besmet uitziet.',
       zelf:['Wandelschoenen'],cp:['Witte overall','Gasmasker','Handschoenen latex'],attr:[]},
      {naam:'Overlever 3',sub:'Safezone',script:'overlever3',
       wie:['Jij bent een overlever en staat aan het einde van de tocht, in de Safezone. De gasten hebben The Bay verlaten, de route door het bos gevolgd en onderweg het laatste cijfer van de code gevonden.',
            'In de Safezone staat de afgesloten kist met het vrijstelling. De gasten geven hier de volledige code in: 7139. Lukt het na enkele pogingen niet, dan krijg je via je oortje te horen dat een andere overlever het ontbrekende cijfer gevonden heeft, en help je de groep verder. Is de code correct, dan gaat de kist open.',
            'Als beloning krijgt iedere gast één polsbandje met daarop: “I SURVIVED HALLOWEEN – CENTER PARCS DE VOSSEMEREN”. Op 15/10 en 17/10 zijn er nog geen polsbandjes; dan krijgen de gasten enkel een vrijstellingskaart. Je zorgt ervoor dat de gasten het gevoel krijgen dat ze het gehaald hebben en nu veilig zijn.'],
       tip:'Je moet er overtuigend uitzien als overlever. In de kast hangen verkleedspullen; gebruik vooral alles wat je vindt.',
       zelf:['Zwarte (thermische) onderkleding','Bruine of zwarte broek (lang of kort)','Wandelschoenen','Dikke handschoenen'],
       cp:['Beige/grijs T-shirt','Militaire jas','Gasmasker'],attr:['Walkietalkie','Geweer','Stok','Safezone-kist'],
       fotos:[foto('jas-bruin','Overleversjas'),foto('jas-bont','Overleversjas met bont')]}
    ],
    materiaal:[
      {groep:'Lint (doos)',items:['Lint doorheen het bos']},
      {groep:'Licht & geluid',items:['2 ledbars','Muziekbox en tablet']},
      {groep:'Safezone (aparte doos, flightcase)',items:['Safezone-kist (check dat er voldoende bandjes in zitten, anders bijvullen: te vinden in de Halloweenkast)']},
      {groep:'Terugbrengen',items:['Het materiaal uit het buitenbos samen binnenbrengen']}
    ],
    opbouw:[
      'Stuur gasten richting het bos en niet richting de ingang van de Bay.',
      'Aan het einde van de gang komt een lamp die gericht is op de gang. Dit verblindt de gasten een beetje; uitleg staat bij Techniek. Hang aan de lamp de poster “rechts oversteken”.',
      'Gasten moeten de straat oversteken richting het zand. Ook hier mag lint hangen, zodat het opvalt waar ze heen moeten.',
      'Ze steken dan de brug over richting het bos.',
      'De ledbar en de box staan bij de vogelhut; uitleg vind je bij Techniek. De lampen mogen lichtjes schuin staan.',
      'Verspreid lint door het bos zodat we een veilige doorgang krijgen.',
      'Op het eindpunt ligt ook nog een ledbar op de grond. De lampen mogen lichtjes schuin staan.',
      'De poster met de 9 hang je rechts van de vogelhut.'
    ],
    fotos:[
      foto('bos-gang','De gang langs het gebouw, richting de straat'),
      foto('bos-niet-richting-bay','Niet richting de ingang van de Bay sturen'),
      foto('bos-lamp-gericht','Lamp gericht op het pad'),
      foto('poster-rechts-oversteken','Poster bij de lamp: “Rechts oversteken. Safezone: het bos.”'),
      foto('bos-straat','De straatoversteek'),
      foto('bos-brug','De brug naar het bos'),
      foto('bos-vogelhut','De vogelhut met ledbar en box'),
      foto('bos-lint-1','Lint door het bos'),
      foto('bos-lint-2','Lint door het bos'),
      foto('bos-eindpunt','Het eindpunt'),
      foto('poster-9-selena','Poster met de 9'),
      foto('poster-9-kael','Poster met de 9')
    ]
  }
  ],

  // --------------------------------------------------------------- techniek
  techniek:{
    intro:'Wie de techniek opzet en afbouwt, staat per avond bij Planning. De verantwoordelijken van de tocht (Marith & Matthew) zorgen dat alles klaarligt.',
    overzicht:[
      ['PC + techniektafel','In de hut','In de hut','Opruimen'],
      ['Muziek (tablets en muziekboxen)','In de hut','1 box en 1 tablet mee naar het bos','Muziek uit, tablets en boxen binnenbrengen'],
      ['Ledbars','Onder het schip','In het bos','Binnenbrengen'],
      ['Lichtpaneel','In de hut','In de hut','Normaal/uit zetten'],
      ['Atkins (lampen)','Atkins-ruimte','Atkins-ruimte','Lampen uitzetten'],
      ['Rookmachine + drukknop','Onder het schip','In sector 2','Uitzetten, laten afkoelen, opruimen'],
      ['Lichtstatief bij nooddeur','Onder het schip, achter de zwarte doek (Piraat disco)','Aan de nooddeur','Opruimen'],
      ['Portofoons','In de hut','In de hut','Verzamelen en opladen']
    ],
    kop:['Toestel','Waar vind je het?','Opzetten & aanzetten','Afbouw'],
    blokken:[
      {id:'pc',titel:'PC + techniekrack',stappen:[
        'Doe de flightcase open van de techniektafel en leg stroom aan. De witte stroomkabel vind je achteraan in de flightcase; steek hem rechts daarvan in.',
        'Steek beide XLR-kabels in onderaan de techniekrack (ze hangen onder de elektriciteitskast, links van de PC).',
        'Zet op het mengpaneel de main slider op 0 (rode slider) en alle andere sliders naar beneden.',
        'Plug de mini jack (aux) in de PC. Dat is een lange kabel die op de sliders ligt.',
        'Start de PC op met het Entertainment-account. De aanmeldgegevens staan in het Drive-draaiboek (bewust niet in deze pagina).',
        'Selecteer op het bureaublad de map “Halloween” en start het bestand dat daarin zit: de muziekspeler opent.',
        'Zorg ervoor dat het bestand op repeat 1 staat.'],
       fotos:[foto('pc-rack','De techniekrack'),foto('pc-stroom','Stroom aansluiten'),foto('pc-stekkers','Stekkers'),foto('pc-xlr','De XLR-kabels'),foto('pc-kabels','Kabels onder de elektriciteitskast'),foto('pc-mengpaneel','Mengpaneel: main slider op 0'),foto('pc-minijack','Mini jack (aux) in de PC'),foto('pc-muziekspeler','De muziekspeler')]},
      {id:'muziek',titel:'Tablet en muziekboxen',stappen:[
        'Zet de box aan en verbind de box met de tablet via Bluetooth. Bluetooth zoeken op de box doe je door het knopje lang in te duwen tot het blauw wordt.',
        'Als je de tablet opstart zie je op de eerste pagina een mapje “Halloween”. Open het en speel de track af die erin staat. Zowel op de blauwe als de groene tablet vind je dit terug.',
        'Zorg dat het bestand op loop staat.',
        'Vind je het niet? Ga naar: Bestanden → Interne opslag → Music → Halloween → “Dark forest…”.',
        'Plaats de box onder de vogelhut, gericht naar de ingang van het bos. Voel aan wat een fijn volume is.'],fotos:[]},
      {id:'ledbars',titel:'Ledbars',stappen:[
        'Haal de ledbars uit de oplader.',
        'Via de aan-knop zet je de ledbar aan. Hij staat standaard ingesteld op groen.',
        'Plaats 1 ledbar onder de vogelhut, gericht naar de ingang van het bos.',
        'Plaats de andere ledbar in het bos naast de Safezone, gericht naar de Bay.'],
       fotos:[foto('ledbar-aan','De aan-knop'),foto('ledbar-vogelhut','Ledbar onder de vogelhut'),foto('ledbar-bos','Ledbar in het bos, naast de Safezone')]},
      {id:'lichtpaneel',titel:'Lichtpaneel',stappen:[
        'Open de flightcase en start het systeem op.',
        'Selecteer het programma. Het is een touchscreen.',
        'Selecteer links “Entertainment” en voer de code in (de code staat in het Drive-draaiboek, bewust niet in deze pagina).',
        'Selecteer “loads” rechts bovenaan.',
        'Selecteer load 13.',
        'Alles afsluiten doe je links onderaan door de PC af te zetten.'],
       fotos:[foto('lichtpaneel-flightcase','De flightcase'),foto('lichtpaneel-aan','Aanzetten'),foto('lichtpaneel-bureaublad','Het programma op het bureaublad'),foto('lichtpaneel-scherm','Het scherm'),foto('lichtpaneel-loads','“Loads” rechts bovenaan'),foto('lichtpaneel-load13','Load 13')]},
      {id:'atkins',titel:'Atkins',stappen:[
        'De volgende nummers mogen uitgezet worden: 60, 62, 65, 68, 77, 78.',
        'Bij de afbouw zet je de lampen terug aan.'],fotos:[]},
      {id:'rook',titel:'Rookmachine + drukknop',stappen:[
        'Kies de locatie uit. Bouw alles veilig op en zorg dat de kabels niet in de weg liggen.',
        'Opbouw machine: aan de linkerkant gaat de voeding in, de andere kant mag in de stroom. Zet daarna meteen de machine aan. Bij “DMX IN” mag de groene kabel in.',
        'Opbouw voetdruk: idem, de stroom mag meteen in de voeding. De groene kabel mag hier in “DMX OUT”; rol de kabel indien nodig af.',
        'Testen (kan nadat de machine is opgewarmd, ongeveer 5 min): duw met de voet op de knop. Is hij opgewarmd, dan schiet er een rookpluim de lucht in.',
        '!! Afbouw: zet eerst de rookmachine uit en laat ze 10 minuten afkoelen. !!'],
       fotos:[foto('rook-opstelling','De opstelling'),foto('rook-machine','De machine: voeding links, groene kabel in DMX IN'),foto('rook-voetdruk','De voetdruk: groene kabel in DMX OUT')]},
      {id:'statief',titel:'Lichtstatief bij de nooddeur',stappen:[
        'Verplaats het lichtstatief en richt 2 lampen richting de gang, 1 richting de grond en 1 richting de straatkant.',
        'Je vindt het onder het schip, naast de nooddeur achter de zwarte doek.',
        'Leg een verlengkabel onder naar binnen en laat de deur op een kiertje staan. Links kan je een stopcontact vinden.',
        'Instellen: druk op menu tot je A1.03 ziet staan. Staat er achter de punt een ander getal, dan verander je dat met “up” en “down”.',
        'Bij het afbouwen zetten we dit terug op waar het stond: A6.11.'],
       fotos:[foto('statief-bewaarplek','Bewaarplek: onder het schip, naast de nooddeur'),foto('statief-opslag','Het lichtstatief'),foto('statief-nooddeur','Opgesteld bij de nooddeur'),foto('statief-lampen','De lampen op het statief'),foto('statief-a103','Instellen: A1.03'),foto('statief-a611','Afbouw: terug op A6.11')]},
      {id:'portofoons',titel:'Portofoons',stappen:[
        'De portofoons steek je in de opladers.',
        'Selecteer kanaal 1 en pas het volume aan.',
        'Neem een oortje en doe een radiotest: kan iedereen jou horen, en jij iedereen?'],fotos:[]}
    ]
  },

  // -------------------------------------------------------------- checklist
  // De checklist van de verantwoordelijke. fase 3 is enkel ter info (geen vinkjes).
  checklist:[
    {id:'f1',nr:1,titel:'Ombouw',tijd:'19u00',protocol:'Quarantainezone inrichten',groepen:[
      {naam:'Team',items:['Materiaal kindertocht opgeruimd','Draaiboek van de avond hangt onder het schip','Iedereen kent zijn zone en opbouwtaak','KIC-medewerkers hebben een duidelijke taak']},
      {naam:'In de hut',items:['PC en techniektafel','Lichtpaneel','Tablets (blauw en groen) en muziekboxen, opgeladen','Portofoons en oortjes liggen opgeladen klaar','Warmtecamera, 2 PDA’s, 2 betaalterminals']},
      {naam:'Onder het schip',items:['Ledbars uit de lader','Rookmachine, drukknop, groene DMX-kabel, vloeistof','Lichtstatief achter de zwarte doek (Piraat disco)','Zwarte doeken (voor de deur)','Verlengkabels en ductape']},
      {naam:'Kleedkamer (boven)',items:['Witte pakken geprept, één met de 7','Overleverkledij: T-shirts, militaire jassen','Gasmaskers, latex handschoenen, mondmaskers','Geweren, stokken, walkietalkies','Schmink en bloed aangevuld']},
      {naam:'Bar, Safezone & dozen',items:['Flesjes water achter de bar (1–2 p.p.)','Safezone-kist (flightcase) met slot','Bandjes uit de Halloweenkast (15/10 en 17/10: kaartjes)','4 zonedozen compleet: lint, plakband, posters, paddenstoelen, cijfers','Partytent, voetstukken, hekken, betonblokken bereikbaar']},
      {naam:'Inkom & locker',items:['Partytent op voetstukken, wachtrij afgezet met lint','Zwarte doeken aan schuifdeur en poortjes','Posters in tent, wachtruimte en vestiaire','Hek met betonblokken, lamp aangesloten','Warmtecamera, PDA’s en betaalterminals getest']},
      {naam:'Sector 1',items:['Linten: bootje, klimrek, trappenhal, trap strand, wiebelbrug, trap schip','Hek voor de grot staat','Paddenstoelen en posters verspreid, poster met de 3']},
      {naam:'Sector 2',items:['Hek tussen extractiepunt en aquaria','Linten: ingang schip, watergrot, trap rivier, trapje Pirate Place','Tafels en stoelen door elkaar voor de bar','Paddenstoelen en posters verspreid']},
      {naam:'Buiten bos & Safezone',items:['Signalisatie straatoversteek geplaatst','Lint bij straatoversteek en door het bos','2 ledbars aan en gericht','Muziekbox en tablet onder de vogelhut','Safezone-kist op zijn plek, genoeg bandjes']},
      {naam:'Techniek',items:['PC en techniektafel aangesloten','Lichtpaneel opgestart, load 13','Lichtstatief aan de nooddeur, kabel ligt veilig','Rookmachine in sector 2 aangesloten, aan het opwarmen','Atkins-lampen 60, 62, 65, 68, 77, 78 uit']}
    ]},
    {id:'f2',nr:2,titel:'Eindcontrole',tijd:'20u00 – 20u25',protocol:'Zone vrijgeven',groepen:[
      {naam:'Briefing 20u00',items:['Rollen en zones van vanavond overlopen','Nationaliteiten: welke talen zijn vanavond belangrijk','Code 10 en “niet aanraken” herhaald','Schrikvrije punten: straat, trappen, bruggen']},
      {naam:'Bay vrij',items:['KIC-activiteiten en silent disco afgebouwd','Geen gasten meer in The Bay of op de route','Personeelsingang dicht voor gasten']},
      {naam:'Verbinding',items:['Portofoons uit de hut, iedereen op kanaal 1','Radiotest met elke zone, in beide richtingen','Oortjes bij extractiepunt en Safezone','Verantwoordelijke heeft gsm met CP-noodnummer']},
      {naam:'Licht, geluid, rook',items:['Muziek speelt in The Bay (repeat) en in het bos (loop)','Lichtpaneel, ledbars, lamp inkom en lichtstatief branden','Rookmachine getest met de voetknop']},
      {naam:'Code 7139',items:['Posters met de 1 en de 3 hangen langs het pad','Mutant in The Bay draagt het pak met de 7','De 9 hangt langs de bosroute','Slot van de Safezone-kist opent met 7139']},
      {naam:'Route & veiligheid',items:['Pad volledig afgesloten, geen losse linten','Geen kabels over het pad','Schuifdeur vast op open, poortje open','Weercheck: bij onweer is het extractiepunt het einde']},
      {naam:'Team',items:['Bezetting gecontroleerd, zones herverdeeld bij minder mdw','Iedereen in kostuum, geschminkt, warm aangekleed','Gsm’s liggen in de kleedkamer','Inkom heeft tikkaart en tijdsloten van vanavond','20u25: iedereen op post, gemeld via portofoon','Startsein door Marith of Matthew']}
    ],kader:'Portofoon · “Code 10” + locatie: speler stopt en blijft bij de gast; verantwoordelijke of mdw 2 gaat ter plaatse. Vaste oproepen: “Groep vertrokken” · “Laatste groep” · “Pauze”. Echte noodgevallen: zie Contacten of het Drive-draaiboek.'},
    {id:'f3',nr:3,titel:'Tijdens de tocht',tijd:'20u30 – 22u20',protocol:'Uitbraak onder controle · ter info, geen vinkjes',info:true,groepen:[
      {naam:'Doorstroom',items:['Om de 5–8 min vertrekt een groep van max 8–10','Families samen, groepen van 20 splitsen','Geen opstopping aan extractiepunt of Safezone','Zit een groep vast: hint via het oortje','Loop minstens één ronde langs elke zone']},
      {naam:'Veiligheid',items:['Je bent altijd bereikbaar op de portofoon','Code 10: verantwoordelijke of mdw 2 gaat ter plaatse en noteert','Uitstapper: de verantwoordelijke begeleidt de gast naar buiten','Niemand raakt gasten aan','Rook in korte stoten, het pad blijft zichtbaar','Straatoversteek: geen schrikmomenten, groepen steken veilig over']},
      {naam:'Team & materiaal',items:['Gebruik de vaste oproepen (zie kader bij de eindcontrole)','Toiletpauzes worden gemeld en opgevangen','Buitenposten: warm genoeg, water gehad','Bandjes of kaartjes in de kist bijvullen indien nodig','Let op de batterijen van portofoons, ledbars en box']},
      {naam:'Weer & einde',items:['Bij onweer: bos dicht, extractiepunt is het einde','Stilleggen enkel op beslissing van Marith of Matthew','22u20: laatste vertrek melden via de portofoon','Volg de laatste groep tot in de Safezone']}
    ]},
    {id:'f4',nr:4,titel:'Afbouw & afsluiten',tijd:'22u30 – 23u30',protocol:'Zone ontsmet',groepen:[
      {naam:'Zones',items:['Laatste groep buiten, The Bay is leeg','Inkom: tent, doeken, posters, hek, lamp weg, poortje dicht','Sector 1 & 2: linten, hekken, paddenstoelen, posters weg','Tafels en stoelen terug op hun plaats','Bos leeg: lint, ledbars, box, tablet, kist binnen','Signalisatie straatoversteek weggehaald']},
      {naam:'Techniek',items:['Rookmachine uit, 10 min afgekoeld, opgeruimd','Muziek en PC uit, techniektafel dicht','Lichtpaneel normaal/uit','Lichtstatief terug op A6.11, achter de zwarte doek','Nooddeur dicht','Atkins-lampen terug aan']},
      {naam:'Materiaal',items:['Ledbars, tablets en box aan de lader','Portofoons geteld en aan de lader','Warmtecamera, PDA’s en betaalterminals terug in de hut','Zonedozen compleet, tekorten (lint, tape) genoteerd','Kist aangevuld met bandjes voor de volgende avond']},
      {naam:'Kostuums',items:['Witte pakken en overleverkledij terug opgehangen','Gasmaskers schoongemaakt','Kleedruimte opgeruimd']},
      {naam:'Afsluiten',items:['Eindronde: niets achtergebleven, deuren dicht','Hut afgesloten','Rapport ingevuld en in de map in de hut']}
    ]}
  ],

  rapport:['Incidenten / Code 10','Ontbrekend of kapot materiaal','Opmerkingen voor de volgende avond'],

  // -------------------------------------------------------------- documenten
  documenten:[
    {titel:'Manual volwassentocht',tekst:'Het volledige handboek: verhaal, rolverdeling, alle zones met scripts, opbouw en techniek (Word, groot bestand met foto’s).',id:'1sFecCdFjW1JKQqfk8Qyo0yvDo23EkusG',type:'Word'},
    {titel:'Draaiboek volwassentocht',tekst:'Per avond wie waar staat en wie wat afbouwt.',id:'10YlhLUovoTlozitdnusfXJs9dKkcNuYg',type:'Word'},
    {titel:'Checklist verantwoordelijke',tekst:'De afdrukbare checklist voor de verantwoordelijke van de avond.',id:'1TiNG_IsYA_s-LOmST9r-U2ExZnLxrKwr',type:'Word'},
    {titel:'Draaiboek Halloween 2026',tekst:'Het overzicht van de hele Halloweenperiode (12/10 – 09/11): alle activiteiten, data en uren.',id:'1qSIK18QpBqPlBt0mP0fWKqy9vuVSIWY4',type:'Word'}
  ],
  mappen:[
    {titel:'Map: Griezeltocht volwassenen – The Bay Outbreak',id:'17Wt1G_HijMTr8qCffnTxwozfKnKLtLpf'},
    {titel:'Map: Kindertocht',id:'1b90bUPP10aCn6tt6DCdh4ouZ60SuMyvF'},
    {titel:'Map: BAY – Griezelschmink',id:'1dvRIBDgBkZ90aY6M_XI1QhtnJZJBeuch'},
    {titel:'Map: BAY – Slijm maken',id:'1v6NrxR1f00tGkKVim-evFKEQgt60t_3W'},
    {titel:'Map: O&F – Bedtime Stories',id:'1Fo77S5xzTMGOBsvqq8v9rRa7gRLFB5_B'},
    {titel:'Map: O&F – Kids Disco',id:'1odVXGRkE1A1W2a5P1ZnxMzGDjLc_roru'},
    {titel:'Alles: Halloweenperiode 2026',id:'1PTdTRqa6ZeUv5jxgEispvTEfvfKI4rei',hoofd:true}
  ]
};
})();

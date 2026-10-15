// =====================================================================
//  HALLOWEEN · O&F-PROGRAMMA, HALLOWEEN SHOW en MARKTJE — de inhoud.
//
//  Overgenomen uit de Drive-map "Halloweenperiode 2026": het overzichtsdraaiboek, "Disco concept",
//  het script "Halloween bedtime stories", en de Drive-map van de Kids Disco;
//  het schema van de show komt uit het draaiboek van de kindertocht ("Orry en heks").
//  Voor de Halloween show en het marktje staat er (nog) geen eigen document in de Drive:
//  daar staat wat in de andere documenten over hen te vinden is. Tekenen doet js/halloween.js.
// =====================================================================
(function(){
'use strict';
const F='../assets/halloween/';
const foto=(naam,tekst)=>({src:F+naam+'.jpg',tekst:tekst||''});
const yt=id=>'https://www.youtube.com/watch?v='+id;
const dfile=id=>'https://drive.google.com/file/d/'+id+'/view';
const dmap=id=>'https://drive.google.com/drive/folders/'+id;

const MAP={disco:'1odVXGRkE1A1W2a5P1ZnxMzGDjLc_roru',bedtime:'1Fo77S5xzTMGOBsvqq8v9rRa7gRLFB5_B',alles:'1PTdTRqa6ZeUv5jxgEispvTEfvfKI4rei',kind:'1b90bUPP10aCn6tt6DCdh4ouZ60SuMyvF'};
const DOC={halloween:{titel:'Draaiboek Halloween 2026',tekst:'Het overzicht van de hele Halloweenperiode (12/10 – 09/11): alle activiteiten, locaties, data en uren.',id:'1qSIK18QpBqPlBt0mP0fWKqy9vuVSIWY4'}};

// ---------------------------------------------------------------- de verhalen (Bedtime stories)
const PARADE={
  nl:['Orry is helemaal klaar om vanavond halloween te vieren. Er is een parade, met lampionnen in het donker. Hij heeft er nu al zin in.',
      'Terwijl hij binnen wacht op zijn vrienden Bing, Rep en Woops, besluit hij om heel eventjes in zijn leunstoel te gaan zitten. Gaap! Wakker blijven Orry! Maar de warme keuken heeft hem slaperig gemaakt. Zzzzz……zzzzzzzz.',
      'Niet veel later schrikt hij op van een koude windvlaag. “Wat krijgen we nou…”? Hij staat midden in het donkere bos op een open plek. “Hoe kom ik hier nou terecht”?, denkt Orry. Achter hem klinkt zacht geritsel. Geschrokken draait hij zich om.',
      '“Boe”! In het zilveren maanlicht staat Rep. “Schrok je, Orry”?, vraagt ze plagerig. “Zeg, waar zijn we eigenlijk? Nog voordat Orry kan antwoorden, schrikken ze op van enkele vleermuizen.',
      '“Niet bang zijn, Rep! We lopen naar de boomhut van Bing. Laten we niet treuzelen, straks missen we de parade nog!” In het donker lijkt alles op elkaar. Orry en Rep zijn hopeloos verdwaald. “Was Bing maar hier”, bibbert Rep. “Hij kan met de dieren praten en dan kon hij de weg naar huis vragen.”',
      '“Kijk daar! Een lichtje!” roept Orry. Het is Bing! In zijn handen draagt hij een potje met vuurvliegjes. “Kom mee. Ik ken het bos op mijn duimpje”. Net als Orry wil antwoorden, gaat alles draaien. Oehoe! In de verte krast een uil. Joeho! “Orry”! roept de uil zachtjes. “Orry, wakker worden”! Dan doet Orry zijn ogen open.',
      'Het is geen uil, het is Woops! Achter Woops staan Bing en Rep. Orry was in slaap gevallen! Gelukkig, het was maar een droom. “Hoe laat is het”? Lachend zegt Woops: “Tijd voor de Halloween parade! Zullen we snel gaan”? “Jaaa”!, roepen ze in koor. En zo wordt het toch nog een fijne avond.'],
  de:['Orry ist fertig um mit Euch heute Abend Halloween zu feiern. Es gibt eine Parade mit Laternen im Dunkeln!! Ich freue mich schon drauf.',
      'Während er drinnen wartet auf seine Freunde Bing, Rep und Woops, beschliesst Orry um eben in seinem Liegestuhl zu sitzen. Gähn! Wach bleiben Orry! Aber die warme Küche hat Ihne schläfrig gemacht. Zzzzzzz…..zzzzzzzzz',
      'Nicht viel später erschreckt er sich wegen einer kalten Windböhe. „Was passiert den hier…?” Er steht mitten in einem dunklem Wald auf einem offenem Platz. „Wie bin ich denn hier hingekommen?” denkt Orry. Hinter Ihm hört er ein leichtes Rascheln. Erschrocken dreht er sich um.',
      '‘BOE’ !! Im silbernem Mondlicht steht Rep. „Hast Du dich erschreckt Orry?“ fragt Rep neckig. „Sag mal wo sind wir eigentlich?“ Noch bevor Orry antworten kann erschrecken sich die beiden durch ein paar Fledermäuse.',
      'Hab keine Angst Rep!! Wir laufen zur Baumhütte von Bing. Lass uns nicht trödeln, gleich verpassen wir noch die Parade!“ Im Dunkeln sieht alles gleich aus! Orry und Rep haben sich total verlaufen. „Ach wäre Bing doch hier“, zittert Rep. „er kann mit den Tieren sprechen und dann könnten wir fragen wie der Weg nach Hause ist!“',
      'Schau DA ! Ein Licht!“ ruft Orry. Es ist Bing. In seiner Hand hält er einen Pott mit Glühwürmchen. „Kommt mit. Ich kenne mich hier aus!“ Gerade will Orry antworten und alles um Ihn beginnt sich zu drehen. Oehoe!! Weiter weg heult eine Eule. Joeho! „Orry“! heult die Eule sanft. „Orry werd wach!” Jetzt öffnet Orry seine Augen.',
      'Es ist keine Eule, es ist Woops ! Hinter Woops stehen Bing und Rep. Orry war am schlafen! Zum Glück war es nu rein Traum. “Wie spät ist es?“ lachen sagt Woops:“ Es ist Zeit für die Halloween Parade! Kommt ihr mit?! JAAAAAA! Rufen Sie im Chor, und so wird es doch noch ein schöner Abend.'],
  fr:['Orry est prêt à fêter Halloween ce soir. Il y a un défilé, avec des lanternes dans le noir. Il s’y intéresse déjà !',
      'Alors qu’il attend ses amis Bing, Rep et Woops, il décide de s’asseoir un instant dans son fauteuil. Reste éveillé Orry ! Mais la chaleur de la cuisine l’a endormi. Zzzzz……zzzzzzzz.',
      'Peu de temps après, il est surpris par une rafale de vent froid. “Qu’ est-ce qu’il se passe”? Il se retrouve au milieu de la forêt sombre dans un espace ouvert. « Comment suis-je arrivé ici ? » pense Orry. Il y a un léger bruissement derrière lui. Surpris, il se retourne.',
      '“Boo”! Au clair de lune argenté se retrouve Rep. “Tu avais peur, Orry?” demande-t-elle. « Dis, où sommes-nous de toute façon ? Avant qu’Orry ne puisse répondre, quelques chauves-souris les font sursauter.',
      '« N’aie pas peur, Rep ! Nous marchons jusqu’à la cabane de Bing. Ne nous attardons pas, nous allons rater le défilé ! » Dans le noir, tout se ressemble. Orry et Rep sont désespérément perdus. “Si seulement Bing était là”, frissonne Rep. “Il peut parler aux animaux et ensuite il pourrait demander des directions pour rentrer chez lui.”',
      '“Regarde là! Un peu de lumière !” crie Orry. C’est Bing ! Dans ses mains, il porte un pot de lucioles. “Venez avec moi. Je connais la forêt comme ma poche”. Au moment où Orry veut répondre, tout bascule. ohh ! Au loin un hibou hulule. Yooo ! “Orry” ! le hibou appelle doucement. “Orry, réveille-toi” ! Puis Orry ouvre ces yeux.',
      'Ce n’est pas un hibou, c’est Woops ! Derrière Woops se trouvent Bing et Rep. Orry s’était endormi ! Heureusement, ce n’était qu’un rêve. “Quelle heure est-il”? En riant, Woops dit : « C’est l’heure du défilé d’Halloween ! On y va ?» « Ouais ! » crient-ils à l’unisson. Et donc ça s’avère être une belle soirée.'],
  en:['Orry is all set to celebrate Halloween tonight. There is a parade, with lanterns in the dark. He’s already looking forward to it.',
      'While waiting inside for his friends Bing, Rep and Woops, he decides to sit in his armchair for a moment. Yawn! Stay awake Orry! But the warm kitchen made him sleepy. Zzzzz……zzzzzzzz.',
      'A few moments later he is scared by a cold gust of wind. “What’s happening…”? He stands in the middle of the dark forest. “How did I end up here?” Orry thinks. There is a soft rustle behind him. Scared, he turns around.',
      '“Boo”! In the silver moonlight stands Rep. “Were you shocked, Orry?” she asks teasingly. “Where are we anyway? Before Orry can answer, some bats scare them.',
      '“Don’t be afraid, Rep! We walk to Bing’s tree house. Let’s keep moving, we’ll miss the parade!” In the dark, everything looks the same. Orry and Rep are hopelessly lost. “If only Bing were here”, Rep shivers. “He can talk to the animals and then he could ask for directions home.”',
      '“Look there! A little light!” shouts Orry. It’s Bing! In his hands he carries a jar of fireflies. “Come with me. I know the forest like the back of my hand”. Just as Orry wants to answer, everything turns. oohoo! In the distance an owl hoots. Yooo! “Orry”! the owl calls softly. “Orry, wake up”! Then Orry opens his eyes.',
      'It’s not an owl, it’s Woops! Behind Woops are Bing and Rep. Orry had fallen asleep! Fortunately, it was just a dream. “What time is it”? Laughing, Woops says: “Halloween parade time! Shall we go now”? “Yeah!” they shout. And so it turns out to be a nice evening.']
};
const WEDSTRIJD={
  nl:['Morgen is het Halloween. Het hele park is versierd. Maar het allerleukste is de wedstrijd pompoen versieren. Woops heeft de binnenkant van haar pompoen bekleed met een dun laagje zeewier en de buitenkant is bewerkt met honderden schelpen en golven.',
      '“Wow Woops, dat is prachtig” zegt Rep als ze haar pompoen ziet. Woops geniet van alle aandacht.',
      '“Nou, die prijs kan ik wel vergeten”, denkt Rep verdrietig. Zij heeft een robotpompoen gebouwd. In de ogen zitten rode LED-lampjes. Daarmee kan je mensen in het donker goed laten schrikken! Maar vergeleken met het kunstwerk van Woops vindt Rep haar pompoen nu maar een hoopje oud ijzer.',
      'Bing is de derde die aankomt. Hij draagt een grote pompoen naar binnen. “Maar Bing, jouw pompoen is helemaal niet versierd” zegt Woops. “Tjah” zegt Bing, “Ik heb hem zelf gekweekt in mijn moestuin, en dan maak ik hem liever niet kapot.” “Typisch Bing!” lacht Woops.',
      'Tuut tuut! Daar is Orry! Hij heeft een kom soep en een trommel met koekjes meegebracht. “Waar is je pompoen?” vraagt Bing. “Hier natuurlijk, de beste plek voor een pompoen is in de soep, en in de koekjes.” “Die koekjes zijn heerlijk” roept iedereen. “Het zijn de beste die je ooit hebt gemaakt.”',
      'Dan is het tijd voor de prijsuitreiking. De strenge mevrouw van de jury kijkt aandachtig naar alle pompoenen. Vol spanning wachten onze vrienden op het resultaat. “Ik ben eruit”, zegt ze. “Willen Orry, Bing, Rep en Woops alsjeblieft op het podium komen?”',
      'Verbaasd kijken onze vrienden elkaar aan. En wat blijkt? Ze hebben alle vier een prijs gewonnen! Goed gedaan Orry, Bing, Rep en Woops!'],
  de:['Morgen ist es Halloween. Der ganze Park ist geschmückt. Aber am allertollsten ist der Wettstreit Kürbisse verzieren. Woops hat die Innenseite des Kürbisses verziert mit Seetang und die Aussenseite mit hunderten von Muscheln!!',
      '« Wow Woops das ist wunderschön“ sagt Rep wo Sie Ihren Kürbis sieht. Woops geniesst es das Sie soviel Aufmerksamkeit bekommt!',
      '« Den Preis werde ich vergessen können“ denkt Rep traurig. Sie hat einen Robotkürbis gebaut. In den Augen sind kleine Rote Ledlampen. Damit kann man Leute im dunkeln gut erschrecken! Aber verglichen mit dem Kunstwerk von Woops findet Rep Ihren Kürbis aussehen wie einen Haufen Schrott.',
      'Bing ist der Dritte der Ankommt. Er trägt einen grossen Kürbis nach drinnen.“ Aber Bing dein Kürbis ist ja gar nicht verziert“ sagt Woops. „Tjah“ sagt Bing, „Ich habe ihn gepflanzt in meinem eigenen Gemüsegarten darum mache ich Ihn lieber nicht kaputt. „Typisch Bing!“ lacht Woops.',
      'Tuut Tuut! Da ist Orry! Er hat eine Tasse Suppe und eine Dose mit Keksen mitgebracht. „Wo ist dein Kürbis?“ fragt Bing. „Hier natürlich, der beste Platz für einen Kürbis ist in der Suppe und in de Keksen.“ Die Kekse sind herrlich“ ruft er. Es sind die besten die ich jemals gemacht habe.',
      'Dann ist es jetzt Zeit für die Preisverleihung. Die strenge Dame der Jury schaut aufmerksam nach allen Kürbissen. Voller Spannung warten unsere Freunde auf das Resultat. „Ich habe mich entschieden“ sagt sie. Orry, bing, Rep und Woops dürfen auf das Podium kommen',
      'Überrascht schauen unsere Freunde einander an. Und was passiert. Sie haben alle vier einen Preis gewonnen! Super gemacht Orry, Bing, Rep und Woops.'],
  fr:['Demain c’est Halloween. Tout le parc est décoré. Mais la meilleure partie est le concours de décoration de citrouilles. Woops a recouvert l’intérieur de sa citrouille d’une fine couche d’algues et l’extérieur a été décoré de centaines de coquillages et de vagues.',
      '« Wow woops c’est beau » dit Rep en voyant sa citrouille. Woops profite de toute l’attention.',
      '“Eh bien, je peux oublier ce prix”, pense tristement Rep. Elle a construit une citrouille robot. Il y a des lumières LED rouges dans les yeux. Vous pouvez effrayer les gens dans le noir avec ça ! Mais comparée à l’œuvre de Woops, Rep pense maintenant que sa citrouille n’est qu’un tas de ferraille.',
      'Bing est le troisième à arriver. Il porte une grande citrouille à l’intérieur. “Mais Bing, ta citrouille n’est pas décorée du tout”, dit Woops. “Eh bien,” dit Bing, “je l’ai cultivé moi-même dans mon potager, et je préfère ne pas le détruire.” “Typique Bing !” rit Woops.',
      'Tuut tuut ! Voici Orry ! Il a rammené un bol de soupe et une boîte de biscuits. “Où est ta citrouille ?” demande Bing. “Ici, bien sûr, le meilleur endroit pour une citrouille est dans la soupe et dans les biscuits.” “Ces cookies sont délicieux” crie tout le monde “Ce sont les meilleurs”',
      'C’est l’heure de la remise des prix. La sévère dame du jury regarde attentivement toutes les citrouilles. Nos amis attendent le résultat avec impatience. « Je suis sortie », dit-elle. “Est-ce que Orry, Bing, Rep et Woops monteront sur scène s’il vous plaît?”',
      'Nos amis se regardent avec étonnement. Et qu’est-ce qui s’avère? Tous les quatre ont gagné un prix ! Bravo Orry, Bing, Rep et Woops!'],
  en:['Tomorrow is Halloween. The whole park is decorated. But the best part is the pumpkin decorating contest. Woops has coated the inside of her pumpkin with a thin layer of seaweed and the outside has been decorated with hundreds of shells and waves.',
      '“Wow Woops, It’s beautiful” says Rep when she sees her pumpkin. Woops enjoys all the attention.',
      '“Well, I can forget that price”, Rep thinks sadly. She has built a robot pumpkin. There are red LED lights in the eyes. You can scare people in the dark with this! But compared to Woops’ artwork, Rep now thinks her pumpkin is just a pile of scrap iron.',
      'Bing is the third one to arrive. He carries a big pumpkin inside. “But Bing, your pumpkin isn’t decorated at all” says Woops. “Well,” says Bing, “I grew it myself in my vegetable garden, and I’d rather not destroy it.” “Typical Bing!” laughs Woops.',
      'Tuut Tuut! There’s Orry! He brought a bowl of soup and a tin of cookies. “Where’s your pumpkin?” asks Bing. “Here, of course, the best place for a pumpkin is in the soup, and in the cookies.” “Those cookies are delicious” everyone shouts “They’re the best you’ve ever made”',
      'Then it’s time for the award ceremony. The severe lady of the jury looks carefully at all the pumpkins. Our friends eagerly await the result. “I know it,” she says. “Do Orry, Bing, Rep and Woops want to come on stage please?”',
      'Our friends look at each other in amazement. And guess what? All four have won a prize! Well done Orry, Bing, Rep and Woops!']
};

// ---------------------------------------------------------------- het schema van de show
const SHOW=[
  ['Eerst: vóór 14u15','Fiets zonder laadbak ophalen bij de Housekeeping (achter de loods) en inklokken bij de check-in (Orry en heks). Zet de fiets bij de nooddeur onder het schip.'],
  ['14u15 – 14u30','Opbouw van de act in de Discovery Bay (DB) en de techniek. De techniek gebeurt normaal door Bay-medewerkers.'],
  ['14u30 – 14u35','Verplaatsen naar de AR.'],
  ['14u35 – 15u05','Omkleden tot karakter.'],
  ['15u05 – 15u10','Verplaatsen naar de DB en de headsets aandoen. Neem je spullen mee: je komt niet meer terug in de AR.'],
  ['15u15 – 15u45','Show 1'],
  ['15u45 – 16u00','Pauze'],
  ['16u00 – 16u30','Show 2'],
  ['16u30 – 16u45','Orry: omkleden tot dief 2 in de Bay. Heks: fellere make-up in de Bay.'],
  ['16u45 – 16u50','Samen verplaatsen naar je post, fiets meenemen en de post klaarzetten. Daarna gaat dief 2 rondlopen.'],
  ['16u50 – 19u15','Op post. De laatste tocht zal rond 19u15 bij de heks zijn. Is de groep voorbij je post, dan ga je opruimen en terug naar de DB.'],
  ['19u15 – 19u30','Teruglopen en opruimen.'],
  ['19u30 – 19u45','Omkleden en make-up eraf.'],
  ['19u45 – 20u15','Pauze'],
  ['20u15 – 20u25','Omkleden en make-up voor de volwassentocht.']
];
const KN=window.HW_KIND_NACHTEN||{};
const CAST=Object.keys(KN).map(d=>[d,KN[d].orry||'—',KN[d].heks||'—',KN[d].tessy||'—']);

window.HW_ACT=window.HW_ACT||{};
const STAND='12/10/2026';

// ================================================================ O&F programma
window.HW_ACT.of={
  stand:STAND,
  tabs:[{id:'start',ic:'🎭',t:'Start'},{id:'disco',ic:'🪩',t:'Kids Disco',type:'kaarten',uitleg:'Alles over de Halloween disco: uren, de dansjes (met links om te oefenen) en de video’s.'},{id:'bedtime',ic:'📖',t:'Bedtime stories',type:'kaarten',uitleg:'De twee voorleesverhalen, in het Nederlands, Duits, Frans en Engels: kies de taal van de kinderen.'},
        {id:'docs',ic:'📎',t:'Documenten'}],
  feiten:[['Kids Disco','16u45 · 17u30'],['Bedtime stories','16u45'],['Waar','Time-Out Podium'],['Kleding','O&F-halloween']],
  startKaarten:[
    {nood:true,titel:'Belangrijk: kledij van de karakters',p:['Tijdens de Halloweenperiode (vanaf 12/10 t/m 5/11) dragen de karakters hun Halloweenkledij gedurende alle activiteiten: een cape voor Orry, een hoed voor Bing, een weerwolvenjack voor Rep en een masker voor Woops. Schmink mag altijd, maar is geen must.']},
    {titel:'Het O&F-programma tijdens de Halloweenperiode',p:['Alle O&F-activiteiten vinden volledig in Halloweenthema plaats. De Kids Disco en het verhaaltje doen we echt in thema (zie de tabbladen). Voor attributen en techniek is voorlopig niets bepaald: dit is naar eigen invulling, maak er iets leuks van!']},
    {titel:'Wat staat er op het programma?',rijen:[
      ['Kids Disco','Time-Out Podium · 16u45 – 17u15 en 17u30 – 18u00 · 2–3 Halloweendansjes per disco'],
      ['Bedtime stories','Time-Out Podium · 16u45 – 17u00 · Halloweenverhaal voorlezen']
    ],sub:'Tik hierboven op een tabblad voor de details van elke activiteit.',nota:'Op de tochtdagen (donderdag en zaterdag: 15/10, 17/10, 22/10, 24/10, 29/10, 31/10 en 5/11) is er geen O&F-programma. Op de andere dagen volgt het rooster in het overzichtsdraaiboek.'},
    {titel:'Wie is verantwoordelijk?',rijen:[
      ['Algemeen','Marith Weickl'],['Halloween Show','Lennert Lehaen'],['Kindertocht','Lien Ramaekers'],['Griezeltocht (Bay)','Matthew Ooms']
    ],nota:'Voor vragen of opmerkingen kan je altijd contact opnemen met een van de verantwoordelijken. Telefoonnummers staan in Contacten en in het overzichtsdraaiboek.'},
    {titel:'Alle uren van de Halloweenperiode',p:['De volledige dag- en uurplanning (per week, 12/10 – 09/11) staat in het overzichtsdraaiboek in de Drive.'],links:[{t:'📄 Draaiboek Halloween 2026',url:dfile(DOC.halloween.id),hoofd:true}]}
  ],
  documenten:[
    {titel:'Disco concept',tekst:'Het overzicht van de Halloween disco: richtlijn, dansjes en links.',id:'1Pm6lpiBDsRNffJ5L6b6buUlZPwbJjuX4'},
    {titel:'Script Halloween bedtime stories',tekst:'De twee verhalen (De Halloween parade en De wedstrijd) in het Nederlands, Duits, Frans en Engels.',id:'1uOdk-WeKRuUSPJHsG_Z_xJvnNV53exg_'},
    DOC.halloween
  ],
  mappen:[{titel:'Map: O&F – Kids Disco',id:MAP.disco},{titel:'Map: O&F – Bedtime Stories',id:MAP.bedtime},{titel:'Alles: Halloweenperiode 2026',id:MAP.alles,hoofd:true}]
};
window.HW_ACT.of.tabs.find(t=>t.id==='disco').kaarten=[
  {titel:'Overzicht',rijen:[
    ['Locatie','Time-Out Podium'],
    ['Uren','16u45 – 17u15 en 17u30 – 18u00 (niet op de tochtdagen: donderdag en zaterdag)'],
    ['Wat','De Kids Disco doen we echt in thema: tijdens ELKE disco doen we minstens 2 Halloweendansjes (de richtlijn is 2–3). De dansjes staan in de Drive: studeer ze allemaal goed van tevoren in!'],
    ['Verwachting','Iedereen die een disco heeft tijdens de Halloweenperiode kent de dansjes. Bekijk dus goed je rooster en bereid je voor als je een discoshift hebt: oefen ze vanuit je woonkamer met de links hieronder.'],
    ['Liedjes','Minstens twee tot drie Halloweenliedjes per disco, en starten en sluiten met het standaard O&F-lied.'],
    ['Achtergronden','Gebruik de Halloweenachtergronden op de pc.'],
    ['Kleding','De Halloweenkledij van je karakter: cape (Orry), hoed (Bing), weerwolvenjack (Rep) of masker (Woops). Schmink mag altijd, maar is geen must. Oefen de dansjes voordat je het podium op gaat.']
  ]},
  {titel:'De dansjes (YouTube)',sub:'Tik een titel om het dansje te bekijken en te oefenen.',links:[
    {t:'🧟 Zombiedans',url:yt('gQ5llnOUjZ4')},{t:'👾 Grote groene griezelmonster',url:yt('6b4ySlTARAI')},{t:'🎃 Ben niet bang',url:yt('4YWy8MLsK5g')},
    {t:'👹 Monstershake',url:yt('9t9pJrCr4EI')},{t:'🎃 Halloween – LikeMe',url:yt('fhVYFLfB02E')}]},
  {titel:'Dansvideo’s in de Drive',sub:'Voorbeeldvideo’s van de dansen (o.a. “Halloween LikeMe”). Het zijn grote bestanden: bekijk ze bij voorkeur op wifi.',links:[
    {t:'▶ Dansvideo 1',url:dfile('1DfS7i1StRVCCqCNoyetrzNLZT0do5XFJ')},{t:'▶ Dansvideo 2',url:dfile('1EV0a0r7ZW6FLyMaXNctmQnGR87Jilf2X')},
    {t:'▶ Halloween LikeMe (video)',url:dfile('1_DtRBEGLUulVpIRG9ZNhSx-OYYkSWa1a')},{t:'▶ Dansvideo 4',url:dfile('1ewaZICzz1S76RA7-nQ00F5s_VDAgzrpq')},
    {t:'▶ Dansvideo 5',url:dfile('1Eh91Rs3VgnxveHxU1428DL50Z1oaNrpy')},{t:'📁 Hele map in Drive',url:dmap(MAP.disco),hoofd:true}]},
  {titel:'Stoelendans',p:['Bij een disco met weinig kindjes kan je “Dans Macabre” of “Zeven heksen” gebruiken voor een stoelendans.']}
];
window.HW_ACT.of.tabs.find(t=>t.id==='bedtime').kaarten=[
  {titel:'Overzicht',rijen:[
    ['Locatie','Time-Out Podium'],['Uren','16u45 – 17u00 (niet op de tochtdagen: donderdag en zaterdag)'],
    ['Kleding','De Halloweenkledij van je karakter: cape (Orry), hoed (Bing), weerwolvenjack (Rep) of masker (Woops). Schmink mag altijd, maar is geen must.'],
    ['Wat','Het verhaaltje doen we echt in thema: je neemt het Halloweenboek mee naar boven en leest 1 van deze 2 verhaaltjes.'],
    ['Materiaal','Het Halloweenboek en het script in de Drive. Er zijn voorlopig geen attributen of techniek voor bepaald: dit is naar eigen invulling, maak er iets leuks van!'],
    ['Verhalen','Twee verhalen met Orry, Bing, Rep en Woops: “De Halloween parade” en “De wedstrijd”. Elk verhaal staat hieronder in het Nederlands, Duits, Frans en Engels: kies de taal van de kinderen.']
  ]},
  {titel:'De Halloween parade',talen:PARADE},
  {titel:'De wedstrijd',talen:WEDSTRIJD},
  {links:[{t:'📄 Script (PDF in Drive)',url:dfile('1uOdk-WeKRuUSPJHsG_Z_xJvnNV53exg_'),hoofd:true},{t:'📁 Map in Drive',url:dmap(MAP.bedtime)}]}
];
// ================================================================ Halloween show
window.HW_ACT.show={
  stand:STAND,
  tabs:[{id:'start',ic:'🎭',t:'Start'},{id:'programma',ic:'⏱️',t:'Programma',type:'kaarten',uitleg:'Het dagschema van de show, van de opbouw om 14u15 tot de make-up voor de volwassentocht.'},{id:'cast',ic:'👥',t:'Wie speelt wat',type:'kaarten',uitleg:'Wie Orry en de heks speelt, per avond.'},{id:'docs',ic:'📎',t:'Documenten'}],
  feiten:[['Shows','15u15 · 16u00'],['Duur','2 × 30 min'],['Waar','Discovery Bay'],['Verantw.','Lennert']],
  startKaarten:[
    {titel:'Wat is de show?',p:['Op de dagen van de kindertocht is er voor de tocht een Halloween Show in de Discovery Bay met de figuren Orry en de heks. De show begint om 15u15 en wordt om 16u00 herhaald; daarna spelen Orry (als dief 2) en de heks hun rol op de kindertocht.',
      'Bij de eerste groep van de kindertocht is de show nog bezig op de Pirates Place: die kinderen kunnen hun lantaarn daar nog niet versieren. Zodra de show afgelopen is, verhuist de knutselhoek naar de Pirates Place.']},
    {titel:'Wat we weten',rijen:[
      ['Verantwoordelijke','Lennert Lehaen (Halloween Show)'],
      ['Waar','Discovery Bay (DB); verkleden in de AR, daarna met headsets naar de DB'],
      ['Wie','Orry (iemand per avond, zie “Wie speelt wat”) en de heks (Tessy)'],
      ['Kledij','Tijdens de Halloweenperiode dragen de karakters hun Halloweenkledij gedurende alle activiteiten: een cape voor Orry, een hoed voor Bing, een weerwolvenjack voor Rep en een masker voor Woops. Schmink mag altijd, maar is geen must.'],
      ['Techniek','Gebeurt normaal door Bay-medewerkers (in de rolverdeling van de kindertocht staat Lennert als “techniek”)'],
      ['Schema','Zie het tabblad Programma: van opbouw om 14u15 tot make-up voor de volwassentocht om 20u25']
    ],nota:'Een eigen script of draaiboek van de show staat nog niet in de Drive. Zodra het er is, kan het hier bijgevoegd worden.'},
    {titel:'Meer weten',links:[{t:'📄 Draaiboek kindertocht',url:dfile('1i9njdvvqUj3_eDf6295WjPWMtoPfgAkg')},{t:'📄 Draaiboek Halloween 2026',url:dfile(DOC.halloween.id)}]}
  ],
  documenten:[{titel:'Draaiboek kindertocht',tekst:'Hierin staat het schema voor Orry en de heks (“Orry en heks”).',id:'1i9njdvvqUj3_eDf6295WjPWMtoPfgAkg'},DOC.halloween],
  mappen:[{titel:'Map: Kindertocht',id:MAP.kind,hoofd:true},{titel:'Alles: Halloweenperiode 2026',id:MAP.alles}]
};
window.HW_ACT.show.tabs.find(t=>t.id==='programma').kaarten=[
  {titel:'Schema van de show-dag',sub:'Dit schema geldt voor Orry en de heks. Wie in de middag Orry is, volgt vanaf 19u00 het draaiboek van alle andere medewerkers (zie Planning bij de kindertocht).',tabel:{kop:['Tijd','Wat'],rijen:SHOW}}
];
window.HW_ACT.show.tabs.find(t=>t.id==='cast').kaarten=[
  {titel:'Per avond',sub:'Orry speelt ’s middags de show en daarna dief 2 op de kindertocht. Tessy is de heks en staat ’s avonds op de volwassentocht.',tabel:{kop:['Datum','Orry (en dief 2)','Heks','Tessy ’s avonds'],rijen:CAST}}
];

})();

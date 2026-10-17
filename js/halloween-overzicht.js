// =====================================================================
//  HALLOWEEN · ALGEMEEN OVERZICHT — de inhoud.
//
//  Het overzicht heeft geen eigen planning: de dagplanning en de ombouw per dag worden bij het
//  tekenen samengesteld uit de planningen van de andere onderdelen (js/halloween.js).
//  Hier staat enkel wat vast is: het dagschema, de tijdsloten, de informatie en het praktische.
//  Bronnen: het overzichtsdraaiboek, de briefings en de mails van Marith, stand 15/10/2026,
//  en de werkpunten en afspraken na de eerste avond (mail van het Halloween team, 17/10/2026).
//  Met opzet geen telefoonnummers of noodnummer: de site is openbaar (zie Contacten).
// =====================================================================
(function(){
'use strict';

const DAGSCHEMA=[
  ['13u30','De Discovery Bay sluit even. Leg flyers op de tafels, zodat de gasten zien dat we even sluiten (Office voorziet ze ook in het Duits en het Engels).','Discovery Bay'],
  ['13u30 – 14u00','De piraten spoelen, trekken het water bij de ingang en de waterval weg en ruimen Pirate Place op. Dit is voortaan standaard.','Discovery Bay'],
  ['14u00','Briefing van de Kidsclub. De piraten sluiten indien mogelijk aan (of later als ze nog bezig zijn) en helpen daarna met opstart, decoratie en activiteiten.','Discovery Bay'],
  ['Eerst: vóór 14u15 of 15u00','Fiets ophalen bij de Housekeeping (achter de loods) en inklokken bij de check-in. Alleen voor schutter, kok, dronkaard, dief 1/overhead (met laadbak) en dief 2/Orry en heks (zonder laadbak). Wie ook in de show staat, doet dit vóór 14u15.','Kindertocht'],
  ['14u00 – 15u00','Klaarzetten van de Halloween-kinderactiviteiten (atelier). De bolderkarren worden voortaan vooraf onder het schip gezet; de suikerspin staat om 14u00 meteen klaar.','Marktje'],
  ['14u15','Opbouw van de show en de techniek','Halloween show'],
  ['15u00','Briefing onder het schip; opbouw van de kindertocht vanaf 15u10. Fiets ophalen en inklokken (voor wie een fiets neemt) vóór 15u00.','Kindertocht'],
  ['± 14u45/15u00 – 19u00','Halloween-kinderactiviteiten in de Bay','Marktje'],
  ['15u15 – 16u30','Orry & Friends Halloween show (15u15 en 16u00)','Halloween show'],
  ['16u15 – 16u40','Ontvangst naar de Pirates Place; het eerste tijdslot (lampion versieren) start om 16u25','Kindertocht'],
  ['16u40 – 18u25','Kindertocht: om het kwartier een groep, 8 groepen','Kindertocht'],
  ['19u00 – 19u30','Ombouw van de Bay: van de kindertocht naar de volwassentocht. Het marktje zet eerst de grote kar voor de tent van Entertainment klaar. Na de kindertocht een ronde door de hele Bay voor achtergebleven decoratie (de Kidsclub kan dit doen); Berta de heks wordt afgebouwd.','Ombouw per dag'],
  ['19u30 – 20u00','Pauze','—'],
  ['20u00 – 20u25','Portofoons ophalen en testen, eindcontrole, opbouw van de volwassentocht, omkleden','Volwassentocht'],
  ['20u30 – 22u20','Volwassentocht: tijdsloten van 10 minuten, laatste vertrek om 22u20. Start vooraan bij de ingang van de Bay, aan de tent.','Volwassentocht'],
  ['Tot 21u50','KIC-medewerkers die klaar zijn met opruimen en schoonmaken, komen via de personeelsingang binnen, melden zich bij Marith en helpen als griezels in de Bay.','Volwassentocht'],
  ['22u00','Einde van de dienst voor het marktje','Marktje'],
  ['22u30 – 23u30','Afbouw van de volwassentocht, met een ronde door de hele Bay voor achtergebleven decoratie. De laatste medewerker controleert of de nooddeuren dicht zijn.','Volwassentocht']
];

// de 12 tijdsloten van de volwassentocht
const SLOTS=[]; for(let m=20*60+30;m<=22*60+20;m+=10) SLOTS.push(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
const GROEPEN=['16:40','16:55','17:10','17:25','17:40','17:55','18:10','18:25'];

window.HW_ACT=window.HW_ACT||{};
window.HW_ACT.overzicht={
  stand:'15/10/2026',alles:true,
  data:['15/10','17/10','22/10','24/10','29/10','31/10','05/11'],
  tabs:[{id:'start',ic:'ℹ️',t:'Informatie'},
        {id:'planning',ic:'📅',t:'Planning per dag',type:'dagplanning',uitleg:'Het dagschema, jouw dag (kies je naam) en wie er die avond per onderdeel staat. Kies bovenaan de avond.'},
        {id:'ombouw',ic:'🔁',t:'Ombouw per dag',type:'ombouw',uitleg:'Per avond wat er tussen 19u00 en 19u30 omgebouwd moet worden, per zone en met de namen.'},
        {id:'tijd',ic:'⏱️',t:'Tijdsloten',uitleg:'De hele dag op een rij, en de tijdsloten van de kindertocht en de volwassentocht.'},
        {id:'praktisch',ic:'⚠️',t:'Praktisch'},{id:'docs',ic:'📎',t:'Documenten'}],
  feiten:[['Marktje','vanaf 14u00'],['Kindertocht','16u40'],['Ombouw','19u00'],['Volwassentocht','20u30'],['Speeldata','7 avonden']],
  dagschema:DAGSCHEMA,
  startKaartenVoor:[
    {nood:true,titel:'Belangrijk voor iedereen',l:['Zorg dat je echt op de afgesproken tijd aanwezig bent voor de briefing: marktje om 14u00 in het atelier, kindertocht om 15u00 onder het schip, volwassentocht vanaf 19u00 (ombouw).','Je staat buiten of op je post: zorg voor voldoende warme (onder)kleding en eventueel handschoenen. Bij je rol staat welke kleding je zelf moet voorzien.','Neem eigen eten mee voor de pauze: eten in de Evergreens is op deze dagen niet echt mogelijk.','Vragen? Meld ze zo snel mogelijk aan Marith en niet pas op de dag zelf.']},
    {titel:'🆕 Nieuw na de eerste avond',sub:'De belangrijkste werkpunten en afspraken uit de mail van het Halloween team (17/10). Ze staan ook uitgewerkt bij het onderdeel waar ze horen.',rijen:[
      ['Algemeen','Zet de Halloweenmuziek eerder aan (staat ze niet aan: meld het bij Marith). Vrij moment of weet je niet wat te doen? Vraag Marith welke taak je kunt oppakken. Na elke tocht een ronde door de hele Bay voor achtergebleven decoratie.'],
      ['Berta de heks','De pop komt in de eerste grot na de ingang, aangesloten links naast de deur (Nikki weet waar). Extra griezel tijdens de kindertocht; bij de volwassentocht wordt ze afgebouwd.'],
      ['Marktje','Bolderkarren vooraf onder het schip. Beneden op het strandje de betalende activiteiten en de maskers, op de eerste verdieping van het schip de suikerspin, op de tweede verdieping bij het roer het schminken. Om 19u00 eerst de grote kar voor de tent van Entertainment klaarzetten.'],
      ['Kindertocht','Start op Pirate Place, beneden op het platform van Janneke. Enkel het tijdslot dat vertrekt staat op Pirate Place. Laat kinderen niet alleen vertrekken. Dieven benaderen groepen van achteren. Bij de heks is duidelijk dat de tocht daar stopt.'],
      ['Volwassentocht','Start vooraan bij de ingang van de Bay, aan de tent. Meer schrikeffect, minder zombiestijl. Gasten zetten hun telefoonzaklamp aan voor de buitenroute. Het slot van de Safezone zit vast: trek de ketting van de kist.']],
     links:[{t:'🛍️ Marktje',url:'#marktje'},{t:'🏴‍☠️ Kindertocht',url:'#zeven-zeeen'},{t:'🎃 Volwassentocht',url:'#start'},{t:'⚠️ Alle afspraken',url:'#overzicht/praktisch',hoofd:true}]}
  ],
  startKaarten:[
    {titel:'De Halloweenperiode',p:['Van 12/10 tot en met 5/11 (volgens het overzichtsdraaiboek tot 9/11) is er in Center Parcs De Vossemeren Halloween-animatie. De tochten en het marktje lopen op 7 avonden: 15/10, 17/10, 22/10, 24/10, 29/10, 31/10 en 5/11. Het O&F-programma (Kids Disco en Bedtime stories) loopt op de andere dagen volgens het rooster in het overzichtsdraaiboek; op de tochtdagen is er geen O&F-programma.']},
    {titel:'De onderdelen',sub:'Tik een knop voor alle details van dat onderdeel.',rijen:[
      ['The Outbreak','Volwassentocht (vanaf 10 jaar) · 20u30 – 22u30 · Discovery Bay'],
      ['Zeven zeeën','Kindertocht (2 – 12 jaar) · 16u40 – 19u00 · € 3 · start in de Discovery Bay'],
      ['Halloween show','Orry & de heks · 15u15 en 16u00 · Discovery Bay'],
      ['Marktje','Halloween-kinderactiviteiten (atelier) · ± 14u45/15u00 – 19u00 · Discovery Bay'],
      ['O&F programma','Kids Disco en Bedtime stories · Time-Out Podium · niet op de tochtdagen']],
     links:[{t:'🎃 The Outbreak',url:'#start'},{t:'🏴‍☠️ Zeven zeeën',url:'#zeven-zeeen'},{t:'🎭 Halloween show',url:'#show'},{t:'🛍️ Marktje',url:'#marktje'},{t:'🪩 O&F programma',url:'#of'}]},
    {titel:'Wie is verantwoordelijk?',rijen:[['Algemeen','Marith Weickl (medeverantwoordelijke voor het Halloweenproject)'],['Griezeltocht (Bay)','Matthew Ooms'],['Kindertocht','Lien Ramaekers'],['Halloween show','Lennert Lehaen']],
     nota:'Per dag zijn er daarnaast aanspreekpunten bij het marktje (zie Planning per dag). Telefoonnummers staan in Contacten en in het overzichtsdraaiboek.'}
  ],
  uurschema:DAGSCHEMA.map(r=>[r[0],r[1],r[2]==='—'?'':r[2]]),
  balk:{start:14*60,eind:23*60+30,segs:[
    ['Klaarzetten',14*60,15*60,'#d98a2b'],['Kinderactiviteiten & kindertocht',15*60,19*60,'#2f8f9d'],['Ombouw',19*60,19*60+30,'#8a5cc7'],['Pauze',19*60+30,20*60,'#8a9a8e'],
    ['Opbouw',20*60,20*60+30,'#d98a2b'],['Volwassentocht',20*60+30,22*60+30,'#e8772e'],['Afbouw',22*60+30,23*60+30,'#2f6b70']],
    uren:['14u00','15u00','19u00','20u30','22u30','23u30']},
  tijdKaarten:[
    {titel:'Kindertocht: de 8 groepen',sub:'Gasten schrijven in op vaste tijdssloten (vol = vol) en versieren eerst 15 minuten hun lampion op de Pirates Place. Maximaal 10–15 kinderen per groep.',
     tabel:{kop:['Groep','Vertrek'],rijen:GROEPEN.map((t,i)=>['Groep '+(i+1),t])}},
    {titel:'Volwassentocht: de tijdsloten',sub:'Gasten schrijven in per tijdslot van 10 minuten, met 20 personen per tijdslot. Er vertrekt om de 5–8 minuten een groep van max 8–10 personen. Laatste vertrek 22:20.',
     p:['Tijdsloten: '+SLOTS.join(' · ')]},
    {titel:'O&F programma',rijen:[['Kids Disco','16u45 – 17u15 en 17u30 – 18u00 (Time-Out Podium)'],['Bedtime stories','16u45 – 17u00 (Time-Out Podium)']],nota:'Op de tochtdagen (donderdag en zaterdag: 15/10, 17/10, 22/10, 24/10, 29/10, 31/10 en 5/11) is er geen O&F-programma. Op de andere dagen volgt het rooster in het overzichtsdraaiboek.'}
  ],
  praktisch:[
    {titel:'Op tijd zijn',rijen:[
      ['Marktje','14u00 in het atelier voor de korte briefing; daarna naar de Bay. De bolderkarren worden voortaan vooraf onder het schip gezet.'],
      ['Kindertocht','15u00 onder het schip voor de briefing. Wie een fiets neemt (schutter, kok, dronkaard, dief 1 en 2, heks) klokt eerst in bij de check-in en haalt een fiets bij de Housekeeping, achter de loods.'],
      ['Ombouw','19u00 – 19u30: eerst je eigen post afbouwen, dan helpen met de ombouw (zie Ombouw per dag). Het marktje zet als eerste de grote kar voor de tent van Entertainment klaar.'],
      ['Volwassentocht','20u00 portofoon ophalen en testen, 20u25 iedereen op post, 20u30 start.']]},
    {titel:'Voorbereiding en opbouw',rijen:[
      ['Vooraf voorbereiden','Pak alles wat vooraf kan zo vroeg mogelijk op. Als iedereen een steentje bijdraagt, verloopt het evenement een stuk vlotter.'],
      ['Briefing op wisseldagen','De ateliermedewerkers van donderdag en zaterdag krijgen een briefing met wat vooraf kan gebeuren, inclusief decoratie.'],
      ['Decoratie Discovery Bay','Discovery Bay-medewerkers mogen waar mogelijk vooraf decoratie ophangen.'],
      ['Sluiting Bay om 13u30','Leg flyers op de tafels, zodat de gasten zien dat we even sluiten. Office voorziet ze ook in het Duits en het Engels.'],
      ['Piraten vóór 14u00','Na de sluiting van de Bay spoelen de piraten, trekken ze het water bij de ingang en de waterval weg en ruimen ze Pirate Place op. Dit is voortaan standaard. Vanaf 14u00 sluiten ze indien mogelijk aan bij de Kidsclub-briefing (of later als ze nog bezig zijn) en helpen ze daarna met opstart, decoratie en activiteiten.'],
      ['Sneller openen','Brief de Kidsclub-medewerkers duidelijk over welke taken zij kunnen overnemen, zodat Entertainment zich op de tochten kan focussen.'],
      ['Berta de heks (pop)','Komt in de eerste grot na de ingang en wordt links naast de deur aangesloten; Nikki weet waar. Tijdens de kindertocht is Berta een extra griezel: extra beleving zonder extra personeel. Bij de volwassentocht wordt ze afgebouwd.'],
      ['NEON bij de ingang','Laurent en Niels hebben de NEON opgehangen. Laurent heeft hem in de garderobe om de hoek gezet, met een laddertje erbij. De stroomvoorziening hangt veilig en kan opnieuw gebruikt worden.']]},
    {titel:'Tijdens het evenement',rijen:[
      ['Omkleden','Iedereen krijgt tijd om zich om te kleden en te schminken, vóór de dienst of om de beurt tussendoor. Zo is iedereen herkenbaar in thema.'],
      ['Muziek en sfeer','Zet de Halloweenmuziek eerder aan: dat maakt meteen veel verschil. Staat de muziek nog niet aan, meld het bij Marith.'],
      ['Silent disco','De dj draait Halloweenmuziek in plaats van algemene muziek.'],
      ['Taakverdeling','Marith voert minder zelf uit en verdeelt meer taken. Heb je een vrij moment of weet je niet wat je kunt doen? Vraag Marith welke taak je kunt oppakken.'],
      ['Poortje en nooddeuren','Bewaking of TD moet dagelijks gebeld worden om het poortje en de nooddeuren te openen en te sluiten. Normaal is dat al geregeld. Is het niet gebeurd, dan meldt de medewerker aan de voorpoort dit bij de verantwoordelijke van die dag. Neem zo nodig contact op met het meldpunt, TD of de duty.'],
      ['Stiften','Er zijn extra stiften besteld. Tot ze er zijn, mag je indien nodig extra stiften uit het atelier gebruiken.'],
      ['Boekingen','Die blijven verder open; dat is in orde.'],
      ['KIC als griezels','Zodra de KIC-medewerkers klaar zijn met opruimen en schoonmaken, komen ze via de personeelsingang binnen en melden ze zich bij Marith. Tot 21u50 kunnen ze meehelpen als griezels in de Bay, voor extra beleving.']]},
    {titel:'Afsluiten en netheid',rijen:[
      ['Decoratie opruimen','Doe na zowel de kinder- als de avondtocht een ronde door de hele Bay om achtergebleven decoratie op te ruimen. Na de kindertocht kan de Kidsclub dit doen. Spreek elkaar erop aan als iets vergeten wordt.'],
      ['Verlengsnoeren','Breng gebruikte en ongebruikte verlengsnoeren aan het einde van je shift terug onder het schip: we delen ze met meerdere afdelingen.'],
      ['Nooddeuren','De laatste medewerker controleert bij vertrek of de nooddeuren gesloten zijn. Lukt dat niet, bel dan even guestservice.'],
      ['Was en kleedkamers','Breng de vuile was weg en laat de kleedkamers netjes achter.'],
      ['Algemene netheid','Let allemaal goed op de algemene netheid.']]},
    {titel:'Draaiboeken en feedback',rijen:[
      ['Waar','De draaiboeken liggen in de kleedkamer en worden ook gedeeld in de WhatsAppgroepen.'],
      ['Vooraf','Lees je draaiboek goed na en stel je vragen zoveel mogelijk vóór je dienst begint.'],
      ['Feedback','Stuur feedback gerust via mail, of geef ze meteen aan Marith als je haar ziet. Vanaf de week van 19/10 komen er ook feedbackfiles binnen.']]},
    {titel:'Kleding, eten en weer',rijen:[
      ['Warm aankleden','Afhankelijk van je rol sta je de hele tocht buiten: zorg voor voldoende warme onderkleding en eventueel handschoenen. Bij je rol staat welke kleding je zelf moet voorzien.'],
      ['Eten','Eten in de Evergreens is tijdens de dagen van de Halloweentochten niet echt mogelijk. Neem eigen eten mee voor de pauze. Ga je toch in de Evergreens eten, houd er dan rekening mee dat bestellen tijd kost.'],
      ['O&F-karakters','De karakters dragen hun Halloweenkledij tijdens alle activiteiten: cape (Orry), hoed (Bing), weerwolvenjack (Rep), masker (Woops). Schmink mag, maar is geen must.']]},
    {titel:'Veiligheid en nood',rijen:[
      ['Volwassentocht','Raakt iemand in paniek, valt die of wil die stoppen? Meld “Code 10” + je locatie via de portofoon en blijf bij de persoon tot er hulp is.'],
      ['EHBO','Bij iets ernstigs of een EHBO-geval volgen we dezelfde procedures als op de werkvloer. Elk van jullie heeft een telefoon met het noodnummer van CP: dat bel je alleen in echte noodgevallen. Kleine EHBO’s verzorgen we in de Bay zelf; bij twijfel val je terug op de DUTY en/of je leidinggevende.'],
      ['Nationaliteiten','Een overzicht van de nationaliteiten per dag staat in de bijlage van de mail van Marith (niet in de app). Zo weet je welke talen welke dagen extra belangrijk zijn; tijdens de briefing staan we er kort bij stil.'],
      ['Ziek?','Meld dit altijd aan Marith (op 31 oktober aan Britt E.).']]},
    {titel:'Pauze en voorbereiding',rijen:[
      ['Pauze (marktje)','Wie zes uur of langer werkt heeft recht op pauze. Stem onderling af; de eerste pauze start vanaf 17u00 en iedereen heeft vóór 19u00 pauze gehad.'],
      ['Voorbereiden','Het draaiboek is het dagschema (handig op de dag zelf). Uit de manual bekijk je de pagina’s met praktische informatie en die van je eigen rol, en studeer je de teksten in de 4 talen in. De rest mag je lezen, maar is geen must.'],
      ['Telefoonnummers','Staan in Contacten en in de draaiboeken, bewust niet op deze pagina.']]}
  ],
  documenten:[
    {titel:'Draaiboek Halloween 2026',tekst:'Het overzicht van de hele Halloweenperiode (12/10 – 09/11): alle activiteiten, locaties, data en uren.',id:'1qSIK18QpBqPlBt0mP0fWKqy9vuVSIWY4'},
    {titel:'Draaiboek volwassentocht',tekst:'Per avond een schema met de tijdsplanning, je rol en je taak voor, tijdens en na de tocht.',id:'10YlhLUovoTlozitdnusfXJs9dKkcNuYg'},
    {titel:'Manual volwassentocht',tekst:'De uitgebreide uitleg van de volwassentocht (groot bestand met foto’s).',id:'1sFecCdFjW1JKQqfk8Qyo0yvDo23EkusG'},
    {titel:'Checklist verantwoordelijke',tekst:'De afdrukbare checklist voor de verantwoordelijke van de avond.',id:'1TiNG_IsYA_s-LOmST9r-U2ExZnLxrKwr'},
    {titel:'Draaiboek kindertocht',tekst:'Per dag het schema met je rol en taak, plus het schema voor Orry en de heks.',id:'1i9njdvvqUj3_eDf6295WjPWMtoPfgAkg'},
    {titel:'Manual kindertocht – 2026',tekst:'De uitgebreide uitleg van de kindertocht: praktische informatie, je rol en de teksten in 4 talen.',id:'1M9Y-_Zxvlfr9oVR6utjN3uTDmnhTJeR2'},
    {titel:'Disco concept',tekst:'De Halloween disco: richtlijn, dansjes en links.',id:'1Pm6lpiBDsRNffJ5L6b6buUlZPwbJjuX4'},
    {titel:'Script Halloween bedtime stories',tekst:'De twee verhalen in vier talen.',id:'1uOdk-WeKRuUSPJHsG_Z_xJvnNV53exg_'}
  ],
  mappen:[{titel:'Alles: Halloweenperiode 2026',id:'1PTdTRqa6ZeUv5jxgEispvTEfvfKI4rei',hoofd:true},
          {titel:'Map: Griezeltocht volwassenen – The Bay Outbreak',id:'17Wt1G_HijMTr8qCffnTxwozfKnKLtLpf'},{titel:'Map: Kindertocht',id:'1b90bUPP10aCn6tt6DCdh4ouZ60SuMyvF'},
          {titel:'Map: O&F – Kids Disco',id:'1odVXGRkE1A1W2a5P1ZnxMzGDjLc_roru'},{titel:'Map: O&F – Bedtime Stories',id:'1Fo77S5xzTMGOBsvqq8v9rRa7gRLFB5_B'}]
};
})();

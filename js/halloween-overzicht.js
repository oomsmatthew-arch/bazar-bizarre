// =====================================================================
//  HALLOWEEN · ALGEMEEN OVERZICHT — de inhoud.
//
//  Het overzicht heeft geen eigen planning: de dagplanning en de ombouw per dag worden bij het
//  tekenen samengesteld uit de planningen van de andere onderdelen (js/halloween.js).
//  Hier staat enkel wat vast is: het dagschema, de tijdsloten, de informatie en het praktische.
//  Bronnen: het overzichtsdraaiboek, de briefings en de mails van Marith, stand 15/10/2026.
//  Met opzet geen telefoonnummers of noodnummer: de site is openbaar (zie Contacten).
// =====================================================================
(function(){
'use strict';

const DAGSCHEMA=[
  ['Eerst: vóór 14u15 of 15u00','Fiets ophalen bij de Housekeeping (achter de loods) en inklokken bij de check-in. Alleen voor schutter, kok, dronkaard, dief 1/overhead (met laadbak) en dief 2/Orry en heks (zonder laadbak). Wie ook in de show staat, doet dit vóór 14u15.','Kindertocht'],
  ['14u00 – 15u00','Klaarzetten van de Halloween-kinderactiviteiten (atelier)','Marktje'],
  ['14u15','Opbouw van de show en de techniek','Halloween show'],
  ['15u00','Briefing onder het schip; opbouw van de kindertocht vanaf 15u10. Fiets ophalen en inklokken (voor wie een fiets neemt) vóór 15u00.','Kindertocht'],
  ['± 14u45/15u00 – 19u00','Halloween-kinderactiviteiten in de Bay','Marktje'],
  ['15u15 – 16u30','Orry & Friends Halloween show (15u15 en 16u00)','Halloween show'],
  ['16u15 – 16u40','Ontvangst naar de Pirates Place; het eerste tijdslot (lampion versieren) start om 16u25','Kindertocht'],
  ['16u40 – 18u25','Kindertocht: om het kwartier een groep, 8 groepen','Kindertocht'],
  ['16u45 – 18u00','Kids Disco (16u45 en 17u30) en Bedtime stories (16u45) op het Time-Out Podium, volgens rooster','O&F programma'],
  ['19u00 – 19u30','Ombouw van de Bay: van de kindertocht naar de volwassentocht','Ombouw per dag'],
  ['19u30 – 20u00','Pauze','—'],
  ['20u00 – 20u25','Portofoons ophalen en testen, eindcontrole, opbouw van de volwassentocht, omkleden','Volwassentocht'],
  ['20u30 – 22u20','Volwassentocht: tijdsloten van 10 minuten, laatste vertrek om 22u20','Volwassentocht'],
  ['22u00','Einde van de dienst voor het marktje','Marktje'],
  ['22u30 – 23u30','Afbouw van de volwassentocht','Volwassentocht']
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
    {nood:true,titel:'Belangrijk voor iedereen',l:['Zorg dat je echt op de afgesproken tijd aanwezig bent voor de briefing: marktje om 14u00 in het atelier, kindertocht om 15u00 onder het schip, volwassentocht vanaf 19u00 (ombouw).','Je staat buiten of op je post: zorg voor voldoende warme (onder)kleding en eventueel handschoenen. Bij je rol staat welke kleding je zelf moet voorzien.','Neem eigen eten mee voor de pauze: eten in de Evergreens is op deze dagen niet echt mogelijk.','Vragen? Meld ze zo snel mogelijk aan Marith en niet pas op de dag zelf.']}
  ],
  startKaarten:[
    {titel:'De Halloweenperiode',p:['Van 12/10 tot en met 5/11 (volgens het overzichtsdraaiboek tot 9/11) is er in Center Parcs De Vossemeren Halloween-animatie. De tochten en het marktje lopen op 7 avonden: 15/10, 17/10, 22/10, 24/10, 29/10, 31/10 en 5/11. De O&F-activiteiten (Kids Disco en Bedtime stories) volgen het rooster in het overzichtsdraaiboek.']},
    {titel:'De onderdelen',sub:'Tik een knop voor alle details van dat onderdeel.',rijen:[
      ['The Outbreak','Volwassentocht (vanaf 10 jaar) · 20u30 – 22u30 · Discovery Bay'],
      ['Zeven zeeën','Kindertocht (2 – 12 jaar) · 16u40 – 19u00 · € 3 · start in de Discovery Bay'],
      ['Halloween show','Orry & de heks · 15u15 en 16u00 · Discovery Bay'],
      ['Marktje','Halloween-kinderactiviteiten (atelier) · ± 14u45/15u00 – 19u00 · Discovery Bay'],
      ['O&F programma','Kids Disco en Bedtime stories · Time-Out Podium']],
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
    {titel:'O&F programma',rijen:[['Kids Disco','16u45 – 17u15 en 17u30 – 18u00 (Time-Out Podium)'],['Bedtime stories','16u45 – 17u00 (Time-Out Podium)']],nota:'Volgens het rooster in het overzichtsdraaiboek.'}
  ],
  praktisch:[
    {titel:'Op tijd zijn',rijen:[
      ['Marktje','14u00 in het atelier voor de korte briefing; daarna de bolderkarren naar de Bay.'],
      ['Kindertocht','15u00 onder het schip voor de briefing. Wie een fiets neemt (schutter, kok, dronkaard, dief 1 en 2, heks) klokt eerst in bij de check-in en haalt een fiets bij de Housekeeping, achter de loods.'],
      ['Ombouw','19u00 – 19u30: eerst je eigen post afbouwen, dan helpen met de ombouw (zie Ombouw per dag).'],
      ['Volwassentocht','20u00 portofoon ophalen en testen, 20u25 iedereen op post, 20u30 start.']]},
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

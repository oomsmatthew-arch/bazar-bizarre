// =====================================================================
//  TOPBAR + THEMA — de balk bovenaan, één keer beschreven.
//
//  Vroeger stond deze balk veertien keer gekopieerd in de HTML en zetten
//  vier bestanden elk op hun eigen manier het thema. Eén tekstje wijzigen
//  betekende veertien bestanden bijwerken, en omdat die vier thema-versies
//  zich net niet hetzelfde gedroegen liep het thema tussen pagina's uit de pas.
//  Nu staat het hier.
//
//  Zet dit bestand als EERSTE regel binnen <div class="wrap"> — dan schuift
//  de balk op zijn eigen plek naar binnen nog vóór de browser tekent, en zie
//  je geen pagina zonder balk voorbijkomen. Elke pagina zegt alleen nog wat er
//  anders is, met attributen op <body>:
//
//     data-titel="Besteloverzicht"   de titel in de balk (verplicht)
//     data-rechts="home"             rechtse knop: home (standaard) |
//                                    instellingen (startpagina) | terug (projecten)
//     data-extra="ratings.html|‹ Ratings"   een extra link vóór de rechtse knop
//
//  Staat los van kern.js — net als js/zoek.js en js/terug.js — zodat pagina's
//  die de kern niet laden (projecten, ratings) dezelfde balk en hetzelfde thema
//  krijgen. Laadt een pagina kern.js wél, dan neemt die de gebruikersknop over
//  met de profielfoto en het inlogscherm.
// =====================================================================
(function(){
  'use strict';

  const script=document.currentScript;

  // De hoofdmap afleiden uit het adres van dit bestand (js/topbar.js staat altijd
  // rechtstreeks onder de hoofdmap). Zo klopt het logo en de link naar de startpagina
  // zowel vanaf de startpagina zelf als vanuit paginas/.
  const ROOT=(function(){
    const s=script||[...document.scripts].find(x=>/js\/topbar\.js/.test(x.src||''));
    return (s&&s.src)? s.src.replace(/js\/topbar\.js.*$/,'') : new URL('./',location.href).href;
  })();

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ---------------- THEMA ----------------
  // Heb je zelf al eens op het maantje getikt, dan wint die keuze altijd. Zo niet, dan
  // volgen we de instelling van het toestel: wie z'n gsm op donker heeft staan, krijgt
  // de app meteen donker. Belangrijk: zolang je niets koos bewaren we ook niets — anders
  // leg je per ongeluk een keuze vast die je nooit gemaakt hebt (dat deden de ratings-
  // pagina's vroeger, waardoor ze niet meer meegingen met het toestel).
  const K_THEME='bb_home_theme';
  function themaKeuze(){
    let opgeslagen=null;
    try{ opgeslagen=localStorage.getItem(K_THEME); }catch(e){}
    if(opgeslagen==='dark'||opgeslagen==='light') return opgeslagen;
    try{ return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch(e){ return 'light'; }
  }
  function zetThema(){
    const dark=themaKeuze()==='dark';
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    const b=document.getElementById('themeBtn');
    if(b) b.textContent=dark?'☀️':'🌙';
    const tc=document.querySelector('meta[name="theme-color"]');
    if(tc) tc.setAttribute('content',dark?'#0f1a14':'#2f6450');
  }
  function wisselThema(){
    // Uitgaan van het thema dat NU op het scherm staat, niet van wat er bewaard is:
    // anders doet de eerste tik niets wanneer het toestel op donker staat en jij nog
    // niets koos.
    try{ localStorage.setItem(K_THEME, themaKeuze()==='dark' ? 'light' : 'dark'); }catch(e){}
    zetThema();
  }
  zetThema(); // meteen, nog voor de pagina getekend is (geen witte flits)
  // Wisselt het toestel van thema (bv. automatisch 's avonds) en heb je zelf nog niets
  // gekozen, dan gaat de app mee.
  try{
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
      let gekozen=null; try{ gekozen=localStorage.getItem(K_THEME); }catch(e){}
      if(!gekozen) zetThema();
    });
  }catch(e){}

  // ---------------- DE BALK ----------------
  const body=document.body;
  const titel=body.getAttribute('data-titel')||(document.title||'').split('·')[0].trim()||'EntertainmentVM';
  const rechts=body.getAttribute('data-rechts')||'home';
  const start=ROOT+'entertainment.html';

  // De rechtse knop. 'terug' geeft een knop i.p.v. een link, omdat de projectpagina
  // eerst het geopende project moet sluiten voor ze de pagina verlaat (js/projecten.js).
  let rechtsHtml='<a class="navbtn" href="'+esc(start)+'">Home</a>';
  if(rechts==='instellingen') rechtsHtml='<a class="navbtn" id="gearBtn" href="'+esc(ROOT+'paginas/instellingen.html')+'">Instellingen</a>';
  else if(rechts==='terug')   rechtsHtml='<button class="navbtn" id="terugBtn">Home</button>';

  // Optionele extra link ervoor, bv. "‹ Ratings" op de vergelijkpagina.
  let extraHtml='';
  const extra=body.getAttribute('data-extra');
  if(extra){
    const d=extra.split('|');
    extraHtml='<a class="navbtn" href="'+esc(d[0]||'')+'">'+esc(d[1]||'Terug')+'</a>';
  }

  const html=
    '<div class="topbar">'+
      '<a class="logolink" href="'+esc(start)+'" title="Naar de startpagina">'+
        '<img class="logo" id="homeLogo" width="251" height="256" src="'+esc(ROOT+'assets/logo-cp.png')+'" alt="Center Parcs">'+
      '</a>'+
      '<h1 id="title">'+esc(titel)+'</h1>'+
      '<span id="syncBadge" class="syncbadge" style="display:none" title="Wijzigingen worden verstuurd zodra er internet is"></span>'+
      '<button class="userbtn" id="userBtn" title="Wissel gebruiker"><span class="av" id="userAv">?</span><span class="nm" id="userNm">—</span></button>'+
      '<button class="navbtn" id="themeBtn" title="Donker/licht thema">🌙</button>'+
      extraHtml+
      rechtsHtml+
    '</div>';

  // Op zijn eigen plek naar binnen schuiven: het scriptje staat bovenaan in .wrap,
  // dus de balk komt precies waar hij vroeger met de hand stond.
  if(script&&script.parentNode) script.insertAdjacentHTML('beforebegin',html);
  else if(body) body.insertAdjacentHTML('afterbegin',html);

  const themeBtn=document.getElementById('themeBtn');
  if(themeBtn) themeBtn.onclick=wisselThema;
  zetThema(); // nu het maantje bestaat, meteen het juiste symbool tonen

  // De gebruikersknop met wat dit toestel lokaal al weet. Laadt de pagina kern.js,
  // dan wordt dit een tel later overschreven met de profielfoto en het inlogscherm.
  const nmEl=document.getElementById('userNm'), avEl=document.getElementById('userAv');
  let u=null; try{ u=JSON.parse(localStorage.getItem('bb_current_user')||'null'); }catch(e){}
  if(u&&u.naam){
    if(nmEl) nmEl.textContent=u.naam;
    if(avEl) avEl.textContent=u.naam.charAt(0).toUpperCase();
  }else{
    if(nmEl) nmEl.textContent='Inloggen';
    if(avEl) avEl.textContent='👤';
  }
  const userBtn=document.getElementById('userBtn');
  // Zonder kern.js is er geen inlogscherm op deze pagina; dan brengt de knop je naar
  // de startpagina, waar je wél kunt wisselen.
  if(userBtn) userBtn.onclick=()=>{ location.href=start; };

  // Voor kern.js en de pagina's: één plek om het thema te zetten.
  window.bbThema={ zet:zetThema, wissel:wisselThema, keuze:themaKeuze };
})();

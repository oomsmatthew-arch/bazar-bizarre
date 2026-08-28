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
//     data-topbar="geen"             GEEN balk en GEEN thema — enkel de vensters.
//                                    Voor bazar-bizarre-spel.html, die een eigen balk en
//                                    een eigen donkerblauw thema heeft maar wél bbToon,
//                                    bbBevestig en bbVraagCode wil gebruiken.
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

  // ENKEL DE VENSTERS, GEEN BALK — met data-topbar="geen" op <body>.
  // De spelpagina heeft een eigen balk en een eigen donkerblauw thema, maar wil wél de
  // vensters onderaan dit bestand (bbToon, bbBevestig, bbVraagTekst, bbVraagCode). Zonder
  // deze uitweg zou ze er een groene balk bij krijgen, zou het thema van de app over het
  // hare heen gezet worden, en zou er een tweede element met id="title" ontstaan.
  const geenBalk = document.body && document.body.getAttribute('data-topbar')==='geen';

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
  if(!geenBalk){
    zetThema(); // meteen, nog voor de pagina getekend is (geen witte flits)
    // Wisselt het toestel van thema (bv. automatisch 's avonds) en heb je zelf nog niets
    // gekozen, dan gaat de app mee.
    try{
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
        let gekozen=null; try{ gekozen=localStorage.getItem(K_THEME); }catch(e){}
        if(!gekozen) zetThema();
      });
    }catch(e){}
  }

  // ---------------- DE BALK ----------------
  const body=document.body;
  if(!geenBalk) bouwBalk();
  function bouwBalk(){
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
  }

  // =========================================================================
  //  DE DRIE VERVANGERS VAN DE SYSTEEMVENSTERS
  //
  //  alert(), confirm() en prompt() zien er in de geïnstalleerde app op een iPad uit
  //  als een systeemfout — alsof de app crasht — en ze blokkeren alles tot je ze
  //  wegklikt. prompt() toont bovendien wat je typt in KLARE TEKST, wat bij een
  //  wachtwoord betekent dat wie naast je staat gewoon meeleest.
  //
  //  LET OP bij het omzetten: confirm() en prompt() waren synchroon, deze vervangers
  //  zijn dat niet. Elke aanroep hoort dus 'await' te krijgen. Zonder await krijg je
  //  een belofte terug, en die is áltijd waar — dan zou "weet je het zeker?" stilzwijgend
  //  altijd ja betekenen, en een wachtwoordvraag stilletjes overgeslagen worden.
  //
  //  Ze staan hier en niet in kern.js omdat projecten.html en de ratings-pagina's de
  //  kern niet laden, maar wél om bevestiging en om een wachtwoord vragen. Dit bestand
  //  laadt élke pagina.
  // =========================================================================

  // ---------------- MELDING (in plaats van alert) ----------------
  //     bbToon('Bewaard.')                 gewone melding
  //     bbToon('Dat lukte niet.','fout')   met een rood streepje ervoor
  // Schuift onderaan in beeld en verdwijnt vanzelf; tik erop om hem meteen weg te halen.
  // Fouten blijven wat langer staan dan bevestigingen. Blokkeert niets — je kunt gewoon
  // doorwerken, wat op een tablet ter plaatse het hele verschil maakt.
  function bbToon(tekst,soort){
    let bak=document.getElementById('bbMeldingen');
    if(!bak){
      bak=document.createElement('div');
      bak.id='bbMeldingen'; bak.className='bbmeldingen';
      bak.setAttribute('role','status'); bak.setAttribute('aria-live','polite');
      document.body.appendChild(bak);
    }
    const el=document.createElement('div');
    el.className='bbmelding'+(soort==='fout'?' fout':'');
    el.textContent=String(tekst==null?'':tekst);
    bak.appendChild(el);
    let weg=null;
    const sluit=()=>{
      if(!el.isConnected) return;
      clearTimeout(weg);
      el.classList.add('weg');
      setTimeout(()=>el.remove(),260);
    };
    el.onclick=sluit;
    weg=setTimeout(sluit, soort==='fout'?6000:3500);
    return el;
  }

  // ---------------- EEN VENSTER TONEN EN WEER OPRUIMEN ----------------
  // Alle drie de vensters hieronder gaan hier doorheen, om één reden: de TERUGKNOP.
  //
  // js/terug.js zorgt dat terug een open venster sluit in plaats van de hele pagina te
  // verlaten. Het merkt een venster op via een MutationObserver die naar KLASSE-wijzigingen
  // kijkt. Een element dat we mét de klasse 'open' erop in de pagina hangen, ziet het dus
  // NIET — dat is een childList-wijziging, geen attribuutwijziging. Gevolg: stond er een
  // venster open en drukte je op terug, dan verliet je de hele pagina. Op een tablet is
  // terug een veegbeweging vanaf de rand, dus dat gebeurde zo — midden in "Ronde wissen?".
  //
  // Daarom: eerst invoegen zónder 'open', en die klasse pas een frame later zetten. Dan is
  // het wél een attribuutwijziging en zet terug.js er een stap voor klaar. Bij het sluiten
  // halen we 'open' er eerst weer af (weer een attribuutwijziging, zodat terug.js zijn stap
  // netjes opruimt) en pas daarna het element zelf.
  //
  // En we melden een eigen sluiter aan onder een uniek id: drukt de gebruiker op terug, dan
  // roept terug.js díe aan, en beantwoorden we de wachtende vraag met de annuleer-waarde.
  // Zonder dat zou "await bbBevestig(...)" eeuwig blijven wachten en bleef er een onzichtbaar
  // element in de pagina achter.
  let vensterNr=0;
  function toonVenster(el,sluitMet){
    el.id='bbvenster'+(++vensterNr);
    if(!window.bbVensterSluiters) window.bbVensterSluiters={};
    window.bbVensterSluiters[el.id]=sluitMet;
    document.body.appendChild(el);
    // requestAnimationFrame kan ontbreken in een heel oude webview; dan een gewone tik.
    if(window.requestAnimationFrame) requestAnimationFrame(()=>el.classList.add('open'));
    else setTimeout(()=>el.classList.add('open'),0);
  }
  function ruimVensterOp(el){
    if(window.bbVensterSluiters) delete window.bbVensterSluiters[el.id];
    el.classList.remove('open');   // eerst: terug.js ziet dit en haalt zijn stap weg
    el.remove();
  }

  // ---------------- BEVESTIGING (in plaats van confirm) ----------------
  //     if(!await bbBevestig({titel:'Verwijderen?', tekst:'…', gevaar:true})) return;
  function bbBevestig(opties){
    const o=(typeof opties==='string')?{tekst:opties}:(opties||{});
    return new Promise(klaar=>{
      const venster=document.createElement('div');
      venster.className='cammodal bevestigvenster';
      venster.innerHTML=
        '<div class="cammodal-box choose">'+
          '<div class="cammodal-title">'+esc(o.titel||'Even bevestigen')+'</div>'+
          (o.tekst?('<p class="bev-tekst">'+esc(o.tekst)+'</p>'):'')+
          '<button type="button" class="btn '+(o.gevaar?'gevaar':'primary')+' bev-ja">'+esc(o.okTekst||'Ja, doorgaan')+'</button>'+
          '<button type="button" class="btn clear bev-nee">'+esc(o.neeTekst||'Annuleren')+'</button>'+
        '</div>';
      let af=false;
      function sluit(waarde){
        if(af) return;               // terug.js én de knop kunnen allebei sluiten
        af=true;
        document.removeEventListener('keydown',toets,true);
        ruimVensterOp(venster);
        klaar(waarde);
      }
      toonVenster(venster,()=>sluit(false));  // terug = annuleren
      // In de opvangfase (true): het inlogscherm luistert zelf ook naar Escape en naar
      // cijfers voor het pincodeklavier. Zonder dit zou één druk op Escape hier én daar
      // aankomen.
      function toets(e){
        if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sluit(false); return; }
        if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); sluit(true); return; }
        e.stopPropagation();
      }
      document.addEventListener('keydown',toets,true);
      venster.querySelector('.bev-ja').onclick=()=>sluit(true);
      venster.querySelector('.bev-nee').onclick=()=>sluit(false);
      venster.addEventListener('click',e=>{ if(e.target===venster) sluit(false); });
      setTimeout(()=>{ try{ venster.querySelector('.bev-ja').focus(); }catch(e){} },30);
    });
  }

  // ---------------- IETS LATEN INTYPEN (in plaats van prompt) ----------------
  //     const naam = await bbVraagTekst({titel:'Nieuwe categorie', plaatshouder:'bv. CGT'});
  // Geeft null terug als je annuleert, net zoals prompt() deed.
  function bbVraagTekst(opties){
    const o=(typeof opties==='string')?{titel:opties}:(opties||{});
    return new Promise(klaar=>{
      const venster=document.createElement('div');
      venster.className='cammodal open bevestigvenster';
      venster.innerHTML=
        '<div class="cammodal-box choose">'+
          '<div class="cammodal-title">'+esc(o.titel||'Invullen')+'</div>'+
          (o.tekst?('<p class="bev-tekst">'+esc(o.tekst)+'</p>'):'')+
          '<input type="'+(o.soort==='getal'?'number':'text')+'" class="finp bev-inp" '+
            (o.soort==='getal'?'inputmode="numeric" ':'')+
            (o.maxlengte?('maxlength="'+(+o.maxlengte)+'" '):'')+
            'placeholder="'+esc(o.plaatshouder||'')+'">'+
          '<div class="code-fout" style="display:none"></div>'+
          '<button type="button" class="btn primary bev-ja">'+esc(o.okTekst||'Bewaren')+'</button>'+
          '<button type="button" class="btn clear bev-nee">Annuleren</button>'+
        '</div>';
      document.body.appendChild(venster);
      const inp=venster.querySelector('.bev-inp');
      const fout=venster.querySelector('.code-fout');
      inp.value=(o.waarde==null?'':String(o.waarde));
      function sluit(waarde){
        document.removeEventListener('keydown',toets,true);
        venster.remove();
        klaar(waarde);
      }
      async function probeer(){
        const waarde=inp.value;
        if(o.controle){
          let melding='';
          try{ melding=await o.controle(waarde); }
          catch(err){ melding='Er ging iets mis. Probeer opnieuw.'; }
          if(melding){ fout.textContent=melding; fout.style.display=''; inp.focus(); inp.select(); return; }
        }
        sluit(waarde);
      }
      function toets(e){
        if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sluit(null); return; }
        if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); probeer(); return; }
        e.stopPropagation();
      }
      document.addEventListener('keydown',toets,true);
      venster.querySelector('.bev-ja').onclick=probeer;
      venster.querySelector('.bev-nee').onclick=()=>sluit(null);
      venster.addEventListener('click',e=>{ if(e.target===venster) sluit(null); });
      setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} },30);
    });
  }

  // ---------------- CODEVENSTER (wachtwoord/pincode) ----------------
  //     const code = await bbVraagCode({titel:'Wachtwoord beheer', controle:v=>...});
  //     code === null   →   geannuleerd (net zoals prompt() null gaf)
  //
  // 'controle' krijgt wat er getypt is en geeft een FOUTMELDING terug, of een lege tekst
  // als het klopt. Mag ook een belofte teruggeven — de pincodes zijn versleuteld opgeslagen
  // en die vergelijking is asynchroon. Een foute code probeer je meteen opnieuw in hetzelfde
  // venster, in plaats van dat er een tweede melding overheen springt.
  function bbVraagCode(opties){
    const o=opties||{};
    return new Promise(klaar=>{
      const venster=document.createElement('div');
      venster.className='cammodal open codevenster';
      venster.innerHTML=
        '<div class="cammodal-box choose">'+
          '<div class="cammodal-title">'+esc(o.titel||'Code')+'</div>'+
          (o.uitleg?('<p class="code-uitleg">'+esc(o.uitleg)+'</p>'):'')+
          '<input type="password" class="finp code-inp" autocomplete="off" '+
            (o.cijfers===false?'':'inputmode="numeric" ')+
            (o.maxlengte?('maxlength="'+(+o.maxlengte)+'" '):'')+
            'placeholder="'+esc(o.plaatshouder||'••••')+'">'+
          '<div class="code-fout" style="display:none"></div>'+
          '<button type="button" class="btn primary code-ok">Doorgaan</button>'+
          '<button type="button" class="btn clear code-nee">Annuleren</button>'+
        '</div>';
      document.body.appendChild(venster);
      const inp=venster.querySelector('.code-inp');
      const fout=venster.querySelector('.code-fout');
      const ok=venster.querySelector('.code-ok');
      let bezig=false;

      function sluit(waarde){
        document.removeEventListener('keydown',toets,true);
        venster.remove();
        klaar(waarde);
      }
      function toets(e){
        if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); sluit(null); return; }
        if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); probeer(); return; }
        e.stopPropagation();
      }
      async function probeer(){
        if(bezig) return;
        const waarde=inp.value;
        if(o.controle){
          bezig=true; ok.disabled=true;
          let melding='';
          try{ melding=await o.controle(waarde); }
          catch(err){ melding='Er ging iets mis. Probeer opnieuw.'; }
          bezig=false; ok.disabled=false;
          if(melding){
            fout.textContent=melding; fout.style.display='';
            inp.value=''; inp.focus();
            return;                       // venster blijft open: meteen opnieuw proberen
          }
        }
        sluit(waarde);
      }

      document.addEventListener('keydown',toets,true);
      ok.onclick=probeer;
      venster.querySelector('.code-nee').onclick=()=>sluit(null);
      venster.addEventListener('click',e=>{ if(e.target===venster) sluit(null); });
      setTimeout(()=>{ try{ inp.focus(); }catch(e){} },30);
    });
  }

  // Voor kern.js en de pagina's: het thema, en de vervangers van de systeemvensters.
  window.bbThema={ zet:zetThema, wissel:wisselThema, keuze:themaKeuze };
  window.bbVraagCode=bbVraagCode;
  window.bbVraagTekst=bbVraagTekst;
  window.bbBevestig=bbBevestig;
  window.bbToon=bbToon;
})();

// ---------------- TERUG-KNOP ----------------
// Tussen pagina's regelt de browser de terugknop zelf. Wat de browser NIET ziet,
// is wat er binnen één pagina opengaat: vensters (foto, camera, formulier,
// bevestiging…) en detailweergaves die met tonen/verbergen werken. Zonder hulp
// springt terug daar meteen de hele pagina uit, midden in een ingevuld formulier.
//
// Daarom houden we hier een stapeltje bij van wat er openstaat en spiegelen we
// dat in de browsergeschiedenis: één stap per open ding. Terug sluit dan telkens
// het bovenste, en verlaat de pagina pas als er niets meer openstaat.
//
// Twee dingen die een pagina kan meegeven:
//
//   window.bbVensterSluiters = { taakModal: sluitTaak }
//     Een eigen sluitfunctie per venster, voor als er meer moet gebeuren dan de
//     klasse 'open' weghalen (een camera stoppen, een video pauzeren, een
//     wachtende vraag beantwoorden). Zonder opgave halen we gewoon 'open' weg.
//
//   bbStap.open('project', naarLijst)  /  bbStap.dicht('project')
//     Voor een detailweergave die géén venster is, zoals de projectpagina die
//     de projectlijst verbergt. Terug roept dan jouw sluitfunctie aan.
(function(){
  const VENSTERS='.cammodal.open, .modal.open';
  // Onderste eerst. Een venster staat als {el}, een eigen stap als {naam,sluit}.
  const stapel=[];
  let eigenStap=0; // eigen history.go()'s die we straks mogen negeren

  history.replaceState({bbv:0},'');

  function openVensters(){ return Array.from(document.querySelectorAll(VENSTERS)); }

  // Eén venster sluiten, het liefst via de sluitfunctie van de pagina zelf.
  function sluitVenster(el){
    const eigen=(window.bbVensterSluiters||{})[el.id];
    try{
      if(typeof eigen==='function') eigen();
      else if(el.id==='camModal' && typeof closeCamera==='function') closeCamera();
      else if(el.id==='fotoView' && typeof closeFotoView==='function') closeFotoView();
    }catch(e){}
    el.classList.remove('open'); // vangnet: hij moet hoe dan ook dicht zijn
  }

  // Alles vanaf plek i van de stapel halen en sluiten (bovenste eerst).
  // Het item op plek i sluiten we niet als de pagina dat zelf al deed.
  function haalWeg(i,alDicht){
    const weg=stapel.splice(i);
    for(let j=weg.length-1;j>=0;j--){
      if(j===0 && alDicht) continue;
      const s=weg[j];
      if(s.el){ if(s.el.classList.contains('open')) sluitVenster(s.el); }
      else if(typeof s.sluit==='function'){ try{ s.sluit(); }catch(e){} }
    }
    return weg.length;
  }

  // De stapel gelijkzetten met wat er echt openstaat. Wordt aangeroepen zodra
  // ergens een klasse verandert, en nadat een eigen terugstap is aangekomen.
  function gelijkzetten(){
    const nu=openVensters();
    // 1) Door de pagina zelf gesloten (kruisje, Annuleren, Escape, Bewaren)?
    //    Dan schuiven we de geschiedenis mee, anders moet je één keer extra
    //    op terug drukken voor er iets zichtbaars gebeurt.
    const i=stapel.findIndex(s=>s.el && nu.indexOf(s.el)<0);
    if(i>=0){
      const aantal=haalWeg(i,true);
      eigenStap++;
      history.go(-aantal);
      return; // de rest doen we zodra die stap binnen is
    }
    // 2) Nieuw opengegaan? Eén stap erbij per venster.
    nu.forEach(el=>{
      if(stapel.some(s=>s.el===el)) return;
      stapel.push({el:el});
      history.pushState({bbv:stapel.length},'');
    });
  }

  window.addEventListener('popstate',e=>{
    if(eigenStap>0){ eigenStap--; gelijkzetten(); return; } // onze eigen stap
    const doel=(e.state && e.state.bbv)||0;
    if(doel>=stapel.length) return; // vooruit-knop: niets te herstellen
    haalWeg(doel,false);
    // De stapel is hierboven al bijgewerkt, dus de waarnemer hieronder ziet
    // straks geen verschil meer en zet geen extra stap terug.
  });

  // Vensters gaan op tientallen plaatsen open en dicht; in plaats van dat overal
  // te herhalen kijken we mee wanneer de klasse 'open' erbij komt of afgaat.
  function startWaarnemer(){
    new MutationObserver(gelijkzetten)
      .observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  if(document.body) startWaarnemer();
  else document.addEventListener('DOMContentLoaded',startWaarnemer);

  // Voor detailweergaves die geen venster zijn (zie de uitleg bovenaan).
  window.bbStap={
    open:function(naam,sluit){
      if(stapel.some(s=>s.naam===naam)) return; // staat al open
      stapel.push({naam:naam,sluit:sluit});
      history.pushState({bbv:stapel.length},'');
    },
    dicht:function(naam){
      const i=stapel.findIndex(s=>s.naam===naam);
      if(i<0) return; // stond er al niet meer in (bv. net door terug gesloten)
      const aantal=haalWeg(i,true);
      eigenStap++;
      history.go(-aantal);
    }
  };
})();

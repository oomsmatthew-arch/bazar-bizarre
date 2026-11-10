// ---------------- KAPOT MELDEN (techniek) ----------------
// Iedereen kan iets technisch kapot melden — ook wie Techniek zelf niet ziet. Het venster
// staat los van de Techniek-pagina, zodat de startpagina het ook kan openen:
//     techniekMelden()            kiezen uit de lijst (of iets dat er niet in staat)
//     techniekMelden(itemId)      meteen voor dat item (bv. vanuit Techniek zelf)
// De melding komt in het logboek van Techniek (BBInv.techniekMeld) en zet het item op kapot.
// Het venster gebruikt de gewone vensterklassen (cammodal), dus terug.js sluit het netjes.
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let gekozen=null;      // {id} van een item, of {naam} voor iets dat niet in de lijst staat
  let foto='';
  let klaar=null;        // terugroepen na het melden (bv. de Techniek-pagina hertekenen)

  function zorgVenster(){
    if($('tkMeldModal')) return;
    const d=document.createElement('div');
    d.className='cammodal'; d.id='tkMeldModal';
    d.innerHTML=
      '<div class="cammodal-box formbox">'+
        '<div class="cammodal-title">⚠ Iets kapot melden</div>'+
        '<p class="hint" style="margin:0;">Licht, geluid of ander technisch materiaal stuk? Meld het hier; de techniekers zien het meteen.</p>'+
        '<label class="mlbl" for="tkmZoek">Wat is er kapot?</label>'+
        '<input type="text" id="tkmZoek" class="finp" placeholder="Zoek, bv. headset, XLR, spot…" autocomplete="off">'+
        '<div class="tkm-lijst" id="tkmLijst"></div>'+
        '<div id="tkmAantalVak" hidden><label class="mlbl" for="tkmAantal">Hoeveel zijn er kapot?</label>'+
          '<input type="tel" inputmode="numeric" id="tkmAantal" class="finp" value="1" style="max-width:110px"></div>'+
        '<label class="mlbl" for="tkmTekst">Wat is er mis?</label>'+
        '<textarea id="tkmTekst" class="finp" rows="3" placeholder="bv. geen geluid links, stekker los, flikkert…"></textarea>'+
        '<div class="row" style="margin-top:10px;align-items:center;gap:8px;display:flex;">'+
          '<button type="button" class="btn" id="tkmFotoBtn">📷 Foto</button>'+
          '<img id="tkmFotoPrev" class="thumb" alt="" style="display:none">'+
        '</div>'+
        '<div class="sc-voet">'+
          '<span class="sc-teller" id="tkmKeuze"></span>'+
          '<button type="button" class="btn" id="tkmAnnuleer">Annuleren</button>'+
          '<button type="button" class="btn primary" id="tkmMeld">Melden</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(d);
    $('tkmZoek').oninput=()=>{ gekozen=null; tekenLijst(); };
    $('tkmAnnuleer').onclick=sluit;
    d.addEventListener('click',e=>{ if(e.target===d) sluit(); });
    $('tkmFotoBtn').onclick=()=>{
      if(typeof chooseFoto!=='function'){ bbToon('Een foto toevoegen kan hier niet.'); return; }
      chooseFoto(url=>{ if(!url) return; foto=url; const p=$('tkmFotoPrev'); p.src=url; p.style.display=''; });
    };
    $('tkmMeld').onclick=meld;
  }

  function items(){
    const B=window.BBInv;
    return (B&&B.getTechniek?B.getTechniek():[]).filter(it=>!(it.type==='los'&&it.status==='weg'))
      .sort((a,b)=>String(a.naam).localeCompare(String(b.naam),'nl',{numeric:true}));
  }
  function tekenLijst(){
    const q=($('tkmZoek').value||'').trim().toLowerCase();
    const alle=items();
    let lijst=q?alle.filter(it=>((it.naam||'')+' '+(it.locatie||'')+' '+(it.groep||'')).toLowerCase().indexOf(q)>=0):alle;
    const box=$('tkmLijst'); box.innerHTML='';
    lijst.slice(0,40).forEach(it=>{
      const b=document.createElement('button'); b.type='button';
      b.className='tkm-item'+(gekozen&&gekozen.id===it.id?' gekozen':'');
      b.innerHTML='<b>'+esc(it.naam)+'</b><span>'+esc([it.groep,it.locatie].filter(Boolean).join(' · '))+
        (it.type==='los'&&it.status==='kapot'?' · al gemeld':'')+'</span>';
      b.onclick=()=>{ gekozen={id:it.id}; tekenLijst(); };
      box.appendChild(b);
    });
    if(lijst.length>40){ const m=document.createElement('div'); m.className='tkm-meer'; m.textContent='… en nog '+(lijst.length-40)+'. Typ om te zoeken.'; box.appendChild(m); }
    // Staat het er niet in? Dan meld je wat je getypt hebt.
    if(q && !alle.some(it=>String(it.naam||'').trim().toLowerCase()===q)){
      const raw=$('tkmZoek').value.trim();
      const b=document.createElement('button'); b.type='button';
      b.className='tkm-item anders'+(gekozen&&gekozen.naam?' gekozen':'');
      b.innerHTML='<b>Iets anders: “'+esc(raw)+'”</b><span>staat niet in de lijst</span>';
      b.onclick=()=>{ gekozen={naam:raw}; tekenLijst(); };
      box.appendChild(b);
    }
    if(!alle.length && !q){ box.innerHTML='<div class="tkm-meer">Typ hierboven wat er kapot is.</div>'; }
    // Telbaar materiaal (kabels…): vragen hoeveel.
    const it=gekozen&&gekozen.id?alle.find(x=>x.id===gekozen.id):null;
    $('tkmAantalVak').hidden=!(it&&it.type==='aantal');
    $('tkmKeuze').textContent=it?it.naam:(gekozen&&gekozen.naam?gekozen.naam:'Nog niets gekozen');
  }

  function open(itemId,naKlaar){
    zorgVenster();
    gekozen=itemId?{id:itemId}:null; foto=''; klaar=naKlaar||null;
    $('tkmZoek').value=''; $('tkmTekst').value=''; $('tkmAantal').value='1';
    const p=$('tkmFotoPrev'); p.src=''; p.style.display='none';
    tekenLijst();
    $('tkMeldModal').classList.add('open');
  }
  function sluit(){ const m=$('tkMeldModal'); if(m) m.classList.remove('open'); }

  function meld(){
    // Niets gekozen maar wel iets getypt: dan is dat wat er kapot is.
    if(!gekozen){ const raw=($('tkmZoek').value||'').trim(); if(raw) gekozen={naam:raw}; }
    if(!gekozen){ bbToon('Kies wat er kapot is, of typ het in het zoekveld.'); return; }
    const tekst=($('tkmTekst').value||'').trim();
    if(!tekst){ bbToon('Zeg kort wat er mis is.'); $('tkmTekst').focus(); return; }
    const r=window.BBInv.techniekMeld({itemId:gekozen.id||'',naam:gekozen.naam||'',tekst:tekst,foto:foto,
      aantal:parseInt($('tkmAantal').value,10)||1});
    sluit();
    bbToon('Gemeld: '+(r.item_naam||'iets')+'. De techniekers zien het meteen.');
    if(typeof klaar==='function') try{ klaar(r); }catch(e){}
  }

  window.techniekMelden=open;
})();

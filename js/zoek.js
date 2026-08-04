// ---------------- ALGEMENE ZOEKFUNCTIE (over alle categorieen) ----------------
// Eén vergrootglas in de balk op ELKE pagina. Klik je erop, dan verschijnt een
// zoekveld dat tegelijk in contacten, voorraad, bestellingen, checklists, logboek,
// projecten en de manuals zoekt. Klik een resultaat om naar de juiste pagina te gaan.
// Pagina's met een eigen zoekveld vullen dat meteen in via ?zoek= in de link.
//
// Staat los van kern.js zodat het ook werkt op pagina's die de kern niet laden
// (projecten, ratings, het spel). De gedeelde gegevens komen uit BBInv (inventaris.js).
(function(){
  'use strict';

  // Eigen kleine html-ontsmetter zodat dit bestand nergens van afhangt.
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  const ZOEK_PREFILL={'inventaris.html':'invZoek','bestellingen.html':'bestelZoek',
    'contacten.html':'contZoek','manuals.html':'manualsZoek','projecten.html':'projZoek',
    'activiteit.html':'actZoek','ratings.html':'fZoek'};

  function bevat(q,...vals){ return vals.some(v=>v&&String(v).toLowerCase().indexOf(q)>=0); }

  // Doorzoekt de manuals-boom (mappen + bestanden) recursief.
  function zoekManuals(node,q,pad,out){
    if(!node) return;
    (node.folders||[]).forEach(f=>{
      if(bevat(q,f.name)) out.push({label:f.name,sub:'Map'+(pad.length?' in '+pad.join(' › '):'')});
      zoekManuals(f,q,pad.concat(f.name),out);
    });
    (node.items||[]).forEach(it=>{
      if(bevat(q,it.title,it.desc,it.src)) out.push({label:it.title||it.src,sub:(it.type||'pdf').toUpperCase()+(pad.length?' in '+pad.join(' › '):'')});
    });
  }

  // Verzamelt alle treffers, gegroepeerd per categorie.
  function zoekAlles(q){
    q=(q||'').toLowerCase().trim();
    const groepen=[]; const B=window.BBInv; if(!q||!B) return groepen;
    const LIM=8;
    const voegtoe=(titel,page,rijen)=>{ if(rijen.length) groepen.push({titel,page,rijen:rijen.slice(0,LIM),meer:Math.max(0,rijen.length-LIM)}); };
    const veilig=fn=>{ try{ return fn()||[]; }catch(e){ return []; } };

    voegtoe('Contacten','contacten.html', veilig(()=>B.getContacten()).filter(c=>bevat(q,c.naam,c.rol,c.tel,c.mail))
      .map(c=>({label:c.naam||c.rol||'Contact',sub:c.rol||c.tel||c.mail||''})));

    voegtoe('Voorraad','inventaris.html', veilig(()=>B.getPrijzen()).filter(p=>bevat(q,p.naam))
      .map(p=>({label:p.naam,sub:'Voorraad: '+(p.stock!=null?p.stock:'?')})));

    voegtoe('Bestellingen','bestellingen.html', veilig(()=>B.getBestellingen()).filter(b=>bevat(q,b.info,b.leverancier,b.cat,b.status,b.door,b.opm))
      .map(b=>({label:b.info||b.leverancier||'Bestelling',sub:[b.leverancier,b.status].filter(Boolean).join(' — ')})));

    const chk=[]; veilig(()=>B.getChecklisten()).forEach(l=>{
      if(bevat(q,l.naam)) chk.push({label:l.naam,sub:'Checklist'});
      (l.items||[]).forEach(it=>{ if(bevat(q,it.text)) chk.push({label:it.text,sub:'in '+(l.naam||'checklist')}); });
    });
    voegtoe('Checklists','checklists.html',chk);

    voegtoe('Logboek','logboek.html', veilig(()=>B.getLogboek()).filter(l=>bevat(q,l.tekst,l.auteur,l.datum))
      .map(l=>({label:(l.tekst||'').slice(0,80)||'Notitie',sub:[l.auteur,l.datum].filter(Boolean).join(' · ')})));

    const proj=[]; veilig(()=>B.getProjecten()).forEach(p=>{
      if(bevat(q,p.naam,p.doel,p.status)) proj.push({label:p.naam,sub:p.doel||p.status||'Project'});
    });
    voegtoe('Projecten','projecten.html',proj);

    const man=[]; try{ zoekManuals(B.getManualsTree(),q,[],man); }catch(e){}
    voegtoe('Online manuals','manuals.html',man);

    return groepen;
  }

  let zoekEl=null;
  function bouwZoek(){
    if(zoekEl) return zoekEl;
    const ov=document.createElement('div'); ov.className='gzoek-overlay'; ov.id='gzoekOverlay';
    ov.innerHTML=
      '<div class="gzoek-box">'+
        '<div class="gzoek-top">'+
          '<span class="gzoek-ic">🔍</span>'+
          '<input type="text" id="gzoekInput" class="gzoek-input" placeholder="Zoek in alles: contacten, voorraad, bestellingen, checklists, logboek, projecten, manuals…" autocomplete="off">'+
          '<button class="gzoek-sluit" id="gzoekSluit" title="Sluiten">✕</button>'+
        '</div>'+
        '<div class="gzoek-results" id="gzoekResults"></div>'+
      '</div>';
    document.body.appendChild(ov);
    const inp=ov.querySelector('#gzoekInput');
    const res=ov.querySelector('#gzoekResults');
    const teken=()=>{
      const q=inp.value.trim();
      if(!q){ res.innerHTML='<div class="gzoek-leeg">Typ om te zoeken in alle categorieën.</div>'; return; }
      const groepen=zoekAlles(q);
      const totaal=groepen.reduce((n,g)=>n+g.rijen.length,0);
      if(!totaal){ res.innerHTML='<div class="gzoek-leeg">Niets gevonden voor “'+esc(q)+'”.</div>'; return; }
      res.innerHTML=groepen.map(g=>
        '<div class="gzoek-groep"><div class="gzoek-groeptitel">'+esc(g.titel)+'</div>'+
        g.rijen.map(r=>'<a class="gzoek-item" href="'+g.page+'?zoek='+encodeURIComponent(q)+'">'+
          '<span class="gzoek-lbl">'+esc(r.label)+'</span>'+
          (r.sub?'<span class="gzoek-sub">'+esc(r.sub)+'</span>':'')+'</a>').join('')+
        (g.meer?'<a class="gzoek-meer" href="'+g.page+'?zoek='+encodeURIComponent(q)+'">+ '+g.meer+' meer in '+esc(g.titel)+'</a>':'')+
        '</div>').join('');
    };
    inp.addEventListener('input',teken);
    ov.querySelector('#gzoekSluit').onclick=sluitZoek;
    ov.addEventListener('click',e=>{ if(e.target===ov) sluitZoek(); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&ov.classList.contains('open')) sluitZoek(); });
    zoekEl=ov; return ov;
  }
  function openZoek(){
    const ov=bouwZoek(); ov.classList.add('open');
    const inp=ov.querySelector('#gzoekInput'); inp.value=''; ov.querySelector('#gzoekResults').innerHTML='<div class="gzoek-leeg">Typ om te zoeken in alle categorieën.</div>';
    setTimeout(()=>inp.focus(),30);
  }
  function sluitZoek(){ if(zoekEl) zoekEl.classList.remove('open'); }

  // Zet het vergrootglas in de balk (op elke pagina).
  function zetZoekKnop(){
    const bar=document.querySelector('.topbar'); if(!bar||document.getElementById('gzoekBtn')) return;
    const btn=document.createElement('button');
    btn.id='gzoekBtn'; btn.className='navbtn gzoek-btn'; btn.title='Zoeken in alles'; btn.setAttribute('aria-label','Zoeken');
    btn.textContent='🔍';
    btn.onclick=openZoek;
    const thema=document.getElementById('themeBtn');
    if(thema) bar.insertBefore(btn,thema); else bar.appendChild(btn);
  }

  // Vult op de doelpagina meteen het eigen zoekveld in als er ?zoek= in de link staat.
  function zoekPrefill(){
    let q=''; try{ q=new URLSearchParams(location.search).get('zoek')||''; }catch(e){}
    if(!q) return;
    const pagina=(location.pathname.split('/').pop()||'').toLowerCase();
    const id=ZOEK_PREFILL[pagina]; if(!id) return;
    const probeer=(n)=>{
      const el=document.getElementById(id);
      if(el){ el.value=q; el.dispatchEvent(new Event('input',{bubbles:true})); el.scrollIntoView({block:'center'}); }
      else if(n<20) setTimeout(()=>probeer(n+1),150); // wachten tot de pagina + gedeelde data klaar is
    };
    probeer(0);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    // BBInv veilig opstarten (no-op als de pagina of kern dat al deed).
    try{ if(window.BBInv && typeof BBInv.init==='function') BBInv.init(); }catch(e){}
    zetZoekKnop();
    zoekPrefill();
  });
})();

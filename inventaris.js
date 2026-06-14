// Gedeelde inventaris-motor voor Bazar Bizarre.
// home.html (Inventaris-beheer) en index.html (het formulier) draaien op hetzelfde
// domein en delen daardoor dezelfde opslag (localStorage). Zo schrijft het formulier
// in het spel rechtstreeks door naar de inventaris — volledig insourced, zonder server.
(function(){
  const K_PR='bb_inv_prijzen';    // [{id,cat:'klein'|'groot',naam,stock}]
  const K_BK='bb_inv_boekjes';    // {stock}
  const K_FORM='bb_formulieren';  // [{id,ts,namen,kleine:[{id,naam,n}],groot:[...],boekjes:{...},finale,opmerking}]
  const K_LEV='bb_leveringen';    // [{id,ts,datum,boekjes,prijsId,prijsNaam,prijsAantal,tekst}]

  function uid(){return 'i'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
  function load(k,def){try{const r=localStorage.getItem(k);return r==null?def:JSON.parse(r);}catch(e){return def;}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

  function seedIfEmpty(){
    if(localStorage.getItem(K_PR)===null && window.INVENTARIS_DEFAULT){
      const d=window.INVENTARIS_DEFAULT, prijzen=[];
      (d.klein||[]).forEach(x=>prijzen.push({id:uid(),cat:'klein',naam:x.naam,stock:x.stock||0}));
      (d.groot||[]).forEach(x=>prijzen.push({id:uid(),cat:'groot',naam:x.naam,stock:x.stock||0}));
      save(K_PR,prijzen);
    }
    if(localStorage.getItem(K_BK)===null){
      const bk=(window.INVENTARIS_DEFAULT&&window.INVENTARIS_DEFAULT.boekjesStock)||0;
      save(K_BK,{stock:bk});
    }
  }

  const getPrijzen=()=>load(K_PR,[]);
  const setPrijzen=a=>save(K_PR,a);
  const getBoekjes=()=>load(K_BK,{stock:0});
  const setBoekjes=o=>save(K_BK,o);
  const getFormulieren=()=>load(K_FORM,[]);
  const setFormulieren=a=>save(K_FORM,a);
  const getLeveringen=()=>load(K_LEV,[]);
  const setLeveringen=a=>save(K_LEV,a);

  // Formulier doorsturen: boekt prijzen + boekjes af van de stock en bewaart de inzending.
  // f = {namen, kleine:[{id,n}], groot:[{id,n}], boekjes:{gereserveerd,extra,gratis}, finale, opmerking}
  function submitFormulier(f){
    const prijzen=getPrijzen(), byId={};
    prijzen.forEach(p=>byId[p.id]=p);
    const expand=arr=>(arr||[]).map(it=>{
      const p=byId[it.id]; const n=Math.max(1,+it.n||1);
      if(p) p.stock=(p.stock||0)-n;
      return {id:it.id, naam:p?p.naam:'(verwijderd)', n};
    });
    const kleine=expand(f.kleine), groot=expand(f.groot);
    setPrijzen(prijzen);
    const b=f.boekjes||{};
    const used=(+b.gereserveerd||0)+(+b.extra||0)+(+b.gratis||0);
    const bk=getBoekjes(); bk.stock=(bk.stock||0)-used; setBoekjes(bk);
    const rec={id:uid(), ts:Date.now(), namen:f.namen||'', kleine, groot,
      boekjes:{gereserveerd:+b.gereserveerd||0,extra:+b.extra||0,gratis:+b.gratis||0},
      finale:f.finale||'', opmerking:f.opmerking||''};
    const forms=getFormulieren(); forms.push(rec); setFormulieren(forms);
    return rec;
  }

  // Levering registreren: stock omhoog. lev={datum, boekjes, prijsId, prijsAantal, tekst}
  function addLevering(lev){
    if(lev.boekjes){const bk=getBoekjes();bk.stock=(bk.stock||0)+(+lev.boekjes||0);setBoekjes(bk);}
    let prijsNaam='';
    if(lev.prijsId&&lev.prijsAantal){const pr=getPrijzen();const p=pr.find(x=>x.id===lev.prijsId);
      if(p){p.stock=(p.stock||0)+(+lev.prijsAantal||0);prijsNaam=p.naam;setPrijzen(pr);}}
    const rec={id:uid(),ts:Date.now(),datum:lev.datum||'',boekjes:+lev.boekjes||0,
      prijsId:lev.prijsId||'',prijsNaam,prijsAantal:+lev.prijsAantal||0,tekst:lev.tekst||''};
    const levs=getLeveringen();levs.push(rec);setLeveringen(levs);
    return rec;
  }

  function addPrijs(cat,naam,stock,foto){
    const pr=getPrijzen();const rec={id:uid(),cat:cat==='groot'?'groot':'klein',naam:naam||'',stock:+stock||0,foto:foto||''};
    pr.push(rec);
    try{localStorage.setItem(K_PR,JSON.stringify(pr));}catch(e){return null;} // null = opslag vol
    return rec;
  }
  function removePrijs(id){setPrijzen(getPrijzen().filter(p=>p.id!==id));}
  // Markeer of een prijs effectief gebruikt wordt. Enkel "in gebruik"-prijzen
  // tellen mee voor de lage-voorraad melding en de bestellijst.
  function setGebruik(id,val){
    const pr=getPrijzen();const p=pr.find(x=>x.id===id);if(!p)return;
    p.inGebruik=!!val;setPrijzen(pr);
  }

  // Laatste doorgestuurde formulier ongedaan maken: zet de afgeboekte stock
  // (prijzen + boekjes) terug en verwijder de inzending. Geeft de inzending terug,
  // of null als er geen formulier is. (Het spel-archief wordt apart hersteld in index.html.)
  function undoLastFormulier(){
    const forms=getFormulieren();
    if(!forms.length) return null;
    const rec=forms.pop();
    const prijzen=getPrijzen(), byId={};
    prijzen.forEach(p=>byId[p.id]=p);
    const credit=arr=>(arr||[]).forEach(it=>{const p=byId[it.id]; if(p) p.stock=(p.stock||0)+(+it.n||0);});
    credit(rec.kleine); credit(rec.groot);
    setPrijzen(prijzen);
    const b=rec.boekjes||{};
    const used=(+b.gereserveerd||0)+(+b.extra||0)+(+b.gratis||0);
    const bk=getBoekjes(); bk.stock=(bk.stock||0)+used; setBoekjes(bk);
    setFormulieren(forms);
    return rec;
  }
  // Foto (data-URL) bij een prijs zetten of wissen. Geeft false terug als de opslag vol zit.
  function setFoto(id,dataUrl){
    const pr=getPrijzen();const p=pr.find(x=>x.id===id);if(!p)return false;
    p.foto=dataUrl||'';
    try{localStorage.setItem(K_PR,JSON.stringify(pr));return true;}catch(e){return false;}
  }

  window.BBInv={seedIfEmpty,getPrijzen,setPrijzen,getBoekjes,setBoekjes,
    getFormulieren,setFormulieren,getLeveringen,setLeveringen,
    submitFormulier,addLevering,addPrijs,removePrijs,setFoto,setGebruik,undoLastFormulier,uid};
  seedIfEmpty();
})();

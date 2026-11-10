// =====================================================================
//  TECHNIEK — de pagina (paginas/techniek.html)
//
//  Licht en geluid: het materiaal (telbaar of los), wat kapot of in herstel is, het logboek
//  en de bestellingen. De gegevens en alle regels staan in js/inventaris.js (BBInv, het blok
//  TECHNIEK); hier staat enkel wat je ziet en aanklikt. Kapot melden is een apart venster
//  (js/techniek-melden.js), omdat ook de startpagina het opent.
// =====================================================================
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ICOON={Geluid:'🎤',Licht:'💡',Kabels:'🔌',Video:'📽️',Overig:'🧰'};
const ACTIE={toegevoegd:'Toegevoegd',melding:'Kapot gemeld',herstel:'Naar herstel',terug:'Terug uit herstel',
  hersteld:'Hersteld',afgeschreven:'Afgeschreven',besteld:'Besteld',geleverd:'Geleverd',aangepast:'Aangepast',
  verwijderd:'Verwijderd',opmerking:'Opmerking'};
const AFGEHANDELD={herstel:'naar herstel',opgelost:'opgelost',geen:'geen probleem',afgeschreven:'afgeschreven'};
const fmtDag=iso=>{ const p=String(iso||'').split('-'); return p.length>2?(+p[2]+'/'+(+p[1])+'/'+p[0]):''; };
const kortDag=iso=>{ const p=String(iso||'').split('-'); return p.length>2?(+p[2]+'/'+(+p[1])):''; };
function dagenSinds(iso){
  const p=String(iso||'').split('-'); if(p.length<3) return null;
  const d=new Date(+p[0],+p[1]-1,+p[2]), n=new Date(); n.setHours(0,0,0,0);
  return Math.round((n-d)/86400000);
}

let tab='materiaal', fGroep='', fStatus='', fLocatie='', huidigItem=null, nieuwType='aantal';

// ---------------------------------------------------------------- hulpjes
// De toestand van een item, in woorden en als kleur (zelfde kleuren als de voorraad).
function staat(it){
  if(it.type==='los'){
    if(it.status==='kapot') return {cls:'st-rood',tekst:'⚠ Kapot',sleutel:'kapot'};
    if(it.status==='herstel') return {cls:'st-oranje',tekst:'🔧 In herstel'+(it.herstelBij?(' bij '+it.herstelBij):'')+(it.herstelSinds?(' sinds '+kortDag(it.herstelSinds)):''),sleutel:'herstel'};
    if(it.status==='weg') return {cls:'st-uitlopend',tekst:'🗑 Weg (afgeschreven)',sleutel:'weg'};
    return {cls:'st-groen',tekst:'✅ In orde',sleutel:'ok'};
  }
  const d=[];
  if(it.kapot) d.push('⚠ '+it.kapot+' kapot');
  if(it.herstel) d.push('🔧 '+it.herstel+' in herstel'+(it.herstelBij?(' bij '+it.herstelBij):''));
  const sleutel=it.kapot?'kapot':(it.herstel?'herstel':'ok');
  return {cls:it.kapot?'st-rood':(it.herstel?'st-oranje':'st-groen'),tekst:d.length?d.join(' · '):'✅ In orde',sleutel:sleutel};
}
// Past dit item bij een status-filter? (telbaar materiaal kan tegelijk kapot én in herstel zijn)
function pastStatus(it,f){
  if(!f) return true;
  if(it.type==='los') return it.status===f;
  if(f==='kapot') return it.kapot>0;
  if(f==='herstel') return it.herstel>0;
  if(f==='ok') return it.aantal-it.kapot-it.herstel>0;
  return false;
}
function naamMetNummer(it){ return it.naam+(it.nummer?(' ('+it.nummer+')'):''); }
const sorteer=(a,b)=>String(a.naam).localeCompare(String(b.naam),'nl',{numeric:true});
function locaties(){ return Array.from(new Set(BBInv.getTechniek().map(it=>it.locatie).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'nl')); }
async function mag(niveau,wat){ return await eisToegang('techniek',niveau,wat); }

// ---------------------------------------------------------------- tabbladen
document.querySelectorAll('.invtab').forEach(b=>b.onclick=async()=>{
  const t=b.dataset.tab;
  if(t==='beheer' && !await mag('beheren','het materiaal te beheren')) return;
  tab=t;
  document.querySelectorAll('.invtab').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.invpane').forEach(p=>p.classList.toggle('active',p.id==='tpane-'+t));
  render();
});
function render(){
  const tel=BBInv.techniekTelling();
  $('tkTelMeld').textContent=tel.open?String(tel.open):'';
  // Bestaat de gedeelde tabel nog niet, dan blijft alles op dit toestel. Zeg dat.
  const g=$('tkGedeeld');
  if(BBInv.isReady&&BBInv.isReady()&&!BBInv.isTechniekGedeeld()){
    g.hidden=false; g.innerHTML='<b>Let op:</b> de gedeelde tabel <code>techniek</code> bestaat nog niet in de database. Wat je hier invult, staat voorlopig enkel op dit toestel en gaat vanzelf mee zodra de tabel er is (zie <code>docs/techniek-supabase.sql</code>).';
  } else g.hidden=true;
  $('tkLocaties').innerHTML=locaties().map(l=>'<option value="'+esc(l)+'">').join('');
  if(tab==='materiaal') renderMateriaal();
  else if(tab==='meldingen') renderMeldingen();
  else if(tab==='herstel') renderHerstel();
  else if(tab==='beheer') renderBeheer();
  if(huidigItem && $('tkDetail').classList.contains('open')) renderDetail();
}

// ---------------------------------------------------------------- MATERIAAL
function renderMateriaal(){
  const tel=BBInv.techniekTelling(), alle=BBInv.getTechniek();
  const pill=(cls,l,v)=>'<span class="pill '+cls+'">'+l+': <b>'+v+'</b></span>';
  $('tkSum').innerHTML=alle.length?(pill('','🧰 Items',tel.items)+pill('rood','⚠ Kapot',tel.kapot)+pill('oranje','🔧 In herstel',tel.herstel)+
    (tel.open?pill('rood','📣 Open meldingen',tel.open):'')):'';
  // filters
  $('tkGroepen').innerHTML=['',...BBInv.TK_GROEPEN].map(g=>'<button type="button" class="chip'+(fGroep===g?' active':'')+'" data-g="'+esc(g)+'">'+(g?(ICOON[g]+' '+g):'Alle soorten')+'</button>').join('');
  $('tkGroepen').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ fGroep=c.dataset.g; renderMateriaal(); });
  $('tkStatussen').innerHTML=[['','Alles'],['ok','✅ In orde'],['kapot','⚠ Kapot'],['herstel','🔧 In herstel'],['weg','🗑 Weg']]
    .map(s=>'<button type="button" class="chip'+(fStatus===s[0]?' active':'')+'" data-s="'+s[0]+'">'+s[1]+'</button>').join('');
  $('tkStatussen').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ fStatus=c.dataset.s; renderMateriaal(); });
  const loc=locaties(); if(fLocatie && loc.indexOf(fLocatie)<0) fLocatie='';
  $('tkLocatie').innerHTML='<option value="">📍 Alle plaatsen</option>'+loc.map(l=>'<option'+(l===fLocatie?' selected':'')+'>'+esc(l)+'</option>').join('');
  $('tkLocatie').onchange=()=>{ fLocatie=$('tkLocatie').value; renderMateriaal(); };
  const q=($('tkZoek').value||'').toLowerCase().trim();
  let items=alle.filter(it=>(!fGroep||it.groep===fGroep)&&(!fLocatie||it.locatie===fLocatie)&&pastStatus(it,fStatus));
  if(!fStatus) items=items.filter(it=>!(it.type==='los'&&it.status==='weg'));   // weg enkel via de filter
  if(q) items=items.filter(it=>(naamMetNummer(it)+' '+(it.locatie||'')+' '+(it.groep||'')+' '+(it.notitie||'')).toLowerCase().indexOf(q)>=0);
  // wat aandacht vraagt eerst, dan op naam
  const rang=it=>{ const k=staat(it).sleutel; return k==='kapot'?0:(k==='herstel'?1:(k==='weg'?3:2)); };
  items.sort((a,b)=>rang(a)-rang(b)||sorteer(a,b));
  const lijst=$('tkLijst'); lijst.innerHTML='';
  if(!items.length){
    lijst.innerHTML='<div class="empty-note">'+(alle.length?'Niets gevonden met deze filters.':'Nog geen materiaal. Voeg het toe onder <b>Beheer</b>.')+'</div>';
    return;
  }
  items.forEach(it=>lijst.appendChild(itemRij(it)));
}
function itemRij(it){
  const st=staat(it);
  const r=document.createElement('div'); r.className='invrow tk-rij '+st.cls;
  r.innerHTML='<div class="thumb ph ro">'+(ICOON[it.groep]||'🧰')+'</div>'+
    '<div class="nm"><div class="t">'+esc(naamMetNummer(it))+'</div>'+
      '<div class="st">'+esc([it.groep,it.locatie?('📍 '+it.locatie):''].filter(Boolean).join(' · '))+'</div>'+
      '<div class="st tk-staat">'+esc(st.tekst)+'</div></div>'+
    (it.type==='aantal'?('<div class="stocknum">'+it.aantal+'</div>'):'');
  r.onclick=()=>openDetail(it.id);
  return r;
}
$('tkZoek').oninput=renderMateriaal;
$('tkMeldBtn').onclick=()=>techniekMelden('',render);

// ---------------------------------------------------------------- DETAIL VAN EEN ITEM
function openDetail(id){ huidigItem=id; renderDetail(); $('tkDetail').classList.add('open'); }
function sluitDetail(){ $('tkDetail').classList.remove('open'); huidigItem=null; }
$('tkdSluit').onclick=sluitDetail;
$('tkDetail').addEventListener('click',e=>{ if(e.target.id==='tkDetail') sluitDetail(); });
function renderDetail(){
  const it=BBInv.getTechniekItem(huidigItem);
  if(!it){ sluitDetail(); return; }
  const st=staat(it);
  $('tkdTitel').textContent=(ICOON[it.groep]||'🧰')+' '+naamMetNummer(it);
  const regels=[];
  regels.push('<div><span>Soort</span><b>'+esc(it.groep)+'</b></div>');
  regels.push('<div><span>Waar</span><b>'+esc(it.locatie||'—')+'</b></div>');
  if(it.type==='aantal'){
    regels.push('<div><span>Totaal</span><b>'+it.aantal+'</b></div>');
    regels.push('<div><span>Bruikbaar</span><b>'+Math.max(0,it.aantal-it.kapot-it.herstel)+'</b></div>');
    if(it.kapot) regels.push('<div><span>Kapot</span><b class="rood">'+it.kapot+'</b></div>');
    if(it.herstel) regels.push('<div><span>In herstel</span><b>'+it.herstel+(it.herstelBij?(' bij '+esc(it.herstelBij)):'')+(it.herstelSinds?(' sinds '+kortDag(it.herstelSinds)):'')+'</b></div>');
  } else {
    regels.push('<div><span>Status</span><b class="'+(st.sleutel==='kapot'?'rood':'')+'">'+esc(st.tekst)+'</b></div>');
  }
  if(it.notitie) regels.push('<div><span>Notitie</span><b>'+esc(it.notitie)+'</b></div>');
  $('tkdInfo').innerHTML=regels.join('');
  // Wat kan er nu?
  const knoppen=[];
  const los=it.type==='los';
  if(!(los&&it.status==='weg')) knoppen.push(['⚠ Kapot melden','meld']);
  if(los ? (it.status==='ok'||it.status==='kapot') : (it.aantal-it.herstel>0)) knoppen.push(['🔧 Naar herstel','herstel']);
  if(los ? it.status==='herstel' : it.herstel>0) knoppen.push(['↩️ Terug uit herstel','terug']);
  if(los ? it.status==='kapot' : it.kapot>0) knoppen.push(['✅ Hersteld','hersteld']);
  if(los ? it.status!=='weg' : it.aantal>0) knoppen.push(['🗑 Afschrijven','afschrijven']);
  knoppen.push(['🛒 Bestellen','bestel']);
  knoppen.push(['✏️ Bewerken','bewerk']);
  knoppen.push(['✕ Verwijderen','weg']);
  $('tkdActies').innerHTML=knoppen.map(k=>'<button type="button" class="btn'+(k[1]==='weg'?' gevaar':'')+'" data-a="'+k[1]+'">'+k[0]+'</button>').join('');
  $('tkdActies').querySelectorAll('button').forEach(b=>b.onclick=()=>actie(it.id,b.dataset.a));
  $('tkdLog').innerHTML=logLijst(BBInv.getTechniekLog(it.id),false);
  koppelFotos($('tkdLog'));
}
// Een lijst logregels. metItem = de naam van het item erbij (in het algemene logboek).
function logLijst(regels,metItem){
  if(!regels.length) return '<p class="muted" style="margin:6px 2px;">Nog niets.</p>';
  return regels.map(l=>{
    const extra=[];
    if(l.aantal>1) extra.push(l.aantal+' stuks');
    if(l.bij) extra.push('bij '+l.bij);
    if(l.actie==='melding') extra.push(l.open?'<span class="tk-open">open</span>':('afgehandeld: '+esc(AFGEHANDELD[(l.afgehandeld||{}).hoe]||'')+((l.afgehandeld||{}).door?(' door '+esc(l.afgehandeld.door)):'')));
    return '<div class="tk-log tk-'+esc(l.actie)+'">'+
      '<div class="tk-log-top"><b>'+esc(ACTIE[l.actie]||l.actie)+'</b>'+(metItem?(' · '+esc(l.item_naam||'—')):'')+
        '<span class="muted"> · '+esc(fmtDag(l.datum))+(l.door?(' · '+esc(l.door)):'')+'</span></div>'+
      (l.tekst?('<div class="tk-log-tekst">'+esc(l.tekst)+'</div>'):'')+
      (extra.length?('<div class="tk-log-extra">'+extra.join(' · ')+'</div>'):'')+
      (l.foto?('<img class="thumb tk-foto" src="'+l.foto+'" alt="foto">'):'')+
    '</div>';
  }).join('');
}
function koppelFotos(el){ el.querySelectorAll('.tk-foto').forEach(img=>{ img.onclick=()=>{ if(typeof viewFoto==='function') viewFoto(img.src); }; }); }

// ---------------------------------------------------------------- het formuliervenster
// velden: [{key, label, type:'tekst'|'getal'|'tekstvak'|'keuze', waarde, opties:[[waarde,label]], lijst}]
let formKlaar=null;
function formVenster(o){
  return new Promise(klaar=>{
    formKlaar=klaar;
    $('tkfTitel').textContent=o.titel||'';
    $('tkfUitleg').textContent=o.uitleg||''; $('tkfUitleg').hidden=!o.uitleg;
    $('tkfOk').textContent=o.okTekst||'OK';
    $('tkfVelden').innerHTML=(o.velden||[]).map(v=>{
      const id='tkf_'+v.key;
      let veld;
      if(v.type==='tekstvak') veld='<textarea id="'+id+'" class="finp" rows="3">'+esc(v.waarde||'')+'</textarea>';
      else if(v.type==='keuze') veld='<select id="'+id+'" class="finp">'+(v.opties||[]).map(op=>'<option value="'+esc(op[0])+'"'+(String(op[0])===String(v.waarde)?' selected':'')+'>'+esc(op[1])+'</option>').join('')+'</select>';
      else veld='<input id="'+id+'" class="finp" '+(v.type==='getal'?'type="tel" inputmode="numeric" ':'type="text" ')+(v.lijst?('list="'+v.lijst+'" '):'')+'value="'+esc(v.waarde==null?'':v.waarde)+'">';
      return '<label class="mlbl" for="'+id+'">'+esc(v.label)+'</label>'+veld;
    }).join('');
    $('tkForm').classList.add('open');
    const eerste=$('tkfVelden').querySelector('input,textarea,select'); if(eerste) setTimeout(()=>{ try{ eerste.focus(); }catch(e){} },60);
    $('tkfOk').onclick=()=>{
      const uit={};
      (o.velden||[]).forEach(v=>{ const el=$('tkf_'+v.key); uit[v.key]=v.type==='getal'?(parseInt(el.value,10)||0):String(el.value||'').trim(); });
      if(o.controle){ const fout=o.controle(uit); if(fout){ bbToon(fout); return; } }
      sluitForm(uit);
    };
  });
}
function sluitForm(w){ $('tkForm').classList.remove('open'); const k=formKlaar; formKlaar=null; if(k) k(w==null?null:w); }
$('tkfAnnuleer').onclick=()=>sluitForm(null);
$('tkForm').addEventListener('click',e=>{ if(e.target.id==='tkForm') sluitForm(null); });
// Terug (of een ander dat het venster sluit) = annuleren.
window.bbVensterSluiters=Object.assign(window.bbVensterSluiters||{},{tkForm:()=>sluitForm(null)});

// ---------------------------------------------------------------- de acties
let laatsteHersteller='';
async function actie(id,a){
  const it=BBInv.getTechniekItem(id); if(!it) return;
  const los=it.type==='los';
  if(a==='meld'){ techniekMelden(id,render); return; }
  if(a==='bewerk'||a==='weg'){ if(!await mag('beheren','het materiaal te '+(a==='weg'?'verwijderen':'bewerken'))) return; }
  else if(!await mag('gebruiken','dit te doen')) return;
  const aantalVeld=(label,max)=>los?[]:[{key:'aantal',label:label+' (max. '+max+')',type:'getal',waarde:Math.min(1,max)||1}];
  if(a==='herstel'){
    const max=los?1:it.aantal-it.herstel;
    const w=await formVenster({titel:'🔧 '+it.naam+' naar herstel',okTekst:'Naar herstel',
      velden:[{key:'bij',label:'Bij wie? (bv. AMPS)',type:'tekst',waarde:laatsteHersteller||it.herstelBij||''}]
        .concat(aantalVeld('Hoeveel',max),[{key:'tekst',label:'Opmerking (optioneel)',type:'tekstvak'}])});
    if(!w) return;
    laatsteHersteller=w.bij;
    BBInv.naarHerstel(id,{bij:w.bij,aantal:w.aantal,tekst:w.tekst});
    bbToon(it.naam+' staat in herstel'+(w.bij?(' bij '+w.bij):'')+'.');
  }
  else if(a==='terug'){
    const w=await formVenster({titel:'↩️ '+it.naam+' terug uit herstel',okTekst:'Terug',
      velden:aantalVeld('Hoeveel kwamen er terug',it.herstel).concat([{key:'tekst',label:'Opmerking (optioneel)',type:'tekstvak'}])});
    if(!w) return;
    BBInv.terugUitHerstel(id,{aantal:w.aantal,tekst:w.tekst});
  }
  else if(a==='hersteld'){
    const w=await formVenster({titel:'✅ '+it.naam+' hersteld',okTekst:'Hersteld',uitleg:'Ter plaatse gemaakt, zonder het weg te sturen.',
      velden:aantalVeld('Hoeveel',it.kapot).concat([{key:'tekst',label:'Wat werd er gedaan? (optioneel)',type:'tekstvak'}])});
    if(!w) return;
    BBInv.markeerHersteld(id,{aantal:w.aantal,tekst:w.tekst});
  }
  else if(a==='afschrijven'){
    const w=await formVenster({titel:'🗑 '+it.naam+' afschrijven',okTekst:'Afschrijven',
      uitleg:los?'Het item blijft in de lijst staan als "weg", met zijn geschiedenis.':'Het totaal gaat omlaag; eerst van wat kapot is.',
      velden:aantalVeld('Hoeveel',it.aantal).concat([{key:'tekst',label:'Waarom? (optioneel)',type:'tekstvak'}])});
    if(!w) return;
    BBInv.afschrijven(id,{aantal:w.aantal,tekst:w.tekst});
  }
  else if(a==='bestel'){ await nieuweBestelling(id); return; }
  else if(a==='bewerk'){
    const w=await formVenster({titel:'✏️ '+it.naam+' bewerken',okTekst:'Bewaren',
      velden:[{key:'naam',label:'Naam',type:'tekst',waarde:it.naam},
        {key:'groep',label:'Soort',type:'keuze',waarde:it.groep,opties:BBInv.TK_GROEPEN.map(g=>[g,(ICOON[g]||'')+' '+g])},
        {key:'locatie',label:'Waar staat het?',type:'tekst',waarde:it.locatie,lijst:'tkLocaties'}]
        .concat(los?[{key:'nummer',label:'Nummer of serienummer',type:'tekst',waarde:it.nummer}]:[{key:'aantal',label:'Totaal aantal',type:'getal',waarde:it.aantal}])
        .concat([{key:'notitie',label:'Notitie',type:'tekst',waarde:it.notitie}]),
      controle:w=>w.naam?'':'Vul een naam in.'});
    if(!w) return;
    const wat=[];
    if(w.naam!==it.naam) wat.push('naam');
    if(w.locatie!==it.locatie) wat.push('verplaatst naar '+(w.locatie||'—'));
    if(!los && w.aantal!==it.aantal) wat.push('aantal '+it.aantal+' → '+w.aantal);
    BBInv.updateTechniekItem(id,w,wat.join(', ')||'gegevens aangepast');
  }
  else if(a==='weg'){
    if(!await bbBevestig({titel:it.naam+' verwijderen?',okTekst:'Ja, verwijderen',gevaar:true,
      tekst:'Het item verdwijnt uit de lijst. De geschiedenis blijft in het logboek staan.\n\nIs het kapot of kwijt? Dan is "Afschrijven" meestal beter.'})) return;
    BBInv.removeTechniekItem(id);
    sluitDetail();
  }
  render();
}

// ---------------------------------------------------------------- MELDINGEN & LOGBOEK
function renderMeldingen(){
  const open=BBInv.techniekOpenMeldingen();
  const box=$('tkOpen');
  if(!open.length) box.innerHTML='<p class="muted" style="margin:4px 2px 0;">Geen open meldingen. 👍</p>';
  else {
    box.innerHTML=open.map(m=>{
      const it=m.item_id?BBInv.getTechniekItem(m.item_id):null;
      return '<div class="tk-melding" data-id="'+m.id+'">'+
        '<div class="tk-log-top"><b>'+esc(m.item_naam||'—')+'</b>'+(it&&it.locatie?(' · 📍 '+esc(it.locatie)):'')+(m.aantal>1?(' · '+m.aantal+' stuks'):'')+
          '<span class="muted"> · '+esc(fmtDag(m.datum))+(m.door?(' · gemeld door '+esc(m.door)):'')+'</span></div>'+
        (m.tekst?('<div class="tk-log-tekst">'+esc(m.tekst)+'</div>'):'')+
        (m.foto?('<img class="thumb tk-foto" src="'+m.foto+'" alt="foto">'):'')+
        '<div class="tkd-acties">'+
          (it?'<button type="button" class="btn" data-a="herstel">🔧 Naar herstel</button>':'')+
          '<button type="button" class="btn" data-a="opgelost">✅ Opgelost</button>'+
          '<button type="button" class="btn" data-a="geen">✕ Geen probleem</button>'+
          (it?'<button type="button" class="btn" data-a="open">Details</button>':'')+
        '</div></div>';
    }).join('');
    box.querySelectorAll('.tk-melding').forEach(el=>{
      const m=open.find(x=>x.id===el.dataset.id);
      el.querySelectorAll('button').forEach(b=>b.onclick=async()=>{
        const a=b.dataset.a;
        if(a==='open'){ openDetail(m.item_id); return; }
        if(a==='herstel'){ await actie(m.item_id,'herstel'); return; }
        if(!await mag('gebruiken','de melding af te handelen')) return;
        const it=m.item_id?BBInv.getTechniekItem(m.item_id):null;
        // Opgelost: was het item kapot gezet, dan staat het terug in orde (los) of minder kapot (telbaar).
        if(a==='opgelost' && it && (it.type==='los'?it.status==='kapot':it.kapot>0)) BBInv.markeerHersteld(it.id,{aantal:m.aantal,tekst:'melding opgelost'});
        BBInv.meldingAfhandelen(m.id,a);
        render();
      });
    });
    koppelFotos(box);
  }
  const q=($('tkLogZoek').value||'').toLowerCase().trim();
  let regels=BBInv.getTechniekLog();
  if(q) regels=regels.filter(l=>((l.item_naam||'')+' '+(l.tekst||'')+' '+(l.door||'')+' '+(ACTIE[l.actie]||'')+' '+(l.bij||'')).toLowerCase().indexOf(q)>=0);
  const meer=regels.length>150;
  $('tkLog').innerHTML=logLijst(regels.slice(0,150),true)+(meer?'<p class="muted">… en nog '+(regels.length-150)+' oudere. Zoek om ze te vinden.</p>':'');
  koppelFotos($('tkLog'));
}
$('tkLogZoek').oninput=renderMeldingen;

// ---------------------------------------------------------------- HERSTEL & BESTELLINGEN
function renderHerstel(){
  const weg=BBInv.getTechniek().filter(it=>it.type==='los'?it.status==='herstel':it.herstel>0)
    .sort((a,b)=>String(a.herstelSinds||'').localeCompare(String(b.herstelSinds||''))||sorteer(a,b));
  $('tkHerstel').innerHTML=weg.length?weg.map(it=>{
    const d=dagenSinds(it.herstelSinds);
    return '<div class="tk-melding" data-id="'+it.id+'"><div class="tk-log-top"><b>'+esc(naamMetNummer(it))+'</b>'+(it.type==='aantal'?(' · '+it.herstel+' stuks'):'')+
      '<span class="muted"> · '+(it.herstelBij?('bij '+esc(it.herstelBij)):'')+(it.herstelSinds?(' sinds '+esc(fmtDag(it.herstelSinds))+(d!=null?(' ('+d+(d===1?' dag':' dagen')+')'):'')):'')+'</span></div>'+
      '<div class="tkd-acties"><button type="button" class="btn" data-a="terug">↩️ Terug uit herstel</button><button type="button" class="btn" data-a="open">Details</button></div></div>';
  }).join(''):'<p class="muted" style="margin:4px 2px 0;">Er is niets in herstel.</p>';
  $('tkHerstel').querySelectorAll('.tk-melding').forEach(el=>el.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    if(b.dataset.a==='open') openDetail(el.dataset.id); else actie(el.dataset.id,'terug');
  }));
  const best=BBInv.techniekBestellingen();
  $('tkBest').innerHTML=best.length?best.map(x=>{
    const b=x.bestelling;
    return '<div class="tk-melding" data-id="'+b.id+'"><div class="tk-log-top">'+
        '<span class="stbadge sm '+stKlas(b.status)+'">'+esc(b.status)+'</span> <b>'+esc(b.info||'—')+'</b>'+(b.aantal?(' · ×'+esc(b.aantal)):'')+
        '<span class="muted"> · '+esc(fmtDag(b.datum))+(b.leverancier?(' · '+esc(b.leverancier)):'')+(b.door?(' · '+esc(b.door)):'')+'</span></div>'+
      '<div class="tk-log-extra">'+(x.item?('Voor: <b>'+esc(naamMetNummer(x.item))+'</b>'+(x.geleverd?' · ✓ verwerkt bij Techniek':'')):
        (x.link?'Gekoppeld item bestaat niet meer':'Nog niet aan materiaal gekoppeld — wordt niets vanzelf bijgeteld'))+'</div>'+
      (!x.link?'<div class="tkd-acties"><button type="button" class="btn" data-a="koppel">🔗 Koppel aan materiaal</button></div>':'')+
    '</div>';
  }).join(''):'<p class="muted" style="margin:4px 2px 0;">Nog geen bestellingen met categorie Techniek.</p>';
  $('tkBest').querySelectorAll('[data-a="koppel"]').forEach(b=>b.onclick=()=>koppel(b.closest('.tk-melding').dataset.id));
}
function stKlas(s){ return 's-'+String(s||'').toLowerCase().replace(/[^a-z]+/g,'-'); }
function itemOpties(){ return BBInv.getTechniek().slice().sort(sorteer).map(it=>[it.id,naamMetNummer(it)+(it.locatie?(' · '+it.locatie):'')]); }
async function nieuweBestelling(itemId){
  if(!await mag('gebruiken','een bestelling te plaatsen')) return;
  const it=itemId?BBInv.getTechniekItem(itemId):null;
  const w=await formVenster({titel:'🛒 Bestellen'+(it?(' — '+it.naam):''),okTekst:'Bestellen',
    uitleg:'Komt in het Besteloverzicht onder categorie Techniek. Staat het daar op In loods of Uitgepakt, dan wordt het hier vanzelf bijgeteld.',
    velden:(it?[]:[{key:'itemId',label:'Voor welk materiaal? (optioneel)',type:'keuze',waarde:'',opties:[['','— niet gekoppeld —']].concat(itemOpties())}])
      .concat([{key:'info',label:'Wat bestel je?',type:'tekst',waarde:it?it.naam:''},
        {key:'aantal',label:'Hoeveel?',type:'getal',waarde:1},
        {key:'leverancier',label:'Leverancier (optioneel)',type:'tekst',waarde:''}]),
    controle:w=>w.info?'':'Zeg wat je bestelt.'});
  if(!w) return;
  BBInv.techniekBestellen({itemId:it?it.id:w.itemId,info:w.info,aantal:w.aantal,leverancier:w.leverancier,door:currentUserName()});
  bbToon('Besteld: '+w.info+(w.aantal>1?(' ×'+w.aantal):'')+'. Staat ook in het Besteloverzicht.');
  render();
}
$('tkBestelNieuw').onclick=()=>nieuweBestelling('');
async function koppel(bestelId){
  if(!await mag('gebruiken','de bestelling te koppelen')) return;
  const b=BBInv.getBestellingen().find(x=>x.id===bestelId); if(!b) return;
  const w=await formVenster({titel:'🔗 '+(b.info||'Bestelling')+' koppelen',okTekst:'Koppelen',
    uitleg:'Bij levering (In loods / Uitgepakt) komt het aantal bij dit materiaal, of staat een los item terug in orde.',
    velden:[{key:'itemId',label:'Aan welk materiaal?',type:'keuze',waarde:'',opties:itemOpties()},
      {key:'aantal',label:'Hoeveel?',type:'getal',waarde:parseInt(b.aantal,10)||1}],
    controle:w=>w.itemId?'':'Kies het materiaal.'});
  if(!w) return;
  BBInv.koppelBestelling(bestelId,w.itemId,w.aantal);
  render();
}

// ---------------------------------------------------------------- BEHEER
function renderBeheer(){
  const g=$('tkNGroep'); if(!g.options.length) g.innerHTML=BBInv.TK_GROEPEN.map(x=>'<option value="'+x+'">'+ICOON[x]+' '+x+'</option>').join('');
  $('tkNType').querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.type===nieuwType));
  const los=nieuwType==='los';
  $('tkNTypeUitleg').textContent=los
    ?'Elk stuk apart, met een eigen status (bv. Headset 1 … 6). Zet je hieronder 6, dan maak je in één keer "Headset 1" tot "Headset 6".'
    :'Eén regel met een aantal, voor kabels, adapters en ander klein spul (bv. 24 XLR-kabels, waarvan 2 kapot).';
  $('tkNAantalLbl').textContent=los?'Hoeveel stuks?':'Aantal';
  $('tkNNummerVak').hidden=!los||(parseInt($('tkNAantal').value,10)||1)>1;
  const q=($('tkBZoek').value||'').toLowerCase().trim();
  let items=BBInv.getTechniek().slice().sort(sorteer);
  if(q) items=items.filter(it=>(naamMetNummer(it)+' '+(it.locatie||'')+' '+(it.groep||'')).toLowerCase().indexOf(q)>=0);
  const lijst=$('tkBLijst'); lijst.innerHTML='';
  if(!items.length){ lijst.innerHTML='<div class="empty-note">'+(q?'Niets gevonden.':'Nog geen materiaal.')+'</div>'; return; }
  items.forEach(it=>lijst.appendChild(itemRij(it)));
}
$('tkNType').querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ nieuwType=c.dataset.type; renderBeheer(); });
$('tkNAantal').oninput=()=>{ $('tkNNummerVak').hidden=nieuwType!=='los'||(parseInt($('tkNAantal').value,10)||1)>1; };
$('tkBZoek').oninput=renderBeheer;
$('tkNVoeg').onclick=async()=>{
  if(!await mag('beheren','materiaal toe te voegen')) return;
  const naam=$('tkNNaam').value.trim();
  if(!naam){ bbToon('Vul een naam in.'); $('tkNNaam').focus(); return; }
  const n=Math.max(1,parseInt($('tkNAantal').value,10)||1);
  const basis={naam:naam,groep:$('tkNGroep').value,locatie:$('tkNLocatie').value.trim(),notitie:$('tkNNotitie').value.trim()};
  // Bestaat er al iets met die naam? Even vragen (bv. 'Headset 1' twee keer).
  const namen=nieuwType==='los'&&n>1?Array.from({length:n},(_,i)=>naam+' '+(i+1)):[naam];
  const dubbel=BBInv.getTechniek().filter(it=>namen.some(x=>x.toLowerCase()===String(it.naam).toLowerCase()));
  if(dubbel.length && !await bbBevestig({titel:'Bestaat al',okTekst:'Toch toevoegen',
    tekst:dubbel.slice(0,4).map(it=>it.naam).join(', ')+(dubbel.length>4?', …':'')+' staat al in de lijst.'})) return;
  let uit;
  if(nieuwType==='los') uit=BBInv.addTechniekReeks(Object.assign(basis,{nummer:n===1?$('tkNNummer').value.trim():''}),n);
  else uit=[BBInv.addTechniekItem(Object.assign(basis,{type:'aantal',aantal:n}))];
  bbToon(uit.length>1?(uit.length+' items toegevoegd: '+uit[0].naam+' … '+uit[uit.length-1].naam+'.'):(naam+' toegevoegd.'));
  $('tkNNaam').value=''; $('tkNAantal').value='1'; $('tkNNummer').value=''; $('tkNNotitie').value='';
  render();
};

// ---------------------------------------------------------------- opstarten
// Via een QR-code of een link rechtstreeks naar één item: techniek.html#item=<id>
function openVanuitAdres(){
  const m=/item=([^&]+)/.exec(location.hash||''); if(!m) return;
  const id=decodeURIComponent(m[1]);
  if(BBInv.getTechniekItem(id)) openDetail(id);
}
window.bbStart=()=>{ render(); openVanuitAdres(); };
window.bbOnChange=()=>{
  // Niet hertekenen terwijl je in het formulier typt: enkel wat ernaast staat.
  if($('tkForm').classList.contains('open')) return;
  render();
};
})();

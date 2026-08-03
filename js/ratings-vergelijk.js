/* Ratings vergelijken — twee zelfgekozen periodes (maanden/jaren) naast elkaar.
   Gebruikt de gedeelde helpers uit js/ratings.js (window.Ratings). */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const R=window.Ratings||{};
let _rev=[];

function initThema(){
  const b=$('themeBtn'); if(!b) return;
  const toe=t=>{ document.documentElement.setAttribute('data-theme',t); try{localStorage.setItem('bb_home_theme',t);}catch(e){} b.textContent=t==='dark'?'☀️':'🌙'; };
  let t='light'; try{ t=localStorage.getItem('bb_home_theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'); }catch(e){}
  toe(t); b.onclick=()=>toe(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
}

function maanden(){ return Array.from(new Set(_rev.map(r=>R.maandKey(r.datum)).filter(Boolean))).sort(); }
function inPeriode(r,van,tot){ const k=R.maandKey(r.datum); if(!k) return false; if(van&&k<van) return false; if(tot&&k>tot) return false; return true; }
function periodeLabel(van,tot){
  const L=k=>k?R.maandLabel(k):'';
  if(van&&tot) return van===tot?L(van):(L(van)+' – '+L(tot));
  if(van) return 'vanaf '+L(van); if(tot) return 't/m '+L(tot); return 'alle maanden';
}
function stats(rev){
  return { n:rev.length, gem:R.avg(rev.map(r=>r.score)),
    act:R.groepeer(rev,r=>R.canonAct(r.activiteit)),
    taal:R.groepeer(rev,r=>R.taalVan(r)) };
}
function donut(v){
  const c=R.kl(v), col=c==='goed'?'var(--goed)':(c==='let'?'var(--let)':'var(--slecht)');
  const pct=Math.max(0,Math.min(100,(v/5)*100));
  return '<span class="donut" style="background:conic-gradient('+col+' '+pct+'%,var(--ring) 0)"><span class="donut-in">'+R.fmtScore(v)+'</span></span>';
}
function deltaHtml(a,b){
  if(a==null||b==null||isNaN(a)||isNaN(b)) return '<span class="delta neutraal">—</span>';
  const d=a-b, s=(d>0?'+':'')+R.fmtScore(d);
  const cls=Math.abs(d)<0.005?'neutraal':(d>0?'op':'neer');
  const pijl=Math.abs(d)<0.005?'●':(d>0?'▲':'▼');
  return '<span class="delta '+cls+'">'+pijl+' '+s+'</span>';
}

function cmpTabel(id,titel,arrA,arrB){
  const mapA={}, mapB={}; arrA.forEach(x=>mapA[x.key]=x); arrB.forEach(x=>mapB[x.key]=x);
  const keys=Array.from(new Set(arrA.map(x=>x.key).concat(arrB.map(x=>x.key)))).filter(Boolean).sort();
  let rows='';
  keys.forEach(k=>{
    const a=mapA[k], b=mapB[k];
    rows+='<tr><td>'+R.esc(k)+'</td>'+
      '<td class="n">'+(a?R.fmtScore(a.gem)+' <span class="mut">('+a.n+')</span>':'—')+'</td>'+
      '<td class="n">'+(b?R.fmtScore(b.gem)+' <span class="mut">('+b.n+')</span>':'—')+'</td>'+
      '<td class="n">'+((a&&b)?deltaHtml(a.gem,b.gem):'<span class="delta neutraal">—</span>')+'</td></tr>';
  });
  $(id).innerHTML='<h2>'+titel+'</h2>'+(keys.length?('<div class="tblwrap"><table><tr><th>Naam</th><th class="n">A</th><th class="n">B</th><th class="n">Δ (A−B)</th></tr>'+rows+'</table></div>'):'<p class="mut">Geen gegevens in deze periodes.</p>');
}

function vergelijk(){
  const aVan=$('aVan').value, aTot=$('aTot').value, bVan=$('bVan').value, bTot=$('bTot').value;
  const revA=_rev.filter(r=>inPeriode(r,aVan,aTot));
  const revB=_rev.filter(r=>inPeriode(r,bVan,bTot));
  const A=stats(revA), B=stats(revB);
  $('resultaat').style.display='block';
  $('kopA').innerHTML='<div class="perhead">Periode A · '+R.esc(periodeLabel(aVan,aTot))+'</div>'+donut(A.gem)+'<div class="l">'+A.n+' reacties</div>';
  $('kopB').innerHTML='<div class="perhead">Periode B · '+R.esc(periodeLabel(bVan,bTot))+'</div>'+donut(B.gem)+'<div class="l">'+B.n+' reacties</div>';
  $('kopD').innerHTML='<div class="perhead">Verschil A − B</div><div class="bigdelta">'+deltaHtml(A.gem,B.gem)+'</div><div class="l">gemiddelde</div>';
  cmpTabel('cmpAct','Per activiteit', A.act, B.act);
  cmpTabel('cmpTaal','Per taal', A.taal, B.taal);
}

function init(){
  initThema();
  _rev=(R&&R.laadReviews?R.laadReviews():[])||[];
  if(!_rev.length){ $('geenData').style.display='block'; return; }
  const mnd=maanden();
  const laatste=mnd.length?mnd[mnd.length-1]:'';
  let vorigJaar='';
  if(laatste){ const p=laatste.split('-'); vorigJaar=(+p[0]-1)+'-'+p[1]; if(mnd.indexOf(vorigJaar)<0) vorigJaar=mnd.length?mnd[0]:laatste; }
  $('aVan').value=laatste; $('aTot').value=laatste;
  $('bVan').value=vorigJaar; $('bTot').value=vorigJaar;
  $('vglBtn').onclick=vergelijk;
  vergelijk();
}
document.addEventListener('DOMContentLoaded',init);
})();

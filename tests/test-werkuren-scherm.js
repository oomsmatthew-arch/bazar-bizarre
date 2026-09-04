// Het SCHERM van Mijn werkuren: de kalender, de lijst en het invulvenster.
//
// tests/test-werkuren.js controleert de rekenregels en de opslag. Deze test kijkt naar
// wat je uiteindelijk ziet — want daar zit sinds de kalender ook echt rekenwerk in:
// waar een maand begint en eindigt, welke dagen van de buurmaand meekomen, en dat een
// weektotaal over de maandgrens heen blijft kloppen.
//
// Hoe: we knippen het paginascript uit paginas/werkuren.html en draaien het tegen een
// piepkleine nep-DOM. Die doet niets meer dan onthouden wat de pagina in elk vakje
// schrijft; we lezen die innerHTML daarna gewoon na. Geen browser nodig.
var store={};
globalThis.localStorage={getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
globalThis.console={log:function(){},warn:function(){},error:function(){}};
globalThis.window=globalThis; globalThis.addEventListener=function(){};
globalThis.setTimeout=function(fn){return 0;}; globalThis.clearTimeout=function(){};
globalThis.setInterval=function(){return 0;}; globalThis.clearInterval=function(){};
globalThis.navigator={onLine:true};

var elementen={};
function nepEl(id){
  return {id:id,style:{},value:'',checked:false,textContent:'',innerHTML:'',className:'',onclick:null,
    classList:{add:function(){},remove:function(){},toggle:function(){}},
    addEventListener:function(){}, querySelectorAll:function(){return [];},
    getAttribute:function(){return null;},setAttribute:function(){},focus:function(){}};
}
function el(id){ return elementen[id]||(elementen[id]=nepEl(id)); }
globalThis.document={getElementById:el,querySelectorAll:function(){return [];},querySelector:function(){return null;},
  addEventListener:function(){},body:{getAttribute:function(){return null;},insertAdjacentHTML:function(){}}};
globalThis.esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
globalThis.currentUser=function(){ return {id:'u1',naam:'Matthew'}; };
globalThis.eisToegang=function(){ return Promise.resolve(true); };
globalThis.bbToon=function(){}; globalThis.bbBevestig=function(){return Promise.resolve(true);};
globalThis.bbVraagTekst=function(){return Promise.resolve(null);};
globalThis.copyText=function(){}; globalThis.dl=function(){};
globalThis.rowsToTSV=function(r){return r.map(function(x){return x.join('\t');}).join('\n');};
globalThis.rowsToCSV=globalThis.rowsToTSV;

load('./js/inventaris.js');
BBInv.init();

var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

var html=readFile('./paginas/werkuren.html');
var script=html.slice(html.indexOf('// ---------------- MIJN WERKUREN ----------------'), html.lastIndexOf('</script>'));
eval(script+'\n'+
 'globalThis.renderAlles=renderAlles;globalThis.maandRijen=maandRijen;globalThis.openForm=openForm;'+
 'globalThis.zetSoort=zetSoort;globalThis.werkResultaatBij=werkResultaatBij;'+
 'globalThis.zetMaand=function(j,m){toonMaand=new Date(j,m,1);};'+
 'globalThis.zetWeergave=function(w){weergave=w;};');

print('— Een lege maand —');
zetMaand(2026,8); zetWeergave('lijst'); renderAlles();
ok(el('wuLijst').innerHTML.indexOf('Nog niets ingevuld')>=0,'de lijst nodigt uit om te beginnen');
ok(el('wuStats').innerHTML.indexOf('0u00')>=0,'de tegels staan op nul');
zetWeergave('kalender'); renderAlles();
ok(el('wuKalender').innerHTML.indexOf('kalgrid')>=0,'de kalender staat er ook als er niets ingevuld is');

print('\n— Vier dagen invullen —');
BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-01',soort:'gewerkt',start:'09:00',einde:'17:30',pauze:true,minuten:480});
BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-02',soort:'gewerkt',start:'17:00',einde:'01:00',pauze:true,minuten:450});
BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-08',soort:'jv',minuten:480});
BBInv.addWerkuur({gebruiker:'u1',naam:'Matthew',datum:'2026-09-09',soort:'overuren',minuten:90,opmerking:'opbouw'});
BBInv.addWerkuur({gebruiker:'u2',naam:'Laura',datum:'2026-09-01',soort:'gewerkt',start:'10:00',einde:'18:00',pauze:true,minuten:450});
renderAlles();
var kal=el('wuKalender').innerHTML;
function tel(re){ return (kal.match(re)||[]).length; }
ok(tel(/class="kal-dag/g)===35,'vijf weken van zeven dagen: '+tel(/class="kal-dag/g)+' vakjes');
ok(tel(/class="kal-kop"/g)===8,'zeven dagkoppen plus de weekkolom');
ok(tel(/kal-dag buiten/g)===5,'35 vakjes − 30 septemberdagen = 5 gedimde dagen (31 aug + 1-4 okt)');
ok(kal.indexOf('data-nieuw="2026-09-15"')>=0,'elk vakje kan een nieuwe dag beginnen');
ok(tel(/class="kal-item/g)===4,'vier balkjes — die van Laura staat er niet bij');
ok(kal.indexOf('>JV 8u<')>=0,'een JV toont "JV 8u"');
ok(kal.indexOf('>+1u30<')>=0,'overuren tonen "+1u30"');
ok(kal.indexOf('>7u30<')>=0,'de avondshift (17:00-01:00) toont 7u30');
ok(tel(/class="kal-wk"/g)===5,'vijf weektotalen');
ok(kal.indexOf('<b>15u30</b>')>=0,'week 36 telt 8u00 + 7u30 = 15u30');
ok(kal.indexOf('<b>—</b>')>=0,'een lege week toont een streepje i.p.v. 0u00');
ok(el('wuLijst').style.display==='none','de lijst staat verborgen zolang de kalender aan is');
ok(el('wuStats').innerHTML.indexOf('25u00')>=0,'maandtotaal 25u00');

print('\n— Terug naar de lijst —');
zetWeergave('lijst'); renderAlles();
ok(el('wuKalender').style.display==='none','de kalender verdwijnt');
ok(el('wuLijst').innerHTML.indexOf('Week 36')>=0 && el('wuLijst').innerHTML.indexOf('Week 37')>=0,'twee weekblokken');
ok((el('wuLijst').innerHTML.match(/class="wurij"/g)||[]).length===4,'vier dagen in de lijst');
ok(el('wuLijst').innerHTML.indexOf('opbouw')>=0,'de opmerking komt in beeld');

print('\n— Uitvoer voor je loonfiche —');
var rijen=maandRijen();
ok(rijen[0][7]==='Uren (decimaal)','er is een kolom in honderdsten');
ok(rijen[rijen.length-1][7]==='25,00','het maandtotaal is 25,00');

print('\n— Het formulier —');
openForm(null);
ok(el('wuDatum').value==='2026-09-04','een nieuwe dag begint vandaag: '+el('wuDatum').value);
openForm(null,'2026-09-15');
ok(el('wuDatum').value==='2026-09-15','tik je in de kalender op 15 sep, dan staat die datum er meteen');
el('wuStart').value='09:00'; el('wuEinde').value='16:00'; el('wuGeenPauze').checked=false; werkResultaatBij();
ok(el('wuResultaat').innerHTML.indexOf('6u30')>=0,'7u aanwezig → de pauze gaat eraf, 6u30');
el('wuGeenPauze').checked=true; werkResultaatBij();
ok(el('wuResultaat').innerHTML.indexOf('7u00')>=0,'geen pauze genomen → 7u00');
var eersteId=(kal.match(/data-id="([^"]+)"/)||[])[1];
openForm(eersteId);
ok(el('wuVerwijder').style.display==='','de verwijderknop verschijnt bij het aanpassen');

print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));

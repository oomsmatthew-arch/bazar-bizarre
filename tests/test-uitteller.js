// De uitteller van het finalespel: twee gegokte antwoorden en het juiste getal, en wie er
// het dichtst bij zit. Twee dingen kunnen hier stilletjes misgaan, en allebei zie je het
// pas als er een zaal naar kijkt:
//
//  1. HET LEZEN VAN DE GETALLEN. Bij ons is een punt een duizendtal en een komma een
//     decimaal: "25.000" is vijfentwintigduizend. JavaScript leest dat net andersom en
//     maakt er 25 van. Eén verkeerd gelezen getal en de verkeerde ploeg wint.
//  2. HET VERGELIJKEN ZELF, met gelijkspel en een voltreffer als randgevallen.
//
// We knippen de functies uit bazar-bizarre-spel.html en draaien ze hier echt.
var fouten=0;
function ok(v,wat){ if(!v){ fouten++; print('  ✗ '+wat); } else print('  ✓ '+wat); }

// Eén functie uit de pagina knippen: vanaf 'function naam(' tot de accolade die hem sluit.
function knip(src,naam){
  var i=src.indexOf('function '+naam+'(');
  if(i<0){ print('KON FUNCTIE NIET VINDEN: '+naam); return ''; }
  var diep=0, j=src.indexOf('{',i);
  for(var k=j;k<src.length;k++){
    if(src[k]==='{') diep++;
    else if(src[k]==='}'){ diep--; if(!diep) return src.slice(i,k+1); }
  }
  return '';
}

var src=readFile('./bazar-bizarre-spel.html');
globalThis.state={uitteller:{a:'',b:'',uit:''}};
eval(knip(src,'leesGetal')+'\n'+knip(src,'toonGetal')+'\n'+
     knip(src,'utLees')+'\n'+knip(src,'utBereken')+'\n'+
     'globalThis.leesGetal=leesGetal; globalThis.toonGetal=toonGetal; globalThis.utBereken=utBereken;');

print('— Getallen lezen zoals wij ze typen —');
function leest(tekst,verwacht){
  var uit=leesGetal(tekst);
  var gelijk=(uit===verwacht)||(uit!==null&&verwacht!==null&&Math.abs(uit-verwacht)<1e-9);
  ok(gelijk,'"'+tekst+'" → '+uit+(gelijk?'':'  (verwacht '+verwacht+')'));
}
leest('50',50);
leest('25.000',25000);            // punt = duizendtal, niet 25
leest('1.234.567',1234567);
leest('12,5',12.5);               // komma = decimaal
leest('1.234,56',1234.56);
leest('12.5',12.5);               // één punt met twee cijfers erachter: toch een decimaal
leest('41 minuten',41);           // tekst eromheen mag
leest('± 150 gram',150);
leest('-10',-10);
leest('0',0);
leest('',null);
leest('geen getal',null);

print('\n— Wie zit het dichtst bij? —');
function uitslag(a,b,uit){
  state.uitteller={a:a,b:b,uit:uit};
  var r=utBereken();
  return r?r.wint:'onvolledig';
}
ok(uitslag('50','101','78')==='b','A=50, B=101, uitkomst 78 → B (23 naast, tegen 28)');
ok(uitslag('50','101','70')==='a','A=50, B=101, uitkomst 70 → A (20 naast, tegen 31)');
ok(uitslag('50','100','75')==='gelijk','allebei 25 naast → gelijkspel');
ok(uitslag('78','101','78')==='a','precies juist wint');
ok(uitslag('200','101','78')==='b','allebei te hoog: de minst hoge wint');
ok(uitslag('-10','5','0')==='b','ook met een negatief getal');
ok(uitslag('25.000','30.000','26.500')==='a','duizendtallen: 1.500 naast wint van 3.500 naast');
ok(uitslag('12,5','14','13')==='a','decimalen: 0,5 naast wint van 1 naast');

print('\n— Onvolledig ingevuld levert geen uitslag —');
ok(uitslag('50','','78')==='onvolledig','zonder antwoord B geen uitslag');
ok(uitslag('','101','78')==='onvolledig','zonder antwoord A geen uitslag');
ok(uitslag('50','101','')==='onvolledig','zonder uitkomst geen uitslag');
ok(uitslag('50','honderd','78')==='onvolledig','tekst zonder getal telt niet als antwoord');

print('\n— De verschillen kloppen —');
state.uitteller={a:'50',b:'101',uit:'78'};
var r=utBereken();
ok(r.vA===28 && r.vB===23,'A zit 28 naast, B zit 23 naast');
ok(toonGetal(25000)==='25.000','25000 wordt getoond als 25.000');

print('\nRESULTAAT: '+(fouten?fouten+' fout(en)':'alles in orde'));

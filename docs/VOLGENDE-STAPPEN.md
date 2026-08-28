# Volgende stappen — opschoonwerk aan EntertainmentVM

> Dit bestand is bedoeld om **als opdracht door te geven aan een AI-assistent** in een
> nieuwe sessie. Het staat op zichzelf: je hoeft er geen eerder gesprek bij te hebben.
> Wil je maar één taak laten doen, knip de rest weg — maar laat *Werkafspraken* en
> *Niet doen zonder overleg* altijd staan.
>
> Laatst bijgewerkt bij **v6.4**. Kloppen de getallen hieronder niet meer, meet ze
> dan opnieuw met de commando's die erbij staan.
>
> **Taken 1 tot en met 5 zijn uitgevoerd** (1, 3, 4 en 5 in v6.2; taak 2 afgerond in v6.3 met de spelpagina). Wat er nog ligt staat onderaan,
> onder *Wat er nog open staat*. De uitgevoerde taken blijven hieronder staan met hun
> uitkomst erbij, zodat je ziet wat er veranderd is en waaróm.

---

## Wat dit project is

Een PWA voor het entertainmentteam van een vakantiepark, live op **entertainmentvm.be**
via GitHub Pages. Het team gebruikt hem op tablets en telefoons ter plaatse, vaak met
matige wifi — offline blijven werken is dus geen extraatje maar de kern.

**Vanilla JavaScript, geen build-stap.** Wat in de map staat is exact wat de browser
draait. Geen npm, geen bundler, geen framework.

De codebase is volledig **Nederlandstalig**: bestandsnamen, functienamen, variabelen en
commentaar. Het commentaar legt consequent uit *waarom* iets zo gedaan is, niet wat de
regel doet. Houd die stijl aan — het is geschreven zodat de eigenaar (geen professionele
ontwikkelaar) het over een half jaar nog begrijpt.

## Structuur

| Pad | Wat |
|---|---|
| `entertainment.html` | Startpagina met het kaartenmenu |
| `index.html` | Stuurt alleen door naar `entertainment.html` |
| `bazar-bizarre-spel.html` | De spelleiderstool — één groot bestand met een eigen donker thema |
| `paginas/*.html` | Twaalf losse pagina's: inventaris, bestellingen, projecten, ratings, ratings-vergelijk, checklists, contacten, logboek, manuals, instellingen, activiteit, systeem |
| `js/kern.js` | Gedeeld op de pagina's die hem laden: inloggen, pincodes, rollen/toegangen, inlogscherm/profiel/camera, service worker |
| `js/topbar.js` | De balk bovenaan, het thema, en de vier vensters (`bbToon`, `bbBevestig`, `bbVraagTekst`, `bbVraagCode`). Staat los van `kern.js`, zodat óók projecten, ratings en het spel hem kunnen laden. Met `<body data-topbar="geen">` levert hij enkel de vensters — dat doet de spelpagina |
| `js/inventaris.js` | De gegevenslaag `BBInv`: Supabase + offline wachtrij + IndexedDB-momentopname |
| `js/inventaris-data.js` | Standaard startinventaris uit Excel — alleen geladen door de startpagina, de inventarispagina en het spel |
| `js/projecten.js`, `js/ratings.js`, `js/ratings-vergelijk.js` | Pagina-specifiek |
| `js/zoek.js`, `js/terug.js` | Gedeeld en zelfstandig, net als `topbar.js`: de zoekknop in de balk, en de terugknop die open vensters sluit i.p.v. de pagina te verlaten |
| `css/app.css` | Eén stylesheet voor alles behalve het spel |
| `sw.js` | Service worker: pagina's netwerk-eerst met 1,5 s limiet, de rest cache-eerst |
| `tests/` | Twaalf tests op de gegevenslaag, draaien zonder browser |

## Werkafspraken

**Draai de tests vóór én na elke wijziging.** Alle twaalf horen groen te zijn:

```bash
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
for t in tests/test-*.js; do printf "%-34s " "$t"; $JSC "$t" | tail -1; done
```

Elke test eindigt met `RESULTAAT: alles in orde`. Raak je `js/inventaris.js` aan, schrijf
er dan een test bij — daar kost een fout gegevens, en dat merk je pas weken later.
`tests/nep-supabase.js` is een nagemaakte database; kijk in `tests/LEESMIJ.md` en kopieer
de opzet van een bestaande test.

**`git` werkt niet in deze omgeving** — de developer tools ontbreken, elk git-commando
faalt op `xcode-select`. Probeer niet te committen. Noem aan het eind welke bestanden
gewijzigd, toegevoegd of verwijderd zijn; de eigenaar pusht zelf via GitHub Desktop.

**Versienummers.** `APP_VERSION` in `js/kern.js` en `CACHE` in `sw.js` moeten identiek
blijven (nu allebei `v6.4`). Verhoog ze allebei bij een wijziging die de tablets moeten
oppikken — anders blijft een tablet op de oude versie hangen.

**De eigenaar werkt soms tegelijk in dezelfde bestanden.** Lees een bestand opnieuw vlak
voor je het bewerkt, zeker `js/kern.js`.

**Controleer je aannames in de code.** Hieronder staan getallen ("veertien topbars",
"ruim 140 dialogen") met het meetcommando erbij. Draai dat commando eerst — de app is in
ontwikkeling, dus de getallen schuiven. Verwijzingen naar code staan bewust als *zoekterm*
en niet als regelnummer, om dezelfde reden.

---

## Taak 1 — Topbar centraliseren ✅ *gedaan in v6.2*

**Uitkomst.** De balk staat nu één keer in **`js/topbar.js`**. Elke pagina heeft op die
plek nog één regel — `<script src="../js/topbar.js"></script>`, bovenaan in `.wrap` —
en zegt met attributen op `<body>` wat er anders is: `data-titel`, `data-rechts`
(`home` · `instellingen` · `terug`) en `data-extra` voor een extra link. Dertien pagina's
om, alleen `bazar-bizarre-spel.html` houdt zijn eigen balk.

Waarom dat script *binnen* `.wrap` staat en niet onderaan bij de rest: zo schuift de balk
op zijn eigen plek naar binnen nog vóór de browser tekent. Onderaan zou je eerst even een
pagina zonder balk zien.

```bash
grep -l '<div class="topbar">' *.html paginas/*.html | wc -l   # → 1 (enkel het spel)
```

<details><summary>De oorspronkelijke opdracht</summary>

*Grootste onderhoudswinst.*

De balk met logo, titel, synchronisatie-badge, gebruikersknop, themaknop en Home staat
**veertien keer gekopieerd** in de HTML.

Eén tekstwijziging betekent nu veertien bestanden bijwerken, en dat gaat vroeg of laat
mis. `js/kern.js` bouwt de gedeelde vensters (inlogscherm, profiel, camera) al één keer
op met `insertAdjacentHTML` (zoek op `insertAdjacentHTML` bovenaan het bestand) — pas
datzelfde patroon toe op de topbar.

Let op deze verschillen, los ze op met één data-attribuut op `<body>` of een variabele,
niet met veertien uitzonderingen:
- de **titel** verschilt per pagina (`Inventaris`, `Besteloverzicht`, …)
- de **startpagina** heeft rechts een knop *Instellingen*, alle andere pagina's *Home*
- `paginas/projecten.html` heeft `id="homeLogo"` op de afbeelding
- `js/zoek.js` schuift zelf een zoekknop in de balk (`zetZoekKnop`) en verwacht
  `.topbar` en `#themeBtn` — die moeten dus bestaan vóór dat script draait
- `bazar-bizarre-spel.html` heeft een **eigen** topbar met een ander thema; laat die met rust
</details>

## Taak 2 — De native vensters vervangen ✅ *helemaal klaar in v6.3*

**Uitkomst.** Er staan vier vervangers onderaan **`js/topbar.js`** — dus beschikbaar op
élke pagina, ook die zonder `kern.js`:

| Vervanger | In plaats van | Vorm |
|---|---|---|
| `bbToon(tekst[,'fout'])` | `alert()` | melding onderaan, verdwijnt vanzelf, blokkeert niets |
| `await bbBevestig({titel,tekst,okTekst,gevaar})` | `confirm()` | venster met Ja/Annuleren |
| `await bbVraagTekst({titel,waarde,plaatshouder,soort})` | `prompt()` | invoerveld, `null` bij annuleren |
| `await bbVraagCode({titel,uitleg,controle})` | `prompt()` voor wachtwoorden | bolletjes i.p.v. klare tekst; foute code probeer je meteen opnieuw in hetzelfde venster |

Alle wachtwoord- en pincodevensters zijn om: de zes uit de tabel hieronder, plus het
wijzigen van het beheer-wachtwoord in Instellingen en de vier in het spel. **Let op bij verder werk:**
`magBeheren`, `eisBeheer`, `eisToegang` (kern.js), `magBeheren`/`magProjectMaken`
(projecten.js) en `magBewerken` (ratings.js) zijn daardoor **asynchroon** geworden. Elke
aanroep hoort `await` te krijgen — zonder await krijg je een belofte terug, en die is
altijd waar, waardoor de wachtwoordvraag stilzwijgend overgeslagen wordt. Controleer dat zo:

```bash
grep -rn "eisBeheer(\|magBeheren(\|eisToegang(\|magProjectMaken(" *.html paginas/*.html js/*.js \
  | grep -v "await\|async function\|^\S*:[0-9]*: *//"     # → leeg
```

**Ook het spel is nu om (v6.3).** `bazar-bizarre-spel.html` had als laatste nog 23
systeemvensters, waaronder vier die om een pincode of wachtwoord vroegen — op een scherm
waar een zaal naar kijkt. De aanpak:

- `<body data-topbar="geen">` — nieuw in `topbar.js`. Daarmee levert dat bestand **enkel
  de vensters**: geen balk, geen thema. Zonder die uitweg kreeg het spel een groene balk
  bij, werd het thema van de app over het zijne heen gezet, en ontstond er een tweede
  element met `id="title"`.
- De vensters gebruiken `.cammodal*`, `.bev-*`, `.code-*` en `.bbmelding*` uit
  `css/app.css`, en dat bestand laadt het spel niet. Die regels staan daarom **in het
  `<style>`-blok van het spel zelf**, in navy/goud/roze. Pas je de vensters aan, kijk dan
  op beide plekken.

```bash
grep -rn 'alert(\|confirm(\|prompt(' *.html paginas/*.html js/*.js \
  | grep -vE '^\S+:[0-9]+:\s*(//|\*|<!--)'      # → leeg: nergens nog een systeemvenster
```

<details><summary>De oorspronkelijke opdracht</summary>

*Grootste winst in hoe de app aanvoelt.*

In een geïnstalleerde PWA op iOS zien `alert()` en `confirm()` eruit als een systeemfout
— alsof de app crasht — en ze blokkeren alles tot je ze wegklikt.

**Begin bij de wachtwoord-vensters.** `prompt()` toont wat je typt in klare tekst op het
scherm, waar iemand naast je meekijkt. Deze zes zijn de ergste — zoek ze op met:

```bash
grep -n "prompt('Wachtwoord\|prompt('Beheerder\|prompt('Je pincode\|prompt('Nieuwe pincode" js/kern.js js/projecten.js
```

| Zoekterm | Wat het vraagt |
|---|---|
| `prompt('Wachtwoord'` in `kern.js` | beheer-wachtwoord (functie `magBeheren`) |
| `prompt('Wachtwoord beheer'` | beheer-wachtwoord (functie `eisBeheer`) |
| `prompt('Beheerderswachtwoord:'` | toegang tot namen beheren |
| `prompt('Nieuwe pincode voor '` | pincode van een collega resetten |
| `prompt('Je pincode om door te gaan:'` | je eigen pincode ter bevestiging |
| `prompt('Wachtwoord'` in `projecten.js` | eigen kopie van dezelfde functie |

Aanpak: bouw drie vervangers in `js/kern.js` — een toast (in plaats van `alert`), een
bevestigingsvenster (`confirm`) en een invoervenster met `type="password"` (`prompt`).
Hergebruik de bestaande `.cammodal` / `.cammodal-box` stijl uit `css/app.css`, dan sluit
het meteen aan bij de rest. `prompt()` en `confirm()` zijn synchroon en de aanroepende
code verwacht dat ook — je vervangers worden asynchroon, dus de aanroepplekken moeten mee
omgebouwd worden. Doe dat in kleine stappen en draai de tests ertussen.
</details>

## Taak 3 — Thema-code samenvoegen ✅ *gedaan in v6.2*

**Uitkomst.** Nog één implementatie, in `js/topbar.js` (bij de balk waar het maantje in
staat), bereikbaar als `bbThema.zet()` / `bbThema.wissel()` / `bbThema.keuze()`. `kern.js`
verwijst er enkel nog naar; de kopieën in `projecten.js`, `ratings.js` en
`ratings-vergelijk.js` zijn weg. Die pagina's hoefden `kern.js` daarvoor niet te laden —
`topbar.js` staat er los van, net als `zoek.js` en `terug.js`.

Twee echte verschillen zijn daarmee ook opgelost: `projecten.js` volgde de instelling van
het toestel helemaal niet, en de ratings-pagina's bewaarden de stand van het toestel meteen
als "jouw keuze", waardoor ze daarna niet meer meegingen.

```bash
grep -rn "setAttribute('data-theme'" js/*.js   # → alleen js/topbar.js
```

<details><summary>De oorspronkelijke opdracht</summary>

Er zijn **vier** plekken die het thema zetten. Vind ze met
`grep -n "setAttribute('data-theme'" js/*.js`:

| Bestand | Vorm |
|---|---|
| `js/kern.js` | `applyTheme()` — volgt de systeemvoorkeur tot je zelf kiest |
| `js/projecten.js` | eigen kopie van `applyTheme()` |
| `js/ratings.js` | inline, eigen aanpak |
| `js/ratings-vergelijk.js` | inline, eigen aanpak |

Alle vier gebruiken dezelfde opslagsleutel `bb_home_theme`, maar ze gedragen zich niet
identiek — daardoor liep het thema in het verleden uit de pas. Eén implementatie in
`kern.js`, de rest laten verwijzen. Let op: `projecten.html`, `ratings.html` en
`ratings-vergelijk.html` laden `kern.js` op dit moment **niet**. Volgt dus logisch ná
taak 1, of vraagt dat je die pagina's `kern.js` laat laden.
</details>

## Taak 4 — Sync-badge gebeurtenisgestuurd maken ✅ *gedaan in v6.2*

**Uitkomst.** `js/inventaris.js` heeft er `BBInv.setOnWachtrij(fn)` bij: één seintje zodra
het aantal wachtende wijzigingen verandert. Het staat in `saveOutbox()` — het enige punt
waar de wachtrij verandert — en meldt niets als het getal gelijk blijft, dus een mislukte
poging maakt geen ruis. `kern.js` hangt de ⏳-melding daaraan; de `setInterval` van 3
seconden is weg. Er staat nog één terugval-`setInterval` voor het geval een toestel nog
een oude, opgeslagen `inventaris.js` gebruikt die `setOnWachtrij` niet kent.

Bewaakt door **`tests/test-wachtrij.js`**.

## Taak 5 — Kleine restjes ✅ *gedaan in v6.2*

**Zoeken werkt nu overal.** `paginas/checklists.html` kreeg `#chkZoek` en
`paginas/logboek.html` kreeg `#logZoek`; beide staan in `ZOEK_PREFILL` in `js/zoek.js`.
Bij Checklists filtert het zoekveld alleen wát je ziet — de code loopt nog over de hele
lijst, zodat bewerken, verwijderen en de voortgangsbalk blijven kloppen. Slepen is uit
terwijl je zoekt, want je zou tussen verborgen items neerzetten.

**De oude rechten-aanroepen: bewust laten staan.** De twee in `paginas/instellingen.html`
zijn geen restje maar opzet, en er staat nu een commentaar bij zodat ze niet per ongeluk
"opgeruimd" worden:

- Het `magBeheren()` dat de pagina zelf bewaakt: hier stel je de Toegangen *in*. Zou de
  pagina zichzelf via die regels bewaken, dan kun je jezelf buitensluiten zonder weg terug.
  Er ís ook geen categorie `instellingen` in `TOEGANG_CATEGORIEEN` om naar over te stappen.
- Het `magBeheren('om het systeem te bekijken')` bij de 🩺-knop: dat is met opzet een
  noodroute (zie `zetNoodSysteem`), zodat je bij Systeem kunt ook als er nog niemand admin
  is. `systeem` staat standaard op "enkel admin", en die regel kent geen wachtwoord-uitweg
  — omzetten naar `eisToegang` zou die noodroute juist dichtgooien.

De derde treffer, in `paginas/inventaris.html`, was een vermelding in een commentaarregel.

---

## Wat er nog open staat

**Niets groots meer.** Het laatste zware punt — de open database — is op 28 augustus 2026
opgelost; zie *De database staat op slot* hieronder. Wat daarna nog blijft staat daar ook
beschreven: iedereen deelt één toegangscode, en manuals blijven bereikbaar via hun directe
link. Allebei bewuste keuzes, geen losse eindjes.

## Niet doen zonder overleg

Deze drie zijn smaak- en merkbeslissingen van de eigenaar, geen technische verbeteringen.
Signaleer ze gerust, maar voer ze niet uit zonder te vragen:

- **Het lettertype.** De `font-family` bovenaan `css/app.css` (zoek op `Trebuchet`) is
  `"Trebuchet MS","Segoe UI",system-ui,sans-serif`.
  Trebuchet bestaat niet op iOS of Android, dus de tablets vallen altijd terug op
  `system-ui`. De app ziet er op Windows dus anders uit dan op de werkvloer. Consistent
  maken kan, maar wélk lettertype is een merkbeslissing.
- **Het thema van de spelpagina.** `bazar-bizarre-spel.html` is navy/roze/goud terwijl de
  rest bosgroen is. Dat kan een bewuste showkeuze zijn.
- **De startpagina hergroeperen.** Twaalf kaarten met lange beschrijvingen; op een telefoon
  is dat flink scrollen. Groeperen onder de bestaande labels (Beheer / Team / Naslag /
  Handig) zou rust geven, maar verandert wel hoe iedereen de app kent.

## Eerste keer inloggen: zelf een pincode kiezen ✅ *v6.4*

Iedereen krijgt de standaardcode **0000**. Wie daarmee inlogt, moet eerst een eigen code
kiezen voor hij in de app is. Uitgezonderd: **Matthew** en **Laura** (de lijst
`GEEN_CODEVRAAG` bovenaan het pincode-gedeelte van `js/kern.js`) en het gedeelde account
**ENT algemeen**.

**Er is bewust GEEN extra kolom** in de database om bij te houden wie het al gedaan heeft.
"Nog met 0000 binnenkomen" ís de vlag: kies je een eigen code, dan is 0000 niet meer je
code en wordt de vraag nooit meer gesteld. Eén keer dus, vanzelf, en niets kan scheeflopen
tussen toestellen. Reset een admin later iemands code naar 0000, dan krijgt die persoon
vanzelf opnieuw de vraag — precies de bedoeling.

Drie dingen die bij het bouwen fout gingen en waar je bij wijzigingen op moet letten:

- **De naam moet in beeld blijven** tijdens de keuze (`startCodeKeuze`). Op een tablet met
  twaalf tegels naast elkaar tik je zo de verkeerde aan; zonder naam stel je ongemerkt de
  code van een collega in en werk je de rest van je shift onder diens naam.
- **Alleen vragen als de gedeelde lijst écht geladen is** — `moetEigenCodeKiezen` test op
  `BBInv.isReady()` én `BBInv.isGebruikersGedeeld()`. Zonder die test kiest iemand offline
  een code die alleen op dát toestel bestaat, en overschrijft `loadShared` die later met de
  oude 0000. Hij zou "✓ Code bewaard" zien voor een code die morgen niet werkt.
- **Wie ingelogd blijft** ("Onthoud mij op dit toestel") komt nooit langs het inlogscherm.
  Daarom controleert `controleerStandaardcode()` in `refreshAuth()` het ook bij het
  opstarten, en logt die persoon uit zodat hij door dezelfde weg gaat als iedereen.

**Onderliggende zwakte, nog niet opgelost.** `updateGebruiker` in `js/inventaris.js` doet
`if(gebruikersOK) dbUpsert(...) else persistCache()`. Is de tabel deze sessie niet geladen,
dan gaat een wijziging **niet** naar de wachtrij en blijft ze op één toestel staan. Dat gold
al vóór v6.4 — ook voor 'Reset code' en voor het toevoegen van een collega. De codekeuze
omzeilt het nu door in die toestand niets te vragen, maar de zwakte zelf staat er nog.
Wil je ze echt oplossen, dan moet `dbUpsert` onvoorwaardelijk aangeroepen worden en moet
`loadShared` (zoals `reloadTable` al doet) de cache niet overschrijven zolang er nog eigen
wijzigingen in de wachtrij staan.

## De database staat op slot ✅ *gedaan op 28 augustus 2026*

Dit wás het belangrijkste openstaande punt van het project. Het is opgelost in de
Supabase-console, niet in code — volgens `docs/BEVEILIGING.md`.

Wat er nu staat:
- Eén gedeeld account `team@entertainment.app`. De toegangscode typ je één keer per
  toestel; daarna onthoudt de browser de aanmelding.
- Alle 18 tabellen hebben RLS aan met één regel `enkel dit team`, die op de rol
  `authenticated` **én** op het e-mailadres test. De bucket `manuals` idem.
- Zelfregistratie staat uit (`disable_signup: true`), anonieme aanmeldingen ook.

Nagemeten met enkel de `anon`-sleutel uit de broncode, ná het op slot zetten:

```
alle 18 tabellen   0 rijen leesbaar   (vóór: 224 prijzen, 12 gebruikers, 309 activiteit)
toevoegen          42501 new row violates row-level security policy
bucket manuals     lege lijst
```

**Let op bij zelf natesten:** een geblokkeerde tabel geeft **`HTTP 200` met een lege
lijst**, geen foutmelding. Kijk dus naar het aantal rijen, niet naar de statuscode —
anders concludeer je ten onrechte dat alles nog openstaat.

Loopt er iets mis, dan zet `docs/beveiliging-terugdraaien.sql` alles binnen de seconde
terug open. Ziet een pagina plots lege lijsten, kijk dan eerst of het toestel nog
aangemeld is (Systeem-scherm, veld *aangemeld*) — niet of er een fout in de code zit.

Wat er daarna nog blijft, ook mét dat slot: iedereen deelt één code, er is geen verschil
tussen lezen en schrijven, en de pincodes zijn gehasht met SHA-256 zonder salt — over vier
cijfers zijn dat tienduizend mogelijkheden, in een seconde door te rekenen. Behandel ze
als "wie ben ik", niet als geheim.

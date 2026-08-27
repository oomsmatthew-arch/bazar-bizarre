# Volgende stappen — opschoonwerk aan EntertainmentVM

> Dit bestand is bedoeld om **als opdracht door te geven aan een AI-assistent** in een
> nieuwe sessie. Het staat op zichzelf: je hoeft er geen eerder gesprek bij te hebben.
> Wil je maar één taak laten doen, knip de rest weg — maar laat *Werkafspraken* en
> *Niet doen zonder overleg* altijd staan.
>
> Laatst bijgewerkt bij **v6.0**. Kloppen de getallen hieronder niet meer, meet ze
> dan opnieuw met de commando's die erbij staan.

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
| `paginas/*.html` | Twaalf losse pagina's: inventaris, bestellingen, projecten, ratings, checklists, contacten, logboek, manuals, instellingen, activiteit, systeem |
| `js/kern.js` | Gedeeld op elke pagina: inloggen, pincodes, rollen/toegangen, thema, gedeelde vensters, service worker |
| `js/inventaris.js` | De gegevenslaag `BBInv`: Supabase + offline wachtrij + IndexedDB-momentopname |
| `js/inventaris-data.js` | Standaard startinventaris uit Excel — alleen geladen door de startpagina, de inventarispagina en het spel |
| `js/projecten.js`, `js/ratings.js`, `js/ratings-vergelijk.js`, `js/zoek.js`, `js/terug.js` | Pagina-specifiek |
| `css/app.css` | Eén stylesheet voor alles behalve het spel |
| `sw.js` | Service worker: pagina's netwerk-eerst met 1,5 s limiet, de rest cache-eerst |
| `tests/` | Elf tests op de gegevenslaag, draaien zonder browser |

## Werkafspraken

**Draai de tests vóór én na elke wijziging.** Alle elf horen groen te zijn:

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
blijven (nu allebei `v6.0`). Verhoog ze allebei bij een wijziging die de tablets moeten
oppikken — anders blijft een tablet op de oude versie hangen.

**De eigenaar werkt soms tegelijk in dezelfde bestanden.** Lees een bestand opnieuw vlak
voor je het bewerkt, zeker `js/kern.js`.

**Controleer je aannames in de code.** Hieronder staan getallen ("veertien topbars",
"ruim 140 dialogen") met het meetcommando erbij. Draai dat commando eerst — de app is in
ontwikkeling, dus de getallen schuiven. Verwijzingen naar code staan bewust als *zoekterm*
en niet als regelnummer, om dezelfde reden.

---

## Taak 1 — Topbar centraliseren

*Grootste onderhoudswinst.*

De balk met logo, titel, synchronisatie-badge, gebruikersknop, themaknop en Home staat
**veertien keer gekopieerd** in de HTML.

```bash
grep -l '<div class="topbar">' *.html paginas/*.html | wc -l   # → 14
```

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

## Taak 2 — De native vensters vervangen

*Grootste winst in hoe de app aanvoelt.*

```bash
grep -rho 'alert(\|confirm(\|prompt(' *.html paginas/*.html js/*.js | wc -l   # → ruim 140
grep -rho 'prompt(' *.html paginas/*.html js/*.js | wc -l                     # → 28
```

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

## Taak 3 — Thema-code samenvoegen

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

## Taak 4 — Sync-badge gebeurtenisgestuurd maken

`js/kern.js` draait `setInterval(updateSyncBadge,3000)` permanent — onderaan, in de
`DOMContentLoaded`-blok. Op een tablet die de hele dag openstaat kost dat batterij voor
iets dat zelden verandert. Laat de gegevenslaag melden wanneer de wachtrij verandert
(`BBInv` heeft al een `setOnChange`-mechanisme) in plaats van elke drie seconden te kijken.

## Taak 5 — Kleine restjes

**Laatste oude rechten-aanroepen.** De app is grotendeels over op `eisToegang` /
`magToegang` (het Toegangen-systeem in `js/kern.js`), maar twee plekken gebruiken nog de
oude `eisBeheer` / `magBeheren` / `isVasteMdw`:

```bash
grep -c "eisBeheer\|magBeheren\|isVasteMdw" paginas/instellingen.html paginas/inventaris.html
# → 2 en 1
```

**Zoeken werkt half op twee pagina's.** `js/zoek.js` doorzoekt óók Checklists en Logboek,
maar de tabel `ZOEK_PREFILL` bovenaan dat bestand kent die pagina's niet, omdat ze geen
zoekveld hebben. Klik
je zo'n resultaat, dan land je op de pagina zonder je zoekterm — een doodlopend spoor.
Voeg een filterveld toe aan `paginas/checklists.html` en `paginas/logboek.html` en zet ze
in `ZOEK_PREFILL`.

---

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

## Buiten scope: de database staat open

De Supabase-database geeft nog steeds gegevens vrij aan iedereen met de link. Met de
`anon`-sleutel die gewoon in de broncode staat:

```
gebruikers   HTTP 200   ← namen én pincodes
prijzen      HTTP 200
projecten    HTTP 200
```

Dat is het belangrijkste openstaande punt van het hele project, maar het wordt **in de
Supabase-console** opgelost, niet in deze code — zie `docs/STAPPENPLAN.md` fase A en
`docs/BEVEILIGING.md`. De code die om een toegangscode vraagt staat al klaar in
`js/inventaris.js` (zoek op `TEAM_EMAIL`) en werkt in beide toestanden, open én op slot.

Begin hier niet aan in code. Signaleer hooguit dat het nog niet gebeurd is.

Wat er daarna nog blijft, ook mét dat slot: iedereen deelt één code, er is geen verschil
tussen lezen en schrijven, en de pincodes zijn gehasht met SHA-256 zonder salt — over vier
cijfers zijn dat tienduizend mogelijkheden, in een seconde door te rekenen. Behandel ze
als "wie ben ik", niet als geheim.

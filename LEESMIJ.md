# Bazar Bizarre — Spelleider-app

Een tablet-tool voor de entertainer om tijdens het Bazar Bizarre prijzenspel bij te
houden wat al gespeeld/gekozen is. Vier rondes + finale, werkt offline, en is op de
tablet als app op het startscherm te zetten.

## Wat zit erin
- **Ronde 1 – Super Deals** (30 deals aanvinken)
- **Ronde 2 – Trolley Tunes** (40 nummers aanvinken)
- **Ronde 3 – How Much?** (30 gewichten 0,400–1,850 kg, met 1 kg referentiepot)
- **Ronde 4 – Crazy Coins** (24 nummers aanvinken)
- **Finalespel** (vraag & antwoord; antwoord blijft verborgen tot je op Toon klikt)

Aanvinkingen en namen worden **automatisch bewaard** op het toestel (ook na sluiten).

## Spellen archiveren (beheer)

- Onderaan het menu staat **"✓ Spel afsluiten & opslaan in archief"**. Eén druk bewaart
  het volledige spel (datum + tijd, naam/locatie, de 8 prijzen, samenvatting per ronde en
  de finale) in het archief en zet daarna alles schoon voor het volgende spel.
- Rechtsboven staat het **tandwiel ⚙ (beheer)**. Dat opent — na een **pincode** — het
  overzicht van alle opgeslagen spellen.
  - **Pincode: `3920`** (te wijzigen via "Pincode wijzigen" in het beheerscherm).
- In het beheerscherm kan je elk spel bekijken, verwijderen, of exporteren:
  - **📋 Kopieer voor Sheets** — plak rechtstreeks in Google Sheets (Ctrl+V).
  - **⬇ Download CSV** — een bestand met alle spellen, klaar om te importeren.
- Dit vormt de basis voor de latere koppeling met Google Sheets/Forms voor de inventaris.

## Inventaris & formulier (insourced)

De inventaris zit volledig in de app zelf — geen Google of server nodig. `inventaris.html`
(Inventaris) en `bazar-bizarre-spel.html` (het spel) draaien op hetzelfde domein en **delen
daardoor dezelfde opslag** op het toestel.

- **Vragenlijst finalespel** (in Bazar Bizarre → Finalespel): rechts staat de gedeelde lijst
  met alle finalevragen, **bovenaan wat het minst en het langst geleden gespeeld is**. Vraag 1
  en 2 (backup) worden daar automatisch uit gevuld. Tik een andere vraag aan om ze in vak 1 te
  zetten; lang indrukken (of rechtsklikken) zet ze in vak 2. **↻ Opnieuw voorstellen** kiest
  twee verse vragen. Sluit je het spel af, dan worden de gebruikte vragen afgevinkt en zakken
  ze in de lijst — zo krijg je nooit twee keer kort na elkaar dezelfde.
  - **🔒 Vragen beheren** (onderaan de lijst, met het beheer-wachtwoord): vragen toevoegen,
    aanpassen, de teller op nul zetten of verwijderen. Enkel het Nederlands invullen volstaat —
    de app vertaalt zelf naar Engels, Frans en Duits.
  - De lijst is **gedeeld met alle toestellen** en zit in het instellingen-document; er is dus
    géén extra tabel of SQL voor nodig. De startlijst staat in `js/inventaris-data.js`.
- **Formulier** (in Bazar Bizarre): de knop **"Spel afsluiten"** opent een formulier waar
  je de weggegeven kleine/grote prijzen aanklikt (met zoek + aantal), boekjes invult,
  finale en opmerkingen. **Doorsturen** boekt alles af van de voorraad én sluit het spel af.
  - **Finalevraag** — het vak *Finalevraag & antwoord* vult zichzelf met wat je bij het
    **Finalespel** hebt ingetypt (`V1: vraag → antwoord`, één per regel). Je kan het gerust
    aanpassen of aanvullen; met **↻ Opnieuw overnemen uit finale** haal je de vragen weer op
    als je ze pas ná het openen van het formulier hebt ingevuld. Achteraf terug te vinden bij
    **Inventaris → Formulieren** — daar staat de vraag van het **laatst ingezonden formulier**
    ook altijd in een kader rechts — en in de CSV-export.
    <br>Het oude vak *Finalereeks* is uit het formulier gehaald; formulieren van vóór die
    wijziging blijven hun ingevulde reeks gewoon tonen.
    <br>Eenmalig instellen: voer `docs/finalevraag-kolom.sql` uit in Supabase. Doe je dat
    niet, dan werkt alles gewoon, maar komt de vraag achter de finalereeks te staan in
    plaats van in een eigen veld. Het Systeem-scherm zegt of de kolom er al is.
- **Inventaris-beheer** (in home, kaart "Inventaris lijst BB"), met tabbladen:
  - **Stock** — voorraad per prijs en boekjes aanpassen, prijzen toevoegen/verwijderen.
  - **Leveringen** — geleverde boekjes/prijzen registreren → voorraad omhoog.
  - **Formulieren** — alle doorgestuurde inzendingen bekijken.
  - **Import / Export** — CSV exporteren, kopiëren voor Sheets/Excel, of CSV importeren.
- De startlijst komt uit `inventaris-data.js` (gegenereerd uit `_bron/CGT - Inventaris.xlsx`,
  119 kleine + 61 grote prijzen + boekjes). De gedeelde logica staat in `inventaris.js`.
- Let op: de gegevens leven **op dat toestel**. Gebruik Export/Import om te back-uppen of
  over te zetten naar een ander toestel.

## Projecten (borden met taken)

De kaart **Projecten** op de homepagina opent `projecten.html`: een eigen pagina, net zoals
het spel er één heeft, met dezelfde login en dezelfde gedeelde gegevens.

- **Projectenlijst** — een kaart per project met status, voortgangsbalk, deadline en het
  aantal open taken. Filteren op *Lopend · Afgerond · Archief · Alles* en zoeken op naam.
- **Overzicht** — voortgang, deadline, jouw taken, wat er deze week vervalt, de laatste
  berichten en het doel van het project.
- **Bord** — kolommen met kaarten, te verslepen met het handvat ⠿ rechtsboven op een kaart.
  De kolommen vullen de breedte en breken af naar een volgende rij, dus je hoeft nooit
  zijwaarts te scrollen; op gsm staan ze onder elkaar.
  Op de kaart zie je in één oogopslag alles wat eraan hangt: gekleurde **labels** bovenaan,
  en onderaan een rij tekens — 🕐 deadline (kleurt oranje/rood), ≡ er is een omschrijving,
  ☑ subtaken, 📎 bijlagen, 💬 reacties, en de avatars van wie eraan werkt.
  Open je een kaart, dan kan je daar ook **bijlagen** (bestand of link) en **reacties**
  toevoegen. Kolommen maak, hernoem, verschuif of verwijder je via het knopje ⋯ in de kolomkop.
  Sleep je een kaart naar een kolom die "Klaar" heet, dan vinkt ze zichzelf af (en omgekeerd).
- **Agenda** — maandkalender met afspraken, mijlpalen, leveringen, opbouw en afbraak.
  De deadlines van je taken en de start/deadline van het project verschijnen er automatisch bij.
  Tik een dag aan om te zien wat er die dag staat; anders toont de lijst wat er als eerste aankomt.
- **Documenten** — bestanden uploaden (PDF, foto, video…) of een link toevoegen naar Drive of
  Sheets. Elk document krijgt een soort (Offerte, Draaiboek, Plan, Foto, Contract, Overig) die
  je achteraf kan wijzigen door erop te tikken. Uploaden lukt enkel met internet.
- **Verslagen** — verslag van een overleg: datum, aanwezigen, besproken, beslissingen en
  actiepunten. Bij elk actiepunt staat **→ maak taak**: die zet het meteen op het bord, met de
  juiste persoon en deadline. Daarna zie je "✓ staat op het bord" met een knop om de taak te openen.
- **Bespreking** — korte berichten per project; je eigen bericht kan je zelf verwijderen.
- **Ideeën** — losse invallen die nog geen taak zijn. Met **→ maak taak** promoveer je er één
  tot kaart op het bord.
- **Materiaal** — wat je nodig hebt, met aantal en status (*Nodig · Besteld · In huis ·
  Geregeld*). Typ je een naam die in de **inventaris** bestaat, dan koppelt de app die
  automatisch en zie je de actuele voorraad — met een waarschuwing als er te weinig is.
- **Draaiboek** — de planning van de dag zelf, per uur en gegroepeerd per dag, met wie en
  waar. Met **🖨 Afdrukken** krijg je een net overzicht om mee te nemen.
- **Evaluatie** — na afloop: een score en drie vragen (wat liep goed, wat kon beter, wat
  onthouden we). Daar staat ook **📋 Project kopiëren**: dat maakt een schone kopie voor de
  volgende editie — dezelfde kolommen, taken (niet afgevinkt, zonder deadline), materiaallijst
  (terug op "Nodig") en draaiboek (met de uren, zonder datum). Heet je project "Halloween 2026",
  dan stelt de app "Halloween 2027" voor.

Onderaan de pagina staat het versienummer (start op **v1.0**), zodat je op de tablet meteen
ziet of de nieuwste versie geladen is.

**Wie mag wat** (in te stellen via ⚙ Instellingen → *Projecten — wie mag wat?*):
- *Projecten aanmaken/bewerken/verwijderen*: standaard enkel **vaste medewerkers**.
- *In een project werken* (taken maken, verslepen, afvinken, meepraten): standaard **iedereen**.
- Een project verwijderen vraagt altijd het beheer-wachtwoord.

**Eenmalig instellen:** voer `docs/projecten-supabase.sql` één keer uit in Supabase
(SQL Editor → New query → plakken → Run). Doe je dat niet, dan werkt Projecten gewoon, maar
staat alles enkel op dát toestel. Onderaan de pagina zie je welke van de twee het is.

## Rollen: Vaste mdw en Admin

Bij elke naam (⚙ Instellingen → *Namenlijst beheren*) staan twee knopjes. Iemand kan beide
tegelijk hebben, of geen van beide.

- **Vaste mdw** — komt zonder wachtwoord in alle beheerschermen (inventaris, bestellingen,
  het financieel overzicht, projecten aanmaken…).
- **Admin** — ziet op de homepagina de kaarten **Systeem** en **Activiteit**.

## Database (alle foto's op één plek)

Bij **Instellingen** staat een tweede tabblad **🗄️ Database**. Daar zie je alles wat er aan
foto's en bestanden in de gedeelde database zit, met de grootste bovenaan — want foto's zijn
veruit het zwaarste dat de app bewaart. Handig als de opslag vol dreigt te lopen (zie
*Systeem → Opslag op dit toestel*): hier zie je meteen wélke foto de plaats inneemt.

Foto's zitten op vijf plaatsen, en die staan er alle vijf in:

| Waar | Wat |
|---|---|
| 🏷️ Voorraad | de foto bij een prijs |
| 🚚 Leveringen | de foto bij een geregistreerde levering |
| 👤 Profielfoto's | de foto bij een collega in de namenlijst |
| ✅ Checklists | foto's bij een checklist-item |
| 📎 Opslagmap | de losse bestanden (PDF's, video's, projectdocumenten) uit Supabase Storage |

Tik een foto om ze groot te bekijken; met de knopjes filter je per soort en met het zoekveld
zoek je op naam. Video's uit een checklist staan er ook bij, met de melding *enkel op dit
toestel*: die worden om plaatsredenen niet in de database bewaard maar in de ruime opslag
van de browser.

**Downloaden.** Op elke foto staat rechtsboven een **⬇**-knopje dat die ene foto bewaart, met
een herkenbare naam (bv. `Voorraad-Beertje-knuffel.jpg`). Bovenaan staat **⬇ Alles downloaden
(.zip)**: dat maakt één zip-bestand van alles wat op dat moment op het scherm staat — dus
filter of zoek eerst als je maar een deel wil. De zip wordt in de app zelf gemaakt (geen
extra bibliotheek, zie `dbZip` in `paginas/instellingen.html`); de foto's gaan er
ongecomprimeerd in, want JPEG's krimpen toch niet meer.

**Blijft het overzicht actueel?** Ja, zolang je ernaar kijkt. Zet een collega een foto
online, dan verschijnt die vanzelf. Twee soorten komen niet met de gewone live-verbinding
mee — een nieuwe foto bij een prijs, levering of profiel (die kolom is te zwaar om bij elke
voorraadtik mee te sturen) en de opslagmap (die staat los van de tabellen). Die haalt dit
scherm daarom apart op: zodra je het tabblad opent, daarna elke 30 seconden zolang het
openstaat, en met de knop **🔄 Nu bijwerken**. Rechts staat wanneer het laatst gebeurde.
Sluit je het tabblad, dan stopt dat bijwerken weer.

**Verwijderen** kan enkel bij de **📎 Opslagmap** — dat is de enige plek waar je die losse
bestanden anders niet weg krijgt. De app kijkt eerst na of het bestand ergens gebruikt wordt
(Online manuals of een projectdocument) en zegt dat in de vraag. Weg is weg. De andere foto's
verwijder je waar ze horen: bij de prijs, bij de levering, bij de checklist of bij je profiel.

## Systeem (diagnose)

De kaart **Systeem** op de homepagina (zichtbaar voor admins; anders via ⚙ Instellingen →
*Systeem bekijken* met het beheer-wachtwoord) toont in één oogopslag of alles werkt. Dat is
nodig omdat de app bij een storing gewoon blijft draaien — je merkt het anders pas als er
gegevens ontbreken. Je ziet er:

- **Verbinding** — internet, is dit toestel aangemeld bij de database, zijn de gegevens
  opgehaald, luistert het live mee. Met **🔌 Verbinding testen** doe je de proef op de som
  (handig op een wifi die wél verbindt maar geen internet heeft).
- **Synchronisatie** — hoeveel wijzigingen nog op internet wachten, wanneer er voor het
  laatst iets is uitgewisseld, en welke wijziging eventueel vastloopt. **📤 Nu versturen**
  duwt de wachtrij door; blijft er één hangen, dan kan je de wachtrij wissen (met het
  beheer-wachtwoord — die wijzigingen zijn dan definitief weg).
- **Gedeelde gegevens** — per onderdeel of het in de database staat (✓ gedeeld) of enkel op
  dit toestel (✗ enkel hier), met het aantal rijen. Staat er ✗, dan ontbreekt die tabel in
  Supabase: voer `docs/projecten-supabase.sql` (opnieuw) uit.
- **Opslag op dit toestel** — hoeveel plaats de app inneemt, met een lijst van de grootste
  onderdelen. *Offline kopie staat in* hoort **IndexedDB** te zeggen (de ruime opslag);
  *Beschermd tegen opruimen* zegt of de browser de gegevens mag wissen bij plaatsgebrek.
  Staan er nog oude kopieën in de snelle opslag, dan verschijnt hier **🧹 Nu opruimen**.
- **Versie & offline** — welke versie er draait en of de app offline klaarstaat. Met
  **🔄 Vernieuwen forceren** haal je de app opnieuw op (je gegevens blijven staan).

## Hoe de app opslaat (en waarom de opslag vol liep)

Elk toestel houdt een volledige kopie bij, zodat alles offline werkt. Sinds **v3.0** staat
die kopie in **IndexedDB**: de ruime opslag van de browser (op de tablet honderden MB's tot
enkele GB's). Daar geldt de krappe grens van localStorage niet.

Wat waar staat:

| Plek | Grens | Wat er in zit |
|---|---|---|
| **IndexedDB** | quota van het toestel (GB's) | de volledige offline kopie, alle foto's (prijzen, leveringen, profielfoto's) en de checklist-media |
| **localStorage** | ± 5 MB, **niet te verhogen** | alleen nog kleine dingen: de wachtrij (`bb_outbox`), instellingen, thema en vlaggetjes |

Waarom het misliep vóór v3.0:

1. **Alles stond er dubbel in.** Elke tabel werd bewaard als losse sleutel (`bb_projecten`,
   `bb_contacten`, …) én nog eens in de gezamenlijke momentopname.
2. **Foto's zaten in localStorage.** Prijsfoto's stonden al apart, maar de foto's bij
   leveringen en de profielfoto's niet — data-URL's van tientallen kB per stuk.
3. **Mislukt bewaren verdween geruisloos** in een lege `catch`.

De limiet van localStorage is door de browser vastgezet; die kan je niet verhogen. De
oplossing is dus verhuizen, niet vergroten.

**De verhuizing gebeurt vanzelf.** Bij het opstarten leest de app eerst de oude plek uit,
schrijft alles naar IndexedDB, en wist pas daarna de oude kopieën. Zat de opslag al vol,
dan wist ze eerst en schrijft ze daarna opnieuw — anders zou zo'n toestel voorgoed
vastzitten. De app vraagt ook `navigator.storage.persist()` aan, zodat de browser deze
gegevens niet weggooit als het toestel plaats tekortkomt. In het Systeem-scherm zie je bij
*Offline kopie staat in* of de verhuizing gelukt is. `tests/test-opslag.js` bewaakt al deze
gevallen.

De wachtrij blijft bewust in localStorage: die wordt synchroon weggeschreven, zodat een
offline gemaakte wijziging ook overleeft als de tablet meteen daarna dichtgaat.

**Invullen en meteen doorklikken mag.** Elke wijziging wordt onmiddellijk weggeschreven, niet
uitgesteld. Dat is belangrijk omdat voor een tabel die nog niet in de database bestaat deze
kopie de énige is. Alleen het tikken in de voorraadvelden wordt gebundeld (dat vuurt bij elke
toetsaanslag), en die wijzigingen zijn ook via de wachtrij gedekt.

**Wie je bent, weet de app meteen.** Bij het opstarten toont ze eerst de laatst bekende stand
— inclusief de namenlijst met de rollen — en pas daarna de verse gegevens uit de database.
Vroeger was de app de eerste seconden "leeg" en dacht ze dat je geen rechten had. Iemand
uitloggen omdat hij niet in de lijst staat, gebeurt pas nadat de verse lijst binnen is.

## Hoe snel de app opstart

Wat er nu gebeurt:

1. **De namen eerst.** De namenlijst staat apart en piepklein in de snelle opslag en wordt
   synchroon ingelezen, nog vóór de volledige offline kopie uit IndexedDB. Het inlogscherm
   moet dus niet wachten op prijzen, bestellingen, projecten en 500 activiteitsregels.
2. **Meteen tonen wat we al weten.** Daarna komt de rest van de laatst bewaarde stand op het
   scherm. De database ververst het achteraf.
3. **Alle tabellen tegelijk ophalen.** Vroeger wachtte elk van de vijftien verzoeken op het
   vorige: vijftien keer heen en weer naar de server, achter elkaar. Nu vertrekken ze samen.
4. **Foto's komen niet mee uit de database.** Dit was veruit de grootste: een foto van
   1000 px staat als tekst in de tabel (± 150 kB per stuk) en de inventaris telt 180 rijen.
   Die haalden we bij élke start op, en opnieuw bij elke wijziging van een collega. Nu
   vragen we bij het opstarten alle kolommen behálve de foto, en halen we achteraf — met de
   app al bruikbaar — enkel de foto's op die dit toestel nog niet in IndexedDB heeft. Op een
   toestel dat al gesynchroniseerd is, is dat nul.
5. **Foto's gaan ook niet mee omhoog.** Een voorraadtik of een pincode-wijziging stuurt de
   rij zonder foto terug. Dat scheelt niet enkel tijd: omdat de foto's pas achteraf laden,
   zou de app anders een lege foto over de echte heen schrijven.
6. **Niet vijftien keer wegschrijven.** Tijdens het laden wordt de offline kopie één keer
   op het einde bewaard in plaats van na elke tabel.

Daarbovenop: de service worker serveert `js`, afbeeldingen en het manifest nu meteen uit de
bewaarde kopie en ververst op de achtergrond (`supabase.min.js` alleen al is ruim 200 kB en
verandert bijna nooit). **Pagina's** blijven netwerk-eerst, zodat je nooit met oude code
werkt — maar met een limiet van 1,5 seconden: daarna verschijnt de bewaarde versie en haalt
de app zichzelf even later stil bij. Vroeger keek je op een trage wifi naar een leeg scherm
tot het verzoek klaar was.

> Meer in de database steken maakt het dus **niet** sneller — de database zit aan de andere
> kant van de wifi en dát is het trage stuk. Sneller worden we door minder op te halen en
> meer op het toestel te houden.

De pagina's zetten ook alvast de verbinding met de database op (`preconnect`), zodat de
eerste zoekopdracht niet meer op de DNS- en beveiligingshanddruk hoeft te wachten.

## Mappenstructuur

In één oogopslag:

```
bazar-bizarre/
├─ index.html               → stuurt de kale link door naar entertainment.html
├─ entertainment.html       → DE STARTPAGINA met de kaarten
├─ bazar-bizarre-spel.html  → de spelleider-app
├─ manifest.json  sw.js  manuals.json  CNAME
├─ paginas/                 → alle andere schermen, één bestand per kaart
├─ css/                     → app.css: het volledige uiterlijk
├─ js/                      → de programmacode
├─ assets/  deals/  manuals/ → afbeeldingen, deal-plaatjes, PDF's/video's
├─ docs/                    → naslag voor jou (SQL, plannen, stappenplannen)
├─ tests/                   → controles op de opslag
└─ _bron/                   → werkmateriaal, gaat NIET online
```

**Hoofdmap — enkel wat mensen rechtstreeks openen (deze moeten hier blijven staan):**
- `index.html` — stuurt de kale link automatisch door naar `entertainment.html`
- `entertainment.html` — de startpagina met de kaarten (staat in `manifest.json` en op
  ieders startscherm — dit bestand mag dus nooit verhuizen)
- `bazar-bizarre-spel.html` — de spelleider-app zelf
- `manifest.json` — maakt de app installeerbaar
- `sw.js` — laat de app offline werken
- `manuals.json` — inhoudsopgave voor "Online manuals"

**`paginas/` — elke kaart op de startpagina is één eigen bestand** (sinds v4.0; daarvoor
zat alles in `entertainment.html`, sinds v4.6 staan ze samen in deze map). Wil je iets
aanpassen aan een onderdeel, dan open je gewoon dat ene bestand — de rest blijft ongemoeid:

| Kaart | Bestand |
|---|---|
| Inventaris lijst BB | `paginas/inventaris.html` |
| Besteloverzicht | `paginas/bestellingen.html` |
| Projecten | `paginas/projecten.html` |
| Ratings | `paginas/ratings.html` (+ `ratings-vergelijk.html`) |
| Checklists | `paginas/checklists.html` |
| Contacten | `paginas/contacten.html` |
| Logboek | `paginas/logboek.html` |
| Online manuals | `paginas/manuals.html` |
| Instellingen | `paginas/instellingen.html` |
| Activiteit | `paginas/activiteit.html` (admin of vaste mdw) |
| Systeem | `paginas/systeem.html` (enkel admin) |

Omdat die pagina's één map dieper staan, verwijzen ze met `../` naar de gedeelde
bestanden (`../css/app.css`, `../js/kern.js`, `../entertainment.html`). Onderling
verwijzen ze gewoon naar elkaar (`contacten.html`). In de programmacode doet
`bbUrl('paginas/inventaris.html')` dat rekenwerk automatisch, zodat dezelfde code
werkt vanaf de startpagina én vanuit `paginas/`.

**`css/` — de vormgeving:**
- `app.css` — het volledige uiterlijk, gedeeld door álle pagina's hierboven.
  Eén kleur aanpassen past dus meteen overal.

**`js/` — de programmacode:**
- `kern.js` — wat elke pagina nodig heeft: inloggen met pincode, het donkere thema,
  foto's/camera, de gedeelde instellingen en de "wacht op internet"-melding. Ook het
  versienummer van de app (`APP_VERSION`) staat hier.
- `inventaris.js` — de gedeelde motor: opslag, synchronisatie met Supabase, offline-wachtrij.
  Alle pagina's gebruiken deze (via `BBInv`).
- `zoek.js` — het vergrootglas in de balk dat over alle categorieën tegelijk zoekt
- `inventaris-data.js` — de startlijst met prijzen
- `projecten.js` — alles wat de projectenpagina doet
- `ratings.js` / `ratings-vergelijk.js` — de gastbeoordelingen
- `supabase.min.js` — de database-bibliotheek

Elke pagina laadt de scripts in deze volgorde en vult daarna zelf `window.bbStart`
(tekenen bij het openen) en `window.bbOnChange` (opnieuw tekenen als een collega iets
wijzigt) in:

```
supabase.min.js → inventaris-data.js → inventaris.js → kern.js → eigen script
```

**`docs/` — naslag voor jou, niet nodig voor de site:**
- `projecten-supabase.sql` — eenmalig uit te voeren in Supabase
- `finalevraag-kolom.sql` — voegt de kolom `finalevraag` toe aan de tabel `formulieren`
- `PROJECTEN-PLAN.md` — het plan en de gemaakte keuzes achter Projecten
- `STAPPENPLAN.md` — de checklist: beveiligen, naam kiezen, eigen domeinnaam
- `BEVEILIGING.md` — de database op slot zetten met een gedeelde toegangscode
- `beveiliging-supabase.sql` — hoort bij bovenstaande; `beveiliging-terugdraaien.sql` is de noodknop
- `EIGEN-DOMEIN.md` — van het github.io-adres naar een eigen domeinnaam

**`tests/` — controles op de opslag** (zie `tests/LEESMIJ.md`); handig na een wijziging.

**Mappen met bestanden:**
- `assets/` — alle afbeeldingen/iconen: `logo-cp.png`, `logo-cp-full.png`,
  `Logo_kleine_tekst.png`, `icon-192.png`, `icon-512.png`
- `deals/` — de 30 deal-plaatjes (Ronde 1)
- `manuals/` — PDF's/video's voor "Online manuals" (zie `manuals/LEESMIJ.md`)

Verplaats of hernoem je een bestand uit `js/` of `css/`, pas dan ook de
`<script src="…">`- en `<link rel="stylesheet">`-regels in álle HTML-pagina's én de lijst
`ASSETS` in `sw.js` aan — anders breekt de site of werkt hij niet meer offline. Maak je
een nieuwe pagina, zet die er dan ook bij in `ASSETS`.

**Een nieuwe pagina toevoegen** gaat zo:
1. Kopieer een bestaande pagina uit `paginas/` (bv. `contacten.html`) als vertrekpunt.
2. Pas de titel in de balk aan en zet je eigen inhoud in het blok `view paginainhoud`.
3. Vul onderaan `window.bbStart` (tekenen bij het openen) en eventueel `window.bbOnChange`
   (opnieuw tekenen als een collega iets wijzigt) in.
4. Voeg een kaart toe in `entertainment.html` met `href="paginas/jouwpagina.html"`.
5. Zet het bestand in de lijst `ASSETS` in `sw.js` en verhoog daar het versienummer.

**`_bron/` (werkmateriaal — blijft lokaal, gaat NIET online):**
- `_process.ps1` — script dat de deal-plaatjes bijsnijdt en roteert
- `_deals_backup/` — originele deal-plaatjes (de bron)
- `deals-check.png` — controle-montage van alle deals
- `deals-vel.pdf` — print-vel
- `Logo_grote_tekst.png` — extra logo-variant (ongebruikt)

---

## Online (GitHub Pages)

De site staat live op **https://oomsmatthew-arch.github.io/bazar-bizarre/** — die link deel je,
iedereen kan hem openen op tablet of telefoon.

Publiceren gebeurt via **GitHub Desktop**: commit je wijzigingen en klik **Push origin**.
Ongeveer een minuut later staat de nieuwe versie online. Verhoog daarbij ook het versienummer
in `sw.js`, anders blijven tablets de oude versie tonen.

Een eigen domeinnaam in plaats van het github.io-adres? Zie `docs/EIGEN-DOMEIN.md`.

> **Let op — de gegevens staan open.** Iedereen die de link heeft, kan momenteel bij de
> volledige inventaris en alle projecten. De pincodes in de app houden dat niet tegen.
> `docs/BEVEILIGING.md` legt uit hoe je dat afsluit met één gedeelde toegangscode.

---

## Als app op het startscherm zetten

**Op iPad / iPhone (Safari):**
1. Open de link in **Safari**.
2. Tik op het deel-icoon (vierkantje met pijl omhoog).
3. Kies **"Zet op beginscherm"** → **Voeg toe**.
Het icoontje verschijnt; de app opent schermvullend, zonder browserbalk.

**Op Android (Chrome):**
1. Open de link in **Chrome**.
2. Tik op de drie puntjes rechtsboven.
3. Kies **"App installeren"** of **"Toevoegen aan startscherm"**.

---

## Iets aanpassen?
- **Super Deals-namen, tracks of gewichten** wijzigen: dat staat bovenin `bazar-bizarre-spel.html`
  in de lijsten `SUPERDEALS`, `TRACKS` en de gewichten-berekening. Vraag gerust of ik
  het voor je aanpas — dan hoef je niet in de code te duiken.
- **Deal-plaatjes opnieuw maken**: leg nieuwe originelen in `_bron/_deals_backup/` en
  draai `_bron/_process.ps1`. De bewerkte plaatjes komen vanzelf in `deals/` terecht.
- Na een wijziging verhoog je best het versienummer in `sw.js` (bv. v1 → v2) zodat
  tablets de nieuwe versie ophalen.

Veel speelplezier met Bazar Bizarre!

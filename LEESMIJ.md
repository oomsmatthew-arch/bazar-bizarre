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

De inventaris zit volledig in de app zelf — geen Google of server nodig. `entertainment.html`
(Inventaris) en `bazar-bizarre-spel.html` (het spel) draaien op hetzelfde domein en **delen
daardoor dezelfde opslag** op het toestel.

- **Formulier** (in Bazar Bizarre): de knop **"Spel afsluiten"** opent een formulier waar
  je de weggegeven kleine/grote prijzen aanklikt (met zoek + aantal), boekjes invult,
  finale en opmerkingen. **Doorsturen** boekt alles af van de voorraad én sluit het spel af.
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

## Mappenstructuur

**Pagina's (hoofdmap — deze moeten hier blijven staan):**
- `index.html` — stuurt de kale link automatisch door naar `entertainment.html`
- `entertainment.html` — de landingspagina (Entertainment / Center Parcs)
- `bazar-bizarre-spel.html` — de spelleider-app zelf
- `projecten.html` — de projectenmodule
- `manifest.json` — maakt de app installeerbaar
- `sw.js` — laat de app offline werken
- `manuals.json` — inhoudsopgave voor "Online manuals"

**`js/` — de programmacode:**
- `inventaris.js` — de gedeelde motor: opslag, synchronisatie met Supabase, offline-wachtrij.
  Alle pagina's gebruiken deze (via `BBInv`).
- `inventaris-data.js` — de startlijst met prijzen
- `projecten.js` — alles wat de projectenpagina doet
- `supabase.min.js` — de database-bibliotheek

**`docs/` — naslag voor jou, niet nodig voor de site:**
- `projecten-supabase.sql` — eenmalig uit te voeren in Supabase
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

Verplaats je een bestand uit `js/`, pas dan ook de `<script src="…">`-regels in de drie
HTML-pagina's én de lijst `ASSETS` in `sw.js` aan — anders breekt de site of werkt hij niet
meer offline.

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

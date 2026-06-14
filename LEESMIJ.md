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

De inventaris zit volledig in de app zelf — geen Google of server nodig. `home.html`
(Inventaris) en `index.html` (het spel) draaien op hetzelfde domein en **delen daardoor
dezelfde opslag** op het toestel.

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

## Mappenstructuur

**Website (gaat online) — hoofdmap:**
- `home.html` — de landingspagina (Entertainment / Center Parcs)
- `index.html` — de spelleider-app zelf
- `manifest.json` — maakt de app installeerbaar
- `sw.js` — laat de app offline werken
- `manuals.json` — inhoudsopgave voor "Online manuals"

**Mappen die online gaan:**
- `assets/` — alle afbeeldingen/iconen: `logo-cp.png`, `logo-cp-full.png`,
  `Logo_kleine_tekst.png`, `icon-192.png`, `icon-512.png`
- `deals/` — de 30 deal-plaatjes (Ronde 1)
- `manuals/` — PDF's/video's voor "Online manuals" (zie `manuals/LEESMIJ.md`)

De bestanden in de hoofdmap moeten **in de hoofdmap** blijven staan, anders breekt de site.

**`_bron/` (werkmateriaal — blijft lokaal, gaat NIET online):**
- `_process.ps1` — script dat de deal-plaatjes bijsnijdt en roteert
- `_deals_backup/` — originele deal-plaatjes (de bron)
- `deals-check.png` — controle-montage van alle deals
- `deals-vel.pdf` — print-vel
- `Logo_grote_tekst.png` — extra logo-variant (ongebruikt)

---

## Online zetten via GitHub Pages (gratis)

Je hebt al een GitHub-account, dus dit is de makkelijkste route.

1. Ga naar https://github.com en klik rechtsboven op **+** → **New repository**.
2. Geef een naam, bv. `bazar-bizarre`. Zet 'm op **Public**. Klik **Create repository**.
3. Op de nieuwe repo-pagina: klik **"uploading an existing file"**.
4. Sleep ALLE bestanden hierboven (index.html, manifest.json, sw.js, en de 2 icons)
   in het uploadvak. Klik onderaan **Commit changes**.
5. Ga naar het tabblad **Settings** → links **Pages**.
6. Onder "Build and deployment" → Source: **Deploy from a branch**.
   Branch: **main** (of master), map: **/ (root)**. Klik **Save**.
7. Wacht ~1 minuut en ververs. Bovenaan verschijnt je link, zoiets als:
   `https://JOUWNAAM.github.io/bazar-bizarre/`

Die link deel je. Iedereen kan 'm openen op tablet of telefoon.

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
- **Super Deals-namen, tracks of gewichten** wijzigen: dat staat bovenin `index.html`
  in de lijsten `SUPERDEALS`, `TRACKS` en de gewichten-berekening. Vraag gerust of ik
  het voor je aanpas — dan hoef je niet in de code te duiken.
- **Deal-plaatjes opnieuw maken**: leg nieuwe originelen in `_bron/_deals_backup/` en
  draai `_bron/_process.ps1`. De bewerkte plaatjes komen vanzelf in `deals/` terecht.
- Na een wijziging verhoog je best het versienummer in `sw.js` (bv. v1 → v2) zodat
  tablets de nieuwe versie ophalen.

Veel speelplezier met Bazar Bizarre!

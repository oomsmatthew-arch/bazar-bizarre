# Projecten — uitwerking (plan)

> **Stand van zaken (2 augustus 2026) — Projecten v1.0**
> Gebouwd in `projecten.html` + `projecten.js`: een **eigen pagina** (zoals het spel er één
> heeft), met een eigen indigo/teal uitstraling los van het bosgroen van de rest.
> Zes tabbladen: **Overzicht · Bord · Agenda · Documenten · Verslagen · Bespreking**.
> Het bord is een **raster** (geen zijwaarts scrollen) en menu's/vensters zitten in de pagina
> zelf, niet in browserdialogen. Rechten instelbaar via Instellingen: aanmaken standaard voor
> vaste medewerkers, meewerken voor iedereen.
> **Bewust uitgesteld:** de plattegrond met pins.
> Eenmalig uitvoeren in Supabase: `projecten-supabase.sql` (bevat nu 5 tabellen —
> opnieuw draaien is veilig).


Nieuwe categorie op de homepagina, naast Inventaris / Bestellingen / Checklists / Logboek.
Werkt als een lichte "Trello": per project een bord met taken, plus agenda, plattegrond,
documenten en een besprekingsdraad. Zelfde stijl, zelfde login en dezelfde gedeelde
Supabase-opslag als de rest van de app (dus offline bruikbaar en op alle toestellen gelijk).

Voorbeelden van projecten voor jullie: een nieuw evenement opzetten, de Bazar Bizarre-show
vernieuwen, een zaal heropbouwen, een seizoensprogramma, een grote aankoop.

---

## 1. Structuur in twee niveaus

**Niveau 1 — Projectenlijst** (wat je ziet als je op de kaart "Projecten" tikt)
- Kaart per project met: kleur, naam, status-badge, voortgangsbalk (taken klaar/totaal),
  deadline, aantal open taken, avatars van wie meewerkt.
- Filters: **Lopend · Afgerond · Archief**, plus zoekveld en sorteren op deadline.
- Knop **+ Nieuw project** met sjablonen die het bord meteen vullen:
  - *Evenement* (kolommen: Idee → Voorbereiding → Deze week → Bezig → Klaar)
  - *Opbouw / verbouwing*
  - *Aankoop*
  - *Leeg*

**Niveau 2 — Eén project**, met tabbladen bovenaan (zoals de Inventaris nu heeft):

| Tab | Waarvoor |
|---|---|
| **Overzicht** | Dashboard: status, deadline, voortgang, mijn taken, laatste nieuws |
| **Bord** | De takenlijst in kolommen (het "Trello"-gedeelte) |
| **Agenda** | Kalender met afspraken, mijlpalen en alle deadlines |
| **Plattegrond** | Plan van de zaal/site met pins erop |
| **Documenten** | Bestanden en links |
| **Bespreking** | Chat + verslagen van vergaderingen |

---

## 2. Per onderdeel — wat erin moet

### 2.1 Overzicht (dashboard)
- Kop: naam, **status** (Idee / Lopend / On hold / Afgerond), verantwoordelijke,
  start- en einddatum, voortgangsbalk, "nog X dagen".
- Vrij tekstveld **doel van het project** (waarom doen we dit, wat is af als het af is).
- Blokjes met doorkliklinks: *Mijn taken* · *Komende 3 agenda-items* ·
  *Laatste 3 berichten* · *Recente documenten* · *miniatuur van de plattegrond*.

### 2.2 Bord (de takenlijst)
Het hart van de module.

- **Kolommen** (lijsten), zelf te maken, te hernoemen en te verslepen.
- **Kaart** = één taak, met:
  - titel + omschrijving
  - **toegewezen aan** één of meer collega's (uit de bestaande namenlijst, met avatar)
  - **deadline** (kleurt oranje bij <3 dagen, rood bij te laat)
  - **labels** met kleur (bv. Materiaal, Techniek, Personeel, Budget, Extern)
  - **subtaken** (checklist met eigen voortgangsbalkje)
  - **bijlagen** (foto uit de camera of bestand)
  - teller van reacties, en een verwijzing naar een pin op de plattegrond
- **Slepen** tussen kolommen — touch-vriendelijk, net zoals het slepen dat nu al in
  Checklists zit (dus geschikt voor tablet én gsm).
- Snel toevoegen bovenaan elke kolom (één regel typen = kaart).
- **Filters**: alleen mijn taken · per label · deadline deze week · klaar verbergen.
- Kaart afvinken → schuift naar Klaar, met wie en wanneer erbij.
- Op gsm: kolommen onder elkaar met een keuzebalk, i.p.v. horizontaal scrollen.

### 2.3 Agenda
- **Maandweergave** + lijst "eerstvolgende" eronder.
- Toont automatisch samen: agenda-items, **deadlines van taken**, de projectdeadline
  en (optioneel) de leverdatum van gekoppelde bestellingen.
- Agenda-item: datum, begin/einduur (mag leeg), titel, plaats, wie, notitie en soort
  (*afspraak · mijlpaal · levering · opbouw · afbraak*).
- Knop **Print weekplanning** (de app kan al printen, dat hergebruiken we).
- Later mogelijk: één gezamenlijke agenda over álle projecten heen.

### 2.4 Plattegrond
- Per project **meerdere plannen** (bv. "Zaal boven", "Terras", "Kabelplan").
- Plan toevoegen = afbeelding uploaden of foto maken met de tablet.
- **Pins plaatsen** door op het plan te tikken. Een pin heeft: kleur/soort, label,
  notitie, foto en optioneel een **koppeling naar een taak** op het bord.
- Pins zijn versleepbaar; tikken opent een paneeltje met de details.
- Pinsoorten met eigen kleur: opstelling/materiaal · aandachtspunt · stroom/techniek ·
  decor · te controleren.
- Knijpen om te zoomen en schuiven om te pannen (anders onbruikbaar op een detailplan).
- Gebruik: zaalopstelling, standenplan, waar welk decor komt, waar stroom nodig is.

### 2.5 Documenten
- Bestanden uploaden (PDF, foto, Word/Excel, video) — belanden in dezelfde
  Supabase-opslag als de manuals, in een eigen map per project.
- Ook **links** toevoegen (Google Drive, Sheets, offerte-pagina…).
- Per document: soort/tag (*Offerte · Draaiboek · Plan · Foto · Contract · Overig*),
  wie het toevoegde en wanneer, en een zoekveld.
- Verwijderen alleen achter het beheer-wachtwoord.
- Let op: bestanden bekijken vraagt internet (net als de manuals nu).

### 2.6 Bespreking (logboek / chat / vergadering)
Eén chronologische draad per project, met twee soorten items:

1. **Bericht** — kort, zoals het bestaande Logboek: tekst, naam, tijdstip, optioneel foto.
2. **Verslag** — gestructureerd: datum, aanwezigen, besproken punten, **beslissingen**,
   **actiepunten**.

- Bij elk actiepunt een knop **→ maak taak**: die zet er meteen een kaart op het bord van
  met de juiste persoon en deadline. Dat is precies wat een vergadering nu vaak verliest.
- Ongelezen-teller per project (bolletje op de projectkaart) op basis van "laatst gelezen".
- @naam vermelden in een bericht laat de taak/het bericht bij die persoon opduiken op zijn
  Overzicht.

---

## 3. Wat de onderdelen aan elkaar knoopt

Dit maakt het één geheel in plaats van vijf losse tooltjes:

- Actiepunt uit een **verslag** → **taak** op het bord.
- **Taak** met deadline → verschijnt vanzelf in de **agenda**.
- **Pin** op de plattegrond → gekoppeld aan een taak (en omgekeerd zichtbaar op de kaart).
- **Document** kan aan een taak hangen (offerte bij "Geluid huren").
- Alles wat er gebeurt, komt in het bestaande **Activiteit**-scherm (wie deed wat).
- Op de **homepagina**: een strookje "X taken van jou vervallen deze week" — in dezelfde
  stijl als de bestaande voorraadwaarschuwingen.

---

## 4. Wie mag wat

Sluit aan bij wat er nu al is (login met pincode, vaste vs. losse medewerkers, beheer-wachtwoord):

- **Iedereen die ingelogd is**: alles lezen, taken afvinken en verslepen, berichten plaatsen,
  documenten en agenda-items toevoegen, pins plaatsen.
- **Vaste medewerker**: project aanmaken en bewerken, kolommen beheren, verslagen schrijven.
- **Beheer-wachtwoord**: project verwijderen of archiveren, documenten verwijderen,
  andermans berichten verwijderen.

---

## 5. Technisch — hoe het in deze app past

### 5.1 Aparte JS-module
`entertainment.html` is al ±3.400 regels. De projectlogica komt daarom in een eigen
**`projecten.js`** (zoals `inventaris.js` nu), dat in `entertainment.html` wordt ingeladen.
In de HTML zelf enkel de schermen (`<div class="view" id="projecten">` enz.) en de kaart op
de homepagina.

### 5.2 Nieuwe tabellen in Supabase
Zelfde aanpak als de bestaande tabellen: tekst-id, `ts` als getal, lijstjes als `jsonb`,
en een lokale reservekopie op het toestel zolang een tabel nog niet bestaat.

| Tabel | Inhoud |
|---|---|
| `projecten` | id, naam, doel, status, kleur, start, deadline, verantwoordelijke, kolommen (jsonb), pos, archief, ts |
| `projecttaken` | id, project_id, kolom, titel, omschrijving, wie (jsonb), deadline, labels (jsonb), subtaken (jsonb), bijlagen (jsonb), pin_id, pos, klaar, klaar_door, ts |
| `projectagenda` | id, project_id, datum, van, tot, titel, soort, plaats, wie, notitie, ts |
| `projectplannen` | id, project_id, naam, url, pins (jsonb), pos, ts |
| `projectdocs` | id, project_id, naam, url, soort, taak_id, door, ts |
| `projectberichten` | id, project_id, soort (bericht/verslag), ts, auteur, tekst, data (jsonb), bijlage | 

Kan ook slanker (alles behalve berichten in één tabel `projectitems` met een kolom `soort`),
maar bovenstaande sluit beter aan bij hoe de app nu al werkt.

### 5.3 Meelopen met de bestaande motor
- **Realtime**: het abonnement `bb-all` luistert al naar *alle* tabellen in de database —
  er moet enkel per nieuwe tabel een herlaad-regel bij.
- **Offline**: schrijven gaat via dezelfde outbox (wachtrij) → werkt zonder internet en
  wordt later automatisch verstuurd.
- **Reservekopie**: de tekstgegevens in de bestaande lokale cache; foto's/plattegronden in
  IndexedDB, net als de checklist-media nu.
- **Opslag van bestanden**: hergebruik van `uploadFile()` met een map `projecten/<id>/`,
  dus **geen nieuwe bucket** nodig in Supabase.
- **Activiteit**: `BBInv.logAct(...)` bij elke wijziging.
- Na oplevering het versienummer in `sw.js` verhogen zodat tablets de nieuwe versie halen.

### 5.4 Wat jij in Supabase moet doen
Eén keer een stukje SQL plakken om de zes tabellen te maken, met dezelfde
toegangsinstelling als de bestaande tabellen. Dat script lever ik kant-en-klaar mee; tot
dat gebeurd is, draait alles gewoon lokaal op het toestel (zoals nu ook bij een
ontbrekende tabel).

---

## 6. Voorstel van fasering

**Fase 1 — de kern** (meteen bruikbaar)
Kaart op de homepagina · projectenlijst · project aanmaken · **Bord** met kolommen, kaarten,
slepen, toewijzen, deadline en subtaken · **Bespreking** (chat) · rechten · Activiteit.

**Fase 2 — plannen en papieren**
**Agenda** (maandweergave + deadlines van taken) · **Documenten** (uploads en links) ·
verslagen met "→ maak taak" · homepagina-strookje "mijn taken deze week".

**Fase 3 — plattegrond en koppelingen**
**Plattegrond** met pins, zoomen en koppeling taak ↔ pin · labels/filters ·
archiveren · sjablonen · print van weekplanning · koppeling met bestellingen.

---

## 7. Gemaakte keuzes

- **Aparte pagina** `projecten.html`, zoals het spel — niet een tabblad binnen de
  Entertainment-pagina. Deelt wel de login, de opslag en de stijl.
- **Fase 1 eerst**: bord + bespreking. Agenda en documenten volgen in fase 2.
- **Plattegrond uitgesteld** — komt er pas als de rest goed draait.
- **Rechten**: aanmaken standaard enkel voor vaste medewerkers, meewerken voor iedereen,
  en beide instelbaar via Instellingen op de homepagina.

## 8. Open vragen voor fase 2

1. Zijn projecten voor **iedereen zichtbaar**, of moeten sommige besloten kunnen?
2. Hoeveel projecten verwacht je tegelijk — een handvol, of tientallen?
3. Moet een project **kosten/budget** kunnen tonen, gekoppeld aan het Besteloverzicht?
4. Willen jullie een **melding** (bv. een strookje op de homepagina) als er taken van jou
   deze week vervallen?

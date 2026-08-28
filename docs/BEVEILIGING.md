# Beveiliging — de database op slot zetten

## Het probleem in één alinea

De app praat met Supabase via een sleutel die leesbaar in de broncode staat
([js/inventaris.js](../js/inventaris.js) bovenaan). Dat is normaal en niet het probleem — bij
Supabase is die sleutel een adreslabel, geen wachtwoord. Het probleem is dat de database
op dit moment tegen iedereen die aanbelt "kom binnen" zegt:

```sql
create policy "app volledige toegang" on public.projecten for all using (true) with check (true);
```

`using (true)` betekent letterlijk: geen voorwaarde. Wie de link van de site heeft, kan met
wat technische kennis de volledige inventaris, alle projecten, alle verslagen én de
namenlijst met pincodes uitlezen — en ook wijzigen of wissen.

De pincode `3920` en de persoonlijke pincodes houden dat niet tegen. Die worden ín de browser
gecontroleerd; ze bepalen wie je *bent* in de app, niet of je bij de gegevens *mag*.

## De oplossing

Eén gedeelde toegangscode voor het team. Je typt die één keer per tablet of laptop in, daarna
onthoudt het toestel de aanmelding. De database geeft vanaf dan enkel nog gegevens vrij aan wie
aangemeld is.

De namenlijst met pincodes blijft gewoon werken zoals nu — dat blijft de "wie ben ik"-keuze.
Er komt enkel één grendel vóór de deur.

---

## Uitvoeren — in deze volgorde

De volgorde is belangrijk. Doe je stap 4 eerst, dan tonen de tablets lege lijsten tot de rest
klaar is.

### Stap 1 — Maak het gedeelde account

1. Ga naar je project op https://supabase.com → **Authentication** → **Users**.
2. Klik **Add user** → **Create new user**.
3. Vul in:
   - **Email:** `team@entertainment.app`

     Moet exact dit zijn — het staat zo in de code. Dit is **geen werkend mailadres en geen
     websiteadres**: het is enkel de inlognaam van het gedeelde account. Er wordt nooit mail
     naartoe gestuurd, en het verandert niet mee als de site later een eigen domeinnaam krijgt.
     Wil je toch iets anders, pas dan `TEAM_EMAIL` in [js/inventaris.js](../js/inventaris.js) aan.
   - **Password:** de toegangscode die het team gaat gebruiken. Kies iets dat je kan doorgeven
     maar niet te raden is — geen `1234`. Bijvoorbeeld drie woorden aan elkaar.
   - **Auto Confirm User:** **aanvinken**. Zonder dit werkt aanmelden niet.
4. Klik **Create user**.

### Stap 2 — Zet zelfregistratie uit

Doe dit, maar weet waaróm. Het slot hángt hier niet van af: de regel uit stap 4 test niet
alleen of je aangemeld bent, maar ook of je e-mailadres `team@entertainment.app` is. Wie
zichzelf een account aanmaakt, krijgt dus alsnog niets te zien. Zet registratie toch uit —
anders kan een vreemde ongelimiteerd accounts (en bevestigingsmails) in jouw project laten
aanmaken, en dat wil je niet op je naam hebben staan.

1. **Authentication** → **Sign In / Providers** → **Email**.
2. Zet **Allow new users to sign up** (of "Enable sign ups") **uit**. Opslaan.

### Stap 3 — Zet de nieuwe app-versie online

De code die om de toegangscode vraagt, staat al klaar in [js/inventaris.js](../js/inventaris.js).
Open **GitHub Desktop** → commit → **Push origin**. Wacht een minuutje.

Deze versie werkt met de database in *beide* toestanden: nog open (zoals nu) of al op slot. Je
kan dus veilig eerst pushen en pas daarna stap 4 doen.

Controleer op je tablet dat het schermpje "Toegangscode" verschijnt en dat de code werkt.
Werkt dat, dan is stap 4 een formaliteit.

### Stap 4 — Zet de database op slot

Supabase → **SQL Editor** → **New query** → de inhoud van
[beveiliging-supabase.sql](beveiliging-supabase.sql) plakken → **Run**.

Onderaan verschijnt per tabel `Op slot: prijzen`, `Op slot: projecten`, … Tabellen die (nog)
niet bestaan worden netjes overgeslagen.

### Stap 5 — Controleer

1. Open de site in een **privé-venster** (Cmd+Shift+N). Je hoort de toegangscode te krijgen.
2. Vul de code in → alles moet er weer staan zoals gewoonlijk.
3. Test één wijziging (bv. een voorraadaantal aanpassen) en herlaad om te zien of ze bewaard is.

---

## Als er iets misloopt

Draai [beveiliging-terugdraaien.sql](beveiliging-terugdraaien.sql) in de SQL Editor. Dat zet
alles binnen de seconde terug open, precies zoals het nu is. Handig om achter de hand te houden
als er net een evenement bezig is.

Raakt een tablet niet binnen: laat hem de code opnieuw invullen. Lukt dat niet, wis dan de
websitegegevens in de browserinstellingen en herlaad.

---

## Wat hiermee nog niet is opgelost

Eerlijk blijven over wat de grendel wel en niet doet:

- **Iedereen deelt dezelfde code.** Vertrekt een collega, dan verander je die code in Supabase
  (Authentication → Users → het account → wachtwoord wijzigen) en geef je hem opnieuw door.
  Voor een klein team is dat werkbaar; voor twintig mensen wil je echte accounts per persoon.
- **Wie de code heeft, mag alles.** Er is geen onderscheid tussen lezen en wijzigen, of tussen
  een medewerker en een beheerder. De rollen in de app (`vast` / gewoon) blijven een
  afspraak in de browser, geen harde grens.
- **De pincodes zijn versleuteld, maar zwak.** Ze staan in de tabel `gebruikers` als
  SHA-256-hash (zie `sha256` in [js/kern.js](../js/kern.js)) — dus níét als leesbare cijfers.
  Maar er zit geen salt op en het zijn er maar vier, dus tienduizend mogelijkheden: wie de
  hash heeft, rekent ze in een seconde door. Na deze ingreep is de tabel niet meer publiek
  leesbaar, maar wel voor wie de toegangscode heeft. Behandel een pincode dus als
  "wie ben ik", niet als geheim.
- **Manuals blijven publiek bereikbaar via hun directe link.** De app deelt ze via
  `getPublicUrl` uit een publieke bucket. Uploaden kan straks enkel nog aangemeld, maar een
  bestaande link blijft werken zonder code. Wil je dat ook dicht, dan moet de bucket op private
  en moet de code overschakelen op `createSignedUrl` — een aparte klus.

Voor een intern werkinstrument met een klein team is dit een prima niveau. Komt er ooit
persoonsgegevens van gasten in, dan is de stap naar accounts per persoon de volgende.

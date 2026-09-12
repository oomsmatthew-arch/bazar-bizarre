# Meldingen — een mailtje als er iets opvalt

> ⏳ **Stand van zaken (12 september 2026).** Stap 1 is gedaan: er is een Resend-account op
> `oomsmatthew@gmail.com` met een sleutel, en een testmail via die sleutel kwam met status 200
> door. Het script staat **ingevuld** klaar op je Mac als `docs/meldingen-supabase.INGEVULD.sql`
> (blijft lokaal; staat in `.gitignore` en gaat dus niet mee naar GitHub — de repo is openbaar).
> Nog te doen: stap 2 (het script draaien), en als je de mail op je **werkadres** wil: het
> domein koppelen, zie *Naar je werkadres* onderaan.

## Wat je krijgt

Elke ochtend (07:00 in de winter, 08:00 in de zomer) kijkt de database zelf naar alles wat
er sinds de vorige ochtend in het activiteitenlogboek is bijgekomen. Valt er iets op, dan
krijg je **één mail** met:

1. **Opvallend** — de regels die eruit springen, met wie, wanneer en waaróm ze opvallen.
2. **Wie deed wat** — per collega het aantal wijzigingen, en hoeveel daarvan verwijderingen.
3. Op maandag ook **Deze week** — de totalen van de voorbije zeven dagen.

Valt er niets op, dan komt er **geen mail** — behalve op maandag. Dan komt er altijd een
weekoverzicht, ook als het saai is. Zo weet je dat het nog draait: stilte betekent "niets
aan de hand", niet "kapot".

## Wat telt als opvallend

| | Wat | Voorbeeld uit het logboek |
|---|---|---|
| 🗑 | iets verwijderd of gewist | *Prijs verwijderd: Beertje knuffel* |
| 🔑 | beheer: wachtwoord, pincode gereset, rol, toegangen, gebruiker toegevoegd | *Gebruiker Lien — rol: Admin* |
| ♻️ | ingrijpend: inventaris of bestellijst teruggezet, wachtrij gewist, boekjesvoorraad ingesteld | *Inventaris hersteld naar de startlijst* |
| 🌙 | activiteit 's nachts (23:00–06:00) | om het even wat, om 02:14 |
| ❓ | een naam die niet in de namenlijst staat, of niemand ingelogd | wie = `?` |
| 📈 | opvallend veel van één persoon: meer dan 60 wijzigingen, of 5 of meer verwijderingen | |
| ⚠️ | het logboek zelf is gewist of ingekort | minder regels dan bij de vorige controle |

Een gewone dag — checklists afvinken, bestellingen bijwerken, iemand die bij de eerste keer
inloggen zijn pincode kiest — levert dus geen mail op.

## Waarom in Supabase en niet in de app

De app is een website op GitHub Pages: die kan zelf geen mail sturen, en ze draait alleen
op een tablet die openstaat. De database (Supabase) staat wél altijd aan en kan op een vast
uur iets doen. Het logboek staat daar toch al. Er verandert dus **niets aan de app**; het
enige nieuwe is één SQL-script, net zoals bij de beveiliging.

Voor het versturen zelf gebruiken we **Resend** — een gratis mailverzenddienst (100 mails
per dag, wij sturen er hoogstens één). Dat is nodig omdat Supabase zelf geen mails naar jou
kan sturen; het kan enkel een mailverzenddienst aanspreken.

---

## Uitvoeren

### Stap 1 — Een gratis Resend-account

1. Ga naar https://resend.com en klik **Sign up**. Meld je aan met **hetzelfde mailadres**
   als waar de meldingen naartoe moeten. Dat is belangrijk: zolang je geen eigen domeinnaam
   koppelt, mag Resend enkel naar je eigen adres sturen.
2. Bevestig je mailadres via de mail die je krijgt.
3. In het menu links: **API Keys** → **Create API Key**. Naam: bijvoorbeeld
   `Entertainment-app`. Permission: **Sending access** volstaat. Klik **Add**.
4. Kopieer de sleutel. Ze begint met `re_` en je ziet ze **maar één keer** — sluit je het
   venster zonder te kopiëren, maak dan gewoon een nieuwe aan.

Sla stap "Add domain" over. Je hebt geen eigen domein nodig; de mails komen dan van
`onboarding@resend.dev`. Wil je later ook collega's laten meelezen, of een mooiere afzender,
dan koppel je `entertainmentvm.be` (zie *Aanpassen* onderaan).

### Stap 2 — Het script draaien

1. Op je Mac staat `docs/meldingen-supabase.INGEVULD.sql` met de sleutel en het adres al
   ingevuld — open dat bestand. (Op een andere computer: open
   [meldingen-supabase.sql](meldingen-supabase.sql) en vul **bovenaan** de twee waarden zelf in;
   laat de aanhalingstekens staan.)
2. Ga naar je project op https://supabase.com → **SQL Editor** → **New query**.
3. Plak het hele bestand en klik **Run**.
4. Onderaan verschijnt een regel *Mail "🧪 Entertainment-app: testmail…" onderweg naar …*.
   Vergeet je een waarde in te vullen, dan stopt het script met een duidelijke melding.

Het script stuurt op het einde meteen een **testmail**, zodat je niet tot morgenochtend
hoeft te wachten om te weten of het werkt.

### Stap 3 — Nakijken

Kijk in je mailbox. Niets? Kijk in **Ongewenste e-mail** — Hotmail zet een eerste mail van
een onbekende afzender daar wel eens neer. Markeer ze als *Geen ongewenste e-mail*, dan komt
de rest gewoon binnen.

Nog altijd niets? Plak dit in de SQL Editor en klik Run:

```sql
select * from meldingen.laatste_antwoord();
```

| status | betekent |
|---|---|
| `200` | verstuurd — kijk nog eens in de spam |
| `401` of `403` | de sleutel klopt niet, of het adres bovenaan is niet het adres van je Resend-account |
| `422` | Resend begreep de mail niet — de tekst in de kolom *antwoord* zegt wat er schort |
| leeg | het verzoek is nog onderweg; wacht vijf seconden en probeer opnieuw |

Alles in één keer zien (naar wie, wanneer gepland, laatste keer gedraaid):

```sql
select * from meldingen.status();
```

---

## Aanpassen

Alles hieronder plak je in de SQL Editor en draai je met Run.

**Nog eens testen** (mailt ook als er niets opvalt):
```sql
select meldingen.verstuur(true);
```

**Ander uur.** De tijd staat in UTC: `0 6` is 07:00 in de winter en 08:00 in de zomer.
Wil je bijvoorbeeld 21:00 's avonds (zomer), neem dan `0 19`:
```sql
select cron.schedule('meldingen-dagelijks', '0 19 * * *', 'select meldingen.verstuur()');
```

**Drempels** — wat telt als "veel", en wanneer het nacht is:
```sql
update meldingen.instellingen
   set veel_per_persoon = 100,  -- meer dan zoveel wijzigingen van één persoon
       veel_verwijderd  = 3,    -- zoveel verwijderingen van één persoon
       nacht_van = 22, nacht_tot = 7;
```

**Geen weekoverzicht op maandag** (dan enkel nog mail als er echt iets opvalt):
```sql
update meldingen.instellingen set weekmail = false;
```

**Andere regels** voor wat opvallend is: dat staat in de functie `meldingen.redenen` in het
script — de regels met `like`. Pas ze aan en draai het hele script opnieuw (je twee waarden
staan er dan nog in).

**Naar je werkadres of naar collega's:** zie de sectie *Naar je werkadres* hieronder.

**Uitzetten** (alles blijft staan, er komt enkel geen mail meer):
```sql
select cron.unschedule('meldingen-dagelijks');
```
Weer aanzetten: het script opnieuw draaien, of het `cron.schedule`-regeltje van hierboven.

**Helemaal weg:**
```sql
select cron.unschedule('meldingen-dagelijks');
drop schema meldingen cascade;
```

---

## Naar je werkadres (matthew.ooms@groupepvp.com)

Zolang er geen eigen domein aan Resend gekoppeld is, mag Resend **enkel naar het adres van je
Resend-account** sturen — dat is je Gmail. Een proefzending naar het werkadres werd op
12 september geweigerd met precies die melding (status 403). Er zijn drie wegen:

**A. Het domein koppelen (aangeraden — eenmalig, daarna kan alles).** Dan mag Resend naar
eender welk adres sturen, met een nette afzender zoals `meldingen@entertainmentvm.be`. Je DNS
staat bij **Combell**.

1. Resend → **Domains** → **Add Domain** → `entertainmentvm.be`. Kies als regio **Europe**.
2. Resend toont dan drie of vier DNS-records: een **TXT** voor `resend._domainkey` (DKIM), een
   **MX** en een **TXT** voor `send` (SPF), en een optionele **TXT** voor `_dmarc`. Laat dat
   scherm open staan.
3. Log in bij Combell → **Mijn Combell** → **Domeinnamen** → `entertainmentvm.be` →
   **DNS-beheer**. Voeg de records één voor één toe, met exact de naam, het type en de waarde
   uit het Resend-scherm. Let op: als Combell de naam automatisch aanvult met
   `.entertainmentvm.be`, typ je enkel het deel ervoor (`resend._domainkey`, `send`, `_dmarc`).
4. De mail die het domein nu al heeft (via mailprotect.be) blijft gewoon werken: de records van
   Resend staan op de subnaam `send.` en raken het bestaande SPF- en MX-record van het domein
   zelf niet aan. Verander die bestaande records dus **niet**.
5. Terug in Resend: **Verify DNS Records**. Meestal groen binnen een half uur, soms duurt het
   een paar uur.
6. Daarna in de Supabase SQL Editor:
   ```sql
   update meldingen.instellingen
      set van  = 'Entertainment-app <meldingen@entertainmentvm.be>',
          naar = 'matthew.ooms@groupepvp.com';
   select meldingen.verstuur(true);   -- meteen een testmail naar het werkadres
   ```
   Het adres `meldingen@…` hoeft niet echt te bestaan; het is enkel de afzender.

**B. Snel, zonder DNS: een tweede Resend-account op je werkadres.** Meld je bij Resend aan met
`matthew.ooms@groupepvp.com`, maak daar een nieuwe sleutel, en zet die in Supabase:
```sql
update meldingen.instellingen
   set resend_sleutel = 're_NIEUWE_SLEUTEL',
       naar           = 'matthew.ooms@groupepvp.com';
select meldingen.verstuur(true);
```
Nadeel: bedrijfsmail filtert een afzender als `onboarding@resend.dev` al eens weg; kijk dus
in je map Ongewenste e-mail of vraag IT om hem toe te laten.

**C. Nog sneller: Gmail laten doorsturen.** Gmail → Instellingen → *Doorsturen en POP/IMAP* →
*Een doorstuuradres toevoegen* → je werkadres bevestigen → filter op afzender
`onboarding@resend.dev` → *Doorsturen naar*. De mail komt dan "via Gmail" op je werk aan.

## Wat het níét ziet

De controle kijkt enkel naar het **activiteitenlogboek**. Wat daar niet in komt, ziet ze
dus ook niet:

- Iemand die enkel *kijkt* — dat wordt niet gelogd.
- Foute pincodes bij het inloggen — dat wordt (nog) niet gelogd. Wil je dat wel, dan is dat
  een kleine aanpassing in de app; zeg het maar.
- Wijzigingen die iemand rechtstreeks in het Supabase-dashboard doet — die gaan buiten de
  app om.
- Wat een tablet nog in zijn wachtrij heeft omdat de wifi weg was. Dat komt in het logboek
  zodra de tablet weer online is, en dus in de mail van de dag erna.

Als het logboek gewist wordt, zie je dat pas bij de volgende ochtendcontrole — niet op
het moment zelf.

**Als het Supabase-project pauzeert** (gratis projecten doen dat na een week zonder
gebruik), stopt ook de klok. De app wordt dagelijks gebruikt, dus dat zou niet mogen
gebeuren; en na het hervatten loopt alles vanzelf weer.

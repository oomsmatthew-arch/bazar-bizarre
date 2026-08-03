# Stappenplan — van github.io naar een echte website

Drie fases. **Fase A staat volledig los van B en C** — je kan vandaag beveiligen zonder ook
maar één naam gekozen te hebben. B en C mogen weken later.

De details staan in [BEVEILIGING.md](BEVEILIGING.md) en [EIGEN-DOMEIN.md](EIGEN-DOMEIN.md);
dit is de checklist erboven.

---

## Fase A — De database op slot (~30 min) · doe dit eerst

> Nu kan iedereen met de websitelink de volledige inventaris, alle projecten én de namenlijst
> met pincodes lezen en wijzigen. Dit is het enige dat echt dringend is.

**Plan het op een rustig moment — niet vlak voor of tijdens een evenement.**

- [ ] **A1. Kies een toegangscode.** Drie willekeurige woorden aan elkaar (patroon:
      `koffie-tafel-lamp`, maar verzin je eigen woorden). Niet `1234`. Deze code deel je
      met het team.

- [ ] **A2. Maak het gedeelde account.** Supabase → **Authentication** → **Users** →
      **Add user** → **Create new user**:
      - Email: `team@entertainment.app` — exact zo. Dit is een inlognaam, geen echt
        mailadres en geen websiteadres.
      - Password: je code uit A1
      - **Auto Confirm User: aanvinken** ← zonder dit werkt aanmelden niet

- [ ] **A3. Zet zelfregistratie uit.** Supabase → **Authentication** →
      **Sign In / Providers** → **Email** → **Allow new users to sign up** **uit** → opslaan.
      *Sla dit niet over: anders maakt iemand gewoon zelf een account aan en staat hij
      alsnog binnen.*

- [ ] **A4. Zet de code online.** GitHub Desktop → commit-bericht bv. `Toegangscode +
      beveiliging` → **Commit to main** → **Push origin**. Wacht een minuutje.

- [ ] **A5. Test op je tablet.** Open de site opnieuw. Het schermpje **Toegangscode** hoort
      te verschijnen; je code hoort te werken en daarna staat alles er zoals gewoonlijk.

      > **STOP-punt.** Werkt dit niet? Ga niet verder naar A6. De database staat op dit punt
      > nog open, dus er is niets stuk — eerst dit oplossen.

- [ ] **A6. Zet de database op slot.** Supabase → **SQL Editor** → **New query** → de volledige
      inhoud van [beveiliging-supabase.sql](beveiliging-supabase.sql) plakken → **Run**.
      Onderaan verschijnt per tabel `Op slot: …`.

- [ ] **A7. Laat controleren.** Zeg het in de chat — dan test ik van buitenaf of de gegevens
      echt niet meer bereikbaar zijn. Dat is het harde bewijs, niet het gevoel dat het werkt.

- [ ] **A8. Rol uit naar het team.** Geef de code door en vul hem één keer in op elke tablet
      en laptop die de app gebruikt.

**Loopt er iets mis:** [beveiliging-terugdraaien.sql](beveiliging-terugdraaien.sql) in de SQL
Editor zet alles binnen de seconde terug open. Houd die link bij de hand tijdens A6.

---

## Fase B — Kies de naam (~een avond nadenken)

De site is breder dan één spel: Bazar Bizarre, inventaris, manuals en projecten zitten er
allemaal in. Kies dus een naam voor het **geheel**.

- [ ] **B1. Bedenk een naam.** Kort genoeg om op een tablet te typen en om door te bellen.
      Zie [EIGEN-DOMEIN.md](EIGEN-DOMEIN.md) stap 0 voor denkrichtingen.

      > **Geen bedrijfsnaam van een ander.** Is dit voor Center Parcs, registreer dan geen
      > domein met hun naam erin zonder toestemming — dat geeft gedoe met merkenrecht.

- [ ] **B2. Check of hij vrij is** bij een registrar (zie C1) — die zegt het meteen.

- [ ] **B3. Naam in de app zetten.** Vraag het in de chat: de titel op de startpagina,
      `manifest.json` (wat onder het icoon staat op de tablet) en `index.html` staan nu
      op "Entertainment". Dat is een paar regels op drie plaatsen.

---

## Fase C — Eigen domeinnaam (~1 uur, verspreid over een dag)

Kan pas na B1. Details in [EIGEN-DOMEIN.md](EIGEN-DOMEIN.md).

- [ ] **C1. Koop het domein.** Cloudflare (~€10/jaar), Combell (~€15) of Versio (~€10).
- [ ] **C2. Zet de DNS-records.** Vier A-records op `185.199.108-111.153`, plus een
      CNAME `www` → `oomsmatthew-arch.github.io`. Kan tot 24 uur duren voor het actief is.
- [ ] **C3. GitHub instellen.** Repo → **Settings** → **Pages** → **Custom domain** invullen
      → **Save**. Wacht op het groene vinkje.
- [ ] **C4. HTTPS afdwingen.** Vink **Enforce HTTPS** aan zodra die optie verschijnt (kan een
      uur duren — GitHub maakt intussen gratis een certificaat aan).
- [ ] **C5. Haal het CNAME-bestand op.** GitHub Desktop → **Fetch origin** → **Pull origin**.
      Doe je dit niet, dan botst je volgende push.
- [ ] **C6. Tablets opnieuw instellen.** Op elk toestel: oud app-icoon verwijderen, het nieuwe
      adres openen, opnieuw op het beginscherm zetten. *Sluit lopende spellen af vóór de
      verhuizing* — die staan op het toestel, niet in de database.
- [ ] **C7. Controleer.** Domein opent, `www` komt op hetzelfde uit, slotje in de adresbalk,
      app start schermvullend op de tablet.

---

## Waar het op vastloopt (verwachte struikelblokken)

| Symptoom | Oorzaak | Oplossing |
|---|---|---|
| Toegangscode wordt niet aanvaard | **Auto Confirm User** niet aangevinkt bij A2 | Gebruiker verwijderen en opnieuw aanmaken |
| Na A6 zijn alle lijsten leeg | A4 niet gepusht, of tablet draait nog de oude versie | Pushen; op de tablet websitegegevens wissen en herladen |
| Volgende push botst | CNAME-bestand van C3 niet opgehaald | GitHub Desktop → Pull origin |
| Tablet toont oude versie | Service worker cachet | Versienummer in `sw.js` verhogen bij elke push |

# Eigen domeinnaam instellen

Van `https://oomsmatthew-arch.github.io/bazar-bizarre/` naar een eigen adres.

Hosting blijft gratis bij GitHub Pages — je betaalt enkel de domeinnaam, ongeveer €10 tot €20
per jaar. Er hoeft **niets aan de code te veranderen**: alle verwijzingen in de app zijn
relatief (`./entertainment.html`, `sw.js`, `js/…`), dus de app werkt op elk adres.

De gekozen naam is **EntertainmentVM**, domein `entertainmentvm.be`. Die staat al in de app
zelf (titel, `manifest.json`, `index.html`); enkel het domein moet nog geregeld worden.

---

## Stap 0 — Kies een naam

De site is breder dan één spel: `entertainment.html` is de startpagina, met Bazar Bizarre,
de inventaris, de manuals en de projecten als onderdelen. Kies dus een naam die de **hele
site** dekt, niet één spel. Bazar Bizarre kan later gewoon een pagina op die site zijn.

Denkrichtingen:

- Op de ploeg of de dienst — `entertainmentteam.be`, `crewentertainment.be`
- Op wat het is — `entertainmentcentrale.be`, `showbeheer.be`
- Op je eigen naam of merk — als er al een bestaande naam is, sluit daarbij aan

Praktisch: kort genoeg om op een tablet te typen, geen streepjes of dubbele letters die
verwarren als je hem doorbelt, en `.be` is voor intern Belgisch gebruik prima.

> **Let op met de bedrijfsnaam.** Werk je dit voor Center Parcs (het logo staat in `assets/`),
> registreer dan geen domein met hun naam erin zonder toestemming — dat geeft gedoe met
> merkenrecht. Een neutrale teamnaam is veiliger.

Check of de naam vrij is bij de registrar in stap 1; die zegt het meteen.

## Stap 1 — Koop de domeinnaam

Bij eender welke registrar. Een paar die in België vlot werken:

| Waar | Prijsindicatie | Opmerking |
|---|---|---|
| Cloudflare | ~€10/jaar | Goedkoopst, geen opsmuk, DNS is uitstekend |
| Combell | ~€15/jaar | Belgisch, Nederlandstalige support |
| Versio | ~€10/jaar | Nederlands, eenvoudig paneel |

Een `.be` kan je enkel via een erkende registrar kopen; `.com` of `.app` kan overal.

## Stap 2 — Zet de DNS-records klaar

Log in bij je registrar en zoek **DNS** of **DNS-beheer**. Voeg toe:

**Vier A-records** (voor `entertainmentvm.be` zelf) — naam leeg laten of `@`:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**Eén CNAME-record** (voor `www.entertainmentvm.be`):

```
Naam:   www
Waarde: oomsmatthew-arch.github.io
```

Let op het puntje: sommige panelen willen `oomsmatthew-arch.github.io.` met punt op het einde.
Zoniet, laat de punt weg — het paneel toont meestal zelf wat het verwacht.

DNS-wijzigingen zijn doorgaans binnen een half uur actief, soms duurt het tot 24 uur.

## Stap 3 — Zeg tegen GitHub welk domein het is

1. Ga naar https://github.com/oomsmatthew-arch/bazar-bizarre
2. **Settings** → links **Pages**.
3. Onder **Custom domain**: vul `entertainmentvm.be` in → **Save**.
4. GitHub controleert de DNS. Groen vinkje = in orde. Rood = de DNS is nog niet doorgesijpeld;
   wacht en klik nog eens op Save.
5. Zodra het vinkje groen is, verschijnt **Enforce HTTPS**. Vink dat aan. Het kan tot een uur
   duren voor die optie beschikbaar wordt — GitHub maakt intussen gratis een certificaat aan.

## Stap 4 — Haal het CNAME-bestand op

Bij stap 3 maakt GitHub automatisch een bestand `CNAME` aan **in de repo online**. Dat bestand
heb je lokaal nog niet.

Open **GitHub Desktop** en klik **Fetch origin** → **Pull origin**. Doe je dit niet, dan botst
je volgende push met die wijziging.

## Stap 5 — Tablets opnieuw instellen

Dit is het enige wat echt aandacht vraagt. De app op het startscherm van een tablet blijft
vastzitten aan het oude adres, inclusief de offline-opslag van de service worker.

Op elk toestel:

1. Verwijder het oude app-icoon van het startscherm.
2. Open het **nieuwe** adres in Safari (iPad) of Chrome (Android).
3. Zet het opnieuw op het beginscherm — zie [LEESMIJ.md](../LEESMIJ.md).

Het oude adres `oomsmatthew-arch.github.io/bazar-bizarre/` blijft daarna automatisch
doorverwijzen naar het nieuwe, dus wie het vergeet, komt alsnog goed uit.

**De gegevens dan?** Alles wat gedeeld is (inventaris, projecten, formulieren) staat in
Supabase en komt gewoon mee. Enkel wat puur op het toestel stond — een lopend spel dat nog
niet is afgesloten — hoort bij het oude adres. Sluit lopende spellen dus af vóór je verhuist.

---

## Even nakijken achteraf

- `https://entertainmentvm.be` opent de app
- `https://www.entertainmentvm.be` komt op hetzelfde uit
- Het slotje staat in de adresbalk (HTTPS werkt)
- Op de tablet werkt "Zet op beginscherm" en start de app schermvullend

---

## Moet de repo ook hernoemd worden?

Nee. Zodra het eigen domein werkt, is de repo-naam nergens meer zichtbaar voor je collega's —
`bazar-bizarre` mag gewoon blijven staan. Hernoem je hem toch (GitHub → Settings → Repository
name), pas dan ook het CNAME-record uit stap 2 aan; de github.io-naam blijft wel dezelfde.

## En de naam in de app zelf?

De titel op de startpagina, de naam in `manifest.json` (wat onder het icoon staat op de tablet)
en de tekst in `index.html` zeggen nu "Entertainment". Wil je daar de nieuwe naam zetten, vraag
het gerust — dat is een kwestie van een paar regels op drie plaatsen.

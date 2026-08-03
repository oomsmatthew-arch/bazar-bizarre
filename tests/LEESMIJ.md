# Tests

Kleine controles die de **gegevenslaag** (`js/inventaris.js`) echt uitvoeren, zonder browser.
Handig om na een wijziging te controleren dat er niets stuk ging — zeker bij alles wat met
opslag en synchronisatie te maken heeft, want dáár kost een fout je gegevens.

## Draaien

Vanuit de hoofdmap van het project, op een Mac:

```
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
$JSC tests/test-datalaag.js
$JSC tests/test-fase2.js
$JSC tests/test-soorten.js
$JSC tests/test-sync.js
$JSC tests/test-opslag.js
```

Elke test eindigt met `RESULTAAT: alles in orde` of een aantal fouten.
(Werkt ook met `node` als dat geïnstalleerd is: `node tests/test-datalaag.js`, mits je
`load()` vervangt door `require()` — met jsc werkt het meteen.)

## Wat ze controleren

| Bestand | Onderwerp |
|---|---|
| `test-datalaag.js` | Projecten en taken: aanmaken, verslepen, afvinken, subtaken, kolom hernoemen, verwijderen, activiteitenlog |
| `test-fase2.js` | Agenda, documenten en verslagen, en het omzetten van een actiepunt naar een taak |
| `test-soorten.js` | Ideeën, materiaal, draaiboek, verslag en evaluatie delen één tabel — deze test bewaakt dat ze elkaar niet in de weg zitten |
| `test-sync.js` | Het lastigste stuk: wat gebeurt er als je offline werkt, als de tabellen nog niet bestaan, of als een collega ondertussen iets aanmaakt of verwijdert |
| `test-opslag.js` | De opslag: één momentopname i.p.v. een kopie per tabel, de verhuizing naar IndexedDB (met een nagemaakte IndexedDB), en het geval waarin de opslag al vol zit — telkens wordt eerst ingelezen en pas daarna gewist |

`nep-supabase.js` is een nagemaakte database, zodat `test-sync.js` het echte online-gedrag
kan naspelen zonder internet.

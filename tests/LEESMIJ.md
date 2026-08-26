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
$JSC tests/test-bestellingen.js
$JSC tests/test-finalevraag.js
$JSC tests/test-vragenbank.js
$JSC tests/test-toegangen.js
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
| `test-bestellingen.js` | De startlijst uit het Excel-overzicht: de bedragen per kwartaal kloppen met het tabblad Financieel, en bij een bijgewerkt Excel worden de oude rijen vervángen zonder dat eigen bestellingen of andere toestellen dubbels krijgen |
| `test-toegangen.js` | Wie mag wat, per onderdeel: dat de standaardwaarden de app precies laten zoals ze was, dat een eigen instelling voorrang krijgt, en dat de oude projectrechten mee overgenomen worden |
| `test-vragenbank.js` | De gedeelde vragenlijst voor het finalespel: de volgorde (minst gespeeld eerst, dan het langst geleden), toevoegen/aanpassen/verwijderen, en dat een ander scherm dat instellingen bewaart de vragen niet wegvaagt |
| `test-finalevraag.js` | De finalevraag bij een ingezonden formulier — en vooral: dat een inzending óók aankomt zolang de kolom `finalevraag` nog niet in Supabase staat (een onbekende kolom laat anders het hele formulier mislukken) |
| `test-opslag.js` | De opslag én het opstarten: één momentopname i.p.v. een kopie per tabel, de verhuizing naar IndexedDB (met een nagemaakte IndexedDB), het geval waarin de opslag al vol zit, "invullen en meteen wegklikken", dat je rol al bekend is vóór de database antwoordt, en dat het laden de offline kopie niet per tabel herschrijft |

`nep-supabase.js` is een nagemaakte database, zodat `test-sync.js` het echte online-gedrag
kan naspelen zonder internet.

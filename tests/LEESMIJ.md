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
$JSC tests/test-formulier-aanpassen.js
$JSC tests/test-zaaien.js
$JSC tests/test-wachtrij.js
$JSC tests/test-verwijderen.js
$JSC tests/test-uitteller.js
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
| `test-formulier-aanpassen.js` | Een ingezonden formulier achteraf bewerken: het formulier heeft de voorraad al afgeboekt, dus elke wijziging aan de prijzen of boekjes moet als verschil terug op de stock. Sluit af met de kroontest — aanpassen moet exact hetzelfde opleveren als meteen het juiste formulier insturen |
| `test-zaaien.js` | Het zaaien van een lege database: een pagina die de standaardlijst niet inlaadt mag de migratievlag niet zetten, want dan komt die lijst op dat toestel nooit meer aan |
| `test-wachtrij.js` | Het seintje over de wachtrij (`setOnWachtrij`), waar de ⏳-melding in de balk aan hangt: het getal moet elke verandering volgen, precies één keer per verandering, en op 0 komen zodra alles verstuurd is |
| `test-verwijderen.js` | Verwijderen dat écht doorgaat: een verwijdering die de database stil weigert (dat doet ze sinds de beveiliging: "gelukt, 0 rijen" zonder foutmelding) mag niet uit de wachtrij verdwijnen, en een toestel dat niet aangemeld is stuurt niets — het wacht. Anders is de prijs van je scherm maar staat ze nog in de database, en komt ze bij de volgende synchronisatie terug |
| `test-uitteller.js` | De uitteller van het finalespel: wie zit het dichtst bij. Vooral het lézen van de getallen — bij ons is "25.000" vijfentwintigduizend en "12,5" twaalf en een half, precies andersom dan JavaScript het leest. Eén verkeerd gelezen getal en de verkeerde ploeg wint |
| `test-opslag.js` | De opslag én het opstarten: één momentopname i.p.v. een kopie per tabel, de verhuizing naar IndexedDB (met een nagemaakte IndexedDB), het geval waarin de opslag al vol zit, "invullen en meteen wegklikken", dat je rol al bekend is vóór de database antwoordt, en dat het laden de offline kopie niet per tabel herschrijft |

`nep-supabase.js` is een nagemaakte database, zodat `test-sync.js` het echte online-gedrag
kan naspelen zonder internet.

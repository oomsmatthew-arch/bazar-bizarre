# Online manuals — bestanden

Leg hier je **PDF's** en **video's** neer die je in de app wil tonen onder *Online manuals*.

## Hoe voeg ik iets toe?

1. Kopieer je bestand in deze map (`manuals/`), eventueel in een onderverdeling,
   bv. `manuals/bazar-bizarre/spelregels.pdf`.
2. Open `manuals.json` (één map hoger) en voeg een regel toe in de juiste map:

   ```json
   { "title": "Spelregels", "type": "pdf", "src": "manuals/bazar-bizarre/spelregels.pdf" }
   ```

   - `type`: `pdf`, `video` of `link`
   - `src`: het pad naar je bestand, of een volledige URL bij `link`
   - `desc` (optioneel): korte omschrijving onder de titel

3. Een nieuwe map maak je aan met een `folders`-blok in `manuals.json` — zie de
   voorbeelden die er al in staan.

## Tips
- Video's werken het best als **.mp4** (H.264). Grote video's kan je beter als
  `link` naar YouTube/Vimeo zetten i.p.v. ze hier op te slaan.
- De voorbeeldregels in `manuals.json` verwijzen naar bestanden die nog niet bestaan —
  vervang ze door je echte bestanden of verwijder ze.

-- ---------------------------------------------------------------------------
-- Finalevraag bij een ingezonden formulier
-- ---------------------------------------------------------------------------
-- Voer dit één keer uit in Supabase: SQL Editor → New query → plakken → Run.
--
-- Zonder deze kolom werkt de app gewoon: de finalevraag wordt dan achter de
-- finalereeks gezet in het bestaande veld 'finale'. Met de kolom krijgt ze een
-- eigen plek, en toont het inventarisoverzicht ze apart.
--
-- Dit is veilig om meerdere keren uit te voeren.

alter table public.formulieren
  add column if not exists finalevraag text default '';

-- Controle: hierna hoort 'finalevraag' in de lijst te staan.
select column_name
  from information_schema.columns
 where table_schema='public' and table_name='formulieren'
 order by ordinal_position;

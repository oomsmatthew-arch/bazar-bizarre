-- ---------------------------------------------------------------------------
-- Foto bij een product (Quiz / O&F / Algemeen)
-- ---------------------------------------------------------------------------
-- Voer dit één keer uit in Supabase: SQL Editor → New query → plakken → Run.
--
-- Zonder deze kolom kan je bij "Product toevoegen" al een foto kiezen, maar ze
-- blijft dan op dit ene toestel staan — ze synct niet mee naar de andere
-- toestellen. Met de kolom werkt het net als bij de prijzen van Prizenight.
--
-- Dit raakt de bestaande tabellen niet aan en is veilig om meerdere keren uit
-- te voeren.

alter table public.producten
  add column if not exists foto text default '';

-- Controle: hierna hoort 'foto' in de lijst te staan.
select column_name
  from information_schema.columns
 where table_schema='public' and table_name='producten'
 order by ordinal_position;

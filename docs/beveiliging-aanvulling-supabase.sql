-- ============================================================================
-- BEVEILIGING — AANVULLING: de tabellen die er later bijkwamen ook op slot
-- ============================================================================
-- Voer dit uit in Supabase: SQL Editor → New query → plakken → Run.
--
-- docs/beveiliging-supabase.sql zette de database op slot, maar de tabellen die
-- daarna kwamen (producten, productleveringen, werkuren) kregen nog de oude, open
-- regel "app volledige toegang": iedereen met de openbare sleutel uit de broncode
-- kon ze lezen en wijzigen — ook ieders werkuren. Dit zet ze op slot zoals de rest:
-- enkel het gedeelde teamaccount, dus enkel toestellen die de toegangscode invulden.
-- De app zelf merkt er niets van: ze schrijft al enkel vanaf zo'n toestel.
--
-- 'techniek' staat er ook in, voor het geval die tabel er al is (anders wordt ze
-- overgeslagen; docs/techniek-supabase.sql maakt ze meteen op slot aan).
-- Terugdraaien: docs/beveiliging-terugdraaien.sql.
-- ============================================================================

do $$
declare
  t text;
  n text;
  namen text[];
  tabellen text[] := array['producten','productleveringen','werkuren','techniek'];
begin
  foreach t in array tabellen loop
    if to_regclass('public.' || t) is null then
      raise notice 'Overgeslagen (bestaat niet): %', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    -- Alle bestaande regels weg (ook de open "app volledige toegang"): regels tellen met OF,
    -- één open regel die blijft staan, geeft alles vrij.
    select coalesce(array_agg(policyname), '{}') into namen
      from pg_policies where schemaname = 'public' and tablename = t;
    foreach n in array namen loop
      execute format('drop policy %I on public.%I', n, t);
    end loop;
    execute format(
      'create policy "enkel dit team" on public.%I for all to authenticated '||
      'using (auth.jwt()->>''email'' in (''team@entertainment.app'')) '||
      'with check (auth.jwt()->>''email'' in (''team@entertainment.app''))', t);
    raise notice 'Op slot: %', t;
  end loop;
end $$;

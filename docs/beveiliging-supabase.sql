-- ============================================================================
-- BEVEILIGING — zet de database op slot
-- ============================================================================
-- Voer dit uit in Supabase: SQL Editor → New query → plakken → Run.
--
-- LET OP — DOE EERST STAP 1 EN 2 UIT docs/BEVEILIGING.md:
--   1. Maak het gedeelde account aan (Authentication → Users).
--   2. Zet de nieuwe app-versie online (GitHub Desktop → Push).
-- Draai je dit script vóór die twee stappen, dan ziet de app een lege lijst
-- tot ze klaar zijn. Terugdraaien kan altijd met docs/beveiliging-terugdraaien.sql.
--
-- Wat verandert er? Nu mag iedereen met de link alles lezen én wijzigen
-- ("for all using (true)"). Straks mag dat enkel nog vanaf een toestel dat de
-- toegangscode heeft ingevuld (de rol 'authenticated'). De rol 'anon' — dat is
-- iedereen die enkel de sleutel uit de broncode heeft — krijgt niets meer.
-- ============================================================================

do $$
declare
  t text;
  n text;
  namen text[];
  tabellen text[] := array[
    'activiteit','appconfig','bestellingen','boekjes','checklisten','contacten',
    'formulieren','gebruikers','leveringen','logboek','manuals','manualsdoc',
    'prijzen','projectagenda','projectberichten','projectdocs','projecten',
    'projecttaken','spelarchief'
  ];
begin
  foreach t in array tabellen loop
    -- Tabel bestaat niet (nog niet aangemaakt)? Gewoon overslaan.
    if to_regclass('public.' || t) is null then
      raise notice 'Overgeslagen (bestaat niet): %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    -- ALLE bestaande regels weghalen, welke naam ze ook hebben.
    -- Dit is de kern van de zaak: de oudste tabellen (prijzen, gebruikers, formulieren…)
    -- zijn via de Supabase-knoppen aangemaakt en kregen namen als
    -- "Enable read access for all users". Regels worden met OF gecombineerd — één open
    -- regel die blijft staan, geeft alles vrij, hoe streng de nieuwe regel er ook naast staat.
    -- Daarom niet op naam wissen, maar alles wat er staat.
    -- Eerst de namen verzamelen, dan pas wissen — niet wissen terwijl je de lijst doorloopt.
    select coalesce(array_agg(policyname), '{}')
      into namen
      from pg_policies where schemaname = 'public' and tablename = t;

    foreach n in array namen loop
      execute format('drop policy %I on public.%I', n, t);
    end loop;
    raise notice '  % oude regel(s) verwijderd van %', array_length(namen, 1), t;

    -- Nieuwe regel: enkel het gedeelde teamaccount. Twee grendels op elkaar:
    --   "to authenticated"  → de rol 'anon' (enkel de sleutel uit de broncode) krijgt niets;
    --   de e-mailtest       → ook wie zichzelf een account zou aanmaken, krijgt niets.
    -- Dankzij die tweede test hangt de beveiliging niet af van een schakelaar in het
    -- Supabase-dashboard. Extra account nodig? Zet het adres erbij in de lijst hieronder
    -- (in beide regels) en draai dit script opnieuw.
    execute format(
      'create policy "enkel dit team" on public.%I for all to authenticated '||
      'using (auth.jwt()->>''email'' in (''team@entertainment.app'')) '||
      'with check (auth.jwt()->>''email'' in (''team@entertainment.app''))', t);

    raise notice 'Op slot: %', t;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Bestanden (manuals-bucket): uploaden mag enkel nog aangemeld.
-- ----------------------------------------------------------------------------
-- Let op: de app deelt manuals via een publieke link (getPublicUrl). Wie zo'n
-- link heeft, kan dat bestand blijven openen zonder code — dat is inherent aan
-- een publieke bucket. Wil je dat ook dichtzetten, zie docs/BEVEILIGING.md.
-- Ook hier eerst alle oude regels weg die over de manuals-bucket gaan, ongeacht hun naam.
-- Regels van andere buckets blijven staan.
do $$
declare
  n text;
  namen text[];
begin
  select coalesce(array_agg(policyname), '{}')
    into namen
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname ilike '%manual%'
           or coalesce(qual, '') like '%manuals%'
           or coalesce(with_check, '') like '%manuals%');

  foreach n in array namen loop
    execute format('drop policy %I on storage.objects', n);
    raise notice '  oude bucket-regel verwijderd: %', n;
  end loop;
end $$;

create policy "manuals enkel dit team" on storage.objects
  for all to authenticated
  using (bucket_id = 'manuals' and auth.jwt()->>'email' in ('team@entertainment.app'))
  with check (bucket_id = 'manuals' and auth.jwt()->>'email' in ('team@entertainment.app'));


-- ----------------------------------------------------------------------------
-- Controle: draai dit apart om te zien of alles klopt.
-- ----------------------------------------------------------------------------
-- Elke tabel hoort PRECIES ÉÉN regel te hebben, met de naam "enkel dit team" en
-- roles = {authenticated}. Zie je er twee op dezelfde tabel, of staat er ergens
-- {public}, dan is die tabel nog open — regels worden met OF gecombineerd, dus
-- één open regel volstaat om alles vrij te geven.
--
--   select tablename, policyname, roles
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;

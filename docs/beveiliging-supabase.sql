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

    -- De oude, open regel weghalen — dit is de regel die alles vrijgaf.
    execute format('drop policy if exists "app volledige toegang" on public.%I', t);
    execute format('drop policy if exists "enkel aangemeld" on public.%I', t);

    -- Nieuwe regel: enkel aangemelde toestellen. "to authenticated" is de kern —
    -- de rol 'anon' heeft daarna geen enkele regel meer en krijgt dus niets.
    execute format(
      'create policy "enkel aangemeld" on public.%I for all to authenticated using (true) with check (true)', t);

    raise notice 'Op slot: %', t;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Bestanden (manuals-bucket): uploaden mag enkel nog aangemeld.
-- ----------------------------------------------------------------------------
-- Let op: de app deelt manuals via een publieke link (getPublicUrl). Wie zo'n
-- link heeft, kan dat bestand blijven openen zonder code — dat is inherent aan
-- een publieke bucket. Wil je dat ook dichtzetten, zie docs/BEVEILIGING.md.
drop policy if exists "manuals enkel aangemeld" on storage.objects;
create policy "manuals enkel aangemeld" on storage.objects
  for all to authenticated
  using (bucket_id = 'manuals')
  with check (bucket_id = 'manuals');


-- ----------------------------------------------------------------------------
-- Controle: draai dit apart om te zien of alles klopt.
-- ----------------------------------------------------------------------------
-- Elke rij hoort roles = {authenticated} te tonen. Staat er ergens {public},
-- dan is die tabel nog open.
--
--   select tablename, policyname, roles
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename;

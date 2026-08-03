-- ============================================================================
-- NOODKNOP — zet alles terug open
-- ============================================================================
-- Gebruik dit als er na het dichtzetten iets misloopt (lege lijsten, niemand
-- raakt binnen) en je snel weer verder moet, bijvoorbeeld tijdens een evenement.
--
-- Supabase → SQL Editor → New query → plakken → Run. Werkt binnen de seconde.
-- Daarna is de situatie exact zoals vóór docs/beveiliging-supabase.sql:
-- iedereen met de link kan er weer bij. Bedoeld als tijdelijke terugval.
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
    if to_regclass('public.' || t) is null then continue; end if;

    execute format('drop policy if exists "enkel aangemeld" on public.%I', t);
    execute format('drop policy if exists "app volledige toegang" on public.%I', t);
    execute format(
      'create policy "app volledige toegang" on public.%I for all using (true) with check (true)', t);

    raise notice 'Terug open: %', t;
  end loop;
end $$;

drop policy if exists "manuals enkel aangemeld" on storage.objects;

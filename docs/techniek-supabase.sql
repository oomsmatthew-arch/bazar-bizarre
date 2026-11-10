-- Techniek (licht en geluid) — eenmalig uitvoeren
-- =============================================================================
-- Open je project op supabase.com → linksonder "SQL Editor" → "New query" →
-- dit hele bestand plakken → knop RUN.
--
-- Zonder dit werkt Techniek ook, maar dan blijft wat je invult op dat ene toestel
-- staan (het vertrekt alsnog zodra de tabel er is — de app onthoudt wat er nog moet).
--
-- Eén tabel, één rij per ding:
--   soort 'item'  het materiaal (telbaar of los, met plaats en status)
--   soort 'log'   het logboek: kapot gemeld, naar herstel, terug, besteld, geleverd…
-- De velden staan in 'data' (jsonb), zodat er later iets bij kan zonder nieuwe kolom.
-- Een foto (bij een melding) in een eigen kolom: die komt achteraf, apart van de rest.

create table if not exists public.techniek (
  id    text primary key,
  soort text   not null default 'item',
  ts    bigint default 0,
  data  jsonb  default '{}'::jsonb,
  foto  text   default ''
);

-- Op slot, zoals de andere tabellen (docs/beveiliging-supabase.sql): enkel het
-- gedeelde teamaccount, dus enkel toestellen die de toegangscode invulden.
alter table public.techniek enable row level security;
drop policy if exists "enkel dit team" on public.techniek;
create policy "enkel dit team" on public.techniek for all to authenticated
  using (auth.jwt()->>'email' in ('team@entertainment.app'))
  with check (auth.jwt()->>'email' in ('team@entertainment.app'));

-- Live meekijken: zonder dit zie je op de gsm pas na verversen wat iemand op de tablet meldde.
do $$
begin
  execute 'alter publication supabase_realtime add table public.techniek';
exception when others then null;
end $$;

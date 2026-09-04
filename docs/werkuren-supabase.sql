-- Tabel voor "Mijn werkuren" — eenmalig uitvoeren
-- =============================================================================
-- Open je project op supabase.com → linksonder "SQL Editor" → "New query" →
-- dit hele bestand plakken → knop RUN.
--
-- Zonder deze tabel werkt de pagina gewoon, maar dan blijven je uren op één toestel
-- staan (ze gaan wél alsnog vertrekken zodra de tabel er is — de app onthoudt wat er
-- nog moet). Ná dit script staan je uren op al je toestellen.
--
-- Deze tabel staat ook in docs/gedeelde-tabellen-supabase.sql. Heb je dat bestand al
-- opnieuw gedraaid, dan hoef je dit niet meer te doen. Alles is veilig om te herhalen.
--
-- LET OP — wat dit wél en niet is:
-- Elke rij draagt het id van de persoon die ze invulde, en de app toont je enkel je
-- eigen rijen. Dat maakt het persoonlijk in de app, maar het is geen kluis: de tabel
-- staat in dezelfde database als de rest, met dezelfde open toegang. Wie rechtstreeks
-- in Supabase kijkt, ziet alles — net zoals bij de andere tabellen.

create table if not exists public.werkuren (
  id        text primary key,
  gebruiker text default '',            -- id uit de tabel 'gebruikers': van wie deze rij is
  naam      text default '',            -- de naam erbij, zodat een rij leesbaar blijft
  datum     text default '',            -- JJJJ-MM-DD
  soort     text default 'gewerkt',     -- gewerkt / overuren / jv / bf / instelling
  start     text default '',            -- HH:MM (enkel bij 'gewerkt')
  einde     text default '',            -- HH:MM (enkel bij 'gewerkt')
  pauze     boolean default true,       -- is er pauze genomen? (false = niet aftrekken)
  minuten   integer default 0,          -- wat deze dag meetelt, in minuten
  opmerking text default '',
  ts        bigint default 0
);
-- 'instelling' is een aparte rij per persoon met de contracturen per week (in minuten),
-- nodig om een BF uit te rekenen. Die rij verschijnt nooit in het overzicht.

create index if not exists werkuren_gebruiker_idx on public.werkuren (gebruiker, datum);

-- Dezelfde open opzet als de andere tabellen van de app.
alter table public.werkuren enable row level security;
drop policy if exists "app volledige toegang" on public.werkuren;
create policy "app volledige toegang" on public.werkuren for all using (true) with check (true);

-- Live meekijken: zonder dit zie je op je gsm pas na verversen wat je op de tablet invulde.
do $$
begin
  execute 'alter publication supabase_realtime add table public.werkuren';
exception when others then null;
end $$;

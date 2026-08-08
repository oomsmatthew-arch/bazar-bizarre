-- Gedeelde tabellen voor de Entertainment-app — ALLES laten syncen tussen toestellen
-- =============================================================================
-- Eenmalig uitvoeren: open je project op supabase.com → linksonder "SQL Editor" →
-- "New query" → dit hele bestand plakken → knop RUN.
--
-- Zolang een tabel hier niet bestaat, werkt die functie gewoon, maar dan ENKEL op
-- het toestel zelf (niet gedeeld met de andere tablets/gsm's). Na het uitvoeren van
-- dit script synct elke categorie hieronder wél met alle toestellen.
--
-- De 5 PROJECT-tabellen (projecten, projecttaken, projectberichten, projectagenda,
-- projectdocs) staan in een apart bestand: docs/projecten-supabase.sql — voer dat ook
-- uit als je Projecten wil delen.
--
-- Veilig om opnieuw te draaien: alles gebruikt "if not exists" en vervangt de policy.
-- Bestaande gegevens blijven staan; er wordt niets gewist.

-- ---------------------------------------------------------------------------
-- 1) VOORRAAD
-- ---------------------------------------------------------------------------
-- Prijzen/artikelen (de eigenlijke voorraad)
create table if not exists public.prijzen (
  id         text primary key,
  cat        text default 'klein',          -- klein / groot
  naam       text default '',
  stock      integer default 0,
  in_gebruik boolean default false,
  foto       text default ''
);

-- Leveringen (boekjes bijgeleverd, met optionele notitie/foto)
create table if not exists public.leveringen (
  id      text primary key,
  ts      bigint default 0,
  datum   text default '',                  -- JJJJ-MM-DD
  boekjes integer default 0,
  tekst   text default '',
  foto    text default ''
);

-- Boekjesvoorraad: één enkele rij (id = 1)
create table if not exists public.boekjes (
  id    integer primary key,
  stock integer default 0
);

-- Ingezonden formulieren (afgesloten spellen)
create table if not exists public.formulieren (
  id        text primary key,
  ts        bigint default 0,
  namen     text default '',
  kleine    jsonb default '[]'::jsonb,       -- [{id,naam,n}]
  groot     jsonb default '[]'::jsonb,
  boekjes   jsonb default '{}'::jsonb,       -- {gereserveerd,extra,gratis}
  finale    text default '',                 -- welke finalereeks
  finalevraag text default '',               -- welke vraag(en) er gesteld zijn + het antwoord
  opmerking text default ''
);
-- Voor installaties van vóór deze kolom (zie ook docs/finalevraag-kolom.sql):
alter table public.formulieren add column if not exists finalevraag text default '';

-- ---------------------------------------------------------------------------
-- 2) BESTELLINGEN
-- ---------------------------------------------------------------------------
create table if not exists public.bestellingen (
  id          text primary key,
  ts          bigint default 0,
  besteldatum text default '',              -- JJJJ-MM-DD
  categorie   text default '',
  info        text default '',
  status      text default 'Besteld',
  aantal      text default '',
  kost_ent    numeric default 0,
  kost_bay    numeric default 0,
  kost_hsb    numeric default 0,
  leverancier text default '',
  leverdatum  text default '',
  door        text default '',
  opmerking   text default ''
);

-- ---------------------------------------------------------------------------
-- 3) CONTACTEN
-- ---------------------------------------------------------------------------
create table if not exists public.contacten (
  id   text primary key,
  naam text default '',
  rol  text default '',
  tel  text default '',
  mail text default '',
  ts   bigint default 0
);

-- ---------------------------------------------------------------------------
-- 4) CHECKLISTS
-- ---------------------------------------------------------------------------
create table if not exists public.checklisten (
  id    text primary key,
  naam  text default '',
  items jsonb default '[]'::jsonb,           -- [{text,done}]
  pos   double precision default 0,
  ts    bigint default 0
);

-- ---------------------------------------------------------------------------
-- 5) LOGBOEK
-- ---------------------------------------------------------------------------
create table if not exists public.logboek (
  id     text primary key,
  ts     bigint default 0,
  datum  text default '',                    -- JJJJ-MM-DD
  auteur text default '',
  tekst  text default '',
  klaar  boolean default false
);

-- ---------------------------------------------------------------------------
-- 6) GEBRUIKERS (inlog-namenlijst, gedeeld)
-- ---------------------------------------------------------------------------
create table if not exists public.gebruikers (
  id   text primary key,
  naam text default '',
  pin  text default '',                      -- gehashte pincode (geen leesbare code)
  rol  text default '',                      -- komma-lijst met etiketten (bv. "vast,admin")
  foto text default '',
  ts   bigint default 0
);

-- ---------------------------------------------------------------------------
-- 7) ACTIVITEIT (wie heeft wat aangepast)
-- ---------------------------------------------------------------------------
create table if not exists public.activiteit (
  id    text primary key,
  ts    bigint default 0,
  wie   text default '',
  actie text default ''
);
create index if not exists activiteit_ts_idx on public.activiteit (ts desc);

-- ---------------------------------------------------------------------------
-- 8) ONLINE MANUALS (mappenstructuur), INSTELLINGEN en SPEL-ARCHIEF
--    Deze drie bewaren hun gegevens als één blok (jsonb) in één rij.
-- ---------------------------------------------------------------------------
-- Manuals: één rij (id = 1), 'data' bevat de volledige mappenboom
create table if not exists public.manualsdoc (
  id   integer primary key,
  data jsonb
);

-- Instellingen/mededeling/keuzelijsten: één rij (id = 1)
create table if not exists public.appconfig (
  id   integer primary key,
  data jsonb
);

-- Spel-archief + gedeelde recente sessies/ratings: rij 1 = archief, rij 2 = sessies
create table if not exists public.spelarchief (
  id   integer primary key,
  data jsonb
);

-- ===========================================================================
-- TOEGANG: dezelfde open opzet als de bestaande tabellen van de app
-- (de app gebruikt de publieke 'anon'-sleutel; de beveiliging zit in de pincode-login).
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'prijzen','leveringen','boekjes','formulieren','bestellingen','contacten',
    'checklisten','logboek','gebruikers','activiteit','manualsdoc','appconfig','spelarchief'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "app volledige toegang" on public.%I', t);
    execute format('create policy "app volledige toegang" on public.%I for all using (true) with check (true)', t);
    -- Live meekijken (realtime): zonder dit zie je wijzigingen van een collega pas na verversen.
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null;
    end;
  end loop;
end $$;

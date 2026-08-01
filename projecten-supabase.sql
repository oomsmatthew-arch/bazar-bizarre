-- Projecten — tabellen aanmaken in Supabase
-- Eenmalig uitvoeren: open je project op supabase.com → linksonder "SQL Editor" →
-- "New query" → dit hele bestand plakken → knop RUN.
-- Zolang je dit niet doet werkt Projecten gewoon, maar dan enkel op het toestel zelf
-- (niet gedeeld met de andere tablets/gsm's).

-- 1) Het project zelf, met zijn kolommen (de lijsten op het bord)
create table if not exists public.projecten (
  id                text primary key,
  naam              text default '',
  doel              text default '',
  status            text default 'Lopend',   -- Idee / Lopend / On hold / Afgerond
  kleur             text default '',
  start             text default '',         -- JJJJ-MM-DD
  deadline          text default '',         -- JJJJ-MM-DD
  verantwoordelijke text default '',
  kolommen          jsonb default '[]'::jsonb,
  pos               double precision default 0,
  archief           boolean default false,
  ts                bigint default 0
);

-- 2) De kaarten op het bord
create table if not exists public.projecttaken (
  id           text primary key,
  project_id   text default '',
  kolom        text default '',
  titel        text default '',
  omschrijving text default '',
  wie          jsonb default '[]'::jsonb,    -- namen van wie eraan werkt
  deadline     text default '',              -- JJJJ-MM-DD
  labels       jsonb default '[]'::jsonb,
  subtaken     jsonb default '[]'::jsonb,    -- [{text,done}]
  pos          double precision default 0,
  klaar        boolean default false,
  klaar_door   text default '',
  klaar_ts     bigint default 0,
  door         text default '',              -- wie de taak aanmaakte
  ts           bigint default 0
);
create index if not exists projecttaken_project_idx on public.projecttaken (project_id);

-- 3) De bespreking (chat + later verslagen)
create table if not exists public.projectberichten (
  id         text primary key,
  project_id text default '',
  soort      text default 'bericht',         -- bericht / verslag
  ts         bigint default 0,
  auteur     text default '',
  tekst      text default '',
  data       jsonb default '{}'::jsonb
);
create index if not exists projectberichten_project_idx on public.projectberichten (project_id);

-- Toegang: dezelfde open opzet als de bestaande tabellen van de app
-- (de app gebruikt de publieke 'anon'-sleutel; de beveiliging zit in de pincode-login).
alter table public.projecten        enable row level security;
alter table public.projecttaken     enable row level security;
alter table public.projectberichten enable row level security;

drop policy if exists "app volledige toegang" on public.projecten;
drop policy if exists "app volledige toegang" on public.projecttaken;
drop policy if exists "app volledige toegang" on public.projectberichten;

create policy "app volledige toegang" on public.projecten        for all using (true) with check (true);
create policy "app volledige toegang" on public.projecttaken     for all using (true) with check (true);
create policy "app volledige toegang" on public.projectberichten for all using (true) with check (true);

-- Live meekijken (realtime): zonder dit zie je wijzigingen van een collega pas na verversen.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.projecten';        exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.projecttaken';     exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.projectberichten'; exception when others then null; end;
end $$;

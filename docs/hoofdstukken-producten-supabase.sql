-- Producten per hoofdstuk (Quiz, O&F, Algemeen) op de Inventaris-pagina — eenmalig uitvoeren
-- =============================================================================
-- Open je project op supabase.com → linksonder "SQL Editor" → "New query" →
-- dit hele bestand plakken → knop RUN.
--
-- Zonder dit werken Quiz/O&F/Algemeen gewoon, maar dan blijft wat je toevoegt op
-- dit ene toestel staan (het gaat wél alsnog vertrekken zodra de tabellen er zijn —
-- de app onthoudt wat er nog moet). Ná dit script synct alles tussen alle toestellen,
-- net als bij Prizenight.
--
-- Dit raakt de bestaande tabellen 'prijzen' en 'leveringen' (Prizenight) niet aan.

create table if not exists public.producten (
  id        text primary key,
  hoofdstuk text default 'algemeen',    -- quiz / of / algemeen
  naam      text default '',
  stock     integer default 0
);

create table if not exists public.productleveringen (
  id           text primary key,
  ts           bigint default 0,
  hoofdstuk    text default 'algemeen',
  datum        text default '',        -- JJJJ-MM-DD
  product_id   text default '',
  product_naam text default '',
  aantal       integer default 0,
  tekst        text default '',
  foto         text default ''
);

-- Dezelfde open opzet als de andere tabellen van de app.
alter table public.producten enable row level security;
drop policy if exists "app volledige toegang" on public.producten;
create policy "app volledige toegang" on public.producten for all using (true) with check (true);

alter table public.productleveringen enable row level security;
drop policy if exists "app volledige toegang" on public.productleveringen;
create policy "app volledige toegang" on public.productleveringen for all using (true) with check (true);

-- Live meekijken: zonder dit zie je op je gsm pas na verversen wat je op de tablet invulde.
do $$
begin
  execute 'alter publication supabase_realtime add table public.producten';
exception when others then null;
end $$;

do $$
begin
  execute 'alter publication supabase_realtime add table public.productleveringen';
exception when others then null;
end $$;

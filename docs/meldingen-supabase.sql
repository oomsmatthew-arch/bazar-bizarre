-- ============================================================================
-- MELDINGEN — een mailtje als er iets opvalt in het activiteitenlogboek
-- ============================================================================
-- Uitvoeren in Supabase: SQL Editor → New query → dit hele bestand plakken → Run.
-- Lees eerst docs/MELDINGEN.md — daar staat hoe je aan de Resend-sleutel komt.
--
-- Wat het doet: elke ochtend om 06:00 UTC (07:00 in de winter, 08:00 in de zomer)
-- kijkt de database zélf naar de activiteit sinds de vorige controle. Valt er iets
-- op, dan krijg je één mail met een overzichtje. Valt er niets op: geen mail —
-- behalve op maandag, dan komt er altijd een weekoverzicht, zodat je weet dat
-- het nog draait.
--
-- Wat telt als 'opvallend' (aan te passen in meldingen.redenen, verderop):
--   🗑 iets verwijderd of gewist
--   🔑 beheer: wachtwoord gewijzigd, pincode gereset, rol of toegangen aangepast,
--      gebruiker toegevoegd
--   ♻️ ingrijpend: inventaris of bestellijst teruggezet, wachtrij gewist,
--      boekjesvoorraad handmatig ingesteld
--   🌙 activiteit 's nachts (standaard tussen 23:00 en 06:00 Belgische tijd)
--   ❓ een naam die niet in de namenlijst staat (of niemand ingelogd: '?')
--   📈 opvallend veel wijzigingen (of verwijderingen) van één persoon
--   ⚠️ het logboek zelf is gewist of ingekort
--
-- Er verandert niets aan de app. Alles draait in Supabase zelf (pg_cron + pg_net),
-- dus ook als geen enkele tablet open staat. Veilig om opnieuw te draaien: de twee
-- waarden hieronder worden overschreven, al het andere blijft staan. Elke keer je
-- dit draait, krijg je op het eind meteen een testmail.
-- ============================================================================

-- ▼▼▼ VUL DEZE TWEE WAARDEN IN ▼▼▼
drop table if exists invul;
create temp table invul as select
  'jouw@adres.be'   as naar,     -- waar de mail naartoe moet (hetzelfde adres als je Resend-account)
  're_VUL_HIER_IN'  as sleutel;  -- je Resend API-sleutel (begint met re_), zie docs/MELDINGEN.md
-- ▲▲▲ MEER HOEF JE NIET AAN TE PASSEN ▲▲▲

-- Eerst controleren of de twee waarden ingevuld zijn — anders stopt het hier.
do $$
begin
  if (select sleutel from invul) = 're_VUL_HIER_IN' or (select sleutel from invul) !~ '^re_\S+$' then
    raise exception 'Vul bovenaan je Resend-sleutel in (begint met re_) en druk opnieuw op Run.';
  end if;
  if (select naar from invul) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Vul bovenaan een geldig mailadres in en druk opnieuw op Run.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Twee onderdelen van Supabase aanzetten: een klok (pg_cron) en de mogelijkheid
--    om vanuit de database een internetverzoek te doen (pg_net).
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- 2) Een eigen hoekje 'meldingen', buiten bereik van de app en van de API.
--    De sleutel staat hier dus niet in de broncode en is niet via de app op te vragen.
-- ---------------------------------------------------------------------------
create schema if not exists meldingen;
revoke all on schema meldingen from public, anon, authenticated;

create table if not exists meldingen.instellingen (
  id               int primary key default 1 check (id = 1),  -- altijd precies één rij
  naar             text not null,                              -- jouw mailadres
  van              text not null default 'Entertainment-app <onboarding@resend.dev>',
  resend_sleutel   text not null,
  nacht_van        int  not null default 23,   -- vanaf dit uur is het 'nacht' (Belgische tijd)
  nacht_tot        int  not null default 6,    -- tot dit uur
  veel_per_persoon int  not null default 60,   -- méér wijzigingen dan dit van één persoon → opvallend
  veel_verwijderd  int  not null default 5,    -- zoveel verwijderingen van één persoon → opvallend
  weekmail         boolean not null default true, -- op maandag altijd een overzicht, ook zonder nieuws
  -- Geheugen van de vorige controle; vult de functie zelf in.
  vorige_run       timestamptz,
  vorig_aantal     bigint not null default 0,
  vorig_oudste_id  text
);
alter table meldingen.instellingen enable row level security;  -- geen regels → enkel de database zelf

insert into meldingen.instellingen (id, naar, resend_sleutel)
select 1, naar, sleutel from invul
on conflict (id) do update set naar = excluded.naar, resend_sleutel = excluded.resend_sleutel;

-- ---------------------------------------------------------------------------
-- 3) De functies
-- ---------------------------------------------------------------------------
-- Namen en acties komen uit de app; in een mail mogen ze geen HTML worden.
create or replace function meldingen.h(t text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- Waarom is een regel uit het logboek opvallend? Geeft een korte reden terug,
-- of niets als er niets aan de hand is. Hier pas je de regels aan.
create or replace function meldingen.redenen(actie text, lokaal timestamp, nacht_van int, nacht_tot int, bekend boolean)
returns text language plpgsql immutable set search_path = '' as $$
declare
  a text   := lower(coalesce(actie, ''));
  u int    := extract(hour from lokaal)::int;
  r text[] := '{}';
begin
  if a like '%verwijderd%' or a like '%gewist%' then
    r := array_append(r, '🗑 verwijderd');
  end if;
  if a like '%wachtwoord%' or a like '%pincode gereset%' or a like '%toegangen%'
     or a like '% — rol%' or a like 'gebruiker toegevoegd%' then
    r := array_append(r, '🔑 beheer');
  end if;
  if a like '%hersteld naar de startlijst%' or a like 'systeem:%' or a like 'boekjesvoorraad ingesteld%' then
    r := array_append(r, '♻️ ingrijpend');
  end if;
  -- 'Nacht' loopt meestal over middernacht (23 → 6); dan is het nacht vóór 6 of vanaf 23.
  -- Geen 'case' in deze voorwaarde: PL/pgSQL stopt de if-voorwaarde bij het eerste 'then'.
  if (nacht_van > nacht_tot and (u >= nacht_van or u < nacht_tot))
     or (nacht_van <= nacht_tot and u >= nacht_van and u < nacht_tot) then
    r := array_append(r, '🌙 ’s nachts');
  end if;
  if not bekend then
    r := array_append(r, '❓ onbekende naam');
  end if;
  return nullif(array_to_string(r, ' · '), '');
end $$;

-- De eigenlijke controle + mail. 'altijd' = ook mailen als er niets opvalt (testen).
create or replace function meldingen.verstuur(altijd boolean default false)
returns text language plpgsql set search_path = '' as $$
declare
  i           meldingen.instellingen%rowtype;
  nu          timestamptz := now();
  lokaal_nu   timestamp   := now() at time zone 'Europe/Brussels';
  maandag     boolean     := extract(isodow from (now() at time zone 'Europe/Brussels')) = 1;
  sinds       timestamptz;
  sinds_ms    bigint;
  week_ms     bigint;
  periode     text;
  namen       text[] := '{}';
  totaal      bigint := 0;
  oudste_id   text;
  gewist      boolean := false;
  n_alles     int := 0;
  n_opvallend int := 0;
  n_veel      int := 0;
  n_pers      int := 0;
  n_week      int := 0;
  html_opv    text := '';
  html_pers   text := '';
  week_lijn   text := '';
  td          text := 'padding:6px 10px;border-bottom:1px solid #e3e8e4;vertical-align:top';
  th          text := 'padding:6px 10px;border-bottom:2px solid #2f6450;text-align:left;font-size:12px;color:#2f6450';
  onderwerp   text;
  html        text;
  req         bigint;
begin
  if to_regclass('public.activiteit') is null then
    return 'De tabel activiteit bestaat niet — voer eerst docs/gedeelde-tabellen-supabase.sql uit.';
  end if;
  select * into i from meldingen.instellingen where id = 1;
  if not found then
    return 'Geen instellingen gevonden — draai docs/meldingen-supabase.sql (opnieuw).';
  end if;

  -- Periode: sinds de vorige controle, minstens 24 uur, hoogstens 30 dagen. Zo mis je
  -- niets als de controle een dag overslaat (project gepauzeerd, storing…).
  sinds    := greatest(least(coalesce(i.vorige_run, nu), nu - interval '24 hours'), nu - interval '30 days');
  sinds_ms := (extract(epoch from sinds) * 1000)::bigint;
  week_ms  := (extract(epoch from (nu - interval '7 days')) * 1000)::bigint;
  periode  := to_char(sinds at time zone 'Europe/Brussels', 'DD/MM HH24:MI') || ' – ' || to_char(lokaal_nu, 'DD/MM HH24:MI');

  if to_regclass('public.gebruikers') is not null then
    select coalesce(array_agg(naam), '{}') into namen from public.gebruikers;
  end if;

  -- Is het logboek gewist of ingekort? Dan zijn er minder regels dan vorige keer,
  -- of is de oudste regel van toen verdwenen.
  select count(*) into totaal from public.activiteit;
  select id into oudste_id from public.activiteit order by ts asc, id asc limit 1;
  gewist := i.vorige_run is not null and (
              totaal < i.vorig_aantal
              or (i.vorig_oudste_id is not null
                  and not exists (select 1 from public.activiteit where id = i.vorig_oudste_id)));

  -- Alle wijzigingen in de periode, met per regel de reden waarom ze opvalt (of niet).
  select count(*), count(q.reden),
         coalesce(string_agg(
           format('<tr><td style="%1$s;white-space:nowrap">%2$s</td><td style="%1$s"><b>%3$s</b></td><td style="%1$s">%4$s</td><td style="%1$s;white-space:nowrap">%5$s</td></tr>',
                  td, to_char(q.lokaal, 'DD/MM HH24:MI'), meldingen.h(q.wie), meldingen.h(q.actie), q.reden),
           '' order by q.ts desc) filter (where q.reden is not null), '')
  into n_alles, n_opvallend, html_opv
  from (
    select p.*, meldingen.redenen(p.actie, p.lokaal, i.nacht_van, i.nacht_tot, p.wie = any(namen)) as reden
    from (
      select a.ts, coalesce(nullif(a.wie, ''), '?') as wie, a.actie,
             (to_timestamp(a.ts / 1000.0) at time zone 'Europe/Brussels') as lokaal
      from public.activiteit a
      where a.ts >= sinds_ms
    ) p
  ) q;

  -- Per persoon: hoeveel wijzigingen, waarvan hoeveel verwijderingen.
  select coalesce(string_agg(
           format('<tr><td style="%1$s"><b>%2$s</b></td><td style="%1$s" align="right">%3$s</td><td style="%1$s" align="right">%4$s</td><td style="%1$s">%5$s</td></tr>',
                  td, meldingen.h(s.wie), s.n, s.n_del,
                  concat_ws(' · ',
                    case when s.n > i.veel_per_persoon then '📈 veel wijzigingen' end,
                    case when s.n_del >= i.veel_verwijderd then '🗑 veel verwijderd' end)),
           '' order by s.n desc), ''),
         count(*) filter (where s.n > i.veel_per_persoon or s.n_del >= i.veel_verwijderd),
         count(*)
  into html_pers, n_veel, n_pers
  from (
    select coalesce(nullif(a.wie, ''), '?') as wie,
           count(*)::int as n,
           (count(*) filter (where lower(a.actie) like '%verwijderd%' or lower(a.actie) like '%gewist%'))::int as n_del
    from public.activiteit a
    where a.ts >= sinds_ms
    group by 1
  ) s;

  -- Op maandag: de hele week in één regel.
  if i.weekmail and maandag then
    select coalesce(sum(w.n), 0)::int,
           coalesce(string_agg(meldingen.h(w.wie) || ' ' || w.n, ' · ' order by w.n desc), '')
    into n_week, week_lijn
    from (
      select coalesce(nullif(a.wie, ''), '?') as wie, count(*)::int as n
      from public.activiteit a where a.ts >= week_ms group by 1
    ) w;
  end if;

  -- Geheugen bijwerken voor de volgende controle (ook als er geen mail volgt).
  update meldingen.instellingen
     set vorige_run = nu, vorig_aantal = totaal, vorig_oudste_id = oudste_id
   where id = 1;

  if not altijd and not gewist and n_opvallend = 0 and n_veel = 0 and not (i.weekmail and maandag) then
    return format('Niets opvallends in %s wijziging(en) sinds %s — geen mail verstuurd.',
                  n_alles, to_char(sinds at time zone 'Europe/Brussels', 'DD/MM HH24:MI'));
  end if;

  onderwerp := case
    when gewist then '⚠️ Entertainment-app: het activiteitenlogboek is gewist of ingekort'
    when n_opvallend + n_veel = 1 then '👀 Entertainment-app: 1 opvallend punt'
    when n_opvallend + n_veel > 1 then format('👀 Entertainment-app: %s opvallende punten', n_opvallend + n_veel)
    when i.weekmail and maandag then '📋 Entertainment-app: weekoverzicht — niets opvallends'
    else '🧪 Entertainment-app: testmail — niets opvallends'
  end;

  html := '<div style="font-family:-apple-system,Segoe UI,system-ui,sans-serif;max-width:720px;color:#1f2a25;font-size:14px;line-height:1.4">'
       || '<h2 style="margin:0 0 4px;color:#2f6450">Entertainment-app — activiteit</h2>'
       || format('<p style="margin:0 0 16px;color:#5a6b62">Periode %s (Belgische tijd) · %s wijziging(en) · %s perso(o)n(en).</p>',
                 periode, n_alles, n_pers);

  if gewist then
    html := html || format('<div style="background:#fdecea;border:1px solid #e8a09a;border-radius:8px;padding:10px 12px;margin:0 0 16px">'
                        || '<b>⚠️ Het activiteitenlogboek is gewist of ingekort.</b> Bij de vorige controle stonden er %s regels in, nu %s. '
                        || 'Wissen kan enkel met het beheer-wachtwoord in de app, of rechtstreeks in Supabase.</div>',
                        i.vorig_aantal, totaal);
  end if;

  html := html || '<h3 style="margin:0 0 6px;color:#2f6450">Opvallend</h3>';
  if n_opvallend > 0 then
    html := html || format('<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%%;margin:0 0 18px">'
                        || '<tr><th style="%1$s">Wanneer</th><th style="%1$s">Wie</th><th style="%1$s">Wat</th><th style="%1$s">Waarom</th></tr>%2$s</table>',
                        th, html_opv);
  else
    html := html || '<p style="margin:0 0 18px">Niets opvallends in deze periode. 👍</p>';
  end if;

  html := html || '<h3 style="margin:0 0 6px;color:#2f6450">Wie deed wat</h3>';
  if n_pers > 0 then
    html := html || format('<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%%;margin:0 0 18px">'
                        || '<tr><th style="%1$s">Naam</th><th style="%1$s;text-align:right">Wijzigingen</th><th style="%1$s;text-align:right">Waarvan verwijderd</th><th style="%1$s"></th></tr>%2$s</table>',
                        th, html_pers);
  else
    html := html || '<p style="margin:0 0 18px">Geen enkele wijziging in deze periode.</p>';
  end if;

  if i.weekmail and maandag then
    html := html || format('<h3 style="margin:0 0 6px;color:#2f6450">Deze week</h3><p style="margin:0 0 18px">%s wijziging(en) in de voorbije 7 dagen%s</p>',
                           n_week, case when week_lijn = '' then '.' else ': ' || week_lijn || '.' end);
  end if;

  html := html || '<p style="margin:18px 0 0;font-size:12px;color:#7b8a82;border-top:1px solid #e3e8e4;padding-top:10px">'
       || 'Automatisch verstuurd vanuit Supabase, elke ochtend als er iets opvalt — op maandag altijd. '
       || 'Het volledige logboek staat in de app onder <b>Activiteit</b>. '
       || 'Aanpassen of uitzetten: zie docs/MELDINGEN.md.</p></div>';

  select net.http_post(
           url     => 'https://api.resend.com/emails',
           headers => jsonb_build_object('Content-Type', 'application/json',
                                         'Authorization', 'Bearer ' || i.resend_sleutel),
           body    => jsonb_build_object('from', i.van, 'to', jsonb_build_array(i.naar),
                                         'subject', onderwerp, 'html', html))
  into req;

  return format('Mail "%s" onderweg naar %s (verzoek %s). Kijk na met: select * from meldingen.laatste_antwoord();',
                onderwerp, i.naar, req);
end $$;

-- Wat antwoordde Resend op de laatste verzoeken? (status 200 = verstuurd)
create or replace function meldingen.laatste_antwoord()
returns table (verzoek bigint, status int, antwoord text, fout text, wanneer timestamptz)
language sql set search_path = '' as $$
  select id, status_code, left(content, 400), error_msg, created
  from net._http_response
  order by id desc
  limit 3;
$$;

-- Eén overzicht: naar wie, wanneer gepland, wanneer voor het laatst gedraaid.
create or replace function meldingen.status()
returns table (wat text, waarde text)
language sql set search_path = '' as $$
  select 'mail naar', naar from meldingen.instellingen
  union all
  select 'afzender', van from meldingen.instellingen
  union all
  select 'geplande taak',
         coalesce((select schedule || ' (UTC) — ' || case when active then 'actief' else 'UITGESCHAKELD' end
                   from cron.job where jobname = 'meldingen-dagelijks'), 'NIET gepland')
  union all
  select 'vorige controle',
         coalesce(to_char(vorige_run at time zone 'Europe/Brussels', 'DD/MM/YYYY HH24:MI'), 'nog geen')
  from meldingen.instellingen
  union all
  select 'laatste uitvoering',
         coalesce((select to_char(d.start_time at time zone 'Europe/Brussels', 'DD/MM/YYYY HH24:MI')
                          || ' — ' || d.status || coalesce(': ' || d.return_message, '')
                   from cron.job_run_details d
                   join cron.job j on j.jobid = d.jobid
                   where j.jobname = 'meldingen-dagelijks'
                   order by d.start_time desc limit 1), 'nog niet gedraaid');
$$;

-- ---------------------------------------------------------------------------
-- 4) Inplannen: elke dag om 06:00 UTC = 07:00 (winter) / 08:00 (zomer) bij ons.
--    Ander uur? Pas '0 6 * * *' aan (minuut uur * * *) en draai dit blok opnieuw.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'meldingen-dagelijks') then
    perform cron.unschedule('meldingen-dagelijks');
  end if;
end $$;
select cron.schedule('meldingen-dagelijks', '0 6 * * *', 'select meldingen.verstuur()');

-- ---------------------------------------------------------------------------
-- 5) Meteen een testmail, zodat je weet of alles klopt. De mail vertrekt in de
--    achtergrond; na een paar seconden zie je het antwoord van Resend met:
--      select * from meldingen.laatste_antwoord();
-- ---------------------------------------------------------------------------
drop table if exists invul;
select meldingen.verstuur(true) as resultaat;

-- ════════════════════════════════════════════════════════════════════
-- Entraînement repensé · lot 2 · « EN CE MOMENT »
--
-- Ce que le planning sait de ta vie, pour une période : moins de temps,
-- une gêne ou une douleur, moins d'énergie, pas son matériel. L'absence
-- garde sa table (`absences`, R9a) : elle met le programme en pause et
-- marche déjà.
--
-- ⚠️ UNE SITUATION NE MODIFIE JAMAIS LE PROGRAMME. Comme une adaptation,
-- c'est une couche datée lue au moment de préparer une séance ; à la date
-- de fin, les séances reprennent leur forme sans une écriture.
--
-- ⚠️ PLUSIEURS SITUATIONS PEUVENT SE CROISER (des examens pendant une
-- gêne au genou), mais jamais deux du même genre sur un même jour : on
-- modifie celle qui existe au lieu d'en empiler une seconde.
--
-- ⚠️ LES RÉGLAGES ONT UN VOCABULAIRE FERMÉ PAR GENRE. Une clé inconnue
-- est refusée : un réglage écrit, affiché et sans effet serait le pire
-- mode d'échec.
--
-- Rejouable.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists btree_gist;

create table if not exists public.situations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  genre       text not null,
  debut       date not null,
  -- Obligatoire : « Je te dirai » se règle à quatre semaines, et l'écran
  -- propose d'y refaire le point.
  fin         date not null,
  reglages    jsonb not null default '{}'::jsonb,
  -- Écrit par la personne, jamais lu comme une règle.
  motif       text,
  statut      text not null default 'active',
  origine     text not null default 'utilisateur',
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  fermee_le   timestamptz,

  constraint situations_genre check (genre in ('moins_de_temps', 'gene', 'energie', 'materiel')),
  constraint situations_periode check (fin >= debut and fin - debut <= 120),
  constraint situations_statut check (statut in ('active', 'terminee')),
  constraint situations_origine check (origine in ('utilisateur', 'guide')),
  constraint situations_fermeture check ((statut = 'active') = (fermee_le is null)),
  constraint situations_motif check (motif is null or char_length(motif) <= 120),
  constraint situations_reglages check (jsonb_typeof(reglages) = 'object' and (
    -- Moins de temps : la durée visée de chaque séance, en minutes.
    (genre = 'moins_de_temps'
      and reglages ?& array['minutes']
      and (reglages - array['minutes']) = '{}'::jsonb
      and jsonb_typeof(reglages->'minutes') = 'number'
      and (reglages->>'minutes')::int between 10 and 90)
    -- Une gêne : les zones touchées (39 au plus), et ce que deviennent
    -- les mouvements qui les sollicitent.
    or (genre = 'gene'
      and reglages ?& array['zones', 'mode']
      and (reglages - array['zones', 'mode', 'choix', 'pauses']) = '{}'::jsonb
      and jsonb_typeof(reglages->'zones') = 'array'
      and jsonb_array_length(reglages->'zones') between 1 and 39
      and reglages->>'mode' in ('eviter', 'alleger', 'un')
      and (not reglages ? 'choix' or jsonb_typeof(reglages->'choix') = 'object')
      and (not reglages ? 'pauses' or jsonb_typeof(reglages->'pauses') = 'object'))
    -- Moins d'énergie : des séances plus légères, ou une pause.
    or (genre = 'energie'
      and reglages ?& array['mode']
      and (reglages - array['mode']) = '{}'::jsonb
      and reglages->>'mode' in ('leger', 'pause'))
    -- Pas son matériel : le lieu pour la période.
    or (genre = 'materiel'
      and reglages ?& array['lieu']
      and (reglages - array['lieu']) = '{}'::jsonb
      and reglages->>'lieu' in ('poids', 'halteres'))
  ))
);

-- Jamais deux situations actives du même genre sur un même jour.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'situations_sans_chevauchement') then
    alter table public.situations
      add constraint situations_sans_chevauchement
      exclude using gist (user_id with =, genre with =, daterange(debut, fin, '[]') with &&)
      where (statut = 'active');
  end if;
end $$;

create index if not exists idx_situations_lecture on public.situations (user_id, statut, fin);

-- maj_le se tient tout seul.
create or replace function public.situations_maj_le() returns trigger
language plpgsql set search_path = public as $$
begin
  new.maj_le := now();
  return new;
end $$;

drop trigger if exists situations_maj_le on public.situations;
create trigger situations_maj_le before update on public.situations
  for each row execute function public.situations_maj_le();

alter table public.situations enable row level security;

drop policy if exists situations_proprietaire on public.situations;
create policy situations_proprietaire on public.situations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.situations to authenticated;
revoke all on public.situations from anon;

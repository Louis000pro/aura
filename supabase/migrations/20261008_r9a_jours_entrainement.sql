-- ════════════════════════════════════════════════════════════════════
-- R9a · MES JOURS D'ENTRAÎNEMENT (décisions 17 à 29, maquette 08)
--
-- Trois tables, toutes additives, toutes en RLS propriétaire :
--   · jours_entrainement : la règle de chaque semaine (1 = lundi … 7) ;
--   · exceptions_jour    : un jour daté retiré (« pas de séance ce
--                          jour-là ») ou ajouté (« cette semaine ») ;
--   · absences           : une plage de dates pendant laquelle rien
--                          n'est proposé et aucun rappel ne part.
--
-- ⚠️ UN JOUR D'ENTRAÎNEMENT N'EST PAS UNE SÉANCE (décision 20) : aucune
-- intention vide n'est écrite. La séance d'un jour à venir se CALCULE à
-- la lecture (`src/lib/projection.ts`), elle ne se stocke pas.
--
-- ⚠️ AUCUNE DONNÉE EXISTANTE N'EST TOUCHÉE, ET AUCUN JOUR N'EST INVENTÉ.
-- Un compte sans ligne ici garde exactement le comportement d'avant.
--
-- Rejouable. À appliquer AVANT le code qui lit ces tables (le code sait
-- vivre sans : une table absente vaut « aucun jour choisi »).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.jours_entrainement (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  jours     smallint[] not null,
  maj_le    timestamptz not null default now(),
  constraint jours_entrainement_valeurs check (
    cardinality(jours) between 1 and 7
    and jours <@ array[1,2,3,4,5,6,7]::smallint[]
  )
);

create table if not exists public.exceptions_jour (
  user_id   uuid not null references auth.users (id) on delete cascade,
  date      date not null,
  genre     text not null,
  cree_le   timestamptz not null default now(),
  primary key (user_id, date),
  constraint exceptions_jour_genre check (genre in ('pas_de_seance', 'seance_en_plus'))
);

create table if not exists public.absences (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  debut     date not null,
  fin       date not null,
  cree_le   timestamptz not null default now(),
  constraint absences_periode check (fin >= debut and fin - debut <= 120)
);

-- Deux absences ne se chevauchent pas : une demande qui chevauche
-- modifie l'absence en cours (même règle que les adaptations, V8).
-- btree_gist est installée depuis V8.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'absences_sans_chevauchement') then
    alter table public.absences
      add constraint absences_sans_chevauchement
      exclude using gist (user_id with =, daterange(debut, fin, '[]') with &&);
  end if;
end $$;

create index if not exists idx_absences_user_fin on public.absences (user_id, fin);

alter table public.jours_entrainement enable row level security;
alter table public.exceptions_jour    enable row level security;
alter table public.absences           enable row level security;

drop policy if exists jours_entrainement_proprietaire on public.jours_entrainement;
create policy jours_entrainement_proprietaire on public.jours_entrainement
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists exceptions_jour_proprietaire on public.exceptions_jour;
create policy exceptions_jour_proprietaire on public.exceptions_jour
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists absences_proprietaire on public.absences;
create policy absences_proprietaire on public.absences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Retour arrière ───────────────────────────────────────────────────
-- Aucune autre table ne dépend de celles-ci :
--   drop table if exists public.absences, public.exceptions_jour, public.jours_entrainement;

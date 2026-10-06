-- TEST R9a · à coller en entier dans le SQL Editor de Supabase, puis « Run ».
-- Il rejoue la migration R9a, applique la correction du tour 38, joue les scénarios,
-- puis ANNULE TOUT : la base ne garde rien.
-- Le résultat s'affiche comme une erreur rouge qui commence par R9A_SCENARIOS : c'est normal, envoie-moi une capture.
begin;

/* ── Rejeu de la migration déjà appliquée (doit passer sans erreur) ── */
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

/* ── Correction du tour 38 (zéro jour, date d'effet) ── */
-- ════════════════════════════════════════════════════════════════════
-- R9a · tour 38 de Codex : « aucun choix » ≠ « zéro jour choisi », et
-- une règle a une date d'effet.
--
-- · Une ligne avec `jours = '{}'` veut dire « j'ai choisi : aucun jour
--   d'entraînement ». L'absence de ligne garde le comportement historique.
-- · `effet_le` : le premier jour où la règle s'applique. Choisir lundi un
--   jeudi n'invente pas « t'attendait lundi » pour une règle qui n'existait
--   pas encore.
--
-- À appliquer APRÈS 20261008_r9a_jours_entrainement.sql. Rejouable. La
-- table est neuve (aucune ligne au moment de l'écrire) : rien n'est converti.
-- ════════════════════════════════════════════════════════════════════

alter table public.jours_entrainement drop constraint if exists jours_entrainement_valeurs;
alter table public.jours_entrainement add constraint jours_entrainement_valeurs check (
  cardinality(jours) between 0 and 7
  and jours <@ array[1,2,3,4,5,6,7]::smallint[]
);

alter table public.jours_entrainement
  add column if not exists effet_le date not null default current_date;

-- ── Retour arrière ───────────────────────────────────────────────────
--   alter table public.jours_entrainement drop column if exists effet_le;
--   (la contrainte d'origine refuserait ensuite une ligne à zéro jour)

do $r9a$
declare
  U uuid; AUTRE uuid; n int; t text; out text := ''; eff date;
begin
  select id into U from auth.users order by created_at limit 1;
  select id into AUTRE from auth.users where id <> U order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', U, 'role', 'authenticated')::text, true);
  set local role authenticated;

  /* T1 · zéro jour = un choix, accepté et relu */
  insert into public.jours_entrainement (user_id, jours) values (U, '{}')
    on conflict (user_id) do update set jours = '{}', effet_le = current_date;
  select cardinality(jours), effet_le into n, eff from public.jours_entrainement where user_id = U;
  out := out || format('T1 zero_jour=%s effet_aujourdhui=%s ; ', n, eff = current_date);

  /* T2 · règle normale, puis valeur hors 1..7 refusée */
  update public.jours_entrainement set jours = '{1,3,5}', effet_le = current_date + 1 where user_id = U;
  select cardinality(jours) into n from public.jours_entrainement where user_id = U;
  out := out || format('T2 regle=%s ; ', n);
  begin
    update public.jours_entrainement set jours = '{1,8}' where user_id = U;
    out := out || 'T2b JOUR_8_ACCEPTE ; ';
  exception when check_violation then out := out || 'T2b refus_jour_8 ; ';
  end;

  /* T3 · exceptions : les deux genres acceptés, un autre refusé, une par date */
  insert into public.exceptions_jour (user_id, date, genre) values (U, current_date + 2, 'pas_de_seance'), (U, current_date + 3, 'seance_en_plus');
  begin
    insert into public.exceptions_jour (user_id, date, genre) values (U, current_date + 4, 'autre');
    out := out || 'T3 GENRE_INCONNU_ACCEPTE ; ';
  exception when check_violation then out := out || 'T3 refus_genre ; ';
  end;
  begin
    insert into public.exceptions_jour (user_id, date, genre) values (U, current_date + 2, 'seance_en_plus');
    out := out || 'T3b DEUX_EXCEPTIONS_MEME_JOUR ; ';
  exception when unique_violation then out := out || 'T3b refus_doublon ; ';
  end;

  /* T4 · absences : chevauchement refusé, bout à bout accepté, bornes */
  insert into public.absences (user_id, debut, fin) values (U, current_date + 10, current_date + 14);
  begin
    insert into public.absences (user_id, debut, fin) values (U, current_date + 14, current_date + 16);
    out := out || 'T4 CHEVAUCHEMENT_ACCEPTE ; ';
  exception when exclusion_violation then out := out || 'T4 refus_chevauchement ; ';
  end;
  insert into public.absences (user_id, debut, fin) values (U, current_date + 15, current_date + 16);
  out := out || 'T4b bout_a_bout_ok ; ';
  begin
    insert into public.absences (user_id, debut, fin) values (U, current_date + 30, current_date + 29);
    out := out || 'T4c FIN_AVANT_DEBUT_ACCEPTEE ; ';
  exception when check_violation then out := out || 'T4c refus_fin_avant_debut ; ';
  end;
  begin
    insert into public.absences (user_id, debut, fin) values (U, current_date + 40, current_date + 200);
    out := out || 'T4d ABSENCE_TROP_LONGUE_ACCEPTEE ; ';
  exception when check_violation then out := out || 'T4d refus_trop_longue ; ';
  end;

  /* T5 · un autre compte ne voit rien et n'écrit rien chez U */
  perform set_config('request.jwt.claims', json_build_object('sub', AUTRE, 'role', 'authenticated')::text, true);
  select (select count(*) from public.jours_entrainement where user_id = U)
       + (select count(*) from public.exceptions_jour where user_id = U)
       + (select count(*) from public.absences where user_id = U) into n;
  out := out || format('T5 visibles_par_autre=%s ', n);
  begin
    insert into public.exceptions_jour (user_id, date, genre) values (U, current_date + 5, 'pas_de_seance');
    out := out || 'ECRITURE_AUTRE_ACCEPTEE ; ';
  exception when others then out := out || 'refus=' || sqlstate || ' ; ';
  end;
  begin
    delete from public.absences where user_id = U;
    get diagnostics n = row_count;
    out := out || format('suppressions_par_autre=%s', n);
  end;

  raise exception 'R9A_SCENARIOS %', out;
end $r9a$;

rollback;

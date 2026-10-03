/* ════════════════════════════════════════════════════════════════════
   R1 · LE JOURNAL DIT LA VÉRITÉ (refonte du planning, décisions 30 à 60)

   À coller dans le SQL Editor de Supabase APRÈS toutes les migrations
   précédentes. Rejouable sans risque. Purement additif : aucune donnée
   existante n'est modifiée ni supprimée.

   Tant que ce fichier n'est pas appliqué, l'app enregistre les séances
   comme avant (repli dans `src/lib/journalSeance.ts`), sans leurs séries.

   Ce qu'il ajoute :
   1. `workout_sessions` : l'identifiant du lancement (une séance ne
      s'enregistre qu'une fois, même rejouée), l'heure de fin, et la
      version du journal (0 = ancienne séance sans séries).
   2. `series_realisees` : une ligne par série PRÉVUE, avec ce qui lui
      est réellement arrivé.
   3. `enregistrer_seance(p)` : la séance et ses séries en UNE
      transaction, idempotente sur le lancement.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. La séance ─────────────── */

alter table public.workout_sessions
  add column if not exists lancement_id    uuid,
  add column if not exists termine_le      timestamptz,
  add column if not exists journal_version smallint not null default 0;

/* Un lancement ne s'enregistre qu'une fois. Partiel : les séances
   d'avant R1 n'ont pas d'identifiant, elles ne se gênent pas. */
create unique index if not exists uniq_workout_lancement
  on public.workout_sessions (user_id, lancement_id)
  where lancement_id is not null;

/* ─────────────── 2. Les séries ───────────────

   ⚠️ TROIS IDENTITÉS, ET ELLES NE SE CONFONDENT PAS :
   · `exercice_cle` : l'exercice, pour retrouver son historique (nulle
     quand on ne la connaît pas avec certitude : exercice perso, nom non
     canonique). On n'invente pas d'équivalence.
   · `emplacement` : son rang dans CETTE séance. Une séance peut faire
     passer deux fois le même exercice : la clé seule ne suffirait pas.
   · `id` : la série elle-même.

   ⚠️ CE QUI N'EST PAS DÉCLARÉ RESTE VIDE. Avant R3, le bouton du tunnel
   dit « série terminée », pas « 10 × 60 kg » : `reps_declarees` et
   `charge` restent nulles, la prescription est gardée à côté. Une charge
   inconnue reste inconnue, elle ne devient jamais zéro. Le poids du corps
   n'est pas une unité de charge : c'est une charge nulle ET un type. */

create table if not exists public.series_realisees (
  id                 uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  emplacement        smallint not null check (emplacement >= 0),
  exercice_cle       text,
  exercice_nom       text not null,
  /* R3 : le remplacement d'un exercice en cours de séance. La série reste
     attachée à l'exercice réellement fait ; ceci dit lequel était prévu. */
  exercice_prevu_cle text,
  serie              smallint not null check (serie >= 1),
  statut             text not null check (statut in ('terminee', 'passee', 'non_atteinte')),
  mesure             text not null check (mesure in ('reps', 'duree')),
  reps_prescrites    smallint,
  duree_prescrite_s  integer,
  reps_declarees     smallint check (reps_declarees is null or reps_declarees >= 0),
  duree_s            integer  check (duree_s is null or duree_s >= 0),
  charge             numeric(6,2) check (charge is null or charge >= 0),
  charge_unite       text check (charge_unite is null or charge_unite in ('kg')),
  charge_type        text check (charge_type is null or charge_type in ('totale', 'par_haltere', 'assistance', 'poids_du_corps')),
  /* Comment la série a été déclarée terminée : un minuteur arrivé au
     bout, un minuteur abrégé et un bouton ne sont pas le même fait. */
  validation         text check (validation is null or validation in ('bouton', 'minuteur_fini', 'minuteur_abrege')),
  created_at         timestamptz not null default now(),
  unique (workout_session_id, emplacement, serie),
  /* Une série terminée dit comment ; une autre n'a rien à dire. */
  check ((statut = 'terminee') = (validation is not null)),
  /* Une charge s'écrit avec son unité, ou pas du tout. */
  check ((charge is null) = (charge_unite is null))
);

create index if not exists idx_series_historique
  on public.series_realisees (user_id, exercice_cle, created_at desc)
  where exercice_cle is not null;

alter table public.series_realisees enable row level security;

/* Lecture : ses propres séries. Aucune écriture directe : on n'écrit
   qu'à travers `enregistrer_seance`, et la suppression suit celle de la
   séance (cascade, déjà permise sur `workout_sessions`). */
drop policy if exists "Lire ses series" on public.series_realisees;
create policy "Lire ses series"
  on public.series_realisees for select
  using (auth.uid() = user_id);

/* ─────────────── 3. L'enregistrement ─────────────── */

create or replace function public.enregistrer_seance(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_lancement uuid := nullif(p->>'lancement_id', '')::uuid;
  v_id        uuid;
  v_duree     integer := greatest(coalesce((p->>'duree_s')::integer, 0), 0);
begin
  if v_user is null then
    raise exception 'non_connecte' using errcode = '28000';
  end if;
  if v_lancement is null then
    raise exception 'lancement_manquant' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p->'series', '[]'::jsonb)) > 400 then
    raise exception 'trop_de_series' using errcode = '22023';
  end if;

  /* Déjà enregistrée pour ce lancement : on rend la même, sans rien
     réécrire. C'est ce qui rend un appel rejoué inoffensif. */
  select id into v_id
    from public.workout_sessions
   where user_id = v_user and lancement_id = v_lancement;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'deja', true);
  end if;

  insert into public.workout_sessions (
    user_id, title, category, duration_minutes, calories_burned,
    elapsed_seconds, exercises, started_at, termine_le, lancement_id, journal_version
  ) values (
    v_user,
    left(coalesce(nullif(p->>'titre', ''), 'Séance'), 200),
    left(coalesce(nullif(p->>'categorie', ''), 'force'), 40),
    greatest(round(v_duree / 60.0)::integer, 1),
    greatest(coalesce((p->>'calories')::integer, 0), 0),
    v_duree,
    coalesce(p->'exercices', '[]'::jsonb),
    coalesce((p->>'debut')::timestamptz, now()),
    coalesce((p->>'fin')::timestamptz, now()),
    v_lancement,
    1
  )
  on conflict (user_id, lancement_id) where lancement_id is not null do nothing
  returning id into v_id;

  /* Deux appels simultanés : l'autre vient d'écrire, on rend le sien. */
  if v_id is null then
    select id into v_id
      from public.workout_sessions
     where user_id = v_user and lancement_id = v_lancement;
    return jsonb_build_object('id', v_id, 'deja', true);
  end if;

  insert into public.series_realisees (
    workout_session_id, user_id, emplacement, exercice_cle, exercice_nom,
    exercice_prevu_cle, serie, statut, mesure, reps_prescrites,
    duree_prescrite_s, reps_declarees, duree_s, validation
  )
  select v_id, v_user, s.emplacement, s.exercice_cle, left(s.exercice_nom, 120),
         s.exercice_prevu_cle, s.serie, s.statut, s.mesure, s.reps_prescrites,
         s.duree_prescrite_s, s.reps_declarees, s.duree_s, s.validation
    from jsonb_to_recordset(coalesce(p->'series', '[]'::jsonb)) as s(
      emplacement smallint, exercice_cle text, exercice_nom text,
      exercice_prevu_cle text, serie smallint, statut text, mesure text,
      reps_prescrites smallint, duree_prescrite_s integer,
      reps_declarees smallint, duree_s integer, validation text
    );

  return jsonb_build_object('id', v_id, 'deja', false);
end;
$$;

revoke all on function public.enregistrer_seance(jsonb) from public, anon;
grant execute on function public.enregistrer_seance(jsonb) to authenticated;

/* ─────────────── Vérifications après application ───────────────
   select count(*) from public.series_realisees;                 -- 0 au départ
   select count(*) from public.workout_sessions
    where lancement_id is not null;                              -- 0 au départ
   -- Rollback (tant qu'aucune séance R1 n'a été enregistrée) :
   -- drop function public.enregistrer_seance(jsonb);
   -- drop table public.series_realisees;
   -- drop index public.uniq_workout_lancement;
   -- alter table public.workout_sessions drop column lancement_id,
   --   drop column termine_le, drop column journal_version;
*/

/* ════════════════════════════════════════════════════════════════════
   LE SCORE DES CLASSIQUES (maquette « Le chrono et le score », GO de
   Louis le 2026-11-01).

   Un classique est une séance qu'on refait pour battre son score : un
   temps, des tours, des répétitions, une tenue ou une dernière minute.
   Le score vit avec la séance, dans `workout_sessions.score`, et il ne
   s'écrit que par `enregistrer_seance` : le journal est immuable (aucune
   policy UPDATE sur `workout_sessions`).

   1. La colonne `score` (jsonb) et sa forme, vérifiée par la base.
   2. `enregistrer_seance` la remplit depuis `p->'score'`. Un score mal
      formé est IGNORÉ, la séance s'enregistre quand même : un score ne
      doit jamais faire perdre une séance.
   3. Un index pour relire les scores d'un classique.

   Le reste de `enregistrer_seance` est recopié à l'identique de la
   version R4 (20261007_r4_progression.sql), qui est celle en base.

   Rejouable sans risque. Joué hors ligne par `npm run check:classiques`.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. La colonne et sa forme ─────────────── */

alter table public.workout_sessions add column if not exists score jsonb;

-- Un objet, un classique nommé, une façon de compter connue, une valeur
-- positive, des passages en nombre raisonnable. Les CASE gardent l'ordre
-- des contrôles : une valeur qui n'est pas un nombre ne se convertit pas.
create or replace function public.score_classique_valide(s jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when s is null then true
    when jsonb_typeof(s) <> 'object' then false
    when jsonb_typeof(s->'classique') is distinct from 'string' then false
    when length(s->>'classique') not between 1 and 40 then false
    when (s->>'sorte') is null or (s->>'sorte') not in ('temps', 'tours', 'reps', 'tenue', 'minute') then false
    when jsonb_typeof(s->'valeur') is distinct from 'number' then false
    when (s->>'valeur')::numeric not between 0 and 100000 then false
    when s ? 'passages' and jsonb_typeof(s->'passages') <> 'array' then false
    when s ? 'passages' and jsonb_array_length(s->'passages') > 1000 then false
    else true
  end
$$;

alter table public.workout_sessions drop constraint if exists workout_sessions_score_forme;
alter table public.workout_sessions
  add constraint workout_sessions_score_forme check (public.score_classique_valide(score));

/* ─────────────── 2. Le journal écrit le score ─────────────── */

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
  v_score     jsonb := case
                         when jsonb_typeof(p->'score') = 'object' and public.score_classique_valide(p->'score')
                         then p->'score'
                       end;
begin
  if v_user is null then
    raise exception 'non_connecte' using errcode = '28000';
  end if;
  if v_lancement is null then
    raise exception 'lancement_manquant' using errcode = '22023';
  end if;
  if nullif(p->>'proprietaire', '') is null or (p->>'proprietaire')::uuid <> v_user then
    raise exception 'proprietaire_different' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p->'series', '[]'::jsonb)) > 400 then
    raise exception 'trop_de_series' using errcode = '22023';
  end if;

  select id into v_id
    from public.workout_sessions
   where user_id = v_user and lancement_id = v_lancement;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'deja', true);
  end if;

  insert into public.workout_sessions (
    user_id, title, category, duration_minutes, calories_burned,
    elapsed_seconds, exercises, started_at, termine_le, lancement_id, journal_version, score
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
    1,
    v_score
  )
  on conflict (user_id, lancement_id) where lancement_id is not null do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
      from public.workout_sessions
     where user_id = v_user and lancement_id = v_lancement;
    return jsonb_build_object('id', v_id, 'deja', true);
  end if;

  insert into public.series_realisees (
    workout_session_id, user_id, emplacement, exercice_cle, exercice_nom,
    exercice_prevu_cle, serie, statut, mesure, reps_prescrites,
    duree_prescrite_s, reps_declarees, duree_s, validation,
    statut_prescrit, fonction_prescrite, reps_min_prescrites, reps_max_prescrites,
    charge, charge_unite, charge_type, marge
  )
  select v_id, v_user, s.emplacement, s.exercice_cle, left(s.exercice_nom, 120),
         s.exercice_prevu_cle, s.serie, s.statut, s.mesure, s.reps_prescrites,
         s.duree_prescrite_s, s.reps_declarees, s.duree_s, s.validation,
         s.statut_prescrit, s.fonction_prescrite, s.reps_min_prescrites, s.reps_max_prescrites,
         case when s.charge > 0 then s.charge end,
         case when s.charge > 0 then 'kg' end,
         s.charge_type,
         /* La marge ne vaut que pour un repère : ailleurs, rien n'est écrit. */
         case when s.statut_prescrit = 'repere' and s.statut = 'terminee'
                   and s.marge in ('aucune', '1_2', '3_plus', 'inconnue') then s.marge end
    from jsonb_to_recordset(coalesce(p->'series', '[]'::jsonb)) as s(
      emplacement smallint, exercice_cle text, exercice_nom text,
      exercice_prevu_cle text, serie smallint, statut text, mesure text,
      reps_prescrites smallint, duree_prescrite_s integer,
      reps_declarees smallint, duree_s integer, validation text,
      statut_prescrit text, fonction_prescrite text,
      reps_min_prescrites smallint, reps_max_prescrites smallint,
      charge numeric, charge_type text, marge text
    );

  return jsonb_build_object('id', v_id, 'deja', false);
end;
$$;

revoke all on function public.enregistrer_seance(jsonb) from public, anon;
grant execute on function public.enregistrer_seance(jsonb) to authenticated;

/* ─────────────── 3. Relire les scores d'un classique ─────────────── */

create index if not exists idx_workout_score_classique
  on public.workout_sessions (user_id, (score->>'classique'), started_at)
  where score is not null;

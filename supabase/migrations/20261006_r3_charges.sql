/* ════════════════════════════════════════════════════════════════════
   R3 · LE JOURNAL ÉCRIT LA CHARGE ET L'EXERCICE RÉELLEMENT FAIT
   (maquette 07, écrans 02 à 06 ; tour 26 de Codex)

   À coller dans le SQL Editor APRÈS `20261005_r2_prescription.sql`.
   Rejouable. Ne crée rien : les colonnes `charge`, `charge_unite` et
   `charge_type` existent depuis R1, mais `enregistrer_seance` ne les
   recopiait pas. Elle les recopie désormais. (`exercice_prevu_cle` était
   déjà recopiée : le tunnel l'envoie enfin.)

   ⚠️ LES PROTECTIONS DE R1 RESTENT IDENTIQUES : propriétaire = le compte
   connecté, un lancement = une séance (rejeu sans doublon), 400 séries au
   plus. Un journal préparé avant R3 n'a pas ces champs : ils restent nuls.

   ⚠️ À APPLIQUER AVANT DE DÉPLOYER LE CODE R3. Sans elle, rien ne casse,
   mais les charges déclarées pendant la séance ne seraient pas écrites.
   ════════════════════════════════════════════════════════════════════ */

/* Identique à R2, plus les trois colonnes de la charge. */
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
    charge, charge_unite, charge_type
  )
  select v_id, v_user, s.emplacement, s.exercice_cle, left(s.exercice_nom, 120),
         s.exercice_prevu_cle, s.serie, s.statut, s.mesure, s.reps_prescrites,
         s.duree_prescrite_s, s.reps_declarees, s.duree_s, s.validation,
         s.statut_prescrit, s.fonction_prescrite, s.reps_min_prescrites, s.reps_max_prescrites,
         /* Une charge sans unité ne s'écrit pas : la base l'exige, et une
            charge nulle ou nulle part est INCONNUE, jamais zéro. */
         case when s.charge > 0 then s.charge end,
         case when s.charge > 0 then 'kg' end,
         s.charge_type
    from jsonb_to_recordset(coalesce(p->'series', '[]'::jsonb)) as s(
      emplacement smallint, exercice_cle text, exercice_nom text,
      exercice_prevu_cle text, serie smallint, statut text, mesure text,
      reps_prescrites smallint, duree_prescrite_s integer,
      reps_declarees smallint, duree_s integer, validation text,
      statut_prescrit text, fonction_prescrite text,
      reps_min_prescrites smallint, reps_max_prescrites smallint,
      charge numeric, charge_type text
    );

  return jsonb_build_object('id', v_id, 'deja', false);
end;
$$;

revoke all on function public.enregistrer_seance(jsonb) from public, anon;
grant execute on function public.enregistrer_seance(jsonb) to authenticated;

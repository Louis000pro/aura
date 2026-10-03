/* ════════════════════════════════════════════════════════════════════
   R1 · LE JOURNAL DIT LA VÉRITÉ (refonte du planning, décisions 30 à 60)

   À coller dans le SQL Editor de Supabase APRÈS toutes les migrations
   précédentes. Rejouable sans risque. Purement additif : aucune donnée
   existante n'est modifiée ni supprimée.

   ⚠️ À APPLIQUER AVANT DE DÉPLOYER LE CODE R1. Sans lui, le code garde
   chaque séance en attente sur l'appareil au lieu de l'écrire à moitié
   (R1 bis : plus aucun repli vers l'ancienne écriture).

   Ce qu'il ajoute :
   1. `workout_sessions` : l'identifiant du lancement (une séance ne
      s'enregistre qu'une fois, même rejouée), l'heure de fin, et la
      version du journal (0 = ancienne séance sans séries).
   2. `series_realisees` : une ligne par série PRÉVUE, avec ce qui lui
      est réellement arrivé.
   3. `enregistrer_seance(p)` : la séance et ses séries en UNE
      transaction, idempotente sur le lancement, et qui refuse un journal
      dont le propriétaire n'est pas le compte connecté.
   4. R1 bis · ce qui SUIT le journal devient rejouable sans doublon :
      la fermeture du planning (une intention par lancement), le maillon
      du relais (un maillon par séance) et l'affiche (une par séance).
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
  /* ⚠️ R1 bis · LE JOURNAL DIT À QUI IL APPARTIENT, ET LA BASE LE VÉRIFIE.
     Une séance gardée sur l'appareil se rejoue plus tard ; si le compte
     a changé entre-temps, `auth.uid()` désignerait le mauvais
     propriétaire et la séance de A s'écrirait chez B. Le contrôle local
     ne suffit pas : la session peut changer entre lui et la requête. */
  if nullif(p->>'proprietaire', '') is null or (p->>'proprietaire')::uuid <> v_user then
    raise exception 'proprietaire_different' using errcode = '42501';
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


/* ─────────────── 4. R1 bis · ce qui suit le journal ─────────────── */

/* La fermeture du planning porte le lancement qui l'a faite. Une
   intention par lancement : rejouer la fermeture d'une ÉTAPE (une
   insertion) rend l'intention déjà écrite au lieu d'en créer une jumelle,
   et une réservation refermée garde la trace de qui l'a refermée.
   Contrainte pleine (et pas un index partiel) pour que PostgreSQL la
   nomme dans l'erreur de doublon ; deux `null` ne se gênent pas. */
alter table public.intentions_entrainement
  add column if not exists lancement_id uuid;
do $$ begin
  alter table public.intentions_entrainement
    add constraint uniq_intention_lancement unique (user_id, lancement_id);
exception when duplicate_object or duplicate_table then null; end $$;

/* Un maillon par séance : `valider_action_defi` rejouée sur la même
   séance (récupération après une coupure) ne franchit rien une seconde
   fois. */
create unique index if not exists uniq_action_par_seance
  on public.challenge_actions (run_id, workout_session_id)
  where workout_session_id is not null;

/* Une affiche par séance. */
create unique index if not exists uniq_affiche_par_seance
  on public.posts (user_id, (performance_data->>'seance_id'))
  where type = 'workout' and performance_data ? 'seance_id';

create or replace function public.valider_action_defi(p_run_id uuid, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user       uuid := auth.uid();
  v_run        public.challenge_runs%rowtype;
  v_session    public.workout_sessions%rowtype;
  v_jour       date := current_date;
  v_partner    uuid;
  v_mine       int;
  v_partdone   int;
  v_today      int;
  v_next       int;
  v_min        int;
  v_reussi     boolean;
  v_pseudo     text;
  v_deja       int;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'raison', 'non_connecte');
  end if;

  select * into v_run from public.challenge_runs where id = p_run_id;
  if not found or v_run.statut <> 'en_cours' then
    return jsonb_build_object('ok', false, 'raison', 'defi_inactif');
  end if;

  if not public.est_membre_run(p_run_id, v_user) then
    return jsonb_build_object('ok', false, 'raison', 'pas_membre');
  end if;

  /* R1 bis · cette séance a déjà franchi son maillon : on le dit, on ne
     le refranchit pas. C'est ce qui rend la récupération rejouable. */
  select maillon into v_deja from public.challenge_actions
   where run_id = p_run_id and user_id = v_user and workout_session_id = p_session_id;
  if found then
    return jsonb_build_object('ok', false, 'raison', 'deja_valide', 'maillon', v_deja);
  end if;

  if v_jour < v_run.starts_on or v_jour > v_run.ends_on then
    return jsonb_build_object('ok', false, 'raison', 'hors_fenetre');
  end if;

  select * into v_session from public.workout_sessions
   where id = p_session_id and user_id = v_user;
  if not found then
    return jsonb_build_object('ok', false, 'raison', 'seance_introuvable');
  end if;
  if v_session.started_at < now() - interval '3 hours' then
    return jsonb_build_object('ok', false, 'raison', 'seance_trop_ancienne');
  end if;

  select user_id into v_partner
    from public.challenge_run_members
   where run_id = p_run_id and user_id <> v_user
   limit 1;

  select count(*) into v_mine
    from public.challenge_actions where run_id = p_run_id and user_id = v_user;
  select count(*) into v_partdone
    from public.challenge_actions where run_id = p_run_id and user_id = v_partner;
  select count(*) into v_today
    from public.challenge_actions
   where run_id = p_run_id and user_id = v_user and jour = v_jour;

  if v_mine >= v_run.target_days then
    return jsonb_build_object('ok', false, 'raison', 'deja_fini_pour_moi');
  end if;

  if v_today >= 2 then
    return jsonb_build_object('ok', false, 'raison', 'deux_par_jour_max');
  end if;

  if v_partdone < v_mine then
    return jsonb_build_object('ok', false, 'raison', 'bloque_binome',
                              'mine', v_mine, 'partner', v_partdone);
  end if;

  v_next := v_mine + 1;

  insert into public.challenge_actions (run_id, user_id, jour, workout_session_id, maillon)
  values (p_run_id, v_user, v_jour, p_session_id, v_next);

  v_mine := v_next;
  v_min  := least(v_mine, v_partdone);
  v_reussi := (v_mine >= v_run.target_days and v_partdone >= v_run.target_days);

  select pseudo into v_pseudo from public.profiles where id = v_user;

  if v_run.conversation_id is not null then
    insert into public.messages (conversation_id, user_id, contenu, type)
    values (
      v_run.conversation_id, null,
      case when v_reussi
        then 'L''affiche est complète. Vous avez bouclé les 4 maillons ensemble.'
        else coalesce(v_pseudo, 'Quelqu''un') || ' a franchi le maillon ' || v_next || ' sur ' || v_run.target_days || '.'
      end,
      'systeme'
    );
  end if;

  if v_reussi then
    update public.challenge_runs set statut = 'reussi', fini_le = now() where id = p_run_id;
    insert into public.profile_badges (user_id, badge_slug)
    select m.user_id, 'serie-' || v_run.serie
      from public.challenge_run_members m where m.run_id = p_run_id
    on conflict do nothing;
    insert into public.profile_badges (user_id, badge_slug)
    select m.user_id, 'premier-relais'
      from public.challenge_run_members m where m.run_id = p_run_id
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'maillon', v_next,
    'mine', v_mine,
    'partner', v_partdone,
    'min', v_min,
    'objectif', v_run.target_days,
    'serie', v_run.serie,
    'reussi', v_reussi,
    'bloque', (v_partdone < v_mine)
  );
end;
$function$;

/* ─────────────── Vérifications après application ───────────────
   select count(*) from public.series_realisees;                 -- 0 au départ
   select count(*) from public.workout_sessions
    where lancement_id is not null;                              -- 0 au départ
   -- Rollback (tant qu'aucune séance R1 n'a été enregistrée) :
   -- drop function public.enregistrer_seance(jsonb);
   -- drop table public.series_realisees;
   -- drop index public.uniq_workout_lancement;
   -- drop index public.uniq_action_par_seance;
   -- drop index public.uniq_affiche_par_seance;
   -- alter table public.intentions_entrainement
   --   drop constraint uniq_intention_lancement, drop column lancement_id;
   -- (et réappliquer valider_action_defi depuis 20260927_relais_coop.sql)
   -- alter table public.workout_sessions drop column lancement_id,
   --   drop column termine_le, drop column journal_version;
*/

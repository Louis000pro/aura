/* ════════════════════════════════════════════════════════════════════
   R2 · LA SÉANCE PRÉVUE SAIT CE QU'ELLE DEMANDE (refonte du planning,
   décisions 43, 44, 47, 50 ; tour 20 de Codex)

   À coller dans le SQL Editor APRÈS `20261004_r6_occurrences.sql`.
   Rejouable. Purement additif : aucune ligne existante n'est modifiée.

   ⚠️ À APPLIQUER AVANT DE DÉPLOYER LE CODE R2 : la fermeture d'une étape
   avec prescription passe par `ecrire_occurrence`. Sans elle, la séance
   reste en attente sur l'appareil (aucun repli, comme R1 bis).

   Deux niveaux, deux tables (décision 44) :
   · `etape_modeles` + `etape_exercices` = LE MODÈLE d'une étape pour un
     lieu, dans une version de programme. Immuable : un nouveau modèle
     s'ajoute, l'ancien ne se réécrit pas. Aucune charge.
   · `occurrence_exercices` = LA PRESCRIPTION FIGÉE d'une occurrence.
     Écrite avec son intention, dans la même transaction. Une nouvelle
     version du programme ne la touche pas.
   `exercise_list` devient une PROJECTION de la prescription, calculée
   ici (`projeter_prescription`) et jamais modifiée à part.

   ⚠️ LE JOURNAL SE RATTACHE PAR L'EMPLACEMENT, PAS PAR UNE CLÉ ÉTRANGÈRE.
   Le journal (R1) s'écrit AVANT la fermeture : pour une étape libre, la
   ligne de prescription n'existe pas encore à ce moment-là. Le lien est
   donc (lancement → intention refermée par ce lancement → emplacement),
   qui ne dépend ni de l'ordre ni d'une fermeture réussie du premier coup,
   et le journal garde en plus SA copie de la prescription de départ :
   deux lancements du même rang gardent chacun la leur.
   ════════════════════════════════════════════════════════════════════ */


/* ─────────────── 1. Le modèle d'une étape ─────────────── */

create table if not exists public.etape_modeles (
  id                  uuid primary key default gen_random_uuid(),
  programme_seance_id uuid not null references public.programme_seances(id) on delete cascade,
  /* Le contexte de composition, conservé AVEC le modèle (tour 20). */
  lieu                text not null check (lieu in ('salle', 'halteres', 'poids')),
  orientation         text not null check (orientation in ('force', 'masse', 'general')),
  niveau              text,
  composition_version smallint not null check (composition_version >= 1),
  cree_le             timestamptz not null default now(),
  /* Un modèle par étape et par lieu : changer de matériel donne le modèle
     de l'autre lieu, sans jamais réécrire celui-ci. */
  unique (programme_seance_id, lieu)
);

create table if not exists public.etape_exercices (
  id            uuid primary key default gen_random_uuid(),
  modele_id     uuid not null references public.etape_modeles(id) on delete cascade,
  emplacement   smallint not null check (emplacement >= 0),
  exercice_cle  text not null check (length(exercice_cle) > 0),
  exercice_nom  text not null,
  fonction      text not null check (fonction in (
    'squat', 'unilateral_jambe', 'charniere_hanche', 'extension_hanche',
    'flexion_genou', 'extension_genou', 'mollets', 'abduction_hanche',
    'isometrie_jambes', 'pliometrie',
    'poussee_horizontale', 'poussee_verticale', 'ecarte_pectoraux',
    'tirage_horizontal', 'tirage_vertical', 'arriere_epaule', 'epaule_isolation',
    'biceps', 'triceps', 'gainage', 'flexion_tronc', 'extension_tronc', 'cardio')),
  statut        text not null check (statut in ('repere', 'complementaire')),
  series        smallint not null check (series between 1 and 12),
  mesure        text not null check (mesure in ('reps', 'duree')),
  reps_min      smallint,
  reps_max      smallint,
  reps_cible    smallint,
  duree_s       integer,
  repos_s       integer not null check (repos_s >= 0),
  transition_s  integer not null check (transition_s >= 0),
  charge_type   text check (charge_type is null or charge_type in ('totale', 'par_haltere', 'assistance', 'poids_du_corps')),
  unite         text not null default '',
  unique (modele_id, emplacement),
  /* Une fourchette cohérente, avec sa cible de compatibilité dedans ; ou
     une durée. Jamais les deux, jamais aucune. */
  check (
    (mesure = 'reps' and reps_min >= 1 and reps_min <= reps_cible and reps_cible <= reps_max
      and reps_max <= 100 and duree_s is null)
    or (mesure = 'duree' and duree_s > 0 and reps_min is null and reps_max is null and reps_cible is null)
  )
);


/* ─────────────── 2. La prescription figée d'une occurrence ─────────────── */

create table if not exists public.occurrence_exercices (
  id            uuid primary key default gen_random_uuid(),
  intention_id  uuid not null references public.intentions_entrainement(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  /* D'où elle a été recopiée. Une TRACE : un modèle supprimé avec sa
     version de programme ne doit pas emporter une prescription figée. */
  modele_id     uuid references public.etape_modeles(id) on delete set null,
  emplacement   smallint not null check (emplacement >= 0),
  exercice_cle  text not null check (length(exercice_cle) > 0),
  exercice_nom  text not null,
  fonction      text not null check (fonction in (
    'squat', 'unilateral_jambe', 'charniere_hanche', 'extension_hanche',
    'flexion_genou', 'extension_genou', 'mollets', 'abduction_hanche',
    'isometrie_jambes', 'pliometrie',
    'poussee_horizontale', 'poussee_verticale', 'ecarte_pectoraux',
    'tirage_horizontal', 'tirage_vertical', 'arriere_epaule', 'epaule_isolation',
    'biceps', 'triceps', 'gainage', 'flexion_tronc', 'extension_tronc', 'cardio')),
  statut        text not null check (statut in ('repere', 'complementaire')),
  series        smallint not null check (series between 1 and 12),
  mesure        text not null check (mesure in ('reps', 'duree')),
  reps_min      smallint,
  reps_max      smallint,
  reps_cible    smallint,
  duree_s       integer,
  repos_s       integer not null check (repos_s >= 0),
  transition_s  integer not null check (transition_s >= 0),
  charge_type   text check (charge_type is null or charge_type in ('totale', 'par_haltere', 'assistance', 'poids_du_corps')),
  unite         text not null default '',
  /* ⚠️ UNE CHARGE INCONNUE N'EST JAMAIS ZÉRO (décision 50). En R2 elle est
     toujours nulle ; R4 la posera, avec son origine. */
  charge_cible  numeric(6,2) check (charge_cible is null or charge_cible > 0),
  charge_origine text not null default 'aucune' check (charge_origine in ('aucune', 'historique', 'acceptee')),
  cree_le       timestamptz not null default now(),
  unique (intention_id, emplacement),
  check ((charge_cible is null) = (charge_origine = 'aucune')),
  check (
    (mesure = 'reps' and reps_min >= 1 and reps_min <= reps_cible and reps_cible <= reps_max
      and reps_max <= 100 and duree_s is null)
    or (mesure = 'duree' and duree_s > 0 and reps_min is null and reps_max is null and reps_cible is null)
  )
);

create index if not exists idx_occurrence_exercices_cle
  on public.occurrence_exercices (user_id, exercice_cle);


/* ─────────────── 3. Le journal garde sa copie de la prescription ─────────────── */

alter table public.series_realisees
  add column if not exists statut_prescrit     text,
  add column if not exists fonction_prescrite  text,
  add column if not exists reps_min_prescrites smallint,
  add column if not exists reps_max_prescrites smallint;

do $$ begin
  alter table public.series_realisees
    add constraint series_statut_prescrit_check
    check (statut_prescrit is null or statut_prescrit in ('repere', 'complementaire'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.series_realisees
    add constraint series_fourchette_prescrite_check
    check ((reps_min_prescrites is null) = (reps_max_prescrites is null)
      and (reps_min_prescrites is null or reps_min_prescrites <= reps_max_prescrites));
exception when duplicate_object then null; end $$;


/* ─────────────── 4. Droits ─────────────── */

alter table public.etape_modeles        enable row level security;
alter table public.etape_exercices      enable row level security;
alter table public.occurrence_exercices enable row level security;

/* Lecture seulement. AUCUNE écriture directe : les modèles s'écrivent par
   `ecrire_modele`, les prescriptions par `ecrire_occurrence`, et rien ne
   les réécrit ensuite. Elles partent avec leur programme ou leur
   intention (cascade). */
drop policy if exists "etape_modeles: lecture via programme" on public.etape_modeles;
create policy "etape_modeles: lecture via programme"
  on public.etape_modeles for select
  using (exists (
    select 1 from public.programme_seances ps
      join public.programmes p on p.id = ps.programme_id
     where ps.id = etape_modeles.programme_seance_id and p.user_id = auth.uid()
  ));

drop policy if exists "etape_exercices: lecture via modele" on public.etape_exercices;
create policy "etape_exercices: lecture via modele"
  on public.etape_exercices for select
  using (exists (
    select 1 from public.etape_modeles m
      join public.programme_seances ps on ps.id = m.programme_seance_id
      join public.programmes p on p.id = ps.programme_id
     where m.id = etape_exercices.modele_id and p.user_id = auth.uid()
  ));

drop policy if exists "occurrence_exercices: lecture" on public.occurrence_exercices;
create policy "occurrence_exercices: lecture"
  on public.occurrence_exercices for select
  using (auth.uid() = user_id);


/* ─────────────── 5. La projection de compatibilité ─────────────── */

/* ⚠️ LA MÊME QUE `projeterPrescription` (banqueEtapes.ts), champ pour
   champ : le tunnel lit l'une au lancement d'une étape libre, l'autre
   quand l'occurrence est relue. Le banc compare les deux listes de
   champs. */
create or replace function public.projeter_prescription(p_lignes jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', l->>'exercice_nom',
      'sets', (l->>'series')::int,
      'reps', case
        when l->>'mesure' = 'duree' then
          case when (l->>'duree_s')::int >= 60 and (l->>'duree_s')::int % 60 = 0
               then ((l->>'duree_s')::int / 60)::text || ' min'
               else (l->>'duree_s') || 's' end
        else (l->>'reps_cible') || case when coalesce(l->>'unite', '') <> '' then ' ' || (l->>'unite') else '' end
      end,
      'rest', (l->>'repos_s')::int,
      'restAfter', (l->>'transition_s')::int,
      'tip', '',
      'benefit', '',
      'muscles', '[]'::jsonb,
      'prescription', jsonb_build_object(
        'cle', l->>'exercice_cle',
        'fonction', l->>'fonction',
        'statut', l->>'statut',
        'reps_min', (l->>'reps_min')::int,
        'reps_max', (l->>'reps_max')::int,
        'charge_type', l->>'charge_type'
      )
    )
    /* `auto` n'existe que pour une durée, comme côté TypeScript. */
    || case when l->>'mesure' = 'duree' then jsonb_build_object('auto', (l->>'duree_s')::int) else '{}'::jsonb end
    order by (l->>'emplacement')::int
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) as l;
$$;


/* ─────────────── 6. Écrire un modèle ─────────────── */

/* Idempotente : un modèle qui existe déjà pour cette étape et ce lieu est
   rendu tel quel, JAMAIS recomposé. */
create or replace function public.ecrire_modele(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_etape uuid := nullif(p->>'programme_seance_id', '')::uuid;
  v_id    uuid;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.programme_seances ps join public.programmes pr on pr.id = ps.programme_id
     where ps.id = v_etape and pr.user_id = v_user
  ) then
    raise exception 'etape_inconnue' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p->'lignes', '[]'::jsonb)) = 0
     or jsonb_array_length(p->'lignes') > 12 then
    raise exception 'lignes_invalides' using errcode = '22023';
  end if;

  insert into public.etape_modeles (programme_seance_id, lieu, orientation, niveau, composition_version)
  values (v_etape, p->>'lieu', p->>'orientation', nullif(p->>'niveau', ''), (p->>'version')::smallint)
  on conflict (programme_seance_id, lieu) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.etape_modeles
     where programme_seance_id = v_etape and lieu = p->>'lieu';
    return jsonb_build_object('id', v_id, 'cree', false);
  end if;

  insert into public.etape_exercices (
    modele_id, emplacement, exercice_cle, exercice_nom, fonction, statut, series, mesure,
    reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite
  )
  select v_id, l.emplacement, l.exercice_cle, left(l.exercice_nom, 120), l.fonction, l.statut, l.series, l.mesure,
         l.reps_min, l.reps_max, l.reps_cible, l.duree_s, l.repos_s, l.transition_s, l.charge_type, coalesce(l.unite, '')
    from jsonb_to_recordset(p->'lignes') as l(
      emplacement smallint, exercice_cle text, exercice_nom text, fonction text, statut text,
      series smallint, mesure text, reps_min smallint, reps_max smallint, reps_cible smallint,
      duree_s integer, repos_s integer, transition_s integer, charge_type text, unite text
    );

  return jsonb_build_object('id', v_id, 'cree', true);
end;
$$;

revoke all on function public.ecrire_modele(jsonb) from public, anon;
grant execute on function public.ecrire_modele(jsonb) to authenticated;


/* ─────────────── 7. Écrire une occurrence avec sa prescription ─────────────── */

/* Deux usages, une seule transaction à chaque fois :
   · `prevue` : dater une étape. Si l'occurrence existe déjà, on rend
     celle-ci, sans toucher à ses lignes : rejouer la préparation ne
     recalcule jamais la prescription.
   · `faite` : fermer une étape libre à la fin de la séance, avec la copie
     figée au lancement. Mêmes refus que l'insertion directe d'avant R2
     (`uniq_intention_lancement`, `uniq_occurrence`) : c'est un doublon,
     la séance reste dans le journal et ne ferme rien une seconde fois. */
create or replace function public.ecrire_occurrence(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  i           jsonb := p->'intention';
  v_prog      uuid := nullif(i->>'programme_id', '')::uuid;
  v_etape     uuid := nullif(i->>'etape_consommee_id', '')::uuid;
  v_statut    text := i->>'statut';
  v_rang      integer := nullif(i->>'rang', '')::integer;
  v_adapt     uuid := nullif(i->>'adaptation_id', '')::uuid;
  v_modele    uuid := nullif(p->>'modele_id', '')::uuid;
  v_lignes    jsonb := coalesce(p->'lignes', '[]'::jsonb);
  v_id        uuid;
  v_contrainte text;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if v_statut not in ('prevue', 'faite') then raise exception 'statut_invalide' using errcode = '22023'; end if;
  if v_prog is null or v_etape is null then raise exception 'etape_manquante' using errcode = '22023'; end if;
  /* Une prescription vient d'une étape : provenance = étape refermée. */
  if nullif(i->>'programme_seance_id', '')::uuid is distinct from v_etape then
    raise exception 'provenance_differente' using errcode = '22023';
  end if;
  if not exists (select 1 from public.programmes where id = v_prog and user_id = v_user) then
    raise exception 'programme_inconnu' using errcode = '42501';
  end if;
  if v_adapt is not null and not exists (
    select 1 from public.adaptations_entrainement where id = v_adapt and user_id = v_user
  ) then
    raise exception 'adaptation_inconnue' using errcode = '42501';
  end if;
  if v_modele is not null and not exists (
    select 1 from public.etape_modeles m where m.id = v_modele and m.programme_seance_id = v_etape
  ) then
    raise exception 'modele_inconnu' using errcode = '42501';
  end if;
  if jsonb_array_length(v_lignes) = 0 or jsonb_array_length(v_lignes) > 12 then
    raise exception 'lignes_invalides' using errcode = '22023';
  end if;

  /* Préparer une occurrence déjà préparée : on rend celle-là. */
  if v_statut = 'prevue' and v_rang is not null then
    select id into v_id from public.intentions_entrainement
     where user_id = v_user and programme_id = v_prog and rang = v_rang;
    if v_id is not null then
      return jsonb_build_object('resultat', 'deja', 'id', v_id, 'rang', v_rang);
    end if;
  end if;

  begin
    insert into public.intentions_entrainement (
      user_id, date, type, title, difficulty, location, exercise_list, session_id,
      statut, nature, origine, consommee_le, programme_id, programme_seance_id,
      etape_consommee_id, rang, adaptation_id, lancement_id, updated_at
    ) values (
      v_user,
      nullif(i->>'date', '')::date,
      coalesce(nullif(i->>'type', ''), 'Force'),
      coalesce(i->>'title', ''),
      coalesce(nullif(i->>'difficulty', ''), 'Intermédiaire'),
      nullif(i->>'location', ''),
      public.projeter_prescription(v_lignes),
      null,
      v_statut,
      'seance',
      coalesce(nullif(i->>'origine', ''), 'utilisateur'),
      case when v_statut = 'faite' then (i->>'consommee_le')::timestamptz end,
      v_prog, v_etape, v_etape, v_rang, v_adapt,
      nullif(i->>'lancement_id', '')::uuid,
      now()
    )
    returning id, rang into v_id, v_rang;
  exception when unique_violation then
    get stacked diagnostics v_contrainte = constraint_name;
    if v_statut = 'prevue' and v_contrainte = 'uniq_occurrence' then
      select id into v_id from public.intentions_entrainement
       where user_id = v_user and programme_id = v_prog and rang = v_rang;
      return jsonb_build_object('resultat', 'deja', 'id', v_id, 'rang', v_rang);
    end if;
    return jsonb_build_object('resultat', 'doublon', 'contrainte', v_contrainte);
  end;

  insert into public.occurrence_exercices (
    intention_id, user_id, modele_id, emplacement, exercice_cle, exercice_nom, fonction, statut,
    series, mesure, reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite
  )
  select v_id, v_user, v_modele, l.emplacement, l.exercice_cle, left(l.exercice_nom, 120), l.fonction, l.statut,
         l.series, l.mesure, l.reps_min, l.reps_max, l.reps_cible, l.duree_s, l.repos_s, l.transition_s,
         l.charge_type, coalesce(l.unite, '')
    from jsonb_to_recordset(v_lignes) as l(
      emplacement smallint, exercice_cle text, exercice_nom text, fonction text, statut text,
      series smallint, mesure text, reps_min smallint, reps_max smallint, reps_cible smallint,
      duree_s integer, repos_s integer, transition_s integer, charge_type text, unite text
    );

  return jsonb_build_object('resultat', 'ok', 'id', v_id, 'rang', v_rang);
end;
$$;

revoke all on function public.ecrire_occurrence(jsonb) from public, anon;
grant execute on function public.ecrire_occurrence(jsonb) to authenticated;


/* ─────────────── 8. La projection ne se modifie pas à part ─────────────── */

/* Une intention qui porte une prescription garde sa projection. Un
   déplacement réécrit la même liste : rien ne change. Mais si son contenu
   change (substitution : la provenance tombe ; nouveau lieu : une autre
   liste), la liste n'est plus la projection de la prescription. La
   prescription part alors dans la MÊME transaction, explicitement : une
   séance sans prescription garde le comportement d'avant R2, et jamais
   une liste ne contredit des lignes restées en base. */
create or replace function public.prescription_suit_le_contenu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.programme_seance_id is distinct from old.programme_seance_id
      or new.exercise_list is distinct from old.exercise_list)
     and exists (select 1 from public.occurrence_exercices where intention_id = old.id) then
    delete from public.occurrence_exercices where intention_id = old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists intentions_prescription_suit_le_contenu on public.intentions_entrainement;
create trigger intentions_prescription_suit_le_contenu
  before update on public.intentions_entrainement
  for each row execute function public.prescription_suit_le_contenu();


/* ─────────────── 9. Le journal recopie la prescription ─────────────── */

/* Identique à R1, plus les quatre colonnes de la prescription. Un journal
   préparé avant R2 n'a pas ces champs : ils restent nuls. */
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
    statut_prescrit, fonction_prescrite, reps_min_prescrites, reps_max_prescrites
  )
  select v_id, v_user, s.emplacement, s.exercice_cle, left(s.exercice_nom, 120),
         s.exercice_prevu_cle, s.serie, s.statut, s.mesure, s.reps_prescrites,
         s.duree_prescrite_s, s.reps_declarees, s.duree_s, s.validation,
         s.statut_prescrit, s.fonction_prescrite, s.reps_min_prescrites, s.reps_max_prescrites
    from jsonb_to_recordset(coalesce(p->'series', '[]'::jsonb)) as s(
      emplacement smallint, exercice_cle text, exercice_nom text,
      exercice_prevu_cle text, serie smallint, statut text, mesure text,
      reps_prescrites smallint, duree_prescrite_s integer,
      reps_declarees smallint, duree_s integer, validation text,
      statut_prescrit text, fonction_prescrite text,
      reps_min_prescrites smallint, reps_max_prescrites smallint
    );

  return jsonb_build_object('id', v_id, 'deja', false);
end;
$$;

revoke all on function public.enregistrer_seance(jsonb) from public, anon;
grant execute on function public.enregistrer_seance(jsonb) to authenticated;

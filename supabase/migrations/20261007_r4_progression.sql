/* ════════════════════════════════════════════════════════════════════
   R4 · LA PROGRESSION : LA MARGE, LA CIBLE ACCEPTÉE, LE CRAN CONFIRMÉ
   (maquette 07, écrans 05 et 08 ; tour 29 de Codex)

   À coller dans le SQL Editor APRÈS `20261006_r3_charges.sql`. Rejouable.

   ⚠️ RIEN NE CHANGE SANS ACCORD. La marge se déclare, une proposition
   s'accepte ou se garde. Accepter écrit une VERSION de cible, figée,
   rattachée à UNE occurrence précise de l'étape (règles R6). Elle est
   recopiée dans la prescription de cette occurrence quand celle-ci se
   fige, et elle n'est CONSOMMÉE que lorsque cette occurrence est FAITE en
   ayant suivi cette version. Un lancement abandonné, une séance retirée
   ou passée ne la perdent pas : une occurrence résolue sans l'avoir
   suivie la REPORTE sur l'occurrence suivante de l'étape.

   ⚠️ UNE VERSION NE CHANGE JAMAIS (tour 30). Accepter de nouveau ne
   modifie pas la cible : l'ancienne version est marquée remplacée et une
   nouvelle est écrite. Une copie faite au lancement nomme donc une
   version dont les valeurs ne bougeront plus.

   ⚠️ LA FERMETURE GARDE LA COPIE DU LANCEMENT (tour 30). Une étape libre
   se ferme avec les lignes du lancement, dont la version nommée est
   relue quel que soit son état (ouverte, remplacée, consommée ailleurs).
   Une occurrence préparée se ferme par son statut : ses lignes sont
   alors remises à la copie que le journal de ce lancement a suivie.

   ⚠️ UNE SÉANCE DÉJÀ PRÉPARÉE NE SE RÉÉCRIT PAS EN SILENCE.
   `accepter_cible` refuse d'écrire tant que l'appareil ne nomme pas
   l'occurrence préparée qu'il a annoncée, et revérifie son état, sous
   verrou, dans la transaction qui l'ajuste.
   ════════════════════════════════════════════════════════════════════ */

/* ─────────────── 1. La marge de la dernière série d'un repère ─────────────── */

alter table public.series_realisees add column if not exists marge text;
do $$ begin
  alter table public.series_realisees
    add constraint series_marge_check
    check (marge is null or marge in ('aucune', '1_2', '3_plus', 'inconnue'));
exception when duplicate_object then null; end $$;


/* ─────────────── 2. Le cran confirmé d'un exercice ─────────────── */

create table if not exists public.crans_exercice (
  user_id      uuid not null references auth.users(id) on delete cascade,
  exercice_cle text not null check (length(exercice_cle) > 0),
  charge_type  text not null check (charge_type in ('totale', 'par_haltere', 'assistance')),
  cran         numeric(6,2) not null check (cran > 0),
  maj_le       timestamptz not null default now(),
  primary key (user_id, exercice_cle, charge_type)
);
alter table public.crans_exercice enable row level security;
drop policy if exists "crans_exercice: lecture" on public.crans_exercice;
create policy "crans_exercice: lecture" on public.crans_exercice for select using (auth.uid() = user_id);


/* ─────────────── 3. La cible acceptée ─────────────── */

create table if not exists public.cibles_acceptees (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  programme_id        uuid not null references public.programmes(id) on delete cascade,
  programme_seance_id uuid not null references public.programme_seances(id) on delete cascade,
  exercice_cle        text not null check (length(exercice_cle) > 0),
  charge_type         text check (charge_type is null or charge_type in ('totale', 'par_haltere', 'assistance', 'poids_du_corps')),
  /* Nulle au poids du corps, ou pour une cible en répétitions seules. */
  charge              numeric(6,2) check (charge is null or charge > 0),
  reps_cible          smallint not null,
  reps_min            smallint not null,
  reps_max            smallint not null,
  /* L'occurrence d'où vient la proposition, et la première visée. */
  rang_source         integer not null check (rang_source >= 1),
  rang_vise           integer not null,
  workout_session_id  uuid references public.workout_sessions(id) on delete set null,
  acceptee_le         timestamptz not null default now(),
  consommee_le        timestamptz,
  /* Une nouvelle acceptation remplace cette version sans la modifier. */
  remplacee_le        timestamptz,
  check (reps_min >= 1 and reps_min <= reps_cible and reps_cible <= reps_max and reps_max <= 100),
  check (rang_vise > rang_source)
);
alter table public.cibles_acceptees add column if not exists remplacee_le timestamptz;
/* Une seule version ouverte par exercice d'une étape. */
drop index if exists public.uniq_cible_ouverte;
create unique index uniq_cible_ouverte
  on public.cibles_acceptees (user_id, programme_id, programme_seance_id, exercice_cle)
  where consommee_le is null and remplacee_le is null;

/* Les valeurs d'une version ne bougent jamais. Seuls changent son
   occurrence visée (report), ses dates de fin, et le lien vers sa séance
   source (mis à nul si cette séance est supprimée). */
create or replace function public.cible_immuable()
returns trigger
language plpgsql
as $$
begin
  if (new.user_id, new.programme_id, new.programme_seance_id, new.exercice_cle, new.charge_type, new.charge,
      new.reps_cible, new.reps_min, new.reps_max, new.rang_source, new.acceptee_le)
     is distinct from
     (old.user_id, old.programme_id, old.programme_seance_id, old.exercice_cle, old.charge_type, old.charge,
      old.reps_cible, old.reps_min, old.reps_max, old.rang_source, old.acceptee_le) then
    raise exception 'cible_immuable' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists cibles_immuables on public.cibles_acceptees;
create trigger cibles_immuables before update on public.cibles_acceptees
  for each row execute function public.cible_immuable();
alter table public.cibles_acceptees enable row level security;
drop policy if exists "cibles_acceptees: lecture" on public.cibles_acceptees;
create policy "cibles_acceptees: lecture" on public.cibles_acceptees for select using (auth.uid() = user_id);

alter table public.occurrence_exercices
  add column if not exists cible_id uuid references public.cibles_acceptees(id) on delete set null;


/* ─────────────── 4. La projection porte la cible quand il y en a une ─────────────── */

/* ⚠️ LA MÊME QUE `projeterPrescription` (banqueEtapes.ts). Sans cible, la
   projection est exactement celle de R2 : aucune liste existante ne
   change. */
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
      ) || case when nullif(l->>'cible_id', '') is not null
                then jsonb_build_object('charge_cible', (l->>'charge_cible')::numeric, 'cible_id', l->>'cible_id')
                else '{}'::jsonb end
    )
    || case when l->>'mesure' = 'duree' then jsonb_build_object('auto', (l->>'duree_s')::int) else '{}'::jsonb end
    order by (l->>'emplacement')::int
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) as l;
$$;


/* ─────────────── 5. Une reprojection explicite ne supprime pas la prescription ─────────────── */

/* Identique à R2, sauf quand `accepter_cible` reprojette elle-même la
   liste d'une occurrence préparée après avoir mis à jour ses lignes. */
create or replace function public.prescription_suit_le_contenu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('vaiiya.reprojection', true), '') = 'on' then
    return new;
  end if;
  if (new.programme_seance_id is distinct from old.programme_seance_id
      or new.exercise_list is distinct from old.exercise_list)
     and exists (select 1 from public.occurrence_exercices where intention_id = old.id) then
    delete from public.occurrence_exercices where intention_id = old.id;
  end if;
  return new;
end;
$$;


/* ─────────────── 6. L'occurrence visée, puis la copie des cibles nommées ─────────────── */

/* La prochaine occurrence d'une étape, par les règles R6 : celle qui est
   déjà préparée, sinon le rang que `attribuer_rang` lui donnerait (une
   fermeture tardive la place plus loin que `source + longueur du cycle`). */
create or replace function public.rang_suivant(p_programme uuid, p_etape uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  k   integer;
  ord integer;
  r   integer;
begin
  select min(rang) into r from public.intentions_entrainement
   where programme_id = p_programme and etape_consommee_id = p_etape
     and statut = 'prevue' and rang is not null;
  if r is not null then return r; end if;
  select count(*) into k from public.programme_seances where programme_id = p_programme;
  ord := public.ordinal_etape(p_programme, p_etape);
  if k = 0 or ord is null then return null; end if;
  r := public.rang_base(p_programme, p_etape);
  r := r + (((ord - r) % k) + k) % k;
  while exists (select 1 from public.intentions_entrainement where programme_id = p_programme and rang = r) loop
    r := r + k;
  end loop;
  return r;
end;
$$;
revoke all on function public.rang_suivant(uuid, uuid) from public, anon, authenticated;

/* Les lignes, avec la version qu'elles nomment reprise depuis la table si
   elle appartient au compte, vise cette étape et EXACTEMENT ce rang, cet
   exercice, ce type et cette fourchette. Sinon la ligne perd sa cible.
   - préparer (`prevue`) : seule une version ouverte se recopie ;
   - fermer (`faite`) : la version suivie au lancement se relit quel que
     soit son état, remplacée ou consommée ailleurs comprises. Ses valeurs
     n'ayant jamais changé, la copie reste exactement celle du lancement. */
drop function if exists public.lignes_avec_cibles(jsonb, uuid, uuid, uuid, integer);
create or replace function public.lignes_avec_cibles(p_lignes jsonb, p_user uuid, p_prog uuid, p_etape uuid, p_rang integer, p_statut text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    case when c.id is null
      then (l - 'cible_id' - 'charge_cible' - 'charge_origine')
      else l || jsonb_build_object(
        'reps_cible', least(greatest(c.reps_cible, (l->>'reps_min')::int), (l->>'reps_max')::int),
        'charge_cible', c.charge,
        'charge_origine', case when c.charge is null then 'aucune' else 'acceptee' end,
        'cible_id', c.id)
    end order by (l->>'emplacement')::int), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) as l
  left join public.cibles_acceptees c
    on c.id = nullif(l->>'cible_id', '')::uuid
   and c.user_id = p_user
   and (p_statut = 'faite' or (c.consommee_le is null and c.remplacee_le is null))
   and c.programme_id = p_prog and c.programme_seance_id = p_etape
   and p_rang is not null and c.rang_vise = p_rang
   and l->>'mesure' = 'reps'
   and c.exercice_cle = l->>'exercice_cle'
   and c.charge_type is not distinct from nullif(l->>'charge_type', '')
   and c.reps_min = (l->>'reps_min')::int and c.reps_max = (l->>'reps_max')::int;
$$;
revoke all on function public.lignes_avec_cibles(jsonb, uuid, uuid, uuid, integer, text) from public, anon, authenticated;


/* ─────────────── 7. Écrire une occurrence : identique à R2, plus la copie ─────────────── */

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

  if v_statut = 'prevue' and v_rang is not null then
    select id into v_id from public.intentions_entrainement
     where user_id = v_user and programme_id = v_prog and rang = v_rang;
    if v_id is not null then
      return jsonb_build_object('resultat', 'deja', 'id', v_id, 'rang', v_rang);
    end if;
  end if;

  /* R4 · la version nommée est reprise depuis la table, ou retirée. */
  v_lignes := public.lignes_avec_cibles(v_lignes, v_user, v_prog, v_etape, v_rang, v_statut);

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
    series, mesure, reps_min, reps_max, reps_cible, duree_s, repos_s, transition_s, charge_type, unite,
    charge_cible, charge_origine, cible_id
  )
  select v_id, v_user, v_modele, l.emplacement, l.exercice_cle, left(l.exercice_nom, 120), l.fonction, l.statut,
         l.series, l.mesure, l.reps_min, l.reps_max, l.reps_cible, l.duree_s, l.repos_s, l.transition_s,
         l.charge_type, coalesce(l.unite, ''),
         l.charge_cible, coalesce(l.charge_origine, 'aucune'), l.cible_id
    from jsonb_to_recordset(v_lignes) as l(
      emplacement smallint, exercice_cle text, exercice_nom text, fonction text, statut text,
      series smallint, mesure text, reps_min smallint, reps_max smallint, reps_cible smallint,
      duree_s integer, repos_s integer, transition_s integer, charge_type text, unite text,
      charge_cible numeric, charge_origine text, cible_id uuid
    );

  return jsonb_build_object('resultat', 'ok', 'id', v_id, 'rang', v_rang);
end;
$$;

revoke all on function public.ecrire_occurrence(jsonb) from public, anon;
grant execute on function public.ecrire_occurrence(jsonb) to authenticated;


/* ─────────────── 8. Résoudre une occurrence : la copie suivie, la consommation, le report ─────────────── */

/* Une occurrence PRÉPARÉE se ferme par son statut. Ses lignes ont pu être
   ajustées après le lancement (« Ajuster mardi 8 ») : on les remet à la
   copie que le journal de CE lancement a suivie, emplacement par
   emplacement. Sans journal, rien n'est touché. */
create or replace function public.restaurer_copie_suivie(p_intention uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  i      record;
  v_exos jsonb;
  n      integer;
begin
  select id, user_id, lancement_id into i from public.intentions_entrainement where id = p_intention;
  if i.lancement_id is null then return false; end if;
  select exercises into v_exos from public.workout_sessions
   where user_id = i.user_id and lancement_id = i.lancement_id;
  if v_exos is null or jsonb_typeof(v_exos) <> 'array' then return false; end if;

  with suivie as (
    select (e.n - 1)::smallint as emplacement,
           nullif(e.ex->'prescription'->>'cible_id', '')::uuid as cid,
           e.ex->'prescription'->>'cle' as cle,
           substring(e.ex->>'reps' from '[0-9]+')::smallint as reps
      from jsonb_array_elements(v_exos) with ordinality as e(ex, n)
  )
  update public.occurrence_exercices oe
     set cible_id = c.id,
         charge_cible = c.charge,
         charge_origine = case when c.charge is null then 'aucune' else 'acceptee' end,
         reps_cible = coalesce(s.reps, oe.reps_cible)
    from suivie s
    left join public.cibles_acceptees c on c.id = s.cid and c.user_id = i.user_id
   where oe.intention_id = i.id and oe.emplacement = s.emplacement
     and oe.mesure = 'reps' and s.cle = oe.exercice_cle
     and (oe.cible_id is distinct from c.id or oe.charge_cible is distinct from c.charge
          or oe.reps_cible is distinct from coalesce(s.reps, oe.reps_cible))
     and (c.id is null or (c.exercice_cle = oe.exercice_cle and c.charge_type is not distinct from oe.charge_type));
  get diagnostics n = row_count;
  if n > 0 then
    perform set_config('vaiiya.reprojection', 'on', true);
    update public.intentions_entrainement
       set exercise_list = public.projeter_prescription((
             select jsonb_agg(to_jsonb(oe)) from public.occurrence_exercices oe where oe.intention_id = i.id))
     where id = i.id;
    perform set_config('vaiiya.reprojection', '', true);
  end if;
  return true;
end;
$$;
revoke all on function public.restaurer_copie_suivie(uuid) from public, anon, authenticated;

/* Faite : les versions que ses lignes ont suivies sont consommées. */
create or replace function public.consommer_cibles(p_intention uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cibles_acceptees c set consommee_le = now()
   where c.consommee_le is null
     and c.id in (select oe.cible_id from public.occurrence_exercices oe
                   where oe.intention_id = p_intention and oe.cible_id is not null)
     and exists (select 1 from public.intentions_entrainement i
                  where i.id = p_intention and i.statut = 'faite');
$$;
revoke all on function public.consommer_cibles(uuid) from public, anon, authenticated;

/* Une occurrence résolue (faite sans la suivre, ou passée) ne garde pas
   une version qui la visait : celle-ci passe à l'occurrence suivante de
   l'étape. Jamais à toutes les suivantes, jamais en arrière. */
create or replace function public.reporter_cibles(p_programme uuid, p_etape uuid, p_rang integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r integer;
begin
  if not exists (select 1 from public.cibles_acceptees
                  where programme_id = p_programme and programme_seance_id = p_etape
                    and consommee_le is null and remplacee_le is null and rang_vise <= p_rang) then
    return;
  end if;
  r := public.rang_suivant(p_programme, p_etape);
  if r is null or r <= p_rang then return; end if;
  update public.cibles_acceptees set rang_vise = r
   where programme_id = p_programme and programme_seance_id = p_etape
     and consommee_le is null and remplacee_le is null and rang_vise <= p_rang;
end;
$$;
revoke all on function public.reporter_cibles(uuid, uuid, integer) from public, anon, authenticated;

/* ⚠️ EN FIN DE TRANSACTION. Une étape libre se ferme en écrivant
   l'intention PUIS ses lignes : on attend qu'elles soient là pour savoir
   ce qu'elles ont suivi. L'ordre compte : la copie, la consommation, le
   report de ce qui reste. */
create or replace function public.cibles_suivent_intention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i record;
begin
  select id, statut, programme_id, etape_consommee_id, rang into i
    from public.intentions_entrainement where id = new.id;
  if i.id is null or i.statut not in ('faite', 'passee') then return null; end if;
  if i.statut = 'faite' then
    perform public.restaurer_copie_suivie(i.id);
    perform public.consommer_cibles(i.id);
  end if;
  if i.programme_id is not null and i.etape_consommee_id is not null and i.rang is not null then
    perform public.reporter_cibles(i.programme_id, i.etape_consommee_id, i.rang);
  end if;
  return null;
end;
$$;
drop trigger if exists intentions_consomment_cibles on public.intentions_entrainement;
create constraint trigger intentions_consomment_cibles
  after insert or update of statut on public.intentions_entrainement
  deferrable initially deferred
  for each row execute function public.cibles_suivent_intention();

/* La version d'avant le tour 30 consommait aussi à l'écriture des lignes :
   le déclencheur différé ci-dessus la remplace. */
drop trigger if exists occurrence_consomme_cibles on public.occurrence_exercices;
drop function if exists public.cibles_suivent_lignes();


/* ─────────────── 9. Le journal écrit la marge ─────────────── */

/* Identique à R3, plus `marge`. Un journal d'avant R4 ne la porte pas. */
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


/* ─────────────── 10. Corriger la marge après coup ─────────────── */

/* Elle décrit la DERNIÈRE série d'un repère de cette séance. Rien d'autre
   ne bouge : une cible déjà acceptée reste telle quelle. */
create or replace function public.corriger_marge(p_lancement uuid, p_emplacement smallint, p_marge text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if p_marge is null or p_marge not in ('aucune', '1_2', '3_plus', 'inconnue') then
    raise exception 'marge_invalide' using errcode = '22023';
  end if;
  select s.id into v_id
    from public.series_realisees s
    join public.workout_sessions w on w.id = s.workout_session_id
   where w.user_id = v_user and w.lancement_id = p_lancement
     and s.user_id = v_user and s.emplacement = p_emplacement
   order by s.serie desc
   limit 1;
  if v_id is null then
    return jsonb_build_object('resultat', 'introuvable');
  end if;
  update public.series_realisees set marge = p_marge
   where id = v_id and statut_prescrit = 'repere' and statut = 'terminee';
  if not found then
    return jsonb_build_object('resultat', 'pas_un_repere');
  end if;
  return jsonb_build_object('resultat', 'ok');
end;
$$;
revoke all on function public.corriger_marge(uuid, smallint, text) from public, anon;
grant execute on function public.corriger_marge(uuid, smallint, text) to authenticated;


/* ─────────────── 11. Accepter une proposition ─────────────── */

/* La source se RELIT en base depuis le lancement : la séance, son
   occurrence faite, la ligne prescrite de cet emplacement, et la marge
   de sa dernière série. Rien de ce que l'appareil affirme sur
   l'exercice, sa fourchette ou son rang n'est cru sur parole.

   ⚠️ LA MARGE ET L'ACCEPTATION VONT ENSEMBLE (tour 30). L'appareil envoie
   la marge d'où vient la proposition : elle s'écrit dans la même
   transaction, et la base refuse d'accepter si la marge enregistrée ne
   l'autorise pas.

   ⚠️ UNE VERSION PAR ACCEPTATION, VISANT UNE OCCURRENCE. Accepter de
   nouveau remplace la version ouverte sans la modifier, et la nouvelle
   vise la prochaine occurrence de l'étape selon R6 (`rang_suivant`). */
create or replace function public.accepter_cible(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_lancement uuid := nullif(p->>'lancement_id', '')::uuid;
  v_empl      smallint := (p->>'emplacement')::smallint;
  v_charge    numeric := nullif(p->>'charge', '')::numeric;
  v_reps      integer := (p->>'reps_cible')::integer;
  v_cran      numeric := nullif(p->>'cran', '')::numeric;
  v_marge     text := nullif(p->>'marge', '');
  v_appliquer uuid := nullif(p->>'appliquer_a', '')::uuid;
  v_session   uuid;
  v_int       record;
  v_ligne     record;
  v_vise      integer;
  v_cible     uuid;
  v_prep      record;
  v_derniere  record;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if v_marge is not null and v_marge not in ('aucune', '1_2', '3_plus', 'inconnue') then
    raise exception 'marge_invalide' using errcode = '22023';
  end if;

  select id into v_session from public.workout_sessions
   where user_id = v_user and lancement_id = v_lancement;
  if v_session is null then return jsonb_build_object('resultat', 'seance_introuvable'); end if;

  select id, programme_id, etape_consommee_id, rang into v_int
    from public.intentions_entrainement
   where user_id = v_user and lancement_id = v_lancement and statut = 'faite'
     and programme_id is not null and etape_consommee_id is not null and rang is not null;
  if v_int.id is null then return jsonb_build_object('resultat', 'hors_programme'); end if;

  select exercice_cle, charge_type, reps_min, reps_max, statut, mesure into v_ligne
    from public.occurrence_exercices
   where intention_id = v_int.id and emplacement = v_empl;
  if v_ligne.exercice_cle is null or v_ligne.statut <> 'repere' or v_ligne.mesure <> 'reps' then
    return jsonb_build_object('resultat', 'pas_un_repere');
  end if;

  if v_reps is null or v_reps < v_ligne.reps_min or v_reps > v_ligne.reps_max then
    raise exception 'reps_invalides' using errcode = '22023';
  end if;
  if v_ligne.charge_type in ('totale', 'par_haltere', 'assistance') then
    if v_charge is not null and v_charge <= 0 then raise exception 'charge_invalide' using errcode = '22023'; end if;
  elsif v_charge is not null then
    raise exception 'charge_sans_kilos' using errcode = '22023';
  end if;

  /* La marge : celle que l'appareil a vue, écrite ici, puis vérifiée. */
  select s.id, s.marge into v_derniere
    from public.series_realisees s
   where s.workout_session_id = v_session and s.user_id = v_user and s.emplacement = v_empl
     and s.statut_prescrit = 'repere' and s.statut = 'terminee'
   order by s.serie desc limit 1;
  if v_derniere.id is not null and v_marge is not null then
    update public.series_realisees set marge = v_marge where id = v_derniere.id;
    v_derniere.marge := v_marge;
  end if;
  if v_derniere.id is null or v_derniere.marge is null or v_derniere.marge not in ('1_2', '3_plus') then
    return jsonb_build_object('resultat', 'marge_non_confirmee');
  end if;

  /* L'occurrence visée, par les règles R6. */
  v_vise := public.rang_suivant(v_int.programme_id, v_int.etape_consommee_id);
  if v_vise is null or v_vise <= v_int.rang then
    return jsonb_build_object('resultat', 'occurrence_introuvable');
  end if;

  /* Cette occurrence est-elle déjà préparée ? On la verrouille : son état
     se revérifie ici, dans la transaction qui l'ajusterait. */
  select i.id, i.date into v_prep
    from public.intentions_entrainement i
   where i.user_id = v_user and i.programme_id = v_int.programme_id
     and i.etape_consommee_id = v_int.etape_consommee_id
     and i.rang = v_vise and i.statut = 'prevue'
   for update;
  if v_prep.id is not null and v_appliquer is distinct from v_prep.id then
    return jsonb_build_object('resultat', 'occurrence_preparee', 'intention_id', v_prep.id, 'date', v_prep.date);
  end if;
  if v_prep.id is null and v_appliquer is not null then
    /* L'occurrence annoncée a été faite, passée ou retirée entre-temps. */
    return jsonb_build_object('resultat', 'occurrence_changee');
  end if;

  update public.cibles_acceptees set remplacee_le = now()
   where user_id = v_user and programme_id = v_int.programme_id
     and programme_seance_id = v_int.etape_consommee_id and exercice_cle = v_ligne.exercice_cle
     and consommee_le is null and remplacee_le is null;
  insert into public.cibles_acceptees (
    user_id, programme_id, programme_seance_id, exercice_cle, charge_type, charge,
    reps_cible, reps_min, reps_max, rang_source, rang_vise, workout_session_id
  ) values (
    v_user, v_int.programme_id, v_int.etape_consommee_id, v_ligne.exercice_cle, v_ligne.charge_type, v_charge,
    v_reps, v_ligne.reps_min, v_ligne.reps_max, v_int.rang, v_vise, v_session
  )
  returning id into v_cible;

  if v_cran is not null and v_cran > 0 and v_ligne.charge_type in ('totale', 'par_haltere', 'assistance') then
    insert into public.crans_exercice (user_id, exercice_cle, charge_type, cran)
    values (v_user, v_ligne.exercice_cle, v_ligne.charge_type, v_cran)
    on conflict (user_id, exercice_cle, charge_type) do update set cran = excluded.cran, maj_le = now();
  end if;

  if v_prep.id is not null then
    update public.occurrence_exercices
       set reps_cible = v_reps, charge_cible = v_charge,
           charge_origine = case when v_charge is null then 'aucune' else 'acceptee' end,
           cible_id = v_cible
     where intention_id = v_prep.id and mesure = 'reps'
       and exercice_cle = v_ligne.exercice_cle
       and charge_type is not distinct from v_ligne.charge_type
       and reps_min = v_ligne.reps_min and reps_max = v_ligne.reps_max;
    perform set_config('vaiiya.reprojection', 'on', true);
    update public.intentions_entrainement
       set exercise_list = public.projeter_prescription((
             select jsonb_agg(to_jsonb(oe)) from public.occurrence_exercices oe where oe.intention_id = v_prep.id)),
           updated_at = now()
     where id = v_prep.id;
    perform set_config('vaiiya.reprojection', '', true);
  end if;

  return jsonb_build_object('resultat', 'ok', 'cible_id', v_cible, 'applique_a', v_prep.id, 'rang_vise', v_vise);
end;
$$;
revoke all on function public.accepter_cible(jsonb) from public, anon;
grant execute on function public.accepter_cible(jsonb) to authenticated;

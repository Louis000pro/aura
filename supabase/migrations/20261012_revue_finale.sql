/* ════════════════════════════════════════════════════════════════════
   REVUE FINALE (Codex, sur bc38de8) · les raccords

   Rejouable (create or replace). Après toutes les migrations R1 → R7.

   1. `projeter_prescription` porte l'EMPLACEMENT de chaque ligne dans sa
      prescription : une version courte compacte le tableau du tunnel,
      l'index cesse alors d'identifier la ligne. Le journal, la marge et
      l'acceptation n'utilisent plus que celui-ci (`emplacementDe`).
   2. `accepter_cible` refuse une hausse calculée sur une ligne qui a
      perdu des séries par rapport à son modèle (`version_reduite`).
   3. `activer_programme` vérifie l'état APPROUVÉ des réservations, sous
      verrou, et reconnaît son propre rejeu (`activation_id`).
   4. `retirer_le_jour` et `deplacer_reservation` : les gestes en une
      transaction.
   5. `occurrence_exercices.series_completes` : la preuve de la version
      complète, même sans modèle écrit (`ecrire_occurrence` la pose).
   6. `restaurer_copie_suivie` lit l'emplacement explicite du journal.
   ════════════════════════════════════════════════════════════════════ */


/* ─────────────── 1. La projection porte l'emplacement ─────────────── */

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
        'emplacement', (l->>'emplacement')::int,
        'cle', l->>'exercice_cle',
        'fonction', l->>'fonction',
        'statut', l->>'statut',
        'reps_min', (l->>'reps_min')::int,
        'reps_max', (l->>'reps_max')::int,
        'charge_type', l->>'charge_type'
      ) || case when nullif(l->>'cible_id', '') is not null
                then jsonb_build_object('charge_cible', (l->>'charge_cible')::numeric, 'cible_id', l->>'cible_id')
                else '{}'::jsonb end
        /* Vérification finale · la marque de réduction suit la ligne, qu'on
           projette les lignes envoyées (`reduite`) ou celles relues en base
           (`series_completes`). */
        || case when coalesce((l->>'reduite')::boolean, false)
                  or coalesce((l->>'series_completes')::int > (l->>'series')::int, false)
                then jsonb_build_object('reduite', true) else '{}'::jsonb end
    )
    || case when l->>'mesure' = 'duree' then jsonb_build_object('auto', (l->>'duree_s')::int) else '{}'::jsonb end
    order by (l->>'emplacement')::int
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) as l;
$$;


/* ─────────────── 2. Une version réduite ne propose pas de hausse ─────────────── */

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
  v_real      record;
  v_reglable  boolean;
  v_modele_occ uuid;
  v_series_modele smallint;
  v_series_completes smallint;
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

  select exercice_cle, charge_type, reps_min, reps_max, reps_cible, series, statut, mesure into v_ligne
    from public.occurrence_exercices
   where intention_id = v_int.id and emplacement = v_empl;
  if v_ligne.exercice_cle is null or v_ligne.statut is distinct from 'repere' or v_ligne.mesure is distinct from 'reps'
     or v_ligne.reps_min is null or v_ligne.reps_max is null or v_ligne.reps_cible is null or v_ligne.series is null then
    return jsonb_build_object('resultat', 'pas_un_repere');
  end if;

  /* Revue finale (P1) · une ligne qui a perdu des séries par rapport à
     sa version COMPLÈTE (courte R8, plus légère R7) ne propose rien : la
     hausse viserait un volume plus grand que celui qui a été fait. Deux
     preuves, et il en faut au moins une :
     · `series_completes`, posée à l'écriture de l'occurrence (vérification
       finale) : elle vaut même quand le modèle du lieu n'a pas été écrit ;
     · le MODÈLE écrit, au même emplacement (les repères ne varient jamais).
     Sans aucune des deux, la comparabilité avec la version complète n'est
     pas établie : on refuse, on ne devine pas. */
  select oe.modele_id, oe.series_completes into v_modele_occ, v_series_completes
    from public.occurrence_exercices oe
   where oe.intention_id = v_int.id and oe.emplacement = v_empl;
  if v_series_completes is not null and v_ligne.series < v_series_completes then
    return jsonb_build_object('resultat', 'version_reduite');
  end if;
  if v_modele_occ is not null then
    select ee.series into v_series_modele
      from public.etape_exercices ee
     where ee.modele_id = v_modele_occ and ee.emplacement = v_empl;
    if v_series_modele is not null and v_ligne.series < v_series_modele then
      return jsonb_build_object('resultat', 'version_reduite');
    end if;
  end if;
  if v_series_completes is null and v_series_modele is null then
    return jsonb_build_object('resultat', 'non_comparable');
  end if;

  if v_reps is null or v_reps < v_ligne.reps_min or v_reps > v_ligne.reps_max then
    raise exception 'reps_invalides' using errcode = '22023';
  end if;
  if v_ligne.charge_type in ('totale', 'par_haltere', 'assistance') then
    if v_charge is not null and v_charge <= 0 then raise exception 'charge_invalide' using errcode = '22023'; end if;
  elsif v_charge is not null then
    raise exception 'charge_sans_kilos' using errcode = '22023';
  end if;

  /* La réalisation ENTIÈRE, relue en base (tour 31) : exactement les
     critères de `prochaineCible`. Toutes les séries prévues, de 1 à n,
     terminées par le bouton, sur la même clé réelle et le même type, avec
     des répétitions déclarées, une seule charge connue (aucune au poids
     du corps), la fourchette prescrite, et toutes au moins à la cible.
     Chaque comparaison REFUSE l'inconnu (tour 32) : `bool_and` ignore les
     NULL, donc une seule série à clé, fourchette ou validation inconnue
     passerait si les autres disent vrai. D'où `is not distinct from` et
     `coalesce(…, false)` DANS l'agrégat, jamais seulement autour. */
  v_reglable := v_ligne.charge_type in ('totale', 'par_haltere', 'assistance');
  select count(*)::integer as n,
         coalesce(min(s.serie) = 1 and max(s.serie) = count(*) and count(distinct s.serie) = count(*), false) as suite,
         coalesce(bool_and(coalesce(s.statut = 'terminee' and s.validation = 'bouton', false)), false) as faites,
         coalesce(bool_and(s.exercice_cle is not distinct from v_ligne.exercice_cle), false) as meme_cle,
         coalesce(bool_and(s.charge_type is not distinct from v_ligne.charge_type), false) as meme_type,
         coalesce(bool_and(s.reps_min_prescrites is not distinct from v_ligne.reps_min and s.reps_max_prescrites is not distinct from v_ligne.reps_max), false) as meme_fourchette,
         coalesce(bool_and(s.reps_declarees is not null), false) as reps_connues,
         coalesce(bool_and(coalesce(s.reps_declarees >= v_ligne.reps_cible, false)), false) as a_la_cible,
         coalesce(bool_and(coalesce(s.reps_declarees >= v_ligne.reps_max, false)), false) as au_haut,
         count(distinct s.charge)::integer as charges,
         coalesce(bool_and(s.charge is not null), false) as charges_connues,
         coalesce(bool_and(s.charge is null), false) as sans_charge,
         min(s.charge) as charge
    into v_real
    from public.series_realisees s
   where s.workout_session_id = v_session and s.user_id = v_user and s.emplacement = v_empl;
  if v_real.n <> v_ligne.series or not v_real.suite or not v_real.faites or not v_real.meme_cle
     or not v_real.meme_type or not v_real.meme_fourchette or not v_real.reps_connues
     or (v_reglable and not (v_real.charges_connues and v_real.charges = 1))
     or (not v_reglable and not v_real.sans_charge) then
    return jsonb_build_object('resultat', 'non_comparable');
  end if;
  if not v_real.a_la_cible then
    return jsonb_build_object('resultat', 'proposition_invalide');
  end if;
  /* Ce qu'on accepte doit être la proposition que cette réalisation ouvre. */
  if v_real.au_haut then
    /* Une charge au haut de fourchette partout : une hausse, aux reps du bas. */
    if not v_reglable or v_charge is null or v_reps <> v_ligne.reps_min
       or (v_ligne.charge_type = 'assistance' and v_charge >= v_real.charge)
       or (v_ligne.charge_type <> 'assistance' and v_charge <= v_real.charge) then
      return jsonb_build_object('resultat', 'proposition_invalide');
    end if;
  elsif v_reps <> least(v_ligne.reps_cible + 1, v_ligne.reps_max) or v_charge is distinct from v_real.charge then
    /* Dans la fourchette : une répétition de plus, à la même charge. */
    return jsonb_build_object('resultat', 'proposition_invalide');
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

  /* L'occurrence visée, par les règles R6, SOUS LE VERROU DE PROGRAMME DE
     R6 (tour 31), tenu jusqu'à la fin de la transaction. Une fermeture de
     cette étape (`attribuer_rang` à l'écriture, le report en fin de
     transaction) prend le même : l'acceptation calcule son rang après
     elle, ou la fermeture reporte la version écrite avant elle. Jamais
     une version ouverte sur une occurrence déjà résolue. */
  perform pg_advisory_xact_lock(hashtextextended(v_int.programme_id::text, 6));
  v_vise := public.rang_suivant(v_int.programme_id, v_int.etape_consommee_id);
  if v_vise is null or v_vise <= v_int.rang then
    return jsonb_build_object('resultat', 'occurrence_introuvable');
  end if;

  /* Cette occurrence est-elle déjà préparée ? On la verrouille : son état
     se revérifie ici, dans la transaction qui l'ajusterait.
     ⚠️ SANS ATTENDRE : une fermeture par statut verrouille la ligne PUIS
     prend le verrou de programme en fin de transaction ; l'attendre ici,
     verrou de programme tenu, croiserait les deux. Une ligne occupée
     répond `occurrence_occupee`, et on réessaie. */
  begin
    select i.id, i.date into v_prep
      from public.intentions_entrainement i
     where i.user_id = v_user and i.programme_id = v_int.programme_id
       and i.etape_consommee_id = v_int.etape_consommee_id
       and i.rang = v_vise and i.statut = 'prevue'
     for update nowait;
  exception when lock_not_available then
    return jsonb_build_object('resultat', 'occurrence_occupee');
  end;
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



/* ─────────────── 3. L'activation vérifie ce qu'elle a montré, et se reconnaît ─────────────── */

/* L'identité d'une activation : la même demande rejouée après une
   réponse perdue rend la version qu'elle a créée, jamais une seconde. */
alter table public.programmes add column if not exists activation_id uuid;
create unique index if not exists uniq_programme_activation
  on public.programmes (user_id, activation_id) where activation_id is not null;

/* Reprend `20261010_r9c_activer_programme.sql` (avec la branche R7 des
   lignes par occurrence), plus :
   · `activation_id` obligatoire, rejeu reconnu sous verrou ;
   · chaque réservation verrouillée (`for update`) et comparée à l'état
     APPROUVÉ (date, rang, étape) : sinon `apercu_perime` ;
   · une réservation montrée qui a disparu : `apercu_perime`. */
create or replace function public.activer_programme(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_ancien   uuid := nullif(p->>'ancien_id', '')::uuid;
  v_actif    uuid;
  v_nouveau  uuid;
  v_etapes   jsonb := coalesce(p->'etapes', '[]'::jsonb);
  v_choix    jsonb := coalesce(p->'choix', '{}'::jsonb);
  v_ctx      jsonb := coalesce(p->'contexte', '{}'::jsonb);
  e          jsonb;
  r          record;
  v_etape_id uuid;
  v_modele   uuid;
  v_ids      jsonb := '{}'::jsonb;
  v_modeles  jsonb := '{}'::jsonb;
  v_lignes   jsonb;
  v_rep      jsonb;
  v_res      jsonb;
  v_n        integer;
  v_activation uuid := nullif(p->>'activation_id', '')::uuid;
  v_deja     uuid;
  v_app      jsonb;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if v_activation is null then raise exception 'activation_sans_identite' using errcode = '22023'; end if;

  /* Revue finale · une activation à la fois par personne, et son rejeu
     reconnu SOUS le verrou : deux envois identiques ne peuvent ni créer
     deux versions, ni répondre « programme changé » au second. */
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 31));
  select id into v_deja from public.programmes
   where user_id = v_user and activation_id = v_activation;
  if v_deja is not null then
    return jsonb_build_object(
      'resultat', 'ok', 'deja', true, 'programme_id', v_deja,
      'etapes', coalesce((select jsonb_object_agg(position::text, id) from public.programme_seances where programme_id = v_deja), '{}'::jsonb));
  end if;
  v_n := jsonb_array_length(v_etapes);
  if v_n < 1 or v_n > 6 then raise exception 'etapes_invalides' using errcode = '22023'; end if;
  if coalesce(p->>'nom', '') = '' then raise exception 'nom_manquant' using errcode = '22023'; end if;

  /* La version active, verrouillée : deux activations simultanées ne
     peuvent pas toutes les deux croire remplacer la même. */
  select id into v_actif from public.programmes
   where user_id = v_user and statut = 'actif'
   for update;
  if v_actif is distinct from v_ancien then
    return jsonb_build_object('resultat', 'programme_change');
  end if;

  /* Chaque réservation en attente de l'ancienne version a sa réponse. */
  if v_actif is not null then
    v_n := 0;
    for r in
      select id, date, rang, etape_consommee_id from public.intentions_entrainement
       where user_id = v_user and programme_id = v_actif
         and statut = 'prevue' and etape_consommee_id is not null
       for update
    loop
      v_n := v_n + 1;
      if coalesce(v_choix->r.id::text->>'choix', '') not in ('garder', 'remplacer', 'retirer') then
        return jsonb_build_object('resultat', 'choix_incomplets');
      end if;
      if v_choix->r.id::text->>'choix' = 'remplacer' and r.date is null then
        return jsonb_build_object('resultat', 'choix_incomplets');
      end if;
      /* Revue finale · la réservation est-elle encore celle que l'aperçu
         a montrée ? Déplacée, renumérotée ou rattachée ailleurs depuis :
         on n'écrit rien, il faut revoir l'aperçu. */
      v_app := v_choix->r.id::text->'approuve';
      if v_app is null or jsonb_typeof(v_app) <> 'object'
         or nullif(v_app->>'date', '')::date is distinct from r.date
         or nullif(v_app->>'rang', '')::int is distinct from r.rang
         or nullif(v_app->>'etape', '')::uuid is distinct from r.etape_consommee_id then
        return jsonb_build_object('resultat', 'apercu_perime');
      end if;
    end loop;
    /* Une réservation montrée qui n'existe plus (faite, retirée) : l'aperçu
       décrivait autre chose que ce qui serait écrit. */
    if (select count(*) from jsonb_object_keys(v_choix)) <> v_n then
      return jsonb_build_object('resultat', 'apercu_perime');
    end if;
  end if;

  /* 1. L'ancienne version s'archive ; ses adaptations se ferment. */
  if v_actif is not null then
    update public.programmes set statut = 'archive', archive_le = now() where id = v_actif;
    update public.adaptations_entrainement
       set statut = 'terminee', fermee_le = now()
     where user_id = v_user and programme_id = v_actif and statut = 'active';
  end if;

  /* 2. La nouvelle version : elle commence à sa première étape. */
  insert into public.programmes (user_id, nom, intention, statut, origine, position_initiale, rang_depart, activation_id)
  values (v_user, left(p->>'nom', 120), nullif(left(p->>'intention', 200), ''), 'actif', 'utilisateur', 1, 1, v_activation)
  returning id into v_nouveau;

  /* 3. Son cycle, et le modèle de chaque étape au lieu connu. */
  for e in select * from jsonb_array_elements(v_etapes) loop
    insert into public.programme_seances (programme_id, position, nom, nature, duree_min, origine)
    values (v_nouveau, (e->>'position')::int, left(e->>'nom', 80), 'seance', null, 'utilisateur')
    returning id into v_etape_id;
    v_ids := v_ids || jsonb_build_object(e->>'position', v_etape_id);
    v_res := public.ecrire_modele(jsonb_build_object(
      'programme_seance_id', v_etape_id,
      'lieu', v_ctx->>'lieu',
      'orientation', v_ctx->>'orientation',
      'niveau', v_ctx->>'niveau',
      'version', v_ctx->>'version',
      'lignes', e->'lignes'
    ));
    v_modeles := v_modeles || jsonb_build_object(e->>'position', v_res->>'id');
  end loop;

  /* 4. Les réservations de l'ancienne version, une par une. */
  if v_actif is not null then
    for r in
      select id, date from public.intentions_entrainement
       where user_id = v_user and programme_id = v_actif
         and statut = 'prevue' and etape_consommee_id is not null
       order by date nulls last, id
    loop
      v_rep := v_choix->r.id::text;
      continue when v_rep->>'choix' = 'garder';
      delete from public.intentions_entrainement where id = r.id and user_id = v_user and statut = 'prevue';
      continue when v_rep->>'choix' = 'retirer';

      /* remplacer : l'occurrence du nouveau programme, à ce jour. */
      v_etape_id := nullif(v_ids->>(v_rep->>'position'), '')::uuid;
      if v_etape_id is null then raise exception 'position_inconnue' using errcode = '22023'; end if;
      v_modele := nullif(v_modeles->>(v_rep->>'position'), '')::uuid;
      /* R7 · les lignes PROPRES à cette occurrence (sa variété, selon son
         rang), sinon celles du modèle de l'étape. */
      if jsonb_typeof(v_rep->'lignes') = 'array' then
        v_lignes := v_rep->'lignes';
      else
        select x->'lignes' into v_lignes from jsonb_array_elements(v_etapes) x
         where (x->>'position') = (v_rep->>'position');
      end if;
      v_res := public.ecrire_occurrence(jsonb_build_object(
        'intention', jsonb_build_object(
          'programme_id', v_nouveau,
          'etape_consommee_id', v_etape_id,
          'programme_seance_id', v_etape_id,
          'rang', (v_rep->>'rang')::int,
          'statut', 'prevue',
          'date', r.date,
          'type', coalesce(v_rep->>'type', 'Force'),
          'title', coalesce(v_rep->>'titre', ''),
          'difficulty', 'Intermédiaire',
          'location', v_ctx->>'location',
          'origine', 'utilisateur'
        ),
        'modele_id', v_modele,
        'lignes', v_lignes
      ));
      if v_res->>'resultat' is distinct from 'ok' then
        raise exception 'remplacement_impossible: %', v_res using errcode = '23505';
      end if;
    end loop;
  end if;

  return jsonb_build_object('resultat', 'ok', 'programme_id', v_nouveau, 'etapes', v_ids);
end;
$$;

revoke all on function public.activer_programme(jsonb) from public, anon;
grant execute on function public.activer_programme(jsonb) to authenticated;


/* ─────────────── 4. Les gestes de la semaine, tout ou rien ─────────────── */

/* « Pas d'entraînement ce jour-là » : retirer la réservation du jour ET
   poser l'exception, dans la même transaction. Une réservation qui n'est
   plus là (déplacée, faite) rend `changee` et RIEN n'est écrit : plus de
   compensation côté client qui pouvait elle-même échouer. */
create or replace function public.retirer_le_jour(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_date date := (p->>'date')::date;
  v_resa uuid := nullif(p->>'reservation_id', '')::uuid;
  v_n    integer;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  if v_date is null then raise exception 'date_manquante' using errcode = '22023'; end if;
  if v_resa is not null then
    delete from public.intentions_entrainement
     where id = v_resa and user_id = v_user and date = v_date and statut = 'prevue';
    get diagnostics v_n = row_count;
    if v_n = 0 then return jsonb_build_object('resultat', 'changee'); end if;
  end if;
  insert into public.exceptions_jour (user_id, date, genre)
  values (v_user, v_date, 'pas_de_seance')
  on conflict (user_id, date) do update set genre = excluded.genre;
  return jsonb_build_object('resultat', 'ok');
end;
$$;
revoke all on function public.retirer_le_jour(jsonb) from public, anon;
grant execute on function public.retirer_le_jour(jsonb) to authenticated;

/* « Changer de jour » d'une réservation : la date ne bouge que si la
   ligne est ENCORE celle de l'écran (date, statut, programme, étape,
   rang), et la règle repos/séance du jour d'arrivée s'applique dans la
   même transaction. */
create or replace function public.deplacer_reservation(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid := (p->>'id')::uuid;
  v_de   date := (p->>'de')::date;
  v_vers date := (p->>'vers')::date;
  v_n    integer;
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
  update public.intentions_entrainement
     set date = v_vers, updated_at = now()
   where id = v_id and user_id = v_user and date = v_de and statut = 'prevue'
     and programme_id = nullif(p->>'programme_id', '')::uuid
     and etape_consommee_id = nullif(p->>'etape_id', '')::uuid
     and rang is not distinct from nullif(p->>'rang', '')::int;
  get diagnostics v_n = row_count;
  if v_n = 0 then return jsonb_build_object('resultat', 'changee'); end if;
  /* La règle du jour : un repos encore prévu ce jour-là s'en va. */
  delete from public.intentions_entrainement
   where user_id = v_user and date = v_vers and id <> v_id
     and statut = 'prevue' and nature = 'repos';
  return jsonb_build_object('resultat', 'ok');
end;
$$;
revoke all on function public.deplacer_reservation(jsonb) from public, anon;
grant execute on function public.deplacer_reservation(jsonb) to authenticated;


/* ─────────────── 5. La preuve de la version complète (vérification finale) ───────────────

   `version_reduite` comparait la ligne à son MODÈLE écrit. Or R2 autorise
   une occurrence sans modèle (le modèle du lieu composé en mémoire) : la
   garde ne s'appliquait pas. Chaque ligne garde donc, à l'écriture, le
   nombre de séries de sa version COMPLÈTE. Les lignes d'avant restent
   nulles : sans modèle, elles ne proposent plus rien (comparabilité non
   établie), avec modèle la comparaison au modèle tient toujours. */
alter table public.occurrence_exercices add column if not exists series_completes smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'occurrence_series_completes_check') then
    alter table public.occurrence_exercices add constraint occurrence_series_completes_check
      check (series_completes is null or series_completes between series and 12);
  end if;
end $$;

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
    charge_cible, charge_origine, cible_id, series_completes
  )
  select v_id, v_user, v_modele, l.emplacement, l.exercice_cle, left(l.exercice_nom, 120), l.fonction, l.statut,
         l.series, l.mesure, l.reps_min, l.reps_max, l.reps_cible, l.duree_s, l.repos_s, l.transition_s,
         l.charge_type, coalesce(l.unite, ''),
         l.charge_cible, coalesce(l.charge_origine, 'aucune'), l.cible_id,
         /* Vérification finale · la preuve de la version complète. Une
            ligne réduite sans son nombre complet (ou avec un nombre qui ne
            dépasse pas le sien) reste SANS preuve : `accepter_cible`
            refusera, il ne devinera pas. */
         case when coalesce(l.reduite, false)
              then case when l.series_completes > l.series and l.series_completes <= 12 then l.series_completes end
              else case when l.series_completes between l.series and 12 then l.series_completes else l.series end
         end
    from jsonb_to_recordset(v_lignes) as l(
      emplacement smallint, exercice_cle text, exercice_nom text, fonction text, statut text,
      series smallint, mesure text, reps_min smallint, reps_max smallint, reps_cible smallint,
      duree_s integer, repos_s integer, transition_s integer, charge_type text, unite text,
      charge_cible numeric, charge_origine text, cible_id uuid,
      reduite boolean, series_completes smallint
    );

  return jsonb_build_object('resultat', 'ok', 'id', v_id, 'rang', v_rang);
end;
$$;

revoke all on function public.ecrire_occurrence(jsonb) from public, anon;
grant execute on function public.ecrire_occurrence(jsonb) to authenticated;


/* ─────────────── 6. La restauration lit l'emplacement du journal ─────────────── */

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
  v_explicite boolean;
begin
  select id, user_id, lancement_id into i from public.intentions_entrainement where id = p_intention;
  if i.lancement_id is null then return false; end if;
  select exercises into v_exos from public.workout_sessions
   where user_id = i.user_id and lancement_id = i.lancement_id;
  if v_exos is null or jsonb_typeof(v_exos) <> 'array' then return false; end if;

  /* Vérification finale · l'emplacement EXPLICITE de chaque exercice
     suivi (projection de la revue). Une version courte compacte la liste :
     l'ordinal n'y désigne plus la ligne. L'ordinal ne sert de repli qu'à
     un journal ANCIEN où aucun exercice ne porte ce champ ; dans un
     journal qui le porte, un exercice sans lui n'est rattaché à rien. */
  v_explicite := exists (
    select 1 from jsonb_array_elements(v_exos) e(ex)
     where jsonb_typeof(e.ex->'prescription'->'emplacement') = 'number');

  with suivie as (
    select case when v_explicite then (e.ex->'prescription'->>'emplacement')::smallint
                else (e.n - 1)::smallint end as emplacement,
           nullif(e.ex->'prescription'->>'cible_id', '')::uuid as cid,
           e.ex->'prescription'->>'cle' as cle,
           substring(e.ex->>'reps' from '[0-9]+')::smallint as reps
      from jsonb_array_elements(v_exos) with ordinality as e(ex, n)
     where not v_explicite or jsonb_typeof(e.ex->'prescription'->'emplacement') = 'number'
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

/* ════════════════════════════════════════════════════════════════════
   R9c · ACTIVER UNE NOUVELLE VERSION DU PROGRAMME, EN UNE TRANSACTION
   (décisions 31 et 32 ; maquette 05 écran 11, maquette 08 écran 09)

   À coller APRÈS `20261009_r9a_jours_choix.sql`. Rejouable : une seule
   fonction, `create or replace`. Additive : aucune table, aucune colonne,
   aucune donnée touchée par la migration elle-même.

   ⚠️ TOUT OU RIEN. Archiver l'ancienne version, créer la nouvelle, son
   cycle, le modèle de chaque étape, et appliquer le choix fait pour
   chaque réservation encore en attente : si une seule de ces écritures
   échoue, rien n'a eu lieu. Écrit côté client, un échec au milieu
   laisserait une personne sans programme actif, ou avec un programme
   sans cycle.

   ⚠️ RIEN NE S'EFFACE SANS CHOIX (décision 32). Chaque occurrence encore
   réservée de l'ancienne version (prévue, avec une étape) doit avoir
   reçu sa réponse : garder, remplacer ou retirer. Une seule qui manque,
   et la fonction refuse sans rien écrire (`choix_incomplets`).
   · garder : la ligne ne bouge pas ; elle reste prévue à son jour.
   · retirer : elle est supprimée, jamais marquée faite ni passée.
   · remplacer : elle est supprimée, et l'occurrence du NOUVEAU programme
     indiquée par le client (rang, position) est réservée à ce jour, par
     `ecrire_occurrence` (la même écriture que « Changer de jour »).

   ⚠️ L'ANCIENNE VERSION ATTENDUE. Le client dit quelle version il
   remplace (`ancien_id`, nul s'il n'en avait pas). Si une autre version
   est devenue active entre l'aperçu et le clic, rien ne s'écrit
   (`programme_change`) : l'aperçu ne décrivait plus la réalité.

   ⚠️ LES ADAPTATIONS DE L'ANCIENNE VERSION SE FERMENT. Elles ne
   s'appliquent qu'au programme actif, donc elles cessaient d'agir ; mais
   une adaptation encore « active » occuperait la place unique de sa
   période (`EXCLUDE`) et empêcherait d'adapter la nouvelle version.
   ════════════════════════════════════════════════════════════════════ */

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
begin
  if v_user is null then raise exception 'non_connecte' using errcode = '28000'; end if;
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
    for r in
      select id, date from public.intentions_entrainement
       where user_id = v_user and programme_id = v_actif
         and statut = 'prevue' and etape_consommee_id is not null
    loop
      if coalesce(v_choix->r.id::text->>'choix', '') not in ('garder', 'remplacer', 'retirer') then
        return jsonb_build_object('resultat', 'choix_incomplets');
      end if;
      if v_choix->r.id::text->>'choix' = 'remplacer' and r.date is null then
        return jsonb_build_object('resultat', 'choix_incomplets');
      end if;
    end loop;
  end if;

  /* 1. L'ancienne version s'archive ; ses adaptations se ferment. */
  if v_actif is not null then
    update public.programmes set statut = 'archive', archive_le = now() where id = v_actif;
    update public.adaptations_entrainement
       set statut = 'terminee', fermee_le = now()
     where user_id = v_user and programme_id = v_actif and statut = 'active';
  end if;

  /* 2. La nouvelle version : elle commence à sa première étape. */
  insert into public.programmes (user_id, nom, intention, statut, origine, position_initiale, rang_depart)
  values (v_user, left(p->>'nom', 120), nullif(left(p->>'intention', 200), ''), 'actif', 'utilisateur', 1, 1)
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

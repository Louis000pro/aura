-- ════════════════════════════════════════════════════════════════
--  Le relais EN GROUPE — de 2 à 5 personnes (Louis, 2026-10-07)
--
--  À COLLER APRÈS 20260927_relais_coop.sql. Rejouable sans risque.
--
--  Le relais co-op se généralise sans changer de règle :
--   · chacun grimpe SES 4 maillons, 2 par jour maximum ;
--   · on ne passe au maillon suivant que quand TOUT LE MONDE a fait le
--     maillon en cours (en duo : « les deux », exactement comme avant) ;
--   · l'affiche suit l'avancée commune, et elle est gagnée quand chacun a
--     bouclé ses 4 maillons. Badges pour tous les membres.
--
--  Ce qui change :
--   1. valider_action_defi : le « binôme » devient le plus lent des autres.
--   2. lancer_relais : accepte un fil de 2 à 5 membres (la taille max d'un
--      groupe), et note la taille de l'équipe dans max_membres.
--
--  Ce qui NE change pas : on n'ajoute toujours personne à un fil pendant
--  un relais (ajouter_membres_conversation refuse `relais_en_cours`), et le
--  lien d'invitation pour quelqu'un sans Vaiiya reste un duo.
-- ════════════════════════════════════════════════════════════════


-- ── 1. La validation d'un maillon, en groupe ─────────────────────
CREATE OR REPLACE FUNCTION public.valider_action_defi(p_run_id UUID, p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user       UUID := auth.uid();
  v_run        public.challenge_runs%ROWTYPE;
  v_session    public.workout_sessions%ROWTYPE;
  v_jour       DATE := CURRENT_DATE;
  v_mine       INT;
  v_partdone   INT;
  v_today      INT;
  v_next       INT;
  v_min        INT;
  v_reussi     BOOLEAN;
  v_pseudo     TEXT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT * INTO v_run FROM public.challenge_runs WHERE id = p_run_id;
  IF NOT FOUND OR v_run.statut <> 'en_cours' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_inactif');
  END IF;

  IF NOT public.est_membre_run(p_run_id, v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  IF v_jour < v_run.starts_on OR v_jour > v_run.ends_on THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'hors_fenetre');
  END IF;

  -- La séance doit t'appartenir et venir d'être terminée. Plus de
  -- plancher de 10 min : c'est le relais qui a donné la séance.
  SELECT * INTO v_session FROM public.workout_sessions
   WHERE id = p_session_id AND user_id = v_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'seance_introuvable');
  END IF;
  IF v_session.started_at < NOW() - INTERVAL '3 hours' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'seance_trop_ancienne');
  END IF;

  SELECT COUNT(*) INTO v_mine
    FROM public.challenge_actions WHERE run_id = p_run_id AND user_id = v_user;
  -- En groupe, « le binôme » devient LE PLUS LENT des autres : on ne
  -- passe au maillon suivant que quand TOUT LE MONDE a fait le maillon en
  -- cours. En duo, c'est exactement l'ancienne règle.
  SELECT MIN((SELECT COUNT(*) FROM public.challenge_actions a
               WHERE a.run_id = p_run_id AND a.user_id = m.user_id))
    INTO v_partdone
    FROM public.challenge_run_members m
   WHERE m.run_id = p_run_id AND m.user_id <> v_user;
  -- Personne d'autre (ne devrait pas arriver) : rien ne bloque.
  v_partdone := COALESCE(v_partdone, v_run.target_days);
  SELECT COUNT(*) INTO v_today
    FROM public.challenge_actions
   WHERE run_id = p_run_id AND user_id = v_user AND jour = v_jour;

  -- J'ai déjà bouclé mes 4 maillons.
  IF v_mine >= v_run.target_days THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deja_fini_pour_moi');
  END IF;

  -- 2 maillons par jour maximum.
  IF v_today >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deux_par_jour_max');
  END IF;

  -- LOCKSTEP : pour faire le maillon (mine+1), le binôme doit avoir fait
  -- au moins le maillon `mine` (le maillon en cours). Sinon, bloqué.
  IF v_partdone < v_mine THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'bloque_binome',
                              'mine', v_mine, 'partner', v_partdone);
  END IF;

  v_next := v_mine + 1;

  INSERT INTO public.challenge_actions (run_id, user_id, jour, workout_session_id, maillon)
  VALUES (p_run_id, v_user, v_jour, p_session_id, v_next);

  v_mine := v_next;
  v_min  := LEAST(v_mine, v_partdone);
  v_reussi := (v_mine >= v_run.target_days AND v_partdone >= v_run.target_days);

  SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = v_user;

  -- Le fil raconte, il ne réclame rien et ne nomme aucun retard.
  IF v_run.conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (
      v_run.conversation_id, NULL,
      CASE WHEN v_reussi
        THEN 'L''affiche est complète. Vous avez bouclé les ' || v_run.target_days || ' maillons ensemble.'
        ELSE COALESCE(v_pseudo, 'Quelqu''un') || ' a franchi le maillon ' || v_next || ' sur ' || v_run.target_days || '.'
      END,
      'systeme'
    );
  END IF;

  IF v_reussi THEN
    UPDATE public.challenge_runs SET statut = 'reussi', fini_le = NOW() WHERE id = p_run_id;

    -- Une seule source de récompense : profile_badges. ⚠️ Ne pas remettre
    -- `challenge_rewards` : la table est supprimée depuis 20260830_menage_relais.sql,
    -- et l'insérer ferait échouer la victoire en entier.
    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT m.user_id, 'serie-' || v_run.serie
      FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;

    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT m.user_id, 'premier-relais'
      FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'maillon', v_next,           -- le maillon que je viens de franchir
    'mine', v_mine,              -- mes maillons faits
    'partner', v_partdone,       -- le plus lent des autres (le binôme en duo)
    'min', v_min,                -- l'avancée COMMUNE (ce que l'affiche montre)
    'objectif', v_run.target_days,
    'serie', v_run.serie,
    'reussi', v_reussi,
    'bloque', (v_partdone < v_mine)  -- suis-je maintenant en attente du binôme ?
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.valider_action_defi(UUID, UUID) TO authenticated;


-- ── 2. Lancer un relais dans un duo OU un groupe ─────────────────
CREATE OR REPLACE FUNCTION public.lancer_relais(p_conv UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user    UUID := auth.uid();
  v_membres UUID[];
  v_run     UUID;
  v_m       UUID;
  v_bloc    RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  IF NOT public.est_membre_conversation(p_conv, v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  PERFORM public.fermer_relais_expires();

  SELECT ARRAY(
    SELECT user_id FROM public.conversation_members WHERE conversation_id = p_conv
  ) INTO v_membres;

  -- Un duo ou un groupe : de 2 à 5, la taille maximale d'un fil.
  IF COALESCE(array_length(v_membres, 1), 0) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_peu');
  END IF;
  IF array_length(v_membres, 1) > 5 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_nombreux');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenge_runs
    WHERE conversation_id = p_conv AND statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'relais_deja_ici');
  END IF;

  SELECT m.user_id AS qui, r.conversation_id AS ou, p.pseudo AS pseudo
    INTO v_bloc
    FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    LEFT JOIN public.profiles p ON p.id = m.user_id
   WHERE m.user_id = ANY(v_membres)
     AND r.statut IN ('inscription','en_cours')
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'raison', CASE WHEN v_bloc.qui = v_user THEN 'mon_relais_ailleurs'
                     ELSE 'son_relais_ailleurs' END,
      'qui', v_bloc.pseudo,
      'conversation_id', v_bloc.ou
    );
  END IF;

  INSERT INTO public.challenge_runs (created_by, conversation_id, statut, serie, starts_on, max_membres)
  VALUES (v_user, p_conv, 'en_cours', public.serie_a_jouer(v_membres), CURRENT_DATE,
          array_length(v_membres, 1))
  RETURNING id INTO v_run;

  UPDATE public.challenge_runs
     SET ends_on = starts_on + (window_days - 1)
   WHERE id = v_run;

  FOREACH v_m IN ARRAY v_membres LOOP
    INSERT INTO public.challenge_run_members (run_id, user_id)
    VALUES (v_run, v_m) ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.messages (conversation_id, user_id, contenu, type)
  SELECT p_conv, NULL,
         'Le relais est lancé. Vous grimpez les 4 maillons ensemble : on avance quand '
         || CASE WHEN array_length(v_membres, 1) = 2 THEN 'les deux ont' ELSE 'tout le monde a' END
         || ' fait le maillon. Vous jouez pour '
         || initcap(r.serie) || '.',
         'systeme'
    FROM public.challenge_runs r WHERE r.id = v_run;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'conversation_id', p_conv);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.lancer_relais(UUID) TO authenticated;

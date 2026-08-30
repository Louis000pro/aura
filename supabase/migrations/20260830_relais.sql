-- ════════════════════════════════════════════════════════════════
--  Le relais recousu : vagues 1, 2 et 3
--
--  À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS :
--    20260721_defi_duo.sql
--    20260721_messagerie.sql
--    20260721_messagerie_v2.sql
--    20260721_annuler_relais.sql
--    20260725_messagerie_fiabilite.sql
--  Rejouable sans risque.
--
--  Ce que ce fichier change, et pourquoi :
--
--  1. `creer_defi_duo` NE CRÉE PLUS DE CONVERSATION. C'est la cause du
--     fil qui s'appelait littéralement « Moi » : on créait l'équipe
--     avant d'avoir un équipier. Le fil naît quand quelqu'un rejoint.
--  2. `rejoindre_defi` crée donc la conversation, et l'AMITIÉ dans la
--     foulée : c'est le seul moment où quelqu'un arrive d'Internet dans
--     Vaiiya, il doit finir dans une conversation et pas devant une
--     image, et il doit pouvoir écrire à l'autre après le relais.
--  3. `fermer_relais_expires()` : rien n'écrivait jamais le statut
--     `termine`. Un relais dont la semaine était passée restait
--     `en_cours` À VIE, bloquait tout nouveau relais pour les deux, et
--     l'écran affichait « dernier jour » indéfiniment.
--  4. La SÉRIE tourne. Trois affiches existent depuis juillet, la
--     colonne avait 'sillage' en défaut et personne ne l'écrivait :
--     tout le monde jouait Sillage, toujours, et gagner deux fois
--     rendait exactement ce qu'on possédait déjà.
--  5. Un fil qui porte un relais vivant REFUSE une troisième personne
--     (elle ne pourrait jamais franchir un maillon).
-- ════════════════════════════════════════════════════════════════


-- ── 1. Quand un relais s'est fini ────────────────────────────────
--  Sert à rendre la conversation à elle-même 48 h après une victoire :
--  le sceau et le fond d'affiche tiennent deux jours, puis le visage de
--  l'ami revient dans la liste. L'affiche, elle, est déjà dans la
--  galerie du profil : elle n'est pas perdue.
ALTER TABLE public.challenge_runs
  ADD COLUMN IF NOT EXISTS fini_le TIMESTAMPTZ;

UPDATE public.challenge_runs
   SET fini_le = COALESCE(fini_le, created_at)
 WHERE statut IN ('reussi','termine','annule') AND fini_le IS NULL;


-- ── 2. Fermer ce qui est fini ────────────────────────────────────
--  Appelée par le cron du soir (qui scanne déjà tous les runs
--  `en_cours`, donc zéro requête en plus) et en tête des deux portes de
--  lancement. Deux cas :
--    · `en_cours` dont la fenêtre est passée    → termine
--    · `inscription` dont l'invitation a expiré → termine
--
--  Le mot posé dans le fil ne reproche rien et ne nomme personne :
--  c'est la règle du 21 juillet, elle ne se rediscute pas.
CREATE OR REPLACE FUNCTION public.fermer_relais_expires()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_ids   UUID[];
  v_finis INT := 0;
  v_morts INT := 0;
BEGIN
  SELECT ARRAY(
    SELECT id FROM public.challenge_runs
     WHERE statut = 'en_cours'
       AND ends_on IS NOT NULL
       AND ends_on < CURRENT_DATE
  ) INTO v_ids;

  IF COALESCE(array_length(v_ids, 1), 0) > 0 THEN
    UPDATE public.challenge_runs
       SET statut = 'termine', fini_le = NOW()
     WHERE id = ANY(v_ids);

    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    SELECT r.conversation_id, NULL,
           'La semaine est finie. Vous pouvez en relancer un quand vous voulez.',
           'systeme'
      FROM public.challenge_runs r
     WHERE r.id = ANY(v_ids) AND r.conversation_id IS NOT NULL;

    v_finis := array_length(v_ids, 1);
  END IF;

  -- Une invitation que personne n'a rejointe : le run vivait à vie.
  UPDATE public.challenge_runs r
     SET statut = 'termine', fini_le = NOW()
   WHERE r.statut = 'inscription'
     AND NOT EXISTS (
       SELECT 1 FROM public.invites i
        WHERE i.run_id = r.id AND i.expires_at > NOW()
     );
  GET DIAGNOSTICS v_morts = ROW_COUNT;

  RETURN v_finis + v_morts;
END;
$fn$;

REVOKE ALL ON FUNCTION public.fermer_relais_expires() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fermer_relais_expires() TO authenticated;


-- ── 3. Quelle affiche on joue ────────────────────────────────────
--  La première que NI L'UN NI L'AUTRE n'a déjà gagnée. Quand les trois
--  sont à eux, on rejoue la première : la semaine compte toujours, et
--  l'affiche est déjà la leur.
CREATE OR REPLACE FUNCTION public.serie_a_jouer(p_membres UUID[])
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $fn$
DECLARE
  v_serie TEXT;
BEGIN
  FOREACH v_serie IN ARRAY ARRAY['sillage','aurore','brume'] LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM public.challenge_runs r
        JOIN public.challenge_run_members m ON m.run_id = r.id
       WHERE r.statut = 'reussi'
         AND r.serie = v_serie
         AND m.user_id = ANY(p_membres)
    ) THEN
      RETURN v_serie;
    END IF;
  END LOOP;
  RETURN 'sillage';
END;
$fn$;

REVOKE ALL ON FUNCTION public.serie_a_jouer(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.serie_a_jouer(UUID[]) TO authenticated;


-- ── 4. Créer par lien : plus aucune conversation ─────────────────
--  Elle naîtra dans `rejoindre_defi`, avec les deux dedans.
CREATE OR REPLACE FUNCTION public.creer_defi_duo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user   UUID := auth.uid();
  v_run    UUID;
  v_code   TEXT;
  v_essais INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  PERFORM public.fermer_relais_expires();

  IF EXISTS (
    SELECT 1 FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    WHERE m.user_id = v_user AND r.statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_en_cours');
  END IF;

  INSERT INTO public.challenge_runs (created_by, serie)
  VALUES (v_user, public.serie_a_jouer(ARRAY[v_user]))
  RETURNING id INTO v_run;

  INSERT INTO public.challenge_run_members (run_id, user_id) VALUES (v_run, v_user);

  LOOP
    v_essais := v_essais + 1;
    v_code := UPPER(
      TRANSLATE(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8), 'abcdef', 'GHJKMN')
    );
    BEGIN
      INSERT INTO public.invites (code, inviter_id, run_id) VALUES (v_code, v_user, v_run);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_essais >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'code', v_code);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.creer_defi_duo() TO authenticated;


-- ── 5. Rejoindre : le fil naît ici, et l'amitié avec ─────────────
CREATE OR REPLACE FUNCTION public.rejoindre_defi(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user    UUID := auth.uid();
  v_invite  public.invites%ROWTYPE;
  v_run     public.challenge_runs%ROWTYPE;
  v_membres UUID[];
  v_conv    UUID;
  v_pseudo  TEXT;
  v_m       UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT * INTO v_invite FROM public.invites WHERE code = p_code;
  IF NOT FOUND OR v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'invitation_invalide');
  END IF;

  SELECT * INTO v_run FROM public.challenge_runs WHERE id = v_invite.run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'invitation_invalide');
  END IF;

  IF public.est_membre_run(v_run.id, v_user) THEN
    RETURN jsonb_build_object('ok', true, 'run_id', v_run.id,
                              'conversation_id', v_run.conversation_id,
                              'deja_membre', true);
  END IF;

  IF v_run.statut <> 'inscription' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_lance');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    WHERE m.user_id = v_user AND r.statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_en_cours');
  END IF;

  SELECT ARRAY(
    SELECT user_id FROM public.challenge_run_members WHERE run_id = v_run.id
  ) INTO v_membres;

  IF COALESCE(array_length(v_membres, 1), 0) >= v_run.max_membres THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'equipe_complete');
  END IF;

  INSERT INTO public.challenge_run_members (run_id, user_id) VALUES (v_run.id, v_user);
  v_membres := v_membres || v_user;

  -- L'amitié, dans les deux sens. Sans elle, une fois le relais fini,
  -- les deux ne peuvent plus s'écrire nulle part ailleurs.
  FOREACH v_m IN ARRAY v_membres LOOP
    IF v_m <> v_user THEN
      INSERT INTO public.followers (follower_id, following_id)
      VALUES (v_user, v_m) ON CONFLICT DO NOTHING;
      INSERT INTO public.followers (follower_id, following_id)
      VALUES (v_m, v_user) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Le fil naît maintenant : on réutilise le duo existant s'il y en a un.
  v_conv := v_run.conversation_id;

  IF v_conv IS NULL AND array_length(v_membres, 1) = 2 THEN
    SELECT c.id INTO v_conv
      FROM public.conversations c
     WHERE c.type = 'duo'
       AND public.est_membre_conversation(c.id, v_membres[1])
       AND public.est_membre_conversation(c.id, v_membres[2])
       AND (SELECT COUNT(*) FROM public.conversation_members m
             WHERE m.conversation_id = c.id) = 2
     LIMIT 1;
  END IF;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (type, created_by)
    VALUES ('duo', v_run.created_by) RETURNING id INTO v_conv;
  END IF;

  FOREACH v_m IN ARRAY v_membres LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (v_conv, v_m) ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.challenge_runs SET conversation_id = v_conv WHERE id = v_run.id;

  SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = v_user;

  IF array_length(v_membres, 1) >= v_run.max_membres THEN
    UPDATE public.challenge_runs
       SET statut    = 'en_cours',
           serie     = public.serie_a_jouer(v_membres),
           starts_on = CURRENT_DATE,
           ends_on   = CURRENT_DATE + (window_days - 1)
     WHERE id = v_run.id;

    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    SELECT v_conv, NULL,
           COALESCE(v_pseudo, 'Quelqu''un') ||
           ' a rejoint. Le relais est lancé : 4 jours sur 7, chacun son tour. Vous jouez pour '
           || initcap(r.serie) || '.',
           'systeme'
      FROM public.challenge_runs r WHERE r.id = v_run.id;
  ELSE
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (v_conv, NULL,
            COALESCE(v_pseudo, 'Quelqu''un') || ' a rejoint le relais.', 'systeme');
  END IF;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run.id,
                            'conversation_id', v_conv,
                            'lance', array_length(v_membres, 1) >= v_run.max_membres);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.rejoindre_defi(TEXT) TO authenticated;


-- ── 6. Lancer dans un fil : la fenêtre et la série sont justes ───
--  `CURRENT_DATE + 6` était codé en dur : identique aujourd'hui (la
--  fenêtre vaut 7), faux le jour où on la change. Et le refus dit
--  maintenant LEQUEL des deux bloque, avec le fil où c'est en cours :
--  « l'un de vous a déjà un relais » était un mur sans poignée.
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

  IF COALESCE(array_length(v_membres, 1), 0) <> 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_un_duo');
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

  INSERT INTO public.challenge_runs (created_by, conversation_id, statut, serie, starts_on)
  VALUES (v_user, p_conv, 'en_cours', public.serie_a_jouer(v_membres), CURRENT_DATE)
  RETURNING id INTO v_run;

  UPDATE public.challenge_runs
     SET ends_on = starts_on + (window_days - 1)
   WHERE id = v_run;

  FOREACH v_m IN ARRAY v_membres LOOP
    INSERT INTO public.challenge_run_members (run_id, user_id)
    VALUES (v_run, v_m) ON CONFLICT DO NOTHING;
  END LOOP;

  -- ⚠️ LE MESSAGE NOMME L'AFFICHE, et c'est le point de la rotation : la
  -- deuxième semaine se gagne là, avant même la première séance. Sans ce
  -- mot, deux affiches sur trois n'auraient jamais de nom pour personne.
  INSERT INTO public.messages (conversation_id, user_id, contenu, type)
  SELECT p_conv, NULL,
         'Le relais est lancé. 4 jours sur 7, chacun son tour. Vous jouez pour '
         || initcap(r.serie) || '.',
         'systeme'
    FROM public.challenge_runs r WHERE r.id = v_run;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'conversation_id', p_conv);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.lancer_relais(UUID) TO authenticated;


-- ── 7. Le maillon rend la série, et marque la fin ────────────────
--  Deux changements seulement : la réponse porte `serie` (l'écran de
--  fin de séance en a besoin pour montrer l'affiche qui bascule) et
--  une victoire écrit `fini_le`. Les règles de validation ne bougent
--  pas d'une ligne. Au passage, le tiret cadratin du message système
--  disparaît : il n'a rien à faire dans un texte de Vaiiya.
CREATE OR REPLACE FUNCTION public.valider_action_defi(p_run_id UUID, p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user    UUID := auth.uid();
  v_run     public.challenge_runs%ROWTYPE;
  v_session public.workout_sessions%ROWTYPE;
  v_jour    DATE := CURRENT_DATE;
  v_faits   INT;
  v_pseudo  TEXT;
  v_reussi  BOOLEAN;
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

  SELECT * INTO v_session FROM public.workout_sessions
  WHERE id = p_session_id AND user_id = v_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'seance_introuvable');
  END IF;
  IF v_session.duration_minutes < 10 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_courte');
  END IF;
  IF v_session.started_at < NOW() - INTERVAL '3 hours' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'seance_trop_ancienne');
  END IF;

  IF EXISTS (SELECT 1 FROM public.challenge_actions
             WHERE run_id = p_run_id AND jour = v_jour) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'jour_deja_franchi');
  END IF;

  -- RÈGLE : pas deux jours de suite par la même personne.
  IF EXISTS (SELECT 1 FROM public.challenge_actions
             WHERE run_id = p_run_id AND jour = v_jour - 1 AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deux_jours_de_suite');
  END IF;

  INSERT INTO public.challenge_actions (run_id, user_id, jour, workout_session_id)
  VALUES (p_run_id, v_user, v_jour, p_session_id);

  SELECT COUNT(*) INTO v_faits FROM public.challenge_actions WHERE run_id = p_run_id;
  v_reussi := v_faits >= v_run.target_days;

  SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = v_user;

  IF v_run.conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (
      v_run.conversation_id, NULL,
      CASE WHEN v_reussi
        THEN 'L''affiche est complète. ' || COALESCE(v_pseudo,'Quelqu''un') || ' a franchi le dernier maillon.'
        ELSE COALESCE(v_pseudo,'Quelqu''un') || ' a franchi le maillon du jour · ' ||
             v_faits || ' sur ' || v_run.target_days || '.'
      END,
      'systeme'
    );
  END IF;

  IF v_reussi THEN
    UPDATE public.challenge_runs
       SET statut = 'reussi', fini_le = NOW()
     WHERE id = p_run_id;

    INSERT INTO public.challenge_rewards (run_id, user_id, reward_slug)
    SELECT p_run_id, m.user_id, 'poster-' || v_run.serie
    FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;

    -- Badges : la série accomplie, et le tout premier relais.
    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT m.user_id, 'serie-' || v_run.serie
    FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;

    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT m.user_id, 'premier-relais'
    FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'jours_faits', v_faits,
                            'objectif', v_run.target_days,
                            'serie', v_run.serie,
                            'reussi', v_reussi);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.valider_action_defi(UUID, UUID) TO authenticated;


-- ── 8. Annuler marque aussi la fin ───────────────────────────────
CREATE OR REPLACE FUNCTION public.annuler_relais(p_run UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user UUID := auth.uid();
  v_run  RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT id, statut, conversation_id INTO v_run
  FROM public.challenge_runs WHERE id = p_run;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'introuvable');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_run_members
    WHERE run_id = p_run AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  -- Un relais gagné ne s'annule pas : l'affiche est à eux.
  IF v_run.statut NOT IN ('inscription','en_cours') THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deja_fini');
  END IF;

  UPDATE public.challenge_runs
     SET statut = 'annule', fini_le = NOW()
   WHERE id = p_run;

  -- On ne nomme JAMAIS celui qui a arrêté, et on ne reproche rien.
  IF v_run.conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (v_run.conversation_id, NULL,
            'Le relais s''arrête ici. Vous pouvez en relancer un quand vous voulez.',
            'systeme');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.annuler_relais(UUID) TO authenticated;


-- ── 9. Un fil qui porte un relais refuse une troisième personne ──
--  Sans ce garde-fou, ajouter quelqu'un à un duo qui joue transforme
--  le fil en groupe : l'affiche reste épinglée pour trois, et la
--  nouvelle personne ne pourra JAMAIS franchir un maillon (elle n'est
--  pas dans `challenge_run_members`). Ça se passait en silence.
CREATE OR REPLACE FUNCTION public.ajouter_membres_conversation(p_conv UUID, p_membres UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user      UUID := auth.uid();
  v_nouveaux  UUID[];
  v_total     INTEGER;
  v_m         UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  IF NOT public.est_membre_conversation(p_conv, v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT x
    FROM unnest(COALESCE(p_membres, ARRAY[]::UUID[])) AS x
    WHERE x IS NOT NULL
      AND x <> v_user
      AND NOT public.est_membre_conversation(p_conv, x)
  ) INTO v_nouveaux;

  IF COALESCE(array_length(v_nouveaux, 1), 0) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'ajoutes', 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenge_runs
    WHERE conversation_id = p_conv AND statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'relais_en_cours');
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.conversation_members
  WHERE conversation_id = p_conv;

  IF v_total + array_length(v_nouveaux, 1) > 5 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'groupe_complet');
  END IF;

  FOREACH v_m IN ARRAY v_nouveaux LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_m) THEN
      RETURN jsonb_build_object('ok', false, 'raison', 'profil_introuvable');
    END IF;
    IF NOT public.sont_en_relation(v_user, v_m) THEN
      RETURN jsonb_build_object('ok', false, 'raison', 'relation_requise');
    END IF;
  END LOOP;

  FOREACH v_m IN ARRAY v_nouveaux LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (p_conv, v_m)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- À partir de trois personnes, le fil devient réellement un groupe.
  UPDATE public.conversations
  SET type = 'groupe'
  WHERE id = p_conv
    AND (
      SELECT COUNT(*)
      FROM public.conversation_members
      WHERE conversation_id = p_conv
    ) > 2;

  RETURN jsonb_build_object('ok', true, 'ajoutes', array_length(v_nouveaux, 1));
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.ajouter_membres_conversation(UUID, UUID[]) TO authenticated;


-- ── 10. Ménage : les conversations « Moi » ───────────────────────
--  Les fils créés par l'ancien `creer_defi_duo` et que personne n'a
--  jamais rejoints : un seul membre, aucun message écrit par un
--  humain. Ils portaient un titre littéral « Moi » dans la liste.
--  On ne touche à rien d'autre : dès qu'un fil a deux membres ou un
--  vrai message, il est laissé tranquille.
DO $menage$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT ARRAY(
    SELECT c.id
      FROM public.conversations c
     WHERE (SELECT COUNT(*) FROM public.conversation_members m
             WHERE m.conversation_id = c.id) <= 1
       AND NOT EXISTS (
         SELECT 1 FROM public.messages msg
          WHERE msg.conversation_id = c.id AND msg.user_id IS NOT NULL
       )
  ) INTO v_ids;

  IF COALESCE(array_length(v_ids, 1), 0) > 0 THEN
    UPDATE public.challenge_runs SET conversation_id = NULL
     WHERE conversation_id = ANY(v_ids);
    DELETE FROM public.conversations WHERE id = ANY(v_ids);
  END IF;
END;
$menage$;

SELECT public.fermer_relais_expires() AS relais_fermes;

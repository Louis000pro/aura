-- ════════════════════════════════════════════════════════════════
--  Le relais CO-OP — les deux grimpent la même échelle, ensemble
--
--  À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS :
--    20260830_relais.sql (et les migrations relais qui le précèdent)
--  Rejouable sans risque.
--
--  Ce qui change, décidé avec Louis (2026-09-26) :
--
--  1. Fini l'alternance « chacun son tour, un maillon par jour ». Chaque
--     joueur grimpe SES 4 maillons (1 mouvement, puis 2, 3, 4). On ne
--     passe au maillon suivant que quand LES DEUX ont fait le maillon
--     en cours : Lucas est bloqué au maillon 2 tant que Louis n'a pas
--     fait le maillon 1.
--  2. On peut enchaîner, mais 2 maillons par jour maximum par personne
--     (donc finissable en 2 jours si les deux sont à fond).
--  3. La séance est DONNÉE par le relais (générée côté client, calée sur
--     le niveau), donc plus de plancher de 10 minutes : terminer la
--     séance suffit. Anti-triche total (on ne choisit plus la séance).
--  4. Le relais est gagné quand LES DEUX ont bouclé leurs 4 maillons.
--
--  target_days = 4 (le nombre de maillons par joueur), window_days = 7.
-- ════════════════════════════════════════════════════════════════


-- ── 1. Une action porte désormais SON numéro de maillon ──────────
--  Avant : une action = un jour de la chaîne (UNIQUE(run_id, jour),
--  alternance). Maintenant : une action = un maillon franchi par UN
--  joueur, et chaque joueur franchit chaque maillon une seule fois.
ALTER TABLE public.challenge_actions ADD COLUMN IF NOT EXISTS maillon INT;

-- Rétro-numérotation des actions existantes (runs déjà joués) : chaque
-- action reçoit son rang dans la progression de son auteur, par date.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY run_id, user_id ORDER BY jour, created_at) AS rn
    FROM public.challenge_actions
)
UPDATE public.challenge_actions a
   SET maillon = r.rn
  FROM ranked r
 WHERE a.id = r.id AND a.maillon IS NULL;

-- L'ancienne règle « un seul maillon par jour pour le run » saute : les
-- deux peuvent jouer le même jour, et une personne peut enchaîner.
DO $drop_jour$
DECLARE
  v_name TEXT;
BEGIN
  SELECT con.conname INTO v_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'challenge_actions'
     AND con.contype = 'u'
     AND (SELECT array_agg(att.attname::text ORDER BY att.attname)
            FROM unnest(con.conkey) AS k
            JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k)
         = ARRAY['jour','run_id']
   LIMIT 1;
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.challenge_actions DROP CONSTRAINT %I', v_name);
  END IF;
END;
$drop_jour$;

-- Un joueur franchit chaque maillon une seule fois.
ALTER TABLE public.challenge_actions
  DROP CONSTRAINT IF EXISTS challenge_actions_run_user_maillon_key;
ALTER TABLE public.challenge_actions
  ADD CONSTRAINT challenge_actions_run_user_maillon_key UNIQUE (run_id, user_id, maillon);

ALTER TABLE public.challenge_actions ALTER COLUMN maillon SET NOT NULL;


-- ── 2. La validation d'un maillon, en co-op ──────────────────────
--  Appelée depuis WorkoutGuideModal UNIQUEMENT quand la séance a été
--  lancée comme « mon maillon » (la séance donnée par le relais).
--
--  Le garde-fou du lockstep vit ici : on ne peut faire le maillon
--  (mine+1) que si le binôme a AU MOINS fait le maillon `mine`. Sinon
--  on est bloqué, et c'est ce qui « oblige à se relancer » l'un l'autre.
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
  v_partner    UUID;
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

  SELECT user_id INTO v_partner
    FROM public.challenge_run_members
   WHERE run_id = p_run_id AND user_id <> v_user
   LIMIT 1;

  SELECT COUNT(*) INTO v_mine
    FROM public.challenge_actions WHERE run_id = p_run_id AND user_id = v_user;
  SELECT COUNT(*) INTO v_partdone
    FROM public.challenge_actions WHERE run_id = p_run_id AND user_id = v_partner;
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
        THEN 'L''affiche est complète. Vous avez bouclé les 4 maillons ensemble.'
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
    'partner', v_partdone,       -- ceux du binôme
    'min', v_min,                -- l'avancée COMMUNE (ce que l'affiche montre)
    'objectif', v_run.target_days,
    'serie', v_run.serie,
    'reussi', v_reussi,
    'bloque', (v_partdone < v_mine)  -- suis-je maintenant en attente du binôme ?
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.valider_action_defi(UUID, UUID) TO authenticated;


-- ── 3. Les messages de lancement disent le bon jeu ───────────────
--  « 4 jours sur 7, chacun son tour » décrivait l'ancienne alternance.
--  On ne réécrit QUE la phrase ; le reste de lancer_relais / rejoindre
--  ne bouge pas d'une ligne (source : 20260830_relais.sql).
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

  INSERT INTO public.messages (conversation_id, user_id, contenu, type)
  SELECT p_conv, NULL,
         'Le relais est lancé. Vous grimpez les 4 maillons ensemble : on avance quand les deux ont fait le maillon. Vous jouez pour '
         || initcap(r.serie) || '.',
         'systeme'
    FROM public.challenge_runs r WHERE r.id = v_run;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'conversation_id', p_conv);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.lancer_relais(UUID) TO authenticated;


-- Rejoindre : même fonction que 20260830_relais.sql, seule la phrase de
-- lancement change (« chacun son tour » → le jeu co-op).
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

  FOREACH v_m IN ARRAY v_membres LOOP
    IF v_m <> v_user THEN
      INSERT INTO public.followers (follower_id, following_id)
      VALUES (v_user, v_m) ON CONFLICT DO NOTHING;
      INSERT INTO public.followers (follower_id, following_id)
      VALUES (v_m, v_user) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

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
           ' a rejoint. Le relais est lancé : vous grimpez les 4 maillons ensemble. Vous jouez pour '
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

SELECT public.fermer_relais_expires() AS relais_fermes;

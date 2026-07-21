-- ============================================================
-- Messagerie (conversations à 2 ou en groupe) + le défi dedans
--
-- Remplace public.direct_messages, qui est laissée dormante :
-- son modèle sender/receiver ne porte pas les groupes, et ses
-- policies utilisaient « CREATE POLICY IF NOT EXISTS », syntaxe
-- qui n'existe pas en PostgreSQL — le fichier plantait donc à la
-- première policy, laissant RLS actif SANS aucune policy.
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase. Rejouable.
-- ============================================================

-- ---------- 1. Conversations ----------
CREATE TABLE IF NOT EXISTS public.conversations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type            TEXT        NOT NULL DEFAULT 'duo' CHECK (type IN ('duo','groupe')),
  nom             TEXT,                        -- seulement pour les groupes
  created_by      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conv_last_idx ON public.conversations(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS cm_user_idx ON public.conversation_members(user_id);

-- user_id NULL = message système (« X a franchi le maillon »).
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  contenu         TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'texte' CHECK (type IN ('texte','systeme')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS msg_conv_idx ON public.messages(conversation_id, created_at DESC);

-- Le défi et la conversation sont le même objet vu de deux côtés.
ALTER TABLE public.challenge_runs
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- ---------- 2. Badges de profil ----------
-- Les badges eux-mêmes sont définis dans le code (src/lib/badges.ts) :
-- la base ne stocke que ce qui est débloqué, par qui, et quand.
CREATE TABLE IF NOT EXISTS public.profile_badges (
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_slug TEXT        NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_slug)
);

-- ---------- 3. Anti-récursion RLS ----------
CREATE OR REPLACE FUNCTION public.est_membre_conversation(p_conv UUID, p_user UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv AND user_id = p_user
  );
$$;

-- ---------- 4. RLS ----------
ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_badges       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations visibles par membres" ON public.conversations;
CREATE POLICY "conversations visibles par membres"
  ON public.conversations FOR SELECT
  USING (public.est_membre_conversation(id, auth.uid()));

DROP POLICY IF EXISTS "conversations creees par soi" ON public.conversations;
CREATE POLICY "conversations creees par soi"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "membres visibles entre membres" ON public.conversation_members;
CREATE POLICY "membres visibles entre membres"
  ON public.conversation_members FOR SELECT
  USING (public.est_membre_conversation(conversation_id, auth.uid()));

-- On peut s'ajouter soi-même, ou ajouter quelqu'un à une conversation
-- dont on est déjà membre (c'est ainsi qu'on compose un groupe).
DROP POLICY IF EXISTS "ajout de membres" ON public.conversation_members;
CREATE POLICY "ajout de membres"
  ON public.conversation_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR public.est_membre_conversation(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "maj de sa propre lecture" ON public.conversation_members;
CREATE POLICY "maj de sa propre lecture"
  ON public.conversation_members FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages visibles par membres" ON public.messages;
CREATE POLICY "messages visibles par membres"
  ON public.messages FOR SELECT
  USING (public.est_membre_conversation(conversation_id, auth.uid()));

-- On n'écrit que sous son propre nom, et que là où on est membre.
-- Les messages système sont écrits par les fonctions SECURITY DEFINER.
DROP POLICY IF EXISTS "envoi par membres" ON public.messages;
CREATE POLICY "envoi par membres"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND type = 'texte'
    AND public.est_membre_conversation(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "badges visibles par tous" ON public.profile_badges;
CREATE POLICY "badges visibles par tous"
  ON public.profile_badges FOR SELECT
  USING (true);   -- un badge sert à être vu sur un profil

-- ---------- 5. Temps réel ----------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

-- ---------- 6. Créer une conversation ----------
-- Pour un duo, on renvoie la conversation existante s'il y en a
-- déjà une : on ne crée jamais deux fils avec la même personne.
CREATE OR REPLACE FUNCTION public.creer_conversation(p_membres UUID[], p_nom TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_tous  UUID[];
  v_type  TEXT;
  v_conv  UUID;
  v_autre UUID;
  v_m     UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  -- Moi + les autres, sans doublon
  SELECT ARRAY(SELECT DISTINCT UNNEST(p_membres || ARRAY[v_user])) INTO v_tous;

  IF array_length(v_tous, 1) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_assez_de_monde');
  END IF;

  v_type := CASE WHEN array_length(v_tous, 1) = 2 THEN 'duo' ELSE 'groupe' END;

  IF v_type = 'duo' THEN
    SELECT UNNEST INTO v_autre FROM UNNEST(v_tous) WHERE UNNEST <> v_user LIMIT 1;

    SELECT c.id INTO v_conv
    FROM public.conversations c
    WHERE c.type = 'duo'
      AND public.est_membre_conversation(c.id, v_user)
      AND public.est_membre_conversation(c.id, v_autre)
      AND (SELECT COUNT(*) FROM public.conversation_members m WHERE m.conversation_id = c.id) = 2
    LIMIT 1;

    IF v_conv IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'conversation_id', v_conv, 'existante', true);
    END IF;
  END IF;

  INSERT INTO public.conversations (type, nom, created_by)
  VALUES (v_type, NULLIF(p_nom, ''), v_user)
  RETURNING id INTO v_conv;

  FOREACH v_m IN ARRAY v_tous LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (v_conv, v_m) ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'conversation_id', v_conv, 'existante', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_conversation(UUID[], TEXT) TO authenticated;

-- ---------- 7. Le fil remonte quand on écrit ----------
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- ---------- 8. Le défi crée sa conversation ----------
CREATE OR REPLACE FUNCTION public.creer_defi_duo()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_run    UUID;
  v_conv   UUID;
  v_code   TEXT;
  v_essais INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    WHERE m.user_id = v_user AND r.statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_en_cours');
  END IF;

  -- La conversation naît avec le défi : l'équipe EST le fil.
  INSERT INTO public.conversations (type, created_by) VALUES ('duo', v_user) RETURNING id INTO v_conv;
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES (v_conv, v_user);

  INSERT INTO public.challenge_runs (created_by, conversation_id)
  VALUES (v_user, v_conv) RETURNING id INTO v_run;
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

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'conversation_id', v_conv, 'code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_defi_duo() TO authenticated;

-- ---------- 9. Rejoindre : entrer dans le fil aussi ----------
CREATE OR REPLACE FUNCTION public.rejoindre_defi(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_invite  public.invites%ROWTYPE;
  v_run     public.challenge_runs%ROWTYPE;
  v_membres INT;
  v_pseudo  TEXT;
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
                              'conversation_id', v_run.conversation_id, 'deja_membre', true);
  END IF;

  IF v_run.statut <> 'inscription' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_lance');
  END IF;

  SELECT COUNT(*) INTO v_membres FROM public.challenge_run_members WHERE run_id = v_run.id;
  IF v_membres >= v_run.max_membres THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'equipe_complete');
  END IF;

  INSERT INTO public.challenge_run_members (run_id, user_id) VALUES (v_run.id, v_user);
  v_membres := v_membres + 1;

  IF v_run.conversation_id IS NOT NULL THEN
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (v_run.conversation_id, v_user) ON CONFLICT DO NOTHING;

    SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = v_user;
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (v_run.conversation_id, NULL,
            COALESCE(v_pseudo, 'Quelqu''un') || ' a rejoint le relais.', 'systeme');
  END IF;

  IF v_membres >= v_run.max_membres THEN
    UPDATE public.challenge_runs
    SET statut = 'en_cours', starts_on = CURRENT_DATE, ends_on = CURRENT_DATE + (window_days - 1)
    WHERE id = v_run.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run.id,
                            'conversation_id', v_run.conversation_id,
                            'lance', v_membres >= v_run.max_membres);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rejoindre_defi(TEXT) TO authenticated;

-- ---------- 10. Un maillon franchi s'écrit dans le fil ----------
CREATE OR REPLACE FUNCTION public.valider_action_defi(p_run_id UUID, p_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
        ELSE COALESCE(v_pseudo,'Quelqu''un') || ' a franchi le maillon du jour — ' ||
             v_faits || ' sur ' || v_run.target_days || '.'
      END,
      'systeme'
    );
  END IF;

  IF v_reussi THEN
    UPDATE public.challenge_runs SET statut = 'reussi' WHERE id = p_run_id;

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
                            'objectif', v_run.target_days, 'reussi', v_reussi);
END;
$$;

GRANT EXECUTE ON FUNCTION public.valider_action_defi(UUID, UUID) TO authenticated;

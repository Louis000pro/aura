-- ============================================================
-- Messagerie — fiabilité, confidentialité et compteurs exacts
--
-- À coller à la main dans le SQL Editor Supabase APRÈS :
--   1. 20260721_messagerie.sql
--   2. 20260721_messagerie_v2.sql
--   3. 20260721_amis_conversation.sql
--   4. 20260721_notifs_relais.sql
--
-- Rejouable sans perte de données.
-- ============================================================

-- ---------- 1. Quitter réellement une conversation ----------
DROP POLICY IF EXISTS "retrait de sa propre conversation" ON public.conversation_members;
CREATE POLICY "retrait de sa propre conversation"
  ON public.conversation_members FOR DELETE
  USING (auth.uid() = user_id);

-- Les ajouts ne passent plus directement par la table. Cette ancienne
-- policy permettait à un membre d'ajouter n'importe quel UUID et de lui
-- ouvrir tout l'historique. Les fonctions contrôlées ci-dessous deviennent
-- l'unique porte d'entrée.
DROP POLICY IF EXISTS "ajout de membres" ON public.conversation_members;

-- ---------- 2. Relations autorisées ----------
CREATE OR REPLACE FUNCTION public.sont_en_relation(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p_a <> p_b AND EXISTS (
    SELECT 1
    FROM public.followers f
    WHERE (f.follower_id = p_a AND f.following_id = p_b)
       OR (f.follower_id = p_b AND f.following_id = p_a)
  );
$$;

REVOKE ALL ON FUNCTION public.sont_en_relation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sont_en_relation(UUID, UUID) TO authenticated;

-- ---------- 3. Création protégée, de 2 à 5 personnes ----------
CREATE OR REPLACE FUNCTION public.creer_conversation(
  p_membres UUID[],
  p_nom TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_tous    UUID[];
  v_type    TEXT;
  v_conv    UUID;
  v_autre   UUID;
  v_m       UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT x
    FROM unnest(array_append(COALESCE(p_membres, ARRAY[]::UUID[]), v_user)) AS x
    WHERE x IS NOT NULL
  ) INTO v_tous;

  IF COALESCE(array_length(v_tous, 1), 0) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'membre_manquant');
  END IF;

  IF array_length(v_tous, 1) > 5 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'groupe_complet');
  END IF;

  FOREACH v_m IN ARRAY v_tous LOOP
    IF v_m <> v_user THEN
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_m) THEN
        RETURN jsonb_build_object('ok', false, 'raison', 'profil_introuvable');
      END IF;
      IF NOT public.sont_en_relation(v_user, v_m) THEN
        RETURN jsonb_build_object('ok', false, 'raison', 'relation_requise');
      END IF;
    END IF;
  END LOOP;

  v_type := CASE WHEN array_length(v_tous, 1) = 2 THEN 'duo' ELSE 'groupe' END;

  -- Un duo entre les deux mêmes personnes reste un fil unique.
  IF v_type = 'duo' THEN
    SELECT x INTO v_autre FROM unnest(v_tous) AS x WHERE x <> v_user LIMIT 1;

    SELECT c.id INTO v_conv
    FROM public.conversations c
    WHERE c.type = 'duo'
      AND public.est_membre_conversation(c.id, v_user)
      AND public.est_membre_conversation(c.id, v_autre)
      AND (
        SELECT COUNT(*)
        FROM public.conversation_members cm
        WHERE cm.conversation_id = c.id
      ) = 2
    LIMIT 1;

    IF v_conv IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true,
        'conversation_id', v_conv,
        'existante', true
      );
    END IF;
  END IF;

  INSERT INTO public.conversations (type, nom, created_by)
  VALUES (v_type, NULLIF(BTRIM(p_nom), ''), v_user)
  RETURNING id INTO v_conv;

  FOREACH v_m IN ARRAY v_tous LOOP
    INSERT INTO public.conversation_members (conversation_id, user_id)
    VALUES (v_conv, v_m)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'conversation_id', v_conv,
    'existante', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_conversation(UUID[], TEXT) TO authenticated;

-- ---------- 4. Ajout protégé à une conversation existante ----------
CREATE OR REPLACE FUNCTION public.ajouter_membres_conversation(
  p_conv UUID,
  p_membres UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user       UUID := auth.uid();
  v_nouveaux   UUID[];
  v_total       INTEGER;
  v_m           UUID;
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

  RETURN jsonb_build_object(
    'ok', true,
    'ajoutes', array_length(v_nouveaux, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajouter_membres_conversation(UUID, UUID[]) TO authenticated;

-- ---------- 5. Aperçus et non-lus exacts ----------
-- Un seul résultat par conversation, sans charger un lot arbitraire de
-- messages dans le navigateur. Le dernier message vient d'un LATERAL et
-- le compteur porte sur tout l'historique.
CREATE OR REPLACE FUNCTION public.apercus_conversations()
RETURNS TABLE (
  conversation_id UUID,
  last_read_at TIMESTAMPTZ,
  non_lus BIGINT,
  dernier_id UUID,
  dernier_user_id UUID,
  dernier_contenu TEXT,
  dernier_type TEXT,
  dernier_created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    cm.conversation_id,
    cm.last_read_at,
    (
      SELECT COUNT(*)
      FROM public.messages unread
      WHERE unread.conversation_id = cm.conversation_id
        AND unread.created_at > cm.last_read_at
        AND unread.user_id IS DISTINCT FROM auth.uid()
    ) AS non_lus,
    dernier.id,
    dernier.user_id,
    dernier.contenu,
    dernier.type,
    dernier.created_at
  FROM public.conversation_members cm
  LEFT JOIN LATERAL (
    SELECT m.id, m.user_id, m.contenu, m.type, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = cm.conversation_id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS dernier ON TRUE
  WHERE cm.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.apercus_conversations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apercus_conversations() TO authenticated;

-- ---------- 6. Notifications de message ----------
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','repost','mention','relais','message'));

-- ---------- 7. Temps réel de la liste ----------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

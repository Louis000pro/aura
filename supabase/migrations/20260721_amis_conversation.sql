-- ============================================================
-- Un ami mutuel = une conversation qui attend
--
-- Dès que deux personnes se suivent l'une l'autre, leur fil
-- existe : vide, en haut de la liste, prêt. C'est la mécanique
-- Snapchat — on n'a jamais à « créer » une discussion avec
-- quelqu'un qu'on connaît déjà.
--
-- Ça ne concerne QUE les duos. Personne n'est jamais ajouté
-- automatiquement à un groupe.
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS
--    20260721_messagerie.sql. Rejouable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ouvrir_fil_entre(p_a UUID, p_b UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_conv UUID;
BEGIN
  IF p_a IS NULL OR p_b IS NULL OR p_a = p_b THEN
    RETURN NULL;
  END IF;

  -- Déjà un fil à deux entre eux ? On n'en crée jamais un second.
  SELECT c.id INTO v_conv
  FROM public.conversations c
  WHERE c.type = 'duo'
    AND public.est_membre_conversation(c.id, p_a)
    AND public.est_membre_conversation(c.id, p_b)
    AND (SELECT COUNT(*) FROM public.conversation_members m WHERE m.conversation_id = c.id) = 2
  LIMIT 1;

  IF v_conv IS NOT NULL THEN
    RETURN v_conv;
  END IF;

  INSERT INTO public.conversations (type, created_by)
  VALUES ('duo', p_a) RETURNING id INTO v_conv;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_conv, p_a), (v_conv, p_b)
  ON CONFLICT DO NOTHING;

  RETURN v_conv;
END;
$$;

-- ---------- Le déclencheur ----------
CREATE OR REPLACE FUNCTION public.amis_ouvrent_un_fil()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- On n'ouvre rien tant que ce n'est pas réciproque : suivre
  -- quelqu'un ne donne pas le droit d'apparaître dans sa liste.
  IF EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = NEW.following_id AND following_id = NEW.follower_id
  ) THEN
    PERFORM public.ouvrir_fil_entre(NEW.follower_id, NEW.following_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS followers_ouvrent_un_fil ON public.followers;
CREATE TRIGGER followers_ouvrent_un_fil
  AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.amis_ouvrent_un_fil();

-- ---------- Rattrapage ----------
-- Les amitiés mutuelles qui existaient déjà avant ce trigger.
DO $$
DECLARE
  v_paire RECORD;
BEGIN
  FOR v_paire IN
    SELECT DISTINCT
      LEAST(a.follower_id, a.following_id)    AS un,
      GREATEST(a.follower_id, a.following_id) AS deux
    FROM public.followers a
    JOIN public.followers b
      ON b.follower_id = a.following_id
     AND b.following_id = a.follower_id
  LOOP
    PERFORM public.ouvrir_fil_entre(v_paire.un, v_paire.deux);
  END LOOP;
END $$;

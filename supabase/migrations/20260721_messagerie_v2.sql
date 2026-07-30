-- ============================================================
-- Messagerie v2 — la conversation devient un lieu
--
--  · photo et nom de groupe modifiables par ses membres
--  · réactions et réponses citées
--  · suppression de ses propres messages
--  · lancer un relais DANS une conversation existante
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS
--    20260721_defi_duo.sql et 20260721_messagerie.sql.
--    Rejouable sans dégât.
-- ============================================================

-- ---------- 1. Photo de groupe ----------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Les membres peuvent renommer et rhabiller leur conversation.
-- Pas de rôle admin : ce sont des groupes de 2 à 5 personnes qui
-- se connaissent déjà, un système de droits serait du décor.
DROP POLICY IF EXISTS "maj de la conversation par ses membres" ON public.conversations;
CREATE POLICY "maj de la conversation par ses membres"
  ON public.conversations FOR UPDATE
  USING (public.est_membre_conversation(id, auth.uid()))
  WITH CHECK (public.est_membre_conversation(id, auth.uid()));

-- ---------- 2. Réponses citées ----------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS repond_a UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- ---------- 3. Réactions ----------
CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)   -- une seule réaction par personne
);

CREATE INDEX IF NOT EXISTS mr_message_idx ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- On voit les réactions des messages qu'on a le droit de lire.
DROP POLICY IF EXISTS "reactions visibles par membres" ON public.message_reactions;
CREATE POLICY "reactions visibles par membres"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.est_membre_conversation(m.conversation_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "reaction sous son propre nom" ON public.message_reactions;
CREATE POLICY "reaction sous son propre nom"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.est_membre_conversation(m.conversation_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "maj de sa propre reaction" ON public.message_reactions;
CREATE POLICY "maj de sa propre reaction"
  ON public.message_reactions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "retrait de sa propre reaction" ON public.message_reactions;
CREATE POLICY "retrait de sa propre reaction"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ---------- 4. Supprimer ses messages ----------
DROP POLICY IF EXISTS "suppression de ses propres messages" ON public.messages;
CREATE POLICY "suppression de ses propres messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- ---------- 5. Temps réel ----------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

-- ---------- 6. Lancer un relais dans une conversation ----------
-- Le relais se joue à DEUX : on ne l'ouvre que dans un fil qui
-- compte exactement deux personnes. Dans un groupe plus large, le
-- bouton reste visible mais refuse — la règle vit ici, côté
-- serveur, et jamais dans le client.
CREATE OR REPLACE FUNCTION public.lancer_relais(p_conv UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_membres UUID[];
  v_run     UUID;
  v_m       UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  IF NOT public.est_membre_conversation(p_conv, v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  SELECT ARRAY(
    SELECT user_id FROM public.conversation_members WHERE conversation_id = p_conv
  ) INTO v_membres;

  IF array_length(v_membres, 1) <> 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_un_duo');
  END IF;

  -- Un relais déjà vivant dans ce fil ?
  IF EXISTS (
    SELECT 1 FROM public.challenge_runs
    WHERE conversation_id = p_conv AND statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'relais_deja_ici');
  END IF;

  -- Ou ailleurs, pour l'un des deux ?
  IF EXISTS (
    SELECT 1 FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    WHERE m.user_id = ANY(v_membres) AND r.statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_en_cours');
  END IF;

  -- Les deux sont là : le défi démarre tout de suite, pas d'invitation.
  INSERT INTO public.challenge_runs (created_by, conversation_id, statut, starts_on, ends_on)
  VALUES (v_user, p_conv, 'en_cours', CURRENT_DATE, CURRENT_DATE + 6)
  RETURNING id INTO v_run;

  FOREACH v_m IN ARRAY v_membres LOOP
    INSERT INTO public.challenge_run_members (run_id, user_id)
    VALUES (v_run, v_m) ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO public.messages (conversation_id, user_id, contenu, type)
  VALUES (p_conv, NULL,
          'Le relais est lancé. 4 jours sur 7, chacun son tour.', 'systeme');

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'conversation_id', p_conv);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lancer_relais(UUID) TO authenticated;

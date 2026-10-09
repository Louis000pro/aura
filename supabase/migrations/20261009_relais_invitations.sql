-- ─────────────────────────────────────────────────────────────
-- Le relais se lance sur INVITATION (Louis, 2026-10-09)
--
-- Avant : cocher des amis dans « Avec qui ? » créait le groupe et
-- lançait le relais aussitôt, sans que personne n'ait rien accepté.
--
-- Désormais :
--   · `inviter_relais(amis)` ouvre un relais en `inscription` dont
--     seul l'auteur est membre, et pose une invitation par ami ;
--   · chaque invité accepte ou refuse (`repondre_invitation_relais`),
--     depuis la cloche ou depuis /defi ;
--   · quand plus personne n'est en attente, le relais démarre avec
--     ceux qui ont accepté (sinon il s'arrête, sans bruit) ;
--   · l'auteur peut aussi démarrer avant, avec ceux qui ont déjà dit
--     oui (`lancer_relais_invite`) ;
--   · AUCUNE conversation n'est créée avant le démarrage, et elle ne
--     contient que des gens qui ont accepté.
--
-- Une invitation sans réponse expire au bout de 48 h.
-- Rejouable sans risque.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.relais_invitations (
  run_id     UUID NOT NULL REFERENCES public.challenge_runs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_par UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'en_attente'
             CHECK (statut IN ('en_attente','acceptee','refusee','expiree')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  repondu_le TIMESTAMPTZ,
  PRIMARY KEY (run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_relais_invitations_user
  ON public.relais_invitations (user_id, statut);

ALTER TABLE public.relais_invitations ENABLE ROW LEVEL SECURITY;

-- Lecture : l'invité voit les siennes, les membres du relais voient
-- toutes celles du relais (c'est ce qui affiche « en attente »).
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.
DROP POLICY IF EXISTS "Invitations visibles" ON public.relais_invitations;
CREATE POLICY "Invitations visibles" ON public.relais_invitations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.est_membre_run(run_id, auth.uid()));

-- Le type de notification.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['follow','like','comment','repost','mention','relais','message','relais_invitation']));

-- ── Le démarrage, écrit une seule fois ──────────────────────────
-- Interne : appelée par les deux portes de démarrage. Elle trouve ou
-- crée la conversation qui réunit EXACTEMENT les membres, puis lance.
CREATE OR REPLACE FUNCTION public.demarrer_relais_invite(p_run UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_membres UUID[];
  v_n       INT;
  v_conv    UUID;
  v_auteur  UUID;
BEGIN
  SELECT created_by INTO v_auteur FROM public.challenge_runs
   WHERE id = p_run AND statut = 'inscription' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deja_lance');
  END IF;

  SELECT ARRAY(SELECT user_id FROM public.challenge_run_members WHERE run_id = p_run)
    INTO v_membres;
  v_n := COALESCE(array_length(v_membres, 1), 0);

  -- Ceux qui n'ont pas répondu ne rejoignent pas un relais déjà parti.
  UPDATE public.relais_invitations
     SET statut = 'expiree', repondu_le = NOW()
   WHERE run_id = p_run AND statut = 'en_attente';

  IF v_n < 2 THEN
    UPDATE public.challenge_runs SET statut = 'annule', fini_le = NOW() WHERE id = p_run;
    RETURN jsonb_build_object('ok', false, 'raison', 'personne_na_accepte');
  END IF;

  -- Une conversation qui réunit exactement ces personnes, et où aucun
  -- relais ne tourne déjà : on la réutilise (le duo, en particulier).
  SELECT c.id INTO v_conv
    FROM public.conversations c
   WHERE (SELECT COUNT(*) FROM public.conversation_members cm WHERE cm.conversation_id = c.id) = v_n
     AND NOT EXISTS (
       SELECT 1 FROM unnest(v_membres) AS x
        WHERE NOT public.est_membre_conversation(c.id, x))
     AND NOT EXISTS (
       SELECT 1 FROM public.challenge_runs r
        WHERE r.conversation_id = c.id AND r.statut IN ('inscription','en_cours'))
   ORDER BY c.last_message_at DESC NULLS LAST
   LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations (type, created_by)
    VALUES (CASE WHEN v_n = 2 THEN 'duo' ELSE 'groupe' END, v_auteur)
    RETURNING id INTO v_conv;
    INSERT INTO public.conversation_members (conversation_id, user_id)
    SELECT v_conv, x FROM unnest(v_membres) AS x
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.challenge_runs
     SET statut          = 'en_cours',
         conversation_id = v_conv,
         max_membres     = v_n,
         serie           = public.serie_a_jouer(v_membres),
         starts_on       = CURRENT_DATE,
         ends_on         = CURRENT_DATE + (window_days - 1)
   WHERE id = p_run;

  INSERT INTO public.messages (conversation_id, user_id, contenu, type)
  SELECT v_conv, NULL,
         'Le relais est lancé. Vous grimpez les 4 maillons ensemble : on avance quand '
         || CASE WHEN v_n = 2 THEN 'les deux ont' ELSE 'tout le monde a' END
         || ' fait le maillon. Vous jouez pour ' || initcap(r.serie) || '.',
         'systeme'
    FROM public.challenge_runs r WHERE r.id = p_run;

  RETURN jsonb_build_object('ok', true, 'lance', true, 'run_id', p_run, 'conversation_id', v_conv);
END;
$$;

REVOKE ALL ON FUNCTION public.demarrer_relais_invite(UUID) FROM PUBLIC, anon, authenticated;

-- ── Inviter ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inviter_relais(p_amis UUID[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_amis  UUID[];
  v_run   UUID;
  v_m     UUID;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(p_amis, ARRAY[]::UUID[])) AS x
                WHERE x IS NOT NULL AND x <> v_user)
    INTO v_amis;

  IF COALESCE(array_length(v_amis, 1), 0) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_peu');
  END IF;
  IF array_length(v_amis, 1) > 4 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_nombreux');
  END IF;

  FOREACH v_m IN ARRAY v_amis LOOP
    IF NOT public.sont_en_relation(v_user, v_m) THEN
      RETURN jsonb_build_object('ok', false, 'raison', 'relation_requise');
    END IF;
  END LOOP;

  PERFORM public.fermer_relais_expires();

  IF EXISTS (
    SELECT 1 FROM public.challenge_run_members m
      JOIN public.challenge_runs r ON r.id = m.run_id
     WHERE m.user_id = v_user AND r.statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'mon_relais_ailleurs');
  END IF;

  INSERT INTO public.challenge_runs (created_by, serie, max_membres)
  VALUES (v_user, public.serie_a_jouer(ARRAY[v_user]), array_length(v_amis, 1) + 1)
  RETURNING id INTO v_run;

  INSERT INTO public.challenge_run_members (run_id, user_id) VALUES (v_run, v_user);

  INSERT INTO public.relais_invitations (run_id, user_id, invite_par)
  SELECT v_run, x, v_user FROM unnest(v_amis) AS x;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run);
END;
$$;

REVOKE ALL ON FUNCTION public.inviter_relais(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inviter_relais(UUID[]) TO authenticated;

-- ── Répondre ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.repondre_invitation_relais(p_run UUID, p_accepte BOOLEAN)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_inv  public.relais_invitations%ROWTYPE;
  v_run  public.challenge_runs%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT * INTO v_inv FROM public.relais_invitations
   WHERE run_id = p_run AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'invitation_invalide');
  END IF;

  SELECT * INTO v_run FROM public.challenge_runs WHERE id = p_run FOR UPDATE;

  IF v_inv.statut <> 'en_attente' OR v_run.statut <> 'inscription'
     OR v_inv.created_at < NOW() - INTERVAL '48 hours' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'invitation_passee',
                              'statut', v_run.statut, 'conversation_id', v_run.conversation_id);
  END IF;

  IF p_accepte THEN
    PERFORM public.fermer_relais_expires();
    IF EXISTS (
      SELECT 1 FROM public.challenge_run_members m
        JOIN public.challenge_runs r ON r.id = m.run_id
       WHERE m.user_id = v_user AND r.statut IN ('inscription','en_cours')
    ) THEN
      RETURN jsonb_build_object('ok', false, 'raison', 'mon_relais_ailleurs');
    END IF;

    INSERT INTO public.challenge_run_members (run_id, user_id)
    VALUES (p_run, v_user) ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.relais_invitations
     SET statut = CASE WHEN p_accepte THEN 'acceptee' ELSE 'refusee' END,
         repondu_le = NOW()
   WHERE run_id = p_run AND user_id = v_user;

  -- Tout le monde a répondu : on démarre avec ceux qui ont dit oui.
  IF NOT EXISTS (
    SELECT 1 FROM public.relais_invitations
     WHERE run_id = p_run AND statut = 'en_attente'
  ) THEN
    RETURN public.demarrer_relais_invite(p_run) || jsonb_build_object('ok', true);
  END IF;

  RETURN jsonb_build_object('ok', true, 'lance', false, 'run_id', p_run);
END;
$$;

REVOKE ALL ON FUNCTION public.repondre_invitation_relais(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repondre_invitation_relais(UUID, BOOLEAN) TO authenticated;

-- ── L'auteur démarre sans attendre les retardataires ─────────────
CREATE OR REPLACE FUNCTION public.lancer_relais_invite(p_run UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_runs WHERE id = p_run AND created_by = v_user
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;
  IF (SELECT COUNT(*) FROM public.challenge_run_members WHERE run_id = p_run) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'personne_na_accepte');
  END IF;
  RETURN public.demarrer_relais_invite(p_run);
END;
$$;

REVOKE ALL ON FUNCTION public.lancer_relais_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lancer_relais_invite(UUID) TO authenticated;

-- ── La fermeture des relais morts connaît les invitations ───────
-- Avant, un relais en `inscription` sans lien d'invitation valide
-- était fermé d'office : un relais sur invitation l'aurait été à la
-- seconde où il naissait.
CREATE OR REPLACE FUNCTION public.fermer_relais_expires()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ids   UUID[];
  v_finis INT := 0;
  v_morts INT := 0;
  v_r     UUID;
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

  -- Les invitations restées sans réponse 48 h expirent ; un relais
  -- dont tout le monde a fini par répondre (ou expirer) démarre avec
  -- ceux qui ont accepté, ou s'arrête si personne n'a dit oui.
  UPDATE public.relais_invitations
     SET statut = 'expiree', repondu_le = NOW()
   WHERE statut = 'en_attente' AND created_at < NOW() - INTERVAL '48 hours';

  FOR v_r IN
    SELECT r.id FROM public.challenge_runs r
     WHERE r.statut = 'inscription'
       AND EXISTS (SELECT 1 FROM public.relais_invitations i WHERE i.run_id = r.id)
       AND NOT EXISTS (SELECT 1 FROM public.relais_invitations i
                        WHERE i.run_id = r.id AND i.statut = 'en_attente')
  LOOP
    PERFORM public.demarrer_relais_invite(v_r);
  END LOOP;

  UPDATE public.challenge_runs r
     SET statut = 'termine', fini_le = NOW()
   WHERE r.statut = 'inscription'
     AND NOT EXISTS (
       SELECT 1 FROM public.invites i
        WHERE i.run_id = r.id AND i.expires_at > NOW()
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.relais_invitations i
        WHERE i.run_id = r.id AND i.statut = 'en_attente'
     );
  GET DIAGNOSTICS v_morts = ROW_COUNT;

  RETURN v_finis + v_morts;
END;
$$;

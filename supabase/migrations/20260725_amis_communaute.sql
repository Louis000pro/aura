-- ============================================================
-- Ajout d'amis depuis la communauté
--
-- Le modèle existant `followers` porte la demande :
--   A suit B, mais pas l'inverse = demande en attente
--   A suit B et B suit A      = amis
--
-- À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS :
--   1. 20260721_messagerie.sql
--   2. 20260721_amis_conversation.sql
--   3. les migrations messagerie du 20260725
-- Rejouable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.demander_ami(p_cible UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moi UUID := auth.uid();
  v_conversation UUID;
BEGIN
  IF v_moi IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;
  IF p_cible IS NULL OR p_cible = v_moi THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'cible_invalide');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_cible) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'introuvable');
  END IF;

  INSERT INTO public.followers (follower_id, following_id)
  VALUES (v_moi, p_cible)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = p_cible AND following_id = v_moi
  ) THEN
    v_conversation := public.ouvrir_fil_entre(v_moi, p_cible);
    RETURN jsonb_build_object(
      'ok', true,
      'statut', 'ami',
      'conversation_id', v_conversation
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'statut', 'envoyee');
END;
$$;

CREATE OR REPLACE FUNCTION public.accepter_demande_ami(p_demandeur UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moi UUID := auth.uid();
  v_conversation UUID;
BEGIN
  IF v_moi IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;
  IF p_demandeur IS NULL OR p_demandeur = v_moi THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'demande_invalide');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = p_demandeur AND following_id = v_moi
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'demande_absente');
  END IF;

  INSERT INTO public.followers (follower_id, following_id)
  VALUES (v_moi, p_demandeur)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  v_conversation := public.ouvrir_fil_entre(v_moi, p_demandeur);
  RETURN jsonb_build_object(
    'ok', true,
    'conversation_id', v_conversation
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ignorer_demande_ami(p_demandeur UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moi UUID := auth.uid();
BEGIN
  IF v_moi IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  DELETE FROM public.followers
  WHERE follower_id = p_demandeur
    AND following_id = v_moi
    AND NOT EXISTS (
      SELECT 1 FROM public.followers reciproque
      WHERE reciproque.follower_id = v_moi
        AND reciproque.following_id = p_demandeur
    );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.demander_ami(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accepter_demande_ami(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ignorer_demande_ami(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demander_ami(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accepter_demande_ami(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ignorer_demande_ami(UUID) TO authenticated;

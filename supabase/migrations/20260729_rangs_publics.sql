-- ============================================================
-- rangs_aura : l'EXP d'un LOT de comptes, pour afficher leur rang ailleurs
-- que sur son propre écran (communauté, profil public).
--
-- À exécuter APRÈS 20260726_missions_aura.sql (il crée aura_mission_credits).
--
-- Pourquoi une fonction serveur : `etat_missions_aura` refuse tout autre
-- utilisateur que soi, et `workout_sessions` / `aura_mission_credits` sont en
-- RLS « propriétaire seulement ». Un client ne PEUT donc pas calculer le rang
-- de quelqu'un d'autre : jusqu'ici le profil public affichait Bronze pour tout
-- le monde. Ici on n'expose qu'une chose, l'EXP totale, c'est-à-dire exactement
-- ce que le rang montre déjà publiquement. Aucune donnée d'entraînement,
-- aucune donnée de nutrition, aucun détail de mission ne sort.
--
-- Le +10 correspond au coup de pouce de bienvenue (EXP_BIENVENUE côté app) et
-- reprend à l'identique le calcul de `etat_missions_aura`.
-- ============================================================

CREATE OR REPLACE FUNCTION public.rangs_aura(p_users UUID[])
RETURNS TABLE (u_id UUID, u_exp INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Réservé aux comptes connectés : rien de public pour un visiteur anonyme.
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_users IS NULL OR array_length(p_users, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Garde-fou anti-moissonnage : on affiche des listes (membres d'un groupe,
  -- conversations, résultats de recherche), jamais un annuaire entier.
  IF array_length(p_users, 1) > 60 THEN
    RAISE EXCEPTION 'rangs_aura : 60 comptes maximum par appel';
  END IF;

  RETURN QUERY
  SELECT cible.id,
         10 + round(COALESCE(sum(credits.points), 0))::INTEGER
  FROM unnest(p_users) AS cible(id)
  LEFT JOIN public.aura_mission_credits AS credits
    ON credits.user_id = cible.id
  GROUP BY cible.id;
END;
$$;

REVOKE ALL ON FUNCTION public.rangs_aura(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rangs_aura(UUID[]) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- profil_public : les trois chiffres d'un profil vu par quelqu'un d'autre.
--
-- À exécuter APRÈS 20260726_missions_aura.sql (aura_mission_credits) et
-- 20260821_economie_exp_v2.sql (serie_aura). Rejouable sans risque.
--
-- ── LE PROBLÈME ─────────────────────────────────────────────────────
-- `/profil/[username]` comptait les séances et la série d'un ami avec le
-- client Supabase du navigateur, sur `workout_sessions`. Cette table est en
-- RLS PROPRIÉTAIRE (`USING (auth.uid() = user_id)`) : demander les séances de
-- quelqu'un d'autre ne rend RIEN. L'écran affichait donc « Séances 0 » et
-- « 🔥 0 » pour tout le monde, depuis toujours, et l'onglet « Séances » d'un
-- ami était vide par construction.
--
-- C'est exactement le bug des statistiques d'administration corrigé le
-- 11 août, resté ici. Et la réponse est la même : on NE relâche PAS la
-- policy (l'ouvrir pour le confort d'un écran l'ouvrirait à tout le monde),
-- on passe par une fonction serveur qui n'expose que le résultat.
--
-- ── CE QUI SORT, ET RIEN D'AUTRE ────────────────────────────────────
-- L'EXP totale, le nombre de séances, la longueur de la série. Trois totaux,
-- du même ordre que le rang que le profil montre déjà publiquement. Aucun
-- titre de séance, aucune date, aucune donnée de nutrition, aucun détail de
-- mission. Ce que l'écran ne peut pas prouver, il ne l'affiche pas.
--
-- ⚠️ UN SEUL COMPTE PAR APPEL, contrairement à `rangs_aura(uuid[])`.
-- `serie_aura` remonte jusqu'à 400 jours de registre : la lancer sur un lot
-- de soixante comptes coûterait soixante balayages pour une information dont
-- une seule liste a besoin. Les listes (communauté, membres d'un groupe)
-- continuent d'utiliser `rangs_aura`, qui est un simple `sum()` groupé.
--
-- ⚠️ LA SÉRIE SE LIT AVEC `serie_aura`, ELLE NE SE RECOMPTE PAS. Il n'existe
-- qu'une définition de « journée active » dans le produit (une séance ou un
-- repas, décision du 21 août) et elle vit là. La boucle sur 60 jours qui
-- vivait dans l'écran comptait des SÉANCES, donc elle aurait de toute façon
-- rendu un autre nombre que la série affichée sur l'accueil.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.profil_public(p_user UUID)
RETURNS TABLE (u_exp INTEGER, u_seances INTEGER, u_serie INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Réservé aux comptes connectés : rien de public pour un visiteur anonyme.
  IF auth.uid() IS NULL OR p_user IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    -- Le +10 est le coup de pouce de bienvenue (EXP_BIENVENUE côté app).
    -- Repris à l'identique de `rangs_aura` et d'`etat_missions_aura` : trois
    -- calculs d'EXP qui ne donneraient pas le même nombre seraient pires que
    -- pas de nombre du tout.
    (10 + round(COALESCE((
      SELECT sum(credits.points)
      FROM public.aura_mission_credits AS credits
      WHERE credits.user_id = p_user
    ), 0)))::INTEGER,
    (SELECT count(*) FROM public.workout_sessions AS s WHERE s.user_id = p_user)::INTEGER,
    public.serie_aura(p_user);
END;
$$;

REVOKE ALL ON FUNCTION public.profil_public(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profil_public(UUID) TO authenticated;

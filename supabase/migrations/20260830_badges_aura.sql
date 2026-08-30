-- ════════════════════════════════════════════════════════════════════
-- badges_aura : les badges d'un compte, DÉRIVÉS au lieu d'être comptés.
--
-- À exécuter APRÈS 20260726_missions_aura.sql (aura_mission_credits) et
-- 20260721_messagerie.sql (profile_badges). Rejouable sans risque.
--
-- ── LE PROBLÈME ─────────────────────────────────────────────────────
-- Il n'existait que QUATRE badges dans toute l'application, et les quatre
-- sont écrits par `valider_action_defi` : `premier-relais` et les trois
-- `serie-<affiche>`. Autrement dit AUCUN badge ne pouvait se gagner seul.
-- Quelqu'un qui s'entraîne depuis six mois sans jamais lancer de relais
-- n'en avait aucun, et son étagère ne s'affichait même pas.
--
-- Il y en a eu vingt-deux, supprimés le 11 août. Ce n'est pas le catalogue
-- qui était mauvais : ils se RECOMPTAIENT dans le navigateur à chaque
-- ouverture de l'écran, en sept requêtes, sans jamais rien garder.
--
-- ── LE REMÈDE, QUI EST DÉJÀ ÉCRIT ───────────────────────────────────
-- C'est celui de la série, tranché le 21 août : ON DÉRIVE. Un compteur se
-- désynchronise (c'est arrivé sur `daily_stats.streak`), une dérivation ne
-- le peut pas. `serie_aura` tire la série du registre ; `badges_aura` tire
-- les badges des mêmes sources, en une seule fonction.
--
-- Conséquence qui vaut d'être dite : PERSONNE N'A RIEN À REJOUER. Le
-- registre `aura_mission_credits` est immuable depuis le 26 juillet et
-- porte déjà tout l'historique, donc les badges sont rétroactifs par
-- construction. Aucun backfill, aucune table de plus.
--
-- ⚠️ LE CATALOGUE N'EST PAS ICI, IL EST DANS `src/lib/badges.ts`.
-- Cette fonction ne rend que des SLUGS et trois nombres. Le nom, le visage
-- et l'ordre d'affichage d'un badge changent sans migration, exactement
-- comme aujourd'hui pour les badges du relais.
--
-- ⚠️ UN BADGE DÉRIVÉ SUIT SON CHIFFRE, DANS LES DEUX SENS. Supprimer
-- cinquante séances depuis son profil fait redescendre le compte, donc le
-- badge s'éteint. Ce n'est pas un défaut, c'est la définition : le badge
-- dit « j'ai cent séances », et l'étagère montre ce qui est vrai
-- maintenant. Les quatre badges du relais, eux, restent posés en base et
-- ne s'éteignent jamais.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.badges_aura(p_user UUID)
RETURNS TABLE (
  b_slugs   TEXT[],
  b_serie   INTEGER,
  b_seances INTEGER,
  b_repas   INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moi      BOOLEAN;
  v_actifs   DATE[];
  v_jour     DATE;
  v_precedent DATE;
  v_courante INTEGER := 0;
  v_record   INTEGER := 0;
  v_seances  INTEGER;
  v_repas    INTEGER;
  v_slugs    TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF auth.uid() IS NULL OR p_user IS NULL THEN
    RETURN;
  END IF;

  v_moi := (p_user = auth.uid());

  /* ── La régularité : la PLUS LONGUE série, jamais la série en cours ──
     Un badge de régularité qui s'éteindrait le jour où on rate un lundi
     punirait exactement la personne qu'il est censé féliciter. On cherche
     donc le plus long enchaînement de journées actives, sur l'historique
     entier du registre. « Journée active » a une seule définition dans le
     produit (une séance OU un repas, décision du 21 août) et c'est celle
     de `jours_actifs_aura` : on ne s'en écrit pas une deuxième. */
  v_actifs := public.jours_actifs_aura(
    p_user,
    (now() AT TIME ZONE 'Europe/Paris')::date - 3650,
    (now() AT TIME ZONE 'Europe/Paris')::date
  );

  FOR v_jour IN SELECT unnest(v_actifs) ORDER BY 1 LOOP
    IF v_courante > 0 AND v_jour = v_precedent + 1 THEN
      v_courante := v_courante + 1;
    ELSE
      v_courante := 1;
    END IF;
    IF v_courante > v_record THEN v_record := v_courante; END IF;
    v_precedent := v_jour;
  END LOOP;

  SELECT count(*) INTO v_seances FROM public.workout_sessions WHERE user_id = p_user;
  SELECT count(*) INTO v_repas   FROM public.nutrition_logs   WHERE user_id = p_user;

  IF v_record  >=   7 THEN v_slugs := v_slugs || 'regularite-7';   END IF;
  IF v_record  >=  30 THEN v_slugs := v_slugs || 'regularite-30';  END IF;
  IF v_record  >= 100 THEN v_slugs := v_slugs || 'regularite-100'; END IF;
  IF v_seances >=  10 THEN v_slugs := v_slugs || 'seances-10';     END IF;
  IF v_seances >=  50 THEN v_slugs := v_slugs || 'seances-50';     END IF;
  IF v_seances >= 100 THEN v_slugs := v_slugs || 'seances-100';    END IF;
  IF v_repas   >=  30 THEN v_slugs := v_slugs || 'repas-30';       END IF;
  IF v_repas   >= 100 THEN v_slugs := v_slugs || 'repas-100';      END IF;

  /* Les badges du relais viennent de `profile_badges`, où ils sont posés
     par `valider_action_defi`. Ils entrent dans la MÊME liste : l'écran
     n'a qu'une source à lire, et personne ne peut oublier d'en fusionner
     deux. `profile_badges` reste lisible de tous (`USING (true)`), donc
     rien n'est perdu si cette fonction n'est pas encore collée. */
  v_slugs := v_slugs || COALESCE(
    (SELECT array_agg(DISTINCT badge_slug) FROM public.profile_badges WHERE user_id = p_user),
    ARRAY[]::TEXT[]
  );

  /* ⚠️ LES TROIS NOMBRES NE SORTENT QUE POUR SOI. Ils servent à écrire
     « Le prochain : Cent séances, encore 12 », c'est-à-dire une phrase
     qui n'a de sens que sur son propre profil. Un badge est fait pour se
     voir de l'extérieur ; le détail de ce qui reste à faire, non. */
  RETURN QUERY SELECT
    v_slugs,
    CASE WHEN v_moi THEN v_record  END,
    CASE WHEN v_moi THEN v_seances END,
    CASE WHEN v_moi THEN v_repas   END;
END;
$$;

REVOKE ALL ON FUNCTION public.badges_aura(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.badges_aura(UUID) TO authenticated;

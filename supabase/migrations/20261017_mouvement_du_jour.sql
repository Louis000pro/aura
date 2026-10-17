-- ════════════════════════════════════════════════════════════════════
-- LE MOUVEMENT DU JOUR RAPPORTE 5 EXP, UNE FOIS PAR JOUR (Louis, 2026-10-17)
--
-- Le mot du Guide porte une carte fermée : la silhouette d'un des 102
-- mouvements animés, le même pour tout le monde ce jour-là. La toucher la
-- retourne, et ce geste rapporte +5 EXP, une seule fois par jour parisien.
-- La revoir dans la journée ne rapporte rien de plus.
--
-- C'est une mission du catalogue comme les autres (`MISSIONS` dans
-- src/lib/aura.ts, id « mouvement ») : elle s'affiche avec son gain AVANT
-- d'agir, et rien ne la crédite en cachette.
--
-- ⚠️ LA BASE NE SAIT PAS QUEL MOUVEMENT EST CELUI DU JOUR, et n'en a pas
-- besoin : la rotation vit côté écran (`mouvementDuJour`), la base ne garde
-- que le fait « découvert aujourd'hui ». La clé de période est le jour
-- parisien, comme pour la connexion.
-- ⚠️ RIEN D'AUTRE NE BOUGE. La série, la journée complète et les missions
-- de la semaine ne comptent pas cette découverte : ce n'est pas une action
-- utile, c'est un rendez-vous.
--
-- À coller APRÈS 20261017_connexion_doublee.sql. Rejouable.
-- ════════════════════════════════════════════════════════════════════

-- 1. Le registre accepte le nouvel identifiant. La liste reprend celle de
--    la base mot pour mot (`semaine_intense` comprise : la mission est
--    retirée depuis le 2026-08-21, mais ses crédits restent au registre).
ALTER TABLE public.aura_mission_credits
  DROP CONSTRAINT IF EXISTS aura_mission_credits_mission_id_check;

ALTER TABLE public.aura_mission_credits
  ADD CONSTRAINT aura_mission_credits_mission_id_check CHECK (mission_id = ANY (ARRAY[
    'connexion', 'seance', 'repas', 'journee_complete',
    'double_seance', 'leve_tot', 'nutrition_complete', 'objectif_accompli',
    'semaine_active', 'semaine_reguliere', 'semaine_parfaite', 'semaine_intense',
    'mouvement_du_jour'
  ]::text[]));


-- 2. Découvrir le mouvement du jour.
--    Rend `true` quand les 5 EXP viennent d'être crédités, `false` quand ils
--    l'étaient déjà aujourd'hui, `NULL` sans session. L'écran ne fait monter
--    « +5 EXP » que sur `true` : un gain qu'on n'a pas eu ne s'anime pas.
CREATE OR REPLACE FUNCTION public.decouvrir_mouvement_aura()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  -- Deux touchers presque simultanés (deux onglets, un double appui) se
  -- suivent au lieu de se croiser : sans ce verrou, les deux liraient
  -- « pas encore crédité » et l'écran annoncerait deux gains pour une
  -- seule ligne au registre.
  PERFORM pg_advisory_xact_lock(hashtextextended('mouvement_du_jour:' || v_user::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.aura_mission_credits
    WHERE user_id = v_user
      AND mission_id = 'mouvement_du_jour'
      AND period_key = v_today::text
  ) THEN
    RETURN false;
  END IF;

  PERFORM public.crediter_mission_aura(
    v_user, 'mouvement_du_jour', 'day', v_today::text, 5, false
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.decouvrir_mouvement_aura() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decouvrir_mouvement_aura() TO authenticated;


-- 3. L'état des missions porte la nouvelle (`mouvement`). Tout le reste est
--    la fonction en place, inchangée : même EXP totale, même série, même
--    version (2), donc rien ne bouge pour l'app tant qu'elle ne lit pas
--    cette clé.
CREATE OR REPLACE FUNCTION public.etat_missions_aura(p_user UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_today        DATE      := v_now::date;
  v_week         TEXT      := to_char(v_today, 'IYYY-"W"IW');
  v_week_start   DATE      := date_trunc('week', v_today::timestamp)::date;
  v_premium      BOOLEAN   := false;
  v_exp          INTEGER   := 10;
  v_credits      TEXT[]    := ARRAY[]::TEXT[];
  v_sessions     INTEGER   := 0;
  v_valid_today  INTEGER   := 0;
  v_early        INTEGER   := 0;
  v_meals        INTEGER   := 0;
  v_core_meals   INTEGER   := 0;
  v_actifs       INTEGER   := 0;
  v_serie        INTEGER   := 0;
  v_jour_valide  BOOLEAN   := false;
  v_connexion    BOOLEAN   := false;
  v_seance       BOOLEAN   := false;
  v_repas        BOOLEAN   := false;
  v_mouvement    BOOLEAN   := false;
  v_jours_total  INTEGER   := 0;
  v_seances_tot  INTEGER   := 0;
  v_repas_tot    INTEGER   := 0;
BEGIN
  IF p_user IS NULL OR p_user <> auth.uid() THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(is_premium, false) OR COALESCE(is_admin, false)
    INTO v_premium
  FROM public.profiles WHERE id = p_user;
  v_premium := COALESCE(v_premium, false);

  -- L'EXP totale : le socle de bienvenue plus la somme du registre.
  -- Exactement la même formule que `rangs_aura` et le cron de rappels.
  SELECT 10 + round(COALESCE(sum(points), 0))::integer,
         COALESCE(array_agg(mission_id) FILTER (
           WHERE (period_type = 'day' AND period_key = v_today::text)
              OR (period_type = 'week' AND period_key = v_week)
         ), ARRAY[]::TEXT[]),
         count(*) FILTER (WHERE mission_id = 'seance')::integer,
         count(*) FILTER (WHERE mission_id = 'repas')::integer,
         count(*) FILTER (WHERE mission_id = 'connexion')::integer
  INTO v_exp, v_credits, v_seances_tot, v_repas_tot, v_jours_total
  FROM public.aura_mission_credits
  WHERE user_id = p_user;

  v_connexion := 'connexion' = ANY(v_credits);
  v_seance    := 'seance' = ANY(v_credits);
  v_repas     := 'repas' = ANY(v_credits);
  v_mouvement := 'mouvement_du_jour' = ANY(v_credits);
  v_jour_valide := v_seance OR v_repas;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE duration_minutes >= 5)::integer,
         count(*) FILTER (
           WHERE duration_minutes >= 5
             AND (started_at AT TIME ZONE 'Europe/Paris')::time < TIME '09:00'
         )::integer
  INTO v_sessions, v_valid_today, v_early
  FROM public.workout_sessions
  WHERE user_id = p_user
    AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

  SELECT count(*)::integer,
         count(DISTINCT CASE
           WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
           WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
           WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
           ELSE NULL
         END)::integer
  INTO v_meals, v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = p_user AND date = v_today;

  SELECT COALESCE(array_length(
    public.jours_actifs_aura(p_user, v_week_start, v_week_start + 6), 1
  ), 0) INTO v_actifs;

  v_serie := public.serie_aura(p_user);

  RETURN jsonb_build_object(
    'version', 2,
    'exp', v_exp,
    'premium', v_premium,
    'serie', v_serie,
    'jourValide', v_jour_valide,
    'detail', jsonb_build_object(
      'seances', v_seances_tot,
      'repas', v_repas_tot,
      'jours', v_jours_total,
      'joursActifsSemaine', v_actifs,
      'streak', v_serie
    ),
    'missions', jsonb_build_object(
      'connexion', jsonb_build_object(
        'progress', CASE WHEN v_connexion THEN 1 ELSE 0 END, 'target', 1,
        'complete', v_connexion, 'earned', v_connexion),
      'seance', jsonb_build_object(
        'progress', LEAST(v_sessions, 1), 'target', 1,
        'complete', v_seance, 'earned', v_seance),
      'repas', jsonb_build_object(
        'progress', LEAST(v_meals, 1), 'target', 1,
        'complete', v_repas, 'earned', v_repas),
      'journee', jsonb_build_object(
        'progress', (CASE WHEN v_connexion THEN 1 ELSE 0 END)
                  + (CASE WHEN v_seance THEN 1 ELSE 0 END)
                  + (CASE WHEN v_repas THEN 1 ELSE 0 END),
        'target', 3,
        'complete', v_connexion AND v_seance AND v_repas,
        'earned', 'journee_complete' = ANY(v_credits)),
      'mouvement', jsonb_build_object(
        'progress', CASE WHEN v_mouvement THEN 1 ELSE 0 END, 'target', 1,
        'complete', v_mouvement, 'earned', v_mouvement),
      'double', jsonb_build_object(
        'progress', LEAST(v_valid_today, 2), 'target', 2,
        'complete', v_valid_today >= 2, 'earned', 'double_seance' = ANY(v_credits)),
      'matin', jsonb_build_object(
        'progress', LEAST(v_early, 1), 'target', 1,
        'complete', v_early >= 1, 'earned', 'leve_tot' = ANY(v_credits)),
      'nutrition', jsonb_build_object(
        'progress', LEAST(v_core_meals, 3), 'target', 3,
        'complete', v_core_meals >= 3, 'earned', 'nutrition_complete' = ANY(v_credits)),
      'objectif', jsonb_build_object(
        'progress', (CASE WHEN v_seance THEN 1 ELSE 0 END)
                  + (CASE WHEN v_repas THEN 1 ELSE 0 END),
        'target', 2,
        'complete', v_seance AND v_repas,
        'earned', 'objectif_accompli' = ANY(v_credits)),
      'semaineActive', jsonb_build_object(
        'progress', LEAST(v_actifs, 3), 'target', 3,
        'complete', v_actifs >= 3, 'earned', 'semaine_active' = ANY(v_credits)),
      'semaineReguliere', jsonb_build_object(
        'progress', LEAST(v_actifs, 5), 'target', 5,
        'complete', v_actifs >= 5, 'earned', 'semaine_reguliere' = ANY(v_credits)),
      'semaineParfaite', jsonb_build_object(
        'progress', LEAST(v_actifs, 7), 'target', 7,
        'complete', v_actifs >= 7, 'earned', 'semaine_parfaite' = ANY(v_credits))
    )
  );
END;
$$;

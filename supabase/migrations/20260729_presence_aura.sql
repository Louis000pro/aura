-- ============================================================
-- La présence du jour, comme une action à part entière
-- À exécuter APRÈS 20260726_missions_aura.sql.
--
-- Avant : la mission « Connexion du jour » se créditait en effet de bord
-- d'un UPDATE de daily_stats lancé par l'accueil. Une écriture ratée
-- (policy, course entre deux effets, arrivée par une autre page) ne
-- créditait rien, en silence.
--
-- Maintenant : une seule fonction, appelable depuis n'importe quel écran,
-- qui écrit la ligne du jour, tient la SÉRIE et crédite la mission
-- elle-même. Idempotente par construction : le registre de crédits
-- refuse le doublon (user_id, mission_id, period_key).
-- ============================================================

CREATE OR REPLACE FUNCTION public.marquer_presence_aura()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user       UUID    := auth.uid();
  v_today      DATE    := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week       TEXT    := to_char(v_today, 'IYYY-"W"IW');
  v_week_start DATE    := date_trunc('week', v_today::timestamp)::date;
  v_hier       INTEGER := 0;
  v_streak     INTEGER;
  v_days       INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  -- La série : reprise de la veille si elle existe, sinon on repart à 1.
  -- Une série déjà comptée aujourd'hui ne se ré-incrémente jamais.
  SELECT COALESCE(streak, 0) INTO v_streak
  FROM public.daily_stats
  WHERE user_id = v_user AND date = v_today;

  IF v_streak IS NULL OR v_streak < 1 THEN
    SELECT COALESCE(streak, 0) INTO v_hier
    FROM public.daily_stats
    WHERE user_id = v_user AND date = v_today - 1;
    v_streak := GREATEST(COALESCE(v_hier, 0), 0) + 1;
  END IF;

  INSERT INTO public.daily_stats (user_id, date, streak)
  VALUES (v_user, v_today, v_streak)
  ON CONFLICT (user_id, date) DO UPDATE SET streak = EXCLUDED.streak;

  -- On crédite ici plutôt que d'attendre le trigger : la présence ne doit
  -- plus dépendre d'un effet de bord.
  PERFORM public.crediter_mission_aura(
    v_user, 'connexion', 'day', v_today::text, 5, false
  );

  SELECT count(DISTINCT date)::integer INTO v_days
  FROM public.daily_stats
  WHERE user_id = v_user
    AND date BETWEEN v_week_start AND v_week_start + 6;

  IF v_days >= 7 THEN
    PERFORM public.crediter_mission_aura(
      v_user, 'semaine_parfaite', 'week', v_week, 35, true
    );
  END IF;

  RETURN jsonb_build_object('date', v_today, 'streak', v_streak);
END;
$$;

REVOKE ALL ON FUNCTION public.marquer_presence_aura() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marquer_presence_aura() TO authenticated;

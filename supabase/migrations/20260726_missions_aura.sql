-- ============================================================
-- Missions Aura : crédits idempotents, périodes Paris et Premium
-- À exécuter APRÈS les migrations workout_sessions / daily_stats.
--
-- Une récompense ne peut exister qu'une fois pour le triplet :
--   utilisateur + mission + période (jour ISO ou semaine ISO).
-- Les triggers utilisent toujours l'instant réel de l'écriture pour empêcher
-- qu'une action antidatée ou future crédite une autre période.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.aura_mission_credits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id  TEXT        NOT NULL CHECK (mission_id IN (
    'connexion', 'seance', 'repas',
    'double_seance', 'leve_tot', 'semaine_intense',
    'nutrition_complete', 'semaine_parfaite'
  )),
  period_type TEXT        NOT NULL CHECK (period_type IN ('day', 'week')),
  period_key  TEXT        NOT NULL,
  points      NUMERIC(8,1) NOT NULL CHECK (points > 0),
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, period_key)
);

ALTER TABLE public.aura_mission_credits ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.aura_mission_credits TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.aura_mission_credits FROM anon, authenticated;

DROP POLICY IF EXISTS "Read own aura mission credits" ON public.aura_mission_credits;
CREATE POLICY "Read own aura mission credits"
  ON public.aura_mission_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS aura_mission_credits_user_idx
  ON public.aura_mission_credits (user_id, earned_at DESC);

-- Aucune policy INSERT / UPDATE / DELETE côté client : seuls les triggers
-- SECURITY DEFINER peuvent émettre un crédit.
CREATE OR REPLACE FUNCTION public.crediter_mission_aura(
  p_user UUID,
  p_mission TEXT,
  p_period_type TEXT,
  p_period_key TEXT,
  p_points NUMERIC,
  p_premium_only BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_premium BOOLEAN;
  v_points NUMERIC(8,1);
BEGIN
  SELECT COALESCE(is_premium, false) OR COALESCE(is_admin, false)
    INTO v_premium
  FROM public.profiles
  WHERE id = p_user;

  v_premium := COALESCE(v_premium, false);
  IF p_premium_only AND NOT v_premium THEN
    RETURN;
  END IF;

  -- Le bonus ×1,5 porte uniquement sur les trois missions de base.
  v_points := CASE
    WHEN NOT p_premium_only AND v_premium THEN p_points * 1.5
    ELSE p_points
  END;

  INSERT INTO public.aura_mission_credits
    (user_id, mission_id, period_type, period_key, points)
  VALUES
    (p_user, p_mission, p_period_type, p_period_key, v_points)
  ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;
END;
$$;

-- Fonction interne uniquement : sans ce REVOKE, un client authentifié pourrait
-- tenter de l'appeler directement avec un montant arbitraire.
REVOKE ALL ON FUNCTION public.crediter_mission_aura(UUID, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.crediter_connexion_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week TEXT := to_char(v_today, 'IYYY-"W"IW');
  v_week_start DATE := date_trunc('week', v_today::timestamp)::date;
  v_days INTEGER;
BEGIN
  IF NEW.date <> v_today THEN
    RETURN NEW;
  END IF;

  PERFORM public.crediter_mission_aura(
    NEW.user_id, 'connexion', 'day', v_today::text, 5, false
  );

  SELECT count(DISTINCT date)::integer INTO v_days
  FROM public.daily_stats
  WHERE user_id = NEW.user_id
    AND date BETWEEN v_week_start AND v_week_start + 6;

  IF v_days >= 7 THEN
    PERFORM public.crediter_mission_aura(
      NEW.user_id, 'semaine_parfaite', 'week', v_week, 35, true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_connexion_credit ON public.daily_stats;
CREATE TRIGGER aura_connexion_credit
AFTER INSERT OR UPDATE ON public.daily_stats
FOR EACH ROW EXECUTE FUNCTION public.crediter_connexion_aura();

CREATE OR REPLACE FUNCTION public.crediter_seance_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_today DATE := v_now::date;
  v_session_local TIMESTAMP := NEW.started_at AT TIME ZONE 'Europe/Paris';
  v_week TEXT := to_char(v_today, 'IYYY-"W"IW');
  v_week_start TIMESTAMP := date_trunc('week', v_now);
  v_day_count INTEGER;
  v_week_count INTEGER;
BEGIN
  -- Une séance ancienne/future ajoutée après coup ne crédite aucune mission.
  IF NEW.started_at IS NULL
     OR v_session_local::date <> v_today
     OR COALESCE(NEW.duration_minutes, 0) < 1 THEN
    RETURN NEW;
  END IF;

  PERFORM public.crediter_mission_aura(
    NEW.user_id, 'seance', 'day', v_today::text, 35, false
  );

  -- Les missions Premium exigent une vraie séance d'au moins cinq minutes.
  IF COALESCE(NEW.duration_minutes, 0) < 5 THEN
    RETURN NEW;
  END IF;

  IF v_session_local::time < TIME '09:00' THEN
    PERFORM public.crediter_mission_aura(
      NEW.user_id, 'leve_tot', 'day', v_today::text, 40, true
    );
  END IF;

  SELECT count(*)::integer INTO v_day_count
  FROM public.workout_sessions
  WHERE user_id = NEW.user_id
    AND duration_minutes >= 5
    AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

  IF v_day_count >= 2 THEN
    PERFORM public.crediter_mission_aura(
      NEW.user_id, 'double_seance', 'day', v_today::text, 60, true
    );
  END IF;

  SELECT count(*)::integer INTO v_week_count
  FROM public.workout_sessions
  WHERE user_id = NEW.user_id
    AND duration_minutes >= 5
    AND (started_at AT TIME ZONE 'Europe/Paris') >= v_week_start
    AND (started_at AT TIME ZONE 'Europe/Paris') < v_week_start + INTERVAL '7 days';

  IF v_week_count >= 5 THEN
    PERFORM public.crediter_mission_aura(
      NEW.user_id, 'semaine_intense', 'week', v_week, 50, true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_seance_credit ON public.workout_sessions;
CREATE TRIGGER aura_seance_credit
AFTER INSERT ON public.workout_sessions
FOR EACH ROW EXECUTE FUNCTION public.crediter_seance_aura();

CREATE OR REPLACE FUNCTION public.crediter_repas_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_core_meals INTEGER;
BEGIN
  -- Le journal peut accepter l'historique, mais seule une action du jour donne
  -- de l'EXP. Répéter un repas aujourd'hui ne recrédite pas la mission de base.
  IF NEW.date <> v_today THEN
    RETURN NEW;
  END IF;

  PERFORM public.crediter_mission_aura(
    NEW.user_id, 'repas', 'day', v_today::text, 5, false
  );

  SELECT count(DISTINCT CASE
    WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
    WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
    WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
    ELSE NULL
  END)::integer
  INTO v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = NEW.user_id
    AND date = v_today;

  IF v_core_meals >= 3 THEN
    PERFORM public.crediter_mission_aura(
      NEW.user_id, 'nutrition_complete', 'day', v_today::text, 15, true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_repas_credit ON public.nutrition_logs;
CREATE TRIGGER aura_repas_credit
AFTER INSERT ON public.nutrition_logs
FOR EACH ROW EXECUTE FUNCTION public.crediter_repas_aura();

-- Si l'abonnement est activé après que l'utilisateur a déjà rempli une
-- condition de la période courante, la récompense correspondante est émise au
-- moment de l'activation. On ne reprend pas arbitrairement les anciennes
-- périodes : le Premium commence à produire ses avantages maintenant.
CREATE OR REPLACE FUNCTION public.crediter_activation_premium_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_premium BOOLEAN := COALESCE(OLD.is_premium, false) OR COALESCE(OLD.is_admin, false);
  v_is_premium BOOLEAN := COALESCE(NEW.is_premium, false) OR COALESCE(NEW.is_admin, false);
  v_now TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_today DATE := v_now::date;
  v_week TEXT := to_char(v_today, 'IYYY-"W"IW');
  v_week_start TIMESTAMP := date_trunc('week', v_now);
  v_day_sessions INTEGER;
  v_week_sessions INTEGER;
  v_early INTEGER;
  v_core_meals INTEGER;
  v_days INTEGER;
BEGIN
  IF v_was_premium OR NOT v_is_premium THEN
    RETURN NEW;
  END IF;

  SELECT count(*) FILTER (WHERE duration_minutes >= 5)::integer,
         count(*) FILTER (
           WHERE duration_minutes >= 5
             AND (started_at AT TIME ZONE 'Europe/Paris')::time < TIME '09:00'
         )::integer
  INTO v_day_sessions, v_early
  FROM public.workout_sessions
  WHERE user_id = NEW.id
    AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

  SELECT count(*)::integer INTO v_week_sessions
  FROM public.workout_sessions
  WHERE user_id = NEW.id
    AND duration_minutes >= 5
    AND (started_at AT TIME ZONE 'Europe/Paris') >= v_week_start
    AND (started_at AT TIME ZONE 'Europe/Paris') < v_week_start + INTERVAL '7 days';

  SELECT count(DISTINCT CASE
    WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
    WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
    WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
    ELSE NULL
  END)::integer
  INTO v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = NEW.id AND date = v_today;

  SELECT count(DISTINCT date)::integer INTO v_days
  FROM public.daily_stats
  WHERE user_id = NEW.id
    AND date BETWEEN v_week_start::date AND v_week_start::date + 6;

  IF v_day_sessions >= 2 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'double_seance', 'day', v_today::text, 60, true);
  END IF;
  IF v_early >= 1 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'leve_tot', 'day', v_today::text, 40, true);
  END IF;
  IF v_week_sessions >= 5 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'semaine_intense', 'week', v_week, 50, true);
  END IF;
  IF v_core_meals >= 3 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'nutrition_complete', 'day', v_today::text, 15, true);
  END IF;
  IF v_days >= 7 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'semaine_parfaite', 'week', v_week, 35, true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_activation_premium_credit ON public.profiles;
CREATE TRIGGER aura_activation_premium_credit
AFTER UPDATE OF is_premium, is_admin ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.crediter_activation_premium_aura();

-- État unique consommé par l'accueil : total d'EXP + progression des missions
-- courantes. Les frontières jour/semaine sont toutes calculées à Paris.
CREATE OR REPLACE FUNCTION public.etat_missions_aura(p_user UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_today DATE := v_now::date;
  v_week TEXT := to_char(v_today, 'IYYY-"W"IW');
  v_week_start TIMESTAMP := date_trunc('week', v_now);
  v_premium BOOLEAN := false;
  v_exp INTEGER := 10;
  v_streak INTEGER := 0;
  v_sessions_today INTEGER := 0;
  v_valid_sessions_today INTEGER := 0;
  v_valid_sessions_week INTEGER := 0;
  v_early INTEGER := 0;
  v_meals_today INTEGER := 0;
  v_core_meals INTEGER := 0;
  v_days_week INTEGER := 0;
  v_credit_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_user IS NULL OR p_user <> auth.uid() THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(is_premium, false) OR COALESCE(is_admin, false)
    INTO v_premium
  FROM public.profiles WHERE id = p_user;
  v_premium := COALESCE(v_premium, false);

  SELECT 10 + round(COALESCE(sum(points), 0))::integer,
         COALESCE(array_agg(mission_id) FILTER (
           WHERE (period_type = 'day' AND period_key = v_today::text)
              OR (period_type = 'week' AND period_key = v_week)
         ), ARRAY[]::TEXT[])
  INTO v_exp, v_credit_ids
  FROM public.aura_mission_credits
  WHERE user_id = p_user;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE duration_minutes >= 5)::integer,
         count(*) FILTER (
           WHERE duration_minutes >= 5
             AND (started_at AT TIME ZONE 'Europe/Paris')::time < TIME '09:00'
         )::integer
  INTO v_sessions_today, v_valid_sessions_today, v_early
  FROM public.workout_sessions
  WHERE user_id = p_user
    AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

  SELECT count(*)::integer INTO v_valid_sessions_week
  FROM public.workout_sessions
  WHERE user_id = p_user
    AND duration_minutes >= 5
    AND (started_at AT TIME ZONE 'Europe/Paris') >= v_week_start
    AND (started_at AT TIME ZONE 'Europe/Paris') < v_week_start + INTERVAL '7 days';

  SELECT count(*)::integer,
         count(DISTINCT CASE
           WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
           WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
           WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
           ELSE NULL
         END)::integer
  INTO v_meals_today, v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = p_user AND date = v_today;

  SELECT count(DISTINCT date)::integer,
         COALESCE(max(streak) FILTER (WHERE date = v_today), 0)::integer
  INTO v_days_week, v_streak
  FROM public.daily_stats
  WHERE user_id = p_user
    AND date BETWEEN v_week_start::date AND v_week_start::date + 6;

  RETURN jsonb_build_object(
    'exp', v_exp,
    'premium', v_premium,
    'detail', jsonb_build_object(
      'seances', (SELECT count(*) FROM public.aura_mission_credits WHERE user_id = p_user AND mission_id = 'seance'),
      'repas', (SELECT count(*) FROM public.aura_mission_credits WHERE user_id = p_user AND mission_id = 'repas'),
      'jours', (SELECT count(*) FROM public.aura_mission_credits WHERE user_id = p_user AND mission_id = 'connexion'),
      'streak', v_streak
    ),
    'today', jsonb_build_object(
      'connexion', jsonb_build_object('progress', CASE WHEN 'connexion' = ANY(v_credit_ids) THEN 1 ELSE 0 END, 'target', 1, 'complete', 'connexion' = ANY(v_credit_ids), 'earned', 'connexion' = ANY(v_credit_ids)),
      'seance', jsonb_build_object('progress', LEAST(v_sessions_today, 1), 'target', 1, 'complete', 'seance' = ANY(v_credit_ids), 'earned', 'seance' = ANY(v_credit_ids)),
      'repas', jsonb_build_object('progress', LEAST(v_meals_today, 1), 'target', 1, 'complete', 'repas' = ANY(v_credit_ids), 'earned', 'repas' = ANY(v_credit_ids))
    ),
    'premiumMissions', jsonb_build_object(
      'double', jsonb_build_object('progress', LEAST(v_valid_sessions_today, 2), 'target', 2, 'complete', v_valid_sessions_today >= 2, 'earned', 'double_seance' = ANY(v_credit_ids)),
      'matin', jsonb_build_object('progress', LEAST(v_early, 1), 'target', 1, 'complete', v_early >= 1, 'earned', 'leve_tot' = ANY(v_credit_ids)),
      'intense', jsonb_build_object('progress', LEAST(v_valid_sessions_week, 5), 'target', 5, 'complete', v_valid_sessions_week >= 5, 'earned', 'semaine_intense' = ANY(v_credit_ids)),
      'nutrition', jsonb_build_object('progress', LEAST(v_core_meals, 3), 'target', 3, 'complete', v_core_meals >= 3, 'earned', 'nutrition_complete' = ANY(v_credit_ids)),
      'parfaite', jsonb_build_object('progress', LEAST(v_days_week, 7), 'target', 7, 'complete', v_days_week >= 7, 'earned', 'semaine_parfaite' = ANY(v_credit_ids))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.etat_missions_aura(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.etat_missions_aura(UUID) TO authenticated;

-- ============================================================
-- Reprise de l'historique depuis l'époque Aura.
-- ON CONFLICT rend toute réexécution sans effet secondaire.
-- ============================================================

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT ds.user_id, 'connexion', 'day', ds.date::text,
       CASE WHEN COALESCE(p.is_premium, false) OR COALESCE(p.is_admin, false) THEN 7.5 ELSE 5 END,
       ds.date::timestamp AT TIME ZONE 'Europe/Paris'
FROM public.daily_stats ds
LEFT JOIN public.profiles p ON p.id = ds.user_id
WHERE ds.date >= DATE '2026-07-22'
  AND ds.date <= (now() AT TIME ZONE 'Europe/Paris')::date
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT ws.user_id, 'seance', 'day',
       ((ws.started_at AT TIME ZONE 'Europe/Paris')::date)::text,
       CASE WHEN COALESCE(p.is_premium, false) OR COALESCE(p.is_admin, false) THEN 52.5 ELSE 35 END,
       min(ws.started_at)
FROM public.workout_sessions ws
LEFT JOIN public.profiles p ON p.id = ws.user_id
WHERE ws.started_at >= TIMESTAMPTZ '2026-07-22 00:00:00+02'
  AND ws.started_at <= now()
  AND ws.duration_minutes >= 1
GROUP BY ws.user_id, p.is_premium, p.is_admin, (ws.started_at AT TIME ZONE 'Europe/Paris')::date
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT nl.user_id, 'repas', 'day', nl.date::text,
       CASE WHEN COALESCE(p.is_premium, false) OR COALESCE(p.is_admin, false) THEN 7.5 ELSE 5 END,
       min(nl.created_at)
FROM public.nutrition_logs nl
LEFT JOIN public.profiles p ON p.id = nl.user_id
WHERE nl.date >= DATE '2026-07-22'
  AND nl.date <= (now() AT TIME ZONE 'Europe/Paris')::date
GROUP BY nl.user_id, p.is_premium, p.is_admin, nl.date
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

-- Les cinq reprises Premium sont attribuées uniquement aux comptes Premium
-- actuels, selon les mêmes règles que les triggers futurs.
INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT ws.user_id, 'double_seance', 'day', ((ws.started_at AT TIME ZONE 'Europe/Paris')::date)::text, 60, max(ws.started_at)
FROM public.workout_sessions ws
JOIN public.profiles p ON p.id = ws.user_id AND (p.is_premium OR p.is_admin)
WHERE ws.started_at >= TIMESTAMPTZ '2026-07-22 00:00:00+02' AND ws.started_at <= now() AND ws.duration_minutes >= 5
GROUP BY ws.user_id, (ws.started_at AT TIME ZONE 'Europe/Paris')::date
HAVING count(*) >= 2
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT ws.user_id, 'leve_tot', 'day', ((ws.started_at AT TIME ZONE 'Europe/Paris')::date)::text, 40, min(ws.started_at)
FROM public.workout_sessions ws
JOIN public.profiles p ON p.id = ws.user_id AND (p.is_premium OR p.is_admin)
WHERE ws.started_at >= TIMESTAMPTZ '2026-07-22 00:00:00+02' AND ws.started_at <= now()
  AND ws.duration_minutes >= 5
  AND (ws.started_at AT TIME ZONE 'Europe/Paris')::time < TIME '09:00'
GROUP BY ws.user_id, (ws.started_at AT TIME ZONE 'Europe/Paris')::date
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT ws.user_id, 'semaine_intense', 'week', to_char(ws.started_at AT TIME ZONE 'Europe/Paris', 'IYYY-"W"IW'), 50, max(ws.started_at)
FROM public.workout_sessions ws
JOIN public.profiles p ON p.id = ws.user_id AND (p.is_premium OR p.is_admin)
WHERE ws.started_at >= TIMESTAMPTZ '2026-07-22 00:00:00+02' AND ws.started_at <= now() AND ws.duration_minutes >= 5
GROUP BY ws.user_id, to_char(ws.started_at AT TIME ZONE 'Europe/Paris', 'IYYY-"W"IW')
HAVING count(*) >= 5
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT nl.user_id, 'nutrition_complete', 'day', nl.date::text, 15, max(nl.created_at)
FROM public.nutrition_logs nl
JOIN public.profiles p ON p.id = nl.user_id AND (p.is_premium OR p.is_admin)
WHERE nl.date >= DATE '2026-07-22' AND nl.date <= (now() AT TIME ZONE 'Europe/Paris')::date
GROUP BY nl.user_id, nl.date
HAVING count(DISTINCT CASE
  WHEN lower(nl.meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
  WHEN lower(nl.meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
  WHEN lower(nl.meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
  ELSE NULL
END) >= 3
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

INSERT INTO public.aura_mission_credits (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT ds.user_id, 'semaine_parfaite', 'week', to_char(ds.date, 'IYYY-"W"IW'), 35, max(ds.date)::timestamp AT TIME ZONE 'Europe/Paris'
FROM public.daily_stats ds
JOIN public.profiles p ON p.id = ds.user_id AND (p.is_premium OR p.is_admin)
WHERE ds.date >= DATE '2026-07-22' AND ds.date <= (now() AT TIME ZONE 'Europe/Paris')::date
GROUP BY ds.user_id, to_char(ds.date, 'IYYY-"W"IW')
HAVING count(DISTINCT ds.date) >= 7
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

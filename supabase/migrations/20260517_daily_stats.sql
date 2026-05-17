-- ============================================================
-- Migration : table daily_stats
-- Score Aura journalier, calories, pas, sommeil, streak
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_stats (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  score       INT         NOT NULL DEFAULT 0,
  calories    INT         NOT NULL DEFAULT 0,
  burned      INT         NOT NULL DEFAULT 0,
  steps       INT         NOT NULL DEFAULT 0,
  sleep_hours FLOAT       NOT NULL DEFAULT 0,
  streak      INT         NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own daily_stats"
  ON public.daily_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Upsert own daily_stats"
  ON public.daily_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own daily_stats"
  ON public.daily_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_stats_user_date_idx
  ON public.daily_stats (user_id, date DESC);

-- ============================================================
-- Migration : table nutrition_logs
-- Log quotidien des entrées nutritionnelles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  meal_type  TEXT        NOT NULL DEFAULT 'dejeuner',
  name       TEXT        NOT NULL,
  calories   INT         NOT NULL DEFAULT 0,
  proteins   FLOAT       NOT NULL DEFAULT 0,
  carbs      FLOAT       NOT NULL DEFAULT 0,
  fats       FLOAT       NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own nutrition_logs"
  ON public.nutrition_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Insert own nutrition_logs"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own nutrition_logs"
  ON public.nutrition_logs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS nutrition_logs_user_date_idx
  ON public.nutrition_logs (user_id, date DESC);

-- ============================================================
-- Migration : table workout_sessions
-- Enregistre chaque séance démarrée depuis la page Progression
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title            TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'force',
  duration_minutes INT         NOT NULL DEFAULT 0,
  calories_burned  INT         NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Lecture : uniquement ses propres séances
CREATE POLICY "Read own workout sessions"
  ON public.workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Insertion : uniquement ses propres séances
CREATE POLICY "Insert own workout sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Suppression : uniquement ses propres séances
CREATE POLICY "Delete own workout sessions"
  ON public.workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS workout_sessions_user_id_idx
  ON public.workout_sessions (user_id, started_at DESC);

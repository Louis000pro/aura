-- ============================================================
-- Table : custom_sessions
-- Séances d'entraînement créées par l'utilisateur
-- ============================================================

CREATE TABLE IF NOT EXISTS public.custom_sessions (
  id            TEXT        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  subtitle      TEXT        NOT NULL DEFAULT '',
  category      TEXT        NOT NULL DEFAULT 'force',
  duration      INTEGER     NOT NULL DEFAULT 30,
  difficulty    TEXT        NOT NULL DEFAULT 'Intermédiaire',
  exercises     INTEGER     NOT NULL DEFAULT 1,
  muscles       TEXT[]      NOT NULL DEFAULT '{}',
  accent        TEXT        NOT NULL DEFAULT '#A78BFA',
  icon          TEXT        NOT NULL DEFAULT 'Dumbbell',
  exercise_list JSONB       NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour charger rapidement les séances d'un utilisateur
CREATE INDEX IF NOT EXISTS custom_sessions_user_id_idx
  ON public.custom_sessions (user_id, created_at DESC);

-- Row Level Security : chaque utilisateur ne voit que ses propres séances
ALTER TABLE public.custom_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_sessions: owner full access"
  ON public.custom_sessions
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

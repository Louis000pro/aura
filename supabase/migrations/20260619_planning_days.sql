-- ============================================================
-- Table : planning_days
-- Le PLANNING unique de l'utilisateur : une ligne = un jour (date
-- réelle) portant SA séance directement (exercise_list inline).
-- Source de vérité unique du « programme » (remplace l'ancien
-- planning stocké en localStorage). Multi-appareils, pilotable
-- par l'IA. La bibliothèque (custom_sessions) reste séparée : un
-- jour peut OPTIONNELLEMENT pointer vers un modèle via session_id,
-- mais sa séance reste auto-suffisante dans exercise_list.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.planning_days (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          DATE        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'Force',         -- Force | HIIT | Cardio | Mobilité | Full Body | Repos
  title         TEXT        NOT NULL DEFAULT '',              -- nom du split ("Push", "Haut du corps"…)
  difficulty    TEXT        NOT NULL DEFAULT 'Intermédiaire', -- Débutant | Intermédiaire | Avancé
  location      TEXT,                                          -- salle | halteres | poids
  exercise_list JSONB       NOT NULL DEFAULT '[]',             -- la séance, directement dans le jour
  session_id    TEXT        REFERENCES public.custom_sessions(id) ON DELETE SET NULL, -- renvoi optionnel vers un modèle de la biblio
  status        TEXT        NOT NULL DEFAULT 'planned',        -- planned | done | skipped
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Index pour charger rapidement le planning d'un utilisateur sur une plage de dates
CREATE INDEX IF NOT EXISTS planning_days_user_date_idx
  ON public.planning_days (user_id, date);

-- Row Level Security : chaque utilisateur ne voit/modifie que son propre planning
ALTER TABLE public.planning_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planning_days: owner full access" ON public.planning_days;
CREATE POLICY "planning_days: owner full access"
  ON public.planning_days
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

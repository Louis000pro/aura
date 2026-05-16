-- ============================================================
-- Migration : ajout des exercices dans workout_sessions
-- Permet de stocker la liste des exercices effectués
-- et de partager les séances avec d'autres utilisateurs
-- ============================================================

-- Colonne exercises : stocke la liste complète des exercices JSONB
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS exercises JSONB NOT NULL DEFAULT '[]';

-- Durée réelle (secondes) enregistrée à la fin de la séance
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS elapsed_seconds INT NOT NULL DEFAULT 0;

-- Index sur started_at déjà existant — on n'en ajoute pas d'autres

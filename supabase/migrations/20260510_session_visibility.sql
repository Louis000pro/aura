-- ============================================================
-- Migration : ajout de la visibilité sur custom_sessions
-- Valeurs : 'private' (défaut) | 'friends' | 'public'
-- ============================================================

ALTER TABLE public.custom_sessions
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'friends', 'public'));

-- Index pour la recherche publique (communauté)
CREATE INDEX IF NOT EXISTS custom_sessions_visibility_idx
  ON public.custom_sessions (visibility, created_at DESC)
  WHERE visibility = 'public';

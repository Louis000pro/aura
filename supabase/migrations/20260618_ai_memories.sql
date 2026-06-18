-- ============================================================
-- Migration : table ai_memories
-- Mémoire long terme de l'assistant IA Vaiiya : faits DURABLES
-- et importants sur l'utilisateur (blessures, régime, planning
-- d'entraînement, objectifs, préférences), capturés en
-- conversation et ré-injectés dans le contexte de l'IA.
-- Donnée personnelle → entièrement visible / effaçable par
-- l'utilisateur (RGPD).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_memories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'autre',          -- sante | nutrition | planning | objectif | preference | autre
  source     TEXT        NOT NULL DEFAULT 'auto',           -- 'auto' (déduit par l'IA) | 'user' (demande explicite)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mémoires visibles par le propriétaire" ON public.ai_memories;
CREATE POLICY "Mémoires visibles par le propriétaire"
  ON public.ai_memories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut ajouter une mémoire" ON public.ai_memories;
CREATE POLICY "Utilisateur peut ajouter une mémoire"
  ON public.ai_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut modifier sa mémoire" ON public.ai_memories;
CREATE POLICY "Utilisateur peut modifier sa mémoire"
  ON public.ai_memories FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut supprimer sa mémoire" ON public.ai_memories;
CREATE POLICY "Utilisateur peut supprimer sa mémoire"
  ON public.ai_memories FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS ai_memories_user_idx ON public.ai_memories (user_id, created_at DESC);

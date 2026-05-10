-- ============================================================
-- Migration : table stories (Instagram-style, expiry 24h)
-- content_type : 'workout' | 'meal' | 'text'
-- content_data : JSON libre selon le type
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stories (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT        NOT NULL CHECK (content_type IN ('workout', 'meal', 'text')),
  content_data JSONB,
  caption      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Lecture : toutes les stories non-expirées sont visibles
CREATE POLICY "Read active stories"
  ON public.stories FOR SELECT
  USING (expires_at > now());

-- Création : seulement ses propres stories
CREATE POLICY "Create own story"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Suppression : seulement ses propres stories
CREATE POLICY "Delete own story"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS stories_expires_at_idx
  ON public.stories (expires_at DESC);

CREATE INDEX IF NOT EXISTS stories_user_id_idx
  ON public.stories (user_id, expires_at DESC);

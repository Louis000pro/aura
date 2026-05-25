-- ============================================================
-- Migration : colonne views sur posts
-- Compteur de vues incrémenté côté serveur via RPC
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

-- Fonction RPC appelée côté client pour incrémenter sans exposer UPDATE direct
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.posts SET views = views + 1 WHERE id = p_post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_post_views(UUID) TO anon, authenticated;

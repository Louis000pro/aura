-- ============================================================
-- Migration : ajout post_id dans direct_messages
-- Permet de partager un post/vidéo via DM avec preview
-- ============================================================

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS dm_post_id_idx ON public.direct_messages (post_id);

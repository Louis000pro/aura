-- ============================================================
-- Migration : comment_likes + parent_id sur post_comments
-- Extrait du endpoint /api/setup-db (qui était une bidouille)
-- ============================================================

-- Réponses imbriquées sur les commentaires
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS post_comments_parent_id_idx
  ON public.post_comments (parent_id);

-- Likes sur les commentaires
CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID        NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes visibles" ON public.comment_likes;
CREATE POLICY "Comment likes visibles"
  ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateur peut liker commentaire" ON public.comment_likes;
CREATE POLICY "Utilisateur peut liker commentaire"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut unliker commentaire" ON public.comment_likes;
CREATE POLICY "Utilisateur peut unliker commentaire"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON public.comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx    ON public.comment_likes (user_id);

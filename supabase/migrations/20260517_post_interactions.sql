-- ── post_likes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes visibles par tous" ON public.post_likes;
CREATE POLICY "Likes visibles par tous"
  ON public.post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateur peut liker" ON public.post_likes;
CREATE POLICY "Utilisateur peut liker"
  ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut unliker" ON public.post_likes;
CREATE POLICY "Utilisateur peut unliker"
  ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ── post_comments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commentaires visibles par tous" ON public.post_comments;
CREATE POLICY "Commentaires visibles par tous"
  ON public.post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateur peut commenter" ON public.post_comments;
CREATE POLICY "Utilisateur peut commenter"
  ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut supprimer son commentaire" ON public.post_comments;
CREATE POLICY "Utilisateur peut supprimer son commentaire"
  ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_created_at_idx ON public.post_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes(post_id);

-- ============================================================
-- Migration : table posts
-- Publications du feed (workout, meal, day)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL DEFAULT 'day'
                               CHECK (type IN ('workout', 'meal', 'day')),
  caption          TEXT,
  description      TEXT,
  audience         TEXT        NOT NULL DEFAULT 'public'
                               CHECK (audience IN ('public', 'friends', 'private')),
  performance_data JSONB       NOT NULL DEFAULT '{}'::jsonb,
  media_url        TEXT,
  media_type       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts publics visibles par tous" ON public.posts;
CREATE POLICY "Posts publics visibles par tous"
  ON public.posts FOR SELECT
  USING (audience = 'public' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur crée ses posts" ON public.posts;
CREATE POLICY "Utilisateur crée ses posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur modifie ses posts" ON public.posts;
CREATE POLICY "Utilisateur modifie ses posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur supprime ses posts" ON public.posts;
CREATE POLICY "Utilisateur supprime ses posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS posts_user_id_idx     ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx  ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_audience_idx    ON public.posts (audience);
CREATE INDEX IF NOT EXISTS posts_type_idx        ON public.posts (type);

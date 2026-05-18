-- ============================================================
-- Migration : table followers
-- Système d'abonnements (follow/unfollow)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.followers (
  follower_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Abonnements visibles par tous" ON public.followers;
CREATE POLICY "Abonnements visibles par tous"
  ON public.followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Utilisateur peut s'abonner" ON public.followers;
CREATE POLICY "Utilisateur peut s'abonner"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Utilisateur peut se désabonner" ON public.followers;
CREATE POLICY "Utilisateur peut se désabonner"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS followers_follower_id_idx  ON public.followers (follower_id);
CREATE INDEX IF NOT EXISTS followers_following_id_idx ON public.followers (following_id);

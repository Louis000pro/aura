-- ============================================================
-- Migration : table post_saves
-- Vidéos / posts sauvegardés (distinct des likes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_saves (
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saves visibles par le propriétaire" ON public.post_saves;
CREATE POLICY "Saves visibles par le propriétaire"
  ON public.post_saves FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut sauvegarder" ON public.post_saves;
CREATE POLICY "Utilisateur peut sauvegarder"
  ON public.post_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utilisateur peut retirer save" ON public.post_saves;
CREATE POLICY "Utilisateur peut retirer save"
  ON public.post_saves FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS post_saves_user_id_idx ON public.post_saves (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_saves_post_id_idx ON public.post_saves (post_id);

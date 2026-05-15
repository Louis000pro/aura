-- Table post_reposts (boosts)
CREATE TABLE IF NOT EXISTS public.post_reposts (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reposts visibles par tous"
  ON public.post_reposts FOR SELECT USING (true);

CREATE POLICY "Utilisateur peut booster"
  ON public.post_reposts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateur peut annuler son boost"
  ON public.post_reposts FOR DELETE USING (auth.uid() = user_id);

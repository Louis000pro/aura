-- Ajoute une colonne description (bio) aux posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS description TEXT;

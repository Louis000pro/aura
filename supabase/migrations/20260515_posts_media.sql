-- Ajoute les colonnes media pour les publications photo/vidéo
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Met à jour la contrainte type pour accepter photo/video
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_type_check;

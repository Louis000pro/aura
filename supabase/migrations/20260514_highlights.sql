-- ============================================================
-- Migration : highlights + highlight_items + media stories
-- ============================================================

-- 1. Étendre la table stories pour les photos/vidéos
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'none';

-- Mettre à jour la contrainte content_type pour accepter photo/video
ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_content_type_check;
ALTER TABLE public.stories
  ADD CONSTRAINT stories_content_type_check
    CHECK (content_type IN ('workout', 'meal', 'text', 'photo', 'video'));

-- 2. Table highlights (stories à la une)
CREATE TABLE IF NOT EXISTS public.highlights (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT        NOT NULL,
  cover_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "highlights_select" ON public.highlights
  FOR SELECT USING (true);

CREATE POLICY "highlights_insert" ON public.highlights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "highlights_update" ON public.highlights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "highlights_delete" ON public.highlights
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS highlights_user_id_idx
  ON public.highlights (user_id, created_at ASC);

-- 3. Table highlight_items (médias dans une story à la une)
CREATE TABLE IF NOT EXISTS public.highlight_items (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  highlight_id  UUID        REFERENCES public.highlights(id) ON DELETE CASCADE NOT NULL,
  media_url     TEXT        NOT NULL,
  media_type    TEXT        NOT NULL DEFAULT 'image',
  caption       TEXT,
  story_id      UUID        REFERENCES public.stories(id) ON DELETE SET NULL,
  display_order INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.highlight_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "highlight_items_select" ON public.highlight_items
  FOR SELECT USING (true);

CREATE POLICY "highlight_items_all" ON public.highlight_items
  FOR ALL USING (
    auth.uid() = (
      SELECT user_id FROM public.highlights WHERE id = highlight_id
    )
  );

CREATE INDEX IF NOT EXISTS highlight_items_highlight_id_idx
  ON public.highlight_items (highlight_id, display_order ASC);

-- Fix contrainte content_type pour accepter photo et video
ALTER TABLE public.stories
  DROP CONSTRAINT IF EXISTS stories_content_type_check;

ALTER TABLE public.stories
  ADD CONSTRAINT stories_content_type_check
  CHECK (content_type IN ('workout', 'meal', 'text', 'photo', 'video', 'image'));

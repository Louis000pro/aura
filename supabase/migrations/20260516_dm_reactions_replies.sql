-- Ajout reply_to_id sur direct_messages
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- Table des réactions aux messages
CREATE TABLE IF NOT EXISTS public.dm_reactions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  UUID        NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.dm_reactions ENABLE ROW LEVEL SECURITY;

-- Les participants du DM peuvent voir les réactions
CREATE POLICY IF NOT EXISTS "DM reactions visibles par participants"
  ON public.dm_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_id
        AND (dm.sender_id = auth.uid() OR dm.receiver_id = auth.uid())
    )
  );

-- Chacun peut ajouter sa réaction
CREATE POLICY IF NOT EXISTS "DM reactions insert"
  ON public.dm_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Chacun peut supprimer sa propre réaction
CREATE POLICY IF NOT EXISTS "DM reactions delete"
  ON public.dm_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS dm_reactions_message_idx ON public.dm_reactions(message_id);

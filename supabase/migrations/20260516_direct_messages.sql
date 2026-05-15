-- Table direct_messages (messagerie privée)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Seuls l'expéditeur et le destinataire peuvent lire le message
CREATE POLICY IF NOT EXISTS "DM visible par participants"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Seulement l'expéditeur peut envoyer
CREATE POLICY IF NOT EXISTS "DM envoi par expéditeur"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Seulement le destinataire peut marquer comme lu
CREATE POLICY IF NOT EXISTS "DM marquer lu"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS dm_sender_idx    ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS dm_receiver_idx  ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS dm_created_idx   ON public.direct_messages(created_at DESC);

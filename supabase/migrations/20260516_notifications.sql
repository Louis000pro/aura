-- Table notifications (likes, commentaires, reposts, follows)
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_user_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_pseudo   TEXT        NOT NULL,
  from_avatar_url TEXT,
  type          TEXT        NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'repost')),
  post_id       UUID        REFERENCES public.posts(id) ON DELETE CASCADE,
  read          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit seulement ses propres notifs
CREATE POLICY IF NOT EXISTS "Notifs visibles par destinataire"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- N'importe quel utilisateur connecté peut créer une notif (pour un autre)
CREATE POLICY IF NOT EXISTS "Créer une notif"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Seul le destinataire peut marquer comme lue
CREATE POLICY IF NOT EXISTS "Marquer notif lue"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Éviter les doublons : un seul like/repost par (from_user + post)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_like
  ON public.notifications(from_user_id, post_id, type)
  WHERE type IN ('like', 'repost');

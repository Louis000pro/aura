-- ============================================================
-- Notifications du relais + réparation des policies notifications
--
-- 20260516_notifications.sql utilisait « CREATE POLICY IF NOT
-- EXISTS », qui n'existe pas en PostgreSQL : le fichier plantait
-- à la première policy. RLS est donc probablement actif SANS
-- aucune policy — c'est-à-dire que personne ne voit ses propres
-- notifications. On les repose proprement.
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase. Rejouable.
-- ============================================================

-- 'mention' était déjà utilisé par le code sans être dans la
-- contrainte ; 'relais' est nouveau.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','repost','mention','relais'));

-- Le relais notifie sans passer par un post.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS lien TEXT;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifs visibles par destinataire" ON public.notifications;
CREATE POLICY "Notifs visibles par destinataire"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notifs creees par l emetteur" ON public.notifications;
CREATE POLICY "Notifs creees par l emetteur"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Notifs marquees lues par destinataire" ON public.notifications;
CREATE POLICY "Notifs marquees lues par destinataire"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Notifs supprimees par destinataire" ON public.notifications;
CREATE POLICY "Notifs supprimees par destinataire"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

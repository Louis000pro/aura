-- ============================================================
-- Migration : ajout du type "mention" dans notifications
-- Permet d'envoyer une notif quand un user est mentionné
-- dans un commentaire via @pseudo
-- ============================================================

-- Supprimer l'ancien CHECK et le recréer avec "mention"
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'repost', 'mention'));

-- ─────────────────────────────────────────────────────────────
-- La notification « t'a dit bravo » (Louis, 2026-10-21).
--
-- Un ami dit bravo sous une affiche ou un événement du fil :
-- `/api/notifications/bravo` écrit une ligne `type = 'bravo'` pour
-- l'auteur (clé service, une fois par ami et par chose félicitée).
-- Il ne manque que le type dans la contrainte. Rejouable.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['follow','like','comment','repost','mention','relais','message','relais_invitation','bravo']));

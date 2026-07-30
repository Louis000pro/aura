-- ============================================================
-- Messagerie : notifications de message idempotentes
--
-- Empêche qu'un client rejoue /api/notifications/message pour le
-- même message et spamme plusieurs fois le même destinataire.
--
-- À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS
-- 20260725_messagerie_confort_medias.sql. Rejouable.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_notification_deliveries (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.message_notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Cette table est un verrou technique exclusivement manipulé par la route
-- serveur avec la clé service_role. Aucun client ne doit pouvoir lire,
-- créer ou retirer une réservation.
REVOKE ALL ON public.message_notification_deliveries FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_notification_deliveries TO service_role;

-- Durcissement de l'envoi direct : le client ne peut ni injecter un texte
-- vide/démesuré, ni citer un message appartenant à une autre conversation.
DROP POLICY IF EXISTS "envoi par membres" ON public.messages;
CREATE POLICY "envoi par membres"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.est_membre_conversation(conversation_id, auth.uid())
    AND (
      repond_a IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.messages original
        WHERE original.id = messages.repond_a
          AND original.conversation_id = messages.conversation_id
      )
    )
    AND (
      (
        type = 'texte'
        AND media_path IS NULL
        AND LENGTH(BTRIM(contenu)) BETWEEN 1 AND 4000
      )
      OR (
        type = 'image'
        AND contenu = 'Photo'
        AND media_path LIKE conversation_id::TEXT || '/' || auth.uid()::TEXT || '/%'
      )
    )
  );

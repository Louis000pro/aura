-- ============================================================
-- Messagerie : préférences personnelles + photos privées
--
-- À COLLER À LA MAIN dans le SQL Editor Supabase, APRÈS
-- 20260725_messagerie_fiabilite.sql. Rejouable.
-- ============================================================

-- ---------- 1. Préférences propres à chaque membre ----------
ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS cm_user_archived_pinned_idx
  ON public.conversation_members(user_id, archived_at, pinned_at DESC);

-- Les colonnes doivent exister avant la RPC d'aperçu qui les sélectionne.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_path TEXT,
  ADD COLUMN IF NOT EXISTS media_width INTEGER,
  ADD COLUMN IF NOT EXISTS media_height INTEGER;

-- Nouvelle RPC plutôt qu'un CREATE OR REPLACE de la v1 : PostgreSQL
-- n'autorise pas le changement du type de retour d'une fonction existante.
CREATE OR REPLACE FUNCTION public.apercus_conversations_v2()
RETURNS TABLE (
  conversation_id UUID,
  last_read_at TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  muted BOOLEAN,
  archived_at TIMESTAMPTZ,
  non_lus BIGINT,
  dernier_id UUID,
  dernier_user_id UUID,
  dernier_contenu TEXT,
  dernier_type TEXT,
  dernier_media_path TEXT,
  dernier_media_width INTEGER,
  dernier_media_height INTEGER,
  dernier_created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    cm.conversation_id,
    cm.last_read_at,
    cm.pinned_at,
    cm.muted,
    cm.archived_at,
    (
      SELECT COUNT(*)
      FROM public.messages unread
      WHERE unread.conversation_id = cm.conversation_id
        AND unread.created_at > cm.last_read_at
        AND unread.user_id IS DISTINCT FROM auth.uid()
    ) AS non_lus,
    dernier.id,
    dernier.user_id,
    dernier.contenu,
    dernier.type,
    dernier.media_path,
    dernier.media_width,
    dernier.media_height,
    dernier.created_at
  FROM public.conversation_members cm
  LEFT JOIN LATERAL (
    SELECT
      m.id,
      m.user_id,
      m.contenu,
      m.type,
      m.media_path,
      m.media_width,
      m.media_height,
      m.created_at
    FROM public.messages m
    WHERE m.conversation_id = cm.conversation_id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS dernier ON TRUE
  WHERE cm.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.apercus_conversations_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apercus_conversations_v2() TO authenticated;

-- ---------- 2. Messages photo ----------
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check
  CHECK (type IN ('texte', 'systeme', 'image'));

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_media_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_media_check
  CHECK (
    (
      type = 'image'
      AND media_path IS NOT NULL
      AND media_width BETWEEN 1 AND 4096
      AND media_height BETWEEN 1 AND 4096
    )
    OR (
      type <> 'image'
      AND media_path IS NULL
      AND media_width IS NULL
      AND media_height IS NULL
    )
  );

DROP POLICY IF EXISTS "envoi par membres" ON public.messages;
CREATE POLICY "envoi par membres"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.est_membre_conversation(conversation_id, auth.uid())
    AND (
      (type = 'texte' AND media_path IS NULL)
      OR (
        type = 'image'
        AND media_path LIKE conversation_id::TEXT || '/' || auth.uid()::TEXT || '/%'
      )
    )
  );

-- Toute nouvelle activité fait ressortir un fil des archives. Le réglage
-- reste personnel : seule la ligne d'adhésion de chaque membre est modifiée.
CREATE OR REPLACE FUNCTION public.reveiller_conversation_archivee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_members
  SET archived_at = NULL
  WHERE conversation_id = NEW.conversation_id
    AND archived_at IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reveiller_conversation_archivee ON public.messages;
CREATE TRIGGER reveiller_conversation_archivee
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.reveiller_conversation_archivee();

-- ---------- 3. Stockage privé ----------
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'conversation-media',
  'conversation-media',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "photos conversation visibles par membres" ON storage.objects;
CREATE POLICY "photos conversation visibles par membres"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'conversation-media'
    AND EXISTS (
      SELECT 1
      FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.conversation_id::TEXT = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "photos conversation ajoutees par membres" ON storage.objects;
CREATE POLICY "photos conversation ajoutees par membres"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'conversation-media'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.conversation_id::TEXT = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "photos conversation supprimees par auteur" ON storage.objects;
CREATE POLICY "photos conversation supprimees par auteur"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'conversation-media'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

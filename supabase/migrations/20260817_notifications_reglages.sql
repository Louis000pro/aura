-- ════════════════════════════════════════════════════════════════════
--  Réglages de notification, par compte et par famille.
--
--  À coller dans le SQL Editor de Supabase. Aucune dépendance à une
--  migration précédente autre que `profiles`.
--
--  Une ligne n'existe QUE si la personne a changé quelque chose : pas de
--  ligne signifie « tout allumé ». Le code lit ça par défaut, donc la
--  table ne contient que des choix réels, et un compte neuf n'a rien à
--  créer avant de recevoir ses messages.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id    UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rappel     BOOLEAN     NOT NULL DEFAULT TRUE,   -- le rappel du soir
  message    BOOLEAN     NOT NULL DEFAULT TRUE,   -- messages des conversations
  ami        BOOLEAN     NOT NULL DEFAULT TRUE,   -- demandes et ajouts d'amis
  relais     BOOLEAN     NOT NULL DEFAULT TRUE,   -- maillons et jour décisif
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

-- Chacun ne voit et ne règle QUE ses propres notifications.
-- (`CREATE POLICY IF NOT EXISTS` n'existe pas en PostgreSQL : c'est la
--  syntaxe qui avait laissé `direct_messages` et `notifications` avec RLS
--  actif et aucune policy. On passe donc par DROP puis CREATE.)
DROP POLICY IF EXISTS "prefs lisibles par leur proprietaire"   ON public.notification_prefs;
DROP POLICY IF EXISTS "prefs modifiables par leur proprietaire" ON public.notification_prefs;
DROP POLICY IF EXISTS "prefs creables par leur proprietaire"    ON public.notification_prefs;

CREATE POLICY "prefs lisibles par leur proprietaire"
  ON public.notification_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "prefs creables par leur proprietaire"
  ON public.notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prefs modifiables par leur proprietaire"
  ON public.notification_prefs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Le serveur (service_role) lit les préférences de tout le monde pour
-- filtrer les envois : il contourne la RLS par nature, rien à ajouter.

CREATE OR REPLACE FUNCTION public.touch_notification_prefs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_prefs_touch ON public.notification_prefs;
CREATE TRIGGER notification_prefs_touch
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_notification_prefs();


-- ── Le journal des rappels du soir ──────────────────────────────────────
-- Il sert à trois choses à la fois :
--   · plafonner la cadence (X rappels sur 7 jours glissants selon le palier
--     d'engagement de la personne) ;
--   · se souvenir des formulations déjà envoyées, pour ne pas répéter la
--     même phrase à quelqu'un qui en reçoit cinq par semaine ;
--   · garantir côté BASE qu'une personne ne reçoit qu'un rappel par soir,
--     même si le cron est rejoué : c'est le rôle de la clé unique.
CREATE TABLE IF NOT EXISTS public.notification_rappels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jour       DATE        NOT NULL,
  cle        TEXT        NOT NULL,   -- quel message (planning, serie, reprise…)
  variante   SMALLINT    NOT NULL DEFAULT 0,  -- quelle formulation exactement
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, jour)
);

CREATE INDEX IF NOT EXISTS notification_rappels_user_jour_idx
  ON public.notification_rappels (user_id, jour DESC);

ALTER TABLE public.notification_rappels ENABLE ROW LEVEL SECURITY;

-- Aucune policy : ce journal ne se lit et ne s'écrit que par le serveur
-- (service_role), qui contourne la RLS. Rien côté client n'en a besoin.


-- ── Rattrapage : la table des abonnements push ──────────────────────────
-- Elle existe déjà en production, mais elle n'avait jamais été écrite dans
-- une migration : elle était créée à chaud par un appel qui ne pouvait pas
-- aboutir (voir /api/notifications/push). On la déclare ici pour de bon,
-- de façon idempotente, afin qu'une base repartie de zéro soit complète.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Aucune policy pour les clients : les abonnements ne s'écrivent QUE par
-- /api/notifications/push, qui rattache l'appareil au compte du jeton.
-- Le service_role contourne la RLS et reste seul à y toucher.

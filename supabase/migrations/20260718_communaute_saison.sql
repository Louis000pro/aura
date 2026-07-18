-- ============================================================
-- COMMUNAUTÉ « LA SAISON » — le socle de données
-- Duel de camps mensuel (+ duels de cercle), éclats & rangs,
-- exploits hebdo, fil d'événements, numéro de membre fondateur.
--
-- Principes :
--  · Le SCORE d'un camp n'est PAS stocké : il se calcule depuis
--    workout_sessions sur la fenêtre de la saison (une séance =
--    un point, dans TOUTES les arènes du joueur à la fois).
--  · L'ÉCLAT (progression personnelle → rang) est un LEDGER
--    append-only : la somme par saison donne le rang.
--  · Tout duel est une ligne de `seasons` : scope 'global'
--    (Vaiiya entier, créé par l'admin) ou 'circle' (famille,
--    amis, travail — créé par n'importe qui pour son cercle).
-- ============================================================

-- ── Cercles (famille / amis / travail) ──────────────────────
CREATE TABLE IF NOT EXISTS public.circles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  emoji      TEXT        NOT NULL DEFAULT '👥',
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.circle_members (
  circle_id  UUID        NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (circle_id, user_id)
);

-- ── Saisons (duels) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         TEXT        NOT NULL DEFAULT 'global' CHECK (scope IN ('global','circle')),
  circle_id     UUID        REFERENCES public.circles(id) ON DELETE CASCADE, -- requis si scope='circle'
  name          TEXT        NOT NULL,                          -- « Saison d'août », « Duel de la famille »…
  camp_a_name   TEXT        NOT NULL,                          -- « Solaire »
  camp_a_emblem TEXT        NOT NULL DEFAULT '☀',
  camp_b_name   TEXT        NOT NULL,                          -- « Lunaire »
  camp_b_emblem TEXT        NOT NULL DEFAULT '☾',
  starts_on     DATE        NOT NULL,
  ends_on       DATE        NOT NULL,                          -- inclus
  winner        TEXT        CHECK (winner IN ('a','b','draw')),-- rempli à la clôture
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scope = 'global' OR circle_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS seasons_window_idx ON public.seasons (scope, starts_on, ends_on);

-- Le choix du camp (scellé : pas de policy UPDATE → on ne change pas de camp)
CREATE TABLE IF NOT EXISTS public.season_camps (
  season_id UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp      TEXT        NOT NULL CHECK (camp IN ('a','b')),
  chosen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_id, user_id)
);

-- ── Éclats (ledger append-only → rang) ──────────────────────
CREATE TABLE IF NOT EXISTS public.eclat_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id  UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE, -- la saison GLOBALE (le rang vit là)
  kind       TEXT        NOT NULL CHECK (kind IN ('seance','exploit','serie','bonus')),
  amount     INT         NOT NULL,
  ref_id     TEXT,                                             -- id de la séance / de l'exploit → anti-double-crédit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une même séance / un même exploit ne crédite qu'une fois
CREATE UNIQUE INDEX IF NOT EXISTS eclat_once_idx
  ON public.eclat_events (user_id, season_id, kind, ref_id) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS eclat_user_season_idx ON public.eclat_events (season_id, user_id);

-- ── Exploits (l'hebdo perso) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exploits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         TEXT        NOT NULL DEFAULT 'global' CHECK (scope IN ('global','circle')),
  circle_id     UUID        REFERENCES public.circles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,                          -- « 3 minutes de planche, d'une traite »
  badge_name    TEXT        NOT NULL,                          -- « Inoxydable »
  badge_emoji   TEXT        NOT NULL DEFAULT '🏅',
  reward_eclats INT         NOT NULL DEFAULT 80,
  starts_on     DATE        NOT NULL,
  ends_on       DATE        NOT NULL,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exploit_completions (
  exploit_id   UUID        NOT NULL REFERENCES public.exploits(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exploit_id, user_id)
);

-- ── Fil d'événements (ticker + fil) ─────────────────────────
-- L'app fabrique l'actualité : bascule de duel, promotion de rang,
-- série, exploit réussi… payload libre en JSONB.
CREATE TABLE IF NOT EXISTS public.community_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,  -- 'duel_lead' | 'rank_up' | 'streak' | 'exploit_done' | 'season_start' | 'season_end'…
  actor_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id  UUID        REFERENCES public.seasons(id) ON DELETE CASCADE,
  payload    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_events_time_idx ON public.community_events (created_at DESC);

-- ── Numéro de membre (badge Fondateur par vagues) ───────────
CREATE SEQUENCE IF NOT EXISTS public.member_number_seq;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_number INT;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.profiles
  WHERE member_number IS NULL
)
UPDATE public.profiles p SET member_number = o.rn FROM ordered o WHERE p.id = o.id;

SELECT setval('public.member_number_seq',
  COALESCE((SELECT MAX(member_number) FROM public.profiles), 0) + 1, false);
ALTER TABLE public.profiles ALTER COLUMN member_number SET DEFAULT nextval('public.member_number_seq');

-- ── Vues de score ───────────────────────────────────────────
-- ⚠️ season_scores reste une vue « owner » (PAS security_invoker) :
-- elle doit compter les séances de TOUT LE MONDE alors que la RLS
-- de workout_sessions est owner-only (le piège du compteur à 0/1).
-- Elle n'expose que des agrégats (des comptes), rien de sensible.
CREATE OR REPLACE VIEW public.season_scores AS
SELECT s.id AS season_id,
       sc.camp,
       COUNT(ws.id)::INT AS points,
       COUNT(DISTINCT sc.user_id)::INT AS members
FROM public.seasons s
JOIN public.season_camps sc ON sc.season_id = s.id
LEFT JOIN public.workout_sessions ws
  ON ws.user_id = sc.user_id
 AND ws.started_at >= s.starts_on
 AND ws.started_at <  s.ends_on + 1
GROUP BY s.id, sc.camp;

-- Total d'éclats par joueur et par saison (le rang se calcule côté client)
CREATE OR REPLACE VIEW public.season_eclats AS
SELECT season_id, user_id, SUM(amount)::INT AS eclats
FROM public.eclat_events
GROUP BY season_id, user_id;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.circles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_camps        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eclat_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploit_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events    ENABLE ROW LEVEL SECURITY;

-- Cercles : visibles de leurs membres (et du propriétaire), gérés par le propriétaire
DROP POLICY IF EXISTS "circles: member read" ON public.circles;
CREATE POLICY "circles: member read" ON public.circles FOR SELECT
  USING (owner_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.circle_members m WHERE m.circle_id = id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "circles: owner write" ON public.circles;
CREATE POLICY "circles: owner write" ON public.circles FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "circle_members: member read" ON public.circle_members;
CREATE POLICY "circle_members: member read" ON public.circle_members FOR SELECT
  USING (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.owner_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.circle_members m2 WHERE m2.circle_id = circle_id AND m2.user_id = auth.uid()));
DROP POLICY IF EXISTS "circle_members: owner manage" ON public.circle_members;
CREATE POLICY "circle_members: owner manage" ON public.circle_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.owner_id = auth.uid()));
DROP POLICY IF EXISTS "circle_members: leave" ON public.circle_members;
CREATE POLICY "circle_members: leave" ON public.circle_members FOR DELETE
  USING (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.owner_id = auth.uid()));

-- Saisons : les globales sont publiques ; celles d'un cercle, réservées à ses membres
DROP POLICY IF EXISTS "seasons: read" ON public.seasons;
CREATE POLICY "seasons: read" ON public.seasons FOR SELECT
  USING (scope = 'global'
     OR EXISTS (SELECT 1 FROM public.circle_members m WHERE m.circle_id = seasons.circle_id AND m.user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.circles c WHERE c.id = seasons.circle_id AND c.owner_id = auth.uid()));
DROP POLICY IF EXISTS "seasons: admin creates global" ON public.seasons;
CREATE POLICY "seasons: admin creates global" ON public.seasons FOR INSERT
  WITH CHECK (
    (scope = 'global' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin))
    OR
    (scope = 'circle' AND EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.owner_id = auth.uid()))
  );
DROP POLICY IF EXISTS "seasons: creator closes" ON public.seasons;
CREATE POLICY "seasons: creator closes" ON public.seasons FOR UPDATE
  USING (created_by = auth.uid()
     OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- Choix de camp : lisible par tous (⚠️ il faut compter les camps des AUTRES
-- — le piège de la policy restrictive), on n'écrit que le sien, JAMAIS d'update (scellé)
DROP POLICY IF EXISTS "season_camps: read all" ON public.season_camps;
CREATE POLICY "season_camps: read all" ON public.season_camps FOR SELECT USING (true);
DROP POLICY IF EXISTS "season_camps: choose own" ON public.season_camps;
CREATE POLICY "season_camps: choose own" ON public.season_camps FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Éclats : lisibles par tous (classement entre amis), on ne crédite que soi
DROP POLICY IF EXISTS "eclat_events: read all" ON public.eclat_events;
CREATE POLICY "eclat_events: read all" ON public.eclat_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "eclat_events: own insert" ON public.eclat_events;
CREATE POLICY "eclat_events: own insert" ON public.eclat_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Exploits : globaux publics, ceux d'un cercle réservés au cercle
DROP POLICY IF EXISTS "exploits: read" ON public.exploits;
CREATE POLICY "exploits: read" ON public.exploits FOR SELECT
  USING (scope = 'global'
     OR EXISTS (SELECT 1 FROM public.circle_members m WHERE m.circle_id = exploits.circle_id AND m.user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.circles c WHERE c.id = exploits.circle_id AND c.owner_id = auth.uid()));
DROP POLICY IF EXISTS "exploits: create" ON public.exploits;
CREATE POLICY "exploits: create" ON public.exploits FOR INSERT
  WITH CHECK (
    (scope = 'global' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin))
    OR
    (scope = 'circle' AND EXISTS (SELECT 1 FROM public.circles c WHERE c.id = circle_id AND c.owner_id = auth.uid()))
  );

-- Réussites d'exploit : lisibles par tous (facepile « 2 l'ont réussi »), on ne valide que soi
DROP POLICY IF EXISTS "exploit_completions: read all" ON public.exploit_completions;
CREATE POLICY "exploit_completions: read all" ON public.exploit_completions FOR SELECT USING (true);
DROP POLICY IF EXISTS "exploit_completions: own insert" ON public.exploit_completions;
CREATE POLICY "exploit_completions: own insert" ON public.exploit_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fil d'événements : lisible par tous, chacun n'écrit que ses propres événements
DROP POLICY IF EXISTS "community_events: read all" ON public.community_events;
CREATE POLICY "community_events: read all" ON public.community_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "community_events: own insert" ON public.community_events;
CREATE POLICY "community_events: own insert" ON public.community_events FOR INSERT
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ── Amorce : la première saison + le premier exploit ────────
-- (fenêtre : du 20 juillet au 31 août 2026 — une « saison zéro »
-- un peu longue pour roder, puis rythme mensuel)
INSERT INTO public.seasons (scope, name, camp_a_name, camp_a_emblem, camp_b_name, camp_b_emblem, starts_on, ends_on)
SELECT 'global', 'Saison zéro', 'Solaire', '☀', 'Lunaire', '☾', DATE '2026-07-20', DATE '2026-08-31'
WHERE NOT EXISTS (SELECT 1 FROM public.seasons WHERE scope = 'global');

INSERT INTO public.exploits (scope, title, badge_name, badge_emoji, reward_eclats, starts_on, ends_on)
SELECT 'global', '3 minutes de planche, d''une traite', 'Inoxydable', '🏅', 80, DATE '2026-07-20', DATE '2026-07-26'
WHERE NOT EXISTS (SELECT 1 FROM public.exploits);

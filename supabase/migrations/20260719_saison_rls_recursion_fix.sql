-- ═══════════════════════════════════════════════════════════════
--  Correctif RLS : récursion infinie sur circle_members
-- ═══════════════════════════════════════════════════════════════
--  Symptôme : « SAISONS (0) » dans l'admin alors que la table
--  contient bien la Saison zéro, repli sur l'ancien fil dans
--  /communaute, et « Refusé » à la création d'une saison.
--
--  Cause : la policy SELECT de circle_members interrogeait
--  circle_members (clause m2 « voir mes co-membres ») → Postgres
--  lève « infinite recursion detected in policy for relation
--  circle_members ». Comme les policies de seasons et exploits
--  passent par circle_members pour le cas des duels de cercle,
--  TOUTE lecture de ces tables échouait — même les lignes
--  globales, qui n'ont pourtant rien à voir avec les cercles.
--
--  Correctif : l'appartenance passe par une fonction SECURITY
--  DEFINER. Elle s'exécute avec les droits du propriétaire, donc
--  hors RLS : la boucle est cassée. Les règles métier sont
--  inchangées — un cercle reste visible de ses seuls membres.
--
--  Rejouable sans risque (CREATE OR REPLACE / DROP IF EXISTS).
-- ═══════════════════════════════════════════════════════════════

-- ── L'appartenance, hors RLS ────────────────────────────────
-- Membre OU propriétaire. `cid IS NULL` (ligne globale) → false,
-- ce qui rend la clause inoffensive pour les saisons globales.
CREATE OR REPLACE FUNCTION public.is_circle_member(cid UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cid IS NOT NULL AND uid IS NOT NULL AND (
       EXISTS (SELECT 1 FROM public.circle_members m WHERE m.circle_id = cid AND m.user_id = uid)
    OR EXISTS (SELECT 1 FROM public.circles c        WHERE c.id = cid        AND c.owner_id = uid)
  );
$$;

REVOKE ALL     ON FUNCTION public.is_circle_member(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_circle_member(UUID, UUID) TO authenticated;

-- ── Cercles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "circles: member read" ON public.circles;
CREATE POLICY "circles: member read" ON public.circles FOR SELECT
  USING (owner_id = auth.uid() OR public.is_circle_member(id, auth.uid()));

-- ── Membres de cercle (la policy fautive) ───────────────────
DROP POLICY IF EXISTS "circle_members: member read" ON public.circle_members;
CREATE POLICY "circle_members: member read" ON public.circle_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_circle_member(circle_id, auth.uid()));

-- ── Saisons ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "seasons: read" ON public.seasons;
CREATE POLICY "seasons: read" ON public.seasons FOR SELECT
  USING (scope = 'global' OR public.is_circle_member(circle_id, auth.uid()));

-- ── Exploits (même schéma de récursion) ─────────────────────
DROP POLICY IF EXISTS "exploits: read" ON public.exploits;
CREATE POLICY "exploits: read" ON public.exploits FOR SELECT
  USING (scope = 'global' OR public.is_circle_member(circle_id, auth.uid()));

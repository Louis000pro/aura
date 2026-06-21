-- ============================================================
-- Migration : correctif RLS followers
-- ============================================================
-- Symptôme : sur le profil des autres utilisateurs, les compteurs
-- « Abonnés » et « Abonnements » plafonnent à 0 ou 1 alors qu'il
-- devrait y en avoir plus.
--
-- Cause : la policy SELECT réellement déployée en prod est RESTRICTIVE
-- (chaque utilisateur ne voit que SES propres lignes de follow) au lieu
-- de « visible par tous ». Un COUNT(*) ne voit alors que la ligne de
-- l'utilisateur courant → 0 (s'il ne suit pas la personne) ou 1 (s'il
-- la suit). Les abonnements sont pourtant censés être publics.
--
-- Correctif : on repart d'un état propre — on supprime TOUTES les
-- policies existantes sur la table (quel que soit leur nom, pour éliminer
-- une éventuelle policy restrictive résiduelle) puis on recrée les 3
-- bonnes policies.
-- ============================================================

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'followers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.followers', pol.policyname);
  END LOOP;
END $$;

-- Les abonnements sont PUBLICS : compteurs et listes visibles par tous.
CREATE POLICY "Abonnements visibles par tous"
  ON public.followers FOR SELECT USING (true);

-- On ne peut s'abonner que pour soi-même.
CREATE POLICY "Utilisateur peut s'abonner"
  ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- On ne peut se désabonner que pour soi-même.
CREATE POLICY "Utilisateur peut se désabonner"
  ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

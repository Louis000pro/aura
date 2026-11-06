-- ════════════════════════════════════════════════════════════════════
-- La vitrine choisie : les trois cartes qu'on montre sur son profil
-- (Louis, 2026-11-06 : « Oui, prépare-le »).
--
-- À exécuter APRÈS 20260726_missions_aura.sql (aura_mission_credits) et
-- 20261006_profils_colonnes_privees.sql (les droits de lecture de
-- `profiles`). Rejouable sans risque.
--
-- ── CE QUI S'ÉCRIT ──────────────────────────────────────────────────
-- `profiles.vitrine_cartes` : trois identifiants de carte au plus, dans
-- l'ordre. NULL : Vaiiya compose la vitrine toute seule. Le compte l'écrit
-- lui-même, les policies d'UPDATE de `profiles` couvrent déjà ce cas.
-- Comme toute colonne neuve de `profiles`, elle est PRIVÉE : aucun GRANT.
-- On la lit par `vitrine_profil`.
--
-- ⚠️ UN IDENTIFIANT ÉCRIT NE PROUVE RIEN. N'importe qui peut poser
-- `rang-eternel` depuis la console, et la base ne le refuse pas : ce qui
-- rend une carte gagnée vit dans `lib/cartes/catalogue.ts`, et le recopier
-- ici ferait deux vérités. C'est CELUI QUI REGARDE qui tranche : `vitrineDe`
-- ne garde que les cartes que le rang, les badges et la flamme du compte
-- disent gagnées. Une carte inventée ne s'affiche donc chez personne.
--
-- ── CE QUI SE LIT ───────────────────────────────────────────────────
-- `vitrine_profil(compte)` rend le choix, et la plus haute flamme tenue.
--
-- La flamme est la seule famille qu'un autre membre ne pouvait pas vérifier.
-- Les badges `regularite-*` ne disent rien sous 7 jours, ils ne comptent que
-- les séances et les repas, et la série en cours retombe quand elle casse.
-- Sans ce chiffre, quelqu'un qui montre sa Flamme la verrait chez lui et pas
-- chez ses amis. Il vient du même registre que `serie_jokers_aura` : les
-- jours avec une connexion, une séance ou un repas.
--
-- ⚠️ LE PALIER, JAMAIS LE CHIFFRE EXACT (1, 3, 7, 30, 100 : `PALIERS_FLAMME`
-- dans `lib/flammesSerie.ts`, que `check:cartes-sql` compare). La carte montre
-- le palier à tout le monde, le record exact reste à son propriétaire, comme
-- les trois nombres de `badges_aura`.
--
-- ⚠️ UN JOUR COUVERT PAR UN JOKER COUPE LA SUITE ICI, alors qu'il garde la
-- série. Refaire tout le calcul des jokers sur tout l'historique coûterait
-- cher pour un cas rare : un compte qui vit sur ses jokers et dont la série
-- finit par casser. Pendant qu'elle tourne, `profil_public` la dit.
--
-- ⚠️ SECURITY DEFINER, comme `profil_public` et pour la même raison : le
-- registre est en RLS propriétaire. La fonction ne rend que ces deux valeurs.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vitrine_cartes TEXT[];

-- La forme, et rien d'autre : trois identifiants au plus, jamais de liste
-- vide (« pas de choix » s'écrit NULL), jamais une valeur NULL dans la liste.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_vitrine_cartes_forme;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_vitrine_cartes_forme CHECK (
  vitrine_cartes IS NULL
  OR (
    cardinality(vitrine_cartes) BETWEEN 1 AND 3
    AND array_to_string(vitrine_cartes, ' ', '?') ~ '^[a-z0-9-]{1,40}( [a-z0-9-]{1,40}){0,2}$'
  )
);

CREATE OR REPLACE FUNCTION public.vitrine_profil(p_user UUID)
RETURNS TABLE (v_cartes TEXT[], v_flamme INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record INTEGER;
BEGIN
  -- Réservé aux comptes connectés, comme `profil_public`.
  IF auth.uid() IS NULL OR p_user IS NULL THEN
    RETURN;
  END IF;

  -- La plus longue suite de jours : deux jours qui se suivent ont le même
  -- écart avec leur rang, donc chaque suite forme un seul groupe.
  SELECT COALESCE(max(suites.n), 0)
    INTO v_record
    FROM (
      SELECT count(*)::INTEGER AS n
        FROM (
          SELECT jours.jour - (row_number() OVER (ORDER BY jours.jour))::INTEGER AS depart
            FROM (
              SELECT DISTINCT c.period_key::date AS jour
                FROM public.aura_mission_credits AS c
               WHERE c.user_id = p_user
                 AND c.mission_id IN ('connexion', 'seance', 'repas')
                 AND c.period_type = 'day'
            ) AS jours
        ) AS groupes
       GROUP BY groupes.depart
    ) AS suites;

  RETURN QUERY
  SELECT
    (SELECT p.vitrine_cartes FROM public.profiles AS p WHERE p.id = p_user),
    COALESCE((SELECT max(palier) FROM unnest(ARRAY[1, 3, 7, 30, 100]) AS palier WHERE palier <= v_record), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.vitrine_profil(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vitrine_profil(UUID) TO authenticated;

-- ── Rollback ────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS public.vitrine_profil(UUID);
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS vitrine_cartes;

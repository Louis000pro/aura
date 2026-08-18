-- ════════════════════════════════════════════════════════════════════
--  Le Guide personnel : Nora ou Sasha.
--
--  À coller dans le SQL Editor de Supabase. Aucune dépendance à une
--  migration précédente autre que `profiles`.
--
--  ⚠️ Tant que ce SQL n'est pas passé, le code de la phase 1A ne casse
--  rien : la lecture du Guide échoue, l'état devient « inconnu », et
--  « inconnu » ne redirige jamais personne. Voir src/context/GuideContext.
-- ════════════════════════════════════════════════════════════════════

-- ── La colonne ──────────────────────────────────────────────────────
-- TEXT plutôt qu'un type ENUM PostgreSQL, volontairement : ajouter une
-- valeur à un enum est une migration, et le supprimer en est une autre,
-- pénible. Ici la contrainte fait le même travail et se réécrit d'une
-- ligne. On n'attend pas de troisième Guide, mais on ne veut pas payer
-- une migration de type le jour où il arrive.
--
-- PAS de DEFAULT, volontairement aussi. Un défaut, c'est un Guide que
-- personne n'a choisi : exactement ce que le produit interdit. NULL veut
-- dire « cette personne n'a pas encore choisi », et c'est ce NULL qui
-- déclenchera l'écran de choix, une fois seulement.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guide_id TEXT;   -- 'nora' | 'sasha' | NULL

-- ── La contrainte ───────────────────────────────────────────────────
-- Aucune autre valeur ne peut entrer, d'où qu'elle vienne (client, API,
-- console). `ADD CONSTRAINT` n'a pas d'IF NOT EXISTS en PostgreSQL, donc
-- on rejoue DROP puis ADD, comme les policies ailleurs dans ce dossier.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_guide_id_valide;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_guide_id_valide
  CHECK (guide_id IS NULL OR guide_id IN ('nora', 'sasha'));

-- ── Ce que cette migration ne fait PAS, et ne doit jamais faire ──────
--   · aucun backfill : personne ne reçoit un Guide qu'il n'a pas choisi ;
--   · aucune déduction depuis `onboarding_gender`, ni depuis quoi que ce
--     soit d'autre du profil. Le Guide n'a aucun lien avec le sexe ou le
--     genre de la personne. C'est une règle produit verrouillée ;
--   · aucun tirage au sort ;
--   · aucune valeur par défaut cachée.
--
-- Les comptes existants gardent donc `guide_id = NULL` et se verront
-- poser la question une fois, comme les nouveaux.

-- ── Ni policy, ni index ─────────────────────────────────────────────
-- Les policies de `profiles` couvrent déjà le besoin (voir
-- 20260501_profiles_and_trigger.sql) : SELECT ouvert, UPDATE réservé au
-- propriétaire de la ligne. Chacun écrit donc son Guide et personne
-- d'autre.
-- Pas d'index : on ne cherche jamais les profils PAR Guide, on lit
-- toujours le sien à partir de son id, qui est la clé primaire.

-- ════════════════════════════════════════════════════════════════════════
-- Les colonnes PRIVÉES de `profiles` ne se lisent plus que par leur
-- propriétaire (2026-10-06, dernier point de l'audit sécurité).
--
-- Avant : la policy « profiles lisibles par membres connectes » (USING true)
-- laissait n'importe quel compte connecté lire l'e-mail, l'âge, la taille,
-- le poids, le régime et l'identifiant Stripe de TOUS les autres.
--
-- RLS filtre des LIGNES, pas des colonnes. On garde donc la policy (pseudo,
-- avatar, bio, rang… doivent rester visibles dans la communauté) et on
-- retire le droit de lecture sur les colonnes sensibles :
--   1. plus de SELECT au niveau table pour anon / authenticated ;
--   2. SELECT colonne par colonne sur la liste PUBLIQUE ci-dessous ;
--   3. ses propres colonnes privées se lisent via la vue `mon_profil`,
--      qui ne rend jamais que la ligne de auth.uid().
--
-- Les écritures ne changent pas (INSERT / UPDATE restent au niveau table,
-- toujours bornées par les policies propriétaire et le trigger
-- proteger_colonnes_profil). Les routes serveur (service_role) ne sont pas
-- concernées.
--
-- ⚠️ AJOUTER UNE COLONNE À `profiles` : elle est PRIVÉE par défaut (aucun
-- grant). Si elle doit se voir chez les autres, l'ajouter au GRANT ci-dessous
-- dans une nouvelle migration. Si le client la lit pour soi, passer par
-- `mon_profil` (la vue fait `select *`, elle la récupère après un
-- `create or replace view`).
--
-- Rejouable.
-- ════════════════════════════════════════════════════════════════════════

revoke select on public.profiles from anon, authenticated;

grant select (
  id, pseudo, full_name, avatar_url, bio, created_at, updated_at,
  is_admin, is_premium, is_certified, is_banned, subscription_tier,
  member_number, onboarding_goals, onboarding_level,
  onboarding_completed, tour_completed, guide_id, pseudo_choisi
) on public.profiles to authenticated;

-- Sa propre ligne, toutes colonnes. Vue « definer » (propriétaire postgres)
-- volontairement : c'est elle qui contourne le retrait de colonnes, et le
-- filtre auth.uid() est ce qui la rend sûre. security_barrier empêche un
-- prédicat du client de s'évaluer avant ce filtre.
create or replace view public.mon_profil
  with (security_barrier = true)
as
  select * from public.profiles where id = auth.uid();

revoke all on public.mon_profil from public, anon;
grant select on public.mon_profil to authenticated;

-- ── Vérification (sous le rôle authenticated) ──────────────────────────
-- select email from profiles limit 1;           -- doit échouer (42501)
-- select pseudo from profiles limit 1;          -- doit marcher
-- select onboarding_weight from mon_profil;     -- sa propre ligne seulement
--
-- ── Rollback ───────────────────────────────────────────────────────────
-- drop view if exists public.mon_profil;
-- grant select on public.profiles to anon, authenticated;

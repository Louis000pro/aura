-- ════════════════════════════════════════════════════════════════════
-- LE PROFIL D'AUTRUI PASSE PAR UNE VUE, ET `profiles` REDEVIENT PRIVÉE.
--
-- ⚠️ CE QUI EST EXPOSÉ AUJOURD'HUI, ET CE N'EST PAS UNE HYPOTHÈSE.
-- `20260501_profiles_and_trigger.sql` pose :
--
--     CREATE POLICY "Profiles lisibles par tous"
--       ON public.profiles FOR SELECT USING (true);
--
-- Or la table a beaucoup grossi depuis mai, et elle porte maintenant :
--
--   · le CORPS  : onboarding_age, onboarding_height, onboarding_weight,
--                 onboarding_gender, onboarding_meals_day, onboarding_diet
--   · les GOÛTS : taste_profile
--   · le LIEU   : training_location, training_equipment
--   · l'ABONNEMENT : is_premium, subscription_tier, subscription_status,
--                 stripe_customer_id, current_period_end
--   · la MODÉRATION : is_banned
--
-- La clé anonyme vit dans le bundle du navigateur — c'est son rôle, elle n'est
-- pas un secret. Avec `USING (true)`, n'importe qui peut donc demander
--
--     select onboarding_age, onboarding_weight, onboarding_height,
--            onboarding_gender, onboarding_diet, stripe_customer_id
--       from profiles
--
-- et lire l'âge, le poids, la taille, le sexe, le régime et l'identifiant de
-- client Stripe de TOUS les comptes. Ce n'est pas ce que la policy voulait
-- dire : elle date du jour où la table ne portait qu'un pseudo et un avatar.
--
-- ⚠️ ET LA RLS NE SAIT PAS RESTREINDRE PAR COLONNE : elle est par LIGNE. On ne
-- peut donc pas « garder public le pseudo et cacher le poids » sur la même
-- table. Les privilèges par colonne, eux, ne savent rien de la ligne : ils
-- empêcheraient aussi quelqu'un de lire SON propre poids. Il faut donc deux
-- surfaces, et c'est exactement ce que le produit fait déjà pour les mêmes
-- raisons : `profil_public()`, `rangs_aura()` et `badges_aura()` existent parce
-- que `workout_sessions` et `aura_mission_credits` sont propriétaires.
--
-- ⭐ CE QUI EST PUBLIC EST CE QUE LES ÉCRANS MONTRENT DÉJÀ, rien de plus : le
-- pseudo, le nom, la bio, l'avatar, l'objectif et le niveau (décision du
-- 2026-08-30 : « SUR LE PROFIL D'UN AMI, L'OBJECTIF EST DE L'IDENTITÉ, PAS DE
-- LA DONNÉE DE SANTÉ : on montre le libellé, JAMAIS l'âge, le poids ni la
-- taille »), la certification, la marque d'administration et la date
-- d'inscription. Neuf colonnes, contre la trentaine d'aujourd'hui.
--
-- ⚠️ `security_invoker = false` EST LE CŒUR DU MÉCANISME, ET IL EST ÉCRIT
-- EXPLICITEMENT. Une vue en `security_invoker = true` lirait la table avec les
-- droits de l'appelant, donc la RLS propriétaire s'appliquerait et la vue ne
-- rendrait que sa propre ligne : elle ne servirait à rien. En `false` (le
-- défaut de PostgreSQL, mais on ne laisse pas un défaut porter une garantie de
-- sécurité), elle lit avec les droits de son PROPRIÉTAIRE et ne rend que les
-- neuf colonnes. C'est le même raisonnement que `SECURITY DEFINER` sur
-- `profil_public()`, et le garde-fou est le même : la vue ne prend aucun
-- paramètre et ne peut rien rendre d'autre que ces neuf colonnes.
--
-- ⚠️ ORDRE DE DÉPLOIEMENT : LE CODE D'ABORD, CE FICHIER ENSUITE.
-- `src/lib/profilsPublics.ts` sonde l'existence de la vue une fois par session
-- et retombe sur `profiles` tant qu'elle n'existe pas : déployer le code seul
-- ne change donc RIEN (l'app se comporte exactement comme avant). C'est en
-- collant ce fichier que la bascule a lieu, des deux côtés à la fois.
--
-- ⚠️ ROLLBACK, en bas de fichier.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · La vue publique ─────────────────────────────────────────────
drop view if exists public.profils_publics;

create view public.profils_publics as
  select
    id,
    pseudo,
    full_name,
    bio,
    avatar_url,
    onboarding_goals,
    onboarding_level,
    is_certified,
    is_admin,
    created_at
  from public.profiles;

-- Elle lit avec les droits de son propriétaire, donc par-dessus la RLS
-- propriétaire posée à l'étape 2. Sans cette ligne, elle ne rendrait que la
-- ligne de l'appelant et tous les écrans de la communauté se videraient.
alter view public.profils_publics set (security_invoker = false);

comment on view public.profils_publics is
  'La seule surface publique d''un profil : ce que les écrans montrent déjà. '
  'NE JAMAIS y ajouter une colonne du corps (age, poids, taille, sexe, regime), '
  'des gouts, du lieu d''entrainement, de l''abonnement ou de la moderation.';

grant select on public.profils_publics to anon, authenticated;

-- ── 2 · `profiles` redevient propriétaire en LECTURE ────────────────
-- L'écriture ne bouge pas : la policy UPDATE `auth.uid() = id` de mai reste
-- telle quelle, et le `service_role` traverse la RLS comme avant (le cron,
-- l'administration et les routes API continuent de tout lire).
drop policy if exists "Profiles lisibles par tous" on public.profiles;

create policy "Chacun lit son profil"
  on public.profiles for select
  using (auth.uid() = id);

-- ── 3 · Contrôle, à lire après le collage ───────────────────────────
-- Les neuf colonnes publiques, et seulement elles :
--   select * from public.profils_publics limit 1;
-- La table ne rend plus que sa propre ligne (à exécuter en tant qu'utilisateur
-- connecté, pas avec la clé de service, qui traverse la RLS) :
--   select count(*) from public.profiles;   -- attendu : 1
-- Et rien de sensible n'est joignable :
--   select onboarding_weight from public.profils_publics;  -- attendu : erreur

-- ── ROLLBACK ────────────────────────────────────────────────────────
-- Il rend EXACTEMENT l'état d'avant, et le code continue de fonctionner :
-- privé de la vue, `profilsPublics.ts` retombe sur la table.
--
--   drop policy if exists "Chacun lit son profil" on public.profiles;
--   create policy "Profiles lisibles par tous"
--     on public.profiles for select using (true);
--   drop view if exists public.profils_publics;

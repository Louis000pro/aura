-- ════════════════════════════════════════════════════════════════════════
--  Faille admin : un compte ne peut plus se donner de droits lui-même
--  (2026-10-06)
-- ════════════════════════════════════════════════════════════════════════
--
--  LE DÉFAUT
--  La policy « Utilisateur modifie son profil » (20260501) autorise un compte
--  à modifier SA ligne de `profiles`… toutes colonnes comprises. Aucune
--  restriction par colonne, aucun déclencheur. Donc, depuis la console du
--  navigateur, avec la seule clé publique :
--
--    supabase.from("profiles").update({ is_admin: true }).eq("id", monId)
--
--  …et `exigerAdmin` (src/lib/adminGuard.ts), qui lit justement
--  `profiles.is_admin`, ouvre toute l'administration : bannir, supprimer des
--  comptes, lire les statistiques. Même chose pour `is_premium` (Premium
--  gratuit) et `is_banned` (un banni se débannit).
--
--  LA CORRECTION
--  Un déclencheur BEFORE INSERT OR UPDATE refuse, pour les rôles qui viennent
--  du navigateur (`anon`, `authenticated`), toute modification des colonnes
--  qui décident d'un DROIT. Les autres colonnes (pseudo, bio, avatar,
--  réponses du questionnaire, guide, thème…) restent modifiables comme avant.
--
--  POURQUOI UN DÉCLENCHEUR ET PAS DES DROITS PAR COLONNE
--  Des `GRANT UPDATE (col, …)` exigeraient de lister TOUTES les colonnes
--  modifiables par le client, et la première colonne ajoutée plus tard
--  serait refusée en silence à l'écran. Le déclencheur liste au contraire les
--  colonnes PROTÉGÉES : en ajouter une nouvelle ne casse rien.
--
--  QUI PASSE ENCORE
--  `current_user` vaut le rôle de la requête :
--    · navigateur (PostgREST)          → anon / authenticated  → contrôlé
--    · routes serveur (clé service)    → service_role          → libre
--      (webhook Stripe, /api/admin/user, stripeSync, reconcile)
--    · fonctions SECURITY DEFINER      → leur propriétaire     → libre
--      (handle_new_user, etc.)
--    · SQL Editor de Supabase          → postgres              → libre
--  La fonction est donc volontairement SECURITY INVOKER : en DEFINER,
--  `current_user` vaudrait toujours son propriétaire et elle ne bloquerait
--  personne.
--
--  CE QUI NE CHANGE PAS À L'ÉCRAN
--  Vérifié dans le code (2026-10-06) : aucune écriture côté navigateur ne
--  touche ces colonnes. Les écritures client de `profiles` sont : profil
--  (pseudo, full_name, bio, avatar_url), questionnaire (onboarding_*),
--  tour_completed, guide_id, taste_profile, lieu d'entraînement, et
--  l'insert de secours d'ensureProfile (id, pseudo, full_name, avatar_url,
--  email). Le contrôle se fait par `IS DISTINCT FROM` : un upsert qui
--  renverrait la MÊME valeur passe.
--
--  À COLLER À LA MAIN dans le SQL Editor Supabase. Rejouable.
--  Rien n'est réécrit dans les données : 2 admins et les abonnés actuels
--  restent tels quels (voir la vérification en bas).
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.proteger_colonnes_profil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Serveur, fonctions de confiance, SQL Editor : rien à contrôler.
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Une ligne créée depuis le navigateur part TOUJOURS sans aucun droit,
    -- quoi qu'elle déclare. (En pratique `handle_new_user` crée la ligne
    -- avant ; ce cas ne sert qu'à l'insert de secours d'ensureProfile.)
    NEW.is_admin            := false;
    NEW.is_premium          := false;
    NEW.is_banned           := false;
    NEW.is_certified        := false;
    NEW.subscription_tier   := 'free';
    NEW.subscription_status := NULL;
    NEW.stripe_customer_id  := NULL;
    NEW.current_period_end  := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE : on refuse franchement plutôt que de remettre en silence.
  -- Une écriture refusée se voit (erreur 42501) ; une écriture « corrigée »
  -- en douce laisserait croire à l'écran qu'elle a marché.
  IF NEW.is_admin            IS DISTINCT FROM OLD.is_admin
  OR NEW.is_premium          IS DISTINCT FROM OLD.is_premium
  OR NEW.is_banned           IS DISTINCT FROM OLD.is_banned
  OR NEW.is_certified        IS DISTINCT FROM OLD.is_certified
  OR NEW.subscription_tier   IS DISTINCT FROM OLD.subscription_tier
  OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
  OR NEW.stripe_customer_id  IS DISTINCT FROM OLD.stripe_customer_id
  OR NEW.current_period_end  IS DISTINCT FROM OLD.current_period_end
  OR NEW.member_number       IS DISTINCT FROM OLD.member_number
  OR NEW.id                  IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'colonne_protegee'
      USING ERRCODE = '42501',
            HINT = 'Les droits d''un compte ne se modifient que côté serveur.';
  END IF;

  RETURN NEW;
END;
$$;

-- Personne n'a à l'appeler en RPC : c'est une fonction de déclencheur.
REVOKE ALL ON FUNCTION public.proteger_colonnes_profil() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS proteger_colonnes_profil ON public.profiles;
CREATE TRIGGER proteger_colonnes_profil
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_colonnes_profil();


-- ════════════════════════════════════════════════════════════════════════
--  VÉRIFICATION (à jouer APRÈS, dans le SQL Editor, puis tout est annulé)
--  Remplacer <ID_D_UN_COMPTE_NON_ADMIN> par l'id d'un compte de test.
-- ════════════════════════════════════════════════════════════════════════
--
--  begin;
--    select set_config('request.jwt.claims',
--      '{"sub":"<ID_D_UN_COMPTE_NON_ADMIN>","role":"authenticated"}', true);
--    set local role authenticated;
--
--    -- 1. Doit ÉCHOUER (42501 colonne_protegee) :
--    update public.profiles set is_admin = true
--     where id = '<ID_D_UN_COMPTE_NON_ADMIN>';
--  rollback;
--
--  begin;
--    select set_config('request.jwt.claims',
--      '{"sub":"<ID_D_UN_COMPTE_NON_ADMIN>","role":"authenticated"}', true);
--    set local role authenticated;
--
--    -- 2. Doit RÉUSSIR (1 ligne) : une colonne ordinaire.
--    update public.profiles set bio = bio
--     where id = '<ID_D_UN_COMPTE_NON_ADMIN>';
--
--    -- 3. Doit RÉUSSIR : renvoyer la même valeur protégée n'est pas changer.
--    update public.profiles set is_premium = is_premium
--     where id = '<ID_D_UN_COMPTE_NON_ADMIN>';
--  rollback;
--
--  -- 4. Les droits existants n'ont pas bougé (2 admins au 2026-10-06) :
--  select count(*) filter (where is_admin)   as admins,
--         count(*) filter (where is_premium) as premium
--    from public.profiles;
--
--
--  RETOUR ARRIÈRE (rouvre la faille, à n'utiliser qu'en cas de casse) :
--    DROP TRIGGER IF EXISTS proteger_colonnes_profil ON public.profiles;
--    DROP FUNCTION IF EXISTS public.proteger_colonnes_profil();

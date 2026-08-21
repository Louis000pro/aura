-- ════════════════════════════════════════════════════════════════════
-- L'ÉCONOMIE EXP v2 : valeurs fixes, série de régularité, défis hebdo
--
-- À COLLER APRÈS 20260726_missions_aura.sql ET 20260729_presence_aura.sql :
-- ce fichier REMPLACE plusieurs de leurs fonctions.
--
-- Ce qui change, et pourquoi :
--
--  1. PLUS AUCUN MULTIPLICATEUR. Le ×1,5 Premium disparaît : une mission
--     rapporte le nombre écrit sur elle, pour tout le monde. L'avantage
--     Premium devient « plus de missions », jamais « les mêmes missions
--     qui rapportent plus ». Un utilisateur doit pouvoir prévoir son gain
--     avant d'agir.
--
--  2. LA SÉRIE NE SE GAGNE PLUS EN SE CONNECTANT. Venir sur l'app rapporte
--     de l'EXP (+5), mais ne valide PAS la journée. Il faut une action
--     utile : une séance ou un repas. La série est donc DÉRIVÉE du registre
--     de crédits (`serie_aura`), plus jamais incrémentée à la main : un
--     compteur peut se désynchroniser, une dérivation ne le peut pas.
--     `daily_stats.streak` reste écrite pour l'affichage, mais cesse d'être
--     la source de vérité.
--
--  3. UN SEUL ENDROIT ÉVALUE LES MISSIONS DÉRIVÉES : `evaluer_missions_aura`.
--     Les trois triggers (connexion, séance, repas) l'appellent en sortie.
--     Sans ça, « journée complète » aurait dû être recopiée dans chacun des
--     trois, et les trois copies auraient divergé.
--
--  4. LES DÉFIS HEBDO COMPTENT DES JOURS, PAS DES SÉANCES. Cinq séances le
--     même dimanche ne font pas une semaine régulière. `semaine_intense`
--     (5 séances) est retirée pour cette raison ; ses lignes historiques
--     restent, on ne réécrit jamais le registre.
--
--  ⚠️ LE REGISTRE EST IMMUABLE. Aucune ligne existante n'est modifiée ni
--  supprimée par ce fichier : ce qui a été gagné reste gagné, et l'EXP ne
--  descend jamais. Seuls les crédits FUTURS suivent le nouveau barème.
-- ════════════════════════════════════════════════════════════════════

-- ── Les nouvelles missions doivent être admises par la contrainte ──
-- Les anciens identifiants restent listés : des lignes les portent déjà.
--
-- ⚠️ ON SUPPRIME PAR DÉCOUVERTE, PAS PAR NOM. La contrainte d'origine était
-- écrite en ligne dans le CREATE TABLE, donc PostgreSQL l'a nommée tout seul.
-- Si ce nom n'était pas exactement celui qu'on devine, un `DROP CONSTRAINT IF
-- EXISTS` ne dirait rien et l'ancienne contrainte SURVIVRAIT : elle rejetterait
-- alors `journee_complete` et les trois défis hebdo, à la première mission
-- validée, en production. On liste donc les contraintes CHECK de la table qui
-- portent sur `mission_id`, et on les enlève toutes.
DO $$
DECLARE
  v_nom TEXT;
BEGIN
  FOR v_nom IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'aura_mission_credits'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%mission_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.aura_mission_credits DROP CONSTRAINT %I', v_nom);
  END LOOP;
END;
$$;

ALTER TABLE public.aura_mission_credits
  ADD CONSTRAINT aura_mission_credits_mission_id_check CHECK (mission_id IN (
    -- Missions du jour, gratuites
    'connexion', 'seance', 'repas', 'journee_complete',
    -- Missions du jour, Premium
    'double_seance', 'leve_tot', 'nutrition_complete', 'objectif_accompli',
    -- Défis de la semaine
    'semaine_active', 'semaine_reguliere', 'semaine_parfaite',
    -- Retirée le 2026-08-21, conservée pour l'historique déjà écrit
    'semaine_intense'
  ));


-- ════════════════════════════════════════════════════════════════════
-- 1 · LE CRÉDIT, valeur fixe, sans multiplicateur
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.crediter_mission_aura(
  p_user UUID,
  p_mission TEXT,
  p_period_type TEXT,
  p_period_key TEXT,
  p_points NUMERIC,
  p_premium_only BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_premium BOOLEAN;
BEGIN
  IF p_premium_only THEN
    SELECT COALESCE(is_premium, false) OR COALESCE(is_admin, false)
      INTO v_premium
    FROM public.profiles
    WHERE id = p_user;

    IF NOT COALESCE(v_premium, false) THEN
      RETURN;
    END IF;
  END IF;

  -- p_points est écrit tel quel. Aucun calcul, aucun bonus, aucune règle
  -- cachée : le nombre affiché dans l'app est le nombre inséré ici.
  INSERT INTO public.aura_mission_credits
    (user_id, mission_id, period_type, period_key, points)
  VALUES
    (p_user, p_mission, p_period_type, p_period_key, p_points)
  ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.crediter_mission_aura(UUID, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN)
  FROM PUBLIC, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 2 · LA JOURNÉE ACTIVE ET LA SÉRIE
--
-- Une journée est ACTIVE si elle porte un crédit `seance` ou `repas`.
-- Ces deux crédits ne sont émis que par une action FAITE LE JOUR MÊME
-- (les triggers refusent une date antérieure ou future), donc antidater
-- une entrée ne rallume jamais une journée passée.
--
-- La connexion n'entre pas dans cette liste : c'est toute la règle.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.jours_actifs_aura(
  p_user UUID,
  p_debut DATE,
  p_fin DATE
)
RETURNS DATE[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT credits.period_key::date), ARRAY[]::DATE[])
  FROM public.aura_mission_credits AS credits
  WHERE credits.user_id = p_user
    -- mission_id d'abord : `seance` et `repas` sont toujours des missions
    -- du jour, donc leur period_key est toujours une date castable.
    AND credits.mission_id IN ('seance', 'repas')
    AND credits.period_type = 'day'
    AND credits.period_key >= p_debut::text
    AND credits.period_key <= p_fin::text;
$$;

-- Helper INTERNE. Aucun GRANT : elle prend un `p_user` en argument, donc
-- l'ouvrir aux comptes connectés reviendrait à laisser n'importe qui lire les
-- jours d'entraînement de n'importe qui. Ses seuls appelants sont des
-- fonctions SECURITY DEFINER, qui n'ont pas besoin de ce droit.
REVOKE ALL ON FUNCTION public.jours_actifs_aura(UUID, DATE, DATE)
  FROM PUBLIC, anon, authenticated;

/*
  La série : le nombre de journées actives consécutives.

  L'ancre est aujourd'hui s'il est déjà validé, sinon hier. Autrement dit
  une journée pas encore validée ne CASSE pas la série (on a jusqu'à
  minuit), elle ne la prolonge simplement pas encore. C'est ce qui permet
  d'afficher « 🔥 14 jours · fais une action pour continuer » le matin
  sans mentir dans un sens ni dans l'autre.

  Bornée à 400 jours : au-delà, la boucle s'arrête d'elle-même faute de
  données chargées, et personne n'a de série plus longue que l'app.
*/
CREATE OR REPLACE FUNCTION public.serie_aura(p_user UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today  DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_actifs DATE[];
  v_jour   DATE;
  v_serie  INTEGER := 0;
BEGIN
  v_actifs := public.jours_actifs_aura(p_user, v_today - 400, v_today);

  IF array_length(v_actifs, 1) IS NULL THEN
    RETURN 0;
  END IF;

  v_jour := CASE WHEN v_today = ANY(v_actifs) THEN v_today ELSE v_today - 1 END;

  WHILE v_jour = ANY(v_actifs) LOOP
    v_serie := v_serie + 1;
    v_jour  := v_jour - 1;
  END LOOP;

  RETURN v_serie;
END;
$$;

-- Même raisonnement : la série de quelqu'un d'autre ne se demande pas.
REVOKE ALL ON FUNCTION public.serie_aura(UUID) FROM PUBLIC, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 3 · L'ÉVALUATION DES MISSIONS DÉRIVÉES
--
-- Tout ce qui se déduit d'autres missions vit ICI, et nulle part ailleurs.
-- Les trois triggers l'appellent en sortie ; ajouter une mission dérivée
-- se fait en un seul endroit.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.evaluer_missions_aura(p_user UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today      DATE    := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week       TEXT    := to_char(v_today, 'IYYY-"W"IW');
  v_week_start DATE    := date_trunc('week', v_today::timestamp)::date;
  v_connexion  BOOLEAN;
  v_seance     BOOLEAN;
  v_repas      BOOLEAN;
  v_actifs     INTEGER;
  v_serie      INTEGER;
BEGIN
  SELECT bool_or(mission_id = 'connexion'),
         bool_or(mission_id = 'seance'),
         bool_or(mission_id = 'repas')
    INTO v_connexion, v_seance, v_repas
  FROM public.aura_mission_credits
  WHERE user_id = p_user
    AND period_type = 'day'
    AND period_key = v_today::text;

  v_connexion := COALESCE(v_connexion, false);
  v_seance    := COALESCE(v_seance, false);
  v_repas     := COALESCE(v_repas, false);

  -- Journée complète : les TROIS missions gratuites du jour. Gratuite.
  IF v_connexion AND v_seance AND v_repas THEN
    PERFORM public.crediter_mission_aura(
      p_user, 'journee_complete', 'day', v_today::text, 10, false
    );
  END IF;

  -- Objectif accompli : DEUX ACTIONS UTILES, séance et repas. La connexion
  -- n'y entre pas, exactement comme elle n'entre pas dans la série : une
  -- seule définition de « faire quelque chose » dans tout le produit.
  IF v_seance AND v_repas THEN
    PERFORM public.crediter_mission_aura(
      p_user, 'objectif_accompli', 'day', v_today::text, 15, true
    );
  END IF;

  -- Les défis de la semaine comptent des JOURS ACTIFS, jamais des séances.
  SELECT COALESCE(array_length(
    public.jours_actifs_aura(p_user, v_week_start, v_week_start + 6), 1
  ), 0) INTO v_actifs;

  IF v_actifs >= 3 THEN
    PERFORM public.crediter_mission_aura(p_user, 'semaine_active', 'week', v_week, 30, false);
  END IF;
  IF v_actifs >= 5 THEN
    PERFORM public.crediter_mission_aura(p_user, 'semaine_reguliere', 'week', v_week, 50, true);
  END IF;
  IF v_actifs >= 7 THEN
    PERFORM public.crediter_mission_aura(p_user, 'semaine_parfaite', 'week', v_week, 100, false);
  END IF;

  -- La série recalculée est recopiée dans daily_stats pour l'affichage
  -- historique (profil, admin, contexte de l'assistant). La source de
  -- vérité reste `serie_aura` : cette colonne n'est qu'un reflet.
  v_serie := public.serie_aura(p_user);
  UPDATE public.daily_stats
     SET streak = v_serie
   WHERE user_id = p_user AND date = v_today AND streak IS DISTINCT FROM v_serie;

  RETURN v_serie;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluer_missions_aura(UUID) FROM PUBLIC, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 4 · LES TROIS DÉCLENCHEURS
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.crediter_connexion_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
  IF NEW.date <> v_today THEN
    RETURN NEW;
  END IF;

  PERFORM public.crediter_mission_aura(
    NEW.user_id, 'connexion', 'day', v_today::text, 5, false
  );

  -- La connexion ne valide pas la journée, mais elle peut compléter une
  -- « journée complète » dont la séance et le repas sont déjà là.
  PERFORM public.evaluer_missions_aura(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_connexion_credit ON public.daily_stats;
CREATE TRIGGER aura_connexion_credit
AFTER INSERT ON public.daily_stats
FOR EACH ROW EXECUTE FUNCTION public.crediter_connexion_aura();

/*
  ⚠️ LE TRIGGER NE S'ARME PLUS SUR UPDATE, et c'est volontaire.
  `evaluer_missions_aura` écrit `daily_stats.streak` : laisser le trigger
  écouter les UPDATE le ferait se rappeler lui-même à chaque recalcul de
  série. La connexion s'insère une fois par jour, l'INSERT suffit, et
  `marquer_presence_aura` crédite de toute façon elle-même.
*/

CREATE OR REPLACE FUNCTION public.crediter_seance_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now           TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_today         DATE      := v_now::date;
  v_session_local TIMESTAMP := NEW.started_at AT TIME ZONE 'Europe/Paris';
  v_day_count     INTEGER;
BEGIN
  -- Une séance ancienne ou future ajoutée après coup ne crédite rien, et
  -- ne peut donc pas rallumer une journée de série déjà perdue.
  IF NEW.started_at IS NULL
     OR v_session_local::date <> v_today
     OR COALESCE(NEW.duration_minutes, 0) < 1 THEN
    RETURN NEW;
  END IF;

  PERFORM public.crediter_mission_aura(
    NEW.user_id, 'seance', 'day', v_today::text, 30, false
  );

  -- Les missions Premium exigent une vraie séance d'au moins cinq minutes.
  IF COALESCE(NEW.duration_minutes, 0) >= 5 THEN
    IF v_session_local::time < TIME '09:00' THEN
      PERFORM public.crediter_mission_aura(
        NEW.user_id, 'leve_tot', 'day', v_today::text, 20, true
      );
    END IF;

    SELECT count(*)::integer INTO v_day_count
    FROM public.workout_sessions
    WHERE user_id = NEW.user_id
      AND duration_minutes >= 5
      AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

    IF v_day_count >= 2 THEN
      PERFORM public.crediter_mission_aura(
        NEW.user_id, 'double_seance', 'day', v_today::text, 20, true
      );
    END IF;
  END IF;

  PERFORM public.evaluer_missions_aura(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_seance_credit ON public.workout_sessions;
CREATE TRIGGER aura_seance_credit
AFTER INSERT ON public.workout_sessions
FOR EACH ROW EXECUTE FUNCTION public.crediter_seance_aura();

CREATE OR REPLACE FUNCTION public.crediter_repas_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today      DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_core_meals INTEGER;
BEGIN
  -- Le journal accepte l'historique, mais seule une entrée du jour donne
  -- de l'EXP et valide la journée.
  IF NEW.date <> v_today THEN
    RETURN NEW;
  END IF;

  PERFORM public.crediter_mission_aura(
    NEW.user_id, 'repas', 'day', v_today::text, 5, false
  );

  SELECT count(DISTINCT CASE
    WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
    WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
    WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
    ELSE NULL
  END)::integer
  INTO v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = NEW.user_id
    AND date = v_today;

  IF v_core_meals >= 3 THEN
    PERFORM public.crediter_mission_aura(
      NEW.user_id, 'nutrition_complete', 'day', v_today::text, 15, true
    );
  END IF;

  PERFORM public.evaluer_missions_aura(NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_repas_credit ON public.nutrition_logs;
CREATE TRIGGER aura_repas_credit
AFTER INSERT ON public.nutrition_logs
FOR EACH ROW EXECUTE FUNCTION public.crediter_repas_aura();


-- ════════════════════════════════════════════════════════════════════
-- 5 · LA PRÉSENCE
--
-- Elle n'incrémente plus la série : elle écrit la ligne du jour, crédite
-- la connexion, puis laisse `evaluer_missions_aura` DÉDUIRE la série.
-- Se connecter cinquante fois ne la fait donc plus bouger d'un cran.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marquer_presence_aura()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  UUID    := auth.uid();
  v_today DATE    := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_serie INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.daily_stats (user_id, date)
  VALUES (v_user, v_today)
  ON CONFLICT (user_id, date) DO NOTHING;

  PERFORM public.crediter_mission_aura(
    v_user, 'connexion', 'day', v_today::text, 5, false
  );

  v_serie := public.evaluer_missions_aura(v_user);

  RETURN jsonb_build_object(
    'date', v_today,
    'serie', v_serie,
    -- La journée est-elle déjà validée ? L'app en a besoin pour dire
    -- « fais une action pour continuer ta série » plutôt que de le
    -- deviner d'un compteur.
    'jourValide', EXISTS (
      SELECT 1 FROM public.aura_mission_credits
      WHERE user_id = v_user
        AND period_type = 'day'
        AND period_key = v_today::text
        AND mission_id IN ('seance', 'repas')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.marquer_presence_aura() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marquer_presence_aura() TO authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 6 · L'ACTIVATION PREMIUM EN COURS DE PÉRIODE
--
-- Si l'abonnement démarre alors que la condition est déjà remplie, la
-- récompense est émise maintenant. On ne reprend jamais les périodes
-- passées : le Premium commence à produire ses avantages aujourd'hui.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.crediter_activation_premium_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_premium BOOLEAN := COALESCE(OLD.is_premium, false) OR COALESCE(OLD.is_admin, false);
  v_is_premium  BOOLEAN := COALESCE(NEW.is_premium, false) OR COALESCE(NEW.is_admin, false);
  v_today       DATE    := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_day_sessions INTEGER;
  v_early        INTEGER;
  v_core_meals   INTEGER;
BEGIN
  IF v_was_premium OR NOT v_is_premium THEN
    RETURN NEW;
  END IF;

  SELECT count(*) FILTER (WHERE duration_minutes >= 5)::integer,
         count(*) FILTER (
           WHERE duration_minutes >= 5
             AND (started_at AT TIME ZONE 'Europe/Paris')::time < TIME '09:00'
         )::integer
  INTO v_day_sessions, v_early
  FROM public.workout_sessions
  WHERE user_id = NEW.id
    AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

  SELECT count(DISTINCT CASE
    WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
    WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
    WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
    ELSE NULL
  END)::integer
  INTO v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = NEW.id AND date = v_today;

  IF v_day_sessions >= 2 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'double_seance', 'day', v_today::text, 20, true);
  END IF;
  IF v_early >= 1 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'leve_tot', 'day', v_today::text, 20, true);
  END IF;
  IF v_core_meals >= 3 THEN
    PERFORM public.crediter_mission_aura(NEW.id, 'nutrition_complete', 'day', v_today::text, 15, true);
  END IF;

  -- Objectif accompli et Semaine régulière se déduisent : une seule
  -- définition, celle de `evaluer_missions_aura`.
  PERFORM public.evaluer_missions_aura(NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aura_activation_premium_credit ON public.profiles;
CREATE TRIGGER aura_activation_premium_credit
AFTER UPDATE OF is_premium, is_admin ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.crediter_activation_premium_aura();


-- ════════════════════════════════════════════════════════════════════
-- 7 · L'ÉTAT LU PAR L'APPLICATION
--
-- Une seule lecture, un seul objet. Les missions sont rendues À PLAT,
-- une entrée par identifiant : c'est l'app qui les regroupe selon son
-- catalogue (src/lib/aura.ts), pour que l'ordre d'affichage n'ait pas à
-- être tenu d'accord entre le SQL et le TypeScript.
--
-- `complete` = la condition est remplie · `earned` = la récompense est
-- au registre. Les deux diffèrent quand une mission Premium est remplie
-- par un compte gratuit : il voit sa progression, il ne touche rien.
-- ════════════════════════════════════════════════════════════════════

/* ⚠️ PASSÉE EN SECURITY DEFINER (elle était INVOKER). Elle appelle
   `serie_aura` et `jours_actifs_aura`, deux helpers volontairement fermés aux
   comptes connectés : en INVOKER elle n'aurait pas eu le droit de les
   appeler. Le garde-fou est la première ligne du corps : elle refuse tout
   `p_user` autre que soi, et c'est ce refus, pas la RLS, qui empêche de lire
   l'aura de quelqu'un d'autre. Ne jamais le retirer. */
CREATE OR REPLACE FUNCTION public.etat_missions_aura(p_user UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          TIMESTAMP := now() AT TIME ZONE 'Europe/Paris';
  v_today        DATE      := v_now::date;
  v_week         TEXT      := to_char(v_today, 'IYYY-"W"IW');
  v_week_start   DATE      := date_trunc('week', v_today::timestamp)::date;
  v_premium      BOOLEAN   := false;
  v_exp          INTEGER   := 10;
  v_credits      TEXT[]    := ARRAY[]::TEXT[];
  v_sessions     INTEGER   := 0;
  v_valid_today  INTEGER   := 0;
  v_early        INTEGER   := 0;
  v_meals        INTEGER   := 0;
  v_core_meals   INTEGER   := 0;
  v_actifs       INTEGER   := 0;
  v_serie        INTEGER   := 0;
  v_jour_valide  BOOLEAN   := false;
  v_connexion    BOOLEAN   := false;
  v_seance       BOOLEAN   := false;
  v_repas        BOOLEAN   := false;
  v_jours_total  INTEGER   := 0;
  v_seances_tot  INTEGER   := 0;
  v_repas_tot    INTEGER   := 0;
BEGIN
  IF p_user IS NULL OR p_user <> auth.uid() THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(is_premium, false) OR COALESCE(is_admin, false)
    INTO v_premium
  FROM public.profiles WHERE id = p_user;
  v_premium := COALESCE(v_premium, false);

  -- L'EXP totale : le socle de bienvenue plus la somme du registre.
  -- Exactement la même formule que `rangs_aura` et le cron de rappels.
  SELECT 10 + round(COALESCE(sum(points), 0))::integer,
         COALESCE(array_agg(mission_id) FILTER (
           WHERE (period_type = 'day' AND period_key = v_today::text)
              OR (period_type = 'week' AND period_key = v_week)
         ), ARRAY[]::TEXT[]),
         count(*) FILTER (WHERE mission_id = 'seance')::integer,
         count(*) FILTER (WHERE mission_id = 'repas')::integer,
         count(*) FILTER (WHERE mission_id = 'connexion')::integer
  INTO v_exp, v_credits, v_seances_tot, v_repas_tot, v_jours_total
  FROM public.aura_mission_credits
  WHERE user_id = p_user;

  v_connexion := 'connexion' = ANY(v_credits);
  v_seance    := 'seance' = ANY(v_credits);
  v_repas     := 'repas' = ANY(v_credits);
  v_jour_valide := v_seance OR v_repas;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE duration_minutes >= 5)::integer,
         count(*) FILTER (
           WHERE duration_minutes >= 5
             AND (started_at AT TIME ZONE 'Europe/Paris')::time < TIME '09:00'
         )::integer
  INTO v_sessions, v_valid_today, v_early
  FROM public.workout_sessions
  WHERE user_id = p_user
    AND (started_at AT TIME ZONE 'Europe/Paris')::date = v_today;

  SELECT count(*)::integer,
         count(DISTINCT CASE
           WHEN lower(meal_type) IN ('petit-dejeuner', 'petit-déjeuner', 'breakfast') THEN 'matin'
           WHEN lower(meal_type) IN ('dejeuner', 'déjeuner', 'lunch') THEN 'midi'
           WHEN lower(meal_type) IN ('diner', 'dîner', 'dinner') THEN 'soir'
           ELSE NULL
         END)::integer
  INTO v_meals, v_core_meals
  FROM public.nutrition_logs
  WHERE user_id = p_user AND date = v_today;

  SELECT COALESCE(array_length(
    public.jours_actifs_aura(p_user, v_week_start, v_week_start + 6), 1
  ), 0) INTO v_actifs;

  v_serie := public.serie_aura(p_user);

  RETURN jsonb_build_object(
    'version', 2,
    'exp', v_exp,
    'premium', v_premium,
    'serie', v_serie,
    'jourValide', v_jour_valide,
    'detail', jsonb_build_object(
      'seances', v_seances_tot,
      'repas', v_repas_tot,
      'jours', v_jours_total,
      'joursActifsSemaine', v_actifs,
      'streak', v_serie
    ),
    'missions', jsonb_build_object(
      'connexion', jsonb_build_object(
        'progress', CASE WHEN v_connexion THEN 1 ELSE 0 END, 'target', 1,
        'complete', v_connexion, 'earned', v_connexion),
      'seance', jsonb_build_object(
        'progress', LEAST(v_sessions, 1), 'target', 1,
        'complete', v_seance, 'earned', v_seance),
      'repas', jsonb_build_object(
        'progress', LEAST(v_meals, 1), 'target', 1,
        'complete', v_repas, 'earned', v_repas),
      'journee', jsonb_build_object(
        'progress', (CASE WHEN v_connexion THEN 1 ELSE 0 END)
                  + (CASE WHEN v_seance THEN 1 ELSE 0 END)
                  + (CASE WHEN v_repas THEN 1 ELSE 0 END),
        'target', 3,
        'complete', v_connexion AND v_seance AND v_repas,
        'earned', 'journee_complete' = ANY(v_credits)),
      'double', jsonb_build_object(
        'progress', LEAST(v_valid_today, 2), 'target', 2,
        'complete', v_valid_today >= 2, 'earned', 'double_seance' = ANY(v_credits)),
      'matin', jsonb_build_object(
        'progress', LEAST(v_early, 1), 'target', 1,
        'complete', v_early >= 1, 'earned', 'leve_tot' = ANY(v_credits)),
      'nutrition', jsonb_build_object(
        'progress', LEAST(v_core_meals, 3), 'target', 3,
        'complete', v_core_meals >= 3, 'earned', 'nutrition_complete' = ANY(v_credits)),
      'objectif', jsonb_build_object(
        'progress', (CASE WHEN v_seance THEN 1 ELSE 0 END)
                  + (CASE WHEN v_repas THEN 1 ELSE 0 END),
        'target', 2,
        'complete', v_seance AND v_repas,
        'earned', 'objectif_accompli' = ANY(v_credits)),
      'semaineActive', jsonb_build_object(
        'progress', LEAST(v_actifs, 3), 'target', 3,
        'complete', v_actifs >= 3, 'earned', 'semaine_active' = ANY(v_credits)),
      'semaineReguliere', jsonb_build_object(
        'progress', LEAST(v_actifs, 5), 'target', 5,
        'complete', v_actifs >= 5, 'earned', 'semaine_reguliere' = ANY(v_credits)),
      'semaineParfaite', jsonb_build_object(
        'progress', LEAST(v_actifs, 7), 'target', 7,
        'complete', v_actifs >= 7, 'earned', 'semaine_parfaite' = ANY(v_credits))
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.etat_missions_aura(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.etat_missions_aura(UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════════════
-- 8 · RATTRAPAGE DE LA PÉRIODE EN COURS
--
-- Les nouvelles missions n'existaient pas ce matin. Sans ce bloc, une
-- personne ayant déjà fait sa séance ET son repas aujourd'hui verrait
-- « Journée complète » encore à faire alors qu'elle l'a remplie.
--
-- On ne rattrape QUE le jour et la semaine en cours : réécrire
-- l'historique reviendrait à recalculer une EXP déjà annoncée.
-- Idempotent : `ON CONFLICT DO NOTHING` dans `crediter_mission_aura`.
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user UUID;
BEGIN
  FOR v_user IN
    SELECT DISTINCT user_id
    FROM public.aura_mission_credits
    WHERE period_type = 'day'
      AND period_key >= (date_trunc('week', ((now() AT TIME ZONE 'Europe/Paris')::date)::timestamp)::date)::text
  LOOP
    PERFORM public.evaluer_missions_aura(v_user);
  END LOOP;
END;
$$;

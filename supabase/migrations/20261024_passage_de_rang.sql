-- ════════════════════════════════════════════════════════════════════
-- LE PASSAGE DE RANG (Louis, 2026-10-24, maquette « Le passage de rang »,
-- version 2) : les JOKERS de série et les CARTES de rang.
--
-- À coller APRÈS 20261017_mouvement_du_jour.sql et 20261014_serie_connexion.sql.
-- Rejouable : tout est CREATE OR REPLACE.
--
-- ① LES JOKERS. Un jour où l'on n'a même pas ouvert Vaiiya, un joker se pose
--    et la série continue. Le rang les recharge le 1er du mois : 1 à Argent,
--    2 à Or, 3 dès Platine. Ceux qui restent ne s'accumulent pas.
--
--    ⭐ RIEN NE S'ÉCRIT : le joker se DÉRIVE, comme la série. On relit les
--    jours de la série dans l'ordre, et chaque jour sans rien d'une série
--    encore en vie prend un joker tant que son mois en a (au rang qu'on
--    avait CE jour-là). C'est stable : un jour passé ne change plus jamais.
--
--    ⚠️ UN JOKER GARDE LA SÉRIE ET RIEN D'AUTRE : le jour couvert ne compte
--    pas dans le nombre de jours, ne rapporte pas d'EXP et ne valide pas la
--    journée. `jours_actifs_aura` (les missions de la semaine) et
--    `badges_aura` (la plus longue série validée) ne changent pas.
--    Seule la connexion du lendemain double toujours : la série continue.
--
--    ⚠️ AUJOURD'HUI N'EST JAMAIS COUVERT : la journée n'est pas finie.
--    ⚠️ PERSONNE NE BOUGE RÉTROACTIVEMENT : le premier jour couvrable est le
--    24 octobre 2026, jour de la mise en ligne.
--
-- ② LES CARTES. `cartes_rang()` rend, pour le compte connecté, la date où
--    l'EXP a passé chaque seuil, les séances faites jusque-là et les jours
--    depuis l'inscription. Lecture seule.
-- ════════════════════════════════════════════════════════════════════

-- Les jokers d'un mois, selon l'EXP : la même règle que `JOKERS_PAR_MOIS`
-- (src/lib/aura.ts) sur les seuils de `RANGS`. `check:rangs` vérifie les deux.
CREATE OR REPLACE FUNCTION public.jokers_par_mois_aura(p_exp numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_exp >= 800 THEN 3   -- Platine, Diamant, Éternel
    WHEN p_exp >= 350 THEN 2   -- Or
    WHEN p_exp >= 100 THEN 1   -- Argent
    ELSE 0                     -- Bronze
  END;
$$;

-- La série, ses jokers, et ce qu'il reste au mois de `p_jour`.
CREATE OR REPLACE FUNCTION public.serie_jokers_aura(p_user uuid, p_jour date)
RETURNS TABLE(serie integer, couverts date[], par_mois integer, utilises integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_debut    CONSTANT date := DATE '2026-10-24';
  v_bas      date;
  v_actifs   date[];
  v_jour     date;
  v_vivant   boolean;
  v_mois     date := NULL;
  v_util     integer := 0;
  v_couverts date[] := ARRAY[]::date[];
  v_exp      numeric;
  v_serie    integer := 0;
BEGIN
  IF p_user IS NULL OR p_jour IS NULL THEN
    RETURN QUERY SELECT 0, ARRAY[]::date[], 0, 0;
    RETURN;
  END IF;

  -- Les jours de la série : une connexion, une séance ou un repas.
  v_bas := LEAST(v_debut - 1, p_jour - 400);
  SELECT COALESCE(array_agg(DISTINCT c.period_key::date), ARRAY[]::date[])
    INTO v_actifs
    FROM public.aura_mission_credits AS c
   WHERE c.user_id = p_user
     AND c.mission_id IN ('connexion', 'seance', 'repas')
     AND c.period_type = 'day'
     AND c.period_key >= v_bas::text
     AND c.period_key <= p_jour::text;

  -- Les jokers, jour après jour, du premier jour couvrable à la veille.
  v_vivant := (v_debut - 1) = ANY(v_actifs);
  v_jour := v_debut;
  WHILE v_jour < p_jour LOOP
    IF v_jour = ANY(v_actifs) THEN
      v_vivant := true;
    ELSIF v_vivant THEN
      IF v_mois IS DISTINCT FROM date_trunc('month', v_jour)::date THEN
        v_mois := date_trunc('month', v_jour)::date;
        v_util := 0;
      END IF;
      -- Le rang qu'on avait CE jour-là : l'EXP gagnée jusqu'au soir.
      SELECT 10 + COALESCE(sum(c.points), 0)
        INTO v_exp
        FROM public.aura_mission_credits AS c
       WHERE c.user_id = p_user
         AND (c.earned_at AT TIME ZONE 'Europe/Paris')::date <= v_jour;
      IF v_util < public.jokers_par_mois_aura(v_exp) THEN
        v_util := v_util + 1;
        v_couverts := v_couverts || v_jour;
      ELSE
        v_vivant := false;
      END IF;
    END IF;
    v_jour := v_jour + 1;
  END LOOP;

  -- La série : depuis aujourd'hui s'il compte déjà, sinon depuis hier (une
  -- série tient jusqu'à minuit). Un jour couvert la garde sans compter.
  v_jour := CASE WHEN p_jour = ANY(v_actifs) THEN p_jour ELSE p_jour - 1 END;
  WHILE v_jour >= v_bas LOOP
    IF v_jour = ANY(v_actifs) THEN
      v_serie := v_serie + 1;
    ELSIF NOT (v_jour = ANY(v_couverts)) THEN
      EXIT;
    END IF;
    v_jour := v_jour - 1;
  END LOOP;

  SELECT 10 + COALESCE(sum(c.points), 0)
    INTO v_exp
    FROM public.aura_mission_credits AS c
   WHERE c.user_id = p_user;

  RETURN QUERY SELECT
    v_serie,
    v_couverts,
    public.jokers_par_mois_aura(v_exp),
    (SELECT count(*)::integer FROM unnest(v_couverts) AS d
      WHERE date_trunc('month', d) = date_trunc('month', p_jour::timestamp));
END;
$function$;

-- La série du produit, jokers compris. Même signature, même autorité.
CREATE OR REPLACE FUNCTION public.serie_aura(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (
    SELECT j.serie
      FROM public.serie_jokers_aura(p_user, (now() AT TIME ZONE 'Europe/Paris')::date) AS j
  );
END;
$function$;

-- La connexion double le lendemain d'une connexion, ou d'un jour couvert :
-- le joker a gardé la série, la suite continue.
CREATE OR REPLACE FUNCTION public.exp_connexion_aura(p_user uuid, p_jour date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.aura_mission_credits
    WHERE user_id = p_user
      AND mission_id = 'connexion'
      AND period_type = 'day'
      AND period_key = (p_jour - 1)::text
  ) OR (p_jour - 1) = ANY (
    COALESCE((SELECT j.couverts FROM public.serie_jokers_aura(p_user, p_jour) AS j), ARRAY[]::date[])
  ) THEN 20 ELSE 10 END::numeric;
$function$;

-- L'état des missions : la même réponse qu'avant (version 2), plus `jokers`.
CREATE OR REPLACE FUNCTION public.etat_missions_aura(p_user uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_couverts     DATE[]    := ARRAY[]::DATE[];
  v_par_mois     INTEGER   := 0;
  v_utilises     INTEGER   := 0;
  v_jour_valide  BOOLEAN   := false;
  v_connexion    BOOLEAN   := false;
  v_seance       BOOLEAN   := false;
  v_repas        BOOLEAN   := false;
  v_mouvement    BOOLEAN   := false;
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
  v_mouvement := 'mouvement_du_jour' = ANY(v_credits);
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

  -- La série et ses jokers, en une seule lecture.
  SELECT j.serie, j.couverts, j.par_mois, j.utilises
    INTO v_serie, v_couverts, v_par_mois, v_utilises
    FROM public.serie_jokers_aura(p_user, v_today) AS j;
  v_serie := COALESCE(v_serie, 0);

  RETURN jsonb_build_object(
    'version', 2,
    'exp', v_exp,
    'premium', v_premium,
    'serie', v_serie,
    'jourValide', v_jour_valide,
    'jokers', jsonb_build_object(
      'parMois', COALESCE(v_par_mois, 0),
      'utilises', COALESCE(v_utilises, 0),
      'restants', GREATEST(0, COALESCE(v_par_mois, 0) - COALESCE(v_utilises, 0)),
      'hierCouvert', (v_today - 1) = ANY(COALESCE(v_couverts, ARRAY[]::DATE[])),
      'couverts', to_jsonb(COALESCE(v_couverts, ARRAY[]::DATE[]))
    ),
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
      'mouvement', jsonb_build_object(
        'progress', CASE WHEN v_mouvement THEN 1 ELSE 0 END, 'target', 1,
        'complete', v_mouvement, 'earned', v_mouvement),
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
$function$;

-- ② Les cartes du compte connecté : la date où l'EXP a passé chaque seuil
-- (les seuils de `RANGS`), les séances commencées jusque-là, et les jours
-- depuis l'inscription (le premier compte pour un).
CREATE OR REPLACE FUNCTION public.cartes_rang()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user    uuid := auth.uid();
  v_inscrit date;
  v_numero  integer;
  v_cartes  jsonb := '[]'::jsonb;
  r         record;
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (p.created_at AT TIME ZONE 'Europe/Paris')::date, p.member_number
    INTO v_inscrit, v_numero
    FROM public.profiles AS p
   WHERE p.id = v_user;

  FOR r IN
    WITH seuils(rang, min, ordre) AS (
      VALUES ('argent', 100, 2), ('or', 350, 3), ('platine', 800, 4), ('diamant', 1600, 5), ('eternel', 3000, 6)
    ),
    cumul AS (
      SELECT c.earned_at,
             10 + sum(c.points) OVER (ORDER BY c.earned_at, c.id ROWS UNBOUNDED PRECEDING) AS exp
        FROM public.aura_mission_credits AS c
       WHERE c.user_id = v_user
    )
    SELECT s.rang, s.ordre, (SELECT min(k.earned_at) FROM cumul AS k WHERE k.exp >= s.min) AS atteint
      FROM seuils AS s
     ORDER BY s.ordre
  LOOP
    CONTINUE WHEN r.atteint IS NULL;
    v_cartes := v_cartes || jsonb_build_array(jsonb_build_object(
      'rang', r.rang,
      'atteintLe', (r.atteint AT TIME ZONE 'Europe/Paris')::date,
      'seances', (SELECT count(*) FROM public.workout_sessions AS w
                   WHERE w.user_id = v_user AND w.started_at <= r.atteint),
      'jours', CASE WHEN v_inscrit IS NULL THEN NULL
                    ELSE ((r.atteint AT TIME ZONE 'Europe/Paris')::date - v_inscrit) + 1 END
    ));
  END LOOP;

  RETURN jsonb_build_object('numero', v_numero, 'inscritLe', v_inscrit, 'cartes', v_cartes);
END;
$function$;

-- Les droits : les fonctions internes ne s'appellent pas depuis le navigateur
-- (elles prennent un `p_user` et diraient les jours de quelqu'un d'autre).
REVOKE ALL ON FUNCTION public.jokers_par_mois_aura(numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.jokers_par_mois_aura(numeric) TO service_role;
REVOKE ALL ON FUNCTION public.serie_jokers_aura(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.serie_jokers_aura(uuid, date) TO service_role;
REVOKE ALL ON FUNCTION public.cartes_rang() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cartes_rang() TO authenticated, service_role;

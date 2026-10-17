-- ════════════════════════════════════════════════════════════════════
-- LA CONNEXION DOUBLE QUAND ON REVIENT LE LENDEMAIN (Louis, 2026-10-17)
--
-- Jour 1 d'une suite : +10 EXP. Chaque jour suivant d'affilée : +20.
-- Un jour sauté remet la suite à zéro, donc le retour vaut de nouveau 10.
--   7 jours d'affilée        → 10 + 6 × 20 = 130 EXP
--   lun mar mer · jeu sauté · ven → 10 + 20 + 20 + 0 + 10 = 60 EXP
--
-- ⚠️ Louis lève ici la règle du 2026-08-21 « aucune série qui multiplie
-- l'EXP », pour la seule mission de connexion. Le registre n'est jamais
-- réécrit : les connexions passées gardent leurs 5 EXP.
--
-- À coller APRÈS 20260821_economie_exp_v2.sql. Rejouable.
-- ════════════════════════════════════════════════════════════════════

-- Combien vaut la connexion de ce jour-là : 20 si la veille porte déjà
-- une connexion, 10 sinon. La veille se lit dans le registre, jamais
-- dans un compteur.
CREATE OR REPLACE FUNCTION public.exp_connexion_aura(p_user UUID, p_jour DATE)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM public.aura_mission_credits
    WHERE user_id = p_user
      AND mission_id = 'connexion'
      AND period_type = 'day'
      AND period_key = (p_jour - 1)::text
  ) THEN 20 ELSE 10 END::numeric;
$$;

REVOKE ALL ON FUNCTION public.exp_connexion_aura(UUID, DATE) FROM PUBLIC, anon, authenticated;


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
    NEW.user_id, 'connexion', 'day', v_today::text,
    public.exp_connexion_aura(NEW.user_id, v_today), false
  );

  PERFORM public.evaluer_missions_aura(NEW.user_id);

  RETURN NEW;
END;
$$;


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
    v_user, 'connexion', 'day', v_today::text,
    public.exp_connexion_aura(v_user, v_today), false
  );

  v_serie := public.evaluer_missions_aura(v_user);

  RETURN jsonb_build_object(
    'date', v_today,
    'serie', v_serie,
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

-- ═══════════════════════════════════════════════════════════════════════
-- LA SÉRIE COMPTE LA VENUE (Louis, 2026-10-14)
--
-- Depuis le 2026-08-21 seules une séance ou un repas noté tenaient la
-- série : quelqu'un qui ouvrait Vaiiya tous les jours restait à 0, et
-- l'accueil l'affichait à 1 en boucle. Louis tranche : venir sur Vaiiya
-- un jour suffit à tenir la série.
--
-- ⚠️ SEULE LA SÉRIE CHANGE. `jours_actifs_aura` (séance OU repas) reste
-- tel quel, donc les missions de la semaine et leur EXP gardent leur
-- règle : ouvrir l'app trois jours ne rapporte pas « Semaine active ».
-- La série reste DÉRIVÉE du registre, jamais incrémentée.
-- Rejouable.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.serie_aura(p_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today  DATE := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_jours  DATE[];
  v_jour   DATE;
  v_serie  INTEGER := 0;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT c.period_key::date), ARRAY[]::DATE[])
    INTO v_jours
    FROM public.aura_mission_credits AS c
   WHERE c.user_id = p_user
     AND c.mission_id IN ('connexion', 'seance', 'repas')
     AND c.period_type = 'day'
     AND c.period_key >= (v_today - 400)::text
     AND c.period_key <= v_today::text;

  IF array_length(v_jours, 1) IS NULL THEN
    RETURN 0;
  END IF;

  v_jour := CASE WHEN v_today = ANY(v_jours) THEN v_today ELSE v_today - 1 END;

  WHILE v_jour = ANY(v_jours) LOOP
    v_serie := v_serie + 1;
    v_jour  := v_jour - 1;
  END LOOP;

  RETURN v_serie;
END;
$function$;

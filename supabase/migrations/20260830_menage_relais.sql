-- ═══════════════════════════════════════════════════════════════
--  Le ménage du relais : une seule table porte les récompenses.
--  2026-08-30, à coller APRÈS 20260830_relais.sql.
--  Rejouable sans risque.
--
--  `challenge_rewards` recevait `poster-<serie>` pour les deux
--  membres à chaque affiche dévoilée. AUCUNE ligne de code ne l'a
--  jamais lue. `profile_badges` porte exactement la même chose, et
--  c'est celle-là que les écrans utilisent.
--
--  Une information qui existe à deux endroits finit par diverger :
--  c'est le problème déjà réglé sur l'EXP le 21 août. Une seule
--  source, et c'est `profile_badges`.
--
--  ⚠️ ON NE JETTE RIEN. La toute première version de
--  `valider_action_defi` (21 juillet) écrivait `challenge_rewards`
--  et PAS `profile_badges` : une victoire de cette époque n'existe
--  donc que dans la table qu'on supprime. L'étape 1 la recopie
--  avant que l'étape 3 ne la supprime.
-- ═══════════════════════════════════════════════════════════════


-- ── 1. Recopier ce que la table portait encore ───────────────────
--  `poster-<serie>` devient les deux badges que la version d'août
--  aurait accordés : celui de la série, et le tout premier relais.
DO $migration$
BEGIN
  IF to_regclass('public.challenge_rewards') IS NOT NULL THEN
    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT r.user_id, 'serie-' || substring(r.reward_slug FROM 8)
    FROM public.challenge_rewards r
    WHERE r.reward_slug LIKE 'poster-%'
    ON CONFLICT DO NOTHING;

    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT DISTINCT r.user_id, 'premier-relais'
    FROM public.challenge_rewards r
    WHERE r.reward_slug LIKE 'poster-%'
    ON CONFLICT DO NOTHING;
  END IF;
END;
$migration$;


-- ── 2. Le maillon n'écrit plus qu'à un seul endroit ──────────────
--  Copie conforme de la version du 30 août, moins l'écriture de
--  `challenge_rewards`. Aucune règle de validation ne change.
CREATE OR REPLACE FUNCTION public.valider_action_defi(p_run_id UUID, p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user    UUID := auth.uid();
  v_run     public.challenge_runs%ROWTYPE;
  v_session public.workout_sessions%ROWTYPE;
  v_jour    DATE := CURRENT_DATE;
  v_faits   INT;
  v_pseudo  TEXT;
  v_reussi  BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT * INTO v_run FROM public.challenge_runs WHERE id = p_run_id;
  IF NOT FOUND OR v_run.statut <> 'en_cours' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_inactif');
  END IF;

  IF NOT public.est_membre_run(p_run_id, v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  IF v_jour < v_run.starts_on OR v_jour > v_run.ends_on THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'hors_fenetre');
  END IF;

  SELECT * INTO v_session FROM public.workout_sessions
  WHERE id = p_session_id AND user_id = v_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'seance_introuvable');
  END IF;
  IF v_session.duration_minutes < 10 THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'trop_courte');
  END IF;
  IF v_session.started_at < NOW() - INTERVAL '3 hours' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'seance_trop_ancienne');
  END IF;

  IF EXISTS (SELECT 1 FROM public.challenge_actions
             WHERE run_id = p_run_id AND jour = v_jour) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'jour_deja_franchi');
  END IF;

  -- RÈGLE : pas deux jours de suite par la même personne.
  IF EXISTS (SELECT 1 FROM public.challenge_actions
             WHERE run_id = p_run_id AND jour = v_jour - 1 AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deux_jours_de_suite');
  END IF;

  INSERT INTO public.challenge_actions (run_id, user_id, jour, workout_session_id)
  VALUES (p_run_id, v_user, v_jour, p_session_id);

  SELECT COUNT(*) INTO v_faits FROM public.challenge_actions WHERE run_id = p_run_id;
  v_reussi := v_faits >= v_run.target_days;

  SELECT pseudo INTO v_pseudo FROM public.profiles WHERE id = v_user;

  IF v_run.conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (
      v_run.conversation_id, NULL,
      CASE WHEN v_reussi
        THEN 'L''affiche est complète. ' || COALESCE(v_pseudo,'Quelqu''un') || ' a franchi le dernier maillon.'
        ELSE COALESCE(v_pseudo,'Quelqu''un') || ' a franchi le maillon du jour · ' ||
             v_faits || ' sur ' || v_run.target_days || '.'
      END,
      'systeme'
    );
  END IF;

  IF v_reussi THEN
    UPDATE public.challenge_runs
       SET statut = 'reussi', fini_le = NOW()
     WHERE id = p_run_id;

    -- Une seule source de récompense : la série accomplie, et le tout
    -- premier relais. `challenge_rewards` n'est plus écrite.
    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT m.user_id, 'serie-' || v_run.serie
    FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;

    INSERT INTO public.profile_badges (user_id, badge_slug)
    SELECT m.user_id, 'premier-relais'
    FROM public.challenge_run_members m WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'jours_faits', v_faits,
                            'objectif', v_run.target_days,
                            'serie', v_run.serie,
                            'reussi', v_reussi);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.valider_action_defi(UUID, UUID) TO authenticated;


-- ── 3. La table part ─────────────────────────────────────────────
--  Une refonte supprime l'ancien dans le même commit : c'est la
--  leçon des huit composants de l'ancien accueil, qui ont survécu
--  trois semaines parce qu'ils compilaient encore. Une table laissée
--  en place est une invitation à la rebrancher un jour.
DROP TABLE IF EXISTS public.challenge_rewards;

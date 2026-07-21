-- ════════════════════════════════════════════════════════════════
--  Annuler un relais — à tout moment, par n'importe lequel des deux.
--
--  Pourquoi n'importe lequel : le cas réel, c'est l'équipier qui ne
--  répond plus. Exiger l'accord des deux ferait de l'autre l'otage
--  de quelqu'un qui est parti. Et il n'y a rien à détruire : la
--  récompense est cosmétique et l'affiche reste dans le fil.
--
--  À coller APRÈS 20260721_messagerie_v2.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Le statut « annule » ──────────────────────────────────────
ALTER TABLE public.challenge_runs
  DROP CONSTRAINT IF EXISTS challenge_runs_statut_check;

ALTER TABLE public.challenge_runs
  ADD CONSTRAINT challenge_runs_statut_check
  CHECK (statut IN ('inscription','en_cours','reussi','termine','annule'));


-- ── 2. annuler_relais(run) ───────────────────────────────────────
--  Rend { ok:true } ou { ok:false, raison }.
--
--  Effet de bord voulu : un run annulé sort de ('inscription',
--  'en_cours'), donc `lancer_relais` laisse aussitôt repartir la
--  paire, et `rejoindre_defi` refuse le vieux lien d'invitation
--  (il exige le statut 'inscription'). Rien d'autre à nettoyer.
CREATE OR REPLACE FUNCTION public.annuler_relais(p_run UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_run  RECORD;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT id, statut, conversation_id INTO v_run
  FROM public.challenge_runs WHERE id = p_run;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'introuvable');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_run_members
    WHERE run_id = p_run AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'pas_membre');
  END IF;

  -- Un relais gagné ne s'annule pas : l'affiche est à eux.
  IF v_run.statut NOT IN ('inscription','en_cours') THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deja_fini');
  END IF;

  UPDATE public.challenge_runs SET statut = 'annule' WHERE id = p_run;

  -- On ne nomme JAMAIS celui qui a arrêté, et on ne reproche rien.
  IF v_run.conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (conversation_id, user_id, contenu, type)
    VALUES (v_run.conversation_id, NULL,
            'Le relais s''arrête ici. Vous pouvez en relancer un quand vous voulez.',
            'systeme');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.annuler_relais(UUID) TO authenticated;

-- ============================================================
-- Défi duo « relais » — boucle minimale
-- Invitation + un seul défi codé en dur, en duo.
-- Règle : 4 jours validés sur 7, jamais 2 jours de suite
--         par la même personne.
--
-- ⚠️ À COLLER À LA MAIN dans le SQL Editor Supabase.
--    Les migrations du repo ne s'appliquent pas toutes seules.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Invitations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invites (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT        NOT NULL UNIQUE,
  inviter_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id      UUID,                                  -- FK ajoutée plus bas
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days'
);

CREATE INDEX IF NOT EXISTS invites_code_idx    ON public.invites(code);
CREATE INDEX IF NOT EXISTS invites_inviter_idx ON public.invites(inviter_id);

-- ------------------------------------------------------------
-- 2. Le défi (une partie = un run)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenge_runs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_slug TEXT        NOT NULL DEFAULT 'relais-duo',
  statut         TEXT        NOT NULL DEFAULT 'inscription'
                             CHECK (statut IN ('inscription','en_cours','reussi','termine')),
  target_days    INT         NOT NULL DEFAULT 4,     -- 4 jours sur 7
  window_days    INT         NOT NULL DEFAULT 7,
  max_membres    INT         NOT NULL DEFAULT 2,
  serie          TEXT        NOT NULL DEFAULT 'sillage',  -- série d'affiches
  starts_on      DATE,
  ends_on        DATE,
  created_by     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rejeu : les colonnes ajoutées après coup
ALTER TABLE public.challenge_runs ADD COLUMN IF NOT EXISTS max_membres INT  NOT NULL DEFAULT 2;
ALTER TABLE public.challenge_runs ADD COLUMN IF NOT EXISTS serie       TEXT NOT NULL DEFAULT 'sillage';

ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_run_id_fkey;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_run_id_fkey
  FOREIGN KEY (run_id) REFERENCES public.challenge_runs(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.challenge_run_members (
  run_id     UUID        NOT NULL REFERENCES public.challenge_runs(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, user_id)
);

CREATE INDEX IF NOT EXISTS crm_user_idx ON public.challenge_run_members(user_id);

-- Une action = un jour de la chaîne, franchi par une personne.
-- UNIQUE(run_id, jour) : un seul maillon par jour, c'est un relais.
CREATE TABLE IF NOT EXISTS public.challenge_actions (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id             UUID        NOT NULL REFERENCES public.challenge_runs(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jour               DATE        NOT NULL,
  workout_session_id UUID        REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, jour)
);

CREATE INDEX IF NOT EXISTS ca_run_idx ON public.challenge_actions(run_id, jour DESC);

-- Récompense cosmétique (fond de poster réutilisable, badge).
CREATE TABLE IF NOT EXISTS public.challenge_rewards (
  run_id       UUID        NOT NULL REFERENCES public.challenge_runs(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_slug  TEXT        NOT NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (run_id, user_id, reward_slug)
);

-- ------------------------------------------------------------
-- 3. Anti-récursion RLS
--    Une policy sur challenge_run_members qui interroge
--    challenge_run_members provoque la récursion infinie déjà
--    rencontrée avec la saison (20260719_saison_rls_recursion_fix).
--    SECURITY DEFINER coupe la boucle.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.est_membre_run(p_run_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_run_members
    WHERE run_id = p_run_id AND user_id = p_user_id
  );
$$;

-- ------------------------------------------------------------
-- 4. RLS
--    NB : « CREATE POLICY IF NOT EXISTS » n'existe pas en
--    PostgreSQL. On utilise DROP + CREATE.
-- ------------------------------------------------------------
ALTER TABLE public.invites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_run_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_actions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_rewards     ENABLE ROW LEVEL SECURITY;

-- invites : l'inviteur gère les siennes. La page publique
-- /rejoindre/[code] ne lit PAS cette table directement, elle
-- passe par la RPC apercu_invitation() plus bas.
DROP POLICY IF EXISTS "invites gerees par inviteur" ON public.invites;
CREATE POLICY "invites gerees par inviteur"
  ON public.invites FOR ALL
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "runs visibles par membres" ON public.challenge_runs;
CREATE POLICY "runs visibles par membres"
  ON public.challenge_runs FOR SELECT
  USING (public.est_membre_run(id, auth.uid()));

DROP POLICY IF EXISTS "runs crees par soi" ON public.challenge_runs;
CREATE POLICY "runs crees par soi"
  ON public.challenge_runs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "membres visibles entre membres" ON public.challenge_run_members;
CREATE POLICY "membres visibles entre membres"
  ON public.challenge_run_members FOR SELECT
  USING (public.est_membre_run(run_id, auth.uid()));

DROP POLICY IF EXISTS "rejoindre soi-meme" ON public.challenge_run_members;
CREATE POLICY "rejoindre soi-meme"
  ON public.challenge_run_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "actions visibles par membres" ON public.challenge_actions;
CREATE POLICY "actions visibles par membres"
  ON public.challenge_actions FOR SELECT
  USING (public.est_membre_run(run_id, auth.uid()));

-- Aucune policy INSERT sur challenge_actions : le client ne peut
-- rien écrire. Tout passe par valider_action_defi().

DROP POLICY IF EXISTS "recompenses visibles par membres" ON public.challenge_rewards;
CREATE POLICY "recompenses visibles par membres"
  ON public.challenge_rewards FOR SELECT
  USING (public.est_membre_run(run_id, auth.uid()));

-- ------------------------------------------------------------
-- 5. Aperçu public d'une invitation
--    Renvoie le strict minimum affiché sur /rejoindre/[code] :
--    prénom + avatar de l'inviteur. Jamais la table brute.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apercu_invitation(p_code TEXT)
RETURNS TABLE (
  valide         BOOLEAN,
  inviter_nom    TEXT,
  inviter_avatar TEXT,
  run_id         UUID,
  complet        BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    (i.id IS NOT NULL AND i.expires_at > NOW()),
    COALESCE(p.pseudo, 'Quelqu''un'),
    p.avatar_url,
    i.run_id,
    (SELECT COUNT(*) FROM public.challenge_run_members m WHERE m.run_id = i.run_id)
      >= COALESCE(r.max_membres, 2)
  FROM public.invites i
  JOIN public.profiles p       ON p.id = i.inviter_id
  LEFT JOIN public.challenge_runs r ON r.id = i.run_id
  WHERE i.code = p_code;
$$;

GRANT EXECUTE ON FUNCTION public.apercu_invitation(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 6. Créer un défi + son invitation, d'un bloc
--    Le code est tiré ici : le client n'a pas à gérer les
--    collisions d'unicité.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creer_defi_duo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   UUID := auth.uid();
  v_run    UUID;
  v_code   TEXT;
  v_essais INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  -- Un seul défi vivant à la fois par personne.
  IF EXISTS (
    SELECT 1 FROM public.challenge_run_members m
    JOIN public.challenge_runs r ON r.id = m.run_id
    WHERE m.user_id = v_user AND r.statut IN ('inscription','en_cours')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_en_cours');
  END IF;

  INSERT INTO public.challenge_runs (created_by) VALUES (v_user) RETURNING id INTO v_run;
  INSERT INTO public.challenge_run_members (run_id, user_id) VALUES (v_run, v_user);

  LOOP
    v_essais := v_essais + 1;
    -- 8 caractères, sans les ambigus (0/O, 1/I/L)
    v_code := UPPER(
      TRANSLATE(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8), 'abcdef', 'GHJKMN')
    );
    BEGIN
      INSERT INTO public.invites (code, inviter_id, run_id) VALUES (v_code, v_user, v_run);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_essais >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run, 'code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_defi_duo() TO authenticated;

-- ------------------------------------------------------------
-- 7. Rejoindre un défi par son code
--    C'est ici que le défi DÉMARRE : dès que l'équipe est
--    complète, la fenêtre de 7 jours s'ouvre. Le client n'a
--    aucune policy UPDATE sur challenge_runs, exprès.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rejoindre_defi(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_invite  public.invites%ROWTYPE;
  v_run     public.challenge_runs%ROWTYPE;
  v_membres INT;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_connecte');
  END IF;

  SELECT * INTO v_invite FROM public.invites WHERE code = p_code;
  IF NOT FOUND OR v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'invitation_invalide');
  END IF;

  SELECT * INTO v_run FROM public.challenge_runs WHERE id = v_invite.run_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'invitation_invalide');
  END IF;

  -- Déjà dedans : on renvoie ok, la page mène au défi.
  IF public.est_membre_run(v_run.id, v_user) THEN
    RETURN jsonb_build_object('ok', true, 'run_id', v_run.id, 'deja_membre', true);
  END IF;

  IF v_run.statut <> 'inscription' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'defi_deja_lance');
  END IF;

  SELECT COUNT(*) INTO v_membres FROM public.challenge_run_members WHERE run_id = v_run.id;
  IF v_membres >= v_run.max_membres THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'equipe_complete');
  END IF;

  INSERT INTO public.challenge_run_members (run_id, user_id) VALUES (v_run.id, v_user);
  v_membres := v_membres + 1;

  -- Équipe au complet → le relais démarre aujourd'hui.
  IF v_membres >= v_run.max_membres THEN
    UPDATE public.challenge_runs
    SET statut    = 'en_cours',
        starts_on = CURRENT_DATE,
        ends_on   = CURRENT_DATE + (window_days - 1)
    WHERE id = v_run.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'run_id', v_run.id, 'lance', v_membres >= v_run.max_membres);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rejoindre_defi(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 8. Validation d'un maillon
--    Appelée depuis WorkoutGuideModal, à l'endroit exact où la
--    séance est enregistrée (phase === "done").
--    Toutes les règles du défi vivent ici, côté serveur.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.valider_action_defi(
  p_run_id  UUID,
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      UUID := auth.uid();
  v_run       public.challenge_runs%ROWTYPE;
  v_session   public.workout_sessions%ROWTYPE;
  v_jour      DATE := CURRENT_DATE;
  v_faits     INT;
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

  -- La séance doit t'appartenir, durer au moins 10 minutes,
  -- et venir d'être terminée.
  SELECT * INTO v_session
  FROM public.workout_sessions
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

  -- Le jour est peut-être déjà franchi par l'équipier.
  IF EXISTS (SELECT 1 FROM public.challenge_actions
             WHERE run_id = p_run_id AND jour = v_jour) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'jour_deja_franchi');
  END IF;

  -- RÈGLE : pas deux jours de suite par la même personne.
  IF EXISTS (SELECT 1 FROM public.challenge_actions
             WHERE run_id = p_run_id
               AND jour = v_jour - 1
               AND user_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deux_jours_de_suite');
  END IF;

  INSERT INTO public.challenge_actions (run_id, user_id, jour, workout_session_id)
  VALUES (p_run_id, v_user, v_jour, p_session_id);

  SELECT COUNT(*) INTO v_faits
  FROM public.challenge_actions WHERE run_id = p_run_id;

  -- Objectif atteint : récompense pour TOUS les membres.
  -- Personne n'est nommé, personne n'est comparé.
  IF v_faits >= v_run.target_days THEN
    UPDATE public.challenge_runs SET statut = 'reussi' WHERE id = p_run_id;

    INSERT INTO public.challenge_rewards (run_id, user_id, reward_slug)
    SELECT p_run_id, m.user_id, 'poster-' || v_run.serie
    FROM public.challenge_run_members m
    WHERE m.run_id = p_run_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'jours_faits', v_faits,
    'objectif', v_run.target_days,
    'reussi', v_faits >= v_run.target_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.valider_action_defi(UUID, UUID) TO authenticated;

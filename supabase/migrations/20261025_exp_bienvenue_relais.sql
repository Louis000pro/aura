-- ════════════════════════════════════════════════════════════════════
-- L'EXP DE BIENVENUE À 50, ET LE RELAIS GAGNÉ QUI RAPPORTE (Louis, 2026-10-25)
--
-- À coller APRÈS 20261024_passage_de_rang.sql. Rejouable.
--
-- ① LE SOCLE PASSE DE 10 À 50 EXP. Louis : « dès que quelqu'un s'inscrit,
--    il a 50 XP, et le Bronze se passe dès qu'on a fait une séance et
--    noté un repas ». Le compte du premier jour : 50 + connexion 10 +
--    séance 30 + repas 5 + journée complète 10 = 105, donc l'Argent (100).
--    Une séance seule (90) ne suffit pas, un repas seul non plus.
--
--    Le socle n'est pas une ligne du registre : c'est la constante `10 +`
--    écrite dans les cinq fonctions qui somment l'EXP (etat_missions_aura,
--    rangs_aura, profil_public, cartes_rang, serie_jokers_aura). On la
--    réécrit dans chacune, sans toucher au reste de leur corps. Tout le
--    monde gagne donc 40 EXP d'un coup, rétroactivement : c'est voulu, un
--    socle vaut pour tous les comptes ou n'est pas un socle.
--
--    ⚠️ Vérifié avant d'écrire : dans ces cinq fonctions, `10 + ` n'apparaît
--    QUE devant la somme du registre. Une seconde exécution ne trouve plus
--    rien à remplacer.
--
-- ② LE RELAIS GAGNÉ RAPPORTE 100 EXP À CHAQUE MEMBRE. Une ligne par membre
--    et par relais (`period_type = 'relais'`, `period_key` = l'id du run),
--    posée par un trigger au passage du statut à `reussi`. Le même relais
--    ne crédite jamais deux fois (unicité du registre). Ce n'est pas une
--    journée : le crédit n'entre ni dans la série, ni dans les missions de
--    la semaine, ni dans la journée complète.
-- ════════════════════════════════════════════════════════════════════

-- ① Le socle
DO $$
DECLARE
  v_fonction regprocedure;
  v_corps    text;
BEGIN
  FOR v_fonction IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN ('etat_missions_aura', 'rangs_aura', 'profil_public',
                        'cartes_rang', 'serie_jokers_aura')
  LOOP
    v_corps := pg_get_functiondef(v_fonction);
    IF position('10 + ' IN v_corps) > 0 THEN
      EXECUTE replace(v_corps, '10 + ', '50 + ');
    END IF;
  END LOOP;
END;
$$;

-- ② Le registre accepte le relais gagné
ALTER TABLE public.aura_mission_credits
  DROP CONSTRAINT IF EXISTS aura_mission_credits_mission_id_check;
ALTER TABLE public.aura_mission_credits
  ADD CONSTRAINT aura_mission_credits_mission_id_check CHECK (mission_id = ANY (ARRAY[
    'connexion', 'seance', 'repas', 'journee_complete',
    'double_seance', 'leve_tot', 'nutrition_complete', 'objectif_accompli',
    'semaine_active', 'semaine_reguliere', 'semaine_parfaite', 'semaine_intense',
    'mouvement_du_jour', 'relais_gagne'
  ]::text[]));

ALTER TABLE public.aura_mission_credits
  DROP CONSTRAINT IF EXISTS aura_mission_credits_period_type_check;
ALTER TABLE public.aura_mission_credits
  ADD CONSTRAINT aura_mission_credits_period_type_check
  CHECK (period_type = ANY (ARRAY['day', 'week', 'relais']::text[]));

CREATE OR REPLACE FUNCTION public.crediter_relais_gagne_aura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'reussi' AND OLD.statut IS DISTINCT FROM 'reussi' THEN
    INSERT INTO public.aura_mission_credits
      (user_id, mission_id, period_type, period_key, points)
    SELECT m.user_id, 'relais_gagne', 'relais', NEW.id::text, 100
    FROM public.challenge_run_members m
    WHERE m.run_id = NEW.id
    ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.crediter_relais_gagne_aura() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS relais_gagne_credit ON public.challenge_runs;
CREATE TRIGGER relais_gagne_credit
  AFTER UPDATE OF statut ON public.challenge_runs
  FOR EACH ROW EXECUTE FUNCTION public.crediter_relais_gagne_aura();

-- Les relais déjà gagnés (aucun au 2026-10-25, mais la migration reste juste
-- si elle est rejouée plus tard).
INSERT INTO public.aura_mission_credits
  (user_id, mission_id, period_type, period_key, points, earned_at)
SELECT m.user_id, 'relais_gagne', 'relais', r.id::text, 100, COALESCE(r.fini_le, now())
FROM public.challenge_runs r
JOIN public.challenge_run_members m ON m.run_id = r.id
WHERE r.statut = 'reussi'
ON CONFLICT (user_id, mission_id, period_key) DO NOTHING;

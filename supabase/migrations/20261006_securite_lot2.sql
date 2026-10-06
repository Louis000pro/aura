-- ════════════════════════════════════════════════════════════════════════
--  Sécurité, lot 2 (2026-10-06) — à coller APRÈS
--  20261006_profils_colonnes_protegees.sql. Rejouable.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. push_subscriptions : plus ouverte à tout internet ─────────────────
-- La policy « Service role full access » valait USING (true) WITH CHECK (true)
-- pour TOUS les rôles, anon compris : n'importe qui lisait, modifiait ou
-- effaçait les abonnements push de tout le monde. Le service_role contourne
-- déjà la RLS, il n'en a jamais eu besoin. Aucun écran ne lit cette table :
-- tout passe par /api/notifications/push (clé service).
DROP POLICY IF EXISTS "Service role full access" ON public.push_subscriptions;

-- ── 2. ouvrir_fil_entre : plus appelable depuis le navigateur ────────────
-- Elle ne compare aucun de ses deux identifiants au compte connecté et
-- était appelable sans compte : n'importe qui pouvait ouvrir une
-- conversation entre deux personnes de son choix. Ses seuls appelants sont
-- d'autres fonctions SECURITY DEFINER (demander_ami, accepter_demande_ami,
-- amis_ouvrent_un_fil), qui tournent avec les droits de leur propriétaire
-- et gardent donc le droit de l'appeler.
REVOKE EXECUTE ON FUNCTION public.ouvrir_fil_entre(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── 3. Compteur d'essais partagé (connexion, codes, e-mails) ─────────────
-- Le compteur vivait dans la mémoire d'UNE instance Vercel : chaque
-- instance, chaque redémarrage repartait de zéro. Celui-ci est en base,
-- donc commun à toutes. Réservé au serveur (clé service).
CREATE TABLE IF NOT EXISTS public.limites_essais (
  cle    text PRIMARY KEY,
  essais integer NOT NULL,
  fin    timestamptz NOT NULL
);
ALTER TABLE public.limites_essais ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.limites_essais FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.autoriser_essai(p_cle text, p_max integer, p_fenetre_s integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_essais integer;
BEGIN
  -- Ménage opportuniste : une fois sur cent environ.
  IF random() < 0.01 THEN
    DELETE FROM public.limites_essais WHERE fin < now();
  END IF;

  INSERT INTO public.limites_essais AS l (cle, essais, fin)
  VALUES (p_cle, 1, now() + make_interval(secs => p_fenetre_s))
  ON CONFLICT (cle) DO UPDATE
    SET essais = CASE WHEN l.fin < now() THEN 1 ELSE l.essais + 1 END,
        fin    = CASE WHEN l.fin < now() THEN now() + make_interval(secs => p_fenetre_s) ELSE l.fin END
  RETURNING essais INTO v_essais;

  RETURN v_essais <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.autoriser_essai(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autoriser_essai(text, integer, integer) TO service_role;
